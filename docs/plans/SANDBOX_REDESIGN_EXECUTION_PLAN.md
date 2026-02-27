# Sandbox Redesign Execution Plan

**Phase:** 74 — Sandbox / Playground Redesign (Flow-Based Workflow Editor)
**Created:** 2026-02-27
**Status:** IN PROGRESS
**Vision Doc:** [SANDBOX_REDESIGN_VISION.md](SANDBOX_REDESIGN_VISION.md)

---

## Context & Status

* All prior phases (Domains 1-8) complete and merged to main
* Current Phase 45 Sandbox: test runner + flat execution monitor + broken config knobs
* This redesign replaces the entire sandbox UI with a flow-based workflow visualization engine

---

## Architecture Overview

### Data Flow

```
base-cold-email/*.json (canonical templates, 7 workflows, ~160 nodes)
         │
    [n8n-to-graph adapter]
         │
         ▼
┌─────────────────────────────────────┐
│  lib/workflow-graph/types.ts        │  ← Graph schema + node metadata
│  lib/workflow-graph/adapter.ts      │  ← n8n JSON → FlowGraph
│  lib/workflow-graph/registry.ts     │  ← Node type → category/icon/color
│  lib/workflow-graph/layout.ts       │  ← dagre auto-layout
└─────────────────────────────────────┘
         │
    [sidecar getWorkflow API]
         │
         ▼
  sidecar/n8n-manager.ts  →  GET /workflows/{id}
  sidecar-agent.ts         →  GET_WORKFLOW command
         │
    [dashboard proxy API]
         │
         ▼
  app/api/sandbox/workflow/[campaignId]/route.ts
         │
    [SWR hook]
         │
         ▼
  hooks/use-workflow-graph.ts  (useSWR)
         │
    [React Flow canvas + custom nodes]
         │
         ▼
  components/sandbox/flow/  →  WorkflowCanvas, custom nodes, edges
         │
    [Node interaction + write-back]
         │
         ▼
  NodeDetailDrawer, NodeEditForm → API → sidecar UPDATE_WORKFLOW
         │
    [Live execution overlay]
         │
         ▼
  Existing SSE /api/sandbox/execution-stream + node status animation
```

### New Dependencies

- `@xyflow/react` (MIT, successor to React Flow) — flow diagram rendering
- `dagre` + `@types/dagre` — directed graph auto-layout

### Impact Analysis

| Change | Impact Zone |
|--------|-------------|
| New types in `lib/workflow-graph/` | Zero — additive only |
| New `getWorkflow` in sidecar | Sidecar-only, dashboard uses proxy API |
| New API routes under `app/api/sandbox/workflow/` | Independent of existing sandbox routes |
| `@xyflow/react` install | Frontend-only, lazy-loaded on sandbox page |
| Remove old sandbox components | Only referenced in `sandbox-panel.tsx` — safe |
| New `GET_WORKFLOW` sidecar command | Additive to `SidecarCommand` union |
| Node edits write back via `UPDATE_WORKFLOW` | Already exists in sidecar |

---

## Execution Stories (23 total)

### PHASE 1: FOUNDATION (SBX-001 to SBX-005)

#### SBX-001 — Workflow Graph Type System + Node Metadata Registry

Define core TypeScript types representing an n8n workflow as a renderable graph. Create a node-type registry mapping each `n8n-nodes-base.*` type to a visual category, icon, and color.

**Key types:**
- `WorkflowGraph`: `{ nodes: GraphNode[], edges: GraphEdge[], metadata: WorkflowMetadata }`
- `GraphNode`: id, name, type, category, position, parameters, editableParams
- `NodeCategory` enum: `trigger | ai_llm | email_send | data_db | logic_routing | tracking | utility | unknown`
- `NODE_TYPE_REGISTRY`: maps ~20 observed node types to categories
- `EditableParamDescriptor`: key, label, type (text/textarea/cron/number/select), path into n8n params

