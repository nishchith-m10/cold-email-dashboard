# MASTER TESTING CHECKLIST
### UpShot Cold Email Platform — Post-Genesis Verification
**Date:** February 2026 | **Deadline:** March 9, 2026 | **Goal:** 3 Paying Clients

---

## HOW TO USE

Print this out. Work top to bottom. Mark each item: **PASS**, **FAIL**, or **PARTIAL**.
If FAIL or PARTIAL — fix it before moving to the next section.
Items marked with **(BLOCKER)** must pass or nothing downstream works.

---

## 1. ENVIRONMENT & PREREQUISITES

- [ ] `npm run build` completes with zero errors
- [ ] `npm run dev` starts on localhost:3000
- [ ] `.env.local` has all required keys: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `DIGITALOCEAN_API_TOKEN`, `REDIS_URL`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `ENCRYPTION_KEY`, `CRON_SECRET`, `N8N_BASE_URL`, `N8N_API_KEY`
- [ ] Supabase project accessible — can run SQL in dashboard
- [ ] `genesis` schema exists in Supabase (check: `SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'genesis'`)
- [ ] `genesis` schema is exposed in PostgREST (Supabase Dashboard → Settings → API → Exposed schemas → must include "genesis")
- [ ] Redis/Upstash is reachable (test connection from app)
- [ ] Clerk auth is working (can sign in/sign up)
- [ ] DigitalOcean API token is valid (can list droplets)

---

## 2. CREDENTIAL AUTO-INJECTION (BLOCKER)

> If this doesn't work, no tenant automation works. Test this first.

- [ ] Sidecar code contains HTTP calls to n8n credentials API (`POST /api/v1/credentials`)
- [ ] Credential creation happens BEFORE workflow deployment in the ignition sequence
- [ ] The correct order is verified: Boot → Handshake → Encrypted creds to Sidecar → Sidecar creates creds in n8n → UUID Mapper gets real UUIDs → Replace in templates → Deploy workflows
- [ ] UUID Mapper runs AFTER credentials exist (so it can resolve real n8n-assigned UUIDs)
- [ ] After provisioning a test workspace, credentials are visible in n8n UI (Settings → Credentials)

**Status:** ______ **Notes:** _______________________________________________

---

## 3. WORKFLOW TEMPLATES — GENERIC VS HARDCODED (BLOCKER)

> If templates are hardcoded to Ohio/legacy values, every new client gets the wrong pitch.

- [ ] Open `cold-email-system/Email Preparation.json` — search for "calendly": is it a placeholder (`{{CALENDLY_LINK}}` or `YOUR_CALENDLY_URL`) or a hardcoded URL?
- [ ] Search for "real estate" or any specific niche text — is the pitch a configurable variable or hardcoded?
- [ ] Search for sender email — is it a placeholder or a hardcoded address?
- [ ] Search for Google Sheets document ID — is it a placeholder or hardcoded?
- [ ] In `lib/genesis/ignition-orchestrator.ts`, verify the `variableMap` includes all these values: `YOUR_WORKSPACE_ID`, `YOUR_WORKSPACE_SLUG`, `YOUR_WORKSPACE_NAME`, `YOUR_LEADS_TABLE`
- [ ] Verify additional variables are passed for: Calendly link, sender email, company pitch, niche/industry
- [ ] After deployment to a test droplet, grep the deployed workflow JSON — zero hardcoded Ohio values remain

**Status:** ______ **Notes:** _______________________________________________

---

## 4. DEFAULT_TEMPLATES COMPLETENESS (BLOCKER)

> Ignition only deploys what's in the DEFAULT_TEMPLATES array.

- [ ] Open `lib/genesis/ignition-types.ts` — find `DEFAULT_TEMPLATES` array
- [ ] Verify these templates are listed:
  - [ ] Email 1
  - [ ] Email 2
  - [ ] Email 3
  - [ ] Email Preparation
  - [ ] Research Report
  - [ ] Reply Tracker
  - [ ] Opt-Out Handler
- [ ] If any are missing, add them with correct `template_name`, `required_credentials`, and `is_default: true`

**Status:** ______ **Notes:** _______________________________________________

---

## 5. POSTGRES NODE ROUTING (BLOCKER)

> n8n workflow Postgres nodes must connect to the correct tenant partition in YOUR Supabase — not leads_ohio.

- [ ] In each workflow template JSON, find every Postgres node
- [ ] Verify the `table` field uses a variable (e.g., `YOUR_LEADS_TABLE`) — NOT `leads_ohio`
- [ ] Verify the `credentials` field is a UUID placeholder — NOT a hardcoded credential ID
- [ ] Verify the Variable Mapper rewrites `YOUR_LEADS_TABLE` → `genesis.leads_p_{workspace_slug}`
- [ ] Verify the Ohio Firewall (`lib/genesis/ohio-firewall.ts`) blocks Genesis paths from touching `leads_ohio`

