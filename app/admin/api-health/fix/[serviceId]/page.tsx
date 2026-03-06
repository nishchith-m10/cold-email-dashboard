'use client';

/**
 * /admin/api-health/fix/[serviceId]
 *
 * Step-by-step fix guide for each API health check service.
 * Linked from DiagnosticPanel → "Fix" button in the API Health tab.
 */

import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useState } from 'react';
import { isSuperAdmin } from '@/lib/super-admin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  CheckCheck,
  AlertTriangle,
  Terminal,
  Key,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Guide data types ────────────────────────────────────────────────────────

interface EnvVar {
  name: string;
  format: string;
  example: string;
  description: string;
}

interface FixStep {
  n: number;
  title: string;
  detail: string;
  code?: string;
}

interface ServiceFixGuide {
  name: string;
  category: string;
  description: string;
  envVars: EnvVar[];
  externalUrl: string;
  externalLabel: string;
  steps: FixStep[];
  notes?: string[];
}

// ─── Per-service guide data ──────────────────────────────────────────────────

const FIX_GUIDES: Record<string, ServiceFixGuide> = {
  openai: {
    name: 'OpenAI',
    category: 'AI',
    description:
      'Required for GPT-powered email personalisation and generation inside n8n workflows.',
    envVars: [
      {
        name: 'OPENAI_API_KEY',
        format: 'sk-proj-...',
        example: 'sk-proj-abc123xyz...',
        description: 'OpenAI secret API key',
      },
    ],
    externalUrl: 'https://platform.openai.com/api-keys',
    externalLabel: 'Open OpenAI API Keys dashboard',
    steps: [
      { n: 1, title: 'Log in to OpenAI', detail: 'Go to platform.openai.com and sign in.' },
      {
        n: 2,
        title: 'Create an API key',
        detail: 'API Keys → Create new secret key. Copy the full key — it starts with sk-.',
      },
      {
        n: 3,
        title: 'Add to .env.local',
        detail: 'Add or update the following line in .env.local:',
        code: 'OPENAI_API_KEY=sk-proj-...',
      },
      {
        n: 4,
        title: 'Add to Vercel',
        detail:
          'In Vercel → Project → Settings → Environment Variables, add OPENAI_API_KEY for Production, Preview, and Development.',
      },
      { n: 5, title: 'Redeploy', detail: 'Trigger a new deployment or restart your dev server.' },
    ],
    notes: [
      'Billing must be active on the OpenAI account — free-tier keys without billing are often rejected.',
      'Usage tier affects rate limits. Upgrade your tier if you hit 429 errors during load.',
    ],
  },

  anthropic: {
    name: 'Claude (Anthropic)',
    category: 'AI',
    description:
      'Fallback AI provider used when OpenAI is unavailable, or for Claude-specific n8n nodes.',
    envVars: [
      {
        name: 'ANTHROPIC_API_KEY',
        format: 'sk-ant-api03-...',
        example: 'sk-ant-api03-abc123...',
        description: 'Anthropic secret API key',
      },
    ],
    externalUrl: 'https://console.anthropic.com/settings/keys',
    externalLabel: 'Open Anthropic Console',
    steps: [
      { n: 1, title: 'Log in to Anthropic', detail: 'Go to console.anthropic.com and sign in.' },
      {
        n: 2,
        title: 'Create an API key',
        detail: 'Settings → API Keys → Create Key. The key starts with sk-ant-.',
      },
      {
        n: 3,
        title: 'Add to .env.local',
        detail: 'Add the following line:',
        code: 'ANTHROPIC_API_KEY=sk-ant-api03-...',
      },
      {
        n: 4,
        title: 'Add to Vercel',
        detail: 'Add ANTHROPIC_API_KEY in Vercel → Project → Settings → Environment Variables.',
      },
      { n: 5, title: 'Redeploy', detail: 'Deploy or restart dev server.' },
    ],
    notes: [
      'Set up billing alerts in Anthropic console to avoid auto-deactivation when credits run out.',
    ],
  },

  relevance_ai: {
    name: 'Relevance AI',
    category: 'Integration',
    description:
      'Powers the lead research + enrichment pipeline that runs before email personalisation.',
    envVars: [
      {
        name: 'RELEVANCE_AI_API_KEY',
        format: 'project_id:api_key',
        example: 'abc123:def456ghi789',
        description:
          'Relevance AI API key — must include the project ID prefix separated by a colon',
      },
    ],
    externalUrl: 'https://app.relevanceai.com/settings',
    externalLabel: 'Open Relevance AI Settings',
    steps: [
      { n: 1, title: 'Log in to Relevance AI', detail: 'Go to app.relevanceai.com and sign in.' },
      {
        n: 2,
        title: 'Get your API key',
        detail:
          'Settings → Integrations → API Key. Copy the full string — it includes a project ID prefix like: project_id:api_key.',
      },
      {
        n: 3,
        title: 'Add to .env.local',
        detail: 'Add the following line:',
        code: 'RELEVANCE_AI_API_KEY=project_id:api_key',
      },
      {
        n: 4,
        title: 'Add to Vercel',
        detail: 'Add RELEVANCE_AI_API_KEY in Vercel environment variables.',
      },
      { n: 5, title: 'Redeploy', detail: 'Deploy or restart dev server.' },
    ],
    notes: [
      'The key format must include the project ID prefix separated by a colon. A key without the prefix will be rejected.',
    ],
  },

  apify: {
    name: 'Apify',
    category: 'Integration',
    description:
      'Runs web scraping actors for lead discovery — Google Maps reviews, LinkedIn, etc.',
    envVars: [
      {
        name: 'APIFY_API_TOKEN',
        format: 'apify_api_...',
        example: 'apify_api_abc123xyz',
        description: 'Apify personal API token',
      },
    ],
    externalUrl: 'https://console.apify.com/account/integrations',
    externalLabel: 'Open Apify Integrations',
    steps: [
      { n: 1, title: 'Log in to Apify', detail: 'Go to console.apify.com and sign in.' },
      {
        n: 2,
        title: 'Get Personal API Token',
        detail: 'Account → Integrations → Personal API tokens → Copy token.',
      },
      {
        n: 3,
        title: 'Add to .env.local',
        detail: 'Add the following line:',
        code: 'APIFY_API_TOKEN=apify_api_...',
      },
      {
        n: 4,
        title: 'Add to Vercel',
        detail: 'Add APIFY_API_TOKEN in Vercel environment variables.',
      },
      { n: 5, title: 'Redeploy', detail: 'Deploy or restart dev server.' },
    ],
    notes: [
      'Apify has a free tier with limited compute units — set up billing alerts at 75% usage to avoid silent scraping failures.',
    ],
  },

  google_cse: {
    name: 'Google Custom Search',
    category: 'Integration',
    description:
      'Used for company website lookups and enrichment during the lead research phase.',
    envVars: [
      {
        name: 'GOOGLE_CSE_API_KEY',
        format: 'AIza...',
        example: 'AIzaSyAbc123...',
        description: 'Google Cloud API key with Custom Search API enabled',
      },
      {
        name: 'GOOGLE_CSE_ID',
        format: 'alphanumeric string',
        example: 'a1b2c3d4e5f6g7h8i',
        description: 'Programmable Search Engine ID (the "cx" value)',
      },
    ],
    externalUrl: 'https://console.cloud.google.com/apis/credentials',
    externalLabel: 'Open Google Cloud Credentials',
    steps: [
      {
        n: 1,
        title: 'Create a Google Cloud API Key',
        detail:
          'console.cloud.google.com → APIs & Services → Credentials → Create Credentials → API Key.',
      },
      {
        n: 2,
        title: 'Enable Custom Search API',
        detail:
          'APIs & Services → Library → search "Custom Search API" → Enable it on your project.',
      },
      {
        n: 3,
        title: 'Get your Search Engine ID',
        detail:
          'Go to programmablesearchengine.google.com → create or open a search engine → copy the Search engine ID (also called "cx").',
      },
      {
        n: 4,
        title: 'Add to .env.local',
        detail: 'Add both lines:',
        code: 'GOOGLE_CSE_API_KEY=AIza...\nGOOGLE_CSE_ID=...',
      },
      {
        n: 5,
        title: 'Add to Vercel',
        detail: 'Add both GOOGLE_CSE_API_KEY and GOOGLE_CSE_ID in Vercel environment variables.',
      },
      { n: 6, title: 'Redeploy', detail: 'Deploy or restart dev server.' },
    ],
    notes: [
      'The free tier allows 100 search queries per day. For higher volume, enable billing on your Google Cloud project.',
    ],
  },

  gmail: {
    name: 'Gmail OAuth',
    category: 'Email',
    description:
      'Authenticates Gmail accounts for email sending. Each workspace uses its own OAuth token.',
    envVars: [
      {
        name: 'GOOGLE_CLIENT_ID',
        format: '...apps.googleusercontent.com',
        example: '123456789-abc.apps.googleusercontent.com',
        description: 'OAuth 2.0 client ID',
      },
      {
        name: 'GOOGLE_CLIENT_SECRET',
        format: 'GOCSPX-...',
        example: 'GOCSPX-abc123',
        description: 'OAuth 2.0 client secret',
      },
    ],
    externalUrl: 'https://console.cloud.google.com/apis/credentials',
    externalLabel: 'Open Google Cloud Credentials',
    steps: [
      {
        n: 1,
        title: 'Create an OAuth 2.0 Client',
        detail:
          'console.cloud.google.com → APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID → Web application.',
      },
      {
        n: 2,
        title: 'Configure redirect URIs',
        detail:
          "Add your app's callback URL as an authorised redirect URI, e.g. https://yourdomain.com/api/auth/google/callback.",
      },
      {
        n: 3,
        title: 'Enable Gmail API',
        detail: 'APIs & Services → Library → Gmail API → Enable.',
      },
      {
        n: 4,
        title: 'Add to .env.local',
        detail: 'Add the following lines:',
        code: 'GOOGLE_CLIENT_ID=...apps.googleusercontent.com\nGOOGLE_CLIENT_SECRET=GOCSPX-...',
      },
      {
        n: 5,
        title: 'Add to Vercel',
        detail: 'Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel environment variables.',
      },
      {
        n: 6,
        title: 'Reconnect workspaces',
        detail:
          'Each workspace owner must re-authorise via Settings → Email Configuration → Reconnect Gmail.',
      },
    ],
    notes: [
      "Gmail tokens expire — ensure 'offline' access is requested during the OAuth flow so a refresh_token is returned.",
      "If the OAuth consent screen is in 'Testing' mode, tokens expire in 7 days. Publish the app to avoid this.",
    ],
  },

  digitalocean: {
    name: 'DigitalOcean',
    category: 'Infrastructure',
    description:
      'Provisions tenant droplets that host n8n sidecar instances. At least one valid token is required for workspace provisioning.',
    envVars: [
      {
        name: 'DO_TOKEN',
        format: 'dop_v1_...',
        example: 'dop_v1_abc123...',
        description: 'Primary DigitalOcean Personal Access Token (full read+write scope)',
      },
      {
        name: 'DO_TOKEN_1, DO_TOKEN_2, ...',
        format: 'dop_v1_...',
        example: 'dop_v1_abc123...',
        description:
          'Additional tokens for multi-account provisioning (beta: only DO_TOKEN needed)',
      },
    ],
    externalUrl: 'https://cloud.digitalocean.com/account/api/tokens',
    externalLabel: 'Open DigitalOcean API Tokens',
    steps: [
      { n: 1, title: 'Log in to DigitalOcean', detail: 'Go to cloud.digitalocean.com and sign in.' },
      {
        n: 2,
        title: 'Create a Personal Access Token',
        detail:
          'API → Generate New Token → set Full Access (read + write). Copy the token — it starts with dop_v1_.',
      },
      {
        n: 3,
        title: 'Add to .env.local',
        detail: 'Add the following line:',
        code: 'DO_TOKEN=dop_v1_...',
      },
      {
        n: 4,
        title: 'Seed the token into the database',
        detail:
          'The token must be encrypted and stored in Supabase so the provisioner can use it at runtime. Run:',
        code: 'pnpm tsx scripts/seed-do-account.ts',
      },
      {
        n: 5,
        title: 'Add to Vercel',
        detail: 'Add DO_TOKEN in Vercel environment variables.',
      },
      { n: 6, title: 'Redeploy', detail: 'Deploy or restart dev server.' },
    ],
    notes: [
      'The token must have Full Access scope — read-only tokens cannot create or delete droplets.',
      'For beta: one DO_TOKEN is sufficient. For production: use DO_TOKEN_1, DO_TOKEN_2, etc. for multi-account load balancing.',
    ],
  },

  supabase: {
    name: 'Supabase',
    category: 'Infrastructure',
    description:
      'Primary database and authentication layer. A broken Supabase connection is a total system failure — no features will work.',
    envVars: [
      {
        name: 'NEXT_PUBLIC_SUPABASE_URL',
        format: 'https://xxx.supabase.co',
        example: 'https://abcxyz123.supabase.co',
        description: 'Your Supabase project URL',
      },
      {
        name: 'SUPABASE_SERVICE_ROLE_KEY',
        format: 'eyJ...',
        example: 'eyJhbGciOiJIUzI1...',
        description: 'Service role key (bypasses RLS — keep strictly secret)',
      },
    ],
    externalUrl: 'https://supabase.com/dashboard',
    externalLabel: 'Open Supabase Dashboard',
    steps: [
      {
        n: 1,
        title: 'Open your Supabase project',
        detail: 'supabase.com/dashboard → select your project.',
      },
      {
        n: 2,
        title: 'Get API credentials',
        detail: 'Settings → API → copy the Project URL and the service_role key.',
      },
      {
        n: 3,
        title: 'Check project is not paused',
        detail:
          "Free tier projects auto-pause after 1 week of inactivity. If the project shows 'Paused', click Restore project.",
      },
      {
        n: 4,
        title: 'Add to .env.local',
        detail: 'Add the following lines:',
        code: 'NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=eyJ...',
      },
      {
        n: 5,
        title: 'Add to Vercel',
        detail: 'Add both variables in Vercel environment variables.',
      },
      { n: 6, title: 'Redeploy', detail: 'Deploy or restart dev server.' },
    ],
    notes: [
      'The service_role key bypasses Row Level Security. Never expose it to the browser or commit it to source control.',
      'Upgrade to Pro plan to prevent free-tier auto-pause.',
    ],
  },

  redis: {
    name: 'Redis (BullMQ)',
    category: 'Infrastructure',
    description:
      'Job queue for all background processing — email sending, fleet operations, scheduled tasks. Redis down = all async work stops.',
    envVars: [
      {
        name: 'REDIS_URL',
        format: 'redis[s]://[:password@]host:port',
        example: 'rediss://:password@abc.upstash.io:6380',
        description: 'Full Redis connection URL',
      },
    ],
    externalUrl: 'https://app.redislabs.com/',
    externalLabel: 'Open Redis Cloud',
    steps: [
      {
        n: 1,
        title: 'Get a Redis instance',
        detail:
          'Use Redis Cloud (free tier at app.redislabs.com), Upstash (recommended for Vercel), or self-hosted Redis.',
      },
      {
        n: 2,
        title: 'Copy the connection URL',
        detail: 'From your provider dashboard, copy the full Redis connection URL including host, port, and password.',
      },
      {
        n: 3,
        title: 'Add to .env.local',
        detail: 'Add the following line:',
        code: 'REDIS_URL=rediss://:password@host:port',
      },
      {
        n: 4,
        title: 'Add to Vercel',
        detail: 'Add REDIS_URL in Vercel environment variables.',
      },
      { n: 5, title: 'Redeploy', detail: 'Deploy or restart dev server.' },
    ],
    notes: [
      'Use rediss:// (double s) for TLS — required by Redis Cloud, Upstash, and most managed providers.',
      'Upstash is recommended for Vercel deployments due to serverless HTTP compatibility.',
    ],
  },

  stripe: {
    name: 'Stripe',
    category: 'Billing',
    description: 'Handles subscription billing and payment processing.',
    envVars: [
      {
        name: 'STRIPE_SECRET_KEY',
        format: 'sk_live_... or sk_test_...',
        example: 'sk_live_abc123...',
        description: 'Stripe secret API key',
      },
      {
        name: 'STRIPE_WEBHOOK_SECRET',
        format: 'whsec_...',
        example: 'whsec_abc123...',
        description: 'Webhook signing secret (required for validating Stripe webhook events)',
      },
    ],
    externalUrl: 'https://dashboard.stripe.com/apikeys',
    externalLabel: 'Open Stripe API Keys',
    steps: [
      { n: 1, title: 'Log in to Stripe', detail: 'Go to dashboard.stripe.com and sign in.' },
      {
        n: 2,
        title: 'Get your secret key',
        detail:
          'Developers → API Keys → Reveal Secret key. Use sk_test_ for development, sk_live_ for production.',
      },
      {
        n: 3,
        title: 'Add to .env.local',
        detail: 'Add the following line:',
        code: 'STRIPE_SECRET_KEY=sk_live_...',
      },
      {
        n: 4,
        title: 'Add to Vercel',
        detail: 'Add STRIPE_SECRET_KEY in Vercel environment variables.',
      },
      { n: 5, title: 'Redeploy', detail: 'Deploy or restart dev server.' },
    ],
    notes: [
      'Never use sk_live keys in development — use sk_test to avoid real charges.',
      'The STRIPE_WEBHOOK_SECRET is separate — get it from Developers → Webhooks → your endpoint → Signing secret.',
    ],
  },

  resend: {
    name: 'Resend',
    category: 'Email',
    description:
      'Sends platform transactional emails — workspace invitations, admin notifications, alerts.',
    envVars: [
      {
        name: 'RESEND_API_KEY',
        format: 're_...',
        example: 're_abc123xyz',
        description: 'Resend API key',
      },
    ],
    externalUrl: 'https://resend.com/api-keys',
    externalLabel: 'Open Resend API Keys',
    steps: [
      { n: 1, title: 'Log in to Resend', detail: 'Go to resend.com and sign in.' },
      {
        n: 2,
        title: 'Create an API key',
        detail: 'API Keys → Create API Key → Full Access → Copy key. It starts with re_.',
      },
      {
        n: 3,
        title: 'Verify your sending domain',
        detail:
          'Domains → Add Domain → follow the DNS verification steps for your domain to avoid emails landing in spam.',
      },
      {
        n: 4,
        title: 'Add to .env.local',
        detail: 'Add the following line:',
        code: 'RESEND_API_KEY=re_...',
      },
      {
        n: 5,
        title: 'Add to Vercel',
        detail: 'Add RESEND_API_KEY in Vercel environment variables.',
      },
      { n: 6, title: 'Redeploy', detail: 'Deploy or restart dev server.' },
    ],
    notes: [
      'You must verify a sending domain before transactional emails will be delivered. Unverified domains are blocked.',
    ],
  },
};

