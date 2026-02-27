import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Initialize Supabase with service role (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

interface ClerkUserEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted';
  data: {
    id: string;
    email_addresses: Array<{
      email_address: string;
      id: string;
    }>;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    created_at: number;
    updated_at: number;
  };
}

// D8-005: Session event for login audit
interface ClerkSessionEvent {
  type: 'session.created';
  data: {
    id: string;
    user_id: string;
    client_id?: string;
    status?: string;
    created_at: number;
    last_active_at?: number;
  };
}

type ClerkWebhookEvent = ClerkUserEvent | ClerkSessionEvent;

export async function POST(req: Request) {
  // Get webhook secret from environment
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    /* eslint-disable-next-line no-console */
    console.error('CLERK_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // Verify required headers
  if (!svix_id || !svix_timestamp || !svix_signature) {
    /* eslint-disable-next-line no-console */
    console.error('Missing svix headers');
    return NextResponse.json(
      { error: 'Missing svix headers' },
      { status: 400 }
    );
  }

  // Get body
  const payload = await req.text();

  // Create Svix webhook instance
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: ClerkWebhookEvent;

  // Verify webhook signature
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    /* eslint-disable-next-line no-console */
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Handle the webhook event
  const { type } = evt;

  try {
    switch (type) {
      case 'session.created': {
        // D8-005: Login audit — record session creation
        const sessionData = (evt as ClerkSessionEvent).data;
        const ip = headerPayload.get('x-forwarded-for') || headerPayload.get('x-real-ip') || 'unknown';
        const userAgent = headerPayload.get('user-agent') || 'unknown';

        // Insert login audit record (graceful: table might not exist yet)
        try {
          await supabase.from('login_audit').insert({
            user_id: sessionData.user_id,
            event_type: 'session.created',
            ip_address: ip,
            user_agent: userAgent,
            metadata: {
              session_id: sessionData.id,
              client_id: sessionData.client_id || null,
              status: sessionData.status || null,
            },
          });
        } catch {
          /* eslint-disable-next-line no-console */
          console.warn('[Clerk Webhook] login_audit table may not exist — skipping login audit');
        }

        /* eslint-disable-next-line no-console */
        console.log(`✓ Login recorded for user ${sessionData.user_id}`);
        break;
      }

      case 'user.created':
      case 'user.updated': {
        const data = (evt as ClerkUserEvent).data;
        const userId = data.id;
        // Extract email (use primary email)
        const primaryEmail = data.email_addresses.find((e) => e.id === data.email_addresses[0]?.id);
        
        if (!primaryEmail) {
          /* eslint-disable-next-line no-console */
          console.error('No email found for user:', userId);
          return NextResponse.json(
            { error: 'User has no email address' },
            { status: 400 }
          );
        }

        // Upsert user to Supabase
        const { error } = await supabase
          .from('users')
          .upsert(
            {
              id: userId,
              email: primaryEmail.email_address,
              first_name: data.first_name,
              last_name: data.last_name,
              image_url: data.image_url,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'id',
            }
          );

        if (error) {
          /* eslint-disable-next-line no-console */
          console.error('Supabase upsert error:', error);
          return NextResponse.json(
            { error: 'Failed to sync user to database' },
            { status: 500 }
          );
        }

        // D8-005: Audit log for user lifecycle events
        try {
          await supabase.from('login_audit').insert({
            user_id: userId,
            email: primaryEmail.email_address,
            event_type: type,
            metadata: {
              first_name: data.first_name || null,
              last_name: data.last_name || null,
            },
          });
        } catch {
          /* eslint-disable-next-line no-console */
          console.warn('[Clerk Webhook] login_audit insert failed — continuing');
        }

        /* eslint-disable-next-line no-console */
        console.log(`✓ User ${type === 'user.created' ? 'created' : 'updated'}: ${userId} (${primaryEmail.email_address})`);
        
        // If user was just created, check if they should be auto-added to a workspace
        if (type === 'user.created') {
          // Check if user has any workspaces
          const { data: workspaces, error: wsError } = await supabase
            .from('user_workspaces')
            .select('workspace_id')
            .eq('user_id', userId);

          if (wsError) {
            /* eslint-disable-next-line no-console */
            console.error('Error checking user workspaces:', wsError);
          } else if (!workspaces || workspaces.length === 0) {
            /* eslint-disable-next-line no-console */
            console.log(`New user ${userId} has no workspaces. They will see onboarding flow.`);
            // User will be redirected to /join page by frontend logic
          }
        }

        break;
      }

      case 'user.deleted': {
        const data = (evt as ClerkUserEvent).data;
        const userId = data.id;

        // D8-005: Audit log for user deletion
        try {
          const email = data.email_addresses?.[0]?.email_address || null;
          await supabase.from('login_audit').insert({
            user_id: userId,
            email,
            event_type: 'user.deleted',
            metadata: {},
          });
        } catch {
          /* eslint-disable-next-line no-console */
          console.warn('[Clerk Webhook] login_audit insert failed — continuing');
        }

        // Delete user from Supabase (CASCADE will remove from user_workspaces)
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);

        if (error) {
          /* eslint-disable-next-line no-console */
          console.error('Supabase delete error:', error);
          return NextResponse.json(
            { error: 'Failed to delete user from database' },
            { status: 500 }
          );
        }

        /* eslint-disable-next-line no-console */
        console.log(`✓ User deleted: ${userId}`);
        break;
      }

      default: {
        /* eslint-disable-next-line no-console */
        console.warn(`Unhandled webhook event type: ${(evt as { type: string }).type}`);
      }
    }

    return NextResponse.json({ success: true, type });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

