# 🧬 Genesis Engine: Architecture Analysis

> **Document Type:** Pre-Implementation Brainstorming & Architectural Deep-Dive  
> **Status:** DRAFT - Not Ready for Implementation  
> **Created:** 2026-01-03  
> **Last Updated:** 2026-01-03

---

## 📖 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Decision Matrix](#decision-matrix)
4. [Data Flow Architecture](#data-flow-architecture)
5. [Provisioning Sequence](#provisioning-sequence)
6. [Role Permission Matrix](#role-permission-matrix)
7. [Unknowns and Gap Analysis](#unknowns-and-gap-analysis)
8. [Open Questions](#open-questions)

---

## Executive Summary

### What Is The Genesis Engine?

The Genesis Engine is the codename for the platform transformation that will convert the current single-client Cold Email Dashboard into a true multi-tenant SaaS platform. This is not a feature—it is a **platform re-architecture** that touches every layer of the stack:

- **Frontend:** New "Playground" interface for workflow management
- **Backend API:** New provisioning endpoints, template management
- **Database:** Dynamic table creation, universal schema design
- **n8n:** API-driven workflow cloning, credential management
- **Authentication:** Enhanced role-based access control

### Why Is This Critical?

The current system works perfectly for ONE client (Ohio). But to add a second client (e.g., Texas Solar), you would need to:

1. Manually create new database tables (`leads_texas`)
2. Manually import 7 n8n workflows
3. Manually fill in all `YOUR_*` placeholders with client values
4. Manually configure webhook URLs in the dashboard
5. Manually set up credentials in n8n
6. Manually verify everything works

**This takes hours per client and doesn't scale.**

The Genesis Engine automates steps 1-5 and provides a UI for step 6, reducing client onboarding from hours to minutes.

### What This Document Is NOT

This document is **NOT an implementation plan**. It is a comprehensive analysis of:

- The decisions we need to make
- The data flows we need to design
- The unknowns we need to crack
- The gaps we need to fill

Implementation planning cannot begin until these architectural questions are answered.

---

## Current State Analysis

### What Works Today

#### 1. Authentication & Workspace Isolation

```
┌─────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Clerk Authentication                                        │
│     • Sign in / Sign up                                         │
│     • Session management                                        │
│     • User metadata storage                                     │
│                                                                 │
│  ✅ Workspace System                                            │
│     • Create workspace                                          │
│     • Join existing workspace via invite                        │
│     • Switch between workspaces                                 │
│     • Workspace-level isolation                                 │
│                                                                 │
│  ✅ Role Hierarchy                                              │
│     • SUPER_ADMIN (platform owner)                              │
│     • OWNER (workspace creator)                                 │
│     • ADMIN (elevated team member)                              │
│     • MEMBER (standard team member)                             │
│     • VIEWER (read-only access)                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 2. Database Layer (Supabase)

```
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Existing Tables                                             │
│     • workspaces (with RLS)                                     │
│     • workspace_members (with RLS)                              │
│     • campaigns (with RLS)                                      │
│     • email_events (with RLS)                                   │
│     • daily_stats (with RLS)                                    │
│     • llm_usage (with RLS)                                      │
│     • leads_ohio (HARDCODED for one client)                     │
│                                                                 │
│  ✅ Row Level Security                                          │
│     • Workspace-based isolation enforced at DB level            │
│     • Users can only see data from their workspace              │
│                                                                 │
│  ❌ What's Missing                                              │
│     • No dynamic table creation                                 │
│     • No `leads_<workspace_id>` pattern                         │
│     • No template/blueprint storage                             │
│     • No n8n workflow ID tracking per workspace                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 3. n8n Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                         N8N LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  ✅ 7 Golden Template Workflows                                 │
│     • Email Preparation.json                                    │
│     • Email 1.json                                              │
│     • Email 2.json                                              │
│     • Email 3.json                                              │
│     • Reply Tracker.json                                        │
│     • Opt-Out.json                                              │
│     • Research Report.json                                      │
│                                                                 │
│  ✅ Templates Sanitized with Placeholders                       │
│     • YOUR_DASHBOARD_URL                                        │
│     • YOUR_WEBHOOK_TOKEN                                        │
│     • YOUR_SENDER_EMAIL                                         │
│     • YOUR_NAME                                                 │
│     • YOUR_COMPANY_NAME                                         │
│     • YOUR_GOOGLE_CSE_API_KEY / YOUR_GOOGLE_CSE_CX              │
│     • YOUR_RELEVANCE_AI_* (multiple)                            │
│     • YOUR_APIFY_API_TOKEN                                      │
│     • YOUR_CALENDLY_LINK_1 / YOUR_CALENDLY_LINK_2               │
│     • (And 20+ more placeholders)                               │
│                                                                 │
│  ❌ Still Hardcoded                                             │
│     • "leads_ohio" table name (~30+ occurrences)                │
│     • "Ohio" campaign name in tracking code                     │
│     • Credential IDs (e.g., "QKb5WqKXZ29v15Qk")                 │
│                                                                 │
│  ❌ What's Missing                                              │
│     • No API-driven workflow creation                           │
│     • No credential management from dashboard                   │
│     • No webhook URL discovery mechanism                        │
│     • No per-client workflow instances                          │
└─────────────────────────────────────────────────────────────────┘
```

#### 4. Dashboard Layer (Next.js Frontend)

```
┌─────────────────────────────────────────────────────────────────┐
│                      DASHBOARD LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Working Features                                            │
│     • Overview analytics                                        │
│     • Campaign management                                       │
│     • Contacts view                                             │
│     • Sequences view                                            │
│     • Brand Vault                                               │
│     • Knowledge Engine                                          │
│     • Settings                                                  │
│     • God Mode (Super Admin panel)                              │
│     • Mobile responsive                                         │
│                                                                 │
│  ❌ What's Missing                                              │
│     • No "Playground" for workflow management                   │
│     • No template configuration UI                              │
│     • No provisioning controls                                  │
│     • No n8n status visibility                                  │
│     • No credential management UI                               │
│     • Empty dashboard state for unprovisioned workspaces        │
└─────────────────────────────────────────────────────────────────┘
```

### The Ohio Problem (Illustrated)

Here's what happened with Ohio and why it doesn't scale:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    HOW "OHIO" WAS SET UP (MANUAL)                          │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Step 1: Create Workspace (Dashboard)                                      │
│         ↳ "Ohio Campaign" workspace created                                │
│         ↳ User assigned as Owner                                           │
│         ↳ Dashboard shows empty shell                                      │
│                                                                            │
│  Step 2: Create Database Table (Supabase - MANUAL)                        │
│         ↳ Created `leads_ohio` table with 30+ columns                      │
│         ↳ Imported CSV of leads into table                                 │
│         ↳ Set up RLS policies manually                                     │
│         ↳ Created foreign key to workspaces                                │
│                                                                            │
│  Step 3: Configure n8n Workflows (n8n UI - MANUAL)                        │
│         ↳ Imported 7 JSON files into n8n                                   │
│         ↳ Replaced "YOUR_DASHBOARD_URL" with real URL                      │
│         ↳ Replaced "YOUR_WEBHOOK_TOKEN" with actual token                  │
│         ↳ Replaced "YOUR_SENDER_EMAIL" with client email                   │
│         ↳ Set up Gmail credentials in n8n                                  │
│         ↳ Set up Google Sheets credentials                                 │
│         ↳ Set up OpenAI credentials                                        │
│         ↳ Set up all other API credentials                                 │
│         ↳ Activated workflows                                              │
│                                                                            │
│  Step 4: Register Webhook URLs (Dashboard - MANUAL)                       │
│         ↳ Copied webhook URLs from n8n                                     │
│         ↳ Stored them somewhere (where? unclear)                           │
│         ↳ Dashboard API routes configured to call these                    │
│                                                                            │
│  Step 5: Verify Everything Works (MANUAL TESTING)                         │
│         ↳ Ran test executions                                              │
│         ↳ Verified data flows correctly                                    │
│         ↳ Fixed bugs ad-hoc                                                │
│                                                                            │
│  ⏱️ TIME SPENT: ~4-8 hours                                                │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### What Happens When "Texas" Wants to Sign Up

```
┌────────────────────────────────────────────────────────────────────────────┐
│                 CURRENT FLOW FOR NEW CLIENT (BROKEN)                       │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  1. Texas creates workspace in dashboard                                   │
│     └── ✅ Works (empty shell created)                                     │
│                                                                            │
│  2. Texas sees empty dashboard                                             │
│     └── ✅ Correct (no data yet)                                           │
│                                                                            │
│  3. Texas tries to create campaign                                         │
│     └── ⚠️ Works but useless (no leads table, no workflows)               │
│                                                                            │
│  4. Texas uploads CSV of leads                                             │
│     └── ❌ FAILS (no table to upload to)                                   │
│                                                                            │
│  5. Texas expects emails to send                                           │
│     └── ❌ FAILS (no n8n workflows configured)                             │
│                                                                            │
│  6. Texas contacts support asking "why nothing works"                      │
│     └── 😭 You now have 4-8 hours of manual setup ahead                   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Decision Matrix

This section analyzes the major architectural decisions that must be made before implementation can begin.

### Decision 1: Workflow Architecture (Clone vs. Shared)

#### The Question

Should each client (workspace) get their own copy of the 7 n8n workflows, or should all clients share a single set of workflows that read client context at runtime?

#### Option A: Clone Model (1:1)

Each workspace gets a complete clone of all 7 workflows in n8n.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          CLONE MODEL (1:1)                                 │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  n8n Instance                                                              │
│  ├── Workflows/                                                            │
│  │   ├── [Ohio] Email Preparation         (ID: wfl_001)                   │
│  │   ├── [Ohio] Email 1                   (ID: wfl_002)                   │
│  │   ├── [Ohio] Email 2                   (ID: wfl_003)                   │
│  │   ├── [Ohio] Email 3                   (ID: wfl_004)                   │
│  │   ├── [Ohio] Reply Tracker             (ID: wfl_005)                   │
│  │   ├── [Ohio] Opt-Out                   (ID: wfl_006)                   │
│  │   ├── [Ohio] Research Report           (ID: wfl_007)                   │
│  │   │                                                                     │
│  │   ├── [Texas] Email Preparation        (ID: wfl_008)                   │
│  │   ├── [Texas] Email 1                  (ID: wfl_009)                   │
│  │   ├── [Texas] Email 2                  (ID: wfl_010)                   │
│  │   ├── [Texas] Email 3                  (ID: wfl_011)                   │
│  │   ├── [Texas] Reply Tracker            (ID: wfl_012)                   │
│  │   ├── [Texas] Opt-Out                  (ID: wfl_013)                   │
│  │   └── [Texas] Research Report          (ID: wfl_014)                   │
│                                                                            │
│  Supabase: campaigns table                                                 │
│  ├── workspace: ohio    → n8n_workflow_ids: [wfl_001..wfl_007]            │
│  └── workspace: texas   → n8n_workflow_ids: [wfl_008..wfl_014]            │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Advantages of Clone Model:**

| Advantage                       | Details                                                          |
| ------------------------------- | ---------------------------------------------------------------- |
| **Full Customization**          | Each client can have completely different prompts, logic, timing |
| **Isolated Debugging**          | If Ohio's Email 1 fails, Texas is unaffected                     |
| **Client-Specific Credentials** | Each workflow uses its own credential set                        |
| **Easy to Understand**          | Clear 1:1 relationship between workspace and workflows           |
| **Safe Updates**                | Can update one client without affecting others                   |
| **Client Transparency**         | Client can see "their" workflows if given access                 |

**Disadvantages of Clone Model:**

| Disadvantage             | Details                                              |
| ------------------------ | ---------------------------------------------------- |
| **Maintenance Burden**   | Bug fix = update N copies of the workflow            |
| **Workflow Explosion**   | 10 clients × 7 workflows = 70 workflows in n8n       |
| **No Version Control**   | No easy way to know which clients have which version |
| **Storage/Quota Limits** | n8n may have workflow limits depending on plan       |
| **Clone Drift**          | Over time, clones diverge and become inconsistent    |

**When Clone Model Makes Sense:**

- Clients need significant customization (different prompts, different APIs)
- Clients might enhance their own workflows over time
- You want complete isolation between clients
- You don't plan to have 100+ clients (manageable scale)

---

#### Option B: Shared Model (1:Many)

All clients share the same 7 workflows, with client context passed at runtime.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         SHARED MODEL (1:Many)                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  n8n Instance                                                              │
│  ├── Workflows/                                                            │
│  │   ├── [MASTER] Email Preparation       (ID: wfl_master_001)            │
│  │   ├── [MASTER] Email 1                 (ID: wfl_master_002)            │
│  │   ├── [MASTER] Email 2                 (ID: wfl_master_003)            │
│  │   ├── [MASTER] Email 3                 (ID: wfl_master_004)            │
│  │   ├── [MASTER] Reply Tracker           (ID: wfl_master_005)            │
│  │   ├── [MASTER] Opt-Out                 (ID: wfl_master_006)            │
│  │   └── [MASTER] Research Report         (ID: wfl_master_007)            │
│                                                                            │
│  Runtime Context Injection:                                                │
│  ├── Webhook receives: { workspace_id: "texas", campaign_id: "q1" }       │
│  ├── Workflow queries: SELECT * FROM universal_leads                      │
│  │                     WHERE workspace_id = {{ $json.workspace_id }}      │
│  └── All nodes use context variables instead of hardcoded values          │
│                                                                            │
│  Supabase: workspaces_config table                                         │
│  ├── ohio  → { prompts: {...}, credentials_ref: "ohio-creds" }            │
│  └── texas → { prompts: {...}, credentials_ref: "texas-creds" }           │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Advantages of Shared Model:**

| Advantage                    | Details                                     |
| ---------------------------- | ------------------------------------------- |
| **Single Source of Truth**   | Fix bug once, everyone benefits             |
| **Scales to 1000+ Clients**  | Only 7 workflows regardless of client count |
| **Easy Version Control**     | All clients always on "latest"              |
| **Lower n8n Resource Usage** | Less storage, fewer active workflows        |
| **Simpler Deployment**       | Update master, done                         |

**Disadvantages of Shared Model:**

| Disadvantage                | Details                                                   |
| --------------------------- | --------------------------------------------------------- |
| **Limited Customization**   | All clients get the same logic                            |
| **Complex Variable System** | Need to fetch config at runtime for every execution       |
| **Blast Radius**            | Bug in master breaks ALL clients                          |
| **Credential Nightmare**    | How does one workflow use 50 different Gmail credentials? |
| **Performance Overhead**    | Extra database call per execution to fetch config         |
| **Debugging Nightmare**     | Which client caused this error?                           |

**When Shared Model Makes Sense:**

- All clients use identical logic (SaaS commodity product)
- You have 100+ clients and can't manage individual workflows
- Customization is limited to simple variables (not prompts, not logic)

---

#### Option C: Hybrid Model (Recommended)

Clone the workflows, but implement a "Blueprint + Versioning" system.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                       HYBRID MODEL (Blueprint + Clone)                     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Blueprint Layer (Templates)                                               │
│  ├── blueprints table in Supabase                                         │
│  │   ├── id: "cold-email-v2"                                              │
│  │   ├── version: "2.3.1"                                                 │
│  │   ├── workflows_json: [ {Email Prep}, {Email 1}, ... ]                 │
│  │   ├── variables_schema: { "SENDER_EMAIL": "string", ... }              │
│  │   └── created_at: timestamp                                            │
│  │                                                                         │
│  │   Blueprint versioning:                                                 │
│  │   ├── cold-email-v1 (deprecated)                                       │
│  │   ├── cold-email-v2 (current)                                          │
│  │   └── cold-email-v3 (beta)                                             │
│                                                                            │
│  Clone Layer (Per-Client)                                                  │
│  ├── workspace_workflows table in Supabase                                │
│  │   ├── workspace_id: "texas"                                            │
│  │   ├── blueprint_id: "cold-email-v2"                                    │
│  │   ├── blueprint_version: "2.3.1"                                       │
│  │   ├── n8n_workflow_ids: ["wfl_008", "wfl_009", ...]                    │
│  │   ├── variables: { "SENDER_EMAIL": "john@texas.com", ... }             │
│  │   ├── status: "active" | "provisioning" | "error"                      │
│  │   └── last_synced: timestamp                                           │
│                                                                            │
│  Upgrade Path:                                                             │
│  ├── New blueprint version released (v2.3.2)                              │
│  ├── Dashboard shows "Update Available" for Texas                         │
│  ├── Super Admin clicks "Upgrade" for Texas                               │
│  ├── System re-clones workflows with new JSON, preserving variables       │
│  └── Texas now on v2.3.2                                                  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Why Hybrid is Best:**

1. **Has Clone Benefits:** Full customization, isolated debugging
2. **Solves Clone Problems:** Blueprint versioning tracks what's deployed where
3. **Upgrade Path:** Can push updates to clients selectively
4. **Audit Trail:** Know exactly which version each client is running

---

#### Decision 1 Verdict: Recommendation

| Factor                    | Clone  | Shared | Hybrid |
| ------------------------- | ------ | ------ | ------ |
| Customization             | ✅✅✅ | ❌     | ✅✅✅ |
| Maintenance               | ❌     | ✅✅✅ | ✅✅   |
| Scalability               | ✅     | ✅✅✅ | ✅✅   |
| Debugging                 | ✅✅✅ | ❌     | ✅✅✅ |
| Credential Handling       | ✅✅✅ | ❌     | ✅✅✅ |
| Version Control           | ❌     | ✅✅   | ✅✅✅ |
| Implementation Complexity | ✅✅   | ✅     | ✅     |

**Recommendation: Hybrid Model**

The Hybrid Model gives you:

- Clone-level customization and isolation
- Blueprint-level version tracking and upgrade paths
- Manageable maintenance via versioned templates

**However:** Start with pure Clone model for MVP, add versioning layer later.

---

### Decision 2: Database Architecture (Per-Client Tables vs. Universal Table)

#### The Question

Should each client have their own leads table (`leads_ohio`, `leads_texas`), or should all leads live in one table with a `workspace_id` column?

#### Option A: Per-Client Tables

```
┌────────────────────────────────────────────────────────────────────────────┐
│                      PER-CLIENT TABLES                                     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Supabase Database                                                         │
│  ├── leads_ohio                                                            │
│  │   ├── id                                                                │
│  │   ├── email_address                                                     │
│  │   ├── linkedin_url                                                      │
│  │   ├── first_name, last_name                                             │
│  │   ├── organization_name                                                 │
│  │   ├── ... (30+ columns)                                                 │
│  │   ├── email_1_sent, email_2_sent, email_3_sent                         │
│  │   └── created_at, updated_at                                            │
│  │                                                                         │
│  ├── leads_texas                                                           │
│  │   ├── id                                                                │
│  │   ├── email_address                                                     │
│  │   ├── linkedin_url                                                      │
│  │   ├── first_name, last_name                                             │
│  │   ├── solar_panel_interest (UNIQUE TO TEXAS)                           │
│  │   ├── roof_type (UNIQUE TO TEXAS)                                       │
│  │   ├── ... (different columns)                                           │
│  │   ├── email_1_sent, email_2_sent, email_3_sent                         │
│  │   └── created_at, updated_at                                            │
│  │                                                                         │
│  └── leads_california                                                      │
│      └── ... (yet another schema)                                          │
│                                                                            │
│  n8n Query:                                                                │
│  "SELECT * FROM leads_{{CLIENT}} WHERE email_1_sent = false"              │
│                                                                            │
│  Problem: Table name must be injected as variable                          │
│           (SQL injection risk if not handled properly)                     │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Advantages of Per-Client Tables:**

| Advantage                | Details                                    |
| ------------------------ | ------------------------------------------ |
| **Schema Flexibility**   | Each client can have unique columns        |
| **True Data Isolation**  | Physically separate data (beyond RLS)      |
| **Performance at Scale** | Smaller tables = faster queries            |
| **Easy Backup/Restore**  | Can backup one client's data independently |
| **Familiar Pattern**     | Current Ohio setup uses this               |

**Disadvantages of Per-Client Tables:**

| Disadvantage              | Details                                          |
| ------------------------- | ------------------------------------------------ |
| **Table Name Injection**  | n8n workflows need table name as variable        |
| **RLS Complexity**        | Need to create RLS policies for each new table   |
| **Migration Nightmare**   | Schema changes require updating ALL tables       |
| **Provisioning Overhead** | Must CREATE TABLE dynamically                    |
| **Dashboard Complexity**  | API must know which table to query per workspace |

---

#### Option B: Universal Table with Workspace ID

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   UNIVERSAL TABLE + WORKSPACE_ID                           │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Supabase Database                                                         │
│  └── leads (one table for everyone)                                        │
│      ├── id                                                                │
│      ├── workspace_id  ← CRITICAL COLUMN                                  │
│      ├── campaign_id   ← FOR MULTI-CAMPAIGN SUPPORT                       │
│      ├── email_address                                                     │
│      ├── linkedin_url                                                      │
│      ├── first_name, last_name                                             │
│      ├── organization_name                                                 │
│      ├── ... (FIXED core columns that dashboard needs)                     │
│      ├── metadata (JSONB) ← CLIENT-SPECIFIC EXTRAS                        │
│      ├── email_1_sent, email_2_sent, email_3_sent                         │
│      └── created_at, updated_at                                            │
│                                                                            │
│  RLS Policy:                                                               │
│  "Users can only SELECT/UPDATE/DELETE rows where                           │
│   workspace_id = user's current workspace"                                 │
│                                                                            │
│  n8n Query:                                                                │
│  "SELECT * FROM leads                                                      │
│   WHERE workspace_id = '{{$json.workspace_id}}'                            │
│   AND email_1_sent = false"                                                │
│                                                                            │
│  JSONB metadata example for Texas:                                         │
│  {                                                                         │
│    "solar_panel_interest": "high",                                         │
│    "roof_type": "flat",                                                    │
│    "property_value": 450000,                                               │
│    "custom_field_1": "..."                                                 │
│  }                                                                         │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Advantages of Universal Table:**

| Advantage                      | Details                                               |
| ------------------------------ | ----------------------------------------------------- |
| **One Table to Rule Them All** | No dynamic table creation needed                      |
| **Single RLS Policy**          | Set once, works for all clients                       |
| **n8n Simplicity**             | Workflows always query `leads`, just add WHERE clause |
| **Easy Schema Migration**      | ALTER TABLE once, affects everyone                    |
| **Dashboard Simplicity**       | API always queries `leads` with workspace filter      |
| **JSONB Flexibility**          | Client-specific columns go in metadata                |

**Disadvantages of Universal Table:**

| Disadvantage                     | Details                                      |
| -------------------------------- | -------------------------------------------- |
| **Performance at Extreme Scale** | 10M+ rows might slow down                    |
| **JSONB Query Performance**      | Filtering by metadata fields is slower       |
| **No Physical Isolation**        | Logical only (RLS), not physical separation  |
| **GIN Index Requirement**        | Must create indexes on JSONB for performance |
| **Core Schema Lock-in**          | Core columns must work for EVERY client      |

---

#### Option C: Hybrid - Universal Table with Partitioning

```
┌────────────────────────────────────────────────────────────────────────────┐
│                  UNIVERSAL TABLE WITH PARTITIONING                         │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Supabase Database                                                         │
│  └── leads (PARTITIONED BY workspace_id)                                   │
│      ├── leads_partition_ohio                                              │
│      ├── leads_partition_texas                                             │
│      └── leads_partition_california                                        │
│                                                                            │
│  Benefits:                                                                 │
│  ├── Query `leads` table, Postgres auto-routes to correct partition       │
│  ├── Physical isolation for performance                                   │
│  ├── Logical simplicity (one table name in code)                          │
│  └── Can backup/restore individual partitions                             │
│                                                                            │
│  Complexity:                                                               │
│  ├── Partition creation must happen during provisioning                   │
│  ├── Supabase partition support varies                                    │
│  └── More DBA work required                                               │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

#### Column Structure Analysis

Based on the current `leads_ohio` structure embedded in the n8n JSONs, here are the columns:

**Core Columns (Required for Dashboard/Workflows to Function):**

```
id                    → Primary key
email_address         → Required for sending
linkedin_url          → Used as unique identifier in upsert
first_name            → Required for personalization
last_name             → Required for personalization
status                → Workflow state tracking
email_1_sent          → Boolean flag
email_2_sent          → Boolean flag
email_3_sent          → Boolean flag
replied               → Boolean flag
opted_out             → Boolean flag
email_prep            → Boolean flag
report_sent           → Boolean flag
message_id            → Gmail thread tracking
workspace_id          → Multi-tenant filtering
campaign_id           → Multi-campaign support
created_at            → Timestamp
updated_at            → Timestamp
```

**Enrichment Columns (Used by AI prompts, can vary):**

```
organization_name
organization_website
organization_description
organization_linkedin_url
organization_size
organization_specialities
organization_city
organization_state
organization_country
industry
position/seniority
city
state
country
full_name
```

**Generated Columns (Created by workflows):**

```
research_report       → AI-generated research
email_1_subject       → Generated email subject
email_1_body          → Generated email body
email_2_body          → Generated follow-up
email_3_subject       → Generated final subject
email_3_body          → Generated final body
sender_email          → Assigned sender
Token                 → Unsubscribe token
analyze               → Boolean flag for analysis state
```

---

#### Decision 2 Verdict: Recommendation

| Factor                    | Per-Client | Universal    | Partitioned |
| ------------------------- | ---------- | ------------ | ----------- |
| Implementation Simplicity | ✅         | ✅✅✅       | ✅          |
| n8n Workflow Simplicity   | ❌         | ✅✅✅       | ✅✅        |
| Schema Flexibility        | ✅✅✅     | ✅✅ (JSONB) | ✅✅        |
| Query Performance         | ✅✅       | ✅           | ✅✅✅      |
| RLS Management            | ❌         | ✅✅✅       | ✅✅        |
| Physical Isolation        | ✅✅✅     | ❌           | ✅✅✅      |
| Migration Complexity      | ❌         | ✅✅         | ✅          |

**Recommendation: Universal Table (Option B) for MVP**

Reasons:

1. **n8n Simplicity:** Workflows don't need table name injection
2. **Single RLS Policy:** Set once, forget
3. **Dashboard Simplicity:** API is straightforward
4. **JSONB Handles Variance:** Extra columns go in metadata

**Migration Path:**

1. Create `leads` table with core columns + `metadata` JSONB
2. Migrate Ohio data into `leads` with `workspace_id = 'ohio-...'`
3. All new clients use the same table

**Performance Note:** Add GIN index on `metadata` column and standard indexes on `workspace_id` and `campaign_id`.

---

### Decision 3: Campaign Isolation Strategy

#### The Question

When a workspace has multiple campaigns, how are they isolated? Does each campaign get its own 7 workflows, or do all campaigns share workspace-level workflows?

#### Context

The current data model supports:

- 1 Workspace = 1 Client (e.g., "Texas Solar")
- 1 Workspace can have N Campaigns (e.g., "Q1 Roofing", "Q2 Solar Panels", "Q3 Commercial")

Each campaign might have:

- Different target leads
- Different email sequences/prompts
- Different sending schedules
- Different sender accounts

#### Option A: Workflows Per Workspace (Filter by campaign_id)

```
┌────────────────────────────────────────────────────────────────────────────┐
│              WORKFLOWS PER WORKSPACE (Campaign Filtering)                  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Workspace: Texas Solar                                                    │
│  ├── [Texas] Email Preparation    (handles ALL campaigns)                 │
│  ├── [Texas] Email 1              (handles ALL campaigns)                 │
│  ├── [Texas] Email 2              (handles ALL campaigns)                 │
│  ├── [Texas] Email 3              (handles ALL campaigns)                 │
│  ├── [Texas] Reply Tracker        (handles ALL campaigns)                 │
│  ├── [Texas] Opt-Out              (handles ALL campaigns)                 │
│  └── [Texas] Research Report      (handles ALL campaigns)                 │
│                                                                            │
│  How it works:                                                             │
│  ├── Dashboard triggers workflow with: { campaign_id: "q1-roofing" }      │
│  ├── Workflow queries: WHERE campaign_id = {{ $json.campaign_id }}        │
│  └── Same workflow processes different campaigns based on filter          │
│                                                                            │
│  Campaign Config Storage:                                                  │
│  campaigns table:                                                          │
│  ├── id: "q1-roofing"                                                     │
│  │   ├── workspace_id: "texas"                                            │
│  │   ├── prompts: { "email_1_hook": "...", "tone": "aggressive" }         │
│  │   ├── schedule: { "send_time": "9:00 AM", "days": ["MON-FRI"] }        │
│  │   └── sender_email: "john@texassolar.com"                              │
│  └── id: "q2-commercial"                                                  │
│      ├── workspace_id: "texas"                                            │
│      ├── prompts: { "email_1_hook": "...", "tone": "professional" }       │
│      ├── schedule: { "send_time": "10:00 AM", "days": ["MON-FRI"] }       │
│      └── sender_email: "sales@texassolar.com"                             │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Advantages:**

- Fewer workflows to manage (7 per workspace, not 7 per campaign)
- Simpler provisioning (create once per workspace)
- Shared logic/improvements benefit all campaigns

**Disadvantages:**

- Campaign-specific prompts must be fetched at runtime
- Complex conditional logic in workflows
- One bad campaign config could affect others
- Scheduling becomes complex (different times for different campaigns)

---

#### Option B: Workflows Per Campaign (Full Isolation)

```
┌────────────────────────────────────────────────────────────────────────────┐
│              WORKFLOWS PER CAMPAIGN (Full Isolation)                       │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Workspace: Texas Solar                                                    │
│  ├── Campaign: Q1 Roofing                                                 │
│  │   ├── [Q1 Roofing] Email Preparation                                   │
│  │   ├── [Q1 Roofing] Email 1                                             │
│  │   ├── [Q1 Roofing] Email 2                                             │
│  │   ├── [Q1 Roofing] Email 3                                             │
│  │   ├── [Q1 Roofing] Reply Tracker                                       │
│  │   ├── [Q1 Roofing] Opt-Out                                             │
│  │   └── [Q1 Roofing] Research Report                                     │
│  │                                                                         │
│  └── Campaign: Q2 Commercial                                               │
│      ├── [Q2 Commercial] Email Preparation                                │
│      ├── [Q2 Commercial] Email 1                                          │
│      ├── [Q2 Commercial] Email 2                                          │
│      ├── [Q2 Commercial] Email 3                                          │
│      ├── [Q2 Commercial] Reply Tracker                                    │
│      ├── [Q2 Commercial] Opt-Out                                          │
│      └── [Q2 Commercial] Research Report                                  │
│                                                                            │
│  Scaling:                                                                  │
│  10 workspaces × 3 campaigns each × 7 workflows = 210 workflows           │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Advantages:**

- Complete isolation (campaign issues don't affect each other)
- Campaign-specific customization baked in
- Simple debugging (which campaign = which workflow)
- Individual scheduling per campaign

**Disadvantages:**

- Workflow explosion (scales badly with campaign count)
- Provisioning overhead for each new campaign
- Maintenance burden multiplied

---

#### Decision 3 Verdict: Recommendation

**Recommendation: Hybrid Approach**

| Workflow Type     | Scope         | Reasoning                                |
| ----------------- | ------------- | ---------------------------------------- |
| Email Preparation | Per Campaign  | Heavy customization (prompts, AI agents) |
| Email 1, 2, 3     | Per Campaign  | Campaign-specific schedules and content  |
| Reply Tracker     | Per Workspace | Shared inbox, route to correct campaign  |
| Opt-Out           | Per Workspace | Shared unsubscribe page                  |
| Research Report   | Per Workspace | Shared research logic                    |

This gives you:

- **4 workflows per campaign** (Email Prep + 3 Emails) = Customizable
- **3 workflows per workspace** (Reply, Opt-Out, Research) = Shared infrastructure

**For 10 workspaces × 3 campaigns:**

- (4 × 3 campaigns × 10 workspaces) + (3 × 10 workspaces) = 120 + 30 = 150 workflows

Still manageable, and gives you the customization you need.

---

### Decision 4: Playground Scope Definition

#### The Question

What exactly does "Playground" mean? What features should it include?

#### Your Requirements (From Our Conversation)

You said the Playground should be **"all of the above"**:

1. A visual editor for the 7 workflows (like a mini-n8n)
2. A config panel where you fill in placeholders (YOUR\_\* values)
3. A status dashboard showing workflow health/executions
4. Credential management UI
5. Testing/Simulation capabilities

#### Feature Breakdown

##### Layer 1: Workflow Visibility (Read Mode)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    PLAYGROUND - WORKFLOW VISIBILITY                        │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  What Users See:                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐      │
│  │  [Email Prep] → [Email 1] → [Email 2] → [Email 3]               │      │
│  │       ↓              ↓            ↓           ↓                 │      │
│  │  [Research]    [Reply Tracker]  [Opt-Out]                       │      │
│  └─────────────────────────────────────────────────────────────────┘      │
│                                                                            │
│  For each workflow:                                                        │
│  ├── Status indicator (🟢 Active / 🔴 Error / ⚪ Inactive)                │
│  ├── Last execution time                                                   │
│  ├── Success/Failure count (last 24h)                                     │
│  ├── Next scheduled run                                                    │
│  └── Quick actions (Pause / Resume / Trigger Test)                        │
│                                                                            │
│  Implementation:                                                           │
│  ├── n8n API: GET /workflows - List all workflows                         │
│  ├── n8n API: GET /workflows/{id} - Get workflow details                  │
│  ├── n8n API: GET /executions - Get execution history                     │
│  └── Cache results in Supabase for performance                            │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Who Can Access:**

- Super Admin: All workspaces
- Owner: Their workspace only
- Admin: Their workspace only
- Member: View status only (no actions)
- Viewer: No access

---

##### Layer 2: Configuration Panel (Edit Mode)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                  PLAYGROUND - CONFIGURATION PANEL                          │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Variable Configuration UI:                                                │
│  ┌─────────────────────────────────────────────────────────────────┐      │
│  │  Campaign: Q1 Roofing                                           │      │
│  │                                                                  │      │
│  │  ┌─────────────────────────────────────────────────────────┐    │      │
│  │  │  IDENTITY                                                │    │      │
│  │  │  ├── Sender Name:     [John Smith_______________]       │    │      │
│  │  │  ├── Sender Email:    [john@texassolar.com______]       │    │      │
│  │  │  ├── Company Name:    [Texas Solar Solutions____]       │    │      │
│  │  │  └── Calendly Link 1: [https://calendly.com/...._]      │    │      │
│  │  └─────────────────────────────────────────────────────────┘    │      │
│  │                                                                  │      │
│  │  ┌─────────────────────────────────────────────────────────┐    │      │
│  │  │  PROMPTS                                                 │    │      │
│  │  │  ├── Email 1 Hook:    [We noticed your recent...____]   │    │      │
│  │  │  ├── Pain Point 1:    [Missed calls costing you...__]   │    │      │
│  │  │  ├── Tone:            [Aggressive ▼ ]                    │    │      │
│  │  │  └── Offer:           [Free AI Receptionist Demo____]   │    │      │
│  │  └─────────────────────────────────────────────────────────┘    │      │
│  │                                                                  │      │
│  │  ┌─────────────────────────────────────────────────────────┐    │      │
│  │  │  SCHEDULE                                                │    │      │
│  │  │  ├── Daily Limit:     [50________]                       │    │      │
│  │  │  ├── Send Time:       [9:00 AM EST ▼]                    │    │      │
│  │  │  ├── Active Days:     [x] Mon [x] Tue [x] Wed ...       │    │      │
│  │  │  └── Delay Between:   [1 min ▼]                          │    │      │
│  │  └─────────────────────────────────────────────────────────┘    │      │
│  │                                                                  │      │
│  │                           [Save Changes]                         │      │
│  └─────────────────────────────────────────────────────────────────┘      │
│                                                                            │
│  What "Save Changes" Does:                                                 │
│  ├── Updates campaigns table in Supabase with new config                  │
│  ├── Optionally: Pushes changes to n8n workflow variables                 │
│  └── Validates inputs before saving                                       │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Who Can Access:**

- Super Admin: Full edit access
- Owner: Edit campaign config (not workflow structure)
- Admin: Edit limited fields (prompts, schedule)
- Member: No access
- Viewer: No access

---

##### Layer 3: Credential Management

```
┌────────────────────────────────────────────────────────────────────────────┐
│                 PLAYGROUND - CREDENTIAL MANAGEMENT                         │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  THE PROBLEM:                                                              │
│  n8n credentials are stored IN n8n, not in Supabase.                      │
│  The dashboard cannot create or modify n8n credentials directly.          │
│                                                                            │
│  CURRENT OPTIONS:                                                          │
│                                                                            │
│  Option A: Manual Credential Setup (Current)                               │
│  ├── Super Admin logs into n8n UI                                         │
│  ├── Creates credentials manually (Gmail OAuth, OpenAI API Key, etc.)     │
│  ├── Notes down credential IDs                                            │
│  ├── Updates workflow clones to use correct credential IDs                │
│  └── Not scriptable, not automated                                        │
│                                                                            │
│  Option B: Bitwarden/Vault Integration                                     │
│  ├── Credentials stored in Bitwarden as "items"                           │
│  ├── Each workspace = one Bitwarden collection                            │
│  ├── n8n workflows start with Bitwarden node to fetch creds              │
│  ├── Creds are fetched at runtime, never stored in workflow              │
│  ├── Dashboard can manage Bitwarden via API                               │
│  └── Requires SMTP instead of Gmail node (for password injection)         │
│                                                                            │
│  Option C: n8n Credential API (Limited)                                    │
│  ├── n8n has limited API for credential management                        │
│  ├── Can list credentials, but creating requires specific format          │
│  ├── OAuth credentials (like Gmail) cannot be created via API             │
│  ├── Only "simple" credentials (API keys) can be automated                │
│  └── Partial solution at best                                             │
│                                                                            │
│  RECOMMENDED APPROACH:                                                     │
│  Tier 1 (MVP): Manual credential setup remains                            │
│  Tier 2 (Later): Bitwarden integration for sensitive credentials          │
│  Tier 3 (Advanced): Custom credential vault in Supabase                   │
│                                                                            │
│  Dashboard UI for Credential Tracking:                                     │
│  ┌─────────────────────────────────────────────────────────────────┐      │
│  │  Workspace: Texas Solar                                         │      │
│  │                                                                  │      │
│  │  Required Credentials:                                           │      │
│  │  ├── Gmail OAuth       [🟢 Configured]  [Edit in n8n →]         │      │
│  │  ├── Google Sheets     [🟢 Configured]  [Edit in n8n →]         │      │
│  │  ├── OpenAI API        [🟢 Configured]  [Update Key]            │      │
│  │  ├── Relevance AI      [🔴 Missing]     [Configure →]           │      │
│  │  ├── Apify API         [🟡 Expiring]    [Renew →]               │      │
│  │  └── Google CSE        [🟢 Configured]  [Update Key]            │      │
│  │                                                                  │      │
│  │  ⚠️ Some credentials require setup in n8n UI.                   │      │
│  │  Click "Edit in n8n" to open the credential editor.             │      │
│  └─────────────────────────────────────────────────────────────────┘      │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

##### Layer 4: Execution Console (Debug Mode)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                  PLAYGROUND - EXECUTION CONSOLE                            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Live Execution Viewer:                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐      │
│  │  Recent Executions (Email 1 - Q1 Roofing)                       │      │
│  │                                                                  │      │
│  │  ID: exec_12345                                                  │      │
│  │  ├── Status: ✅ Success                                         │      │
│  │  ├── Duration: 4.2s                                             │      │
│  │  ├── Items Processed: 50                                        │      │
│  │  ├── Emails Sent: 48                                            │      │
│  │  ├── Skipped (no email): 2                                      │      │
│  │  └── Time: 9:05 AM Today                                        │      │
│  │                                                                  │      │
│  │  ID: exec_12344                                                  │      │
│  │  ├── Status: ⚠️ Partial Failure                                 │      │
│  │  ├── Duration: 3.8s                                             │      │
│  │  ├── Items Processed: 45                                        │      │
│  │  ├── Errors: 5 (Gmail rate limit)                               │      │
│  │  └── Time: 9:02 AM Today                                        │      │
│  │                                                                  │      │
│  │  [View Details] [Retry Failed] [View in n8n]                    │      │
│  └─────────────────────────────────────────────────────────────────┘      │
│                                                                            │
│  Execution Detail View (Forensics):                                        │
│  ┌─────────────────────────────────────────────────────────────────┐      │
│  │  Execution: exec_12344                                          │      │
│  │                                                                  │      │
│  │  Timeline:                                                       │      │
│  │  ┌──────────┬──────────┬────────────┬─────────────────────────┐ │      │
│  │  │ Node     │ Duration │ Status     │ Output                  │ │      │
│  │  ├──────────┼──────────┼────────────┼─────────────────────────┤ │      │
│  │  │ Schedule │ 0.1s     │ ✅ Success │ Trigger: 9:00 AM EST    │ │      │
│  │  │ Query DB │ 0.3s     │ ✅ Success │ 50 leads fetched        │ │      │
│  │  │ Loop     │ 3.0s     │ ⚠️ Partial │ 45/50 completed         │ │      │
│  │  │ Gmail    │ 2.5s     │ ❌ 5 fails │ Rate limit exceeded     │ │      │
│  │  │ Update   │ 0.4s     │ ✅ Success │ 45 leads updated        │ │      │
│  │  └──────────┴──────────┴────────────┴─────────────────────────┘ │      │
│  │                                                                  │      │
│  │  Error Details:                                                  │      │
│  │  ├── lead_123: "429 Too Many Requests"                          │      │
│  │  ├── lead_124: "429 Too Many Requests"                          │      │
│  │  └── ... (3 more)                                                │      │
│  │                                                                  │      │
│  │  [Retry These 5] [Export Logs] [Copy to Clipboard]              │      │
│  └─────────────────────────────────────────────────────────────────┘      │
│                                                                            │
│  Implementation:                                                           │
│  ├── n8n API: GET /executions?workflowId={id} - List executions           │
│  ├── n8n API: GET /executions/{id} - Get execution details with data     │
│  ├── n8n API: POST /executions/{id}/retry - Retry failed execution       │
│  └── Data sanitization: Strip large binary payloads before display       │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

##### Layer 5: Test Sandbox (Simulation Mode)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   PLAYGROUND - TEST SANDBOX                                │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Purpose:                                                                  │
│  Test a workflow with sample data WITHOUT sending real emails or          │
│  modifying the production database.                                        │
│                                                                            │
│  Test Sandbox UI:                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐      │
│  │  Test Mode: Email 1 Workflow                                    │      │
│  │                                                                  │      │
│  │  ┌─────────────────────────────────────────────────────────┐    │      │
│  │  │  Test Lead Data                                          │    │      │
│  │  │  ├── Email:      [test@example.com______________]       │    │      │
│  │  │  ├── First Name: [John_________________________]        │    │      │
│  │  │  ├── Company:    [Acme Corp____________________]        │    │      │
│  │  │  ├── LinkedIn:   [linkedin.com/in/johndoe______]        │    │      │
│  │  │  └── [Or Upload Test CSV with 5 rows]                   │    │      │
│  │  └─────────────────────────────────────────────────────────┘    │      │
│  │                                                                  │      │
│  │  Output Mode:                                                    │      │
│  │  ├── (•) Dry Run - Show what WOULD happen                       │      │
│  │  ├── ( ) Send to Test Email - Forward to your inbox            │      │
│  │  └── ( ) Live Run - Actually send (DANGER)                      │      │
│  │                                                                  │      │
│  │                    [▶ Run Test]                                  │      │
│  └─────────────────────────────────────────────────────────────────┘      │
│                                                                            │
│  Test Output:                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐      │
│  │  ✅ Test Completed                                              │      │
│  │                                                                  │      │
│  │  Generated Email:                                                │      │
│  │  ├── Subject: "Quick question about Acme's call handling?"     │      │
│  │  ├── Body: [Preview of generated HTML email]                   │      │
│  │  └── Would send to: test@example.com                           │      │
│  │                                                                  │      │
│  │  AI Tokens Used: 1,247 (estimated cost: $0.02)                  │      │
│  │  Execution Time: 2.3s                                           │      │
│  │                                                                  │      │
│  │  [View Full Output JSON] [Copy Email Body]                      │      │
│  └─────────────────────────────────────────────────────────────────┘      │
│                                                                            │
│  Implementation Challenge:                                                 │
│  n8n doesn't have a native "dry run" mode.                                │
│  Options:                                                                  │
│  ├── Create separate "test" workflows that skip final send/save          │
│  ├── Add IF node at end: if $json.test_mode, skip send                   │
│  └── Use n8n's manual execution with test data                           │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

#### Decision 4 Summary: Playground Scope

| Layer | Feature               | Priority | Complexity | Role Access       |
| ----- | --------------------- | -------- | ---------- | ----------------- |
| 1     | Workflow Visibility   | MVP      | Medium     | All except Viewer |
| 2     | Configuration Panel   | MVP      | Medium     | Owner+            |
| 3     | Credential Management | MVP      | High       | Super Admin only  |
| 4     | Execution Console     | Phase 2  | High       | Admin+            |
| 5     | Test Sandbox          | Phase 3  | Very High  | Admin+            |

**MVP Recommendation:**
Focus on Layers 1-3 first. Execution Console and Test Sandbox are valuable but add significant complexity.

---

### Decision 5: Credential Management Strategy

#### The Core Problem

n8n workflows require credentials (Gmail OAuth, API keys, etc.) to function. These credentials are stored inside n8n and are referenced by ID in the workflow JSON.

Example from Email 1.json:

```json
"credentials": {
  "gmailOAuth2": {
    "id": "kThf5Npwf1zJFn9l",
    "name": "YOUR_NAME Gmail account"
  }
}
```

When you clone a workflow for a new client, this credential ID still points to the ORIGINAL credential. You need to:

1. Create new credentials for the new client
2. Get the new credential IDs
3. Update the cloned workflow to use the new IDs

This is a critical blocker for automation.

#### Option A: Manual Credential Setup (Current Approach)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                     MANUAL CREDENTIAL SETUP                                │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Process:                                                                  │
│  1. Super Admin logs into n8n UI                                          │
│  2. Goes to Credentials section                                           │
│  3. Creates each credential manually:                                      │
│     - Gmail OAuth (requires browser OAuth flow)                           │
│     - Google Sheets (requires browser OAuth flow)                         │
│     - OpenAI (paste API key)                                              │
│     - Postgres (paste connection string)                                  │
│     - Relevance AI (paste API key)                                        │
│     - Apify (paste API key)                                               │
│     - Google CSE (paste API key + CX)                                     │
│  4. Notes down all credential IDs                                         │
│  5. Manually edits workflow JSON to replace credential IDs                │
│  6. Activates workflows                                                   │
│                                                                            │
│  Time per client: ~30-60 minutes                                          │
│                                                                            │
│  Pain points:                                                              │
│  - No automation possible for OAuth credentials                           │
│  - Error-prone (wrong ID pasted)                                          │
│  - Time-consuming                                                         │
│  - Can't be done from Dashboard                                           │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

#### Option B: Bitwarden Integration (Runtime Fetch)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                     BITWARDEN INTEGRATION                                  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Concept:                                                                  │
│  Instead of storing credentials IN n8n, store them in Bitwarden.          │
│  Workflows fetch credentials at runtime using the Bitwarden n8n node.     │
│                                                                            │
│  Bitwarden Structure:                                                      │
│  Bitwarden Vault                                                           │
│  ├── Collection: "ohio-workspace"                                         │
│  │   ├── Item: OpenAI API Key                                             │
│  │   ├── Item: Gmail App Password                                         │
│  │   ├── Item: Postgres Connection                                        │
│  │   └── Item: All other API keys                                         │
│  │                                                                         │
│  └── Collection: "texas-workspace"                                         │
│      ├── Item: OpenAI API Key                                             │
│      ├── Item: Gmail App Password                                         │
│      └── ...                                                               │
│                                                                            │
│  Workflow Change:                                                          │
│  Every workflow starts with:                                               │
│  ┌─────────────────────────────────────────────────────────────────┐      │
│  │  [Trigger] → [Bitwarden: Get Items in Collection] → [Continue] │      │
│  │                      ↓                                          │      │
│  │              Credentials now in $json                           │      │
│  │              Use: {{ $json.openai_api_key }}                   │      │
│  └─────────────────────────────────────────────────────────────────┘      │
│                                                                            │
│  CRITICAL LIMITATION:                                                      │
│  Gmail OAuth CANNOT work with Bitwarden.                                  │
│  OAuth requires browser-based authorization flow.                         │
│                                                                            │
│  WORKAROUND:                                                               │
│  Use SMTP node instead of Gmail node.                                     │
│  SMTP accepts: host, port, username, password                             │
│  Store Gmail App Password in Bitwarden.                                   │
│  Inject into SMTP node at runtime.                                        │
│                                                                            │
│  Trade-off:                                                                │
│  ├── ✅ Credentials centralized and encrypted                             │
│  ├── ✅ Dashboard can manage Bitwarden via API                            │
│  ├── ✅ Creds never stored in n8n or workflow JSON                        │
│  ├── ❌ Requires SMTP (no Gmail-specific features)                        │
│  ├── ❌ Extra API call at start of every execution                        │
│  └── ❌ Bitwarden becomes critical dependency                              │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

#### Option C: n8n Variables + Protected Credentials

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   N8N VARIABLES + PROTECTED CREDENTIALS                    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  n8n Variables Feature:                                                    │
│  n8n supports workflow-level and instance-level variables.                │
│  Variables can store non-sensitive config that workflows read.            │
│                                                                            │
│  Variable Example:                                                         │
│  n8n Variables:                                                            │
│  ├── OHIO_SENDER_EMAIL = "john@ohio.com"                                  │
│  ├── OHIO_COMPANY_NAME = "Ohio Construction"                              │
│  ├── OHIO_DAILY_LIMIT = 50                                                │
│  └── TEXAS_SENDER_EMAIL = "sales@texas.com"                               │
│                                                                            │
│  Workflow Usage:                                                           │
│  {{ $vars.OHIO_SENDER_EMAIL }}                                            │
│                                                                            │
│  LIMITATION:                                                               │
│  n8n Variables do NOT support workspace-scoped variables.                 │
│  You'd need: {{ $vars[workspace_id + '_SENDER_EMAIL'] }}                  │
│  This is messy and doesn't scale well.                                    │
│                                                                            │
│  CREDENTIALS STILL NEED MANUAL SETUP:                                     │
│  Variables help with config, but credentials are separate.                │
│  OAuth credentials STILL require manual browser setup.                    │
│                                                                            │
│  Partial Solution:                                                         │
│  ├── Use n8n Variables for non-sensitive values (limits, emails, etc.)   │
│  ├── Keep credentials in n8n with manual setup                            │
│  └── Dashboard tracks credential status but can't modify                  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

#### Option D: Shared Credentials with Workspace Filtering

```
┌────────────────────────────────────────────────────────────────────────────┐
│               SHARED CREDENTIALS WITH WORKSPACE FILTERING                  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Concept:                                                                  │
│  Some credentials CAN be shared across workspaces.                        │
│  Only credentials that are truly client-specific need duplication.        │
│                                                                            │
│  Credential Categories:                                                    │
│                                                                            │
│  1. Platform Credentials (Shared - Super Admin owns)                      │
│     ├── OpenAI API Key (you pay, billed to workspace via dashboard)      │
│     ├── Relevance AI API Key                                              │
│     ├── Apify API Key                                                     │
│     ├── Google CSE API Key                                                │
│     └── Postgres/Supabase connection                                      │
│                                                                            │
│  2. Client Credentials (Per-Workspace)                                    │
│     ├── Gmail OAuth (client's email account)                              │
│     ├── Google Sheets (client's spreadsheet)                              │
│     └── Any client-specific integrations                                  │
│                                                                            │
│  Simplification:                                                           │
│  If YOU provide the AI/API services and bill clients accordingly:         │
│  ├── All workspaces use YOUR OpenAI key                                   │
│  ├── All workspaces use YOUR Relevance AI key                             │
│  ├── Dashboard tracks usage and bills per-workspace                       │
│  └── Only Gmail/Sheets need per-client setup                              │
│                                                                            │
│  This reduces credential setup from 7+ to just 2 per client:              │
│  ├── Gmail OAuth (requires manual browser auth)                           │
│  └── Google Sheets (requires manual browser auth)                         │
│                                                                            │
│  Time per client: ~5-10 minutes instead of 30-60                          │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

#### Decision 5 Verdict: Recommendation

**Recommended Strategy: Option D (Shared + Minimal Per-Client)**

| Credential Type   | Strategy             | Setup Method     |
| ----------------- | -------------------- | ---------------- |
| OpenAI            | Shared (Super Admin) | One-time setup   |
| Relevance AI      | Shared (Super Admin) | One-time setup   |
| Apify             | Shared (Super Admin) | One-time setup   |
| Google CSE        | Shared (Super Admin) | One-time setup   |
| Postgres/Supabase | Shared (Super Admin) | One-time setup   |
| Gmail OAuth       | Per-Workspace        | Manual in n8n UI |
| Google Sheets     | Per-Workspace        | Manual in n8n UI |

**Why This Works:**

1. Reduces credential setup from ~7 per client to ~2 per client
2. You control and bill for AI/API usage centrally
3. Only truly client-specific credentials (their Gmail) need manual setup
4. OAuth credentials can't be automated anyway, so accept this limitation

**Dashboard Role:**

- Track which credentials are configured/missing
- Provide "deep links" to n8n credential setup pages
- Show usage/billing for shared credentials

---

## Data Flow Architecture

This section covers how data moves through the system, with special attention to the complex upload requirements you mentioned.

### Data Flow 1: CSV Lead Upload (Smart Validation)

#### The Complexity You Identified

> "The CSV upload is tricky - there needs to be smart filtering with detection capabilities to ensure it's not just random CSV files being uploaded."

#### Smart CSV Validation System

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    CSV UPLOAD VALIDATION PIPELINE                          │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Step 1: File Type Validation (Frontend)                                   │
│  ├── Accept only .csv files                                               │
│  ├── Max file size: 10MB (configurable)                                   │
│  └── Reject immediately if not CSV                                        │
│                                                                            │
│  Step 2: Parse & Preview (Backend)                                         │
│  ├── Parse first 5 rows for preview                                       │
│  ├── Detect delimiter (comma, tab, semicolon)                             │
│  ├── Extract column headers                                               │
│  └── Return preview to frontend                                           │
│                                                                            │
│  Step 3: Schema Detection & Mapping (The Smart Part)                       │
│  ├── REQUIRED columns for workflow to function:                           │
│  │   ├── email_address (or "email", "Email", "EMAIL")                     │
│  │   ├── linkedin_url (or "LinkedIn", "linkedin_profile")                 │
│  │   └── first_name (or "First Name", "fname")                            │
│  │                                                                         │
│  ├── RECOMMENDED columns (warnings if missing):                           │
│  │   ├── last_name                                                        │
│  │   ├── organization_name / company_name                                 │
│  │   ├── industry                                                         │
│  │   └── position / title                                                 │
│  │                                                                         │
│  ├── AUTOMATIC MAPPING:                                                   │
│  │   ├── Fuzzy match column names to expected schema                      │
│  │   ├── Show mapping preview: "Email" → email_address                    │
│  │   └── Allow manual override if auto-mapping wrong                      │
│  │                                                                         │
│  └── EXTRA COLUMNS:                                                       │
│      ├── Preserve in metadata JSONB                                       │
│      └── Available for AI prompt access                                   │
│                                                                            │
│  Step 4: Data Validation (Row-Level)                                       │
│  ├── Email format validation (regex)                                      │
│  ├── LinkedIn URL format validation                                       │
│  ├── Duplicate detection (email + linkedin_url)                           │
│  ├── Empty required field detection                                       │
│  └── Generate validation report                                           │
│                                                                            │
│  Step 5: Import Confirmation                                               │
│  ├── Show: "500 valid rows, 15 skipped (invalid email)"                   │
│  ├── Show: "12 duplicates will be updated, 488 new"                       │
│  ├── User confirms or cancels                                             │
│  └── On confirm: Bulk upsert to database                                  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

#### CSV Upload Flow Diagram

```
User uploads CSV
       │
       ▼
┌──────────────────┐
│  Frontend Check  │ → Reject if not .csv or too large
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Parse Preview   │ → Show first 5 rows in modal
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Column Mapping  │ → Auto-detect + manual override
│                  │   "Your 'Email' → our 'email_address'"
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Validate Data   │ → Check each row, generate report
│                  │   "15 rows have invalid LinkedIn URLs"
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Confirmation    │ → Show summary, get user OK
│                  │   "Import 485 leads? 15 skipped."
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Bulk Insert     │ → Upsert to `leads` table
│                  │   with workspace_id, campaign_id
└──────────────────┘
```

---

### Data Flow 2: n8n JSON Workflow Upload

#### The Challenge

> "n8n JSON uploads should also be an option but still don't know how that would work."

This is for when YOU (Super Admin) upload your template workflows to the system.

#### n8n JSON Upload Pipeline

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    N8N JSON UPLOAD PIPELINE                                │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Purpose:                                                                  │
│  Super Admin uploads the 7 template JSONs to create a "Blueprint"         │
│  that can be cloned for new clients.                                       │
│                                                                            │
│  Step 1: Upload Interface                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐      │
│  │  Create New Blueprint                                           │      │
│  │                                                                  │      │
│  │  Blueprint Name: [Cold Email System v2_____]                    │      │
│  │                                                                  │      │
│  │  Upload Workflows:                                               │      │
│  │  ├── [Email Preparation.json] ✅ Valid                          │      │
│  │  ├── [Email 1.json] ✅ Valid                                    │      │
│  │  ├── [Email 2.json] ✅ Valid                                    │      │
│  │  ├── [Email 3.json] ✅ Valid                                    │      │
│  │  ├── [Reply Tracker.json] ✅ Valid                              │      │
│  │  ├── [Opt-Out.json] ✅ Valid                                    │      │
│  │  └── [Research Report.json] ✅ Valid                            │      │
│  │                                                                  │      │
│  │  [Validate & Continue]                                           │      │
│  └─────────────────────────────────────────────────────────────────┘      │
│                                                                            │
│  Step 2: JSON Validation                                                   │
│  ├── Is it valid JSON?                                                    │
│  ├── Is it n8n workflow format? (has "nodes", "connections")              │
│  ├── Scan for YOUR_* placeholders - list them                            │
│  ├── Scan for hardcoded values (leads_ohio) - warn                       │
│  └── Check for missing required nodes                                     │
│                                                                            │
│  Step 3: Placeholder Extraction                                            │
│  ├── Parse all nodes looking for YOUR_* patterns                          │
│  ├── Build a list: YOUR_SENDER_EMAIL, YOUR_WEBHOOK_TOKEN, etc.           │
│  ├── Detect table references: "leads_ohio" → needs replacement           │
│  ├── Detect credential references: { id: "xxx" } → needs new ID         │
│  └── Generate "variable_schema" for this blueprint                       │
│                                                                            │
│  Step 4: Store Blueprint                                                   │
│  ├── Save to blueprints table:                                            │
│  │   ├── id: uuid                                                         │
│  │   ├── name: "Cold Email System v2"                                    │
│  │   ├── version: "1.0.0"                                                 │
│  │   ├── workflows_json: [ all 7 JSONs ]                                  │
│  │   ├── variable_schema: { "SENDER_EMAIL": "string", ... }              │
│  │   ├── table_references: ["leads_ohio"]                                │
│  │   ├── credential_references: ["gmailOAuth2", "postgres"]              │
│  │   └── created_at: timestamp                                           │
│  └── Blueprint now available for provisioning                            │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

#### Placeholder Detection Logic

```javascript
// Pseudo-code for extracting placeholders from n8n JSON

function extractPlaceholders(workflowJson) {
  const placeholders = new Set();
  const tableRefs = new Set();
  const credentialRefs = new Set();

  // Recursively scan all string values
  function scanNode(obj) {
    for (const key in obj) {
      if (typeof obj[key] === "string") {
        // Find YOUR_* patterns
        const matches = obj[key].matchAll(/YOUR_[A-Z_]+/g);
        for (const match of matches) {
          placeholders.add(match[0]);
        }

        // Find table references
        if (key === "value" && obj["__rl"] === true) {
          tableRefs.add(obj[key]); // e.g., "leads_ohio"
        }
      } else if (typeof obj[key] === "object") {
        scanNode(obj[key]);
      }
    }
  }

  // Find credential references
  for (const node of workflowJson.nodes) {
    if (node.credentials) {
      for (const credType in node.credentials) {
        credentialRefs.add(credType);
      }
    }
  }

  scanNode(workflowJson);

  return {
    placeholders: Array.from(placeholders),
    tableReferences: Array.from(tableRefs),
    credentialTypes: Array.from(credentialRefs),
  };
}
```

---

### Data Flow 3: Event Tracking (n8n → Dashboard)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    EVENT TRACKING DATA FLOW                                │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Flow: n8n workflow sends event to Dashboard API                          │
│                                                                            │
│  n8n Workflow (Email 1)                                                    │
│       │                                                                    │
│       │ After sending email:                                               │
│       │ POST /api/cost-events                                             │
│       │ {                                                                  │
│       │   "contact_email": "lead@company.com",                            │
│       │   "campaign": "{{ $vars.CAMPAIGN_NAME }}",                        │
│       │   "step": 1,                                                       │
│       │   "event_type": "sent",                                           │
│       │   "provider": "gmail",                                            │
│       │   "workspace_id": "{{ $vars.WORKSPACE_ID }}",                     │
│       │   "campaign_id": "{{ $vars.CAMPAIGN_ID }}"                        │
│       │ }                                                                  │
│       ▼                                                                    │
│  Dashboard API Route                                                       │
│       │                                                                    │
│       │ Validate webhook token                                            │
│       │ Parse event payload                                               │
│       │ Insert into email_events table                                    │
│       │ Update daily_stats aggregation                                    │
│       ▼                                                                    │
│  Supabase (email_events table)                                             │
│       │                                                                    │
│       │ id, workspace_id, campaign_id, event_type, ...                    │
│       ▼                                                                    │
│  Dashboard UI (Real-time via Supabase subscriptions)                       │
│       │                                                                    │
│       │ Analytics charts update                                           │
│       │ Campaign stats refresh                                            │
│       └── User sees new email sent                                        │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Data Flow 4: Provisioning Flow (Database + n8n Creation)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    PROVISIONING DATA FLOW                                  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Trigger: Super Admin clicks "Provision" for workspace                    │
│                                                                            │
│  1. Dashboard (Super Admin Panel)                                          │
│     │                                                                      │
│     │ POST /api/admin/provision                                           │
│     │ {                                                                    │
│     │   workspace_id: "texas-uuid",                                       │
│     │   blueprint_id: "cold-email-v2",                                    │
│     │   variables: {                                                       │
│     │     SENDER_EMAIL: "john@texas.com",                                 │
│     │     COMPANY_NAME: "Texas Solar",                                    │
│     │     ...                                                              │
│     │   }                                                                  │
│     │ }                                                                    │
│     ▼                                                                      │
│  2. Provisioning API                                                       │
│     │                                                                      │
│     │ a) Validate Super Admin permissions                                 │
│     │ b) Load blueprint from blueprints table                             │
│     │ c) Start transaction                                                │
│     │                                                                      │
│     ▼                                                                      │
│  3. Template Processing                                                    │
│     │                                                                      │
│     │ For each workflow JSON in blueprint:                                │
│     │   - Replace YOUR_* placeholders with actual values                  │
│     │   - Replace "leads_ohio" with "leads"                              │
│     │   - Add workspace_id filter to queries                             │
│     │   - Generate unique workflow name [Texas] Email 1                  │
│     │                                                                      │
│     ▼                                                                      │
│  4. n8n API Calls                                                          │
│     │                                                                      │
│     │ For each processed workflow:                                        │
│     │   POST /api/v1/workflows                                           │
│     │   - Create workflow in n8n                                          │
│     │   - Capture returned workflow_id and webhook_url                   │
│     │   - Activate workflow                                               │
│     ▼                                                                      │
│  5. Database Updates                                                       │
│     │                                                                      │
│     │ a) Update workspaces table:                                         │
│     │    - status: "active"                                               │
│     │    - provisioned_at: now()                                          │
│     │                                                                      │
│     │ b) Insert into workspace_workflows:                                 │
│     │    - workspace_id, workflow_type, n8n_workflow_id, webhook_url     │
│     │                                                                      │
│     │ c) Create initial campaign record if needed                        │
│     │                                                                      │
│     ▼                                                                      │
│  6. Response                                                               │
│     │                                                                      │
│     │ Return success with:                                                │
│     │ - List of created workflow IDs                                     │
│     │ - Webhook URLs for each workflow                                   │
│     │ - Next steps (set up credentials)                                  │
│     │                                                                      │
│     └── Owner can now see active dashboard with real data                 │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Provisioning Sequence

This section details the complete step-by-step process from empty workspace to fully operational client.

### Phase A: Workspace Creation (User-Initiated)

```
┌────────────────────────────────────────────────────────────────────────────┐
│             PHASE A: WORKSPACE CREATION (EMPTY SHELL)                      │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Actor: New User (will become Owner)                                       │
│                                                                            │
│  Step 1: User Signs Up                                                     │
│  ├── Via Clerk authentication                                             │
│  ├── Email verification                                                   │
│  └── Profile creation                                                     │
│                                                                            │
│  Step 2: Workspace Creation                                                │
│  ├── User enters workspace name ("Texas Solar")                           │
│  ├── Dashboard creates record in workspaces table:                        │
│  │   {                                                                     │
│  │     id: "uuid-texas",                                                  │
│  │     name: "Texas Solar",                                               │
│  │     status: "pending_provisioning",     ← KEY STATE                    │
│  │     created_by: "user-uuid",                                           │
│  │     created_at: now()                                                  │
│  │   }                                                                     │
│  └── User added to workspace_members as OWNER                             │
│                                                                            │
│  Step 3: What User Sees                                                    │
│  ├── Dashboard shows "Workspace Pending Setup" message                    │
│  ├── No campaigns visible                                                 │
│  ├── No analytics visible                                                 │
│  ├── Settings accessible (limited)                                        │
│  └── Instructions: "Contact admin to complete setup"                      │
│                                                                            │
│  Result: Empty shell workspace awaiting Super Admin action                │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Phase B: Super Admin Approval Gate

```
┌────────────────────────────────────────────────────────────────────────────┐
│              PHASE B: SUPER ADMIN APPROVAL GATE                            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Actor: Super Admin (Platform Owner - You)                                 │
│                                                                            │
│  Step 1: Notification                                                      │
│  ├── Super Admin sees new pending workspace in God Mode                   │
│  ├── Email notification (optional): "New workspace pending: Texas Solar"  │
│  └── Workspace appears in "Pending Provisioning" queue                    │
│                                                                            │
│  Step 2: Review                                                            │
│  ├── Super Admin reviews workspace details                                │
│  ├── Contacts Owner if needed (billing, questions)                        │
│  └── Decides: Approve / Reject / Request Info                            │
│                                                                            │
│  Step 3: Configuration                                                     │
│  ├── Select Blueprint: "Cold Email System v2"                             │
│  ├── Fill in required variables:                                          │
│  │   ├── SENDER_EMAIL: john@texassolar.com                               │
│  │   ├── COMPANY_NAME: Texas Solar Solutions                             │
│  │   ├── CALENDLY_LINK_1: https://calendly.com/john-texas               │
│  │   └── ... (all YOUR_* placeholders)                                   │
│  │                                                                         │
│  └── Review credential requirements:                                       │
│      ├── Gmail OAuth: Will need manual setup                              │
│      ├── Google Sheets: Will need manual setup                            │
│      └── Shared credentials: Already configured                           │
│                                                                            │
│  Step 4: Initiate Provisioning                                             │
│  └── Super Admin clicks "Provision Workspace"                             │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Phase C: Automated Provisioning (The Ignition)

```
┌────────────────────────────────────────────────────────────────────────────┐
│              PHASE C: AUTOMATED PROVISIONING                               │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Actor: System (Genesis Engine)                                            │
│  Triggered by: Super Admin clicking "Provision"                            │
│                                                                            │
│  Step 1: Update Workspace Status                                           │
│  └── UPDATE workspaces SET status = 'provisioning' WHERE id = 'texas'     │
│                                                                            │
│  Step 2: Database Setup                                                    │
│  ├── No table creation needed (Universal Table approach)                  │
│  ├── Verify `leads` table exists with RLS                                 │
│  ├── Verify workspace_id filter will work                                 │
│  └── Log: "Database ready for workspace: texas"                           │
│                                                                            │
│  Step 3: n8n Workflow Creation (7 loops)                                   │
│  FOR EACH workflow in blueprint:                                           │
│  │                                                                         │
│  │  3.1 Load template JSON from blueprint                                 │
│  │  3.2 Process template:                                                 │
│  │      ├── Replace YOUR_SENDER_EMAIL → "john@texassolar.com"            │
│  │      ├── Replace YOUR_COMPANY_NAME → "Texas Solar Solutions"          │
│  │      ├── Replace YOUR_DASHBOARD_URL → "https://app.yourdomain.com"    │
│  │      ├── Replace "leads_ohio" → "leads"                               │
│  │      ├── Add workspace_id filter to all DB queries                    │
│  │      ├── Set unique workflow name: "[Texas] Email 1"                  │
│  │      └── Keep credential references (will update later)               │
│  │                                                                         │
│  │  3.3 Call n8n API: POST /api/v1/workflows                              │
│  │      Request: { name: "[Texas] Email 1", nodes: [...], ... }          │
│  │      Response: { id: "wfl_n8n_12345", active: false }                 │
│  │                                                                         │
│  │  3.4 Get webhook URL (if workflow has webhook trigger)                │
│  │      Call: GET /api/v1/workflows/wfl_n8n_12345                        │
│  │      Extract: webhookUrl from trigger node                            │
│  │                                                                         │
│  │  3.5 Store in Supabase:                                                │
│  │      INSERT INTO workspace_workflows                                   │
│  │      (workspace_id, workflow_type, n8n_id, webhook_url, status)       │
│  │      VALUES ('texas', 'email_1', 'wfl_12345', 'https://...', 'created')│
│  │                                                                         │
│  END FOR                                                                   │
│                                                                            │
│  Step 4: Verify Creation                                                   │
│  ├── Confirm 7 workflows exist in n8n                                     │
│  ├── Confirm all webhook URLs captured                                    │
│  └── Run quick health check (optional)                                    │
│                                                                            │
│  Step 5: Update Workspace Status                                           │
│  ├── UPDATE workspaces SET                                                │
│  │   status = 'pending_credentials',                                      │
│  │   provisioned_at = now(),                                              │
│  │   blueprint_id = 'cold-email-v2',                                      │
│  │   blueprint_version = '1.0.0'                                          │
│  └── Log: "Provisioning complete, awaiting credential setup"              │
│                                                                            │
│  Step 6: Notify Super Admin                                                │
│  └── Show: "Provisioning complete! Set up Gmail credentials to activate." │
│                                                                            │
│  Time Expected: ~30-60 seconds for 7 workflows                            │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Phase D: Credential Setup (Manual)

```
┌────────────────────────────────────────────────────────────────────────────┐
│              PHASE D: CREDENTIAL SETUP (MANUAL)                            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Actor: Super Admin                                                        │
│  Why Manual: Gmail OAuth requires browser-based authorization             │
│                                                                            │
│  Step 1: Navigate to n8n                                                   │
│  ├── Dashboard shows "Set up credentials" link                            │
│  └── Opens n8n at credentials page (deep link)                            │
│                                                                            │
│  Step 2: Create Gmail OAuth Credential                                     │
│  ├── In n8n: Create New Credential → Gmail OAuth2                         │
│  ├── Name: "Texas Solar Gmail"                                            │
│  ├── Click "Sign in with Google"                                          │
│  ├── Complete OAuth flow in browser                                       │
│  └── Save credential (n8n assigns ID: "cred_xyz123")                      │
│                                                                            │
│  Step 3: Update Workflows to Use New Credential                            │
│  ├── For each [Texas] workflow that uses Gmail:                           │
│  │   ├── Open workflow in n8n                                             │
│  │   ├── Edit Gmail node                                                  │
│  │   ├── Select "Texas Solar Gmail" credential                           │
│  │   └── Save workflow                                                    │
│  │                                                                         │
│  └── Repeat for Google Sheets if needed                                   │
│                                                                            │
│  Step 4: Activate Workflows                                                │
│  ├── In n8n: Toggle each [Texas] workflow to "Active"                    │
│  └── n8n starts listening on webhooks and schedules                       │
│                                                                            │
│  Step 5: Update Dashboard                                                  │
│  ├── Back in Dashboard, mark credentials as configured                    │
│  ├── Trigger credential verification (send test email)                    │
│  └── UPDATE workspaces SET status = 'active' WHERE id = 'texas'          │
│                                                                            │
│  Time Expected: 5-10 minutes                                              │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Phase E: Client Handoff

```
┌────────────────────────────────────────────────────────────────────────────┐
│              PHASE E: CLIENT HANDOFF                                       │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Actor: Super Admin → Owner                                                │
│                                                                            │
│  Step 1: Final Verification                                                │
│  ├── Run test email send (to test address)                                │
│  ├── Verify tracking events appear in dashboard                           │
│  └── Confirm all workflows are active                                     │
│                                                                            │
│  Step 2: Notify Owner                                                      │
│  ├── Email: "Your workspace is ready!"                                    │
│  ├── Include: Login link, getting started guide                           │
│  └── Dashboard shows "Workspace Active" status                            │
│                                                                            │
│  Step 3: Owner Onboarding                                                  │
│  ├── Owner logs in, sees active dashboard                                 │
│  ├── Owner can now:                                                       │
│  │   ├── Upload leads (CSV)                                               │
│  │   ├── View analytics                                                   │
│  │   ├── See workflow execution status                                    │
│  │   └── Invite team members                                              │
│  └── First campaign can begin                                             │
│                                                                            │
│  Total Time from Signup to Active:                                         │
│  ├── Automated: ~2 minutes                                                │
│  ├── Manual (credentials): ~10 minutes                                    │
│  ├── Admin review time: Variable                                          │
│  └── TOTAL: ~15-30 minutes (vs 4-8 hours before)                          │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Provisioning State Machine

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    WORKSPACE STATE MACHINE                                 │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│                          ┌─────────────────┐                              │
│                          │    CREATED      │                              │
│                          │  (Empty Shell)  │                              │
│                          └────────┬────────┘                              │
│                                   │ Super Admin initiates                 │
│                                   ▼                                        │
│                          ┌─────────────────┐                              │
│                          │  PROVISIONING   │                              │
│                          │ (In Progress)   │                              │
│                          └────────┬────────┘                              │
│                                   │                                        │
│                     ┌─────────────┴─────────────┐                         │
│                     │                           │                          │
│                     ▼                           ▼                          │
│          ┌─────────────────┐         ┌─────────────────┐                  │
│          │ PENDING_CREDS   │         │     ERROR       │                  │
│          │ (Needs Setup)   │         │ (Failed)        │                  │
│          └────────┬────────┘         └────────┬────────┘                  │
│                   │ Credentials set           │ Retry                     │
│                   ▼                           │                           │
│          ┌─────────────────┐                  │                           │
│          │     ACTIVE      │◄─────────────────┘                           │
│          │  (Operational)  │                                              │
│          └────────┬────────┘                                              │
│                   │ Deactivate                                            │
│                   ▼                                                        │
│          ┌─────────────────┐                                              │
│          │   SUSPENDED     │                                              │
│          │ (Paused)        │                                              │
│          └─────────────────┘                                              │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Role Permission Matrix

This section defines exactly what each role can do across all system layers.

### Role Hierarchy

```
SUPER_ADMIN (Platform Owner)
       │
       ▼
    OWNER (Workspace Creator)
       │
       ▼
    ADMIN (Elevated Team Member)
       │
       ▼
   MEMBER (Standard User)
       │
       ▼
   VIEWER (Read-Only)
```

---

### Permission Matrix: Dashboard Layer

| Action                    | Super Admin | Owner  |     Admin     | Member | Viewer |
| ------------------------- | :---------: | :----: | :-----------: | :----: | :----: |
| **View Analytics**        |   ✅ All    | ✅ Own |    ✅ Own     | ✅ Own | ✅ Own |
| **Export Data**           |     ✅      |   ✅   |      ✅       |   ❌   |   ❌   |
| **View Campaigns**        |   ✅ All    | ✅ Own |    ✅ Own     | ✅ Own | ✅ Own |
| **Create Campaign**       |     ✅      |   ✅   |      ✅       |   ❌   |   ❌   |
| **Edit Campaign**         |     ✅      |   ✅   |      ✅       |   ❌   |   ❌   |
| **Delete Campaign**       |     ✅      |   ✅   |      ❌       |   ❌   |   ❌   |
| **View Contacts**         |     ✅      |   ✅   |      ✅       |   ✅   |   ✅   |
| **Upload Leads (CSV)**    |     ✅      |   ✅   |      ✅       |   ❌   |   ❌   |
| **Edit Contact**          |     ✅      |   ✅   |      ✅       |   ❌   |   ❌   |
| **Delete Contact**        |     ✅      |   ✅   |      ❌       |   ❌   |   ❌   |
| **View Sequences**        |     ✅      |   ✅   |      ✅       |   ✅   |   ✅   |
| **Pause/Resume Sequence** |     ✅      |   ✅   |      ✅       |   ❌   |   ❌   |
| **Access Settings**       |     ✅      |   ✅   |  ⚠️ Limited   |   ❌   |   ❌   |
| **Invite Members**        |     ✅      |   ✅   | ⚠️ Same/Below |   ❌   |   ❌   |
| **Remove Members**        |     ✅      |   ✅   |      ❌       |   ❌   |   ❌   |
| **Change Member Roles**   |     ✅      |   ✅   |      ❌       |   ❌   |   ❌   |
| **Access God Mode**       |     ✅      |   ❌   |      ❌       |   ❌   |   ❌   |
| **Switch Workspaces**     |   ✅ All    | ✅ Own |    ✅ Own     | ✅ Own | ✅ Own |

---

### Permission Matrix: Playground Layer

| Action                     | Super Admin | Owner  |   Admin    |   Member   | Viewer |
| -------------------------- | :---------: | :----: | :--------: | :--------: | :----: |
| **View Workflow Status**   |   ✅ All    | ✅ Own |   ✅ Own   |   ✅ Own   |   ❌   |
| **View Execution History** |     ✅      |   ✅   |     ✅     | ⚠️ Summary |   ❌   |
| **View Execution Details** |     ✅      |   ✅   |     ✅     |     ❌     |   ❌   |
| **Edit Campaign Config**   |     ✅      |   ✅   | ⚠️ Limited |     ❌     |   ❌   |
| **Edit Prompts**           |     ✅      |   ✅   |     ✅     |     ❌     |   ❌   |
| **Edit Schedule**          |     ✅      |   ✅   |     ✅     |     ❌     |   ❌   |
| **Edit Identity**          |     ✅      |   ✅   |     ❌     |     ❌     |   ❌   |
| **Pause Workflow**         |     ✅      |   ✅   |     ✅     |     ❌     |   ❌   |
| **Resume Workflow**        |     ✅      |   ✅   |     ✅     |     ❌     |   ❌   |
| **Trigger Test Run**       |     ✅      |   ✅   |     ✅     |     ❌     |   ❌   |
| **View Credential Status** |     ✅      |   ✅   | ⚠️ Masked  |     ❌     |   ❌   |
| **Edit Credentials**       |     ✅      |   ❌   |     ❌     |     ❌     |   ❌   |
| **Retry Failed Execution** |     ✅      |   ✅   |     ✅     |     ❌     |   ❌   |

---

### Permission Matrix: n8n Direct Access

| Action                   | Super Admin | Owner | Admin | Member | Viewer |
| ------------------------ | :---------: | :---: | :---: | :----: | :----: |
| **Login to n8n UI**      |     ✅      |  ❌   |  ❌   |   ❌   |   ❌   |
| **View Any Workflow**    |     ✅      |  ❌   |  ❌   |   ❌   |   ❌   |
| **Edit Any Workflow**    |     ✅      |  ❌   |  ❌   |   ❌   |   ❌   |
| **Delete Workflow**      |     ✅      |  ❌   |  ❌   |   ❌   |   ❌   |
| **Create Credentials**   |     ✅      |  ❌   |  ❌   |   ❌   |   ❌   |
| **View n8n Variables**   |     ✅      |  ❌   |  ❌   |   ❌   |   ❌   |
| **Run Manual Execution** |     ✅      |  ❌   |  ❌   |   ❌   |   ❌   |

**Note:** Only Super Admin has direct n8n access. All other roles interact via Dashboard Playground.

---

### Permission Matrix: Database Layer (via API)

| Action                         | Super Admin | Owner  | Admin  | Member | Viewer |
| ------------------------------ | :---------: | :----: | :----: | :----: | :----: |
| **Query Own Workspace Data**   |     ✅      |   ✅   |   ✅   |   ✅   |   ✅   |
| **Query Other Workspace Data** | ✅ (Admin)  | ❌ RLS | ❌ RLS | ❌ RLS | ❌ RLS |
| **Insert Leads**               |     ✅      |   ✅   |   ✅   |   ❌   |   ❌   |
| **Update Leads**               |     ✅      |   ✅   |   ✅   |   ❌   |   ❌   |
| **Delete Leads**               |     ✅      |   ✅   |   ❌   |   ❌   |   ❌   |
| **Create Campaign Records**    |     ✅      |   ✅   |   ✅   |   ❌   |   ❌   |
| **View Audit Logs**            |     ✅      |   ✅   |   ❌   |   ❌   |   ❌   |

**Note:** RLS = Row Level Security prevents access at database level.

---

### Permission Matrix: Provisioning

| Action                       | Super Admin |       Owner        | Admin | Member | Viewer |
| ---------------------------- | :---------: | :----------------: | :---: | :----: | :----: |
| **Create Workspace**         |     ✅      | (Creates as Owner) |  ❌   |   ❌   |   ❌   |
| **View Pending Workspaces**  |     ✅      |         ❌         |  ❌   |   ❌   |   ❌   |
| **Approve Workspace**        |     ✅      |         ❌         |  ❌   |   ❌   |   ❌   |
| **Reject Workspace**         |     ✅      |         ❌         |  ❌   |   ❌   |   ❌   |
| **Configure Blueprint**      |     ✅      |         ❌         |  ❌   |   ❌   |   ❌   |
| **Trigger Provisioning**     |     ✅      |         ❌         |  ❌   |   ❌   |   ❌   |
| **View Provisioning Status** |     ✅      |      ✅ (Own)      |  ❌   |   ❌   |   ❌   |
| **Suspend Workspace**        |     ✅      |         ❌         |  ❌   |   ❌   |   ❌   |
| **Delete Workspace**         |     ✅      |         ❌         |  ❌   |   ❌   |   ❌   |
| **Upload n8n Templates**     |     ✅      |         ❌         |  ❌   |   ❌   |   ❌   |
| **Create Blueprint**         |     ✅      |         ❌         |  ❌   |   ❌   |   ❌   |

---

## Unknowns and Gap Analysis

This section catalogs all the unresolved questions, technical risks, and gaps that need to be addressed before or during implementation.

### Critical Unknown 1: The Webhook URL Paradox

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    THE WEBHOOK URL PARADOX                                 │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  THE PROBLEM:                                                              │
│                                                                            │
│  When you create a workflow in n8n via API that contains a webhook        │
│  trigger, the webhook URL is generated AFTER creation.                    │
│                                                                            │
│  Timeline:                                                                 │
│  1. Dashboard calls: POST /api/v1/workflows (with webhook trigger node)   │
│  2. n8n creates workflow, assigns ID: "wfl_12345"                         │
│  3. Webhook URL is: https://n8n.yourdomain.com/webhook/wfl_12345/...     │
│  4. Dashboard needs this URL to store in Supabase for future calls       │
│  5. How does Dashboard discover this URL?                                 │
│                                                                            │
│  POTENTIAL SOLUTIONS:                                                      │
│                                                                            │
│  Solution A: Query After Create (Preferred)                                │
│  ├── After POST /workflows, immediately GET /workflows/{id}              │
│  ├── Parse response to find webhook trigger node                          │
│  ├── Extract `webhookId` or full URL from node parameters                │
│  └── Store in Supabase                                                    │
│                                                                            │
│  Verification Needed:                                                      │
│  ├── Does n8n API return webhookId in workflow GET response?             │
│  ├── Is the URL predictable from workflow ID + settings?                 │
│  └── Test: Create workflow via API, inspect response structure           │
│                                                                            │
│  Solution B: Self-Registration (Fallback)                                  │
│  ├── Template includes "registration" node at start                       │
│  ├── On activation, workflow calls Dashboard API with its own URL        │
│  ├── Dashboard receives: { workflow_id, webhook_url }                    │
│  ├── Dashboard stores in Supabase                                         │
│  └── Con: Adds complexity to every template                               │
│                                                                            │
│  Status: 🔴 NEEDS INVESTIGATION                                           │
│                                                                            │
│  Action Item:                                                              │
│  1. Create test workflow via n8n API with webhook trigger                │
│  2. Inspect full response JSON                                            │
│  3. Document where webhook URL is located                                 │
│  4. Decide on solution approach                                           │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Critical Unknown 2: Credential ID Assignment

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    CREDENTIAL ID ASSIGNMENT                                │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  THE PROBLEM:                                                              │
│                                                                            │
│  Template workflows contain hardcoded credential IDs:                     │
│  "gmailOAuth2": { "id": "kThf5Npwf1zJFn9l", ... }                         │
│                                                                            │
│  When you clone a template for Texas, this ID still points to the         │
│  ORIGINAL credential (from Ohio), not Texas's Gmail.                      │
│                                                                            │
│  THE QUESTION:                                                             │
│                                                                            │
│  How do we update the workflow JSON to reference the NEW credential       │
│  after manual setup?                                                       │
│                                                                            │
│  POTENTIAL SOLUTIONS:                                                      │
│                                                                            │
│  Solution A: Leave Placeholder, Update Manually                            │
│  ├── During provisioning, set credential ID to a placeholder value       │
│  ├── After Super Admin creates new cred, manually edit workflow in n8n   │
│  ├── Select correct credential from dropdown                              │
│  ├── Save workflow                                                        │
│  └── Con: Adds manual step, error-prone                                   │
│                                                                            │
│  Solution B: n8n API Update                                                │
│  ├── Super Admin creates credential in n8n UI                             │
│  ├── Dashboard calls: GET /credentials to list credentials               │
│  ├── Dashboard shows dropdown: "Select Gmail credential for Texas"       │
│  ├── Super Admin selects, Dashboard calls:                                │
│  │   PATCH /workflows/{id} with updated credential references            │
│  └── Pro: Dashboard-driven, less n8n UI interaction                      │
│                                                                            │
│  Verification Needed:                                                      │
│  ├── Does n8n API support PATCH for workflow nodes?                      │
│  ├── Can we update just the credential reference without full JSON?      │
│  ├── Does GET /credentials return usable credential IDs?                 │
│  └── Test: Try updating credential reference via API                      │
│                                                                            │
│  Solution C: Remove Credential from Templates                              │
│  ├── Template workflows have NO credentials assigned                      │
│  ├── After provisioning, workflows are inactive (missing creds)          │
│  ├── Super Admin MUST go to n8n to add credentials                       │
│  ├── Workflow won't activate until creds are set                         │
│  └── Pro: Simpler templates, forces credential setup                     │
│                                                                            │
│  Status: 🔴 NEEDS INVESTIGATION                                           │
│                                                                            │
│  Action Item:                                                              │
│  1. Test n8n credential API endpoints                                     │
│  2. Test updating workflow credentials via API                            │
│  3. Decide if templates should have credentials or be blank              │
│  4. Document credential update flow                                       │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Critical Unknown 3: n8n API Limitations

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    N8N API LIMITATIONS                                     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  THE PROBLEM:                                                              │
│                                                                            │
│  We're relying on n8n API for:                                            │
│  - Creating workflows                                                      │
│  - Activating/deactivating workflows                                      │
│  - Getting execution history                                              │
│  - Potentially updating credentials                                        │
│                                                                            │
│  We don't have complete knowledge of what's possible/limited.             │
│                                                                            │
│  QUESTIONS TO ANSWER:                                                      │
│                                                                            │
│  1. Workflow Operations                                                    │
│     ├── Can we create workflows with the full JSON structure?            │
│     ├── Are there size limits on workflow JSON?                          │
│     ├── Can we update individual nodes without replacing entire JSON?    │
│     └── Can we duplicate/clone a workflow via API?                       │
│                                                                            │
│  2. Credential Operations                                                  │
│     ├── Can we list all credentials?                                     │
│     ├── Can we create credentials via API? (Probably not OAuth)          │
│     ├── Can we delete credentials?                                        │
│     └── Can we associate credentials with workflows via API?             │
│                                                                            │
│  3. Execution Operations                                                   │
│     ├── What data is returned in execution history?                      │
│     ├── Can we get detailed node-by-node execution data?                 │
│     ├── Is there pagination for execution history?                       │
│     └── Can we trigger manual execution via API?                         │
│                                                                            │
│  4. Variable Operations                                                    │
│     ├── Can we set workflow-level variables via API?                     │
│     ├── Can we set instance-level variables via API?                     │
│     └── How are variables scoped in multi-tenant scenario?               │
│                                                                            │
│  5. Rate Limits                                                            │
│     ├── Does n8n API have rate limits?                                   │
│     ├── What happens if we create 50 workflows quickly?                  │
│     └── Are there concurrent execution limits?                           │
│                                                                            │
│  Status: 🔴 NEEDS INVESTIGATION                                           │
│                                                                            │
│  Action Item:                                                              │
│  1. Read n8n API documentation thoroughly                                 │
│  2. Set up test n8n instance                                              │
│  3. Test each operation we plan to use                                    │
│  4. Document findings with examples                                       │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Critical Unknown 4: Ohio Migration Strategy

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    OHIO MIGRATION STRATEGY                                 │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  THE PROBLEM:                                                              │
│                                                                            │
│  Ohio is currently live and working. It uses:                             │
│  - `leads_ohio` table (hardcoded in n8n workflows)                        │
│  - 7 workflows with Ohio-specific credentials                             │
│  - Active campaigns and tracking                                          │
│                                                                            │
│  We need to migrate to the new architecture WITHOUT breaking Ohio.        │
│                                                                            │
│  MIGRATION OPTIONS:                                                        │
│                                                                            │
│  Option A: Leave Ohio As-Is (Short Term)                                   │
│  ├── Don't touch current Ohio setup                                       │
│  ├── Build new system for future clients                                  │
│  ├── Eventually migrate Ohio when system is stable                       │
│  ├── Pro: Zero risk to production                                         │
│  └── Con: Two systems to maintain                                         │
│                                                                            │
│  Option B: Migrate Ohio Data Only                                          │
│  ├── Create new `leads` table (universal)                                 │
│  ├── Copy Ohio data: INSERT INTO leads SELECT * FROM leads_ohio          │
│  ├── Keep Ohio n8n workflows pointing to leads_ohio                       │
│  ├── New system reads from `leads` table                                  │
│  ├── Pro: Dashboard can see Ohio data in new format                       │
│  └── Con: Data in two places, sync issues                                 │
│                                                                            │
│  Option C: Full Ohio Migration                                             │
│  ├── Create `leads` table                                                 │
│  ├── Migrate Ohio data with workspace_id = 'ohio-uuid'                   │
│  ├── Update all 7 Ohio workflows to query `leads` with workspace filter  │
│  ├── Test thoroughly                                                      │
│  ├── Delete old `leads_ohio` table                                        │
│  ├── Pro: Clean architecture                                              │
│  └── Con: Risk of breaking live system, requires careful testing         │
│                                                                            │
│  RECOMMENDED: Option A → Option C                                          │
│  ├── Phase 1: Leave Ohio untouched, build new system                      │
│  ├── Phase 2: Onboard 1-2 new clients on new system                       │
│  ├── Phase 3: Once stable, migrate Ohio                                   │
│  └── Phase 4: Decommission leads_ohio                                     │
│                                                                            │
│  Status: 🟡 NEEDS DECISION                                                │
│                                                                            │
│  Action Item:                                                              │
│  1. Decide on migration timeline                                          │
│  2. Create rollback plan for Ohio                                         │
│  3. Schedule migration during low-activity period                         │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Technical Risk 1: JSONB Query Performance

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    JSONB QUERY PERFORMANCE                                 │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  THE CONCERN:                                                              │
│                                                                            │
│  If we use a Universal Table with JSONB for custom columns,               │
│  queries on metadata fields could be slow at scale.                       │
│                                                                            │
│  Example slow query:                                                       │
│  SELECT * FROM leads                                                       │
│  WHERE workspace_id = 'texas'                                             │
│  AND metadata->>'solar_panel_interest' = 'high'                           │
│  ORDER BY created_at DESC                                                  │
│  LIMIT 100;                                                               │
│                                                                            │
│  MITIGATION:                                                               │
│                                                                            │
│  1. GIN Index on JSONB                                                     │
│     CREATE INDEX idx_leads_metadata ON leads USING GIN (metadata);        │
│                                                                            │
│  2. Composite Index                                                        │
│     CREATE INDEX idx_leads_workspace_created                               │
│     ON leads (workspace_id, created_at DESC);                             │
│                                                                            │
│  3. Expression Index (for common queries)                                  │
│     CREATE INDEX idx_leads_solar_interest                                  │
│     ON leads ((metadata->>'solar_panel_interest'))                        │
│     WHERE metadata->>'solar_panel_interest' IS NOT NULL;                  │
│                                                                            │
│  4. Partition if Needed                                                    │
│     If table exceeds 10M rows, consider partitioning by workspace_id      │
│                                                                            │
│  Status: 🟡 MONITORING NEEDED                                             │
│                                                                            │
│  Action Item:                                                              │
│  1. Set up proper indexes from day one                                    │
│  2. Monitor query performance as data grows                               │
│  3. Have partition plan ready for scale                                   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Technical Risk 2: n8n Instance Limits

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    N8N INSTANCE LIMITS                                     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  THE CONCERN:                                                              │
│                                                                            │
│  With Clone model: 10 clients × 7 workflows = 70 workflows                │
│  With 50 clients: 350 workflows                                           │
│  With 100 clients: 700 workflows                                          │
│                                                                            │
│  Questions:                                                                │
│  ├── What are n8n's limits on active workflows?                          │
│  ├── What's the memory/CPU impact of many active workflows?              │
│  ├── Do scheduled workflows consume resources when idle?                 │
│  └── Is there a license limit on workflow count?                         │
│                                                                            │
│  MITIGATION:                                                               │
│                                                                            │
│  1. Optimize n8n hosting (enough RAM/CPU)                                 │
│  2. Use queue-based execution (not direct)                                │
│  3. Consider separate n8n instances per tier (Enterprise vs Standard)    │
│  4. Implement workflow activation/deactivation for idle campaigns        │
│                                                                            │
│  Status: 🟡 NEEDS INVESTIGATION                                           │
│                                                                            │
│  Action Item:                                                              │
│  1. Check n8n documentation for limits                                    │
│  2. Test 100+ workflow scenario in staging                                │
│  3. Monitor resource usage                                                │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Gap 1: Template Versioning & Update Propagation

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    TEMPLATE VERSIONING                                     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  THE GAP:                                                                  │
│                                                                            │
│  When we update a template (e.g., fix a bug in Email 1 logic),            │
│  how do we push that update to existing client workflows?                 │
│                                                                            │
│  Current state:                                                            │
│  ├── Blueprint v1.0.0 deployed to Ohio                                   │
│  ├── Bug found in Email 1 node                                            │
│  ├── Create Blueprint v1.0.1 with fix                                    │
│  ├── Texas provisioned with v1.0.1 (good)                                │
│  └── Ohio still on v1.0.0 with bug (bad)                                 │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

#### The Good News: n8n Workflows ARE Updatable

n8n API supports updating workflows in-place:

```bash
# Update entire workflow via n8n API
PUT /api/v1/workflows/{workflow_id}
Content-Type: application/json
X-N8N-API-KEY: your-key

{
  "name": "[Ohio] Email 1",
  "nodes": [...updated nodes...],
  "connections": {...},
  "settings": {...},
  "active": true
}
```

**The key challenge:** Preserve client-specific values (credentials, custom prompts, identity info) while updating the logic/structure.

#### Solution 1: Dashboard-Assisted Update UI (Recommended)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Blueprint Updates Available                                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  📦 Email 1 Template                                                     │
│     v1.0.0 → v1.0.1                                                     │
│     "Fixed Gmail rate limit handling, improved error messages"          │
│                                                                          │
│  Affected Workspaces:                                                    │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ ☑ Ohio        │ [Ohio] Email 1        │ Currently v1.0.0       │   │
│  │ ☑ Texas       │ [Texas] Email 1       │ Currently v1.0.0       │   │
│  │ ☑ California  │ [California] Email 1  │ Currently v1.0.0       │   │
│  │ ☐ New York    │ [NY] Email 1          │ Currently v1.0.1 ✓     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  [Preview Changes]   [Apply Update to Selected]                          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**How it works:**

```
When Super Admin clicks "Apply Update to Selected":

1. Dashboard loads new template JSON (v1.0.1)

2. For each selected workspace:
   ├── GET /workflows/{id} → Fetch current workflow from n8n
   ├── Extract client-specific values:
   │   ├── Credentials (Gmail, Postgres IDs)
   │   ├── Identity values (sender name, company name)
   │   └── Custom prompts (if stored in workflow)
   ├── Merge: New template + Preserved client values
   ├── PUT /workflows/{id} → Update workflow in n8n
   └── Update workspace_workflows.blueprint_version in Supabase

3. Dashboard shows success/failure for each workspace
```

**Database support:**

```sql
-- Track deployed versions
ALTER TABLE workspace_workflows
ADD COLUMN blueprint_version TEXT DEFAULT '1.0.0';

-- Track available blueprints
CREATE TABLE blueprints (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  workflow_json JSONB NOT NULL,
  variable_schema JSONB,
  changelog TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Solution 2: CLI Script for Batch Updates

For cases where you want to run updates from terminal:

```bash
#!/bin/bash
# update_workflow.sh - Push template update to multiple workspaces

TEMPLATE_FILE=$1
WORKSPACES=$2  # comma-separated: "ohio,texas,california"

# Load template
TEMPLATE=$(cat "$TEMPLATE_FILE")

for WORKSPACE in ${WORKSPACES//,/ }; do
  echo "Updating $WORKSPACE..."

  # Get current workflow (to preserve credentials)
  CURRENT=$(curl -s "$N8N_URL/api/v1/workflows/$WORKFLOW_ID" \
    -H "X-N8N-API-KEY: $N8N_API_KEY")

  # Extract credentials from current
  CREDS=$(echo "$CURRENT" | jq '.nodes[].credentials')

  # Merge template with preserved creds
  MERGED=$(echo "$TEMPLATE" | jq --argjson creds "$CREDS" '
    .nodes |= map(
      if .credentials then .credentials = $creds[.type] else . end
    )
  ')

  # Update workflow
  curl -X PUT "$N8N_URL/api/v1/workflows/$WORKFLOW_ID" \
    -H "X-N8N-API-KEY: $N8N_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$MERGED"

  echo "✓ $WORKSPACE updated"
done
```

#### Update Methods Comparison

| Method            | Automation   | When to Use                               | Effort          |
| ----------------- | ------------ | ----------------------------------------- | --------------- |
| **Manual n8n UI** | ❌ None      | Emergency fix for 1-2 clients             | Low             |
| **CLI Script**    | ⚠️ Semi-auto | Dev/testing, or if Dashboard UI not ready | Medium          |
| **Dashboard UI**  | ✅ Guided    | Production use, Super Admin friendly      | High (to build) |

#### What Gets Preserved During Updates

| Component                | Preserved? | How                                              |
| ------------------------ | ---------- | ------------------------------------------------ |
| Workflow name            | ✅ Yes     | Kept from current workflow                       |
| Credentials              | ✅ Yes     | Extracted from current, injected into new        |
| Prompts (if in workflow) | ⚠️ Maybe   | Depends on structure - may need special handling |
| Active status            | ✅ Yes     | Kept from current workflow                       |
| Webhook URLs             | ✅ Yes     | Generated by n8n, unchanged                      |

#### Implementation Priority

```
MVP (Phase 1):
├── Manual updates via n8n UI (works today)
└── Track blueprint_version in Supabase

Phase 2:
├── Dashboard shows "Update Available" indicator
├── "Apply Update" button per workspace
└── Batch update for multiple workspaces

Phase 3 (Nice-to-have):
├── Changelog display
├── Rollback to previous version
├── A/B testing (some clients on v1, some on v2)
└── CLI script for DevOps workflows
```

---

### Gap 2: Rollback Mechanism

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    ROLLBACK MECHANISM                                      │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  THE GAP:                                                                  │
│                                                                            │
│  If provisioning fails halfway through, what happens?                     │
│                                                                            │
│  Failure scenario:                                                         │
│  ├── Workflow 1 created ✅                                                │
│  ├── Workflow 2 created ✅                                                │
│  ├── Workflow 3 created ✅                                                │
│  ├── Workflow 4 FAILS ❌ (n8n API error)                                  │
│  └── Workflows 5-7 never created                                          │
│                                                                            │
│  Current state after failure:                                              │
│  ├── 3 orphan workflows in n8n                                            │
│  ├── Supabase has partial records                                         │
│  ├── Workspace is in broken state                                         │
│  └── Manual cleanup required                                              │
│                                                                            │
│  PROPOSED SOLUTION:                                                        │
│                                                                            │
│  1. Transactional provisioning (best-effort):                             │
│     ├── Track all created workflow IDs during process                    │
│     ├── If any step fails, attempt to delete created workflows           │
│     └── Reset workspace to "pending_provisioning"                         │
│                                                                            │
│  2. Retry mechanism:                                                       │
│     ├── Store last successful step                                        │
│     ├── "Retry" button resumes from last step                            │
│     └── Idempotent operations (don't duplicate)                           │
│                                                                            │
│  3. Manual cleanup UI:                                                     │
│     ├── Super Admin can see partially provisioned state                  │
│     ├── "Delete orphan workflows" button                                  │
│     └── "Start fresh" clears everything and retries                      │
│                                                                            │
│  Status: 🟡 DESIGN NEEDED (MVP)                                           │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Gap 3: n8n Health Monitoring

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    N8N HEALTH MONITORING                                   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  THE GAP:                                                                  │
│                                                                            │
│  How does the dashboard know if n8n workflows are healthy?                │
│                                                                            │
│  Scenarios to detect:                                                      │
│  ├── Workflow is active but not executing (schedule issue)               │
│  ├── Workflow is failing every execution (auth expired)                  │
│  ├── n8n instance is down                                                 │
│  ├── Execution queue is backed up                                         │
│  └── Rate limits being hit                                                │
│                                                                            │
│  PROPOSED SOLUTION:                                                        │
│                                                                            │
│  1. Periodic health check:                                                 │
│     ├── Cron job polls n8n API every 5 minutes                           │
│     ├── Checks: instance status, workflow states, recent failures        │
│     └── Updates health status in Supabase                                 │
│                                                                            │
│  2. Alert system:                                                          │
│     ├── If workspace workflows have >3 failures in 24h → alert          │
│     ├── If no executions in 48h (for scheduled workflows) → warn         │
│     └── Notify Super Admin via email/Slack                                │
│                                                                            │
│  3. Dashboard visibility:                                                  │
│     ├── Health indicator on Playground                                    │
│     ├── "Last successful execution" timestamp                            │
│     └── "Failure rate" over last 24h                                     │
│                                                                            │
│  Status: 🔵 NICE-TO-HAVE (PHASE 2)                                        │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Open Questions

A compiled list of questions that need answers before implementation.

### Questions for You (User Decision Needed)

| #   | Question                                                       | Options             | Impact                                                |
| --- | -------------------------------------------------------------- | ------------------- | ----------------------------------------------------- |
| 1   | Should Ohio be migrated to new system or left as-is initially? | Leave / Migrate     | Determines if we have backward compatibility concerns |
| 2   | How many clients do you expect in Year 1?                      | <10 / 10-50 / 50+   | Affects scale decisions and n8n hosting               |
| 3   | Will clients bring their own OpenAI keys or use yours?         | Own / Yours / Mixed | Affects credential strategy                           |
| 4   | Do clients need to see their prompts/config or is it hidden?   | Visible / Hidden    | Affects Playground UI complexity                      |
| 5   | Should we support multiple email accounts per campaign?        | Yes / No            | Affects credential management complexity              |
| 6   | What's the acceptable provisioning failure rate?               | 0% / <5% / <10%     | Affects rollback complexity                           |
| 7   | Is real-time n8n execution visibility critical for MVP?        | Yes / No            | Affects Execution Console priority                    |

### Questions Requiring Technical Investigation

| #   | Question                                                 | How to Answer                      | Priority |
| --- | -------------------------------------------------------- | ---------------------------------- | -------- |
| 1   | What's in n8n API workflow response after creation?      | Create test workflow, inspect JSON | HIGH     |
| 2   | Can we update credential references via n8n API?         | Test PATCH /workflows endpoint     | HIGH     |
| 3   | What are n8n's workflow count limits?                    | Check docs, contact n8n support    | MEDIUM   |
| 4   | Does n8n API support workflow duplication?               | Check docs, test                   | MEDIUM   |
| 5   | How does n8n handle webhook URLs in test mode?           | Test workflow with webhook         | HIGH     |
| 6   | What's the optimal GIN index for JSONB with our schema?  | Benchmark queries                  | MEDIUM   |
| 7   | Can Supabase handle dynamic RLS for workspace_workflows? | Test RLS policies                  | HIGH     |

---

## Summary: What We Know vs. What We Don't

### ✅ What We've Decided

| Decision         | Choice                                    | Rationale                           |
| ---------------- | ----------------------------------------- | ----------------------------------- |
| Workflow Model   | Hybrid (Clone + Blueprint)                | Customization + version tracking    |
| Database Model   | Universal Table                           | Simplicity, single RLS policy       |
| Campaign Model   | Hybrid (4 per-campaign + 3 per-workspace) | Balance of isolation and efficiency |
| Credential Model | Shared + Minimal Per-Client               | Reduces setup from 7 to 2           |
| Playground Scope | 5 Layers (MVP: 1-3)                       | Incremental delivery                |

### 🔴 What We Still Need to Crack

1. **n8n API investigation** - Create, update, webhook discovery
2. **Credential update flow** - How exactly do we assign new creds to cloned workflows
3. **Rollback mechanism** - What happens when provisioning fails
4. **Ohio migration plan** - Timeline and approach

### 🟡 What We've Deferred

1. **Template versioning** - Phase 2
2. **n8n health monitoring** - Phase 2
3. **Test sandbox mode** - Phase 3
4. **Execution console** - Phase 2

---

## Next Steps

Before writing an implementation plan, complete these investigations:

1. **n8n API Spike** (1-2 hours)

   - Set up test n8n instance
   - Create workflow via API, inspect response
   - Test credential operations
   - Document findings

2. **Database Schema Draft** (1 hour)

   - Design `blueprints` table
   - Design `workspace_workflows` table
   - Design universal `leads` table
   - Plan migration for Ohio

3. **Decision Finalization** (Discussion)
   - Answer the 7 user questions above
   - Lock in approach for credential assignment
   - Confirm Ohio migration timeline

---

## Appendix: Related Tools

### FlowVault (Optional, Not a Dependency)

[FlowVault](https://github.com/nishchith-m10/flow-vault) is a separate project that provides a visual UI for managing n8n workflows. It was built as a standalone tool and is **not required** for Genesis Engine.

#### What FlowVault Does

FlowVault is essentially a wrapper around n8n's API that provides:

- Visual workflow import (drag-drop JSON/ZIP)
- Workflow listing and status viewing
- Tag management for organization
- Execution history viewing
- n8n Variables management
- Activate/deactivate workflows

#### Why NOT Use FlowVault for Genesis Engine

| Approach                        | Pros                        | Cons                                         |
| ------------------------------- | --------------------------- | -------------------------------------------- |
| **Dashboard → FlowVault → n8n** | Centralized n8n logic       | Extra network hop, another service to deploy |
| **Dashboard → n8n (Direct)**    | Simpler, fewer moving parts | n8n logic lives in Dashboard                 |

**Decision: Genesis Engine will call n8n APIs directly from the Dashboard.**

Reasons:

1. No extra service dependency
2. No additional deployment/maintenance overhead
3. Lower latency (one less network hop)
4. Dashboard is the only product that needs n8n integration (for now)

#### When FlowVault Would Be Useful

- **As a manual management tool**: Super Admin can use FlowVault's UI to browse workflows, view executions, and manage tags - separate from the Dashboard.
- **If multiple products need n8n**: If you build other products that also need n8n integration, FlowVault could become a shared API gateway.
- **Template sanitization**: FlowVault could potentially be enhanced to sanitize raw n8n JSONs (find/replace hardcoded values) before storing as Blueprints.

#### Architecture Decision

```
FOR GENESIS ENGINE MVP:
├── Cold Email Dashboard → n8n API (Direct)
└── FlowVault → n8n API (Separate, for manual management)

FUTURE (IF MULTIPLE PRODUCTS):
├── Cold Email Dashboard → FlowVault API → n8n
├── Other Product A → FlowVault API → n8n
└── Other Product B → FlowVault API → n8n
```

**Current Status: Keep FlowVault as a separate personal tool. Do not add it as a dependency for Genesis Engine.**

---

> **Document Status:** DRAFT - For Brainstorming/Analysis Only  
> **Next Phase:** Technical Investigation Spike  
> **Estimated Time to Implementation Plan:** After spike completion
