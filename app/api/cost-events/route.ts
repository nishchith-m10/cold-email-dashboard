import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, DEFAULT_WORKSPACE_ID } from '@/lib/supabase';
import { calculateLlmCost } from '@/lib/constants';
import { z } from 'zod';
import { checkRateLimit, getClientId, rateLimitHeaders, RATE_LIMIT_WEBHOOK } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Zod schema for cost event validation
const costEventSchema = z.object({
  workspace_id: z.string().max(100).optional(),
  campaign_name: z.string().max(200).optional(),
  contact_email: z.string().email().optional(),
  provider: z.string().min(1).max(50),
  model: z.string().min(1).max(100),
  tokens_in: z.number().int().min(0).optional(),
  tokens_out: z.number().int().min(0).optional(),
  raw_usage: z.number().min(0).optional(),
  cost_usd: z.number().min(0).optional(),
  purpose: z.string().max(200).optional(),
  workflow_id: z.string().max(100).optional(),
  run_id: z.string().max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
  // Phase 10: Idempotency fields
  idempotency_key: z.string().max(200).optional(),
  n8n_execution_id: z.string().max(200).optional(),
});

const batchCostEventsSchema = z.union([
  costEventSchema,
  z.array(costEventSchema).min(1).max(100),
]);

// Validate webhook token
function validateToken(req: NextRequest): boolean {
  const token = req.headers.get('x-webhook-token');
  const expectedToken = process.env.DASH_WEBHOOK_TOKEN;
  
  if (!expectedToken) {
    console.warn('DASH_WEBHOOK_TOKEN not configured - allowing all requests');
    return true;
  }
  
  return token === expectedToken;
}

// POST /api/cost-events - Receive cost events from n8n
export async function POST(req: NextRequest) {
  // Rate limiting
  const clientId = getClientId(req);
  const rateLimit = checkRateLimit(`cost-events:${clientId}`, RATE_LIMIT_WEBHOOK);
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  // Validate token
  if (!validateToken(req)) {
    return NextResponse.json(
      { error: 'Unauthorized - invalid or missing X-Webhook-Token' },
      { status: 401 }
    );
  }

  // Check Supabase
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const rawBody = await req.json();
    
    // Validate with Zod
    const validation = batchCostEventsSchema.safeParse(rawBody);
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
    
    // Handle both single event and batch
    const events = Array.isArray(validation.data) ? validation.data : [validation.data];
    
    const results = [];
    const errors = [];

    // Phase 10: Queue each event for async processing
    for (const event of events) {
      try {
        // Generate idempotency key (3-tier fallback)
        const idempotencyKey = event.idempotency_key || 
          event.n8n_execution_id || 
          crypto.randomUUID();

        // Fast path: Single insert into webhook queue (2-5ms)
        const { error: queueError } = await supabaseAdmin
          .from('webhook_queue')
          .insert({
            idempotency_key: idempotencyKey,
            event_source: 'n8n',
            event_type: 'cost_event',
            raw_payload: event,
            status: 'pending',
          });

        // Handle duplicate idempotency_key (database enforced)
        if (queueError) {
          if (queueError.code === '23505') {
            // Unique constraint violation = duplicate
            results.push({
              queued: true,
              deduped: true,
              idempotency_key: idempotencyKey,
              provider: event.provider,
              model: event.model,
            });
          } else {
            // Other database error
            console.error('Webhook queue insert error:', queueError);
            errors.push({ event, error: queueError.message });
          }
        } else {
          // Successfully queued
          results.push({
            queued: true,
            idempotency_key: idempotencyKey,
            provider: event.provider,
            model: event.model,
          });
        }
      } catch (err) {
        console.error('Cost event processing error:', err);
        errors.push({ event, error: String(err) });
      }
    }

    // Return results
    const status = errors.length > 0 && results.length === 0 ? 400 : 200;
    return NextResponse.json(
      {
        success: results.length > 0,
        queued: results.length,
        errors: errors.length,
        results,
        error_details: errors.length > 0 ? errors : undefined,
      },
      { status, headers: rateLimitHeaders(rateLimit) }
    );
  } catch (error) {
    console.error('Cost events API error:', error);
    return NextResponse.json(
      { error: 'Invalid JSON payload', details: String(error) },
      { status: 400 }
    );
  }
}

// GET /api/cost-events - Get recent cost events (for debugging)
export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ events: [], error: 'Database not configured' });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID;

  try {
    const { data, error } = await supabaseAdmin
      .from('llm_usage')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      events: data,
      count: data.length,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
