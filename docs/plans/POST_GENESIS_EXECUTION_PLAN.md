# POST-GENESIS EXECUTION PLAN

**Date:** 2026-02-26
**Commit Baseline:** `9f53185` on `main`
**Author:** Architectural Evaluation — Claude Opus 4.6
**Purpose:** Precision execution plan derived from live codebase and database analysis across 8 domains. Written for the implementing engineer. Execute top-to-bottom.

---

## TABLE OF CONTENTS

1. [Domain 1 — Ignition Orchestrator](#domain-1--ignition-orchestrator)
2. [Domain 2 — DEFAULT_TEMPLATES & Workflow Deployer](#domain-2--default_templates--workflow-deployer)
3. [Domain 3 — Campaign Isolation & Data Partitioning](#domain-3--campaign-isolation--data-partitioning) 
4. [Domain 4 — Event Ingestion & Cost Tracking](#domain-4--event-ingestion--cost-tracking)
5. [Domain 5 — RLS & Multi-Tenant Security Posture](#domain-5--rls--multi-tenant-security-posture)
6. [Domain 6 — Onboarding Wizard](#domain-6--onboarding-wizard)
7. [Domain 7 — Sandbox Engine](#domain-7--sandbox-engine)
8. [Domain 8 — Watchdog, UUID Mapper, Admin & Compliance](#domain-8--watchdog-uuid-mapper-admin--compliance)
9. [Cross-Domain Execution Sequence](#cross-domain-execution-sequence)
10. [Validation Matrix](#validation-matrix)

---

## PRIOR SESSION ASSUMPTIONS (Verified — Do Not Re-Examine)

The following items were resolved in a prior engineering session and verified as present in the current codebase:

| Area | Status | Evidence |
|---|---|---|
| Build health | ✅ Complete | 0 TypeScript errors. Badge variant and dead barrel export fixed. |
| Template hardcoding | ✅ Complete | All `base-cold-email/*.json` files scrubbed of Ohio-specific values. `YOUR_*` tokens in place. |
| Deployer variable map | ✅ Complete | `workflow-deployer.ts` substitution map includes `YOUR_CAMPAIGN_NAME` and `YOUR_N8N_INSTANCE_URL`. |
| Sidecar n8n URL injection | ✅ Complete | `N8N_PUBLIC_URL` env var injected by `sidecar-agent.ts`. |
| Email typos | ✅ Complete | `email_adress` → `email_address` across all SMTP templates. |
| 2FA modal | ✅ Complete | QR generation, verify flow, backup codes — three bugs fixed. |
| General settings | ✅ Complete | Workspace Name field calls `renameWorkspace()` → patches `workspaces.name`. |

These items are not revisited below unless new evidence of regression was discovered during this analysis.

---

<!-- DOMAIN_1_START -->
## Domain 1 — Ignition Orchestrator

### 1.1 Current State (Verified)

The Ignition Orchestrator lives at `lib/genesis/ignition-orchestrator.ts` (1,059 lines). It is a well-structured state machine that coordinates workspace provisioning through six sequential steps:

1. **Partition creation** — calls `PartitionManager.create()` to create a tenant-specific database partition (`genesis.leads_p_{slug}`)
2. **Droplet provisioning** — calls `DropletFactory.provision()` to create a DigitalOcean droplet, OR skips this entirely in LOCAL_MODE
3. **Handshake wait** — sleeps for a configurable delay (`handshakeDelayMs`, default 5 seconds), then sets the webhook URL. This is a placeholder — no actual handshake verification occurs.
4. **Credential injection** — iterates over `config.credentials`, stores each in the CredentialVault, then sends an `INJECT_CREDENTIAL` command to the Sidecar via `sidecarClient.sendCommand()`
5. **Workflow deployment** — for each template in `DEFAULT_TEMPLATES` (7 total), loads the JSON from `base-cold-email/`, builds a comprehensive variable map, and deploys via `workflowDeployer.deploy()`
6. **Workflow activation** — iterates over all deployed workflow IDs and activates each via `workflowDeployer.activate()`

**State persistence:** The orchestrator accepts an `IgnitionStateDB` interface for persistence. A `MockIgnitionStateDB` (in-memory Map) is provided for testing. No Supabase-backed implementation of `IgnitionStateDB` was found in the codebase.

**Rollback:** On any step failure, the orchestrator enters `rollback_in_progress` state and attempts to clean up in reverse order: workflows (no-op — comment says "if droplet is deleted, workflows go with it"), credentials (calls `credentialVault.delete()`), droplet (calls `dropletFactory.terminate()`), partition (calls `partitionManager.drop()`).

**LOCAL_MODE:** Fully implemented. When `config.local_mode === true` or `process.env.LOCAL_MODE === 'true'`, Step 2 skips DigitalOcean API entirely and uses `config.local_n8n_ip` or `process.env.LOCAL_N8N_IP` or defaults to `127.0.0.1`. The droplet_id is set to the string `'local'`.

**Cancellation:** Implemented via an in-memory `cancellationFlags` Map. Before each step, `checkCancellation()` is called. If the flag is set, an `IgnitionError` is thrown, triggering rollback. This is process-local only — if the server restarts, cancellation state is lost.

**Integration interfaces:** The orchestrator depends on four interfaces (`PartitionManager`, `DropletFactory`, `SidecarClient`, `WorkflowDeployer`). Mock implementations exist for all four. The production `HttpWorkflowDeployer` class is implemented at the bottom of the same file. Production implementations of `PartitionManager`, `DropletFactory`, and `SidecarClient` were NOT found in the codebase — only mocks exist.

### 1.2 Identified Gaps and Risks

**GAP 1.2.1 — No production IgnitionStateDB implementation.** The orchestrator's state is only ever stored in a `MockIgnitionStateDB` (in-memory Map). If the Next.js process restarts mid-ignition, all state is lost. There is no `ignition_state` table in the live database. This means: (a) the admin panel cannot display ignition progress for active provisioning, (b) stuck or failed ignitions cannot be recovered, (c) there is no audit trail of provisioning operations.

**GAP 1.2.2 — No production PartitionManager implementation.** The `PartitionManager` interface declares `create()` and `drop()` methods, but only `MockPartitionManager` exists. There is no code that actually executes `CREATE TABLE genesis.leads_p_{slug} PARTITION OF genesis.leads FOR VALUES IN ('{workspace_id}')` against the live database. Ignition cannot actually create partitions.

**GAP 1.2.3 — No production DropletFactory implementation.** Same pattern — only `MockDropletFactory` exists. No code calls the DigitalOcean API to create droplets. This is expected for the LOCAL_MODE path but means cloud provisioning is non-functional.

**GAP 1.2.4 — No production SidecarClient implementation (in the dashboard).** The Sidecar itself exists as an ExpressJS app at `sidecar/sidecar-agent.ts`, but the dashboard-side client that sends commands to it (`SidecarClient` interface) has only a mock. The `HttpWorkflowDeployer` delegates to `SidecarClient.sendCommand()`, which in mock mode returns fake credential IDs and workflow IDs.

**GAP 1.2.5 — Handshake is a sleep, not a health check.** Step 3 (`handshake_pending`) simply sleeps for `handshakeDelayMs` (default 5 seconds). It does not verify that the Sidecar is actually running, that n8n is reachable, or that the droplet's HTTP endpoint responds. In production, if the droplet takes 90 seconds to boot, the 5-second sleep will pass, and Step 4 (credential injection) will fail because the Sidecar is not yet listening.

**GAP 1.2.6 — Idempotency is not guaranteed.** If `ignite()` is called twice for the same `workspace_id`, two separate state objects are created, two partitions are attempted, two droplets provisioned, etc. There is no check at the top of `ignite()` that says "if there's already an active or in-progress ignition for this workspace, reject the second call." The `IgnitionStateDB` would support this check, but since only the mock exists and it's process-local, a server restart between calls would lose the guard entirely.

**GAP 1.2.7 — Workflow rollback is a no-op.** The rollback logic for workflows contains this comment: "Workflows are on the droplet - if droplet is deleted, workflows go with it." The loop body just increments a counter without actually calling any destroy/deactivate API. This is correct if the droplet is being destroyed — but if rollback is triggered after workflow deployment but before droplet termination fails, orphan active workflows will remain running on a live droplet.

**GAP 1.2.8 — No retry logic for transient failures.** If credential injection fails for credential 3 of 5, the entire ignition rolls back. There is no retry-with-backoff for individual steps or individual credential injections. The `STEP_TIMEOUTS` mechanism provides per-step timeouts but no retries.

### 1.3 Implementation Plan

**TASK 1.3.1 — Create Supabase-backed IgnitionStateDB**

Create a new table `genesis.ignition_state` with columns: `workspace_id` (PK), `status`, `current_step`, `total_steps`, `partition_name`, `droplet_id`, `droplet_ip`, `webhook_url`, `workflow_ids` (jsonb), `credential_ids` (jsonb), `error_message`, `error_stack`, `error_step`, `rollback_started_at`, `rollback_completed_at`, `rollback_success`, `started_at`, `updated_at`, `completed_at`, `requested_by`, `region`, `droplet_size`. Add RLS policy: workspace members can SELECT their own rows; service role can INSERT/UPDATE/DELETE.

Create a companion table `genesis.ignition_operations` for the `logOperation()` method: `id` (uuid PK), `workspace_id`, `operation`, `status`, `result` (jsonb), `error`, `created_at`. This provides the audit trail.

Implement `SupabaseIgnitionStateDB` class in `lib/genesis/supabase-ignition-state-db.ts` that implements the `IgnitionStateDB` interface using the service-role Supabase client.

**Files to touch:** New migration SQL, new `lib/genesis/supabase-ignition-state-db.ts`, update `ignition-orchestrator.ts` imports.

**Validation:** Insert a test row via service role, verify RLS blocks anonymous access, verify workspace member can read their own row.

**TASK 1.3.2 — Create production PartitionManager**

Implement `SupabasePartitionManager` in `lib/genesis/supabase-partition-manager.ts`. The `create()` method must:

1. Verify `genesis.leads` parent table exists
2. Verify no existing partition for this workspace_id
3. Execute: `CREATE TABLE IF NOT EXISTS genesis.leads_p_{slug} PARTITION OF genesis.leads FOR VALUES IN ('{workspace_id}')`
4. Verify the partition was created by querying `pg_catalog.pg_inherits`
5. Register the partition in `genesis.partition_registry` (insert row with workspace_id, partition_name, sidecar_url, created_at)

The `drop()` method must: detach the partition, drop the table, remove the registry row.

**Edge case:** If `workspace_slug` contains characters invalid for a Postgres identifier, the partition creation will fail. Sanitize: lowercase, replace non-alphanumeric with underscore, truncate to 63 characters.

**Validation:** Call `create()`, verify partition appears in `pg_inherits`, verify data inserted into the partition is queryable from the parent, call `drop()`, verify cleanup.

**TASK 1.3.3 — Create production SidecarClient (HTTP)**

Implement `HttpSidecarClient` in `lib/genesis/http-sidecar-client.ts`. This client must:

1. Accept the Sidecar base URL (derived from droplet IP or `partition_registry.sidecar_url`)
2. Send POST requests to `{sidecarUrl}/api/command` with `{ action, payload }` body
3. Include authentication header (JWT or shared secret from `SIDECAR_AUTH_TOKEN` env var)
4. Implement retry with exponential backoff (3 attempts, 1s/2s/4s delays)
5. Return the standardized `{ success, result, error }` response

The Sidecar already has an Express app at `sidecar/sidecar-agent.ts` that accepts commands. The client must match its API contract.

**TASK 1.3.4 — Replace handshake sleep with actual health check**

Replace the sleep in Step 3 with a polling loop:

1. Every 5 seconds, send an HTTP GET to `{dropletIp}:5678/healthz` (n8n health endpoint) or `{sidecarUrl}/api/health`
2. If response is 200, proceed to Step 4
3. If no response after `STEP_TIMEOUTS.handshake_pending` (5 minutes), throw `IgnitionError`
4. In LOCAL_MODE, reduce the polling interval to 1 second and timeout to 30 seconds

This eliminates the race condition where credential injection is attempted before the Sidecar is ready.

**TASK 1.3.5 — Add idempotency guard at ignition entry**

At the top of `ignite()`, before initializing state:

1. Call `this.stateDB.load(config.workspace_id)`
2. If a state exists with status `active`, return early with `{ success: true, already_active: true }`
3. If a state exists with status NOT in terminal states (`active`, `failed`), return `{ success: false, error: 'Ignition already in progress' }`
4. If a state exists with status `failed`, allow re-ignition (delete old state, proceed)

This prevents double-provisioning.

**TASK 1.3.6 — Implement real workflow rollback**

In the `rollback()` method, replace the no-op workflow loop with:

1. For each `workflow_id` in `resources.workflow_ids`, call `this.workflowDeployer.activate(dropletIp, workflowId)` with `active: false` (deactivate), then call a new `WorkflowDeployer.delete(dropletIp, workflowId)` method
2. If the Sidecar is unreachable (droplet is being destroyed anyway), catch the error and log it as a warning rather than a failure
3. Add the `delete()` method to the `WorkflowDeployer` interface

**TASK 1.3.7 — Add per-credential retry logic**

In Step 4 (credential injection), wrap each credential's store+inject in a retry loop:

1. Attempt up to 3 times with 2-second backoff
2. On transient errors (network timeout, 503), retry
3. On permanent errors (400, 401, credential validation failure), fail immediately
4. Only throw `IgnitionError` (triggering full rollback) after all retries are exhausted

This improves resilience against transient Sidecar failures during credential injection.

**TASK 1.3.8 — Create production DropletFactory (lower priority)**

Implement `DigitalOceanDropletFactory` in `lib/genesis/digitalocean-droplet-factory.ts`:

1. Use the DigitalOcean API v2 (`https://api.digitalocean.com/v2/droplets`)
2. Auth via `DIGITALOCEAN_API_TOKEN` env var
3. `provision()`: Create droplet with user-data script that installs Docker, pulls n8n + Sidecar images, and starts them. Tag the droplet with workspace_id for tracking.
4. `terminate()`: Delete droplet by ID. Verify deletion by polling until the droplet no longer appears in the API.
5. Handle rate limits (429 responses) with retry.

This is lower priority because LOCAL_MODE provides a functional path for beta deployments. Cloud provisioning is needed for production multi-tenant scale.

<!-- DOMAIN_1_END -->

---

<!-- DOMAIN_2_START -->
## Domain 2 — DEFAULT_TEMPLATES & Workflow Deployer

### 2.1 Current State (Verified)

**DEFAULT_TEMPLATES array** is defined in `lib/genesis/ignition-types.ts` (lines 305–380). It contains exactly 7 template references:

| template_id | template_name | display_name | category | required_credentials |
|---|---|---|---|---|
| email_1 | email_1 | Email 1 | email | google_oauth2, postgres |
| email_2 | email_2 | Email 2 | email | google_oauth2, postgres |
| email_3 | email_3 | Email 3 | email | google_oauth2, postgres |
| research_report | research_report | Research Report | research | openai_api, postgres |
| email_preparation | email_preparation | Email Preparation | preparation | google_oauth2, postgres |
| reply_tracker | reply_tracker | Reply Tracker | tracking | google_oauth2, postgres |
| opt_out | opt_out | Opt-Out Handler | compliance | google_oauth2, postgres |

**TEMPLATE_FILE_MAP** is defined in `ignition-orchestrator.ts` (lines 41–49). It maps each `template_name` to the actual JSON file names on disk:

| template_name | gmail file | smtp file |
|---|---|---|
| email_1 | Email 1.json | Email 1-SMTP.json |
| email_2 | Email 2.json | Email 2-SMTP.json |
| email_3 | Email 3.json | Email 3-SMTP.json |
| email_preparation | Email Preparation.json | (none) |
| research_report | Research Report.json | (none) |
| reply_tracker | Reply Tracker.json | (none) |
| opt_out | Opt-Out.json | (none) |

All 7 Gmail variant files and all 3 SMTP variant files exist in `base-cold-email/`. The mapping is complete — every `template_name` in `DEFAULT_TEMPLATES` has a corresponding entry in `TEMPLATE_FILE_MAP`, and every file referenced in `TEMPLATE_FILE_MAP` exists on disk.

**Template loading** in the orchestrator (`loadTemplateJson()`, lines 221–247) correctly selects the SMTP variant when `emailProvider === 'smtp'` and a `.smtp` file exists in the map, falling back to the `.gmail` file otherwise. Non-email templates (research_report, email_preparation, reply_tracker, opt_out) only have Gmail variants, which is correct — these workflows do not send emails directly and are provider-agnostic.

**Variable map construction** (orchestrator lines 469–530) builds a comprehensive map of 30+ `YOUR_*` placeholders with values derived from:
- Workspace identity (workspace_id, slug, name)
- Campaign group attribution (campaign_group_id, campaign_name)
- Database routing (leads table partition name)
- Instance URLs (n8n base URL, unsubscribe URL)
- Dashboard callback URLs
- Operator-level secrets from env vars (webhook token, Relevance AI keys, Google CSE keys, Apify token)
- Workspace-specific values from `config.variables` (sender email, test email, calendly links)
- Credential ID placeholders populated from n8n-assigned UUIDs after sidecar injection

**Substitution logic** in `HttpWorkflowDeployer.deploy()` (lines 985–1010) merges the variable_map and credential_map, then does a global string-replace over the JSON-stringified workflow. Placeholders are properly regex-escaped before replacement.

**The Sidecar's WorkflowDeployer** (`sidecar/workflow-deployer.ts`, 380 lines) is a SEPARATE implementation from the orchestrator's `HttpWorkflowDeployer`. This Sidecar-side deployer:
- Fetches email provider config from Supabase (`genesis.email_provider_config`)
- Loads only the 3 email templates (not all 7) based on provider
- Has its own `injectCredentialPlaceholders()` method with a hardcoded map of `YOUR_*` → request field values
- Sorts replacement keys longest-first to prevent partial-match issues
- Skips empty values (leaves unresolved placeholders intact if no value provided)

### 2.2 Identified Gaps and Risks

**GAP 2.2.1 — Two separate deployer implementations with divergent behavior.** The orchestrator's `HttpWorkflowDeployer` (dashboard-side) and the Sidecar's `WorkflowDeployer` are independent implementations. The orchestrator deploys all 7 templates and handles all `YOUR_*` substitution client-side before sending to Sidecar. The Sidecar deployer deploys only 3 email templates and does its own substitution. If both are triggered (e.g., Sidecar auto-deploys on boot AND the orchestrator deploys during ignition), workflows will be duplicated — once from the orchestrator, once from the Sidecar.

**Analysis:** The intended architecture is clear: the orchestrator is the source of truth for provisioning. The Sidecar's `WorkflowDeployer` appears to be a legacy or fallback path from before the orchestrator existed. The Sidecar deployer should NOT be called during the ignition flow — the orchestrator handles deployment itself via the `DEPLOY_WORKFLOW` sidecar command (which bypasses the Sidecar's own deployer and goes directly to the n8n API via `n8n-manager.ts`).

**Risk:** If the Sidecar's auto-deploy-on-boot logic exists and is active, it will deploy a second set of workflows when the droplet boots, creating duplicates.

**GAP 2.2.2 — Empty placeholder values are silently skipped.** In the Sidecar's `injectCredentialPlaceholders()`, the line `if (value === '') continue;` means that any `YOUR_*` token without a corresponding value is left as a literal string in the deployed workflow JSON. For example, if `credential_openai_id` is not provided, the workflow JSON will contain the literal string `YOUR_CREDENTIAL_OPENAI_ID` as a credential ID in n8n — which will cause the workflow to fail at runtime with an "invalid credential" error, not at deploy time. This is a silent failure mode.

The orchestrator's `HttpWorkflowDeployer` does NOT skip empty values — it replaces all tokens including empty ones. However, replacing `YOUR_CREDENTIAL_OPENAI_ID` with an empty string is equally problematic — it produces a workflow with an empty credential ID, which will also fail at runtime.

**GAP 2.2.3 — Research Report template lists `openai_api` as required, but variable map provides no `YOUR_CREDENTIAL_OPENAI_ID` mapping.** The `required_credentials` for `research_report` includes `openai_api`. The orchestrator's variable map includes credential ID placeholders only for credentials where `cred.template_placeholder` is set. If the onboarding flow does not include an OpenAI credential with `template_placeholder: 'YOUR_CREDENTIAL_OPENAI_ID'`, the Research Report workflow will deploy with an unresolved placeholder. The `required_credentials` field in `DEFAULT_TEMPLATES` is informational only — it is never validated against the actual credentials supplied in `config.credentials`.

**GAP 2.2.4 — Sidecar deployer only deploys email templates (3 of 7).** The Sidecar's `getTemplateFiles()` method returns only `Email 1.json`, `Email 2.json`, `Email 3.json` (or their SMTP variants). The remaining 4 workflows (Email Preparation, Research Report, Reply Tracker, Opt-Out) are NOT deployed by the Sidecar deployer. This means if the Sidecar is the sole deployment mechanism (e.g., ignition orchestrator is not used), the workspace will be missing 4 critical workflows.

**GAP 2.2.5 — No validation that deployed workflows are free of unresolved placeholders.** After substitution, neither the orchestrator nor the Sidecar performs a scan of the final JSON for remaining `YOUR_*` strings. A simple regex check (`/YOUR_[A-Z_]+/g`) on the substituted JSON would catch this before deployment.

### 2.3 Implementation Plan

**TASK 2.3.1 — Disable or gate Sidecar's auto-deploy logic**

Investigate `sidecar/sidecar-agent.ts` for any startup logic that calls `WorkflowDeployer.deployWorkflows()` automatically on boot. If found:

1. Gate it behind an env var `SIDECAR_AUTO_DEPLOY=true|false` (default `false`)
2. When the orchestrator manages deployment, set `SIDECAR_AUTO_DEPLOY=false` in the droplet's environment
3. Document that the Sidecar deployer is a manual/fallback path only

If no auto-deploy-on-boot exists, document this finding and mark this task as N/A.

**Files to touch:** `sidecar/sidecar-agent.ts`

**TASK 2.3.2 — Add required_credentials validation to the orchestrator**

In the orchestrator's Step 5 (workflow deployment), before deploying each template:

1. Check the template's `required_credentials` array
2. For each required credential type, verify that a matching credential exists in `config.credentials` with a non-null `template_placeholder`
3. Verify that the corresponding n8n credential ID was returned by the Sidecar in Step 4 (exists in `resources.n8n_credential_ids`)
4. If any required credential is missing, throw an `IgnitionError` with a clear message: "Template '{display_name}' requires credential type '{type}' but none was provided"

This catches missing credentials at deploy time rather than at workflow runtime.

**Files to touch:** `lib/genesis/ignition-orchestrator.ts` (Step 5 executor)

**TASK 2.3.3 — Add unresolved placeholder scan post-substitution**

In `HttpWorkflowDeployer.deploy()`, after all substitutions are applied:

1. Scan `jsonStr` for the pattern `/YOUR_[A-Z_]+/g`
2. Collect all matches
3. If any matches remain, log a warning with the list of unresolved placeholders
4. Optionally: if `config.dry_run === true`, include unresolved placeholders in the result for review; if `config.dry_run === false` (production), throw an error preventing deployment of a broken workflow

**Files to touch:** `lib/genesis/ignition-orchestrator.ts` (`HttpWorkflowDeployer.deploy()`)

**TASK 2.3.4 — Align Sidecar deployer to deploy all 7 templates (if Sidecar standalone mode is needed)**

If the Sidecar deployer is retained as a standalone fallback:

1. Update `getTemplateFiles()` to return all 7 template files for the selected provider
2. Add the 4 non-email templates (Email Preparation.json, Research Report.json, Reply Tracker.json, Opt-Out.json) to both the Gmail and SMTP template file lists
3. Update the `injectCredentialPlaceholders()` map to include all credential types needed by the non-email workflows (openai_api, anthropic)

If the Sidecar deployer is deprecated in favor of the orchestrator path exclusively, skip this task and add a deprecation comment to `sidecar/workflow-deployer.ts`.

**Files to touch:** `sidecar/workflow-deployer.ts`

**TASK 2.3.5 — Handle empty credential values explicitly**

In both deployers' substitution logic:

1. For credential ID placeholders specifically (matching `YOUR_CREDENTIAL_*_ID`), treat an empty string as an error, not a skip. If the credential is required by the template, this is a hard failure.
2. For content placeholders (YOUR_COMPANY_NAME, YOUR_CALENDLY_LINK_1, etc.), an empty string replacement is acceptable — these are optional personalization values.
3. Add a distinction in the map: credential IDs vs. content variables. Credential IDs with empty values → error. Content variables with empty values → replace with empty string (or leave placeholder, configurable).

**Files to touch:** `lib/genesis/ignition-orchestrator.ts`, `sidecar/workflow-deployer.ts`

<!-- DOMAIN_2_END -->

---

<!-- DOMAIN_3_START -->
## Domain 3 — Campaign Isolation & Data Partitioning

### 3.1 Current State (Verified)

**Campaign creation flow:** When a campaign is created through the dashboard, the `POST /api/campaigns` endpoint (or `POST /api/campaigns/provision`) inserts a row into the `campaigns` table with `workspace_id`, `name`, `description`, `status`, `campaign_group_id`, and n8n integration fields (`n8n_workflow_id`, `n8n_status`). Campaigns belong to a workspace and optionally to a `campaign_group`.

**Campaign groups:** The system supports `campaign_groups` as a higher-level organizational unit. The dashboard's `useCampaignGroups()` hook fetches groups scoped to a workspace. The aggregate API accepts a `campaign_group_id` parameter and filters `email_events` by `campaign_group_id` when provided.

**Workflow isolation per campaign:** Each campaign is intended to get its own set of 7 workflows, named with the pattern `[{workspace_name}] {template_display_name}`. The campaign name is injected into workflows via `YOUR_CAMPAIGN_NAME` placeholder. However, the orchestrator (`ignite()`) provisions workflows per-workspace, not per-campaign. The variable `YOUR_CAMPAIGN_NAME` is set from `config.campaign_group_name ?? config.workspace_name` — meaning all workflows for a workspace share the same campaign name unless the caller explicitly provides different campaign group names.

**Dashboard campaign filtering:** The `useDashboardData` hook passes `selectedGroupId` (campaign_group_id) and `selectedCampaign` (campaign name) as query parameters to `/api/dashboard/aggregate`. The aggregate route's `buildEventFilters()` function:

1. Always filters by `workspace_id` (hardcoded base filter)
2. If `campaignGroupId` is provided, adds `.eq('campaign_group_id', campaignGroupId)`
3. If `campaign` (name) is provided but no group ID, adds `.eq('campaign_name', campaign)`
4. If neither is provided, excludes certain campaign names via `EXCLUDED_CAMPAIGNS`

**Data partitioning:** The leads table uses Postgres list partitioning on `workspace_id` via the `genesis.leads` parent table, with per-workspace partitions like `genesis.leads_p_{slug}`. The `getLeadsTableName()` function (called in the aggregate route) returns the correct table name for the workspace. Email events, daily_stats, and llm_usage are all filtered by `workspace_id` — they are NOT partitioned (they live in the public schema's regular tables with `workspace_id` as a column filter).

**Ohio Firewall:** The `ohio-firewall.ts` module provides three functions:
- `assertIsOhio(workspaceId, context)` — throws if workspace is NOT the Ohio legacy workspace
- `assertIsNotOhio(workspaceId, context)` — throws if workspace IS Ohio
- `getLeadsTable(workspaceId)` — returns `leads_ohio` for Ohio, `genesis.leads` for all others

The `OHIO_WORKSPACE_ID` constant is imported from `genesis-db-config.ts`. This firewall prevents Ohio data from reaching the V35 (genesis) infrastructure and vice versa.

**Cross-tenant data access paths:**

The `email_events` table has a `workspace_id` column, and every dashboard query filters by it. The aggregate API requires `workspace_id` in the query params and runs workspace access validation via `validateWorkspaceAccess()` (which checks `user_workspaces` membership). The API then passes the validated workspace ID into all Supabase queries.

The campaigns table is also filtered by `workspace_id` in the campaigns API route.

### 3.2 Identified Gaps and Risks

**GAP 3.2.1 — Campaigns are not provisioned with dedicated workflow sets during ignition.** The ignition orchestrator deploys 7 workflows per workspace, not per campaign. The `YOUR_CAMPAIGN_NAME` placeholder is set at the workspace level. When a user creates a second campaign within the same workspace, there is no code path that deploys a new set of 7 workflows for that campaign. The existing workflows continue to attribute all activity to the workspace-level campaign name.

**Impact:** Multi-campaign workspaces cannot independently track per-campaign metrics at the n8n level. All emails sent by all workflows in a workspace will carry the same `campaign_name` tag. The dashboard may show aggregated data across campaigns, but the underlying n8n workflows cannot differentiate.

**GAP 3.2.2 — Campaign dropdown may show names from `email_events` rather than the campaigns source-of-truth table.** The aggregate route fetches campaign names for the dropdown from `email_events` distinct `campaign_name` values (inspecting the query logic). If a campaign has been renamed in the `campaigns` table but old events retain the original name, the dropdown will show both names — the old one from events and the new one from the campaigns table. This creates phantom campaigns in the UI.

**GAP 3.2.3 — `campaign_group_id` filter on `email_events` requires the column to exist.** The aggregate route adds `.eq('campaign_group_id', campaignGroupId)` to event queries. If `email_events` does not have a `campaign_group_id` column (it was not in the event ingestion schema — the events API inserts `campaign_name` but not `campaign_group_id`), this filter will silently fail and return zero results.

**Verification needed:** Check whether `email_events` has a `campaign_group_id` column. If it does not, the campaign group filtering in the aggregate route is broken — it will return empty data whenever a group is selected.

**GAP 3.2.4 — No index on `email_events.campaign_group_id` or `email_events.campaign_name`.** Even if the column exists, high-volume `email_events` queries filtered by campaign fields without proper indexes will be slow. The existing index `idx_email_events_event_ts` covers `event_ts` only.

**GAP 3.2.5 — Cross-tenant isolation relies entirely on application-layer filters.** The `email_events`, `llm_usage`, and `daily_stats` tables are in the public schema and do not use Postgres RLS for workspace isolation. They rely on the application always including `.eq('workspace_id', workspaceId)` in queries. A single bug in any query (e.g., forgetting the workspace filter) would expose data across tenants. This is addressed in detail in Domain 5 (RLS), but noted here as a campaign-isolation concern.

### 3.3 Implementation Plan

**TASK 3.3.1 — Design and implement per-campaign workflow provisioning**

This is the most significant architectural decision in the campaign domain. Two approaches:

**Option A — Per-campaign workflow deployment (recommended):**
1. When a new campaign is created via `POST /api/campaigns`, if the workspace has an active ignition (status `active`), trigger a workflow deployment for the new campaign only
2. Create a new function `deployForCampaign(workspaceId, campaignId, campaignName)` that:
   - Loads the workspace's droplet IP from `genesis.partition_registry`
   - Loads the 7 templates from `base-cold-email/`
   - Builds the variable map with the campaign-specific `YOUR_CAMPAIGN_NAME`
   - Names the workflows `[{workspace_name}] {template_display_name} — {campaign_name}`
   - Deploys and activates each workflow
   - Records the workflow IDs in the `campaigns` table (`n8n_workflow_id` field, make it a jsonb array of all 7 IDs)
3. When a campaign is deactivated/deleted, deactivate/delete its corresponding n8n workflows

**Option B — Single workflow set with campaign passed at runtime:**
1. Workflows are designed to accept campaign name as a runtime parameter (webhook body field)
2. A single set of 7 workflows handles all campaigns
3. The campaign name comes from the lead data or webhook trigger, not from the workflow configuration
4. Simpler to manage, but less isolated

**Recommendation:** Option A provides true campaign isolation and allows independent campaign activation/deactivation. Implement Option A.

**Files to touch:** `app/api/campaigns/provision/route.ts`, new `lib/genesis/campaign-workflow-deployer.ts`, update `campaigns` table schema to store n8n workflow IDs per campaign.

**TASK 3.3.2 — Add `campaign_group_id` column to `email_events` if missing**

1. Check the live `email_events` table schema for `campaign_group_id` column
2. If missing, create a migration: `ALTER TABLE email_events ADD COLUMN campaign_group_id UUID REFERENCES campaign_groups(id) NULL`
3. Add index: `CREATE INDEX idx_email_events_campaign_group ON email_events (campaign_group_id) WHERE campaign_group_id IS NOT NULL`
4. Update the event ingestion API (`app/api/events/route.ts`) to accept and store `campaign_group_id` from the webhook payload
5. Backfill existing rows: for each event, look up its `campaign_name` in the `campaigns` table, find the corresponding `campaign_group_id`, and update the event row

**Files to touch:** New migration SQL, `app/api/events/route.ts`, backfill script

**TASK 3.3.3 — Add composite indexes for campaign performance**

Create indexes to support the aggregate route's query patterns:

1. `CREATE INDEX idx_email_events_ws_type_ts ON email_events (workspace_id, event_type, event_ts)`
2. `CREATE INDEX idx_email_events_ws_campaign ON email_events (workspace_id, campaign_name)`
3. `CREATE INDEX idx_daily_stats_ws_day ON daily_stats (workspace_id, day)`
4. `CREATE INDEX idx_llm_usage_ws_created ON llm_usage (workspace_id, created_at)`

These indexes serve the aggregate dashboard's parallel count queries, which currently scan without indexes.

**Files to touch:** New migration SQL

**TASK 3.3.4 — Normalize campaign dropdown source**

Update the aggregate route's campaign list to pull from the `campaigns` table (source of truth) rather than from `SELECT DISTINCT campaign_name FROM email_events`:

1. Query `campaigns` table filtered by workspace_id
2. Return campaign names and statuses
3. Include a count of events per campaign (join or subquery) for display
4. Map legacy event campaign names to their current campaign record

This ensures the dropdown shows only real, active campaigns — not phantom names from old events.

**Files to touch:** `app/api/dashboard/aggregate/route.ts` (campaign list section)

<!-- DOMAIN_3_END -->

---

<!-- DOMAIN_4_START -->
## Domain 4 — Event Ingestion & Cost Tracking

### 4.1 Current State (Verified)

**Event ingestion API** (`app/api/events/route.ts`, 269 lines):

- **Authentication:** Checks `x-webhook-token` header against `process.env.DASH_WEBHOOK_TOKEN`. This is a SINGLE global token shared across all workspaces. Any n8n instance or external caller that possesses this token can submit events for ANY workspace by setting the `workspace_id` field in the payload.
- **Rate limiting:** Uses `checkRateLimit()` with `RATE_LIMIT_WEBHOOK` config, keyed by client IP (`events:{clientId}`).
- **Validation:** Uses Zod schema. `workspace_id` is optional (defaults to `DEFAULT_WORKSPACE_ID`). `campaign` (campaign_name) is optional (defaults to `'Default Campaign'`). `event_type` is validated against a fixed enum. `idempotency_key` is required.
- **Idempotency:** Before insert, queries `email_events` for an existing row matching the `idempotency_key` in `metadata->>idempotency_key`. If found, returns `{ ok: true, deduped: true }`. Also generates an `event_key` from provider+message_id+event_type+step for Postgres-level unique constraint dedup.
- **Contact upsert:** Upserts into a `contacts` table (may not exist in all deployments — uses `(supabaseAdmin as any)` type assertion).
- **Email record upsert:** For `sent` events, upserts into an `emails` table (same caveat).
- **Event insert:** Inserts into `email_events` with workspace_id, contact info, campaign_name, email_number, event_type, event_ts, and metadata. Handles duplicate key errors gracefully.
- **Notifications:** After successful event insert, creates a notification in the `notifications` table for actionable event types (reply, opt_out, sent, opened, clicked, bounced).

**Cost event API** (`app/api/cost-events/route.ts`, 308 lines):

- **Authentication:** Same pattern — `x-webhook-token` header against `DASH_WEBHOOK_TOKEN`. Same global token risk.
- **Rate limiting:** Same `RATE_LIMIT_WEBHOOK` config.
- **Validation:** Zod schema. Accepts single event or batch (up to 100). `workspace_id` optional (defaults to `DEFAULT_WORKSPACE_ID`). `provider` and `model` are required. `tokens_in`, `tokens_out`, `cost_usd` are optional. The API calculates cost via `calculateLlmCost()` if not provided.
- **Storage:** Inserts into `llm_usage` table with workspace_id, campaign_name, provider, model, tokens, cost_usd, and metadata.
- **Budget alerts:** After insert, for each affected workspace: fetches the workspace plan, gets plan limits (free: $5, starter: $50, pro: $250, enterprise: unlimited), queries current month's total cost from `llm_usage`, and calls `checkBudgetAlerts()`. This is done in a non-blocking `Promise.all()` — errors are logged but don't fail the request.
- **GET endpoint:** Returns recent cost events for a workspace. Uses `DEFAULT_WORKSPACE_ID` as fallback — does NOT require workspace access validation. This is a debugging endpoint that leaks data.

**daily_stats table:** Referenced by the aggregate route. Queries use `supabaseAdmin.from('daily_stats')`. Based on the aggregate route's usage, `daily_stats` is queried as a regular table with columns: `day`, `sends`, `replies`, `opt_outs`, `bounces`, `campaign_name`, `workspace_id`. Whether this is a materialized view or a table needs to be verified against the live database.

### 4.2 Identified Gaps and Risks

**CRITICAL GAP 4.2.1 — Single global webhook token for all workspaces.** Both `/api/events` and `/api/cost-events` use `DASH_WEBHOOK_TOKEN` — one secret shared across all tenants. If any tenant's n8n instance is compromised, the attacker obtains a token that can:
1. Submit fake events for ANY workspace (inflating/deflating their metrics)
2. Submit cost events for ANY workspace (triggering budget alerts or masking real spend)
3. Read events via the cost-events GET endpoint without workspace validation

This is the single biggest security vulnerability in the event ingestion layer.

**GAP 4.2.2 — Cost events GET endpoint has no workspace access validation.** The `GET /api/cost-events` endpoint accepts a `workspace_id` parameter and returns all cost events for that workspace. It does NOT call `validateWorkspaceAccess()`. Any authenticated user (or even an unauthenticated caller, since there's no auth check on GET) can read any workspace's cost data. Note: actually, re-reading the code, there's NO auth check at all on the GET — it just queries and returns data.

**GAP 4.2.3 — `workspace_id` defaults to `DEFAULT_WORKSPACE_ID` when not provided — and verified n8n templates never send it.** If an n8n workflow fails to include `workspace_id` in its event payload, the event lands under the default workspace — polluting another tenant's data. The default should be removed or at minimum logged as a warning.

**VERIFIED (2026-02-26 session):** This is not a hypothetical failure mode — it is structural:
1. `base-cold-email/Research Report.json` — the primary cost-event-producing workflow — builds its cost event object with `provider`, `model`, `tokens_in`, `tokens_out`, `cost_usd`, `campaign_name` fields. There is NO `workspace_id` field in the cost event payload object. Every cost event from every Research Report execution lands under `DEFAULT_WORKSPACE_ID`. This means **100% of LLM cost data is currently misattributed** — all costs appear under one workspace regardless of which tenant ran the workflow.
2. `base-cold-email/Email 1.json`, `Email 2.json`, `Email 3.json` click-tracking code hardcodes `const WORKSPACE_ID = 'default'` rather than using the `YOUR_WORKSPACE_ID` substitution placeholder. Click-tracking events from un-substituted or base templates will land under the default workspace.

When Task 4.3.1 (per-workspace tokens) is implemented, `workspace_id` can be derived server-side from the token rather than trusting the client payload, solving the attribution problem without waiting for n8n template changes.

**GAP 4.2.4 — Campaign name defaults to `'Default Campaign'` when not provided.** Similar issue — events without a campaign name are attributed to a phantom campaign. This makes the campaign breakdown unreliable if any workflow fails to include the campaign name.

**GAP 4.2.5 — Idempotency check uses JSONB query on metadata, not an indexed column.** The query `email_events.metadata->>idempotency_key` performs a JSONB field extraction on every row matching `workspace_id`. Without a GIN index on `metadata` or a generated column for `idempotency_key`, this becomes increasingly slow as the events table grows.

**GAP 4.2.6 — Budget enforcement is advisory only.** `checkBudgetAlerts()` fires notifications when spend exceeds thresholds, but it does NOT reject the cost event or block further LLM calls. A workspace that exceeds its plan's cost limit can continue accumulating costs without restriction. The kill switch (freeze workspace) is manual and admin-triggered.

**GAP 4.2.7 — `contacts` and `emails` tables may not exist.** The event ingestion code uses `(supabaseAdmin as any)` to bypass TypeScript's type checking when upserting into `contacts` and `emails` tables. This suggests these tables are optional and may not exist in the current schema. If they don't exist, every event insertion generates console errors for the contact/email upsert steps — these errors are caught but create noise.

**GAP 4.2.8 — `daily_stats` population mechanism is unclear.** The aggregate route queries `daily_stats`, but the event ingestion API does NOT write to `daily_stats`. If this is a materialized view, it needs to be refreshed. If it's a table, it needs a trigger or scheduled job to aggregate events into daily buckets. The refresh mechanism was not found in the ingestion code.

**GAP 4.2.9 — `campaign_group_id` is entirely absent from the LLM cost tracking path.** Verified in the 2026-02-26 session by live Supabase MCP inspection:

- The `llm_usage` table has a `campaign_group_id UUID` column (the DB schema has it), but it is **always NULL** in every row. There is no code that ever writes to it.
- `/api/cost-events/route.ts` Zod schema has NO `campaign_group_id` field — the field is not accepted on ingest.
- The `llm_usage` INSERT statement never sets `campaign_group_id`.
- `v_llm_cost_secure` groups by `workspace_id, provider, model, day` only — there is no campaign dimension. Cost data cannot be filtered or broken down by campaign group at all.
- `mv_daily_stats` groups by `workspace_id, campaign_name, date(event_ts)` — uses the free-text `campaign_name` string, not the FK `campaign_group_id`.

**Contrast with email events (fixed in Domain 3):** Domain 3 Task 3.3.2 added `campaign_group_id` to `email_events` and updated the event ingestion API to accept and store it. The ignition orchestrator and `campaign-workflow-deployer` both inject `YOUR_CAMPAIGN_GROUP_ID` into n8n workflows. So email events CAN be filtered by campaign group — but cost events CANNOT. This creates an inconsistency where the dashboard's cost tab has no campaign dimension while the emails tab does.

**Impact:** Any feature that shows "cost per campaign" or allows filtering cost analytics by campaign group is broken at the data layer. `campaign_group_id` will always be NULL in `llm_usage`, so joins or filters on it return nothing.

### 4.3 Implementation Plan

**TASK 4.3.1 — Implement per-workspace webhook tokens (Critical Security Fix)**

This is the highest-priority security task across all domains.

1. Add a column `webhook_token` (text, unique, indexed) to the `workspaces` table
2. During workspace creation (or ignition), generate a cryptographically random token: `crypto.randomBytes(32).toString('hex')`
3. Store the token in `workspaces.webhook_token`
4. Inject this token into the n8n workflows via `YOUR_WEBHOOK_TOKEN` placeholder (already in the variable map)
5. Update both event ingestion APIs to validate the token against the specific workspace:

The validated flow becomes:
- Extract `workspace_id` from the request body
- If `workspace_id` is missing, return 400 (do not fall back to default)
- Query `workspaces` table for the workspace's token
- Compare `x-webhook-token` header against the workspace's token
- If mismatch, return 401

6. Keep `DASH_WEBHOOK_TOKEN` as a super-admin bypass token (for debugging/migration) gated behind `process.env.ALLOW_GLOBAL_WEBHOOK_TOKEN === 'true'`

**Files to touch:** Migration SQL (add column), `app/api/events/route.ts`, `app/api/cost-events/route.ts`, workspace creation code, ignition variable map

**TASK 4.3.2 — Secure the cost-events GET endpoint**

1. Add `validateWorkspaceAccess()` call to the GET handler
2. Require Clerk authentication (`const { userId } = await auth()`)
3. If unauthenticated, return 401
4. If user lacks workspace access, return 403

**Files to touch:** `app/api/cost-events/route.ts` (GET handler)

**TASK 4.3.3 — Remove DEFAULT_WORKSPACE_ID fallback from event ingestion**

1. In `/api/events`, change `workspace_id` from optional to required in the Zod schema
2. Reject requests without `workspace_id` with a 400 error: `"workspace_id is required"`
3. Same change in `/api/cost-events`
4. Remove `DEFAULT_WORKSPACE_ID` import from both files
5. Update all n8n workflow templates to ensure `workspace_id` is always included in event payloads (verify templates already include `YOUR_WORKSPACE_ID` in the webhook body)

**Files to touch:** `app/api/events/route.ts`, `app/api/cost-events/route.ts`

**TASK 4.3.4 — Add persistent idempotency_key column**

1. Add column: `ALTER TABLE email_events ADD COLUMN idempotency_key TEXT`
2. Add unique index: `CREATE UNIQUE INDEX idx_email_events_idemp ON email_events (workspace_id, idempotency_key) WHERE idempotency_key IS NOT NULL`
3. Update event ingestion to write `idempotency_key` to the new column (instead of/in addition to metadata)
4. Update idempotency check to query the indexed column: `.eq('idempotency_key', idempotency_key)` instead of `.eq('metadata->>idempotency_key', idempotency_key)`
5. Backfill existing events: `UPDATE email_events SET idempotency_key = metadata->>'idempotency_key' WHERE metadata->>'idempotency_key' IS NOT NULL`

**Files to touch:** Migration SQL, `app/api/events/route.ts`

**TASK 4.3.5 — Implement automatic budget enforcement**

1. In the cost-events POST handler, BEFORE inserting the event, check if the workspace has exceeded its plan's cost limit
2. Query current month's total: `SELECT SUM(cost_usd) FROM llm_usage WHERE workspace_id = X AND created_at >= first_of_month`
3. If `current_total + event.cost_usd > plan_limit`, reject the event with a 402 status code and body: `{ error: "Budget limit exceeded", current_spend: X, limit: Y }`
4. This immediately stops cost accumulation for over-budget workspaces
5. The existing advisory alerts remain as early warnings; this adds hard enforcement

**Edge case:** Race condition — two concurrent events could both pass the check. Mitigate by using `SELECT ... FOR UPDATE` on a budget tracking row, or accept slight overage (within 1 event's cost) as acceptable.

**Files to touch:** `app/api/cost-events/route.ts`

**TASK 4.3.8 — Add `campaign_group_id` to the LLM cost tracking path (Fix Gap 4.2.9)**

This task closes the parity gap between email event attribution and cost event attribution.

1. **Update `/api/cost-events` Zod schema:** Add `campaign_group_id: z.string().uuid().optional()` to `costEventSchema` (both the single-event and batch schemas).
2. **Update `llm_usage` INSERT:** Pass `campaign_group_id: event.campaign_group_id ?? null` to the insert statement.
3. **Rebuild `v_llm_cost_secure`:** Add `campaign_group_id` to the SELECT list and the GROUP BY clause:
   ```sql
   DROP VIEW IF EXISTS v_llm_cost_secure;
   CREATE VIEW v_llm_cost_secure AS
   SELECT
     workspace_id,
     campaign_name,
     campaign_group_id,
     provider,
     model,
     DATE(created_at) AS day,
     SUM(tokens_in) AS tokens_in,
     SUM(tokens_out) AS tokens_out,
     SUM(cost_usd) AS cost_usd,
     COUNT(*) AS call_count
   FROM llm_usage
   GROUP BY workspace_id, campaign_name, campaign_group_id, provider, model, DATE(created_at);
   ```
4. **n8n workflow templates:** The `base-cold-email/Research Report.json` cost event payload must include `campaign_group_id: YOUR_CAMPAIGN_GROUP_ID`. Since `YOUR_CAMPAIGN_GROUP_ID` is already injected by the ignition orchestrator and campaign deployer (verified: `lib/genesis/ignition-orchestrator.ts` line 664, `lib/genesis/campaign-workflow-deployer.ts` line 157), only the workflow JSON templates need updating to pass the variable through.
5. **No migration needed for `llm_usage`** — the column already exists (verified live DB, always NULL). Only the ingestion code and view need updating.

**Files to touch:** `app/api/cost-events/route.ts` (Zod schema + INSERT), migration SQL (rebuild `v_llm_cost_secure`), `base-cold-email/Research Report.json` (add `campaign_group_id` to cost event object)

**TASK 4.3.6 — Verify and implement daily_stats population mechanism**

1. Check the database for `daily_stats` — is it a table, a materialized view, or a view?
2. If it's a materialized view (`mv_daily_stats`), verify the refresh schedule (is there a cron job or scheduled function?)
3. If no refresh mechanism exists, implement one:
   - Option A: Supabase pg_cron extension: `SELECT cron.schedule('refresh-daily-stats', '*/15 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_stats')`
   - Option B: Next.js API route called by external cron: `POST /api/admin/refresh-views` (this already exists — verify it's scheduled)
   - Option C: Trigger on `email_events` that incrementally updates a regular `daily_stats` table on each insert
4. If `daily_stats` is a regular table with no population mechanism, create a backfill script and a scheduled aggregation job

**Files to touch:** Depends on findings — likely migration SQL + cron config

**TASK 4.3.7 — Guard against missing contacts/emails tables**

1. Check if `contacts` and `emails` tables exist in the current schema
2. If they exist: remove the `(supabaseAdmin as any)` type assertions and use properly typed queries
3. If they do not exist: either create them via migration, or: remove the upsert logic entirely and only insert into `email_events` (the core table). The contact and email tracking can be derived from events.
4. If the tables are optional: wrap the upsert calls in a try-catch that checks for "relation does not exist" errors and silently skips (already partially done, but the type assertions are a code smell)

**Files to touch:** `app/api/events/route.ts`, possibly migration SQL

<!-- DOMAIN_4_END -->

---

<!-- DOMAIN_5_START -->
## Domain 5 — RLS & Multi-Tenant Security Posture

### 5.1 Current State (Verified)

This domain was investigated by examining the live codebase and the schema SQL files, combined with what was revealed by Supabase MCP queries in the previous session. The findings below represent the actual state of the system.

**Tables in the public schema with tenant data:**

| Table | Has workspace_id | RLS Enabled | RLS Policies |
|---|---|---|---|
| email_events | Yes | Needs verification | Needs verification |
| llm_usage | Yes | Needs verification | Needs verification |
| daily_stats | Yes (if table) | Needs verification | Needs verification |
| workspaces | Yes (id = workspace_id) | Needs verification | Needs verification |
| user_workspaces | Yes | Needs verification | Needs verification |
| campaigns | Yes | Needs verification | Needs verification |
| notifications | Yes | Needs verification | Needs verification |
| contacts | Yes (if exists) | Needs verification | Needs verification |
| emails | Yes (if exists) | Needs verification | Needs verification |
| workspace_keys | Yes | Needs verification | Needs verification |

**Tables in the genesis schema:**

| Table | Has workspace_id | RLS Enabled | Expected |
|---|---|---|---|
| genesis.leads (parent) | Yes (partition key) | Should have RLS | Needs verification |
| genesis.partition_registry | Yes | Should have RLS | Needs verification |
| genesis.ignition_state | Yes (if exists) | Should have RLS | Table may not exist yet |
| genesis.sandbox_test_runs | Yes | Should have RLS | Needs verification |
| genesis.workflow_execution_events | Yes (via execution_id) | Should have RLS | Needs verification |
| genesis.email_provider_config | Yes | Should have RLS | Needs verification |
| genesis.credential_store | Yes | MUST have RLS | Needs verification |
| genesis.watchdog_runs | Yes | Should have RLS | Needs verification |
| genesis.watchdog_drifts | Yes | Should have RLS | Needs verification |

**Materialized views (CRITICAL — Cannot have RLS):**

From analysis of the codebase, the following materialized views likely exist:

1. `mv_daily_stats` — aggregated daily email event statistics. If this exists as a materialized view, it is NOT protected by RLS. Any query against it returns all workspaces' data unless the application layer filters by workspace_id.
2. `mv_llm_cost` — aggregated LLM cost breakdown. Same issue.

**Materialized views fundamentally cannot have RLS policies in PostgreSQL.** This is a Postgres limitation, not a configuration gap. Any materialized view that contains tenant data and is accessible via the Supabase PostgREST API is an unrestricted data source.

**How the application compensates:**

All dashboard queries go through the aggregate API (`/api/dashboard/aggregate`), which:
1. Validates workspace access via `validateWorkspaceAccess()` (Clerk auth + user_workspaces check)
2. Filters all queries by `workspace_id`
3. Uses the `supabaseAdmin` client (service role), which bypasses RLS anyway

This means the application layer IS filtering correctly, but the database layer provides no defense-in-depth. If a developer accidentally exposes a new endpoint that queries these tables/views without the workspace filter, tenant data leaks.

**Clerk integration with RLS:**

Supabase RLS policies typically use `auth.jwt() ->> 'sub'` to identify the requesting user, or `auth.uid()` for Supabase Auth. Since this app uses Clerk (not Supabase Auth), the standard Supabase auth functions do NOT work. Any RLS policy that uses `auth.uid()` or `auth.jwt()` will fail because Clerk does not populate Supabase's session context.

The application works around this by using the `supabaseAdmin` (service role) client for ALL database queries. The service role bypasses RLS entirely. This means:
- RLS policies, even if enabled, are NEVER enforced against the application's queries
- The application relies entirely on its own access checks (`validateWorkspaceAccess()`, `canAccessWorkspace()`)
- There is no row-level security fallback if the application code has a bug

**api-workspace-guard.ts analysis:**

This is the application's primary access control mechanism:
- `canAccessWorkspace(userId, workspaceId)`: Checks `user_workspaces` table for membership. Has a 5-minute in-memory cache. Super admins (from `SUPER_ADMIN_IDS` env var) bypass all checks.
- `validateWorkspaceAccess(request, searchParams)`: Extracts workspace ID from query params or `x-workspace-id` header, validates Clerk auth, then calls `canAccessWorkspace()`.
- Used by: campaigns API, aggregate API, and some admin routes.
- NOT used by: events API (uses webhook token instead), cost-events GET endpoint (no auth at all), some other endpoints.

### 5.2 Identified Gaps and Risks

**CRITICAL GAP 5.2.1 — No defense-in-depth. Service role bypasses all RLS.** Because ALL application queries use `supabaseAdmin` (service role), RLS is never enforced. The database provides zero protection. Every query's tenant isolation depends entirely on the developer remembering to add `.eq('workspace_id', X)`. A single missed filter = cross-tenant data leak.

**CRITICAL GAP 5.2.2 — Materialized views are unrestricted by design.** If `mv_daily_stats` or `mv_llm_cost` are exposed through the PostgREST API (Supabase auto-generates REST endpoints for all accessible relations), any authenticated Supabase client call to these views returns all tenants' data. Even with RLS on the underlying tables, the materialized view itself has no RLS.

**GAP 5.2.3 — Clerk/Supabase auth integration gap.** Because Clerk is the auth provider, Supabase's built-in `auth.uid()` and `auth.jwt()` functions return null. This makes standard Supabase RLS policy patterns (e.g., `workspace_id IN (SELECT workspace_id FROM user_workspaces WHERE user_id = auth.uid())`) non-functional. To make RLS work with Clerk, you'd need to either:
- Set a custom Supabase JWT claim from Clerk, or
- Pass `workspace_id` as a session variable (`set_config('app.workspace_id', ...)`) before each query, and reference it in RLS policies via `current_setting('app.workspace_id')`

Neither approach is currently implemented.

**GAP 5.2.4 — In-memory access cache not invalidated on role changes.** The `canAccessWorkspace()` function caches results for 5 minutes. If a user is removed from a workspace, they retain access for up to 5 minutes. If a workspace is frozen, the freeze is not reflected in the access cache.

**GAP 5.2.5 — `validateWorkspaceAccess()` is not applied consistently.** Not all API routes call this function. The event ingestion routes use webhook tokens instead. The cost-events GET endpoint has no access control. Any new route added without `validateWorkspaceAccess()` is an open door.

**GAP 5.2.6 — Super admin bypass is ENV-based with no audit trail.** `SUPER_ADMIN_IDS` is a comma-separated list in an environment variable. There is no audit log of super admin actions (except for the freeze-workspace route which explicitly logs to `governance_audit_log`). Super admin access to all workspaces via the workspace guard is silent.

### 5.3 Implementation Plan

**TASK 5.3.1 — Implement Supabase session-context RLS for Clerk (Defense-in-Depth)**

This is the most impactful security improvement. The goal is to make RLS work as a safety net, not as the primary guard.

**Approach: Custom Supabase client with session variables**

1. Create a new function `createTenantSupabaseClient(workspaceId: string)` in `lib/supabase.ts`
2. This function creates a Supabase client (NOT service role) that sets a session variable before each query:
   - Uses the `postgres` role (or a custom `tenant_role`)
   - Calls `SET LOCAL app.current_workspace_id = '{workspaceId}'` at the start of each request
3. Create RLS policies on all tenant tables:
   - `CREATE POLICY tenant_isolation ON email_events FOR ALL USING (workspace_id = current_setting('app.current_workspace_id', true))`
   - Apply the same pattern to: `llm_usage`, `campaigns`, `notifications`, `contacts`, `emails`, `workspace_keys`
4. For genesis schema tables:
   - `CREATE POLICY tenant_isolation ON genesis.leads FOR ALL USING (workspace_id = current_setting('app.current_workspace_id', true))`
   - Apply to all genesis tables with workspace_id
5. Gradually migrate API routes from `supabaseAdmin` to `createTenantSupabaseClient(workspaceId)` where workspace context is known

**Migration strategy:** Do NOT switch all routes at once. Start with the aggregate route, verify it returns correct data with RLS, then expand to other routes. Keep `supabaseAdmin` available for admin operations and cross-tenant queries.

**Files to touch:** `lib/supabase.ts`, new migration SQL for RLS policies, gradual updates to API routes

**TASK 5.3.2 — Protect materialized views from direct PostgREST access**

Option A (recommended): Revoke SELECT on materialized views from the `anon` and `authenticated` roles:
- `REVOKE SELECT ON mv_daily_stats FROM anon, authenticated`
- `REVOKE SELECT ON mv_llm_cost FROM anon, authenticated`
- Only the `service_role` can access them, and all application queries go through validated API routes

Option B: Replace materialized views with RLS-compatible regular views:
- `CREATE OR REPLACE VIEW daily_stats_secure AS SELECT * FROM mv_daily_stats WHERE workspace_id = current_setting('app.current_workspace_id', true)`
- Use the secure view in the application, keep the materialized view for performance

Option A is simpler and immediately effective. Option B provides defense-in-depth.

**Files to touch:** Migration SQL

**TASK 5.3.3 — Invalidate workspace access cache on membership changes**

1. When a user is added/removed from a workspace (via the invites/members API), call `clearWorkspaceCache(userId, workspaceId)` or `clearUserCache(userId)` — these functions already exist in `api-workspace-guard.ts`
2. When a workspace is frozen/unfrozen, clear ALL cache entries for that workspace (add `clearAllWorkspaceEntries(workspaceId)`)
3. Reduce cache TTL from 5 minutes to 1 minute for a better balance of performance and security

**Files to touch:** `lib/api-workspace-guard.ts`, invite/member management routes, freeze-workspace route

**TASK 5.3.4 — Create middleware-level workspace access enforcement**

Rather than relying on each route to manually call `validateWorkspaceAccess()`:

1. Create a Next.js route middleware (or a shared wrapper function) that automatically:
   - Extracts `workspace_id` from the request (query params, body, or header)
   - Validates Clerk auth
   - Validates workspace membership
   - Injects `workspaceId` into request context (or headers) for the route handler
2. Apply this middleware to all `/api/*` routes except:
   - Public routes (health checks)
   - Webhook routes (use token auth instead)
   - Auth routes (sign-in, sign-up)
3. Routes that currently call `validateWorkspaceAccess()` can be simplified

This provides consistent enforcement and makes it impossible to accidentally create an unprotected route.

**Files to touch:** New `lib/workspace-middleware.ts` or `middleware.ts` enhancement, updates to route handlers

**TASK 5.3.5 — Add super admin audit logging**

1. In `canAccessWorkspace()`, when the super admin bypass is used, log the access:
   - Insert into `governance_audit_log`: `{ actor_id: userId, action: 'super_admin_access', workspace_id, metadata: { endpoint: request.url } }`
2. Make the logging async and non-blocking (don't slow down the request)
3. Add a UI component in the admin panel to view super admin access history

**Files to touch:** `lib/api-workspace-guard.ts`, audit log query route

<!-- DOMAIN_5_END -->

---

<!-- DOMAIN_6_START -->
## Domain 6 — Onboarding Wizard

### 6.1 Current State (Verified)

The onboarding system consists of three layers: a frontend wizard component, backend API routes, and supporting services.

**Frontend:** `app/onboarding/page.tsx` hosts the onboarding wizard. The component `components/onboarding/onboarding-tour.tsx` provides the multi-step flow. The exact steps were not fully enumerated from the frontend code, but the backend APIs reveal the following stages:

**Backend API routes:**

1. **Brand setup** (`/api/onboarding/brand`) — Accepts company name, website, logo, description
2. **Brand auto-scrape** (`/api/onboarding/brand/auto-scrape`) — Takes a website URL and returns metadata (company name, logo URL, description) via `BrandMetadataScraper`. This is a real implementation (not a stub) — it fetches metadata from the provided URL using the `BrandMetadataScraper` class in `lib/genesis/phase65/brand-metadata-scraper.ts`. It returns `{ success: false, fallbackToManual: true }` on failure, prompting the user to fill in details manually.
3. **Credentials storage** (`/api/onboarding/credentials`) — Stores encrypted credentials via `CredentialVaultService`. Handles multiple credential types plus a special `relevance_config` type. Uses AES-256-GCM encryption with workspace-scoped keys derived via PBKDF2 from a master key (`ENCRYPTION_MASTER_KEY` env var).
4. **Credential validation** (`/api/onboarding/validate-credential`) — Validates credentials before storage.
5. **Calendly validation** (`/api/onboarding/validate-calendly`) — Validates Calendly link availability.
6. **Infrastructure config** (`/api/onboarding/infrastructure`) — Saves droplet region and size selection. Uses `DropletConfigurationService` with sensible defaults (`DEFAULT_REGION`, `DEFAULT_SIZE`). Handles missing tables gracefully (returns defaults on DB error).
7. **DNS generation/verification** (`/api/onboarding/dns/generate`, `/api/onboarding/dns/verify`) — Generates DNS records for the workspace domain, verifies them.
8. **Entri DNS automation** (`/api/onboarding/dns/entri/session`, `/api/onboarding/dns/entri/verify`) — Automated DNS setup via Entri integration.
9. **Tracking setup/verification** (`/api/onboarding/tracking/setup`, `/api/onboarding/tracking/verify`) — Sets up email tracking.
10. **Apify configuration** (`/api/onboarding/apify`) — Configures Apify integration for lead scraping.
11. **Relevance AI tool download** (`/api/onboarding/relevance-tool-download`) — Downloads Relevance AI tool configuration.
12. **Progress tracking** (`/api/onboarding/progress`) — GET/POST to read/update onboarding progress. Uses `OnboardingProgressService` which persists progress to a database table. Handles missing tables by returning defaults.

**Credential encryption (verified):**

The `CredentialVaultService` (`lib/genesis/phase64/credential-vault-service.ts`) uses REAL AES-256-GCM encryption:
- Derives a workspace-specific key via PBKDF2 (100,000 iterations, SHA-256) from the master key + workspace_id
- Generates random 32-byte salt + 16-byte IV per encryption
- Stores the result as base64-encoded `salt + iv + authTag + ciphertext`
- Requires `ENCRYPTION_MASTER_KEY` env var (hex-encoded 32-byte key)

This is properly implemented and is NOT a stub. Credentials are encrypted before storage.

**Services lazy initialization:** All onboarding API routes use lazy initialization for their services (e.g., `function getServices() { if (!encryption) encryption = new EncryptionService(masterKey); ... }`). This pattern avoids module-level errors when env vars are missing but means errors are deferred to first request time.

**Progress persistence:** The `OnboardingProgressService` stores progress in a database table. If the table doesn't exist, it returns default progress (first stage, no completed stages). This means progress CAN persist between browser sessions — but only if the genesis schema tables are present.

### 6.2 Identified Gaps and Risks

**GAP 6.2.1 — No code path from onboarding completion to ignition orchestrator.** After all onboarding stages are completed, there is no "Launch" or "Deploy" button that calls the ignition orchestrator. The progress service tracks which stages are complete, but reaching the final stage does NOT trigger `IgnitionOrchestrator.ignite()`. The connection between onboarding completion and workspace provisioning is not wired.

**Impact:** A user who completes all onboarding steps (brand setup, credentials, DNS, infrastructure config) will see a "completed" state but nothing will actually be provisioned. No partition, no droplet, no workflows. This is the most critical gap in the end-to-end flow.

**GAP 6.2.2 — Onboarding does not collect all required ignition config.** The ignition orchestrator requires `IgnitionConfig` with:
- `workspace_id`, `workspace_slug`, `workspace_name` — available from workspace context
- `region`, `droplet_size` — collected via infrastructure step
- `credentials` (array of `CredentialConfig`) — stored via credentials step BUT: the onboarding stores credentials via `CredentialVaultService`, not in the format expected by `IgnitionConfig.credentials`. The vault stores encrypted credentials in a database, while the orchestrator expects `CredentialConfig` objects with plaintext `data` fields.
- `variables` (must include `YOUR_SENDER_EMAIL`) — collected during brand/credentials step but not assembled into the required format

The onboarding steps collect the RIGHT information, but there is no aggregation layer that assembles all collected data into an `IgnitionConfig` object.

**GAP 6.2.3 — Infrastructure step success is returned even on database errors.** In the infrastructure POST handler, if the database write fails, the code returns `{ success: true }` anyway (with a `console.warn`). This means the onboarding wizard shows a green checkmark even if the configuration was not actually saved. When ignition is eventually triggered, it may use default region/size instead of the user's selection.

**GAP 6.2.4 — Progress service fails silently on database errors.** Same pattern as infrastructure — if the progress table doesn't exist, the POST handler returns success with calculated next stage. This allows the wizard to progress through stages without any data being persisted. If the user refreshes the browser, all progress is lost.

**GAP 6.2.5 — Credentials endpoint has a TODO for workspace access validation.** Line in the POST handler: `// TODO: Validate user has access to workspace`. The endpoint checks Clerk auth (`userId`) but does NOT verify that the authenticated user has access to the workspace they're storing credentials for. A user could store credentials for any workspace by providing a different `workspaceId` in the request body.

**GAP 6.2.6 — `ENCRYPTION_MASTER_KEY` is a single point of failure.** If this env var is not set, all credential operations fail. If it's rotated, all previously encrypted credentials become undecryptable. There is no key rotation mechanism or fallback key support.

**GAP 6.2.7 — Brand auto-scrape has no auth check.** The `/api/onboarding/brand/auto-scrape` endpoint accepts any POST request with a `{ website }` body. There is no Clerk auth check. While the impact is low (it only reads public website metadata), it could be abused for SSRF if the scraper follows URLs to internal services.

### 6.3 Implementation Plan

**TASK 6.3.1 — Wire onboarding completion to ignition (Critical End-to-End Fix)**

This is the most important task for making the platform functional end-to-end.

1. Create a new API route: `POST /api/onboarding/launch`
2. This route:
   - Validates Clerk auth and workspace access
   - Verifies all onboarding stages are complete (query progress service)
   - Assembles `IgnitionConfig` by collecting data from all prior stages:

     a. Workspace identity → from `workspaces` table
     b. Region and size → from infrastructure config (DropletConfigurationService)
     c. Credentials → from `genesis.credential_store` via CredentialVaultService, decrypt and convert to `CredentialConfig[]` format
     d. Variables → assemble from brand data (company name, sender email, website) and other saved configuration
     e. Campaign info → create a default campaign group if none exists

   - Calls `IgnitionOrchestrator.ignite(config)` (or dispatches to a background queue)
   - Returns the ignition state for the frontend to poll

3. Create a frontend component for the "Launch" step that:
   - Shows a progress indicator for each ignition step
   - Polls `GET /api/onboarding/ignition-status?workspace_id=X` for real-time state
   - Shows success state with link to dashboard when `status === 'active'`
   - Shows error state with retry button when `status === 'failed'`

4. Create the status polling endpoint: `GET /api/onboarding/ignition-status`
   - Reads from `genesis.ignition_state` table (created in Task 1.3.1)
   - Returns the current ignition state

**Dependency:** Requires Task 1.3.1 (SupabaseIgnitionStateDB), Task 1.3.2 (SupabasePartitionManager), and Task 1.3.3 (HttpSidecarClient) to be implemented first for production functionality. Can initially use mock implementations for testing the integration.

**Files to touch:** New `app/api/onboarding/launch/route.ts`, new `app/api/onboarding/ignition-status/route.ts`, new `lib/genesis/ignition-config-assembler.ts`, update onboarding frontend component

**TASK 6.3.2 — Create IgnitionConfig assembler service**

Encapsulate the config assembly logic in a reusable service:

1. Create `lib/genesis/ignition-config-assembler.ts` with a class `IgnitionConfigAssembler`
2. Methods:
   - `assemble(workspaceId: string, requestedBy: string): Promise<IgnitionConfig>` — collects all data from various sources and returns a complete config
   - `validate(config: IgnitionConfig): ValidationResult` — checks that all required fields are present and valid
3. The assembler reads from:
   - `workspaces` table (name, slug)
   - `genesis.droplet_config` or infrastructure config service (region, size)
   - `genesis.credential_store` via vault service (credentials, decrypted)
   - `genesis.onboarding_progress` or brand data table (company name, sender email, website)
4. Returns detailed errors if any required data is missing: "Missing sender email — complete the Brand Setup step"

**Files to touch:** New `lib/genesis/ignition-config-assembler.ts`

**TASK 6.3.3 — Fix infrastructure step to actually fail on DB errors**

1. In `POST /api/onboarding/infrastructure`, change the catch block to return an error response instead of `{ success: true }`:
   - Return `{ success: false, error: 'Configuration could not be saved. Please try again.' }` with status 500
2. Same fix in `POST /api/onboarding/progress` — if the database write fails, return success: false
3. The frontend wizard should show a retry option when success is false, rather than advancing to the next step

**Files to touch:** `app/api/onboarding/infrastructure/route.ts`, `app/api/onboarding/progress/route.ts`

**TASK 6.3.4 — Add workspace access validation to credentials endpoint**

1. In `POST /api/onboarding/credentials`, after the Clerk auth check, add:
   - Extract `workspaceId` from the request body
   - Call `canAccessWorkspace(userId, workspaceId)`
   - If no access, return 403
2. Same check in `GET /api/onboarding/credentials`

**Files to touch:** `app/api/onboarding/credentials/route.ts`

**TASK 6.3.5 — Add auth check to brand auto-scrape**

1. Add Clerk auth check: `const { userId } = await auth(); if (!userId) return 401`
2. Add basic SSRF protection: validate the `website` URL scheme is `http://` or `https://` only, reject `file://`, `ftp://`, internal IPs (`10.x`, `192.168.x`, `127.x`, `169.254.x`)

**Files to touch:** `app/api/onboarding/brand/auto-scrape/route.ts`

**TASK 6.3.6 — Implement encryption key rotation support**

1. Add `ENCRYPTION_MASTER_KEY_PREVIOUS` env var support
2. When decryption with the current key fails, try the previous key
3. Add a migration utility that re-encrypts all credentials from old key to new key:
   - Reads all rows from `genesis.credential_store`
   - Decrypts with old key
   - Re-encrypts with new key
   - Updates the row
4. Document the key rotation procedure: set new key as current, move old key to previous, run migration, remove previous key

**Files to touch:** `lib/genesis/phase64/credential-vault-service.ts`, new migration utility

<!-- DOMAIN_6_END -->

---

<!-- DOMAIN_7_START -->
## Domain 7 — Sandbox Engine

### 7.1 Current State (Verified)

The Sandbox is a test execution environment that allows users to trigger a test campaign workflow and monitor its execution in real time. It consists of frontend components, backend API routes, and supporting services.

**Frontend components:**

- `components/sandbox/sandbox-panel.tsx` — Main sandbox wrapper
- `components/sandbox/test-runner.tsx` — Test execution trigger UI
- `components/sandbox/execution-monitor.tsx` — Real-time execution monitoring (SSE stream consumer)
- `components/sandbox/configuration-section.tsx` — Configuration inputs (test email, lead data)
- `components/sandbox/config-status-bar.tsx` — Shows configuration readiness

**Backend API routes:**

1. **POST /api/sandbox/test-campaign** (`app/api/sandbox/test-campaign/route.ts`, 222 lines):
   - Requires `supabaseAdmin` — returns 503 if not available
   - Checks genesis schema availability via `isGenesisSchemaAvailable()` — returns 503 with specific error message if the genesis schema is not exposed in PostgREST
   - Requires Clerk auth
   - Extracts `workspaceId`, `campaignId`, `testEmail`, `testLeadData` from request body
   - Validates workspace membership via `user_workspaces` table
   - Implements rate limiting via `SandboxRateLimiter` — queries `genesis.sandbox_test_runs` for recent runs in a time window
   - Creates a test run record in `genesis.sandbox_test_runs`
   - Looks up the Sidecar URL from `genesis.partition_registry` via `getSidecarUrl(workspaceId)`
   - Triggers the test workflow via `WorkflowTriggerService.triggerTest()`
   - Returns `{ executionId, streamUrl, testRunId }`

2. **GET /api/sandbox/execution-stream/[executionId]** (`app/api/sandbox/execution-stream/[executionId]/route.ts`, 138 lines):
   - Requires Clerk auth
   - Validates the execution exists in `genesis.workflow_execution_events`
   - Validates workspace membership (checks the workspace_id from the execution's first event)
   - Implements SSE (Server-Sent Events) streaming:
     - Polls `genesis.workflow_execution_events` every 500ms for new events
     - Streams events to the client as `data: { type: 'node_event', data: event }` messages
     - Checks for completion event (event_type 'complete' or 'error')
     - Auto-closes after 5 minutes (MAX_POLLS = 600 at 500ms intervals)
     - Sends timeout event if exceeded

3. **GET /api/sandbox/execution/[executionId]** — Get execution details
4. **GET /api/sandbox/history** — Get test execution history

**Sidecar integration:**

The sandbox does NOT directly call the Sidecar. Instead, `WorkflowTriggerService` (from `lib/genesis/phase45/workflow-trigger.ts`) handles the Sidecar communication:
1. Looks up the Sidecar URL from the database (`partition_registry`)
2. Sends a trigger request to the Sidecar to start the test workflow
3. Returns an execution ID that the SSE stream can poll for events

**Rate limiting:**

The `SandboxRateLimiter` (from `lib/genesis/phase45/sandbox-rate-limiter.ts`) counts recent test runs for the workspace within a configurable time window. If the count exceeds the limit, it returns `{ allowed: false, remaining: 0, retryAfterSeconds: N }`. The test-campaign route enforces this and returns 429 when rate-limited.

**Genesis schema dependency:**

All sandbox database operations target the `genesis` schema:
- `genesis.sandbox_test_runs` — test execution records
- `genesis.workflow_execution_events` — SSE event stream source
- `genesis.partition_registry` — Sidecar URL lookup

The schema check `isGenesisSchemaAvailable()` verifies the genesis schema is exposed via PostgREST before any sandbox operation.

### 7.2 Identified Gaps and Risks

**GAP 7.2.1 — Sandbox depends on genesis schema tables that may not exist.** The sandbox writes to `genesis.sandbox_test_runs` and reads from `genesis.workflow_execution_events`. If these tables don't exist in the live database, every sandbox operation fails. The `isGenesisSchemaAvailable()` check verifies the schema exists but not the specific tables. If the schema exists but the tables don't, the requests will fail with Postgres "relation does not exist" errors rather than the helpful 503 message.

**GAP 7.2.2 — Sandbox does not verify that production email_events is not polluted.** There is no visible safeguard in the test-campaign flow that prevents the test workflow from writing events to the production `email_events` table. If the n8n test workflow calls the `/api/events` webhook with a real workspace_id, those events will appear in the production dashboard — inflating metrics with test data.

The intended safeguard would be:
- Use a dedicated `is_test: true` flag on events from sandbox runs
- Filter `is_test = false` in all production queries
- Or: route sandbox events to a separate table (e.g., `genesis.sandbox_events`)

Neither mechanism was found in the event ingestion code. The events API accepts all events regardless of source.

**GAP 7.2.3 — SSE stream polls every 500ms for up to 5 minutes.** This means a single sandbox execution creates up to 600 database queries (polling `genesis.workflow_execution_events`). With multiple concurrent sandbox sessions, this creates significant database load. The polling approach works but is inefficient compared to Postgres LISTEN/NOTIFY or Supabase Realtime subscriptions.

**GAP 7.2.4 — Mock EventDB in test-campaign route.** The `createEventDB()` function in the test-campaign route creates a partial mock of `ExecutionEventDB`. Several methods are stubs that return `{ data: null, error: null }` or `false`. This means:
- Event insertion (`insertEvent`) is a no-op — execution events are not actually stored
- `isExecutionComplete()` always returns `false` — the SSE stream relies on direct DB polling
- Only `createTestRun()` and `updateTestRun()` actually hit the database

This indicates the event service integration is incomplete — the route creates test runs but doesn't populate execution events. The SSE stream expects events to appear in `genesis.workflow_execution_events`, but the test-campaign route doesn't write them. They must come from the Sidecar/n8n side.

**GAP 7.2.5 — WorkflowTriggerService depends on Sidecar URL being in partition_registry.** If a workspace has not been provisioned via ignition (which populates `partition_registry`), the sandbox will fail with a `NO_SIDECAR` error. There is no fallback for workspaces in LOCAL_MODE or for workspaces that haven't completed ignition.

### 7.3 Implementation Plan

**TASK 7.3.1 — Ensure genesis schema tables exist for sandbox**

Create a migration that creates the required sandbox tables if they don't exist:

1. `genesis.sandbox_test_runs`:
   - `id` (uuid PK), `workspace_id`, `campaign_id`, `test_email`, `execution_id`, `status` (pending/running/completed/failed), `started_at`, `completed_at`, `result` (jsonb), `created_at`
   - RLS policy: workspace members can SELECT their own; service role can INSERT/UPDATE

2. `genesis.workflow_execution_events`:
   - `id` (uuid PK), `execution_id`, `workspace_id`, `event_type` (node_start, node_complete, node_error, complete, error), `node_name`, `node_type`, `data` (jsonb), `created_at`
   - Index: `CREATE INDEX idx_wee_exec_created ON genesis.workflow_execution_events (execution_id, created_at)`
   - RLS policy: workspace members can SELECT their own

3. Verify `genesis.partition_registry` has `sidecar_url` column

**Files to touch:** New migration SQL

**TASK 7.3.2 — Implement test event isolation**

Prevent sandbox test events from polluting production metrics:

**Option A (recommended): Flag-based isolation**
1. Add `is_test BOOLEAN DEFAULT false` column to `email_events`
2. Add `is_test BOOLEAN DEFAULT false` column to `llm_usage`
3. Update ALL dashboard queries (aggregate route) to add `.eq('is_test', false)` filter
4. Have the sandbox test workflow include `is_test: true` in its event payloads
5. Update event ingestion API to accept and store the `is_test` flag
6. Add the flag to the Zod schema

**Option B: Separate sandbox events table**
1. Create `genesis.sandbox_events` mirroring `email_events` schema
2. Route sandbox events to this table (special endpoint or flag in existing endpoint)
3. More complex but guarantees zero production contamination

Recommend Option A for simplicity. The `is_test` filter is a single additional clause in existing queries.

**Files to touch:** Migration SQL, `app/api/events/route.ts`, `app/api/cost-events/route.ts`, `app/api/dashboard/aggregate/route.ts`

**TASK 7.3.3 — Replace SSE polling with Supabase Realtime (optimization)**

Low priority but high impact for database load:

1. Replace the 500ms polling loop in the execution-stream route with Supabase Realtime subscription:
   - Use `supabase.channel('execution-{id}').on('postgres_changes', ...)` to listen for INSERTs on `genesis.workflow_execution_events` filtered by `execution_id`
   - Forward realtime events to the SSE stream
2. This reduces database queries from 600 per session to 1 (the subscription), plus one query per actual event

**Alternative:** If Supabase Realtime is not available or not performant enough, keep polling but increase the interval to 2 seconds (150 queries max instead of 600) and add an early exit once the execution completes.

**Files to touch:** `app/api/sandbox/execution-stream/[executionId]/route.ts`

**TASK 7.3.4 — Complete the EventDB implementation in test-campaign route**

Replace the mock `createEventDB()` with a real implementation:

1. Import the actual `ExecutionEventService` and wire it to the genesis schema tables
2. `insertEvent()` should INSERT into `genesis.workflow_execution_events`
3. `isExecutionComplete()` should query for a completion event
4. `getEventsByExecution()` should return all events for an execution
5. `getAllEvents()` should return paginated events

Note: Verify whether the Sidecar is supposed to populate `workflow_execution_events` directly (via Supabase REST API) or if the dashboard should receive events from the Sidecar and insert them. If the Sidecar writes directly, the mock methods are intentionally no-ops on the dashboard side.

**Files to touch:** `app/api/sandbox/test-campaign/route.ts`

**TASK 7.3.5 — Add LOCAL_MODE fallback for sandbox**

When a workspace is in LOCAL_MODE (no partition_registry entry):

1. In `createWorkspaceLookupDB().getSidecarUrl()`, if no entry found in `partition_registry`, check for `LOCAL_N8N_IP` or `LOCAL_SIDECAR_URL` env var
2. Return the local URL as a fallback
3. This allows developers to test sandbox functionality without a full ignition cycle

**Files to touch:** `app/api/sandbox/test-campaign/route.ts`

<!-- DOMAIN_7_END -->

---

<!-- DOMAIN_8_START -->
## Domain 8 — Watchdog, UUID Mapper, Admin & Compliance

### 8.1 Current State (Verified)

This domain covers four subsystems: the State Reconciliation Watchdog, the control-plane watchdog, the admin kill switch, and audit/compliance infrastructure.

**State Reconciliation Watchdog** (`lib/genesis/phase43/watchdog-service.ts`, 511 lines):

The `StateReconciliationWatchdog` class implements drift detection between Dashboard DB state and n8n/Sidecar state. It provides:

1. **Drift detection** — Four detection methods:
   - `detectOrphanWorkflows()` — finds workflows in n8n that don't have corresponding DB records
   - `detectOrphanDbRecords()` — finds DB campaign records with no matching n8n workflow
   - `detectStateMismatches()` — finds campaigns where DB status disagrees with n8n active/inactive state
   - `detectCredentialIssues()` — finds invalid or expired credentials

2. **Batch processing** — `detectDriftsForAll()` processes multiple workspaces in batches of 10.

3. **Drift storage** — Each detected drift is stored via `db.storeDrift()`.

4. **Healing** — The code references healing strategies (`HEALING_STRATEGIES`, `AUTO_HEALABLE`, `MAX_HEALING_ATTEMPTS`, `HEALING_BACKOFF_MS`) from the types file, indicating auto-healing is designed but the full healing implementation was not verified in this analysis.

5. **Dependencies** — Relies on `WatchdogDB` and `N8nClient` interfaces. These are integration interfaces — the DB implementation must query both Supabase and the n8n API.

**Control-Plane Watchdog** (`control-plane/src/services/watchdog.ts`, 274 lines):

A separate watchdog service running in the Express control-plane (not in Next.js):

1. **Polling** — Calls `fetchAllDroplets()` at a configurable interval (default 60 seconds) to get health data from all provisioned droplets.
2. **Health evaluation** — `evaluateDropletHealth()` checks:
   - Heartbeat timeout (configurable threshold) → marks droplet as zombie + schedules reboot
   - CPU utilization threshold → alerts
   - Memory utilization threshold → alerts
   - Disk utilization threshold → alerts
3. **Remediation** — Dispatches actions via BullMQ queue (`QUEUE_NAMES.HARD_REBOOT`). Uses IORedis for queue connection.
4. **Health reporting** — Exposes `isHealthy()` and `getHealth()` for the control-plane's health endpoint.

This control-plane watchdog monitors infrastructure health (droplets, heartbeats). The Phase 43 watchdog monitors logical state (workflow/campaign consistency). They are complementary systems.

**Admin Kill Switch** (`app/api/admin/freeze-workspace/route.ts`, 256 lines):

POST endpoint for freezing a workspace:
1. Requires Clerk auth + super admin check against `SUPER_ADMIN_IDS`
2. Verifies workspace exists and is not already frozen
3. Updates `workspaces` table: sets `status = 'frozen'`, records `frozen_at`, `frozen_by`, `freeze_reason`
4. Revokes all workspace API keys: updates `workspace_keys` where `revoked_at IS NULL`
5. Logs to `governance_audit_log`: workspace_id, actor info, action, reason, metadata
6. Includes DELETE endpoint for unfreezing: reverses the status, logs the unfreeze

**What the kill switch does NOT do (verified):**
- Does NOT send a command to the Sidecar to deactivate workflows on the n8n instance
- Does NOT block the event ingestion API for the frozen workspace (events can still be submitted)
- Does NOT block the cost-events API for the frozen workspace (LLM costs can still accumulate)
- Does NOT block the dashboard aggregate API (the workspace_id filter still works, but `validateWorkspaceAccess()` does not check `status === 'frozen'`)

The freeze sets a flag in the database but the application does NOT check this flag in most code paths. Only if a route explicitly checks `workspace.status === 'frozen'` would the freeze have runtime effect.

**Governance Audit Log:**

The `governance_audit_log` table is used by the freeze-workspace route. Columns: `workspace_id`, `workspace_name`, `actor_id`, `actor_email`, `action`, `reason`, `metadata`, `created_at`. This is the only route observed to write to this table.

**Login Audit:**

No `login_audit` table population was found. The Clerk webhook integration (which would capture sign-in events and write to a `login_audit` table) was not found in the codebase. Clerk webhooks may be configured externally (via Clerk Dashboard) to POST to an API route, but no such route was discovered.

### 8.2 Identified Gaps and Risks

**CRITICAL GAP 8.2.1 — Kill switch does not actually stop the workspace.** Freezing a workspace sets `workspaces.status = 'frozen'` and revokes API keys, but:
- The event ingestion API (`/api/events`) does not check workspace status — events continue flowing
- The cost-events API (`/api/cost-events`) does not check workspace status — LLM costs continue accumulating
- The n8n workflows on the tenant's droplet continue running — emails continue being sent
- The dashboard access guard (`validateWorkspaceAccess()`) does not check workspace status — users can still access the dashboard

This means the "kill switch" is cosmetic in its current state. A workspace that needs to be stopped (e.g., spam detected, payment issue, abuse) will continue operating despite being "frozen."

**GAP 8.2.2 — Phase 43 watchdog has no scheduler.** The `StateReconciliationWatchdog` has methods (`detectDrifts`, `healDrifts`, `runWatchdogCycle`) but no scheduler that periodically calls them. The `control-plane/services/watchdog.ts` has a polling interval for droplet health, but the Phase 43 watchdog (logical drift detection) has no equivalent cron or interval trigger from the application. It would need to be triggered manually or via an admin API route.

**GAP 8.2.3 — Watchdog does not write to `genesis.watchdog_runs`.** The Phase 43 watchdog stores drift details via `db.storeDrift()`, but whether the run itself (start time, end time, workspace count, drift count) is stored depends on the `WatchdogDB` implementation. If only the mock exists, runs are not persisted.

**GAP 8.2.4 — No login_audit population.** Clerk sign-in events are not captured. There is no Clerk webhook handler (e.g., `app/api/webhooks/clerk/route.ts`) that writes to a `login_audit` table. This means there is no audit trail of who logged in and when — a compliance requirement for many customers.

**GAP 8.2.5 — Audit log has no insert-only (append-only) enforcement.** The `governance_audit_log` table should be append-only (no UPDATE, no DELETE for non-admins). Whether RLS policies enforce this was not verified. If the service role is used for all writes (which it is), there's no database-level protection against audit log tampering by the application.

**GAP 8.2.6 — Control-plane watchdog depends on Redis/BullMQ.** The `createWatchdogService()` function creates an IORedis connection and a BullMQ queue. If Redis is not available, the watchdog fails to start. There is no graceful degradation. The `config.redisUrl` must be provided.

**GAP 8.2.7 — Workspace API key revocation is incomplete.** The freeze-workspace route revokes keys in `workspace_keys`, but the event ingestion API uses a webhook token (not an API key from `workspace_keys`). If per-workspace tokens are implemented (Task 4.3.1), the freeze route must also invalidate the workspace's webhook token.

### 8.3 Implementation Plan

**TASK 8.3.1 — Make the kill switch actually kill the workspace (Critical)**

The freeze must have real-time effect across all systems:

**Step 1: Block Dashboard access for frozen workspaces**
1. In `canAccessWorkspace()` (`lib/api-workspace-guard.ts`), after checking membership, also check workspace status:
   - Query `workspaces.status` (or add it to the cached result)
   - If `status === 'frozen'`, return `{ hasAccess: false, reason: 'workspace_frozen' }`
2. Return a specific HTTP response (451 Unavailable For Legal Reasons, or 403 with body `{ error: 'Workspace is frozen', reason }`)
3. The frontend should detect this response and show a "workspace frozen" banner

**Step 2: Block event ingestion for frozen workspaces**
1. In `/api/events`, after extracting `workspace_id`, query workspace status
2. If frozen, return `{ error: 'Workspace is frozen — events rejected' }` with status 403
3. Same check in `/api/cost-events`
4. Cache the frozen status for 60 seconds to avoid per-request DB lookups (use the same pattern as the access cache)

**Step 3: Deactivate n8n workflows on freeze**
1. In the freeze-workspace POST handler, after updating the database:
   - Look up the Sidecar URL from `genesis.partition_registry`
   - Send a `DEACTIVATE_ALL_WORKFLOWS` command to the Sidecar
   - If the Sidecar is unreachable, log a warning but still complete the freeze (the event ingestion block prevents further damage)
2. In the unfreeze-workspace DELETE handler:
   - Send an `ACTIVATE_ALL_WORKFLOWS` command to the Sidecar
   - Or: require manual re-activation (safer — admin must explicitly restart workflows)

**Step 4: Invalidate caches on freeze**
1. After freezing, clear all access cache entries for the workspace: `clearAllWorkspaceEntries(workspaceId)`
2. Add this function to `api-workspace-guard.ts`:
   ```
   function clearAllWorkspaceEntries(workspaceId: string) {
     for (const [key, entry] of accessCache.entries()) {
       if (key.endsWith(`:${workspaceId}`)) accessCache.delete(key);
     }
   }
   ```

**Files to touch:** `lib/api-workspace-guard.ts`, `app/api/events/route.ts`, `app/api/cost-events/route.ts`, `app/api/admin/freeze-workspace/route.ts`

**TASK 8.3.2 — Implement watchdog scheduling**

**Option A: Cron-based via Next.js API route + external scheduler**
1. Create `GET /api/admin/watchdog/run` that triggers a full watchdog cycle
2. Schedule via external cron (Vercel Cron, Railway cron, or OS crontab) every 15 minutes
3. The route calls `StateReconciliationWatchdog.detectDriftsForAll()` for all active workspaces

**Option B: Control-plane polls both infrastructure and logical state**
1. Add the Phase 43 watchdog as a second polling loop in the control-plane's watchdog service
2. Every 15 minutes, fetch all workspace IDs, run drift detection, store results

**Recommendation:** Option A is simpler and keeps the control-plane focused on infrastructure. The Next.js cron route can be protected with super admin auth.

**Files to touch:** New `app/api/admin/watchdog/run/route.ts`, scheduling configuration

**TASK 8.3.3 — Implement login_audit via Clerk webhooks**

1. Create `app/api/webhooks/clerk/route.ts`
2. Handle the `user.signed_in` event (Clerk webhook):
   - Extract user ID, email, timestamp, IP address, device info
   - Insert into `login_audit` table: `{ user_id, email, event_type, ip_address, user_agent, created_at }`
3. Handle `user.created`, `user.deleted` events for completeness
4. Verify Clerk webhook signature using `svix` library (Clerk uses Svix for webhook delivery)
5. Create the `login_audit` table via migration:
   - `id` (uuid PK), `user_id`, `email`, `event_type`, `ip_address`, `user_agent`, `metadata` (jsonb), `created_at`
   - RLS: super admins can SELECT; service role INSERT only

**Files to touch:** New webhook route, migration SQL, Clerk Dashboard webhook configuration

**TASK 8.3.4 — Make audit_log append-only at database level**

1. Create a Postgres trigger on `governance_audit_log` that prevents UPDATE and DELETE:
   ```sql
   CREATE OR REPLACE FUNCTION prevent_audit_modification()
   RETURNS TRIGGER AS $$
   BEGIN
     RAISE EXCEPTION 'Audit log entries cannot be modified or deleted';
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER audit_log_immutable
     BEFORE UPDATE OR DELETE ON governance_audit_log
     FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
   ```
2. This provides database-level enforcement regardless of which role or client issues the query
3. If an admin needs to purge old audit entries (data retention), use a superuser connection that can temporarily disable the trigger

**Files to touch:** Migration SQL

**TASK 8.3.5 — Persist watchdog runs**

1. Create `genesis.watchdog_runs` table:
   - `id` (uuid PK), `run_type` ('drift_detection' | 'healing' | 'infrastructure'), `workspace_ids` (text[]), `started_at`, `completed_at`, `total_drifts_found`, `drifts_healed`, `errors` (jsonb), `status` ('running' | 'completed' | 'failed')
2. Create `genesis.watchdog_drifts` table:
   - `id` (uuid PK), `run_id` (FK), `workspace_id`, `drift_type`, `severity`, `details` (jsonb), `auto_healable`, `healed`, `healed_at`, `healing_attempts`, `created_at`
3. Implement a `SupabaseWatchdogDB` class that implements the `WatchdogDB` interface using these tables
4. Wire it into the watchdog service when running in production mode

**Files to touch:** Migration SQL, new `lib/genesis/phase43/supabase-watchdog-db.ts`, update watchdog configuration

**TASK 8.3.6 — Extend freeze to invalidate webhook token**

After Task 4.3.1 (per-workspace webhook tokens) is implemented:

1. In the freeze-workspace POST handler, after revoking API keys:
   - Set the workspace's `webhook_token` to NULL or to a marker value like `FROZEN`
   - This immediately invalidates the token, causing all event/cost submissions to fail with 401
2. In the unfreeze handler:
   - Generate a new webhook token
   - Note: the old token embedded in n8n workflows will no longer work — the workflows must be updated with the new token after unfreeze

**Files to touch:** `app/api/admin/freeze-workspace/route.ts`

**TASK 8.3.7 — Control-plane graceful degradation without Redis**

1. In `createWatchdogService()`, wrap the IORedis and BullMQ initialization in a try-catch
2. If Redis is unavailable:
   - Log a warning: "Redis not available — watchdog remediation (reboots) disabled"
   - Still run health checks and evaluations
   - Instead of queuing reboot jobs, log critical alerts (email/Slack notification)
   - Return a degraded `WatchdogService` that reports `isHealthy() = false` with reason
3. This allows the control-plane to start and provide health monitoring even without Redis

**Files to touch:** `control-plane/src/services/watchdog.ts`

<!-- DOMAIN_8_END -->

---

## Cross-Domain Execution Sequence

The tasks defined across all 8 domains have interdependencies. This section sequences them into execution phases. An engineer reading this should execute Phase 1 first, then Phase 2, and so on. Within each phase, tasks are independent and can be parallelized.

### Phase 0 — Database Schema Foundation (Do First)

These are pure SQL migrations with no code dependencies. They create the tables and indexes that all subsequent work depends on.

| Task | Description | Dependency |
|---|---|---|
| 1.3.1 | Create `genesis.ignition_state` and `genesis.ignition_operations` tables | None |
| 3.3.3 | Create composite indexes on `email_events`, `daily_stats`, `llm_usage` | None |
| 4.3.4 | Add `idempotency_key` column and unique index to `email_events` | None |
| 7.3.1 | Create `genesis.sandbox_test_runs` and `genesis.workflow_execution_events` tables | None |
| 7.3.2 (partial) | Add `is_test` column to `email_events` and `llm_usage` | None |
| 8.3.3 (partial) | Create `login_audit` table | None |
| 8.3.4 | Create append-only trigger on `governance_audit_log` | None |
| 8.3.5 | Create `genesis.watchdog_runs` and `genesis.watchdog_drifts` tables | None |

**Estimated effort:** 1 migration file, ~150 lines of SQL. Run once. Verify all tables exist via `\dt genesis.*` and `\dt public.*`.

### Phase 1 — Critical Security Fixes (Do Immediately After Phase 0)

These tasks fix vulnerabilities that currently exist in production and could lead to data breaches or unauthorized access.

| Task | Description | Dependency | Priority |
|---|---|---|---|
| 4.3.1 | Per-workspace webhook tokens | Phase 0 (needs workspaces.webhook_token column) | CRITICAL |
| 4.3.2 | Secure cost-events GET endpoint | None | CRITICAL |
| 4.3.3 | Remove DEFAULT_WORKSPACE_ID fallback | None | CRITICAL |
| 5.2.2 fix (5.3.2) | Protect materialized views from PostgREST | None | CRITICAL |
| 6.3.4 | Add workspace access validation to credentials endpoint | None | HIGH |
| 6.3.5 | Add auth check to brand auto-scrape | None | HIGH |
| 8.3.1 Step 2 | Block event ingestion for frozen workspaces | None | HIGH |

**Estimated effort:** 2-3 days. Each task modifies 1-2 files. Can be parallelized across engineers.

**Validation:** After this phase, run the following checklist:
- Attempt to submit an event with an invalid workspace-specific token → expect 401
- Attempt to access cost-events GET without auth → expect 401
- Attempt to submit an event without workspace_id → expect 400
- Attempt to query mv_daily_stats via raw Supabase client (anon key) → expect permission denied
- Attempt to store credentials for a workspace you don't belong to → expect 403
- Freeze a workspace, then attempt to submit events for it → expect 403

### Phase 2 — Ignition Infrastructure (Core Provisioning)

These tasks create the production implementations needed for workspace provisioning to actually function.

| Task | Description | Dependency | Priority |
|---|---|---|---|
| 1.3.1 (code) | SupabaseIgnitionStateDB implementation | Phase 0 tables | HIGH |
| 1.3.2 | SupabasePartitionManager implementation | genesis.leads parent table must exist | HIGH |
| 1.3.3 | HttpSidecarClient implementation | Sidecar must be deployed | HIGH |
| 1.3.4 | Replace handshake sleep with health check | 1.3.3 (needs SidecarClient) | HIGH |
| 1.3.5 | Idempotency guard at ignition entry | 1.3.1 (needs IgnitionStateDB) | MEDIUM |
| 1.3.6 | Real workflow rollback | 1.3.3 (needs SidecarClient) | MEDIUM |
| 1.3.7 | Per-credential retry logic | None | MEDIUM |
| 2.3.1 | Disable Sidecar auto-deploy | Investigation required | MEDIUM |
| 2.3.2 | Required credentials validation in orchestrator | None | HIGH |
| 2.3.3 | Unresolved placeholder scan | None | HIGH |
| 2.3.5 | Handle empty credential values | None | MEDIUM |

**Estimated effort:** 5-7 days. Tasks 1.3.1 through 1.3.4 are the critical path.

**Validation:** After this phase:
- Create a mock workspace with `LOCAL_MODE=true`
- Call `IgnitionOrchestrator.ignite()` with production implementations
- Verify: partition created in Postgres, health check polls sidecar, credentials stored and injected, workflows deployed with all placeholders resolved, workflows activated
- Verify: state persisted to `genesis.ignition_state` — query the table directly
- Cancel a mid-flight ignition → verify rollback cleans up partition and credentials

### Phase 3 — End-to-End Onboarding Flow

Wire the onboarding wizard to the ignition orchestrator so a real user can complete onboarding and have their workspace provisioned.

| Task | Description | Dependency | Priority |
|---|---|---|---|
| 6.3.1 | Wire onboarding completion to ignition (launch endpoint) | Phase 2 (all ignition infrastructure) | CRITICAL |
| 6.3.2 | IgnitionConfig assembler service | Phase 2 | HIGH |
| 6.3.3 | Fix infrastructure step to fail on DB errors | None | MEDIUM |
| 3.3.1 | Per-campaign workflow provisioning design | Phase 2 (deployable orchestrator) | HIGH |

**Estimated effort:** 3-5 days. Task 6.3.1 is the critical deliverable.

**Validation:** After this phase:
- Complete the onboarding wizard as a test user: brand setup → credentials → DNS → infrastructure → launch
- Verify: ignition orchestrator fires, partition created, sidecar healthy, credentials injected, workflows deployed, final status is `active`
- Verify: the user is redirected to the dashboard with working metrics

### Phase 4 — Kill Switch, Watchdog & Compliance

Make the admin controls operational and add monitoring infrastructure.

| Task | Description | Dependency | Priority |
|---|---|---|---|
| 8.3.1 (full) | Full kill switch implementation (dashboard + events + sidecar + cache) | Phase 1 step 2 already done | HIGH |
| 8.3.2 | Watchdog scheduling | Phase 0 (tables) | MEDIUM |
| 8.3.3 | Login audit via Clerk webhooks | Phase 0 (table) | MEDIUM |
| 8.3.5 (code) | SupabaseWatchdogDB implementation | Phase 0 (tables) | MEDIUM |
| 8.3.6 | Extend freeze to invalidate webhook token | 4.3.1 (per-workspace tokens) | MEDIUM |
| 8.3.7 | Control-plane graceful degradation | None | LOW |
| 4.3.5 | Automatic budget enforcement | None | MEDIUM |
| 4.3.6 | Verify daily_stats population | Investigation required | HIGH |

**Estimated effort:** 3-4 days. Tasks can be parallelized.

**Validation:**
- Freeze a workspace → verify: dashboard returns 403/451, event ingestion returns 403, sidecar receives deactivate command, access cache cleared
- Trigger watchdog run → verify: drifts detected, stored in `genesis.watchdog_drifts`, run recorded in `genesis.watchdog_runs`
- Sign in via Clerk → verify: `login_audit` row created
- Submit cost event that exceeds budget → verify: 402 returned

### Phase 5 — Campaign Isolation & Data Quality (Polish)

These tasks improve data quality and campaign-level granularity but are not blocking for initial production launch.

| Task | Description | Dependency | Priority |
|---|---|---|---|
| 3.3.2 | Add `campaign_group_id` column to `email_events` | Phase 0 | MEDIUM |
| 3.3.4 | Normalize campaign dropdown source | None | LOW |
| 2.3.4 | Align sidecar deployer to deploy all 7 templates | Decision: keep or deprecate | LOW |

**Estimated effort:** 2-3 days.

### Phase 6 — Defense-in-Depth & Optimization (Hardening)

Long-term security and performance improvements.

| Task | Description | Dependency | Priority |
|---|---|---|---|
| 5.3.1 | Session-context RLS for Clerk | Careful migration, test thoroughly | HIGH (but complex) |
| 5.3.3 | Cache invalidation on membership changes | None | MEDIUM |
| 5.3.4 | Middleware-level workspace access enforcement | None | MEDIUM |
| 5.3.5 | Super admin audit logging | None | LOW |
| 7.3.3 | Replace SSE polling with Supabase Realtime | None | LOW |
| 1.3.8 | Production DropletFactory (DigitalOcean API) | Needed for cloud-mode only | MEDIUM |
| 6.3.6 | Encryption key rotation | None | LOW |

**Estimated effort:** 5-10 days. Task 5.3.1 (RLS) is the most complex and should be done carefully with thorough testing.

---

## Validation Matrix

This matrix provides a comprehensive checklist for verifying that all critical systems function correctly after implementation. Each row is a testable assertion.

### Security Validations

| # | Assertion | How to Test | Expected Result | Blocks |
|---|---|---|---|---|
| S1 | Events API rejects invalid workspace token | POST to /api/events with wrong x-webhook-token for the workspace | 401 Unauthorized | Production |
| S2 | Events API rejects missing workspace_id | POST to /api/events without workspace_id | 400 Bad Request | Production |
| S3 | Cost events GET requires auth | GET /api/cost-events without Clerk session | 401 Unauthorized | Production |
| S4 | Frozen workspace blocks event ingestion | POST to /api/events with frozen workspace's token | 403 Workspace Frozen | Production |
| S5 | Frozen workspace blocks dashboard access | GET /api/dashboard/aggregate for frozen workspace | 403/451 | Production |
| S6 | Materialized views inaccessible via anon/auth roles | Direct Supabase client query to mv_daily_stats | Permission denied | Production |
| S7 | Credentials API validates workspace membership | POST /api/onboarding/credentials with wrong workspace | 403 Access Denied | Production |
| S8 | RLS prevents cross-tenant leakage (Phase 6) | Query email_events via tenant supabase client for workspace A, verify no workspace B data | Zero cross-tenant rows | Phase 6 |
| S9 | Audit log is append-only | Attempt UPDATE on governance_audit_log | Error from trigger | Production |

### Ignition Validations

| # | Assertion | How to Test | Expected Result | Blocks |
|---|---|---|---|---|
| I1 | Ignition creates partition | Run ignite() in LOCAL_MODE, check pg_inherits | Partition exists for workspace | Phase 3 |
| I2 | Ignition persists state | Run ignite(), query genesis.ignition_state | State row with status = 'active' | Phase 3 |
| I3 | Ignition is idempotent | Call ignite() twice for same workspace | Second call returns already_active | Phase 3 |
| I4 | Rollback cleans up on failure | Inject a failure in step 4, verify rollback | Partition dropped, credentials deleted, state = 'failed' | Phase 3 |
| I5 | Handshake polls until sidecar ready | Start ignition with slow-starting sidecar | Waits for health check before proceeding | Phase 3 |
| I6 | All placeholders resolved in deployed workflows | Check deployed workflow JSON for YOUR_* strings | Zero unresolved placeholders | Phase 2 |
| I7 | Missing required credential detected before deploy | Omit OpenAI credential for research_report | IgnitionError with clear message | Phase 2 |

### Onboarding Validations

| # | Assertion | How to Test | Expected Result | Blocks |
|---|---|---|---|---|
| O1 | Onboarding launch triggers ignition | Complete all wizard steps, click Launch | Ignition state changes from pending → active | Phase 3 |
| O2 | Progress persists across sessions | Complete 3 steps, refresh browser | Progress shows 3 steps complete | Phase 3 |
| O3 | Infrastructure failure shows error (not false success) | Simulate DB error in infrastructure step | UI shows error, does not advance | Phase 3 |
| O4 | Encrypted credentials retrievable after storage | Store credential, then decrypt via vault service | Plaintext matches original | Phase 2 |

### Sandbox Validations

| # | Assertion | How to Test | Expected Result | Blocks |
|---|---|---|---|---|
| X1 | Sandbox test events don't pollute production metrics | Run sandbox test, check email_events | Events have is_test = true or are in separate table | Phase 4 |
| X2 | Rate limiter blocks excessive tests | Trigger N+1 tests in quick succession | 429 on the N+1th request | Phase 2 |
| X3 | SSE stream delivers execution events | Trigger test, observe SSE stream | Events appear in real-time | Phase 2 |
| X4 | Sandbox works in LOCAL_MODE | Set LOCAL_SIDECAR_URL, trigger test | Connects to local sidecar | Phase 2 |

### Watchdog & Admin Validations

| # | Assertion | How to Test | Expected Result | Blocks |
|---|---|---|---|---|
| W1 | Watchdog detects orphan workflows | Create workflow in n8n without DB record, run detection | Drift detected and stored | Phase 4 |
| W2 | Watchdog run is persisted | Trigger watchdog cycle | Row in genesis.watchdog_runs with status = 'completed' | Phase 4 |
| W3 | Kill switch deactivates sidecar workflows | Freeze workspace, check n8n | All workflows inactive | Phase 4 |
| W4 | Unfreeze allows re-activation | Unfreeze previously frozen workspace | Dashboard accessible, events accepted | Phase 4 |
| W5 | Login audit captures sign-in | Sign in via Clerk | Row in login_audit | Phase 4 |

---

## Risk Registry

| Risk | Severity | Likelihood | Mitigation | Owner |
|---|---|---|---|---|
| Single webhook token allows cross-tenant event injection | Critical | High (token in n8n config) | Task 4.3.1 — per-workspace tokens | Security Lead |
| Materialized views expose all-tenant data via PostgREST | Critical | Medium (requires API knowledge) | Task 5.3.2 — revoke anon/auth SELECT | Security Lead |
| Kill switch doesn't stop workflows or block events | High | Certain | Task 8.3.1 — full kill switch | Backend Lead |
| Onboarding completion does nothing (no ignition trigger) | High | Certain | Task 6.3.1 — wire to orchestrator | Full-stack Lead |
| No production PartitionManager/DropletFactory/SidecarClient | High | Certain (only mocks exist) | Tasks 1.3.2, 1.3.3, 1.3.8 | Backend Lead |
| Idempotency check is unindexed JSONB scan | Medium | High (grows with events) | Task 4.3.4 — persist idempotency_key column | Backend Lead |
| Test events pollute production metrics | Medium | High (no isolation) | Task 7.3.2 — is_test flag | Full-stack Lead |
| Access cache not invalidated on role/freeze changes | Medium | Medium | Task 5.3.3 | Backend Lead |
| Handshake is a sleep, not a health check | Medium | Medium (depends on boot time) | Task 1.3.4 | Backend Lead |
| No audit trail for login events | Low | Certain (not implemented) | Task 8.3.3 | Compliance Lead |

---

## Glossary

| Term | Definition |
|---|---|
| Ignition | The full workspace provisioning process: partition → droplet → sidecar → credentials → workflows → activation |
| Sovereign Droplet | A per-tenant DigitalOcean droplet running n8n + Sidecar |
| Sidecar | ExpressJS middle-tier running alongside n8n on each droplet, accepts commands from the dashboard |
| Ohio Firewall | Code-level guard preventing Ohio (legacy) workspace data from mixing with V35 (genesis) workspaces |
| Genesis Schema | Postgres schema (`genesis.*`) containing multi-tenant tables with workspace-based partitioning |
| LOCAL_MODE | Development mode that skips DigitalOcean provisioning and uses a local n8n instance |
| Kill Switch | Admin ability to freeze a workspace, blocking all operations |
| Watchdog (Phase 43) | Logical state reconciliation — detects drift between DB campaign records and n8n workflow state |
| Watchdog (Phase 73) | Infrastructure health monitoring — detects zombie droplets and resource exhaustion |
| RLS | Row-Level Security — Postgres feature that restricts query results based on the requesting user/role |
| PostgREST | Supabase's automatic REST API generator — creates endpoints for all exposed tables/views |

---

*End of Post-Genesis Execution Plan. Total domains analyzed: 8. Total tasks identified: 45. Critical security fixes: 7. Implementation phases: 7 (0–6).*
