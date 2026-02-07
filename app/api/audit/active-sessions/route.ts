/**
 * Active Sessions API
 * 
 * GET /api/audit/active-sessions - Get active sessions for authenticated user
 * DELETE /api/audit/active-sessions/[sessionId] - Revoke a specific session
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getActiveSessions, auditSessionRevoked } from '@/lib/genesis/login-audit';

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

    // Get active sessions
    const sessions = await getActiveSessions(user.id);

    return NextResponse.json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (err) {
    console.error('[Active Sessions API] Exception:', err);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
