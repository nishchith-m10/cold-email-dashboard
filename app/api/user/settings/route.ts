import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * User Settings API
 * Stores per-user UI preferences (sidebar mode, theme, etc.)
 */

export async function GET(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const supabase = supabaseAdmin;

  try {
    // NOTE: 'user_settings' table may not exist in all deployments
    const { data, error } = await (supabase as any)
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (acceptable)
      throw error;
    }

    return NextResponse.json(data || {});
  } catch (error: any) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const body = await req.json();
  const supabase = supabaseAdmin;

  // Allowlist of known columns — prevents PGRST204 errors if a new field is
  // sent by the client before the corresponding migration has been applied.
  const ALLOWED_COLUMNS = ['sidebar_mode', 'theme', 'currency'];
  const safeBody = Object.fromEntries(
    Object.entries(body).filter(([key]) => ALLOWED_COLUMNS.includes(key))
  );

  if (Object.keys(safeBody).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  try {
    // Upsert user settings - NOTE: 'user_settings' table may not exist in all deployments
    const { data, error } = await (supabase as any)
      .from('user_settings')
      .upsert(
        {
          user_id: userId,
          ...safeBody,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating user settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
