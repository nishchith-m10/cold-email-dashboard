/**
 * Node Metadata Registry
 *
 * Maps n8n node type identifiers to visual rendering properties
 * (category, label, color). Used by the adapter to classify nodes
 * and by custom node components to render appropriately.
 *
 * @module lib/workflow-graph/registry
 */

import type { NodeCategory, NodeRegistryEntry } from './types';

// ---------------------------------------------------------------------------
// Static Node Type Registry
// ---------------------------------------------------------------------------

/**
 * Maps n8n node type strings (without the 'n8n-nodes-base.' prefix or with it)
 * to their visual properties. The adapter normalizes type strings before lookup.
 *
 * Based on analysis of all 7 base-cold-email workflow templates:
 * - Email Preparation (36 nodes)
 * - Research Report (43 nodes)
 * - Email 1/2/3 (14/19/19 nodes)
 * - Reply Tracker (10 nodes)
 * - Opt-Out (7 nodes)
 */
export const NODE_TYPE_REGISTRY: Record<string, NodeRegistryEntry> = {
  // ---- Triggers ----
  scheduleTrigger: {
    category: 'trigger',
    label: 'Schedule Trigger',
    color: 'green-500',
  },
  webhook: {
    category: 'trigger',
    label: 'Webhook',
    color: 'green-500',
  },
  gmailTrigger: {
    category: 'trigger',
    label: 'Email Trigger',
    color: 'green-500',
  },

  // ---- Email Send ----
  gmail: {
    category: 'email_send',
    label: 'Gmail',
    color: 'blue-500',
  },

  // ---- Data / Database ----
  postgres: {
    category: 'data_db',
    label: 'Database',
    color: 'amber-500',
  },
  googleSheets: {
    category: 'data_db',
    label: 'Google Sheets',
    color: 'amber-500',
  },

  // ---- Logic / Routing ----
  if: {
    category: 'logic_routing',
    label: 'Condition',
    color: 'gray-400',
  },
  splitInBatches: {
    category: 'logic_routing',
    label: 'Loop',
    color: 'gray-400',
  },
  merge: {
    category: 'logic_routing',
    label: 'Merge',
    color: 'gray-400',
  },
  limit: {
    category: 'logic_routing',
    label: 'Limit',
    color: 'gray-400',
  },
  wait: {
    category: 'logic_routing',
    label: 'Wait',
    color: 'gray-400',
  },

  // ---- Utility ----
  code: {
    category: 'utility',
    label: 'Code',
    color: 'slate-400',
  },
  set: {
    category: 'utility',
    label: 'Set Fields',
    color: 'slate-400',
  },
  html: {
    category: 'utility',
    label: 'HTML Builder',
    color: 'slate-400',
  },
  respondToWebhook: {
    category: 'utility',
    label: 'Respond',
    color: 'slate-400',
  },

  // ---- HTTP Request (default — contextual classification overrides) ----
  httpRequest: {
    category: 'utility',
    label: 'HTTP Request',
    color: 'slate-400',
  },
};

// ---------------------------------------------------------------------------
// Contextual httpRequest Classifier
// ---------------------------------------------------------------------------

/**
 * AI API URL patterns that indicate an httpRequest node is calling an LLM.
 */
const AI_URL_PATTERNS = [
  'openai.com',
  'api.openai.com',
  'anthropic.com',
  'api.anthropic.com',
  'api.relevanceai.com',
] as const;

/**
 * Tracking URL patterns that indicate an httpRequest node is for event tracking.
 */
const TRACKING_URL_PATTERNS = [
  '/api/track',
  '/api/events',
  'Track Email',
  'Send Cost',
  'Track Reply',
  'Track Opt',
] as const;

/**
 * SMTP/Email sending URL patterns for httpRequest nodes.
 */
const EMAIL_SEND_URL_PATTERNS = [
  'smtp',
  '/api/send-email',
  '/api/email/send',
] as const;

/**
 * AI credential type identifiers used in n8n.
 */
const AI_CREDENTIAL_TYPES = [
  'openAiApi',
  'anthropicApi',
] as const;

/**
 * Classifies an httpRequest node into a more specific NodeCategory
 * based on its URL, credentials, and node name.
 *
 * Classification priority:
 * 1. Check URL for AI API patterns → ai_llm
 * 2. Check credentials for AI credential types → ai_llm
 * 3. Check URL/name for tracking patterns → tracking
 * 4. Check URL/name for email/SMTP patterns → email_send
 * 5. Default → utility
 *
 * @param parameters - The n8n node's parameters object
 * @param credentials - Array of credential type names used by the node
 * @param nodeName - The display name of the node
 * @returns The classified NodeCategory
 */
