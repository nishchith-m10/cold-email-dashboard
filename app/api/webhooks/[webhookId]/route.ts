import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateWorkspaceAccess, extractWorkspaceId } from '@/lib/api-workspace-guard';
import { getWorkspaceAccess } from '@/lib/workspace-access';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_READ, RATE_LIMIT_STRICT } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const API_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json',
};

interface RouteParams {
  params: Promise<{ webhookId: string }>;
}

/**
 * GET /api/webhooks/[webhookId]
 * 
 * Get a single webhook by ID
 * Query params:
 * - workspace_id: string (required)
 */
export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  const { webhookId } = await params;

  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`webhooks-get:${clientId}`, RATE_LIMIT_READ);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  // Check database configuration
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503, headers: API_HEADERS }
    );
  }

  const { searchParams } = new URL(req.url);
  
  // Validate workspace access
  const accessError = await validateWorkspaceAccess(req, searchParams);
  if (accessError) return accessError;

  const workspaceId = extractWorkspaceId(req, searchParams);
  if (!workspaceId) {
    return NextResponse.json(
      { error: 'workspace_id is required' },
      { status: 400, headers: API_HEADERS }
    );
  }

  try {
    // Fetch webhook and verify it belongs to the workspace
    const { data: webhook, error } = await supabaseAdmin
      .from('workspace_webhooks')
      .select('id, workspace_id, url, enabled, event_types, created_at, updated_at')
      .eq('id', webhookId)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !webhook) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Webhook not found' },
          { status: 404, headers: API_HEADERS }
        );
      }
      console.error('Webhook fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch webhook' },
        { status: 500, headers: API_HEADERS }
      );
    }

    return NextResponse.json(
      { webhook },
      { headers: API_HEADERS }
    );
  } catch (err) {
    console.error('Webhook GET error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}

/**
 * PATCH /api/webhooks/[webhookId]
 * 
 * Update a webhook configuration
 * Body: { url?: string, event_types?: string[], enabled?: boolean }
 * Query params:
 * - workspace_id: string (required)
 */
export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
) {
  const { webhookId } = await params;

  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`webhooks-update:${clientId}`, RATE_LIMIT_STRICT);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  // Check database configuration
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503, headers: API_HEADERS }
    );
  }

  // Require authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401, headers: API_HEADERS }
    );
  }

  const { searchParams } = new URL(req.url);
  
  // Validate workspace access
  const accessError = await validateWorkspaceAccess(req, searchParams);
  if (accessError) return accessError;

  const workspaceId = extractWorkspaceId(req, searchParams);
  if (!workspaceId) {
    return NextResponse.json(
      { error: 'workspace_id is required' },
      { status: 400, headers: API_HEADERS }
    );
  }

  // Check management access (owners/admins only)
  const access = await getWorkspaceAccess(userId, workspaceId);
  if (!access?.canManage) {
    return NextResponse.json(
      { error: 'You do not have permission to manage webhooks for this workspace' },
      { status: 403, headers: API_HEADERS }
    );
  }

  try {
    const body = await req.json();
    const { url, event_types, enabled } = body;

    // Build update payload (only include provided fields)
    const updatePayload: {
      url?: string;
      event_types?: string[];
      enabled?: boolean;
      updated_at?: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    // Validate and add url if provided
    if (url !== undefined) {
      if (typeof url !== 'string' || !url.trim()) {
        return NextResponse.json(
          { error: 'url must be a non-empty string' },
          { status: 400, headers: API_HEADERS }
        );
      }

      // Validate URL format
      try {
        const urlObj = new URL(url);
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          return NextResponse.json(
            { error: 'URL must use http or https protocol' },
            { status: 400, headers: API_HEADERS }
          );
        }
      } catch {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400, headers: API_HEADERS }
        );
      }

      updatePayload.url = url.trim();
    }

    // Validate and add event_types if provided
    if (event_types !== undefined) {
      if (!Array.isArray(event_types)) {
        return NextResponse.json(
          { error: 'event_types must be an array' },
          { status: 400, headers: API_HEADERS }
        );
      }

      if (event_types.length === 0) {
        return NextResponse.json(
          { error: 'event_types must contain at least one event type' },
          { status: 400, headers: API_HEADERS }
        );
      }

      if (!event_types.every((et: unknown) => typeof et === 'string')) {
        return NextResponse.json(
          { error: 'All event_types must be strings' },
          { status: 400, headers: API_HEADERS }
        );
      }

      updatePayload.event_types = event_types;
    }

    // Validate and add enabled if provided
    if (enabled !== undefined) {
      if (typeof enabled !== 'boolean') {
        return NextResponse.json(
          { error: 'enabled must be a boolean' },
          { status: 400, headers: API_HEADERS }
        );
      }
      updatePayload.enabled = enabled;
    }

    // Check if there are any updates
    if (Object.keys(updatePayload).length === 1) {
      // Only updated_at was set, no actual changes
      return NextResponse.json(
        { error: 'No changes provided' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Verify webhook exists and belongs to workspace before updating
    const { data: existingWebhook, error: checkError } = await supabaseAdmin
      .from('workspace_webhooks')
      .select('id, workspace_id')
      .eq('id', webhookId)
      .eq('workspace_id', workspaceId)
      .single();

    if (checkError || !existingWebhook) {
      if (checkError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Webhook not found' },
          { status: 404, headers: API_HEADERS }
        );
      }
      return NextResponse.json(
        { error: 'Webhook not found or access denied' },
        { status: 404, headers: API_HEADERS }
      );
    }

    // Update webhook
    const { data: updatedWebhook, error: updateError } = await supabaseAdmin
      .from('workspace_webhooks')
      .update(updatePayload)
      .eq('id', webhookId)
      .eq('workspace_id', workspaceId)
      .select('id, workspace_id, url, enabled, event_types, created_at, updated_at')
      .single();

    if (updateError) {
      console.error('Webhook update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update webhook', details: updateError.message },
        { status: 500, headers: API_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        webhook: updatedWebhook,
        message: 'Webhook updated successfully',
      },
      { headers: API_HEADERS }
    );
  } catch (err) {
    console.error('Webhook PATCH error:', err);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400, headers: API_HEADERS }
    );
  }
}

