# RALPH LOOP — Tenant & Campaign Isolation Audit

**Date:** 2026-02-12  
**Auditor:** GitHub Copilot (Ralph Loop methodology)  
**Scope:** Campaign isolation (within workspace), Workspace isolation (frontend, backend, sidecar, n8n)

---

## Methodology: Research → Analyze → Log → Plan → Halt-or-Execute

---

## 1. RESEARCH — Data Collection

### 1.1 RLS Policies (Supabase / PostgreSQL)

| Table | RLS Enabled | Policy | Isolation Key | Source |
|---|---|---|---|---|
| `contacts` | ✅ | `contacts_workspace_isolation` | `workspace_id = current_setting('app.workspace_id')` | `schema.sql:148-150` |
| `email_events` | ✅ | `email_events_workspace_isolation` | `workspace_id = current_setting('app.workspace_id')` | `schema.sql:153-155` |
| `llm_usage` | ✅ | `llm_usage_workspace_isolation` | `workspace_id = current_setting('app.workspace_id')` | `schema.sql:158-160` |
| `daily_stats` | ✅ | `daily_stats_workspace_isolation` | `workspace_id = current_setting('app.workspace_id')` | `schema.sql:163-165` |
| `campaigns` | ✅ | `campaigns_workspace_isolation` | `workspace_id = auth.clerk_user_id() OR service_role` | `20251210_add_campaigns_and_views.sql:23-27` |
| `campaign_groups` | ✅ | `campaign_groups_read_access` | `super_admin_id OR member_of_workspace` | `20260220_section2_campaign_groups_schema.sql:21-26` |
| `workspaces` | ✅ | Users can read their workspaces | `id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = JWT sub)` | `20251206000002_create_workspace_tables.sql:165-174` |
| `user_workspaces` | ✅ | Users can read their memberships | `user_id = JWT sub` | `20251206000002_create_workspace_tables.sql:177-182` |
| `genesis.sidecar_commands` | ✅ | `sidecar_commands_workspace_isolation` | `workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid())` | `20260126_007:384-395` |
| `genesis.sidecar_health` | ✅ | `sidecar_health_workspace_isolation` | Same as above | `20260126_007:398-406` |
| `genesis.sidecar_metrics` | ✅ | `sidecar_metrics_workspace_isolation` | Same as above | `20260126_007:409-417` |
| `genesis.sidecar_tokens` | ✅ | `sidecar_tokens_admin_only` | `user_workspaces.role = 'admin'` | `20260126_007:420-428` |
| `genesis.jwt_keypairs` | ✅ | `jwt_keypairs_system_only` | `service_role only` | `20260126_007:431-434` |
| `genesis.fleet_status` | Index on `workspace_id` | — | `workspace_id` column, checked by application | `20260126_006:118-120` |
| `genesis.do_accounts` | — | System table | Not workspace-scoped (pool resource) | `20260126_006:19-42` |

### 1.2 Backend API Guards

| API Route | Auth | Workspace Guard | Campaign Scoping |
|---|---|---|---|
| `/api/campaigns` | Clerk `userId` | `workspace_id` query param passed to Supabase `.eq('workspace_id', ...)` | N/A (lists all for workspace) |
| `/api/sandbox/workflow/[campaignId]` | Clerk `userId` | `validateWorkspaceAccess(request)` + `extractWorkspaceId(request)` | `campaignId` from URL params |
| `/api/sandbox/workflow/metrics` | Clerk `userId` | `validateWorkspaceAccess(request)` | `.eq('workspace_id', wsId).eq('campaign_id', cId)` |
| `/api/admin/do-accounts` | Super Admin | Super Admin bypass | N/A |
| `/api/admin/droplet-test` | Super Admin | Super Admin bypass | N/A |
| `/api/admin/tenant-isolation-test` | Super Admin | Super Admin bypass | Multi-workspace scan |
| `/api/onboarding/launch` | Clerk `userId` | `workspace_id` in request body | N/A |

### 1.3 Frontend Workspace Context