**Status:** ______ **Notes:** _______________________________________________

---

## 6. OPT-OUT URL PER TENANT (BLOCKER — Legal)

> Wrong unsubscribe URL = CAN-SPAM violation.

- [ ] In Email 1/2/3 workflow templates, find `UNSUB_BASE` or unsubscribe URL construction
- [ ] Verify `YOUR_N8N_INSTANCE_URL` is a placeholder that gets replaced with the tenant's droplet URL at deployment
- [ ] After deploying to a test droplet, send a test email, click unsubscribe link — does it hit the CORRECT n8n instance?
- [ ] Does the Opt-Out workflow fire and mark the contact as `opted_out` in Supabase `email_events`?

**Status:** ______ **Notes:** _______________________________________________

---

## 7. IGNITION ORCHESTRATOR — FULL SEQUENCE

- [ ] Trigger ignition for a fresh test workspace
- [ ] Step 1 — Partition: `genesis.leads_p_{slug}` created in Supabase
- [ ] Step 1 — Partition registered in `genesis.partition_registry`
- [ ] Step 1 — RLS enabled on the new partition
- [ ] Step 2 — Droplet: DigitalOcean droplet created (1 vCPU / 1 GB / $6 tier)
- [ ] Step 2 — Cloud-Init script runs, Docker containers start
- [ ] Step 3 — Sidecar boots and responds to health check
- [ ] Step 4 — Handshake: JWT exchange completes between Sidecar and Dashboard
- [ ] Step 5 — Credentials injected via Sidecar → n8n API
- [ ] Step 6 — UUID Mapper runs, replaces all placeholders
- [ ] Step 7 — All 7 workflows deployed to n8n
- [ ] Step 8 — All workflows activated
- [ ] Final state: `ignition_state` shows `ACTIVE_HEALTHY`
- [ ] Idempotency: running ignition again does NOT duplicate anything
- [ ] Failure rollback: kill a step mid-way — verify droplet is destroyed, partition dropped, state cleaned up

**Status:** ______ **Notes:** _______________________________________________

---

## 8. CAMPAIGN PROVISIONING & ISOLATION

### 8a. Campaign Creation

- [ ] Create Campaign A in a workspace via the dashboard
- [ ] Verify campaign record created in `campaigns` table with `status: paused`
- [ ] Verify `provisioning_status` entries created for steps: `db`, `n8n_clone`, `webhook`, `activate`
- [ ] Verify `n8n_clone` step creates 7 new workflow instances on the n8n instance
- [ ] Verify workflow names follow pattern: `[WorkspaceName] CampaignA - Email 1`, etc.
- [ ] Create Campaign B in the same workspace
- [ ] Verify Campaign B creates another 7 workflows (14 total on the n8n instance)
- [ ] Verify Campaign A workflows are untouched

### 8b. Campaign Dashboard Isolation

- [ ] Open the Overview dashboard — default view shows aggregated data across all campaigns
- [ ] Select Campaign A from the campaign dropdown → verify only Campaign A data shows
- [ ] Select Campaign B → verify only Campaign B data shows
- [ ] Switch back to "All Campaigns" → verify aggregated data returns
- [ ] Verify this filtering works on: Overview page, Analytics page, Step Breakdown, LLM Costs
- [ ] Verify the campaign dropdown is populated from `daily_stats.campaign_name`

### 8c. Campaign Lifecycle

- [ ] Toggle Campaign A to active → verify its n8n workflows activate via Sidecar
- [ ] Toggle Campaign A to paused → verify its n8n workflows deactivate
- [ ] Campaign B remains unaffected during Campaign A toggles

**Status:** ______ **Notes:** _______________________________________________

---

## 9. DATA FLOW — EVENTS & COSTS

### 9a. Event Ingestion

- [ ] From n8n (or curl), send `POST /api/events` with `x-webhook-token` header, body: `{"event_type":"sent","workspace_id":"X","campaign_name":"Y","contact_email":"test@test.com"}`
- [ ] Verify the event appears in `email_events` table with correct `workspace_id` and `campaign_name`
- [ ] Verify `daily_stats` trigger fires (row in `daily_stats` for that day)
- [ ] Verify the dashboard aggregate API returns the new event in its response
- [ ] Verify REJECTION: send same request without `x-webhook-token` → must reject
- [ ] Verify REJECTION: send with wrong token → must reject

### 9b. Cost Event Ingestion

- [ ] Send `POST /api/cost-events` with LLM usage data (provider, model, tokens_in, tokens_out, cost_usd)
- [ ] Verify row appears in `llm_usage` table
- [ ] Verify the Analytics page shows the cost under the correct provider/model