**Files:** `lib/workflow-graph/types.ts`, `lib/workflow-graph/registry.ts`, `lib/workflow-graph/index.ts`
**Dependencies:** None

---

#### SBX-002 — n8n-to-Graph Adapter

Pure function transforming raw n8n workflow JSON into `WorkflowGraph`. Parses connections, filters sticky notes, enriches with categories, auto-layouts via dagre.

**Files:** `lib/workflow-graph/adapter.ts`, `lib/workflow-graph/layout.ts`
**Dependencies:** SBX-001

---

#### SBX-003 — Sidecar: Add `getWorkflow(id)` + `GET_WORKFLOW` Command

Add `N8nManager.getWorkflow()` calling `GET /api/v1/workflows/{id}`. Wire as `GET_WORKFLOW` sidecar command.

**Files:** `sidecar/n8n-manager.ts`, `sidecar/sidecar-agent.ts`
**Dependencies:** None

---

#### SBX-004 — Dashboard API: GET /api/sandbox/workflow/[campaignId]

API route that fetches workflow JSON (from sidecar or template fallback), transforms via adapter, returns `WorkflowGraph`.

**Files:** `app/api/sandbox/workflow/[campaignId]/route.ts`
**Dependencies:** SBX-002, SBX-003

---

#### SBX-005 — Install @xyflow/react + Scaffold Flow Directory

Install the flow diagram library, create component directory, add CSS import.

**Files:** `components/sandbox/flow/index.ts`, `package.json`
**Dependencies:** None

---

### PHASE 2: VISUALIZATION (SBX-006 to SBX-009)

#### SBX-006 — SWR Hook: useWorkflowGraph

SWR hook fetching `WorkflowGraph` for a campaign, converting to React Flow `Node[]` and `Edge[]`.

**Files:** `hooks/use-workflow-graph.ts`
**Dependencies:** SBX-004, SBX-005

---

#### SBX-007 — Custom Node Components (6 Visual Categories)

Six custom React Flow node components: TriggerNode (green), AiLlmNode (purple), EmailSendNode (blue), DataDbNode (amber), LogicRoutingNode (gray), TrackingNode (teal). Each shows name, type label, status dot.

**Files:** `components/sandbox/flow/nodes/` (6 files + index.ts)
**Dependencies:** SBX-005

---

#### SBX-008 — WorkflowCanvas Component + Edge Rendering

Main `<WorkflowCanvas>` wrapping `<ReactFlow>` with custom nodes, minimap, controls, background grid. Read-only positioning, pan+zoom.

**Files:** `components/sandbox/flow/WorkflowCanvas.tsx`
**Dependencies:** SBX-006, SBX-007

---

#### SBX-009 — Workflow Selector Tabs

Tab bar for switching between 7 workflows per campaign. Shows active/inactive/template badges.

**Files:** `components/sandbox/flow/WorkflowSelector.tsx`
**Dependencies:** SBX-005

---

### PHASE 3: NODE INTERACTION (SBX-010 to SBX-012)

#### SBX-010 — Node Detail Drawer (Read-Only View)

Side drawer showing node details on click. Special renderers for cron expressions, AI prompts, JS code, credentials.

**Files:** `components/sandbox/flow/NodeDetailDrawer.tsx`, `lib/workflow-graph/cron-humanizer.ts`
**Dependencies:** SBX-008

---

#### SBX-011 — Editable Parameter Forms

Inline edit forms for editable nodes (prompts, schedules, placeholders). Dirty state tracking, Zod validation.

**Files:** `components/sandbox/flow/NodeEditForm.tsx`
**Dependencies:** SBX-010

---

#### SBX-012 — Role-Gated Edit Toggle

Integrate `usePermissions()` to gate editing. Only owners/admins can edit. Server-side role validation.

**Files:** Modify SBX-010 + SBX-011 components
**Dependencies:** SBX-010, SBX-011

