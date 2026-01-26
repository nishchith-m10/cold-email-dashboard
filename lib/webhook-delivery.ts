/**
 * Webhook Delivery Service
 * 
 * Handles delivery of webhook events to configured workspace webhook endpoints.
 * Features:
 * - Finds webhooks subscribed to specific event types
 * - Delivers via fetch() with retry logic (3 attempts)
 * - Logs all delivery attempts to webhook_deliveries table
 * - Uses exponential backoff for retries
 * - Generates webhook signatures for security
 */

import { supabaseAdmin } from './supabase';
import crypto from 'crypto';

// ============================================
// TYPES
// ============================================

export interface WebhookConfig {
  id: string;
  workspace_id: string;
  url: string;
  enabled: boolean;
  event_types: string[];
  secret: string;
}

export interface WebhookDeliveryResult {
  webhookId: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  attempts: number;
}

export interface DeliveryLog {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'delivered' | 'failed' | 'retrying';
  attempts: number;
  response?: {
    statusCode: number;
    statusText: string;
    headers: Record<string, string>;
    body?: string;
  };
  created_at: string;
  delivered_at?: string;
}

// ============================================
// CONSTANTS
// ============================================

const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const INITIAL_BACKOFF_MS = 1000; // 1 second

// ============================================
// HELPERS
// ============================================

/**
 * Sleep utility for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate webhook signature using HMAC-SHA256
 * Matches the pattern used in other webhook endpoints
 */
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Create delivery log entry in database
 */
async function createDeliveryLog(
  webhookId: string,
  eventType: string,
  payload: Record<string, unknown>,
  status: DeliveryLog['status'] = 'pending'
): Promise<string | null> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not available');
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('webhook_deliveries')
    .insert({
      webhook_id: webhookId,
      event_type: eventType,
      payload: payload,
      status: status,
      attempts: 0,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create delivery log:', error);
    return null;
  }

  return data?.id || null;
}

/**
 * Update delivery log entry
 */
async function updateDeliveryLog(
  deliveryId: string,
  updates: {
    status: DeliveryLog['status'];
    attempts: number;
    response?: DeliveryLog['response'];
    delivered_at?: string;
  }
): Promise<void> {
  if (!supabaseAdmin) {
    return;
  }

  const { error } = await supabaseAdmin
    .from('webhook_deliveries')
    .update(updates)
    .eq('id', deliveryId);

  if (error) {
    console.error('Failed to update delivery log:', error);
  }
}

// ============================================
// MAIN DELIVERY FUNCTION
// ============================================

/**
 * Deliver webhook event to all subscribed webhooks for a workspace
 * 
 * @param workspaceId - The workspace ID to find webhooks for
 * @param eventType - The type of event (e.g., 'email.sent', 'email.opened')
 * @param payload - The event payload to send
 * @returns Array of delivery results for each webhook
 */
export async function deliverWebhook(
  workspaceId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<WebhookDeliveryResult[]> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not available');
    return [];
  }

  // Find all enabled webhooks for this workspace that subscribe to this event type
  const { data: webhooks, error } = await supabaseAdmin
    .from('workspace_webhooks')
    .select('id, workspace_id, url, enabled, event_types, secret')
    .eq('workspace_id', workspaceId)
    .eq('enabled', true);

  if (error) {
    console.error('Failed to fetch webhooks:', error);
    return [];
  }

  if (!webhooks || webhooks.length === 0) {
    return [];
  }

  // Filter webhooks that subscribe to this event type
  const subscribedWebhooks = webhooks.filter(webhook => {
    const eventTypes = webhook.event_types as string[];
    return Array.isArray(eventTypes) && eventTypes.includes(eventType);
  });

  if (subscribedWebhooks.length === 0) {
    return [];
  }

  // Deliver to each webhook
  const results: WebhookDeliveryResult[] = [];

  for (const webhook of subscribedWebhooks) {
    const result = await deliverToWebhook(
      webhook.id,
      webhook.url,
      webhook.secret,
      eventType,
      payload
    );
    results.push(result);
  }

  return results;
}

