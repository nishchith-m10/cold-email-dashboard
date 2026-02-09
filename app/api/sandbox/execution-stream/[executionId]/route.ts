/**
 * PHASE 45 - GET /api/sandbox/execution-stream/:executionId
 * 
 * Server-Sent Events (SSE) endpoint for real-time execution monitoring.
 * Polls for new execution events and streams them to the frontend.
 */

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!supabaseAdmin) {
    return new Response('Service unavailable', { status: 503 });
  }

  const { executionId } = await params;

  // Verify the execution exists and user has access
  const { data: firstEvent } = await (supabaseAdmin as any).schema('genesis')
    .from('workflow_execution_events')
    .select('workspace_id')
    .eq('execution_id', executionId)
    .limit(1)
    .maybeSingle();

  if (!firstEvent) {
    return new Response('Execution not found', { status: 404 });
  }

  // Verify workspace membership
  const { data: membership } = await supabaseAdmin
    .from('user_workspaces')
    .select('role')
    .eq('workspace_id', firstEvent.workspace_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) {
    return new Response('Access denied', { status: 403 });
  }

  // SSE Stream
  const encoder = new TextEncoder();
  let lastEventTime = '1970-01-01T00:00:00Z';
  let pollCount = 0;
  const MAX_POLLS = 600; // 5 minutes max at 500ms intervals

  const stream = new ReadableStream({
    async start(controller) {
      const interval = setInterval(async () => {
        try {
          pollCount++;
          if (pollCount > MAX_POLLS) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'timeout' })}\n\n`));
            clearInterval(interval);
            controller.close();
            return;
          }

          // Poll for new events
          const { data: newEvents } = await (supabaseAdmin as any).schema('genesis')
            .from('workflow_execution_events')
            .select('*')
            .eq('execution_id', executionId)
            .gt('created_at', lastEventTime)
            .order('created_at', { ascending: true });

          if (newEvents && newEvents.length > 0) {
            for (const event of newEvents) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'node_event', data: event, timestamp: new Date().toISOString() })}\n\n`)
              );
              lastEventTime = event.created_at;
            }
          }

          // Check if execution is complete
          const { data: completeEvent } = await (supabaseAdmin as any).schema('genesis')
            .from('workflow_execution_events')
            .select('status')
            .eq('execution_id', executionId)
            .eq('node_type', '_execution_complete')
            .maybeSingle();

          if (completeEvent) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'complete', timestamp: new Date().toISOString() })}\n\n`)
            );
            clearInterval(interval);
            controller.close();
          }

          // Heartbeat every 10 polls (5s)
          if (pollCount % 10 === 0) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`)
            );
          }
        } catch (err) {
          /* eslint-disable-next-line no-console */
          console.error('[SSE] Poll error:', err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', data: { message: 'Poll error' } })}\n\n`)
          );
        }
      }, 500); // Poll every 500ms

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
