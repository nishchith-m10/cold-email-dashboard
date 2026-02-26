# CORE VERIFICATION AUDIT
### Everything You Were Unsure About — Verified Before First Client
**For:** Claude Opus in VS Code with full codebase access
**Context:** These are the specific doubts raised during planning. Verify each one.
**Rule:** Do not add features. Do not refactor. Only verify and fix what is broken.

---

## HOW TO USE THIS DOCUMENT

Each section is a doubt or unknown that came up in conversation. For each one:
1. Find the relevant code using the file paths given
2. Answer the verification question (YES it works / NO it's broken / PARTIAL)
3. If NO or PARTIAL — fix only that specific thing
4. Move to the next item

Do not go beyond what's listed here. This is not a comprehensive QA document.
This is a surgical audit of known unknowns.

---

## BLOCK 1: THE MOST CRITICAL — n8n CREDENTIAL INJECTION

**The doubt:** When a new droplet is provisioned and n8n boots fresh with zero configuration,
does the system automatically create all the credentials n8n needs? Or does someone have
to manually go into n8n Settings → Credentials and configure them by hand?

**Why it matters:** If credentials don't auto-inject, every new client requires manual
n8n setup. The entire sovereign automation model breaks. This is the single most
important thing to verify.

**Where to look:**
- `sidecar/` — the agent running on each droplet
- `lib/genesis/uuid-mapper.ts` — the Dynamic UUID Mapper
- `lib/genesis/ignition-orchestrator.ts` — the provisioning sequence

**The exact question to answer:**
Does the sidecar call the n8n credentials API (`POST /api/v1/credentials`) to
programmatically CREATE each credential (Supabase, OpenAI, Anthropic, Gmail,
Relevance AI, Apify, Google Sheets) using values from the encrypted vault?

**Verification steps:**
- [ ] Search sidecar code for any HTTP calls to `/api/v1/credentials`
- [ ] If found: confirm the credential creation happens BEFORE workflow deployment
- [ ] If NOT found: this is broken — the sidecar needs credential creation calls added
- [ ] Confirm the UUID Mapper runs AFTER credentials exist (so it can get real UUIDs)
- [ ] Confirm the correct order: Boot → Create Credentials → Get UUIDs → Replace in templates → Deploy workflows

**Expected correct order in ignition sequence:**
```
1. Droplet provisions, sidecar boots
2. Sidecar registers with dashboard (handshake)
3. Dashboard sends encrypted credentials to sidecar
4. Sidecar calls n8n POST /api/v1/credentials for each service
5. Sidecar retrieves the UUID assigned to each credential by n8n
6. UUID Mapper replaces placeholder UUIDs in workflow templates with real UUIDs
7. Sidecar deploys the rewritten workflows to n8n
8. Workflows activate with correct credentials
```

**Status:** [ ] WORKS  [ ] BROKEN  [ ] PARTIAL

---

## BLOCK 2: n8n POSTGRES NODE — WHICH DATABASE DOES IT CONNECT TO?

**The doubt:** The n8n workflows have Postgres nodes that read and write lead data.
In the Ohio (legacy) system, those nodes connect to `leads_ohio` in Supabase directly.
When a new tenant's droplet provisions, do those Postgres nodes automatically
point to that tenant's workspace-partitioned table in Supabase? Or do they still
hardcode the Ohio connection?

**Why it matters:** If new tenants' n8n workflows still read from `leads_ohio`,
their leads are mixed with the legacy Ohio data. Complete data corruption.

**Where to look:**
- `lib/genesis/uuid-mapper.ts` — does it replace database connection strings too?
- `lib/genesis/phase53/` — the full UUID mapping phase
- `templates/` — the base n8n workflow templates
- `lib/genesis/ohio-firewall.ts` — the Ohio protection layer

**The exact questions to answer:**
1. In the workflow templates, what is the Postgres credential placeholder?
   Is it a UUID placeholder that gets replaced, or a hardcoded connection string?
2. When a new workspace is provisioned, does it get its own Supabase
   credential pointing to `genesis.[workspace_id]` schema?
   Or does it reuse the Ohio `leads_ohio` table?
3. Does the Ohio Firewall block new Genesis provisioning paths from
   touching `leads_ohio`?

**Verification steps:**
- [ ] Open the base workflow templates in `templates/` folder
- [ ] Find the Postgres node configuration in Email Preparation workflow
- [ ] Check what the `table` field is set to — is it `leads_ohio` or a variable?
- [ ] Check what the `credentials` field is set to — is it a UUID placeholder?
- [ ] Confirm the UUID Mapper replaces that credential UUID with a tenant-specific Supabase connection
- [ ] Confirm that tenant-specific Supabase connection points to their partitioned schema

**Status:** [ ] WORKS  [ ] BROKEN  [ ] PARTIAL

---

## BLOCK 3: CAMPAIGN DATA ISOLATION

**The doubt:** In the multi-tenant model, each client gets a workspace. Inside that
workspace they can have multiple campaigns. But is the data (analytics, LLM costs,
contacts, sequences) truly isolated per campaign within that workspace? Can a user
accidentally see or mix data between Campaign A (marketing leads) and Campaign B
(sales leads)?

**Why it matters:** If campaigns aren't isolated, a client's data is unreliable.
They can't trust the analytics they're seeing. That kills trust immediately.

**Where to look:**
- `supabase/schema.sql` — check if campaigns have a foreign key structure
- `app/api/` — check if API routes filter by both `workspace_id` AND `campaign_id`
- Database tables: `email_events`, `leads_ohio`/leads table, `llm_usage`

**The exact questions to answer:**
1. Do `email_events` rows have a `campaign_id` column?
2. Do all dashboard API routes that return analytics filter by `campaign_id`
   when a specific campaign is selected?
3. Does the contacts/leads table have campaign-level scoping or only workspace-level?
4. Can a user navigate from one campaign's view to another without data bleeding?

**Verification steps:**
- [ ] Check `email_events` table schema — does it have `campaign_id`?
- [ ] Check `llm_usage` table — does it have `campaign_id`?
- [ ] Check `app/api/dashboard/` routes — do they accept and filter by `campaign_id`?
- [ ] Check the frontend campaign selector — when switching campaigns, does it
      trigger a fresh API call with the new `campaign_id`?
- [ ] Test manually: create two campaigns, add events to each, confirm the
      dashboard shows only the correct campaign's data when each is selected

**Status:** [ ] WORKS  [ ] BROKEN  [ ] PARTIAL

---

## BLOCK 4: CONTROL PLANE — IS IT ACTUALLY RUNNING?

**The doubt:** The Control Plane (BullMQ workers, Watchdog, Heartbeat processor,
Hibernation controller) cannot run on Vercel because Vercel kills processes after
60 seconds. The Control Plane needs to be deployed somewhere that allows persistent
24/7 processes. Right now it may not be deployed at all.

**Why it matters:** Without the Control Plane running:
- BullMQ jobs queue up but never get processed
- Fleet health watchdog never runs — drifted/zombie droplets go undetected
- Heartbeat processor never runs — droplet health states never update
- Hibernation controller never runs — idle droplets never get cost-optimized
- Cron jobs that need persistent execution never fire

**Where to look:**
- `control-plane/` — the separate service
- `vercel.json` — check if any cron jobs are defined here
- `.env.local` / environment variables — is `REDIS_URL` pointing to a live Redis?

**The exact questions to answer:**
1. Is the control-plane service currently deployed anywhere?
   (Railway, Render, a VPS, anywhere)
2. Is Redis (Upstash or other) running and reachable?
3. Are BullMQ queues accumulating jobs that aren't being processed?
4. Which specific functions ONLY work when the Control Plane is running?

**Verification steps:**
- [ ] Check `control-plane/` — is there a deployment config (Railway, Render, Dockerfile)?
- [ ] Try connecting to your Redis URL — is it live?
- [ ] Check if there are any BullMQ jobs stuck in the queue
- [ ] Identify which features are completely dead without the Control Plane
- [ ] For launch week: list which features still work on Vercel alone (API routes
      under 60 seconds) vs which are completely broken without Control Plane

**For immediate fix (if not deployed):**
Deploy control-plane to Railway free tier:
```bash
cd control-plane
# Install Railway CLI
npm install -g @railway/cli
railway login
railway init
railway up
```

**Status:** [ ] DEPLOYED  [ ] NOT DEPLOYED  [ ] PARTIALLY WORKING

---

## BLOCK 5: THE n8n WORKFLOW TEMPLATES — ARE THEY GENERIC?

**The doubt:** The actual n8n workflow files (Email Preparation, Email 1, 2, 3,
Reply Tracker, Opt-Out, Research Report) currently have hardcoded values from the
Ohio/legacy system. Specifically:
- The company pitch is written for an AI automation agency targeting real estate agents
- Calendly links are specific to one person
- The sender email is hardcoded
- Google Sheet document IDs are hardcoded

When these workflows deploy to a new tenant's droplet, do those hardcoded values
get replaced with the tenant's values? Or does a new client end up with the wrong
pitch and wrong Calendly link?

**Where to look:**
- `templates/` folder — the base workflow JSON files
- `lib/genesis/uuid-mapper.ts` — what exactly does it replace?
- `lib/genesis/phase53/` — full credential mapping logic

**The exact questions to answer:**
1. In the workflow templates, are the Calendly links UUID placeholders or hardcoded URLs?
2. Is the company pitch/offer text (the Claude prompt about "AI Automation Agency
   helping real estate teams") a configurable variable or hardcoded in the template?
3. Is the sender email a UUID placeholder or hardcoded?
4. Is the Google Sheets document ID a UUID placeholder or hardcoded?
5. What EXACTLY does the UUID Mapper replace — only API credential UUIDs,
   or also text-based configuration values like Calendly links and pitch text?

**Verification steps:**
- [ ] Open the Email Preparation workflow template in `templates/`
- [ ] Search for "calendly" — is it a placeholder like `{{CALENDLY_LINK}}` or a real URL?
- [ ] Search for "real estate" — is the pitch text hardcoded or a variable?
- [ ] Search for the sender email — placeholder or hardcoded?
- [ ] Search for the Google Sheets document ID — placeholder or hardcoded?
- [ ] Check UUID Mapper — does it only handle n8n credential UUIDs or also
      string substitution of config values?

**If hardcoded values exist that aren't replaced:**
The onboarding wizard needs to collect these values (Calendly link, company pitch,
niche/industry, sender email) and inject them into the workflow templates
before deployment. This may already be in Phase 64 (Onboarding Gateway) —
verify that those values are actually passed through to template rewriting.

**Status:** [ ] FULLY GENERIC  [ ] PARTIALLY HARDCODED  [ ] FULLY HARDCODED

---

## BLOCK 6: THE ONBOARDING WIZARD — DOES IT COMPLETE?

**The doubt:** The 11-step onboarding wizard is built (Phase 64). But does it
actually complete successfully end-to-end, triggering a real droplet provisioning
and resulting in a live workspace?

**Why it matters:** This is the front door for every client. If it breaks at
any step, no one can onboard.

**Where to look:**
- `app/onboarding/` — the wizard pages
- `app/api/onboarding/` — the backend handlers
- `lib/genesis/ignition-orchestrator.ts` — triggered at the end of onboarding

**Test to run (do this yourself first, before any beta tester):**
- [ ] Create a fresh Clerk account (use an incognito window)
- [ ] Go through all 11 steps of the onboarding wizard
- [ ] Note every step that either errors, gets stuck, or requires something
      that a real client wouldn't have (like knowing your internal config values)
- [ ] Does Step 11 (Launch / Ignition) actually trigger droplet provisioning?
- [ ] After completion, does the workspace appear in the admin panel?
- [ ] Does the dashboard show the new workspace as ONLINE or does it stay PENDING?

**Common failure points to check:**
- [ ] Does the wizard properly save progress so a refresh doesn't lose data?
- [ ] Does credential entry in the wizard actually save to the encrypted vault?
- [ ] Does the DNS/tracking domain setup step have a way to skip for local testing?
- [ ] Is the Calendly validation step blocking onboarding if no Calendly is provided?

**Status:** [ ] COMPLETES FULLY  [ ] FAILS AT STEP ___  [ ] UNTESTED

---

## BLOCK 7: DASHBOARD DATA — IS IT SHOWING REAL DATA?

**The doubt:** The dashboard has charts, metrics, and analytics. But is it showing
real data from the n8n workflows, or is it showing mock/empty data because the
webhook events from n8n aren't actually reaching the dashboard API?

**The data flow that must work:**
```
n8n sends email
→ n8n calls POST /api/events (email sent event)
→ Dashboard API writes to email_events table
→ Dashboard reads from email_events via materialized views
→ Charts show real numbers
```

**Where to look:**
- `app/api/events/` or `app/api/cost-events/` — the webhook receiver
- `app/api/dashboard/` — the data serving endpoints
- `supabase/` — materialized views (mv_daily_stats, mv_llm_cost)

**Verification steps:**
- [ ] Check `app/api/events/` — does this endpoint exist and accept POST requests?
- [ ] Check the webhook token validation — does it match what n8n sends?
- [ ] In Supabase, check if `email_events` has any rows (real data vs empty)
- [ ] Check if materialized views are being refreshed (there should be a cron for this)
- [ ] Check `app/api/dashboard/` — does it query from materialized views or raw tables?
- [ ] Send a manual test event via curl to the events API and confirm it appears
      in Supabase and then on the dashboard

**Test curl command:**
```bash
curl -X POST https://your-dashboard.vercel.app/api/events \
  -H "Content-Type: application/json" \
  -H "x-webhook-token: YOUR_WEBHOOK_TOKEN" \
  -d '{"event_type":"email_sent","workspace_id":"test","contact_email":"test@test.com"}'
```

**Status:** [ ] REAL DATA FLOWING  [ ] EMPTY/MOCK DATA  [ ] BROKEN WEBHOOK

---

## BLOCK 8: MULTI-TENANCY — IS WORKSPACE ISOLATION ACTUALLY ENFORCED?

**The doubt:** Multiple clients (workspaces) will share the same Supabase database.
Row Level Security (RLS) is supposed to ensure Workspace A can never see
Workspace B's data. But is RLS actually enforced correctly on all tables?

**Why it matters:** A data leak between tenants is a catastrophic trust failure.
This must work before any real client data goes in.

**Where to look:**
- `supabase/schema.sql` — RLS policy definitions
- `supabase/migrations/` — any RLS modifications
- `app/api/` — API routes should also enforce `workspace_id` filtering

**Verification test (the most important security test):**
- [ ] Create two workspaces (Workspace A and Workspace B) with separate user accounts
- [ ] Add test data to Workspace A (a campaign, some contacts, some events)
- [ ] Log in as the Workspace B user
- [ ] Call the dashboard API — does it return zero results (correct) or
      does it return Workspace A's data (broken)?
- [ ] Check the API routes directly — do they all include
      `WHERE workspace_id = [current workspace]` or equivalent RLS enforcement?

**Specific tables to verify RLS on:**
- [ ] `email_events` — is RLS enabled and filtering by workspace_id?
- [ ] `llm_usage` — is RLS enabled?
- [ ] `leads_ohio` / leads table — is RLS enabled?
- [ ] `workspace_credentials` — is RLS enabled? (critical — no cross-tenant credential access)
- [ ] `audit_log` — is RLS enabled?

**Status:** [ ] FULLY ISOLATED  [ ] PARTIAL GAPS  [ ] NOT TESTED

---

## BLOCK 9: REPLY TRACKER — IS IT ACTUALLY MONITORING?

**The doubt:** The Reply Tracker workflow uses a Gmail trigger that fires when
any new email arrives. This needs to be running 24/7 on the tenant's n8n instance.
But if the Control Plane isn't deployed, or if the Gmail OAuth token expires,
replies could be silently missed — and the client never knows a hot lead replied.

**Where to look:**
- `Reply_Tracker.json` workflow in `base-cold-email/`
- n8n's Gmail trigger node configuration
- Gmail OAuth refresh token handling

**Verification steps:**
- [ ] Confirm the Reply Tracker workflow is included in the deployment templates
- [ ] Confirm the Gmail trigger is set to active (not paused) after deployment
- [ ] Check if Gmail OAuth tokens have an expiry — is there auto-refresh logic?
- [ ] Send a test reply to the sender email — does it appear as a reply event
      in the dashboard within 5 minutes?
- [ ] Check the Supabase `email_events` table — is there a `reply` event type
      being written when a reply is detected?

**Status:** [ ] MONITORING ACTIVE  [ ] NOT MONITORING  [ ] UNTESTED

---

## BLOCK 10: OPT-OUT WEBHOOK — IS THE URL CORRECT PER TENANT?

**The doubt:** Every email has an unsubscribe link that hits a webhook URL.
In the Ohio system, that URL points to a specific hardcoded n8n instance.
When deploying to a new tenant's droplet, does the unsubscribe URL in the
email automatically point to THAT TENANT'S n8n webhook URL?

**Why it matters:** If the opt-out URL is wrong, unsubscribes don't process.
That's a CAN-SPAM violation. Real legal exposure.

**Where to look:**
- The Inject Tracking code node in Email 1/2/3 workflows
- `const UNSUB_BASE = 'YOUR_N8N_INSTANCE_URL/webhook/Unsubscribe'`
- How `YOUR_N8N_INSTANCE_URL` gets replaced at deployment time

**Verification steps:**
- [ ] Find where `UNSUB_BASE` is defined in the email workflows
- [ ] Check if `YOUR_N8N_INSTANCE_URL` is a placeholder that gets replaced
      with the tenant's actual droplet URL during deployment
- [ ] After provisioning a test tenant, send a test email and click the
      unsubscribe link — does it hit the correct n8n instance?
- [ ] Does the Opt-Out workflow fire and mark the contact as opted_out in Supabase?

**Status:** [ ] CORRECT PER TENANT  [ ] HARDCODED TO OHIO  [ ] UNTESTED

---

## BLOCK 11: COST TRACKING — IS IT FLOWING TO THE DASHBOARD?

**The doubt:** The n8n workflows have sophisticated cost tracking — every API call
(OpenAI, Anthropic, Apify, Relevance AI, Google CSE) calculates the exact USD cost
and sends it to `POST /api/cost-events` on the dashboard. But is this webhook
actually receiving and storing those events?

**Where to look:**
- `app/api/cost-events/` — the receiver endpoint
- `supabase/` — the `llm_usage` table
- The "Send Cost Events to Dashboard" node in the Email Preparation workflow

**Verification steps:**
- [ ] Confirm `app/api/cost-events/` exists and accepts POST
- [ ] Confirm the webhook token in the n8n workflow matches `DASH_WEBHOOK_TOKEN`
      in your environment variables
- [ ] After running Email Preparation on test leads, check Supabase `llm_usage`
      table — are there rows with accurate cost data?
- [ ] Check the Analytics page on the dashboard — does it show LLM costs?
- [ ] Verify the cost amounts look correct (not $0 or wildly wrong numbers)

**Status:** [ ] TRACKING CORRECTLY  [ ] NOT TRACKING  [ ] PARTIAL

---

## BLOCK 12: LOCAL MODE FOR BETA TESTING

**The doubt:** Beta testers (Nick and others) can't pay for DigitalOcean droplets.
The plan is to let them run the n8n stack locally via Docker and have the
provisioning system treat their local machine as the "droplet." But this requires
a LOCAL_MODE bypass in the provisioning flow.

**Where to look:**
- `lib/genesis/ignition-orchestrator.ts` — where DO API is called
- `lib/genesis/phase50/droplet-factory.ts` — the droplet creation logic

**What needs to exist:**
- [ ] An environment variable `LOCAL_MODE=true` that bypasses the DigitalOcean
      API call for droplet creation
- [ ] When LOCAL_MODE is true, the orchestrator accepts a manually provided
      IP address instead of creating a cloud VM
- [ ] All subsequent provisioning steps (sidecar registration, credential injection,
      workflow deployment) run identically against the local IP
- [ ] The dashboard treats the local instance as a normal workspace (ONLINE status)

**If LOCAL_MODE doesn't exist yet:**
This is the ONE new thing worth adding this week because it unblocks all beta
testing at zero cost. It's a small addition — an if/else around the droplet
creation call, not a rewrite.

**Status:** [ ] EXISTS  [ ] NEEDS BUILDING  [ ] PARTIAL

---

## SUMMARY: PRIORITY ORDER

Fix these in this exact order. Do not skip ahead.

| Priority | Block | What It Is | Breaks Everything If Wrong |
|---|---|---|---|
| 1 | Block 1 | n8n credential auto-injection | YES — no automation works |
| 2 | Block 5 | Workflow templates — generic vs hardcoded | YES — wrong client gets wrong pitch |
| 3 | Block 10 | Opt-out URL per tenant | YES — legal exposure |
| 4 | Block 6 | Onboarding wizard completes | YES — no one can onboard |
| 5 | Block 12 | Local mode for beta testing | YES — no beta testing possible |
| 6 | Block 2 | Postgres node database routing | YES — data corruption risk |
| 7 | Block 7 | Dashboard showing real data | HIGH — client can't trust what they see |
| 8 | Block 8 | Workspace isolation / RLS | HIGH — data leak between clients |
| 9 | Block 9 | Reply tracker monitoring | MEDIUM — missed replies hurt results |
| 10 | Block 11 | Cost tracking flowing | MEDIUM — can't bill accurately |
| 11 | Block 3 | Campaign data isolation | MEDIUM — analytics confusion |
| 12 | Block 4 | Control plane deployed | LOW for launch, HIGH for scale |

---

## WHAT IS NOT IN THIS DOCUMENT (BY DESIGN)

These things came up in conversation but are deliberately excluded because
they are additions, not verifications. Do not work on these this week:

- Email verification (NeverBounce/MillionVerifier) — not built yet, not needed for launch
- A/B testing framework — not built yet
- AI reply classification — not built yet
- Lead scraper/web scraper — not built yet
- Sender warmup automation — not built yet
- Stripe integration — not built yet, collect manually for now
- Mailbox warming infrastructure — not built yet
- AWS migration — not until 4-5 paying clients
- Control plane on Railway — only if BullMQ is completely broken without it
- Mobile UI polish — your UI friend's job
- Hot lead alerts — not built yet
- Lead scoring — not built yet

All of the above are real and will matter later.
None of them are needed to get your first paying client.

---

*Document generated from conversation analysis*
*Scope: Known unknowns only — surgical audit, not comprehensive QA*
*Companion to: POST_GENESIS_TESTING_DOCUMENT.md (use that for post-launch hardening)*
