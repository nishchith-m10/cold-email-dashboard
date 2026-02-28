/**
 * Security Activity API (Clerk-authenticated)
 *
 * GET /api/security/activity — recent security events for the current user.
 * Uses Clerk auth() and queries genesis.audit_log via supabaseAdmin.
 *
 * Query params:
 *   limit  — max records (default 10, max 50)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      // Graceful degradation — return empty when Supabase unavailable
      return NextResponse.json({ success: true, data: [] });
    }

    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get('limit') || '10', 10),
      50,
    );

    const { data, error } = await supabaseAdmin
      .schema('genesis')
      .from('audit_log')
      .select('id, timestamp, action, action_category, ip_address, user_agent, details')
      .eq('actor_id', userId)
      .eq('action_category', 'security')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Security Activity] Query error:', error);
      // Return empty on schema/table errors (e.g. table doesn't exist yet)
      return NextResponse.json({ success: true, data: [] });
    }

    return NextResponse.json({
      success: true,
      data: (data || []).map((row: any) => ({
        id: row.id,
        timestamp: row.timestamp,
        event: row.action?.toLowerCase().replace(/_/g, ' ') || 'unknown',
        ipAddress: row.ip_address,
        country: row.details?.geo_country,
        city: row.details?.geo_city,
        success: row.details?.success ?? true,
      })),
    });
  } catch (err) {
    console.error('[Security Activity] Exception:', err);
    return NextResponse.json({ success: true, data: [] });
  }
}
