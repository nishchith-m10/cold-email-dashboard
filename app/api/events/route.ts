import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_WEBHOOK } from '@/lib/rate-limit';
import { resolveWebhookAuth } from '@/lib/webhook-auth';

export const dynamic = 'force-dynamic';

// Notification configuration helper
type NotificationType = 'reply' | 'opt_out' | 'budget_alert' | 'campaign_complete' | 'system';

interface NotificationConfig {
  type: NotificationType;
  title: string;
  message: string;
}

function getNotificationConfig(
  eventType: string,
  contactEmail: string
): NotificationConfig | null {
  switch (eventType) {
    case 'sent':
      return {
        type: 'system',
        title: 'Email Sent',
        message: `Email sent to ${contactEmail}`,
      };
    case 'opened':
      return {
        type: 'system',
        title: 'Email Opened',
        message: `Email opened by ${contactEmail}`,
      };
    case 'clicked':
      return {
        type: 'system',
        title: 'Link Clicked',
        message: `${contactEmail} clicked a link`,
      };
    case 'replied':
      return {
        type: 'reply',
        title: 'Reply Received',
        message: `Reply from ${contactEmail}`,
      };
    case 'opt_out':
      return {
        type: 'opt_out',
        title: 'Opt-Out',
        message: `${contactEmail} opted out`,
      };
    case 'bounced':
      return {
        type: 'system',
        title: 'Email Bounced',
        message: `Email bounced: ${contactEmail}`,
      };
    default:
      return null; // No notification for 'delivered' or other types
  }
}