/**
 * Deliver webhook to a single endpoint with retry logic
 */
async function deliverToWebhook(
  webhookId: string,
  url: string,
  secret: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<WebhookDeliveryResult> {
  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, secret);

  // Create initial delivery log
  const deliveryId = await createDeliveryLog(webhookId, eventType, payload, 'pending');

  let lastError: Error | null = null;
  let lastStatusCode: number | undefined;
  let attempts = 0;

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    attempts = attempt + 1;
    const status: DeliveryLog['status'] = attempt === 0 ? 'processing' : 'retrying';

    // Update log to processing/retrying
    if (deliveryId) {
      await updateDeliveryLog(deliveryId, {
        status,
        attempts,
      });
    }

    try {
      // Exponential backoff: wait before retry (not before first attempt)
      if (attempt > 0) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        await sleep(backoffMs);
      }

      // Make HTTP request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

      let response: Response;
      let responseBody: string | undefined;

      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event-Type': eventType,
            'User-Agent': 'ColdEmailDashboard/1.0',
          },
          body: payloadString,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Read response body (limit to 10KB to avoid memory issues)
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json') || contentType.includes('text/')) {
          const text = await response.text();
          responseBody = text.slice(0, 10240); // 10KB limit
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }

      lastStatusCode = response.status;

      // Success: 2xx status codes
      if (response.status >= 200 && response.status < 300) {
        // Update log to delivered
        if (deliveryId) {
          const responseHeaders: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });

          await updateDeliveryLog(deliveryId, {
            status: 'delivered',
            attempts,
            response: {
              statusCode: response.status,
              statusText: response.statusText,
              headers: responseHeaders,
              body: responseBody,
            },
            delivered_at: new Date().toISOString(),
          });
        }

        return {
          webhookId,
          success: true,
          statusCode: response.status,
          attempts,
        };
      }

      // Non-2xx response - treat as failure but log response
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);

      // If this is the last attempt, log the failure
      if (attempt === MAX_RETRIES - 1 && deliveryId) {
        await updateDeliveryLog(deliveryId, {
          status: 'failed',
          attempts,
          response: {
            statusCode: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
            body: responseBody,
          },
        });
      }
    } catch (error) {
      // Network error, timeout, or other fetch error
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this is the last attempt, log the failure
      if (attempt === MAX_RETRIES - 1 && deliveryId) {
        await updateDeliveryLog(deliveryId, {
          status: 'failed',
          attempts,
          response: {
            statusCode: 0,
            statusText: lastError.message,
            headers: {},
          },
        });
      }
    }
  }

  // All retries exhausted
  return {
    webhookId,
    success: false,
    statusCode: lastStatusCode,
    error: lastError?.message || 'Unknown error',
    attempts,
  };
}

// ============================================
// TEST FUNCTION
// ============================================

/**
 * Test a webhook endpoint with a sample payload
 * 
 * @param url - The webhook URL to test
 * @param secret - The webhook secret for signature generation
 * @param eventType - Optional event type (defaults to 'test')
 * @param payload - Optional custom payload (defaults to test payload)
 * @returns Test result with status code and response
 */
export async function testWebhook(
  url: string,
  secret: string,
  eventType: string = 'test',
  payload?: Record<string, unknown>
): Promise<{
  success: boolean;
  statusCode?: number;
  statusText?: string;
  response?: string;
  error?: string;
}> {
  const testPayload = payload || {
    event: eventType,
    timestamp: new Date().toISOString(),
    test: true,
    message: 'This is a test webhook from Cold Email Dashboard',
  };

  const payloadString = JSON.stringify(testPayload);
  const signature = generateSignature(payloadString, secret);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    let response: Response;
    let responseBody: string | undefined;

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event-Type': eventType,
          'User-Agent': 'ColdEmailDashboard/1.0',
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Read response body (limit to 10KB)
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json') || contentType.includes('text/')) {
        const text = await response.text();
        responseBody = text.slice(0, 10240);
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

    const success = response.status >= 200 && response.status < 300;

    return {
      success,
      statusCode: response.status,
      statusText: response.statusText,
      response: responseBody,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
