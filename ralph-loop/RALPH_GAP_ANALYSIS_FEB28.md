# RALPH LOOP — Production Gap Analysis
### Feb 28, 2026 05:25 AM → Deadline: Mar 9, 2026
### Methodology: Review → Analyze → Loop → Patch → Harden

---

## EXECUTIVE SUMMARY

**Days remaining:** 9  
**Goal:** 3 paying clients on production  
**Current state:** ~60% infrastructure code exists, ~0% tested end-to-end  
**Biggest risk:** Zero real provisioning has ever been executed. Every integration is untested against live services.

---

## SECTION A — WHAT IS DONE (Verified in codebase)

### A1. Infrastructure Code (EXISTS, UNTESTED)

| Component | Files | Status |
|---|---|---|
| Ignition Orchestrator | `lib/genesis/ignition-orchestrator.ts` | ✅ Code exists. Variable map with manifest. LOCAL_MODE bypass. Never run E2E. |
| WorkspaceManifest | `lib/genesis/workspace-manifest.ts` | ✅ NEW (this session). Type, validator, builder, persistence. |
| Sidecar Agent | `sidecar/sidecar-agent.ts` | ✅ Code exists. Credential injection via `n8n-manager.ts` POST `/credentials`. Handshake protocol. Never deployed. |
| n8n Manager | `sidecar/n8n-manager.ts` | ✅ `createCredential()`, `updateCredential()`, `deleteCredential()` exist. |
| Workflow Deployer | `sidecar/workflow-deployer.ts` (405 lines) | ✅ Deploys all 7 templates. Gmail + SMTP variants. UUID replacement. |
| UUID Mapper | `lib/genesis/uuid-mapper.ts` | ✅ Replaces credential placeholder UUIDs with tenant-specific n8n UUIDs. |
| Droplet Factory | `lib/genesis/droplet-factory.ts` | ✅ Cloud-init script. Completion webhook. Operator keys removed from plaintext. |
| Operator Credential Vault | `lib/genesis/operator-credential-store.ts` + migration | ✅ Encrypted AES-256-GCM. Seed script exists. |
| Ohio Firewall | `lib/genesis/ohio-firewall.ts` | ✅ Blocks Genesis paths from touching legacy data. |
| Watchdog | `lib/genesis/phase43/watchdog-service.ts` | ✅ Drift detection. Healing. Tests exist. |
| Sandbox API | `app/api/sandbox/` (5 subroutes) | ✅ test-campaign, execution, execution-stream, history, workflow. |
| Control Plane | `control-plane/src/` (Railway config ready) | ✅ Code exists. NOT DEPLOYED anywhere. |
| Credential Vault (Phase 64) | `lib/genesis/phase64/credential-vault-service.ts` | ✅ PBKDF2 browser-tier encryption. Security fence added. |
| Cloud-Init Webhook | `app/api/sidecar/cloud-init-complete/route.ts` | ✅ NEW (this session). |

### A2. Database Schema (58+ genesis tables exist)

All genesis tables are created via migrations. Key tables verified:
- `genesis.ignition_state`, `genesis.partition_registry`, `genesis.workspace_credentials`
- `genesis.operator_credentials`, `genesis.workspace_manifests` (NEW)
- `genesis.fleet_status`, `genesis.droplet_health`, `genesis.sidecar_registry`
- `genesis.watchdog_runs`, `genesis.watchdog_drifts`
- `genesis.audit_log`, `genesis.webhook_dlq`
- Core tables (`email_events`, `llm_usage`, `daily_stats`, `contacts`) with RLS enabled

### A3. Workflow Templates (7/7 exist + SMTP variants)