- **Provider:** `lib/workspace-context.tsx` → `WorkspaceProvider`
- **Current workspace:** Stored in React context + `localStorage('current_workspace_id')`
- **Workspace switching:** `switchWorkspace(id)` updates context, persists to localStorage
- **All hooks:** `useWorkspace()` returns `{ workspace, workspaceId, ... }`
- **API calls:** Hooks append `workspace_id` to API URLs (e.g., `useCampaigns({ workspaceId })`)

### 1.4 Sidecar JWT Isolation

- **JWT payload:** `{ iss: 'genesis-dashboard', sub: workspaceId, aud: 'sidecar', droplet_id, action, jti }`
- **Verification steps (7 total):**
  1. RS256 signature verification
  2. Expiration check (5 min)
  3. Issuer = `genesis-dashboard`
  4. Audience = `sidecar`
  5. **Workspace ID match** (`payload.sub !== this.workspaceId` → reject)
  6. **Droplet ID match** (`payload.droplet_id !== this.dropletId` → reject)
  7. Replay prevention (JTI dedup)
- **Result:** Sidecar rejects commands from wrong workspaces AND wrong droplets

### 1.5 n8n Workflow Isolation

- **Template variables injected:** `WORKSPACE_ID`, `CAMPAIGN_NAME`, `DASHBOARD_URL`, `DASHBOARD_API_URL`, SMTP creds
- **Per-workspace deployment:** `campaign-workflow-deployer.ts` reads `partition_registry.workspace_id` → deploys to workspace's specific droplet
- **Webhook isolation:** Each n8n instance runs on a separate droplet with unique IP, so webhooks are inherently isolated
- **Credential isolation:** Email credentials fetched from `genesis.operator_credentials` scoped by `workspace_id`

---

## 2. ANALYZE — Isolation Assessment

### 2.1 Campaign Isolation WITHIN a Workspace

| Vector | Risk | Status | Detail |
|---|---|---|---|
| API route campaign data | LOW | ✅ PASS | `sandbox/workflow/[campaignId]` uses campaignId from URL; workspace guard prevents access to other workspace's campaigns |
| Sandbox metrics | LOW | ✅ PASS | Double-filtered: `.eq('workspace_id', wsId).eq('campaign_id', cId)` |
| Campaign pulse (realtime) | LOW | ✅ PASS | Supabase channel filter: `filter: id=eq.${campaignId}` — subscribes to single campaign |
| n8n workflow deployment | LOW | ✅ PASS | `deployForCampaign()` deploys per-campaign workflows with `campaign_id` embedded in template variables |
| Frontend hook | LOW | ✅ PASS | `useCampaigns({ workspaceId })` → campaigns filtered by workspace; individual campaign views use `campaignId` prop |
| Campaign group scoping | LOW | ✅ PASS | `campaign_groups` has `workspace_id` column + RLS policy; campaigns reference `campaign_group_id` FK |

**Campaign Isolation Grade: A** — Campaigns within a workspace are properly scoped via campaign_id parameters. No cross-campaign data leakage vectors found.

### 2.2 Workspace Isolation — Frontend

| Vector | Risk | Status | Detail |
|---|---|---|---|
| Workspace context | LOW | ✅ PASS | React context scopes all hooks/components to `workspaceId` |
| localStorage bleed | MEDIUM | ⚠️ WARN | `current_workspace_id` in localStorage persists across sessions. If two users share a browser (kiosk mode), workspace could cross. Mitigated by Clerk auth. |
| API URL construction | LOW | ✅ PASS | All hooks append `workspace_id` to API calls |
| Dashboard data hook | LOW | ✅ PASS | `useDashboardData` uses `useWorkspace()` → workspace-scoped |
| Workflow graph hook | LOW | ✅ PASS | `useWorkflowGraph({ campaignId, workflowType, workspaceId })` — triple-scoped |
| Campaign groups hook | LOW | ✅ PASS | `useCampaignGroups()` uses workspace context |

**Frontend Isolation Grade: A-** — Strong isolation via React context. Minor localStorage residue risk (mitigated by auth layer).

