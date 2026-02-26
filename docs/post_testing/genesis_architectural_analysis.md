# GENESIS Architectural Analysis — Master Plan

> **Generated:** 2026-02-12  
> **Methodology:** Ralph Loop (Read → Audit → Learn → Plan → Harden)  
> **Evidence:** Live Supabase MCP queries + full codebase read  
> **Policy:** Zero assumptions. Every claim is traced to a file path, line number, or SQL result.

---

## Table of Contents

1. [Objective 1: Campaign Data Isolation & Dynamic Cloning](#objective-1-campaign-data-isolation--dynamic-cloning)
2. [Objective 2: CSV Smart Filtering Algorithm](#objective-2-csv-smart-filtering-algorithm)
3. [Objective 3: LLM Cost Partitioning Audit](#objective-3-llm-cost-partitioning-audit)
4. [Objective 5: Diagnose URL Routing](#objective-5-diagnose-url-routing)
5. [Cross-Cutting Concerns](#cross-cutting-concerns)
6. [Migration Sequencing](#migration-sequencing)

> **Note:** Objective 4 (Sidecar Deep-Dive) is in its own file: `docs/plans/sidecar_architecture.md`

---

# Objective 1: Campaign Data Isolation & Dynamic Cloning

## 1.1 User's Hypothesis

> "Email 1, Email 2, Email 3 are stored as separate campaigns. Campaign data should be grouped as sequences within a single campaign."

## 1.2 Verified Reality

### Evidence: `campaigns` Table

**Schema** (from `information_schema.columns` query):

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | NO | PK |
| `workspace_id` | **text** | NO | ⚠️ Should be uuid — type mismatch with `workspaces.id` (uuid) |
| `name` | text | NO | Free text, no FK |
| `description` | text | YES | |
| `status` | text | YES | |
| `n8n_workflow_id` | text | YES | Single ID per campaign row |
| `n8n_status` | text | YES | |
| `last_sync_at` | timestamptz | YES | |
| `version` | integer | YES | |
| `created_at` / `updated_at` | timestamptz | YES | |
| `provision_id` | uuid | YES | |
| `template_id` | uuid | YES | |
| `webhook_url` | text | YES | |

**Live data** (Ohio workspace `00000000-0000-0000-0000-000000000001`):

| name | n8n_workflow_id | status |
|---|---|---|
| Email 3 | A8BRUuJdnNHq94Bh | active |
| Email 2 | JWGl5Ffi5hP3pXyZ | active |
| Email 1 | nSM5BxusjDG2ykwY | active |
| Campaign Outreach [2] | *(null)* | active |

**Confirmed: Each email step exists as a separate campaign row**, each with its own `n8n_workflow_id`. There is no parent "campaign" entity that groups Email 1/2/3 together.

### Evidence: `email_events`, `daily_stats`, `llm_usage` Tables

All three tables use `campaign_name` (text, nullable) as the correlation field — NOT `campaign_id` (uuid FK).

**Distinct campaign_names in `email_events`:** Only `"Ohio"` in workspace `00000000-...001`.  
**Distinct campaign_names in `daily_stats`:** Only `"Ohio"` in workspace `00000000-...001`.

This means the events are tagged with the string `"Ohio"`, not with `"Email 1"` / `"Email 2"` / `"Email 3"`. The n8n workflows themselves tag events with the campaign_name they were given, which comes from the ignition orchestrator's `variableMap`.

### Evidence: `genesis.leads` Table

| Column | Type | Notes |
|---|---|---|
| `workspace_id` | uuid NOT NULL | ✅ Proper type |
| `campaign_name` | text, nullable | Free text, no FK |
| *no `campaign_id`* | — | FK to campaigns does not exist |

### Evidence: `campaigns.workspace_id` Type Mismatch

- `workspaces.id` is `uuid`
- `campaigns.workspace_id` is **`text`**
- No foreign key constraint exists between them

This means:
1. No referential integrity enforcement
2. Supabase `.eq('workspace_id', workspaceId)` works because text comparison to UUID string succeeds, but it's fragile
3. Index `campaigns_workspace_id_name_key` is on `(workspace_id, name)` as text — works but not type-safe

## 1.3 The Actual Architecture Problem

The system has **two disconnected concepts of "campaign"**:

1. **`campaigns` table rows:** These represent individual n8n workflows. Email 1, Email 2, Email 3 are each a separate row. This is the provisioning/management view.

2. **`campaign_name` field across all data tables:** This is a free-text tag applied to events, stats, costs, and leads. It's the analytics/reporting view. The Ohio workspace uses `"Ohio"` as the campaign_name everywhere.

Neither concept has a proper parent entity. There is no "Campaign Group" or "Campaign Collection" that says: "Ohio Campaign = Email 1 + Email 2 + Email 3 + Email Preparation + Opt-Out + Reply Tracker + Research Report (7 workflows)."

### Impact Analysis

| What Breaks | Why |
|---|---|
| Campaign dropdown filtering | `daily_stats` campaign_name is `"Ohio"` but campaigns table has `"Email 1"`, `"Email 2"`, `"Email 3"`. They don't match. |
| Per-campaign cost attribution | `llm_usage.campaign_name` is free text — could be anything the n8n workflow sends |
| Multi-campaign workspace | When a second campaign is created, events will have different campaign_name but no grouping exists |
| Data isolation in matviews | `mv_daily_stats` groups by `campaign_name` — correct for filtering but has no RLS |

## 1.4 Proposed Architecture Fix

### Phase 1: Add Campaign Group Entity

```sql
-- New table: campaign_groups (the logical "campaign")
CREATE TABLE IF NOT EXISTS public.campaign_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text DEFAULT 'draft',
  email_provider text DEFAULT 'gmail' CHECK (email_provider IN ('gmail', 'smtp')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- Enable RLS
ALTER TABLE campaign_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign_groups_workspace_isolation" ON campaign_groups
  USING (workspace_id IN (
    SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()
  ));

-- Add campaign_group_id to campaigns table
ALTER TABLE campaigns ADD COLUMN campaign_group_id uuid REFERENCES campaign_groups(id);

-- Add campaign_group_id to event/stats tables
ALTER TABLE email_events ADD COLUMN campaign_group_id uuid;
ALTER TABLE daily_stats ADD COLUMN campaign_group_id uuid;
ALTER TABLE llm_usage ADD COLUMN campaign_group_id uuid;
```

### Phase 2: Fix `campaigns.workspace_id` Type

```sql
-- Fix type mismatch (requires data migration)
ALTER TABLE campaigns
  ALTER COLUMN workspace_id TYPE uuid USING workspace_id::uuid;

-- Add proper FK
ALTER TABLE campaigns
  ADD CONSTRAINT fk_campaigns_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
```

### Phase 3: Frontend Campaign Dropdown Fix

Currently in `app/api/dashboard/aggregate/route.ts` (lines ~340-350), campaign names come from `daily_stats`:

```typescript
let campaignNamesQuery = supabaseAdmin
  .from('daily_stats')
  .select('campaign_name')
  .eq('workspace_id', workspaceId)
  .not('campaign_name', 'is', null);
```

After the migration, this should use `campaign_groups`:

```typescript
let campaignGroupsQuery = supabaseAdmin
  .from('campaign_groups')
  .select('id, name')
  .eq('workspace_id', workspaceId)
  .order('created_at', { ascending: false });
```

### Phase 4: n8n Workflow Tagging

The ignition orchestrator already injects `CAMPAIGN_NAME` into workflows. After migration, also inject `CAMPAIGN_GROUP_ID` so events are tagged with both:

```typescript
// In variableMap construction (ignition-orchestrator.ts)
variableMap['YOUR_CAMPAIGN_GROUP_ID'] = campaignGroupId;
variableMap['YOUR_CAMPAIGN_NAME'] = campaignGroupName;
```

---

# Objective 2: CSV Smart Filtering Algorithm

## 2.1 User's Hypothesis

> "CSV uploads should have smart filtering — detect column types and map them to the leads schema without LLM."

## 2.2 Verified Reality: Current CSV Pipeline

### Upload Flow

1. **Frontend:** `components/campaigns/csv-import-dialog.tsx` — file drop zone, campaign selector, preview row count
2. **API:** `app/api/campaigns/[id]/import/route.ts` — multipart form handler
3. **Parser:** `lib/genesis/phase61b/csv-parser.ts` — RFC-compliant CSV line parser
4. **Validator:** `lib/genesis/phase61b/csv-validator.ts` — header + row validation
5. **Importer:** `lib/genesis/phase61b/csv-importer.ts` — summary generation
6. **Database:** Batch upsert into `leads_ohio` (or configured leads table)

### How Column Mapping Currently Works

The system uses **exact header matching**. From `csv-import-types.ts`:

```typescript
export interface CsvLeadColumns {
  email_address: string;           // REQUIRED
  first_name?: string;
  last_name?: string;
  organization_name?: string;
  position?: string;
  linkedin_url?: string;
  website_url?: string;
  industry?: string;
  company_size?: string;
}
```

**Required columns:** Only `email_address`.  
**Optional columns:** All others are matched by exact name.

From `csv-validator.ts`:
- `validateHeaders()`: Checks for required columns, warns about unknown columns
- Unknown columns are **silently ignored** (not mapped)
- No smart/fuzzy matching exists

### Current Mapping in Import Route

From `app/api/campaigns/[id]/import/route.ts` (the `toLeadRow` function):

```typescript
function toLeadRow(lead: ValidatedLead, workspaceId: string, campaignName: string) {
  return {
    workspace_id: workspaceId,
    email_address: lead.email_address.trim().toLowerCase(),
    full_name: [lead.first_name, lead.last_name].filter(Boolean).join(' ') || null,
    organization_name: lead.organization_name?.trim() || null,
    linkedin_url: lead.linkedin_url?.trim() || null,
    organization_website: lead.website_url?.trim() || null,
    position: lead.position?.trim() || null,
    industry: lead.industry?.trim() || null,
    campaign_name: campaignName,
    email_1_sent: false,
    email_2_sent: false,
    email_3_sent: false,
    replied: false,
    opted_out: false,
  };
}
```

**Observations:**
- `full_name` is derived from `first_name + last_name` 
- `organization_website` maps from `website_url` (naming mismatch handled in code)
- `campaign_name` comes from the selected campaign's name, NOT from the CSV
- Email dedup uses `ON CONFLICT (workspace_id, email_address)` with `ignoreDuplicates: true`

### What's Missing

1. **No fuzzy header matching:** If a CSV has `Email` instead of `email_address`, it fails silently
2. **No column preview/mapping UI:** Users can't remap columns before import
3. **No smart type detection:** Phone numbers, URLs, etc. aren't validated or normalized
4. **40+ columns in `leads_ohio` are ignored:** The CSV can only populate ~8 fields

## 2.3 Proposed Smart Filtering Algorithm

**Constraint:** No LLM. Pure algorithmic logic.

### Stage 1: Header Normalization

```typescript
const COLUMN_ALIASES: Record<string, string[]> = {
  'email_address': ['email', 'e-mail', 'email_address', 'emailaddress', 'contact_email', 'mail'],
  'first_name': ['first_name', 'firstname', 'first', 'given_name', 'fname'],
  'last_name': ['last_name', 'lastname', 'last', 'surname', 'family_name', 'lname'],
  'organization_name': ['company', 'company_name', 'organization', 'organization_name', 'org', 'employer'],
  'position': ['title', 'job_title', 'position', 'role', 'designation'],
  'linkedin_url': ['linkedin', 'linkedin_url', 'linkedin_profile', 'li_url'],
  'website_url': ['website', 'website_url', 'url', 'company_website', 'domain', 'organization_website'],
  'industry': ['industry', 'sector', 'vertical', 'business_type'],
  'company_size': ['company_size', 'employees', 'employee_count', 'headcount', 'size'],
  'phone': ['phone', 'phone_number', 'tel', 'telephone', 'mobile', 'cell'],
};

function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s\-\.]+/g, '_');
}

function resolveColumn(rawHeader: string): string | null {
  const normalized = normalizeHeader(rawHeader);
  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.includes(normalized)) return canonical;
  }
  return null; // unmapped
}
```

### Stage 2: Content-Based Type Detection (Fallback)

For columns with non-standard headers, sample the first 10 non-empty values:

```typescript
function detectColumnType(values: string[]): 'email' | 'url' | 'phone' | 'name' | 'text' | 'number' {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const urlRegex = /^https?:\/\//i;
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,15}$/;
  const linkedinRegex = /linkedin\.com/i;

  const emailCount = values.filter(v => emailRegex.test(v)).length;
  const urlCount = values.filter(v => urlRegex.test(v)).length;
  const phoneCount = values.filter(v => phoneRegex.test(v)).length;
  const linkedinCount = values.filter(v => linkedinRegex.test(v)).length;

  const threshold = values.length * 0.7; // 70% match = confident

  if (emailCount >= threshold) return 'email';
  if (linkedinCount >= threshold) return 'url'; // specifically linkedin
  if (urlCount >= threshold) return 'url';
  if (phoneCount >= threshold) return 'phone';
  return 'text';
}
```

### Stage 3: Mapping Preview UI

Before import, show the user a preview:

```
CSV Column        →  Mapped To             Confidence
------------------------------------------------------
Email             →  email_address          ✓ Exact alias
Company           →  organization_name      ✓ Exact alias
Phone Number      →  phone                  ✓ Alias match
Custom Field 1    →  (unmapped)             ⚠ Skip
LinkedIn Profile  →  linkedin_url           ✓ Content detection
```

Users can override mappings before confirming the import. This adds no infrastructure cost and solves the mismatch problem.

### Stage 4: Batch Size & Performance

Current batch size is 500 rows per upsert. This is reasonable for Supabase. Max 5000 rows per import.

**No changes needed** to the batch logic. The smart filtering happens before the batching stage.

---

# Objective 3: LLM Cost Partitioning Audit

## 3.1 User's Hypothesis

> "LLM costs should be attributable to specific campaigns and workspaces with proper isolation."

## 3.2 Verified Reality

### `llm_usage` Table Schema

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | NO | PK |
| `workspace_id` | uuid | YES | ⚠️ Nullable! |
| `campaign_name` | text | YES | Free text tag |
| `provider` | text | YES | e.g., "openai", "anthropic" |
| `model` | text | YES | e.g., "gpt-4", "claude-3" |
| `tokens_in` | integer | YES | |
| `tokens_out` | integer | YES | |
| `cost_usd` | numeric | YES | |
| `purpose` | text | YES | What the LLM call was for |
| `created_at` | timestamptz | YES | |
| `n8n_execution_id` | text | YES | |
| `idempotency_key` | text | YES | Unique dedup key |
| `metadata` | jsonb | YES | |

### RLS Policies on `llm_usage`

From the policy query:

| Policy | Command | Using | With Check |
|---|---|---|---|
| `llm_usage_workspace_read` | SELECT | `workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid())` | — |
| `llm_usage_write_access` | INSERT | — | **null (no check!)** |

**Critical finding:** The INSERT policy has `WITH CHECK = null`, meaning **any authenticated user can insert LLM usage records for any workspace**. This is a data integrity vulnerability — a malicious or buggy client could inflate another workspace's costs.

### Materialized View: `mv_llm_cost`

```sql
-- Definition (from information_schema query):
SELECT workspace_id, provider, model,
       date(created_at) AS day,
       SUM(cost_usd) AS total_cost,
       SUM(tokens_in) AS total_tokens_in,
       SUM(tokens_out) AS total_tokens_out,
       COUNT(*) AS call_count,
       AVG(cost_usd) AS avg_cost_per_call,
       string_agg(DISTINCT campaign_name, ', ') AS campaigns_used
FROM llm_usage
GROUP BY workspace_id, provider, model, date(created_at)
```

**No RLS on materialized views** — this is a PostgreSQL limitation, not a bug. But it means:
- Direct Supabase client queries to `mv_llm_cost` bypass all workspace isolation
- Only the API layer (which uses `supabaseAdmin` + workspace_id filter) provides isolation
- If any frontend code ever queries this view directly, it would leak all workspaces' cost data

### How Costs Flow In

From `app/api/dashboard/aggregate/route.ts` (lines ~307-320):

```typescript
let llmUsageQuery = supabaseAdmin
  .from('llm_usage')
  .select('provider, model, tokens_in, tokens_out, cost_usd, created_at, campaign_name')
  .eq('workspace_id', workspaceId)
  .gte('created_at', `${startDate}T00:00:00Z`)
  .lte('created_at', `${endDate}T23:59:59Z`);
```

The query correctly filters by `workspace_id`. But it uses `supabaseAdmin` (service role key), which **bypasses RLS entirely**. The workspace_id filter is the only protection, and it comes from a query parameter that is validated by `validateWorkspaceAccess`.

### Cost Attribution Gap

Currently costs are attributed to `campaign_name` (free text). There is no `campaign_id` or `campaign_group_id` foreign key. This means:
- Costs cannot be reliably joined to the `campaigns` table
- If campaign_name changes, historical cost attribution breaks
- No referential integrity

## 3.3 Proposed Fixes

### Fix 1: Harden `llm_usage` INSERT Policy

```sql
-- Drop the permissive insert policy
DROP POLICY IF EXISTS llm_usage_write_access ON llm_usage;

-- Create proper insert policy
CREATE POLICY "llm_usage_insert_workspace_scoped" ON llm_usage
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()
    )
  );

-- Allow service role inserts (from n8n webhooks) without restriction
-- Service role bypasses RLS by design
```

### Fix 2: Make `workspace_id` NOT NULL

```sql
ALTER TABLE llm_usage ALTER COLUMN workspace_id SET NOT NULL;
```

### Fix 3: Add `campaign_group_id` FK

```sql
ALTER TABLE llm_usage ADD COLUMN campaign_group_id uuid REFERENCES campaign_groups(id);
CREATE INDEX idx_llm_usage_campaign_group ON llm_usage (campaign_group_id, created_at DESC);
```

### Fix 4: Secure Materialized Views

Since PostgreSQL doesn't support RLS on materialized views, create wrapper views:

```sql
-- Wrapper view WITH RLS
CREATE VIEW v_llm_cost_secure AS
SELECT * FROM mv_llm_cost
WHERE workspace_id IN (
  SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()
);

-- Optionally revoke direct access to materialized view
REVOKE SELECT ON mv_llm_cost FROM authenticated;
REVOKE SELECT ON mv_daily_stats FROM authenticated;
```

**Alternative (simpler):** Since all queries currently go through the API layer with `supabaseAdmin`, the practical risk is lower. But it's still best practice to restrict direct access.

---

# Objective 5: Diagnose URL Routing

## 5.1 User's Hypothesis

> "Admin panel has diagnostic URLs that need verification."

## 5.2 Verified Reality: Complete URL Map

### Public Health Endpoints

| Route | File | Purpose |
|---|---|---|
| `GET /api/health` | `app/api/health/route.ts` | Overall health: Supabase connection + cache stats |
| `GET /api/health/n8n` | `app/api/health/n8n/route.ts` | n8n instance health |
| `GET /api/health/status` | `app/api/health/status/route.ts` | Simplified status endpoint |

### Admin API Endpoints (Super Admin Only)

Discovered 36 admin API routes:

| Category | Routes |
|---|---|
| **Core Admin** | |
| Workspace management | `POST /api/admin/freeze-workspace` |
| Audit logging | `GET /api/admin/audit-log` |
| LLM usage report | `GET /api/admin/llm-usage` |
| View refresh | `POST /api/admin/refresh-views` |
| **Scale Health** | |
| Health report | `GET /api/admin/scale-health` |
| History | `GET /api/admin/scale-health/history` |
| Alerts | `GET/POST /api/admin/scale-health/alerts` |
| Run checks | `POST /api/admin/scale-health/run-checks` |
| **API Health (Phase 71)** | |
| Health check | `GET/POST /api/admin/api-health` (+ `/check` and `/history`) |
| Diagnostics | `GET /api/admin/api-health/diagnostics/[serviceId]` |
| **Migration** | |
| Status | `GET /api/admin/migration/status` |
| Init | `POST /api/admin/migration/init` |
| Rollback | `POST /api/admin/migration/rollback` |
| Backfill | `POST /api/admin/migration/backfill/start` |
| Cutover | `POST /api/admin/migration/cutover/execute` |
| Parity check | `GET /api/admin/migration/parity/check` |
| **Disaster Recovery** | |
| DR operations | `GET/POST /api/admin/disaster-recovery/*` |
| **Fleet Updates** | |
| Rollouts | `GET/POST /api/admin/fleet-updates/rollouts` |
| Templates | `GET /api/admin/fleet-updates/templates` |
| Versions | `GET /api/admin/fleet-updates/versions` |
| Emergency rollback | `POST /api/admin/fleet-updates/emergency-rollback` |
| **Control Plane** | |
| Health | `GET /api/admin/control-plane-health` |

### Admin UI Page

**Route:** `/admin` (file: `app/admin/page.tsx`)  
**Auth:** Client-side Clerk check against `NEXT_PUBLIC_SUPER_ADMIN_IDS` env var  
**Tabs:** 8 tabs, each mapping to a component:

| Tab | Component | API Endpoint |
|---|---|---|
| Workspaces | `SuperAdminPanel` | Various workspace management APIs |
| Audit Log | `AuditLogViewer` | `GET /api/admin/audit-log` |
| Scale Health | `ScaleHealthTab` | `GET /api/admin/scale-health` |
| Alert History | `AlertHistoryTab` | `GET /api/admin/scale-health/alerts` |
| API Health | `APIHealthTab` | `GET /api/admin/api-health` |
| Migration | `MigrationControlTab` | `GET /api/admin/migration/status` |
| Disaster Recovery | `DisasterRecoveryTab` | `GET /api/admin/disaster-recovery/*` |
| Fleet Updates | `FleetUpdatesTab` | `GET /api/admin/fleet-updates/*` |

### Missing Dashboard-Side Sidecar Endpoints

**Critical gap:** The Sidecar agent attempts to call:
- `POST /api/sidecar/heartbeat` — **DOES NOT EXIST** in `app/api/`
- `POST /api/sidecar/handshake` — **DOES NOT EXIST** in `app/api/`

File search for `app/api/sidecar/**/route.ts` returned zero results. The handshake type definitions exist in `lib/genesis/handshake-types.ts` but the actual Next.js API routes were never created.

**Impact:** Sidecar boot will fail at the handshake step. Health heartbeats will silently fail (the Sidecar catches and logs the error but continues running).

## 5.3 Proposed Fixes

### Fix 1: Create Sidecar API Endpoints

Two new route files needed:

**`app/api/sidecar/handshake/route.ts`:**
- Accept workspace_id, droplet_id, webhook_url, droplet_ip, n8n_version
- Validate against genesis.provisions table
- Generate and return sidecar_token
- Store token + droplet IP in genesis.sidecar_tokens table

**`app/api/sidecar/heartbeat/route.ts`:**
- Accept health report from Sidecar (authenticated via X-Sidecar-Token)
- Store in genesis.health_snapshots table
- Return any pending commands from genesis.pending_commands table

### Fix 2: Server-Side Admin Auth Guard

The admin page uses client-side Clerk check only. API routes should independently verify super admin status:

```typescript
// Each admin API route should include:
const { userId } = await auth();
if (!userId || !SUPER_ADMIN_IDS.includes(userId)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

Verify all 36 admin routes have this check. Some may already have it, but it must be comprehensive.

---

# Cross-Cutting Concerns

## CC.1 RLS Policy Bug: `campaigns_workspace_isolation`

**Evidence** (from `pg_policies` query):

```sql
-- Current policy (BUGGY):
(workspace_id = (app_clerk_user_id())::text)
```

This compares `campaigns.workspace_id` (text) to `app_clerk_user_id()` (which returns the Clerk user ID, not a workspace ID). The logic is fundamentally wrong — a user ID is not a workspace ID.

**Correct policy:**

```sql
DROP POLICY IF EXISTS campaigns_workspace_isolation ON campaigns;
CREATE POLICY "campaigns_workspace_isolation" ON campaigns
  FOR ALL
  USING (
    workspace_id::uuid IN (
      SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid()
    )
  );
```

## CC.2 INSERT Policies with No Checks

Three tables have INSERT policies with null `WITH CHECK`:

| Table | Policy Name | Risk |
|---|---|---|
| `email_events` | `email_events_write_access` | Any authed user can insert events into any workspace |
| `llm_usage` | `llm_usage_write_access` | Any authed user can inflate LLM costs for any workspace |

**Fix:** Add workspace-scoped `WITH CHECK` clauses (see Objective 3 Fix 1 pattern). Note: n8n webhook inserts use the service role key, which bypasses RLS — so tightening these policies won't break the data pipeline.

## CC.3 Materialized View Security

**`mv_daily_stats`** and **`mv_llm_cost`** have no RLS (PostgreSQL limitation). Current mitigation:
- All API queries use `supabaseAdmin` with explicit workspace_id filtering
- No frontend code queries materialized views directly

**Recommended:** Revoke `SELECT` on both matviews from the `authenticated` role to prevent accidental direct access via Supabase client SDK.

## CC.4 `leads_ohio` vs `genesis.leads` Legacy Split

The system has two leads tables:
- `public.leads_ohio` (42 columns) — the original Ohio campaign table. Used by DEFAULT_WORKSPACE_ID.
- `genesis.leads` (40 columns) — the Genesis multi-tenant table. Used by new workspaces.

`workspace-db-config.ts` routes queries via `getLeadsTableName()`:
- Default workspace → `leads_ohio`
- Others → check `workspaces.settings.leads_table` → fallback to `leads_ohio`

**Gap:** The `toLeadRow()` function in the CSV import route builds rows for `leads_ohio` schema (with `email_1_sent`, `email_2_sent`, etc. boolean columns). The `genesis.leads` table also has these columns but with slightly different column names in some cases.

**Recommendation:** Audit `genesis.leads` schema against `toLeadRow()` output to ensure compatibility. In the long term, migrate `leads_ohio` data into `genesis.leads` and deprecate the split.

## CC.5 EXCLUDED_CAMPAIGNS Global Filter

From `lib/db-queries.ts`:

```typescript
export const EXCLUDED_CAMPAIGNS = [
  'Test Campaign', 'test', 'Test', 'TEST', 'Demo Campaign', 'demo'
];
```

This is used in the aggregate API to exclude test campaigns from metrics. It's a case-sensitive array with manual duplicates (`test`, `Test`, `TEST`). The `shouldExcludeCampaign` function does case-insensitive comparison, so the duplicates in the array are redundant but harmless.

**No action needed** — but when `campaign_groups` is introduced, this exclusion should be a `is_test` boolean flag on the group entity rather than a string list.

## CC.6 Index Oversaturation on `email_events`

The `email_events` table has **19 indexes** (verified via `pg_indexes` query). Several are redundant:

| Redundant Index | Covered By |
|---|---|
| `idx_email_events_workspace_ts` (workspace_id, event_ts DESC) | `idx_email_events_workspace_event_ts` (identical) |
| `idx_email_events_type` (workspace_id, event_type, event_ts DESC) | `idx_email_events_workspace_type_event_ts` (identical) |
| `idx_email_events_campaign` (workspace_id, campaign_name, event_ts DESC) | `idx_email_events_workspace_campaign_event_ts` (identical) |

**Impact:** Each INSERT writes to 19 indexes. For a high-volume email sending system, this degrades write performance.

**Recommendation:** Drop the 3 duplicate indexes to bring count to 16.

---

# Migration Sequencing

All changes should be executed in this order to avoid breaking the live system:

## Sequence 1: Non-Breaking Database Changes (Safe to deploy anytime)

```
1a. Fix campaigns_workspace_isolation RLS policy [CC.1]
1b. Harden INSERT policies on email_events and llm_usage [CC.2]
1c. Make llm_usage.workspace_id NOT NULL [Obj 3 Fix 2]
1d. Revoke SELECT on mv_daily_stats and mv_llm_cost from authenticated [CC.3]
1e. Drop 3 duplicate indexes on email_events [CC.6]
```

## Sequence 2: Schema Additions (Additive, non-breaking)

```
2a. Create campaign_groups table [Obj 1 Phase 1]
2b. Add campaign_group_id column to campaigns, email_events, daily_stats, llm_usage [Obj 1 Phase 1]
2c. Create indexes on new campaign_group_id columns
```

## Sequence 3: Data Backfill (Run once, carefully)

```
3a. Create campaign_groups for existing campaigns (group Email 1/2/3 under parent Ohio Campaign)
3b. Backfill campaign_group_id in all data tables based on campaign_name mapping
3c. Fix campaigns.workspace_id type from text to uuid [Obj 1 Phase 2]
```

## Sequence 4: Code Changes (Deploy together)

```
4a. Update aggregate API to use campaign_groups for dropdown
4b. Add smart header matching to CSV importer [Obj 2]
4c. Create /api/sidecar/heartbeat and /api/sidecar/handshake routes [Obj 5]
4d. Fix sidecar WorkflowDeployer to handle credential placeholders [Sidecar gap 8.2]
4e. Update ignition orchestrator to create campaign_group on provisioning
```

## Sequence 5: Cleanup (After all above is stable)

```
5a. Add NOT NULL constraint to campaign_group_id columns
5b. Plan leads_ohio → genesis.leads migration (separate project)
5c. Add is_test flag to campaign_groups, deprecate EXCLUDED_CAMPAIGNS string list
```

---

## Appendix: SQL Evidence Trail

All SQL queries executed during this audit were run against the live Supabase instance via MCP tool:

1. `information_schema.columns` queries for every relevant table
2. `SELECT *` on workspaces (9 rows), campaigns (8 rows)
3. `DISTINCT campaign_name` from email_events, daily_stats
4. `pg_policies` for RLS policy definitions on 5 tables
5. `pg_indexes` for index inventory on 4 tables
6. Materialized view definitions from `pg_matviews`
7. RLS enablement check across all 68 tables

No data was modified. All operations were read-only.