| Template | File | Placeholders |
|---|---|---|
| Email 1 | `base-cold-email/Email 1.json` | 7 YOUR_* placeholders ✅ |
| Email 2 | `base-cold-email/Email 2.json` | 7 YOUR_* ✅ |
| Email 3 | `base-cold-email/Email 3.json` | 9 YOUR_* ✅ |
| Email Preparation | `base-cold-email/Email Preparation.json` | 6 YOUR_* ✅ |
| Research Report | `base-cold-email/Research Report.json` | 5 YOUR_* ✅ |
| Reply Tracker | `base-cold-email/Reply Tracker.json` | 5 YOUR_* ✅ |
| Opt-Out | `base-cold-email/Opt-Out.json` | 2 YOUR_* ✅ |
| Email 1 SMTP | `base-cold-email/Email 1-SMTP.json` | ✅ |
| Email 2 SMTP | `base-cold-email/Email 2-SMTP.json` | ✅ |
| Email 3 SMTP | `base-cold-email/Email 3-SMTP.json` | ✅ |

### A4. DEFAULT_TEMPLATES Array (7/7 complete)

All 7 templates registered in `lib/genesis/ignition-types.ts`:
email_1, email_2, email_3, research_report, email_preparation, reply_tracker, opt_out ✅

### A5. API Routes (Extensive)

- Events: `app/api/events/route.ts` ✅
- Cost Events: `app/api/cost-events/route.ts` ✅
- Dashboard: `app/api/dashboard/` ✅
- Admin: 15+ admin routes including watchdog, audit-log, fleet-updates ✅
- GDPR: `app/api/gdpr/` export + erasure ✅
- Cron: 11 cron jobs configured in vercel.json ✅
- Sandbox: 5 API routes ✅
- Onboarding: launch, ignition-status, progress ✅
- Campaign provision: `app/api/campaigns/provision/route.ts` ✅

### A6. UI Components (Merged from multiple UI sprints)

