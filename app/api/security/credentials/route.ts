/**
 * Credential Vault API (read-only, Clerk-authenticated)
 *
 * GET  /api/security/credentials?workspace_id=xxx     — list BYO credentials (metadata only)
 * POST /api/security/credentials  { workspace_id, credential_id }  — reveal decrypted value
 *
 * Only returns user-entered BYO credentials; excludes global/managed keys.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { canAccessWorkspace } from '@/lib/api-workspace-guard';

// BYO credential types that were entered by the user during onboarding.
// Excludes global/managed: google_cse_api_key, relevance_api_key, apify_api_token
const BYO_TYPES = [
  'anthropic_api_key',
  'openai_api_key',
  'gmail_oauth',
  'google_sheets_oauth',
  'entri_oauth',
  'calendly_url',
];

// Human-readable labels for each credential type
const TYPE_LABELS: Record<string, string> = {
  anthropic_api_key: 'Claude API Key',
  openai_api_key: 'OpenAI API Key',
  gmail_oauth: 'Gmail (OAuth)',
  google_sheets_oauth: 'Google Sheets (OAuth)',
  entri_oauth: 'DNS Automation (Entri)',
  calendly_url: 'Calendly Booking URL',
};

/**
 * GET — List BYO credentials (metadata only, never sends encrypted values)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = request.nextUrl.searchParams.get('workspace_id');
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
    }

    const access = await canAccessWorkspace(userId, workspaceId, request.url);
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { data, error } = await supabaseAdmin
      .schema('genesis')
      .from('workspace_credentials')
      .select('id, credential_type, status, validated_at, created_at, updated_at, booking_url')
      .eq('workspace_id', workspaceId)
      .in('credential_type', BYO_TYPES)
      .order('created_at', { ascending: true });

    if (error) {
      // Table may not exist yet — graceful degradation
      console.error('[Credentials] Query error:', error);
      return NextResponse.json({ success: true, data: [] });
    }

    return NextResponse.json({
      success: true,
      data: (data || []).map((row: any) => ({
        id: row.id,
        type: row.credential_type,
        label: TYPE_LABELS[row.credential_type] || row.credential_type,
        status: row.status,
        validatedAt: row.validated_at,
        createdAt: row.created_at,
        // Calendly URL is stored in plain text — provide masked preview
        maskedHint: row.booking_url
          ? maskValue(row.booking_url)
          : undefined,
      })),
    });
  } catch (err) {
    console.error('[Credentials] Exception:', err);
    return NextResponse.json({ success: true, data: [] });
  }
}

/**
 * POST — Reveal a specific credential's decrypted value
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspace_id, credential_id } = await request.json();
    if (!workspace_id || !credential_id) {
      return NextResponse.json(
        { error: 'workspace_id and credential_id required' },
        { status: 400 },
      );
    }

    const access = await canAccessWorkspace(userId, workspace_id, request.url);
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Lazy-load encryption service
    const masterKey = process.env.ENCRYPTION_MASTER_KEY;
    if (!masterKey) {
      return NextResponse.json(
        { error: 'Encryption not configured' },
        { status: 503 },
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    // Fetch the credential row
    const { data: row, error } = await supabaseAdmin
      .schema('genesis')
      .from('workspace_credentials')
      .select('*')
      .eq('id', credential_id)
      .eq('workspace_id', workspace_id)
      .single();

    if (error || !row) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    // Only allow revealing BYO types
    if (!BYO_TYPES.includes(row.credential_type)) {
      return NextResponse.json({ error: 'Cannot reveal this credential type' }, { status: 403 });
    }

    // Decrypt based on credential type
    const { EncryptionService } = await import('@/lib/genesis/phase64/credential-vault-service');
    const encryption = new EncryptionService(masterKey);

    let plaintext: string;
    try {
      if (row.booking_url) {
        // Calendly — stored in plain text
        plaintext = row.booking_url;
      } else if (row.api_key) {
        plaintext = encryption.decrypt(row.api_key, workspace_id);
      } else if (row.access_token) {
        // OAuth — show access token (masking refresh token)
        plaintext = encryption.decrypt(row.access_token, workspace_id);
      } else {
        return NextResponse.json({ error: 'No value to reveal' }, { status: 404 });
      }
    } catch {
      return NextResponse.json({ error: 'Decryption failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      value: plaintext,
    });
  } catch (err) {
    console.error('[Credentials Reveal] Exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Mask a plaintext value — show first 4 + last 4 chars */
function maskValue(value: string): string {
  if (value.length <= 10) return '••••••••';
  return `${value.slice(0, 4)}${'•'.repeat(Math.min(value.length - 8, 12))}${value.slice(-4)}`;
}