/**
 * DELETE /api/webhooks/[webhookId]
 * 
 * Delete a webhook
 * Query params:
 * - workspace_id: string (required)
 */
export async function DELETE(
  req: NextRequest,
  { params }: RouteParams
) {
  const { webhookId } = await params;

  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`webhooks-delete:${clientId}`, RATE_LIMIT_STRICT);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  // Check database configuration
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503, headers: API_HEADERS }
    );
  }

  // Require authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401, headers: API_HEADERS }
    );
  }

  const { searchParams } = new URL(req.url);
  
  // Validate workspace access
  const accessError = await validateWorkspaceAccess(req, searchParams);
  if (accessError) return accessError;

  const workspaceId = extractWorkspaceId(req, searchParams);
  if (!workspaceId) {
    return NextResponse.json(
      { error: 'workspace_id is required' },
      { status: 400, headers: API_HEADERS }
    );
  }

  // Check management access (owners/admins only)
  const access = await getWorkspaceAccess(userId, workspaceId);
  if (!access?.canManage) {
    return NextResponse.json(
      { error: 'You do not have permission to manage webhooks for this workspace' },
      { status: 403, headers: API_HEADERS }
    );
  }

  try {
    // Verify webhook exists and belongs to workspace before deleting
    const { data: existingWebhook, error: checkError } = await supabaseAdmin
      .from('workspace_webhooks')
      .select('id, workspace_id')
      .eq('id', webhookId)
      .eq('workspace_id', workspaceId)
      .single();

    if (checkError || !existingWebhook) {
      if (checkError?.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Webhook not found' },
          { status: 404, headers: API_HEADERS }
        );
      }
      return NextResponse.json(
        { error: 'Webhook not found or access denied' },
        { status: 404, headers: API_HEADERS }
      );
    }

    // Delete webhook (CASCADE will handle webhook_deliveries)
    const { error: deleteError } = await supabaseAdmin
      .from('workspace_webhooks')
      .delete()
      .eq('id', webhookId)
      .eq('workspace_id', workspaceId);

    if (deleteError) {
      console.error('Webhook delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete webhook', details: deleteError.message },
        { status: 500, headers: API_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Webhook deleted successfully',
      },
      { headers: API_HEADERS }
    );
  } catch (err) {
    console.error('Webhook DELETE error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}
