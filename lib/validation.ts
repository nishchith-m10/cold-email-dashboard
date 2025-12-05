import { z } from 'zod';

// ============================================
// COMMON SCHEMAS
// ============================================

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');

export const workspaceIdSchema = z.string().min(1).max(100);

export const campaignNameSchema = z.string().min(1).max(200).optional();

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================
// METRICS QUERY SCHEMAS
// ============================================

export const metricsQuerySchema = z.object({
  start: dateSchema.optional(),
  end: dateSchema.optional(),
  campaign: campaignNameSchema,
  workspace_id: workspaceIdSchema.optional(),
  source: z.enum(['sheets', 'supabase']).optional(),
});

export const timeseriesQuerySchema = metricsQuerySchema.extend({
  metric: z.enum([
    'sends',
    'replies',
    'reply_rate',
    'opt_outs',
    'opt_out_rate',
    'clicks',
    'click_rate',
    'opens',
    'open_rate',
    'bounces',
    'bounce_rate',
  ]).default('sends'),
});

export const costBreakdownQuerySchema = metricsQuerySchema.extend({
  provider: z.string().optional(),
});

// ============================================
// EVENT INGESTION SCHEMAS
// ============================================

export const emailEventSchema = z.object({
  contact_email: z.string().email(),
  campaign_name: z.string().min(1).max(200),
  event_type: z.enum(['sent', 'delivered', 'bounced', 'replied', 'opt_out', 'opened', 'clicked']),
  email_number: z.number().int().min(1).max(10).optional(),
  provider: z.string().max(50).optional(),
  provider_message_id: z.string().max(200).optional(),
  subject: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
  workspace_id: workspaceIdSchema.optional(),
});

export const costEventSchema = z.object({
  provider: z.string().min(1).max(50),
  model: z.string().min(1).max(100),
  tokens_in: z.number().int().min(0).default(0),
  tokens_out: z.number().int().min(0).default(0),
  cost_usd: z.number().min(0).optional(),
  campaign_name: z.string().max(200).optional(),
  contact_email: z.string().email().optional(),
  purpose: z.string().max(200).optional(),
  workflow_id: z.string().max(100).optional(),
  run_id: z.string().max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
  workspace_id: workspaceIdSchema.optional(),
});

export const batchCostEventsSchema = z.array(costEventSchema).min(1).max(100);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Parse and validate query parameters from a URL
 */
export function parseQueryParams<T extends z.ZodSchema>(
  url: URL,
  schema: T
): z.infer<T> | { error: string } {
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const result = schema.safeParse(params);
  if (!result.success) {
    return { error: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') };
  }
  return result.data;
}

/**
 * Parse and validate JSON body
 */
export async function parseBody<T extends z.ZodSchema>(
  request: Request,
  schema: T
): Promise<z.infer<T> | { error: string }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return { error: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') };
    }
    return result.data;
  } catch {
    return { error: 'Invalid JSON body' };
  }
}

/**
 * Check if result is an error
 */
export function isValidationError(result: unknown): result is { error: string } {
  return typeof result === 'object' && result !== null && 'error' in result;
}

