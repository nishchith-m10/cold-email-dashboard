import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { z } from 'zod';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_WEBHOOK } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Zod schema for event validation
const eventSchema = z.object({
  contact_email: z.string().email('Invalid email format'),
  campaign: z.string().max(200).optional(),
  step: z.number().int().min(1).max(10).optional(),
  event_type: z.enum(['sent', 'delivered', 'bounced', 'replied', 'opt_out', 'opened', 'clicked']),
  provider: z.string().max(50).optional(),
  provider_message_id: z.string().max(200).optional(),
  event_ts: z.string().datetime().optional(),
  subject: z.string().max(500).optional(),
  body: z.string().max(50000).optional(),
  workspace_id: z.string().max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
  // Phase 10: Idempotency fields
  idempotency_key: z.string().max(200).optional(),
  n8n_execution_id: z.string().max(200).optional(),
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

  // Verify webhook token
  const token = req.headers.get('x-webhook-token');
  if (!token || token !== process.env.DASH_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  // Phase 10: Generate idempotency key if not provided
  const idempotencyKey = validation.data.idempotency_key || 
    validation.data.n8n_execution_id || 
    crypto.randomUUID();

  try {
    // Phase 10: Fast path - Insert into webhook queue (2-5ms)
    // Database trigger will process asynchronously into email_events table
    const { error: queueError } = await supabaseAdmin
      .from('webhook_queue')
      .insert({
        idempotency_key: idempotencyKey,
        event_source: 'n8n',
        event_type: 'email_event',
        raw_payload: validation.data,
        status: 'pending',
      });

    if (queueError) {
      // Handle duplicate idempotency_key (idempotent behavior)
      if (queueError.code === '23505') {
        return NextResponse.json(
          { 
            ok: true, 
            queued: true,
            deduped: true, 
            idempotency_key: idempotencyKey 
          }, 
          { headers: rateLimitHeaders(rateLimit) }
        );
      }
      
      console.error('Webhook queue insert error:', queueError);
      return NextResponse.json(
        { error: 'Failed to queue event', details: queueError.message }, 
        { status: 500 }
      );
    }

    // Success - Event queued for processing
    return NextResponse.json(
      { 
        ok: true, 
        queued: true,
        idempotency_key: idempotencyKey 
      }, 
      { headers: rateLimitHeaders(rateLimit) }
    );
  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'events' });
}