### 9c. Reply & Opt-Out Events

- [ ] Send a `reply` event → verify it appears in dashboard under Replies
- [ ] Send an `opt_out` event → verify the contact is suppressed from future sends
- [ ] Verify the reply rate and opt-out rate recalculate correctly in the summary metrics

**Status:** ______ **Notes:** _______________________________________________

---

## 10. MULTI-TENANT WORKSPACE ISOLATION (RLS)

- [ ] Create Workspace A (User A) and Workspace B (User B) with separate Clerk accounts
- [ ] Add test events to Workspace A
- [ ] Log in as User B → call `/api/dashboard/aggregate` → verify ZERO Workspace A data returned
- [ ] Verify RLS enabled on: `email_events`, `llm_usage`, `leads` / `leads_ohio`, `workspace_credentials`, `audit_log`
- [ ] Verify RLS enabled on genesis tables: `partition_registry`, `ignition_state`, `workspace_health`, `sandbox_config`, `webhook_registry`
- [ ] Attempt direct Supabase query without workspace context → must return empty (fail-closed)

**Status:** ______ **Notes:** _______________________________________________

---

## 11. ONBOARDING WIZARD — END TO END

- [ ] Create a fresh Clerk account (incognito window)
- [ ] Step 1 (Brand): Enter company URL → auto-scrape populates name/logo/description
- [ ] Step 2-3 (Credentials): Enter Gmail OAuth or SMTP creds → saved to encrypted vault (`workspace_credentials`, AES-256-GCM)
- [ ] Step 4-5 (DNS): SPF/DKIM/DMARC records generated correctly for the sending domain
- [ ] Step 6-7 (Tracking): Tracking domain configured or skippable
- [ ] Step 8-10 (Config): Campaign settings, Calendly link, ICP definition saved
- [ ] Step 11 (Launch): Triggers Ignition Orchestrator → droplet provisions
- [ ] Progress persists across browser refresh (state saved to `onboarding_progress` table)
- [ ] After completion, workspace shows as ONLINE in admin panel

**Status:** ______ **Notes:** _______________________________________________

---

## 12. SANDBOX ENGINE

- [ ] Navigate to Sandbox page (`/sandbox`)
- [ ] `SandboxPanel` component renders: Test Runner, Configuration Section, Execution Monitor, History
- [ ] Set sandbox configuration (max emails, office hours, reply delay) → saves to `genesis.sandbox_config`
- [ ] Configuration persists on page reload
- [ ] Trigger a test campaign via Test Runner (`POST /api/sandbox/test-campaign`)
- [ ] Verify it resolves the Sidecar URL from `genesis.partition_registry`
- [ ] Verify the Sidecar triggers the n8n test workflow
- [ ] Execution Monitor shows real-time SSE events from `/api/sandbox/execution-stream/[executionId]`
- [ ] Test run appears in the History list with duration and status
- [ ] Clicking a past run re-opens its execution details
- [ ] Rate limiter works: rapid-fire test runs → 429 after limit exceeded
- [ ] Sandbox operations do NOT create real email events in production tables

**Status:** ______ **Notes:** _______________________________________________

---

## 13. WATCHDOG — STATE RECONCILIATION

- [ ] Manually introduce drift: delete a workflow directly from n8n UI
- [ ] Trigger watchdog run via `POST /api/admin/watchdog`
- [ ] Verify watchdog detects the drift (type: `ghost_campaign` or `orphan_workflow`)
- [ ] Verify drift is logged in `genesis.watchdog_runs` and `genesis.watchdog_events`
- [ ] Enable auto-heal → verify the missing workflow is recreated
- [ ] Run watchdog again → verify zero drifts detected (healed)

**Status:** ______ **Notes:** _______________________________________________

---

## 14. UUID MAPPER & TEMPLATE MANAGER

- [ ] Take a raw workflow template JSON with placeholder credentials
- [ ] Run UUID Mapper with a real credential map (n8n credential IDs)
- [ ] Verify ALL `YOUR_*` placeholder strings are replaced in the output
- [ ] Verify the output is valid n8n workflow JSON (parse it)
- [ ] Verify `YOUR_WORKSPACE_ID`, `YOUR_LEADS_TABLE`, `YOUR_N8N_INSTANCE_URL` are all resolved
- [ ] Run the same mapper twice with same input → verify identical output (deterministic)

**Status:** ______ **Notes:** _______________________________________________

---

## 15. ADMIN PANEL & GOD MODE

- [ ] Access `/admin` routes as super_admin → allowed
- [ ] Access `/admin` routes as regular member → 403 Forbidden
- [ ] API Health page shows status of external services (Supabase, Clerk, OpenAI, etc.)
- [ ] Audit Log page shows system events with actor, action, resource, timestamp
- [ ] Workspace freeze: freeze a workspace → verify all operations blocked for that workspace
- [ ] Workspace unfreeze: unfreeze → verify operations resume
- [ ] Kill switch: activate for a workspace → campaigns pause, spending stops
- [ ] Kill switch: deactivate → verify resume