---

### PHASE 4: WRITE-BACK (SBX-013 to SBX-015)

#### SBX-013 — Build Node Update Payload (Surgical Patching)

Utility to construct minimal n8n PATCH payload. Finds target node by ID, applies parameter patches, returns full nodes array.

**Files:** `lib/workflow-graph/patch-builder.ts`
**Dependencies:** SBX-001

---

#### SBX-014 — Dashboard API: POST /api/sandbox/workflow/update

API route receiving edit patches, validating permissions, building patch payload, sending UPDATE_WORKFLOW to sidecar. Optimistic locking via version field.

**Files:** `app/api/sandbox/workflow/update/route.ts`
**Dependencies:** SBX-003, SBX-013

---

#### SBX-015 — Optimistic UI + Mutation Integration

`useWorkflowMutation()` hook with optimistic SWR updates, conflict handling, toast notifications.

**Files:** `hooks/use-workflow-mutation.ts`
**Dependencies:** SBX-011, SBX-014

---

### PHASE 5: LIVE EXECUTION (SBX-016 to SBX-018)

#### SBX-016 — Map Execution Events to Graph Nodes

`useExecutionOverlay()` hook matching SSE execution events to graph nodes by name. Returns node status map.

**Files:** `hooks/use-execution-overlay.ts`
**Dependencies:** SBX-008

---

#### SBX-017 — Node Status Animation on Canvas

Apply status map to canvas nodes: running (pulsing), success (green check), error (red X). Auto-pan to current node.

**Files:** Modify all 6 node components + WorkflowCanvas
**Dependencies:** SBX-016

---

#### SBX-018 — Execution Timeline Sidebar

Vertical timeline replacing old ExecutionMonitor. Shows events with focus-to-node buttons, auto-scroll.

**Files:** `components/sandbox/flow/ExecutionTimeline.tsx`
**Dependencies:** SBX-016

---

### PHASE 6: PRODUCTION MONITORING (SBX-019 to SBX-020)

#### SBX-019 — Execution History Per Workflow

History panel showing last N executions per workflow. Click to replay execution overlay on canvas.

**Files:** `components/sandbox/flow/ExecutionHistory.tsx`, modify history API route
**Dependencies:** SBX-016

---

#### SBX-020 — Per-Node Performance Metrics

Aggregated performance badges on nodes (avg duration, error rate). Toggle-able overlay.

**Files:** `hooks/use-node-metrics.ts`, `app/api/sandbox/workflow/metrics/route.ts`
**Dependencies:** SBX-008

---

### PHASE 7: PAGE INTEGRATION + CLEANUP (SBX-021 to SBX-023)

#### SBX-021 — Redesign Sandbox Page Layout

Rebuild sandbox page: campaign selector + workflow tabs (top), flow canvas (center), node drawer (right), timeline/history (bottom).

**Files:** Modify `app/sandbox/page.tsx`
**Dependencies:** SBX-008, SBX-009, SBX-010, SBX-018, SBX-019

---

#### SBX-022 — Simplified Test Runner Modal

Lightweight dialog: campaign (pre-selected), test email input, Run button. Connects to flow overlay.

**Files:** `components/sandbox/flow/TestRunModal.tsx`
**Dependencies:** SBX-021

---

#### SBX-023 — Remove Deprecated Components + Config Cleanup

Delete old Phase 45 sandbox components. Remove broken config knobs from UI.

**Files to delete:** `configuration-section.tsx`, `config-status-bar.tsx`, `execution-monitor.tsx`, `test-runner.tsx`, `sandbox-panel.tsx`
**Dependencies:** SBX-021, SBX-022

---

## Story Dependency Graph