export function classifyHttpRequestNode(
  parameters: Record<string, unknown>,
  credentials: string[],
  nodeName: string,
): NodeCategory {
  // Extract URL from parameters (can be in various locations)
  const url = extractUrl(parameters);
  const urlLower = url.toLowerCase();
  const nameLower = nodeName.toLowerCase();

  // 1. Check for AI API URLs
  if (AI_URL_PATTERNS.some((pattern) => urlLower.includes(pattern))) {
    return 'ai_llm';
  }

  // 2. Check for AI credentials
  if (credentials.some((cred) => AI_CREDENTIAL_TYPES.some((ai) => cred.includes(ai)))) {
    return 'ai_llm';
  }

  // 3. Check for tracking patterns (URL or node name)
  if (
    TRACKING_URL_PATTERNS.some((pattern) => urlLower.includes(pattern.toLowerCase())) ||
    TRACKING_URL_PATTERNS.some((pattern) => nameLower.includes(pattern.toLowerCase()))
  ) {
    return 'tracking';
  }

  // 4. Check for email/SMTP patterns
  if (
    EMAIL_SEND_URL_PATTERNS.some((pattern) => urlLower.includes(pattern.toLowerCase())) ||
    nameLower.includes('smtp') ||
    nameLower.includes('send email')
  ) {
    return 'email_send';
  }

  // 5. Default
  return 'utility';
}

/**
 * Category-specific display labels for classified httpRequest nodes.
 */
export const HTTP_REQUEST_CATEGORY_LABELS: Record<NodeCategory, string> = {
  ai_llm: 'AI API Call',
  tracking: 'Event Tracker',
  email_send: 'Email Send',
  trigger: 'HTTP Request',
  data_db: 'HTTP Request',
  logic_routing: 'HTTP Request',
  utility: 'HTTP Request',
  unknown: 'HTTP Request',
};

/**
 * Category-specific colors for classified httpRequest nodes.
 */
export const HTTP_REQUEST_CATEGORY_COLORS: Record<NodeCategory, string> = {
  ai_llm: 'purple-500',
  tracking: 'teal-500',
  email_send: 'blue-500',
  trigger: 'slate-400',
  data_db: 'slate-400',
  logic_routing: 'slate-400',
  utility: 'slate-400',
  unknown: 'slate-400',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the URL string from an n8n httpRequest node's parameters.
 * The URL can be in several locations depending on the node version.
 */
function extractUrl(parameters: Record<string, unknown>): string {
  // v2+ uses `url` directly
  if (typeof parameters.url === 'string') {
    return parameters.url;
  }

  // Some nodes use `options.url`
  if (
    parameters.options &&
    typeof parameters.options === 'object' &&
    'url' in (parameters.options as Record<string, unknown>)
  ) {
    const url = (parameters.options as Record<string, unknown>).url;
    if (typeof url === 'string') return url;
  }

  // Check in body/json for API endpoint references
  if (typeof parameters.body === 'string') {
    return parameters.body;
  }

  // Check in jsonBody for URLs embedded in request bodies
  if (typeof parameters.jsonBody === 'string') {
    // Look for URL-like patterns in the JSON body
    const urlMatch = parameters.jsonBody.match(/https?:\/\/[^\s"']+/);
    if (urlMatch) return urlMatch[0];
  }

  return '';
}

/**
 * Normalizes an n8n node type string by removing the common prefix.
 * Example: 'n8n-nodes-base.gmail' → 'gmail'
 */
export function normalizeNodeType(type: string): string {
  return type
    .replace('n8n-nodes-base.', '')
    .replace('n8n-nodes-internal.', '')
    .replace('@n8n/n8n-nodes-langchain.', '');
}

/**
 * Gets the registry entry for an n8n node type.
 * Falls back to 'unknown' category if the type is not registered.
 */
export function getNodeRegistryEntry(
  normalizedType: string,
): NodeRegistryEntry {
  return (
    NODE_TYPE_REGISTRY[normalizedType] ?? {
      category: 'unknown' as NodeCategory,
      label: normalizedType,
      color: 'slate-300',
    }
  );
}