// Zod schema for event validation
const eventSchema = z.object({
  contact_email: z.string().email('Invalid email format'),
  campaign: z.string().max(200).optional(),
  campaign_group_id: z.string().uuid().optional(), // D3-002: optional campaign group UUID
  step: z.number().int().min(1).max(10).optional(),
  event_type: z.enum(['sent', 'delivered', 'bounced', 'replied', 'opt_out', 'opened', 'clicked']),
  provider: z.string().max(50).optional(),
  provider_message_id: z.string().max(200).optional(),
  event_ts: z.string().datetime().optional(),
  subject: z.string().max(500).optional(),
  body: z.string().max(50000).optional(),
  workspace_id: z.string().max(100).optional(),
  idempotency_key: z.string().max(200),
  is_test: z.boolean().optional(), // D7-001: sandbox test event flag
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`events:${clientId}`, RATE_LIMIT_WEBHOOK);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  // Check if Supabase is configured
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  // Early reject: missing token header (before body parse)
  const token = req.headers.get('x-webhook-token');
  if (!token) {
    return NextResponse.json({ error: 'Missing x-webhook-token header' }, { status: 401 });
  }

  // Parse and validate request body
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validation = eventSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { 
        error: 'Validation failed', 
        details: validation.error.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }

  const {
    contact_email,
    campaign,
    campaign_group_id: campaignGroupId, // D3-002
    step,
    event_type,
    provider,
    provider_message_id,
    event_ts,
    subject,
    body: email_body,
    workspace_id,
    idempotency_key,
    is_test,
    metadata,
  } = validation.data;

  // D4-001: Resolve workspace from webhook token (per-workspace tokens)
  const authResult = await resolveWebhookAuth(token, workspace_id);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const workspaceId = authResult.workspaceId;
  const campaignName = campaign || 'Default Campaign';
  const eventTs = event_ts ? new Date(event_ts).toISOString() : new Date().toISOString();
  const emailNumber = step ?? null; // Align naming with DB (email_number)

  try {
    // D4-007: Upsert contact — gracefully skip if contacts table doesn't exist
    let contactId: string | null = null;
    try {
      const { data: contact, error: contactError } = await supabaseAdmin
        .from('contacts')
        .upsert(
          { 
            workspace_id: workspaceId, 
            email: contact_email 
          },
          { onConflict: 'workspace_id,email' }
        )
        .select('id')
        .single();

      if (contactError) {
        // 42P01 = relation does not exist
        if (contactError.code === '42P01') {
          console.warn('[events] contacts table does not exist — skipping contact upsert');
        } else if (!contactError.message.includes('duplicate')) {
          console.error('Contact upsert error:', contactError);
        }
      }
      contactId = contact?.id || null;
    } catch {
      console.warn('[events] contacts upsert failed — continuing without contact_id');
    }

    // D4-007: Upsert email record for 'sent' events — gracefully skip if emails table doesn't exist
    if (event_type === 'sent' && emailNumber) {
      try {
        const { error: emailError } = await supabaseAdmin
          .from('emails')
          .upsert({
            contact_id: contactId,
            workspace_id: workspaceId,
            step: emailNumber,
            subject: subject || null,
            body: email_body || null,
            provider: provider || 'gmail',
            provider_message_id: provider_message_id || null,
            sent_at: eventTs,
          }, { onConflict: 'contact_id,step' });

        if (emailError) {
          if (emailError.code === '42P01') {
            console.warn('[events] emails table does not exist — skipping email upsert');
          } else {
            console.error('Email upsert error:', emailError);
          }
        }
      } catch {
        console.warn('[events] emails upsert failed — continuing without email record');
      }
    }

    // D4-004: Idempotency check using indexed column (replaces slow JSONB extraction)
    if (idempotency_key) {
      const { data: existing } = await supabaseAdmin
        .from('email_events')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('idempotency_key', idempotency_key)
        .limit(1);
      if (existing && existing.length > 0) {
        return NextResponse.json({ ok: true, deduped: true }, { headers: rateLimitHeaders(rateLimit) });
      }
    }

    // Generate unique event key for deduplication
    const eventKey = idempotency_key || `${provider || 'unknown'}:${provider_message_id || contact_email}:${event_type}:${emailNumber || 0}`;

    // Insert event and get the inserted ID
    const { data: insertedEvent, error: eventError } = await supabaseAdmin
      .from('email_events')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        contact_email,
        campaign_name: campaignName,
        campaign_group_id: campaignGroupId || null, // D3-002
        email_number: emailNumber,
        event_type,
        event_ts: eventTs,
        provider: provider || null,
        provider_message_id: provider_message_id || null,
        event_key: eventKey,
        idempotency_key: idempotency_key || null, // D4-004: indexed column
        is_test: is_test || false, // D7-001: sandbox test event isolation
        metadata: { ...(metadata || {}), idempotency_key },
      })
      .select('id')
      .single();

    if (eventError) {
      // Check if duplicate (idempotent)
      if (eventError.message?.toLowerCase().includes('duplicate') || 
          eventError.code === '23505') {
        return NextResponse.json({ ok: true, deduped: true }, { headers: rateLimitHeaders(rateLimit) });
      }
      console.error('Event insert error:', eventError);
      return NextResponse.json({ error: eventError.message }, { status: 500 });
    }

    // Create notification for relevant event types
    const notificationConfig = getNotificationConfig(event_type, contact_email);
    if (notificationConfig && insertedEvent?.id) {
      const { error: notificationError } = await supabaseAdmin
        .from('notifications')
        .insert({
          workspace_id: workspaceId,
          user_id: null, // Broadcast to all workspace users
          type: notificationConfig.type,
          title: notificationConfig.title,
          message: notificationConfig.message,
          related_email_event_id: insertedEvent.id,
          related_campaign: campaignName,
          payload: {
            contact_email,
            email_number: emailNumber,
            event_type,
            ...(metadata || {}),
          },
        });

      if (notificationError) {
        // Log but don't fail the request if notification creation fails
        console.error('Notification creation error:', notificationError);
      }
    }

    return NextResponse.json({ ok: true }, { headers: rateLimitHeaders(rateLimit) });
  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'events' });
}