// ─── Copy-to-clipboard hook ───────────────────────────────────────────────────

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => null);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };
  return { copied, copy };
}

// ─── Code block with copy ─────────────────────────────────────────────────────

function CodeBlock({ code, id }: { code: string; id: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className="relative mt-2 rounded-md bg-zinc-950 border border-border overflow-hidden">
      <pre className="text-xs text-green-400 font-mono px-4 py-3 overflow-x-auto whitespace-pre">
        {code}
      </pre>
      <button
        onClick={() => copy(code, id)}
        className="absolute top-2 right-2 p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
        title="Copy"
      >
        {copied === id ? (
          <CheckCheck className="h-3.5 w-3.5 text-green-400" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-zinc-400" />
        )}
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ServiceFixGuidePage() {
  const params  = useParams();
  const router  = useRouter();
  const { isLoaded, user } = useUser();

  const serviceId = params?.serviceId as string;
  const guide = FIX_GUIDES[serviceId];

  if (!isLoaded) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!isSuperAdmin(user?.id ?? '')) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
        <h1 className="text-xl font-semibold">Access Denied</h1>
        <p className="text-muted-foreground">Super Admin access required.</p>
        <Button variant="outline" onClick={() => router.push('/admin')}>
          Back to Admin
        </Button>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center space-y-4">
        <Info className="h-10 w-10 text-muted-foreground mx-auto" />
        <h1 className="text-xl font-semibold">Fix guide not found</h1>
        <p className="text-muted-foreground text-sm">No guide exists for service ID: <code className="font-mono">{serviceId}</code></p>
        <Button variant="outline" onClick={() => router.push('/admin?tab=api-health')}>
          Back to API Health
        </Button>
      </div>
    );
  }

  const categoryColour: Record<string, string> = {
    AI:             'bg-purple-500/10 text-purple-400 border-purple-500/20',
    Integration:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Infrastructure: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    Email:          'bg-green-500/10 text-green-400 border-green-500/20',
    Billing:        'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* Back link */}
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Admin → API Health
        </Link>

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{guide.name}</h1>
            <Badge
              variant="secondary"
              className={cn('text-xs', categoryColour[guide.category] ?? '')}
            >
              {guide.category}
            </Badge>
          </div>
          <p className="text-muted-foreground">{guide.description}</p>

          {/* External dashboard button */}
          <a href={guide.externalUrl} target="_blank" rel="noopener noreferrer">
            <Button className="mt-3 gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold">
              <ExternalLink className="h-4 w-4" />
              {guide.externalLabel}
            </Button>
          </a>
        </div>

        {/* Environment variables */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Key className="h-4 w-4" />
            Environment Variables
          </h2>
          <div className="space-y-3">
            {guide.envVars.map((ev) => (
              <div
                key={ev.name}
                className="border border-border rounded-lg p-4 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <code className="text-sm font-mono font-semibold text-amber-400">{ev.name}</code>
                  <span className="text-xs text-muted-foreground font-mono shrink-0">{ev.format}</span>
                </div>
                <p className="text-xs text-muted-foreground">{ev.description}</p>
                <div className="text-[11px] text-zinc-500 font-mono">Example: {ev.example}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Terminal className="h-4 w-4" />
            Step-by-step Fix
          </h2>
          <ol className="space-y-4">
            {guide.steps.map((step) => (
              <li key={step.n} className="flex items-start gap-4">
                <span className="flex items-center justify-center h-7 w-7 rounded-full bg-amber-500/10 text-amber-500 text-sm font-bold shrink-0 mt-0.5 border border-amber-500/20">
                  {step.n}
                </span>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-semibold text-sm">{step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.detail}</p>
                  {step.code && <CodeBlock code={step.code} id={`step-${step.n}`} />}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Notes */}
        {guide.notes && guide.notes.length > 0 && (
          <section className="border border-amber-500/20 bg-amber-500/5 rounded-lg p-4 space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-500">
              <AlertTriangle className="h-4 w-4" />
              Important Notes
            </h2>
            <ul className="space-y-1.5">
              {guide.notes.map((note, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                  {note}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Footer CTA */}
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <a href={guide.externalUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              {guide.externalLabel}
            </Button>
          </a>
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              Back to Admin
            </Button>
          </Link>
        </div>

      </div>
    </div>
  );
}