- Onboarding wizard (11 stages) ✅
- Dashboard with campaign filtering ✅
- Dark mode + instant theme switch (PR #12 merged) ✅
- Sidebar cleanup ✅
- Security settings tab ✅
- Sign-in page dark mode ✅
- Ask AI bubble ✅

### A7. Env Vars with Real Values (Verified)

| Key | Status |
|---|---|
| SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY | ✅ Real |
| CLERK_PUBLISHABLE_KEY/SECRET_KEY | ✅ Real |
| DIGITALOCEAN_API_TOKEN | ✅ Real (dop_v1_...) |
| REDIS_URL | ✅ Real (Upstash rediss://) |
| CREDENTIAL_MASTER_KEY | ✅ Real (64-char hex) |
| SIDECAR_AUTH_TOKEN | ✅ Real |
| SIDECAR_HANDSHAKE_SECRET | ✅ Real |
| DASH_WEBHOOK_TOKEN | ✅ Real |
| DATABASE_URL | ✅ Real |
| SENTRY_DSN | ✅ Real |
| TELEGRAM_BOT_TOKEN/CHAT_ID | ✅ Real |
| UPSTASH_REDIS_REST_URL/TOKEN | ✅ Real |
| Relevance AI (4 operator seeds) | ✅ Real |

### A8. Previously Fixed Blockers

| Blocker | Status |
|---|---|
| BLOCKER-001: RLS infinite recursion on user_workspaces | ✅ Fixed (SECURITY DEFINER migration) |
| BLOCKER-002: n8n DNS dead | ⚠️ N/A — legacy n8n no longer needed (per-tenant model) |
| Flaw-3: `|| ''` fallbacks in ignition | ✅ Fixed (WorkspaceManifest) |
| Ignition stage calling wrong route | ✅ Fixed (/api/onboarding/launch) |
| Plaintext operator keys in cloud-init | ✅ Fixed (removed from .env template) |

---

## SECTION B — WHAT WAS ADDED OUTSIDE THE ORIGINAL PLAN

These were NOT in the original post-testing documents but came up during implementation:

| Addition | Why It Happened | Impact |
|---|---|---|
| WorkspaceManifest system | Ralph Loop found `\|\| ''` fallbacks in orchestrator | Good — eliminates blank-field deployments |
| Operator Credential Vault | Needed centralized API key management for multi-tenant | Good — prevents key sprawl |
| Cloud-Init completion webhook | No signal from droplet → dashboard when boot finishes | Good — fleet_status updates automatically |
| Phase 64 encryption fence | Two incompatible crypto schemes (PBKDF2 vs SHA-256) discovered | Good — prevents wrong-scheme usage |
| Google Reviews pipeline fix | Apify scraper returned wrong-business reviews | Good — but unrelated to provisioning |
| PR #12 UI sprint merge | SirChesus's visual improvements | Good — but UI, not infra |
| `cold-email-system/` unignored | Was in .gitignore, needed for version control | Minor housekeeping |

None of these additions created technical debt. All are net positive.

---

## SECTION C — WHAT IS LEFT TO DO (Ordered by criticality)

### TIER 1: ABSOLUTE BLOCKERS (Must fix or nothing works)

#### C1. 🔴 HARDCODED VALUES IN WORKFLOW TEMPLATES

**THIS IS THE #1 RISK. The templates are NOT fully generic.**

Verified findings:
- `Email 1.json` → "Email #1 not sent" Google Sheets node has **hardcoded** Google Sheet document ID: `1bu356F6CrJ653Gy3DhetSZhBymXJUpAGucxJgreaze8` and cached sheet name "California Leads - Real Estate - Scraper City"
- `Email Preparation.json` → "Analyze" node has **hardcoded pitch text**: "an AI automation agency that helps real estate teams capture more leads" with specific service descriptions (AI Receptionist, CRM Automation, Website Chatbots, Social Media Automation)
- These are inside Anthropic/OpenAI prompt text, not in YOUR_* placeholders

**What this means:** Every new tenant gets the "AI automation agency for real estate" pitch and tries to log to a Google Sheet they don't have access to.

**Fix required:**
1. Replace hardcoded Google Sheet IDs with `YOUR_GOOGLE_SHEET_ID` placeholder across all Email templates
2. Extract the company pitch/services description into a `YOUR_COMPANY_PITCH` or `YOUR_SERVICES_DESCRIPTION` placeholder
3. Add these new variables to the orchestrator's `variableMap`
4. Collect the pitch/services during onboarding (or generate from brand_vault scrape)

**Effort:** ~4 hours  
**Risk if skipped:** Every client gets wrong company pitch. Emails reference the wrong business.

#### C2. 🔴 OPERATOR API KEYS STILL PLACEHOLDER

6 of 10 operator seed keys are still `YOUR_*_HERE`:

| Key | Status |
|---|---|
| OPERATOR_SEED_OPENAI_API_KEY | ❌ PLACEHOLDER |
| OPERATOR_SEED_ANTHROPIC_API_KEY | ❌ PLACEHOLDER |
| OPERATOR_SEED_APIFY_API_KEY | ❌ PLACEHOLDER |
| OPERATOR_SEED_GOOGLE_CSE_API_KEY | ❌ PLACEHOLDER |
| OPERATOR_SEED_GOOGLE_CSE_CX | ❌ PLACEHOLDER |
| OPERATOR_SEED_RELEVANCE_AI_API_KEY | ❌ PLACEHOLDER |

**What this means:** `seed-operator-credentials.mjs` will seed encrypted-but-empty values. The orchestrator will inject blanks. n8n workflows will fail at every AI/scraping node.

**Fix required:** You (the human) need to paste real API keys into `.env.local`, then run `node scripts/seed-operator-credentials.mjs`.

**Effort:** 15 minutes (just pasting keys)  
**Risk if skipped:** ALL n8n AI nodes fail. Research Report, Email Preparation, pain point analysis — everything that calls OpenAI/Anthropic/Apify is dead.

#### C3. 🔴 ZERO END-TO-END PROVISIONING EVER TESTED

The ignition orchestrator has never been run against:
- A real DigitalOcean droplet
- A real Sidecar boot
- A real n8n credential injection
- A real workflow deployment

**What this means:** There could be bugs at any step. The code is architecturally sound (verified by reading), but integration bugs are guaranteed to exist when live services interact.

**Fix required:** Run the full ignition flow at least once:
1. Set `LOCAL_MODE=true` for first test (uses Docker n8n locally)
2. Then test with a real DO droplet

**Effort:** 1-2 days of debugging  
**Risk if skipped:** You discover all bugs live with a real client.

#### C4. 🔴 MORE PLACEHOLDER ENV VARS

| Key | Status | Impact |
|---|---|---|
| GOOGLE_OAUTH_CLIENT_ID | ❌ PLACEHOLDER | Gmail OAuth won't work for tenants |
| GOOGLE_OAUTH_CLIENT_SECRET | ❌ PLACEHOLDER | Same |
| GMAIL_CLIENT_ID | ❌ FAKE | Same |
| GMAIL_ACCESS_TOKEN | ❌ FAKE | Same |
| GMAIL_REFRESH_TOKEN | ❌ FAKE | Same |
| GOOGLE_SERVICE_ACCOUNT_JSON | ❌ FAKE | Google Sheets won't work |
| GOOGLE_SHEET_ID | ❌ PLACEHOLDER | Same |
| ENTRI_API_KEY/APP_ID | ❌ PLACEHOLDER | DNS automation won't work |
| CONTROL_PLANE_URL | ❌ PLACEHOLDER | Admin health checks fail |
| NEXT_PUBLIC_OHIO_WORKSPACE_ID | ❌ PLACEHOLDER | Sandbox routing broken |

**Fix required:** Fill these one by one. Google OAuth is the most complex (requires Google Cloud Console project setup with redirect URIs).

**Effort:** 1-2 hours for simple keys, ~2 hours for Google OAuth setup

### TIER 2: HIGH PRIORITY (System works but has gaps)

#### C5. 🟡 CONTROL PLANE NOT DEPLOYED

The `control-plane/` service has:
- Railway.toml config ✅
- Dockerfile ✅
- Watchdog, heartbeat processor, hibernation controller ✅

But it is NOT deployed anywhere. Without it:
- BullMQ jobs queue up and never process
- Fleet health watchdog never runs
- Heartbeat processor never updates droplet health
- Hibernation controller never cost-optimizes idle droplets

**Fix required:** Deploy to Railway free tier:
```bash
cd control-plane && railway login && railway init && railway up
```

**Effort:** 30 minutes  
**Risk if skipped:** Background infrastructure doesn't run. Acceptable for first 1-3 clients but becomes critical at 5+.

#### C6. 🟡 LOCAL TEST KIT NOT CREATED

The `local-test-kit/` directory referenced in LAUNCH_WEEK_CHECKLIST does not exist. No `docker-compose.yml` for beta testers.

**Fix required:** Create `local-test-kit/docker-compose.yml` with n8n + postgres for local testing.

**Effort:** 15 minutes  
**Risk if skipped:** Can't do beta testing without DigitalOcean spend.

#### C7. 🟡 CAMPAIGN DATA MODEL — FLAT, NOT GROUPED

Current `campaigns` table structure has each email step (Email 1, Email 2, Email 3) as a separate campaign row, each with its own `n8n_workflow_id`. There is no parent "campaign" entity grouping Email 1/2/3 together into a sequence.

The `campaign_groups` concept exists in types (`lib/dashboard-types.ts`) and some query logic, but the actual grouping UX and provisioning flow treats them as flat campaigns.

**What this means:** Creating "Campaign A" should spawn 7 workflows as a group. Currently unclear if `campaign_groups` is wired end-to-end.

**Fix required:** Verify campaign provisioning creates grouped workflows. If not, wire `campaign_group_id` through the provisioning flow.

**Effort:** 2-4 hours  
**Risk if skipped:** Campaign management is confusing but functional.

#### C8. 🟡 MATERIALIZED VIEW REFRESH

`mv_daily_stats` and `mv_llm_cost` materialized views exist but refresh depends on a cron job (`/api/admin/refresh-views`). If this cron doesn't run, dashboard shows stale data.

Vercel cron is configured in `vercel.json` but requires `MATERIALIZED_VIEWS_REFRESH_TOKEN` which exists in `.env.local`.

**Fix required:** Verify the cron is working on Vercel. Test manually: `curl /api/admin/refresh-views?token=...`

**Effort:** 15 minutes

### TIER 3: IMPORTANT BUT NOT LAUNCH-BLOCKING

#### C9. 🟠 npm run build HANGS

Build appears to hang or take extremely long. This could be:
- Memory issue on M3 Mac (tried with 4GB NODE_OPTIONS)
- Turbopack issue in Next.js 16
- Circular dependency

**Fix required:** Investigate and fix. A broken build = broken Vercel deployment.

**Effort:** 1-2 hours  
**Risk if skipped:** Deployments may fail on Vercel.

#### C10. 🟠 GOOGLE SHEETS HARDCODED IN TEMPLATES

Beyond the pitch text, the Email 1/2/3 templates have hardcoded Google Sheet IDs (`1bu356F6CrJ653Gy3DhetSZhBymXJUpAGucxJgreaze8`) that point to "California Leads - Real Estate" spreadsheets. New tenants:
1. Won't have access to this sheet
2. May not even use Google Sheets (the Supabase partition is the primary data store)

**Fix required:** Either:
- Replace with `YOUR_GOOGLE_SHEET_ID` placeholder, OR
- Remove Google Sheets dependency entirely (use Supabase partition as sole data store)

**Effort:** 2-4 hours  
**Risk if skipped:** Google Sheets nodes fail silently for every new tenant.

#### C11. 🟠 VERCEL ENV VARS NOT SYNCED

`.env.local` is local-only. The Vercel deployment needs ALL the same keys. Some keys (SENTRY_DSN, TELEGRAM, real operator keys) need to be in Vercel env vars too.

**Fix required:** Run `vercel env pull` to check what's set, then push missing keys.

**Effort:** 30 minutes

#### C12. 🟠 SMTP EMAIL TEMPLATES MISSING SOME PLACEHOLDERS

`Email 1-SMTP.json` only has 1 YOUR_* placeholder vs 7 in the Gmail version. `Email 2-SMTP.json` has 0. SMTP templates may be incomplete.

**Effort:** 1-2 hours

---

## SECTION D — UNKNOWNS THAT COULD BREAK IN PRODUCTION

These are things nobody knows the answer to until live testing happens.

### D1. ⚫ SIDECAR DOCKER IMAGE — DOES IT BUILD?

The `sidecar/Dockerfile` exists but has it ever been built into a Docker image? Has `genesis-sidecar:latest` ever been pushed to a registry?

**Unknown:** Does `GENESIS_SIDECAR_IMAGE` env var point to a real, pullable image?

**Potential break:** Cloud-init tries to `docker pull` an image that doesn't exist → boot fails silently.

**How to test:** Build and push: `cd sidecar && docker build -t ghcr.io/<org>/genesis-sidecar:latest . && docker push`

### D2. ⚫ CLOUD-INIT SCRIPT — DOES IT ACTUALLY WORK?

`lib/genesis/droplet-factory.ts` generates a cloud-init script. This script:
- Installs Docker
- Pulls the sidecar image
- Writes an `.env` file
- Starts docker-compose
- Sends completion webhook

None of this has ever been run on a real DigitalOcean droplet.

**Potential breaks:**
- Docker install commands may fail on the specific OS image
- Network timeouts pulling images
- Port conflicts
- Firewall/security group issues
- The completion webhook URL might not be reachable from the droplet

### D3. ⚫ n8n CREDENTIAL API — EXACT TYPE STRINGS

The sidecar calls `POST /api/v1/credentials` with a `type` field. Does n8n accept `google_oauth2`, `postgres`, `openai_api` as valid type strings? Or are the exact type identifier strings different in the n8n version being deployed?

**Potential break:** Invalid credential type → 400 error → no credentials → all workflows fail.

**How to test:** Deploy n8n locally, try creating each credential type via API.

### D4. ⚫ GMAIL OAUTH TOKEN REFRESH

Gmail OAuth tokens expire. The Reply Tracker workflow uses a Gmail trigger that needs a valid OAuth token 24/7. If the token expires and there's no refresh logic in the sidecar, replies are silently missed.

**Potential break:** Token expires after 1 hour → Reply Tracker stops → client doesn't know leads replied.

### D5. ⚫ DNS / DOMAIN ISSUES FOR OPT-OUT

Opt-out URLs point to `YOUR_N8N_INSTANCE_URL/webhook/opt-out`. For this to work:
- The droplet needs a DNS name or stable IP
- The droplet needs to accept inbound HTTP on port 443/80
- The webhook endpoint needs to be publicly accessible
- No SSL issues (self-signed certs will break email client previews)

**Potential break:** Click unsubscribe → DNS timeout → CAN-SPAM violation.

### D6. ⚫ DROPLET FIREWALL / NETWORKING

DigitalOcean droplets may have:
- Cloud firewall blocking inbound traffic
- ufw enabled by default
- Port 5678 (n8n) not exposed
- Port 3001 (sidecar) not exposed

**Potential break:** Dashboard can't reach sidecar → handshake fails → provisioning stuck.

### D7. ⚫ RACE CONDITIONS IN IGNITION

The ignition sequence has 8+ steps. If any step takes longer than expected:
- Credential injection before n8n is ready → fails
- UUID mapping before credentials exist → empty UUIDs
- Workflow deployment before UUIDs mapped → placeholder UUIDs in production

The orchestrator has retry logic, but it's never been stress-tested.

### D8. ⚫ SUPABASE CONNECTION LIMITS

Each tenant's n8n Postgres nodes connect to YOUR Supabase instance. Supabase free/pro tier has connection limits. At 3 clients × 7 workflows × 1-2 connections each = 21-42 connections.

**Potential break:** Connection exhaustion at scale.

### D9. ⚫ COST SURPRISES

- DigitalOcean droplet: ~$6/mo per client minimum
- OpenAI API: depends on lead volume
- Anthropic API: depends on lead volume  
- Apify: depends on scraping volume
- Supabase: may need paid plan at scale

No cost monitoring alerts are set up beyond Sentry/Telegram.

### D10. ⚫ WEBHOOK TOKEN MISMATCH

The ignition orchestrator generates a `webhook_token` and stores it. n8n workflows use `DASH_WEBHOOK_TOKEN` to authenticate event POSTs. If these don't match, all event ingestion fails silently — dashboard shows no data.

---

## SECTION E — PRIORITIZED EXECUTION PLAN (9 days)

### Day 1 (Feb 28) — TODAY
- [ ] Fill all 6 OPERATOR_SEED_* placeholder keys in `.env.local` (15 min)
- [ ] Run `node scripts/seed-operator-credentials.mjs` (5 min)
- [ ] Fix build hang issue (1-2 hr)
- [ ] Create `local-test-kit/docker-compose.yml` (15 min)

### Day 2 (Mar 1)
- [ ] Fix hardcoded Google Sheet IDs in templates → `YOUR_GOOGLE_SHEET_ID` (2 hr)
- [ ] Fix hardcoded pitch text → `YOUR_COMPANY_PITCH` or `YOUR_SERVICES_DESCRIPTION` placeholder (2 hr)
- [ ] Add new variables to orchestrator variableMap (30 min)
- [ ] Collect pitch during onboarding or generate from brand_vault (1 hr)
- [ ] Fix SMTP template placeholder gaps (1 hr)

### Day 3 (Mar 2)
- [ ] Build sidecar Docker image locally (1 hr)
- [ ] Test sidecar image: `docker build -t genesis-sidecar:latest .` (30 min)
- [ ] Push sidecar image to GitHub Container Registry or DO Container Registry (30 min)
- [ ] Set `LOCAL_MODE=true` and test ignition against local Docker n8n (4 hr)

### Day 4 (Mar 3)
- [ ] Debug LOCAL_MODE E2E: fix whatever breaks (full day)
- [ ] Verify: partition created, credentials injected, workflows deployed, webhooks fire

### Day 5 (Mar 4)
- [ ] Fill Google OAuth credentials (2 hr)
- [ ] Fill remaining placeholder env vars (1 hr)
- [ ] Test with real DigitalOcean droplet: `LOCAL_MODE=false` (4 hr)
- [ ] Verify cloud-init completion webhook fires

### Day 6 (Mar 5)
- [ ] Deploy control plane to Railway (30 min)
- [ ] Sync env vars to Vercel (30 min)
- [ ] Full E2E: Create workspace → onboard → provision → send test email (full day)
- [ ] Verify dashboard shows real events

### Day 7 (Mar 6)
- [ ] Fix all bugs from E2E test (full day)
- [ ] Run watchdog to verify drift detection works
- [ ] Test opt-out URL for CAN-SPAM compliance

### Day 8 (Mar 7)
- [ ] Second E2E test with separate workspace (multi-tenant verification)
- [ ] Verify RLS: Workspace A can't see Workspace B data
- [ ] Test campaign creation → 7 workflows deploy as group

### Day 9 (Mar 8) — BUFFER
- [ ] Fix remaining bugs
- [ ] Final E2E run
- [ ] Prepare for first client

### Mar 9 — DEADLINE
- [ ] System ready for first paying client

---

## SECTION F — WHAT TO NOT TOUCH (Per LAUNCH_WEEK_CHECKLIST)

| Don't Build | Why |
|---|---|
| Stripe integration | Collect payment via PayPal/Venmo/bank transfer |
| Web scraper / lead scraper | Use manual leads for now |
| Mailbox warming | Not needed for first campaign |
| A/B testing | After you have reply data |
| Reply classification AI | After you have replies |
| New UI features | UI friend handles separately |
| AWS migration | After 5+ paying clients |
| Email verification (NeverBounce) | Not a blocker for MVP |
| Lead scoring | Post-launch feature |

---

## SECTION G — RISK MATRIX

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Sidecar Docker image doesn't build | Medium | CRITICAL | Test TODAY |
| Cloud-init fails on real droplet | High | CRITICAL | Test Day 5 |
| n8n credential types wrong | Medium | HIGH | Test during LOCAL_MODE |
| Gmail OAuth expires silently | High | HIGH | Add refresh logic to sidecar |
| Hardcoded pitch goes to wrong client | Certain | HIGH | Fix Day 2 |
| Build hangs on Vercel | Medium | HIGH | Fix Day 1 |
| Webhook token mismatch | Medium | HIGH | Verify during E2E |
| Connection limit hit at scale | Low (3 clients) | MEDIUM | Monitor |
| DNS/SSL for opt-out URLs | Medium | MEDIUM | Use droplet IP initially |
| Cost overrun from AI APIs | Low | MEDIUM | Set billing alerts |

---

## VERDICT

**Can you ship by March 9?** Yes, but ONLY if:

1. **Today:** Fill API keys + fix build
2. **Days 2-3:** Fix templates + build/test sidecar Docker image
3. **Days 3-5:** LOCAL_MODE E2E → Real droplet E2E
4. **Days 6-8:** Multi-tenant verification + bug fixes
5. **Day 9:** Buffer for remaining issues

**The critical path is:** API keys → Template fixes → Sidecar Docker → E2E test → Bug fixes → Ship

**What will NOT be ready by March 9 (and that's OK):**
- Control plane on Railway (nice to have, not blocking first client)
- GDPR data export/deletion (built but untested)
- Mailbox warming
- A/B testing
- Lead scoring
- Stripe billing

**What MUST be ready:**
- Ignition provisions a droplet with working n8n
- Sidecar injects credentials automatically
- All 7 workflows deploy with correct tenant values
- Dashboard shows real events
- Opt-out URL works (CAN-SPAM compliance)
- Multi-tenant RLS prevents data leaks

---

*Generated by RALPH Loop — Feb 28, 2026 05:25 AM*
*Source: Cross-referenced MASTER_TESTING_CHECKLIST.md, CORE_VERIFICATION_AUDIT.md, LAUNCH_WEEK_CHECKLIST.md, prd-env-connection-audit.json against live codebase.*