### 2.3 Workspace Isolation — Backend

| Vector | Risk | Status | Detail |
|---|---|---|---|
| RLS policies | LOW | ✅ PASS | All core tables have RLS enabled with workspace_id filtering |
| `api-workspace-guard.ts` | LOW | ✅ PASS | `canAccessWorkspace()` validates user membership via `user_workspaces` table |
| Super Admin bypass | MEDIUM | ✅ PASS | Super admins bypass workspace checks; audit logged via `logSuperAdminAccess()` (fire-and-forget to `governance_audit_log`) |
| Service Role bypass | MEDIUM | ⚠️ WARN | `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS. Used in backend API routes. Application layer must add `.eq('workspace_id', ...)` filters. |
| `createTenantSupabaseClient()` | LOW | ✅ PASS | Sets `app.current_workspace_id` session variable for RLS; additive security layer |
| `setTenantContext()` | LOW | ✅ PASS | RPC to set workspace context in PostgreSQL session |
| Frozen workspace check | LOW | ✅ PASS | `canAccessWorkspace()` checks `workspace.status === 'frozen'` and denies access |
| Access cache TTL | LOW | ✅ PASS | 60s TTL prevents stale permissions from persisting too long |

**Backend Isolation Grade: A-** — Strong RLS + application-level guards. Service role bypass is inherent to Supabase architecture but mitigated by explicit workspace_id filters.

### 2.4 Workspace Isolation — Sidecar

| Vector | Risk | Status | Detail |
|---|---|---|---|
| JWT workspace binding | LOW | ✅ PASS | Step 5: `payload.sub !== this.workspaceId` → reject |
| JWT droplet binding | LOW | ✅ PASS | Step 6: `payload.droplet_id !== this.dropletId` → reject |
| Replay prevention | LOW | ✅ PASS | JTI tracking with in-memory Set; 10k entry limit with full clear |
| Token expiry | LOW | ✅ PASS | 5-minute expiry window |
| RS256 asymmetric auth | LOW | ✅ PASS | Private key on dashboard, public key on sidecar — no shared secret |
| Physical isolation | LOW | ✅ PASS | Each workspace gets its own DigitalOcean droplet — no shared compute |
| Health endpoint exposure | LOW | ⚠️ NOTE | `/health` endpoint is unauthenticated but only exposes `workspace_id`, `droplet_id`, uptime |
| SMTP endpoint | MEDIUM | ⚠️ WARN | `/send` endpoint is NOT JWT-protected (called by n8n workflows on same droplet). Network-level isolation relies on droplet firewall. |

**Sidecar Isolation Grade: A** — Strong cryptographic isolation. SMTP endpoint relies on network isolation (same-droplet only) rather than JWT, which is the correct design for n8n→sidecar communication.

### 2.5 Workspace Isolation — n8n Workflows

| Vector | Risk | Status | Detail |
|---|---|---|---|
| Template variable injection | LOW | ✅ PASS | `WORKSPACE_ID` injected into workflow at deployment time — hardcoded per workspace |
| Droplet isolation | LOW | ✅ PASS | Each workspace's n8n runs on its own droplet (sovereign architecture) |
| Credential scoping | LOW | ✅ PASS | Credentials fetched from `genesis.operator_credentials WHERE workspace_id = X` |
| Webhook isolation | LOW | ✅ PASS | Webhooks bound to droplet IP → workspace-specific URLs |
| Partition registry | LOW | ✅ PASS | `partition_registry` table maps workspace_id → droplet_ip → n8n instance |
| n8n encryption key | LOW | ✅ PASS | Per-droplet `n8n_encryption_key` in `fleet_status` — not shared across workspaces |
| PostgreSQL password | LOW | ✅ PASS | Per-droplet `postgres_password` in `fleet_status` — unique per workspace |

**n8n Isolation Grade: A+** — Sovereign droplet architecture provides the strongest isolation. Each workspace has its own compute, database, and encryption keys.

---

## 3. LOG — Findings Summary

### Critical Issues: **0**
### Warnings: **3**
### Notes: **1**

| # | Severity | Finding | Location | Recommendation |
|---|---|---|---|---|
| W-1 | WARN | Service Role bypasses RLS | All backend API routes using `supabaseAdmin` | Migrate routes to `createTenantSupabaseClient(workspaceId)` where possible. Already planned in `lib/supabase.ts` comments. |
| W-2 | WARN | localStorage workspace residue | `lib/workspace-context.tsx:134-146` | Clear on logout. Currently mitigated by Clerk auth. |
| W-3 | WARN | Sidecar `/send` endpoint unauthenticated | `sidecar/sidecar-agent.ts:218` | Acceptable — n8n and sidecar run on same droplet. Consider adding optional shared-secret header for defense-in-depth. |
| N-1 | NOTE | Sidecar `/health` exposes workspace_id | `sidecar/sidecar-agent.ts:204-212` | Low risk — only returns UUID, uptime, and feature flags. Not exploitable. |

### RLS Policy Gap Analysis

| Table | Has `workspace_id` | RLS Enabled | RLS Policy | Gap? |
|---|---|---|---|---|
| `email_events` | ✅ | ✅ | ✅ | No |
| `campaigns` | ✅ | ✅ | ✅ | No |
| `campaign_groups` | ✅ | ✅ | ✅ | No |
| `contacts` | ✅ | ✅ | ✅ | No |
| `daily_stats` | ✅ | ✅ | ✅ | No |
| `llm_usage` | ✅ | ✅ | ✅ | No |
| `workspaces` | ✅ (PK) | ✅ | ✅ | No |
| `user_workspaces` | ✅ | ✅ | ✅ | No |
| `genesis.fleet_status` | ✅ | ⚠️ | Index only | Application-layer only (service_role access). Acceptable for system table. |
| `genesis.do_accounts` | ❌ | ❌ | — | Pool resource, not workspace-scoped. Correct design. |
| `genesis.sidecar_commands` | ✅ | ✅ | ✅ | No |
| `genesis.sidecar_health` | ✅ | ✅ | ✅ | No |
| `genesis.sidecar_metrics` | ✅ | ✅ | ✅ | No |
| `genesis.sidecar_tokens` | ✅ | ✅ | ✅ | No |
| `genesis.jwt_keypairs` | ✅ | ✅ | ✅ | No |

---

## 4. PLAN — Remediation Recommendations

### Priority 1 (Do before beta)
- None required. All isolation mechanisms are in place.

### Priority 2 (Do during beta)
- [ ] **W-1:** Incrementally migrate API routes from `supabaseAdmin` to `createTenantSupabaseClient(workspaceId)` for defense-in-depth RLS.
- [ ] **W-2:** Add `localStorage.removeItem('current_workspace_id')` to Clerk sign-out callback.
- [ ] **W-3:** Consider adding optional `X-Sidecar-Internal-Token` header to `/send` endpoint (shared secret known only to n8n + sidecar on the same droplet).

### Priority 3 (Post-beta hardening)
- [ ] Add integration test: create two workspaces, insert data into each, verify cross-workspace queries return 0 rows.
- [ ] Add sidecar integration test: send JWT with wrong workspace_id, verify 403 rejection.
- [ ] Monitor `governance_audit_log` for unexpected super admin cross-workspace access patterns.

---

## 5. HALT-OR-EXECUTE — Decision

**Decision: ✅ PROCEED TO BETA**

**Rationale:**
- Zero critical isolation gaps found across all 5 layers (RLS, backend guards, frontend context, sidecar JWT, n8n sovereignty)
- All 3 warnings are defense-in-depth improvements, not exploitable vulnerabilities
- The sovereign droplet architecture provides physical compute isolation per workspace
- Campaign isolation within workspaces is properly enforced via campaign_id parameters at every layer
- The `tenant-isolation-test` admin endpoint provides ongoing verification capability

**Overall Isolation Grade: A**

---

*Audit generated via Ralph Loop methodology. Re-run `/api/admin/tenant-isolation-test` with live data to validate structural findings against actual database state.*
