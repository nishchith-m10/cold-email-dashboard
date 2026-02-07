/**
 * Login History API
 * 
 * GET /api/audit/login-history - Get login history for authenticated user
 * 
 * Query params:
 * - limit: Number of records (default: 50, max: 100)
 * - startDate: ISO timestamp
 * - endDate: ISO timestamp
 * - eventType: Specific event type to filter
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getLoginHistory } from '@/lib/genesis/login-audit';

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    // Authenticate user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50', 10),
      100
    );
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;
    const eventType = searchParams.get('eventType') || undefined;

    // Get login history
    const history = await getLoginHistory(user.id, {
      limit,
      startDate,
      endDate,
      eventType,
    });

    return NextResponse.json({
      success: true,
      count: history.length,
      data: history.map((log) => ({
        id: log.id,
        timestamp: log.timestamp,
        eventType: log.action.toLowerCase(),
        success: log.details?.success ?? true,
        failureReason: log.details?.failure_reason,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        country: log.details?.geo_country,
        city: log.details?.geo_city,
        region: log.details?.geo_region,
        sessionId: log.details?.session_id,
        metadata: log.details,
      })),
    });
  } catch (err) {
    console.error('[Login History API] Exception:', err);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