**Status:** ______ **Notes:** _______________________________________________

---

## 16. FINANCIAL CONTROLS

- [ ] Verify `llm_usage` table tracks per-call costs with provider, model, tokens, cost_usd
- [ ] Verify Analytics page aggregates costs correctly (total, by provider, by model, daily trend)
- [ ] Verify cost-per-reply and cost-per-email calculations are correct
- [ ] Verify the kill switch blocks further API spending when activated
- [ ] Verify kill switch state persists across restarts

**Status:** ______ **Notes:** _______________________________________________

---

## 17. GDPR & TENANT LIFECYCLE

- [ ] Trigger data export for a workspace → verify all lead data included
- [ ] Trigger data deletion → verify 7-day grace period before hard delete
- [ ] After grace period → verify data is permanently removed
- [ ] Freeze a workspace → verify all operations blocked
- [ ] Delete a workspace → verify cascade cleanup: events, leads, credentials, partition, audit logs, config

**Status:** ______ **Notes:** _______________________________________________

---

## 18. AUDIT LOGGING

- [ ] Perform admin actions: freeze workspace, rotate credentials, delete user
- [ ] Verify each action creates an entry in `audit_log` table
- [ ] Each entry has: actor (user ID), resource (what was affected), action (what was done), IP address, timestamp
- [ ] Verify audit log entries cannot be modified or deleted by non-admin users
- [ ] Verify Login Audit: sign in → check `login_audit` table has the event

**Status:** ______ **Notes:** _______________________________________________

---

## 19. LOCAL MODE (FOR BETA TESTING)

- [ ] Set `LOCAL_MODE=true` in `.env.local`
- [ ] Verify ignition orchestrator skips the DigitalOcean API droplet creation call
- [ ] Provide a manual IP address (local Docker n8n at `localhost:5678`)
- [ ] Verify all downstream steps still run: handshake, credential inject, workflow deploy, activate
- [ ] Spin up the local test kit docker-compose → n8n accessible at `localhost:5678`
- [ ] Verify the dashboard treats this as a normal ONLINE workspace

**Status:** ______ **Notes:** _______________________________________________

---

## 20. FULL END-TO-END — 3-CLIENT SIMULATION

> This is the final boss. Pass this and you're client-ready.

### Client A

- [ ] Create workspace → Complete onboarding → Ignition provisions droplet
- [ ] Create Campaign A1 → 7 workflows deployed
- [ ] Import 10 test leads via CSV
- [ ] Run Email Preparation → Research Report → Email 1 sends
- [ ] Reply to one email → Reply Tracker picks it up → `reply` event in dashboard
- [ ] Click unsubscribe on one email → Opt-Out fires → `opt_out` event in dashboard
- [ ] Dashboard shows: sends, replies, opt-outs, costs — all correct for Client A only

### Client B

- [ ] Create workspace → Complete onboarding → Ignition provisions SEPARATE droplet
- [ ] Create Campaign B1 → 7 workflows on Client B's n8n instance
- [ ] Run same test flow → verify all data isolated from Client A
- [ ] Dashboard for Client B shows ZERO Client A data

### Client C

- [ ] Create workspace → Same flow → Third droplet
- [ ] Verify all three workspaces running simultaneously
- [ ] Verify admin panel shows all 3 workspaces with correct health status
- [ ] Verify total system: 3 droplets, 3 partitions, 21+ workflows, zero data crossover

**Status:** ______ **Notes:** _______________________________________________

---

## SIGN-OFF

| Section | Status | Tested By | Date |
|---------|--------|-----------|------|
| 1. Environment | | | |
| 2. Credential Injection | | | |
| 3. Template Genericity | | | |
| 4. DEFAULT_TEMPLATES | | | |
| 5. Postgres Routing | | | |
| 6. Opt-Out URL | | | |
| 7. Ignition Orchestrator | | | |
| 8. Campaign Isolation | | | |
| 9. Data Flow | | | |
| 10. Multi-Tenant RLS | | | |
| 11. Onboarding Wizard | | | |
| 12. Sandbox Engine | | | |
| 13. Watchdog | | | |
| 14. UUID Mapper | | | |
| 15. Admin / God Mode | | | |
| 16. Financial Controls | | | |
| 17. GDPR & Lifecycle | | | |
| 18. Audit Logging | | | |
| 19. Local Mode | | | |
| 20. 3-Client Simulation | | | |

**All sections PASS:** [ ] YES — Ready for first paying client

**Signed:** _________________________ **Date:** _____________