```
SBX-001 ──┬──→ SBX-002 ──→ SBX-004 ──→ SBX-006 ──→ SBX-008 ──┬──→ SBX-021 ──→ SBX-022 ──→ SBX-023
           │                                                     │
           └──→ SBX-013 ──→ SBX-014 ──→ SBX-015                 ├──→ SBX-016 ──→ SBX-017
                                                                  │               SBX-018
SBX-003 ──→ SBX-004                                               │               SBX-019
                                                                  │
SBX-005 ──┬──→ SBX-006                                            └──→ SBX-020
           ├──→ SBX-007 ──→ SBX-008
           └──→ SBX-009 ──→ SBX-021

SBX-010 ──→ SBX-011 ──→ SBX-012
                      └──→ SBX-015
```

**Optimal execution order (linear):**
1. SBX-001, SBX-003, SBX-005 (independent — parallel)
2. SBX-002, SBX-007, SBX-009 (after group 1)
3. SBX-004, SBX-013 (after group 2)
4. SBX-006, SBX-008, SBX-010 (after group 3)
5. SBX-011, SBX-014, SBX-016, SBX-020 (after group 4)
6. SBX-012, SBX-015, SBX-017, SBX-018, SBX-019 (after group 5)
7. SBX-021 → SBX-022 → SBX-023 (final assembly + cleanup)

---

## Node Type Registry (from template analysis)

| n8n Type | Category | Label | Count in templates |
|----------|----------|-------|--------------------|
| `scheduleTrigger` | trigger | Schedule Trigger | 7 |
| `webhook` | trigger | Webhook | 1 |
| `gmailTrigger` | trigger | Email Trigger | 1 |
| `gmail` | email_send | Gmail | 6 |
| `httpRequest` | varies* | HTTP Request | ~40 |
| `postgres` | data_db | Database | ~25 |
| `googleSheets` | data_db | Google Sheets | ~12 |
| `code` | utility | Code | ~30 |
| `set` | utility | Set Fields | ~8 |
| `if` | logic_routing | Condition | ~14 |
| `splitInBatches` | logic_routing | Loop | ~7 |
| `merge` | logic_routing | Merge | ~5 |
| `limit` | logic_routing | Limit | ~7 |
| `wait` | utility | Wait | ~7 |
| `respondToWebhook` | utility | Respond | 1 |
| `html` | utility | HTML Builder | 1 |

*httpRequest nodes are classified contextually:
- URL contains `openai.com` or `anthropic.com` → `ai_llm`
- URL contains dashboard API + "email" subject → `tracking`
- URL contains sidecar/smtp → `email_send`
- Default → `utility`

---

## Editable Nodes Summary

| Workflow | Node Name | What's Editable |
|----------|-----------|-----------------|
| Email Preparation | Summarize (O3-mini) | AI prompt, model |
| Email Preparation | Analyze | AI prompt, model, timeout |
| Email Preparation | Draft Emails 1,2,3 | Full email generation prompt, model |
| Email Preparation | Schedule Trigger | Cron expression |
| Research Report | Summarize (O3-mini) | AI prompt, model |
| Research Report | Person + Company Profile | AI prompt, model |
| Research Report | Similarities | AI prompt, model |
| Research Report | Pain Points + Solutions | AI prompt, model |
| Research Report | Schedule Trigger1 | Cron expression |
| Email 1-3 | Schedule Trigger | Cron expression |
| Email 1-3 | Limit | Max items per batch |
| All | YOUR_* placeholders | Company name, calendly links, etc. |

---

## Rollback Plan

| Component | Rollback |
|-----------|----------|
| `@xyflow/react` + `dagre` | `npm uninstall @xyflow/react dagre @types/dagre` |
| New API routes | Delete `app/api/sandbox/workflow/` directory |
| New hooks | Delete new hook files |
| New lib | Delete `lib/workflow-graph/` directory |
| Sidecar changes | Remove `getWorkflow` + `GET_WORKFLOW` |
| Old components | `git restore components/sandbox/` from pre-SBX-023 |
| Page | `git restore app/sandbox/page.tsx` |
