/**
 * Clerk Webhook Handler for Login Audit Trail
 * 
 * Receives Clerk webhook events and logs them to audit_log
 */

import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import type { WebhookEvent } from '@clerk/nextjs/server';
import { processClerkAuditEvent } from '@/lib/genesis/login-audit';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      console.error('[Clerk Webhook] CLERK_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Get headers
    const svix_id = request.headers.get('svix-id');
    const svix_timestamp = request.headers.get('svix-timestamp');
    const svix_signature = request.headers.get('svix-signature');

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return NextResponse.json(
        { error: 'Missing svix headers' },
        { status: 400 }
      );
    }

    // Get body
    const payload = await request.json();
    const body = JSON.stringify(payload);

    // Verify signature
    const wh = new Webhook(WEBHOOK_SECRET);
    let event: WebhookEvent;

    try {
      event = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      console.error('[Clerk Webhook] Signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Get request context
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      '0.0.0.0';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Process and log event
    const result = await processClerkAuditEvent(event, ipAddress, userAgent);

    if (!result.success && result.error?.includes('Unknown')) {
      // Unknown event type - acknowledge but don't log
      return NextResponse.json({
        success: true,
        message: 'Event acknowledged but not logged',
        eventType: event.type,
      });
    }

    return NextResponse.json({
      success: result.success,
      auditId: result.auditId,
      eventType: event.type,
    });
  } catch (err) {
    console.error('[Clerk Webhook] Exception:', err);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
