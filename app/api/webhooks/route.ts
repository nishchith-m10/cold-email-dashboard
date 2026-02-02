import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateWorkspaceAccess, extractWorkspaceId } from '@/lib/api-workspace-guard';
import { getWorkspaceAccess } from '@/lib/workspace-access';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_READ, RATE_LIMIT_STRICT } from '@/lib/rate-limit';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const API_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json',
};

/**
 * GET /api/webhooks
 * 
 * List all webhooks for a workspace
 * Query params:
 * - workspace_id: string (required)
 */
export async function GET(req: NextRequest) {
  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`webhooks-list:${clientId}`, RATE_LIMIT_READ);
  
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
    // Fetch webhooks for the workspace
    const { data: webhooks, error } = await (supabaseAdmin as any)
      .from('workspace_webhooks')
      .select('id, workspace_id, url, enabled, event_types, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Webhooks fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch webhooks' },
        { status: 500, headers: API_HEADERS }
      );
    }

    return NextResponse.json(
      { webhooks: webhooks || [] },
      { headers: API_HEADERS }
    );
  } catch (err) {
    console.error('Webhooks GET error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: API_HEADERS }
    );
  }
}

/**
 * POST /api/webhooks
 * 
 * Create a new webhook configuration
 * Body: { workspace_id: string, url: string, event_types: string[], enabled?: boolean }
 * Query params:
 * - workspace_id: string (required)
 */
export async function POST(req: NextRequest) {
  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`webhooks-create:${clientId}`, RATE_LIMIT_STRICT);
  
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
    const { url, event_types, enabled = true } = body;

    // Validate required fields
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'url is required and must be a string' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Validate URL format (must be HTTP/HTTPS)
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

    // Validate event_types
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

    // Validate each event type is a string
    if (!event_types.every((et: unknown) => typeof et === 'string')) {
      return NextResponse.json(
        { error: 'All event_types must be strings' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Validate enabled flag
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400, headers: API_HEADERS }
      );
    }

    // Generate a secret for webhook signature verification
    const secret = crypto.randomBytes(32).toString('hex');

    // Create webhook
    const { data: webhook, error: createError } = await (supabaseAdmin as any)
      .from('workspace_webhooks')
      .insert({
        workspace_id: workspaceId,
        url: url.trim(),
        enabled,
        event_types,
        secret,
      })
      .select('id, workspace_id, url, enabled, event_types, created_at, updated_at')
      .single();

    if (createError) {
      console.error('Webhook creation error:', createError);
      return NextResponse.json(
        { error: 'Failed to create webhook', details: createError.message },
        { status: 500, headers: API_HEADERS }
      );
    }

    // Return webhook without secret for security
    return NextResponse.json(
      {
        success: true,
        webhook,
        message: 'Webhook created successfully',
      },
      { status: 201, headers: API_HEADERS }
    );
  } catch (err) {
    console.error('Webhooks POST error:', err);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400, headers: API_HEADERS }
    );
  }
}
