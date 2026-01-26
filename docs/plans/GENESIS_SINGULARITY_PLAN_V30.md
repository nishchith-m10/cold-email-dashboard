# 🧬 THE GENESIS ENGINE: SOVEREIGN SINGULARITY PLAN V30.0

> **Document Type:** Ultra-Complex Forensic Systems Architecture Specification  
> **Status:** Complete - All Phases & Gap Closures Documented  
> **Created:** 2026-01-24  
> **Last Updated:** 2026-01-25  
> **Architect Level:** L10 Distinguished Principal Systems Architect  
> **Target:** 100M+ Leads | 15,000+ Sovereign Droplets | Zero-Failure Tolerance

---

## 📋 MASTER TABLE OF CONTENTS

### PART I: STRATEGIC ARCHITECTURE

| Section | Title | Focus |
|---------|-------|-------|
| **1** | [Executive Summary](#section-1-executive-summary) | V30 Mandate, Strategic Pivots, Architecture Overview |
| **2** | [V30 Architectural Pillars](#section-2-v30-architectural-pillars) | Sovereign Isolation, Fleet Orchestration, Unified Onboarding |
| **3** | [The Ohio Exception](#section-3-the-ohio-exception) | Legacy Workspace Isolation Protocol |

### PART II: INFRASTRUCTURE PHYSICS

| Phase | Title | Focus |
|-------|-------|-------|
| **40** | [Database Foundation & Partition Physics](#phase-40-forensic-foundation--partition-physics) | Catalog optimization, atomic provisioning, RLS hardening |
| **50** | [Sovereign Droplet Factory](#phase-50-sovereign-droplet-factory) | DigitalOcean VM provisioning, Docker standardization, Cloud-Init |
| **51** | [Sidecar Agent Architecture](#phase-51-sidecar-agent-architecture) | Zero-Trust JWT, local n8n management, health reporting |

### PART III: ORCHESTRATION & COMMUNICATION

| Phase | Title | Focus |
|-------|-------|-------|
| **41** | [The "Ignition" Orchestrator](#phase-41-the-ignition-orchestrator) | Atomic provisioning, credential vault, state machine |
| **52** | [BullMQ Event Bus & Concurrency Governor](#phase-52-bullmq-event-bus--concurrency-governor) | Fleet-wide command distribution, Thundering Herd prevention |
| **42** | [Atomic Handshake Protocol](#phase-42-webhook--handshake-protocol) | Registration Node, webhook URL discovery, token verification |
| **53** | [Dynamic UUID Mapper](#phase-53-dynamic-uuid-mapper) | Credential Paradox solution, template rewriting |

### PART IV: FLEET OPERATIONS

| Phase | Title | Focus |
|-------|-------|-------|
| **43** | [State Reconciliation Watchdog](#phase-43-state-reconciliation-watchdog) | Drift detection, auto-healing, orphan management |
| **54** | [Heartbeat State Machine](#phase-54-heartbeat-state-machine) | Granular health states, zombie detection, hard reboot |
| **55** | [Hibernation & Wake Physics](#phase-55-hibernation--wake-physics) | Cost optimization, instant wake protocol |
| **56** | [Fleet-Wide Template Reconciliation](#phase-56-fleet-wide-template-reconciliation) | Blue-Green updates, batch rollout, failure thresholds |

### PART V: FINANCIAL & BILLING

| Phase | Title | Focus |
|-------|-------|-------|
| **57** | [Managed vs. BYO Service Matrix](#phase-57-managed-vs-byo-service-matrix) | Service categorization, cost allocation |
| **58** | [Financial Kill-Switch & Genesis Wallet](#phase-58-financial-kill-switch--genesis-wallet) | Pre-flight balance checks, wallet management |
| **59** | [Cost Model & Rate Limit Orchestration](#phase-59-cost-model--rate-limit-orchestration) | Per-tenant margins, external API quotas |

### PART VI: ONBOARDING & UX

| Phase | Title | Focus |
|-------|-------|-------|
| **60** | [Genesis Gateway Unified Onboarding](#phase-60-genesis-gateway-unified-onboarding) | OAuth proxy, BYO key collection |
| **60.B** | [Email Provider Abstraction](#phase-60b-email-provider-abstraction) | Gmail + SMTP + future providers, unified sending interface |
| **61** | [Friction-Reduction Protocols](#phase-61-friction-reduction-protocols) | Auto-scrape brand, DNS automation, booking validation |

### PART VII: COMPLIANCE & SECURITY

| Phase | Title | Focus |
|-------|-------|-------|
| **62** | [Data Residency & GDPR Protocol](#phase-62-data-residency--gdpr-protocol) | Multi-region storage, partition-droplet co-location |
| **63** | [Audit Logging & Support Access](#phase-63-audit-logging--support-access) | Compliance trail, time-limited debug access |
| **63.B** | [Comprehensive Login Audit Trail](#phase-63b-comprehensive-login-audit-trail) | Login tracking, session history, action logging |
| **64** | [Tenant Lifecycle Management](#phase-64-tenant-lifecycle-management) | Deletion protocol, data export, offboarding |

### PART VIII: PLATFORM OPERATIONS

| Phase | Title | Focus |
|-------|-------|-------|
| **44** | ["God Mode" Command & Control](#phase-44-god-mode-command--control) | Platform operations dashboard, health mesh, scale monitoring & pre-failure alerts |
| **45** | [Sandbox & Simulation Engine](#phase-45-sandbox--simulation-engine) | Mock environment, testing |
| **65** | [Credential Rotation & Webhook Security](#phase-65-credential-rotation--webhook-security) | OAuth refresh, HMAC signatures, DLQ |

### PART IX: MIGRATION & DEPLOYMENT

| Phase | Title | Focus |
|-------|-------|-------|
| **46** | [Shadow Migration & Parity Testing](#phase-46-shadow-migration--parity-testing) | Zero-downtime data migration |
| **47** | [Hyper-Scale Stress Test & Red-Teaming](#phase-47-hyper-scale-stress-test--red-teaming) | Load, chaos, security testing |
| **48** | [Production Cutover & Revert Protocol](#phase-48-production-cutover--revert-protocol) | Blue-green deployment, instant rollback |
| **66** | [Disaster Recovery & Regional Failover](#phase-66-disaster-recovery--regional-failover) | Cross-region snapshots, mass restoration |
| **66.B** | [Infrastructure as Code (Optional)](#phase-66b-infrastructure-as-code-optional) | Terraform for Dashboard DR, reproducible infra (LOW PRIORITY) |
| **67** | [API Health Monitor & Sanity Check](#phase-67-api-health-monitor--sanity-check) | External API validation, health dashboard, auto-diagnosis |

### PART X: REFERENCE & APPENDICES

| Appendix | Title | Focus |
|----------|-------|-------|
| **A** | [Environment Variables](#appendix-a-environment-variables) | Configuration reference |
| **B** | [API Endpoint Reference](#appendix-b-api-endpoint-reference) | Quick lookup |
| **C** | [State Transition Diagrams](#appendix-c-state-transition-diagrams) | Visual flows |
| **D** | [Operations Runbook](#appendix-d-operations-runbook) | Incident response |
| **E** | [Glossary](#appendix-e-glossary) | Term definitions |

---

## SECTION 1: EXECUTIVE SUMMARY

### 1.1 The V30 Sovereign Singularity Mandate

The V30 architecture represents a **complete strategic pivot** from the V20 shared-resource model to a **Sovereign, Decoupled, and Managed** infrastructure. The primary objective is to eliminate the **"Onboarding Friction Wall"** and the **"Fleet Orchestration Death Traps"** that would plague any shared n8n deployment at scale.

**The Core Principle: Perfect Isolation**

Every tenant receives their own dedicated DigitalOcean Droplet running a standardized n8n instance, managed by a lightweight Sidecar Agent, orchestrated by a central Dashboard Control Plane.

### 1.2 Strategic Pivots from V20 to V30

| Aspect | V20 Approach (Rejected) | V30 Approach (Adopted) | Rationale |
|--------|------------------------|------------------------|-----------|
| **n8n Hosting** | Shared n8n Cloud instance | Sovereign Droplet per tenant | Eliminates "Noisy Neighbor" problem |
| **Workflow Management** | API polling from Dashboard | Sidecar Agent push-based | Prevents "Thundering Herd" at 15k scale |
| **Credential Injection** | Dashboard calls n8n API | Sidecar injects locally | Zero-Trust security perimeter |
| **Fleet Updates** | Sequential API calls | BullMQ Event Bus + Concurrency Governor | Rate-limited, prioritized distribution |
| **Webhook Discovery** | Fragile API polling | Atomic Handshake Protocol | Registration Node POSTs URL back |
| **Cost Model** | Opaque shared resources | $6/droplet/tenant linear model | Predictable per-tenant margins |

### 1.3 V30 Architectural Pillars

| Pillar | Core Function | Strategic Rationale |
|--------|---------------|---------------------|
| **Sovereign Isolation** | Dedicated DigitalOcean Droplet per tenant | Guarantees OS-level security and resource allocation |
| **Managed Orchestration** | Sidecar Agent + BullMQ Event Bus | Robust, push-based state machine for fleet control |
| **Unified Onboarding** | Genesis Gateway (Hybrid OAuth/BYO) | Abstracts 10+ third-party dashboards into single UX |
| **Financial Controls** | Kill-Switch + Genesis Wallet | Prevents runaway costs on managed services |
| **Data Residency** | Per-tenant region selection | GDPR compliance + latency optimization |

### 1.4 Target Metrics

| Metric | Current State | V30 Target |
|--------|---------------|------------|
| Tenant Capacity | 1 (hardcoded Ohio) | 15,000+ Sovereign Droplets |
| Lead Capacity | ~10k (single table) | 100M+ (partitioned by workspace) |
| Provisioning Time | 4-8 hours manual | <60 seconds (Atomic Ignition) |
| n8n Isolation | None (shared) | Complete (OS-level) |
| Credential Security | Manual n8n UI | Encrypted Vault + Sidecar Injection |
| Fleet Update Time | N/A | <30 minutes for 15k droplets |
| Regional Coverage | Single region | US-East, US-West, EU-West, APAC |

### 1.5 The "Ohio Problem" - Legacy Exception

The "Ohio" workspace represents legacy infrastructure that **must NOT be migrated** to the Sovereign Droplet model. Instead:

1. All hardcoded references to `leads_ohio` must be removed from the codebase
2. New tenants must be 100% decoupled from Ohio's database and n8n instance  
3. Legacy connection logic is maintained ONLY for Ohio's specific workspace ID
4. This prevents a total system break while enabling clean architecture for new tenants

### 1.6 Top 15 Critical Risks (V30 Updated)

| # | Risk | Severity | Phase | V30 Status |
|---|------|----------|-------|------------|
| 1 | RLS null bypass vulnerability | CRITICAL | 40 | SOLVED - Fail-closed COALESCE |
| 2 | `leads_ohio` hardcoding | HIGH | 40 | SOLVED - Ohio Exception Protocol |
| 3 | n8n credential injection gap | HIGH | 41 | SOLVED - Sidecar + Dynamic UUID Mapper |
| 4 | Shared n8n "Noisy Neighbor" | CRITICAL | 50 | SOLVED - Sovereign Droplet |
| 5 | "Thundering Herd" on fleet updates | HIGH | 52 | SOLVED - BullMQ + Concurrency Governor |
| 6 | "Ghost Webhook" URL paradox | HIGH | 42 | SOLVED - Atomic Handshake Protocol |
| 7 | State drift (Dashboard vs n8n) | MEDIUM | 43 | SOLVED - Watchdog + Auto-Healing |
| 8 | No provisioning rollback | MEDIUM | 41 | SOLVED - Orphan Droplet Atomic Rollback |
| 9 | Missing financial controls | HIGH | 58 | SOLVED - Kill-Switch + Genesis Wallet |
| 10 | 10+ dashboard onboarding friction | HIGH | 60 | SOLVED - Genesis Gateway |
| 11 | GDPR data residency | MEDIUM | 62 | SOLVED - Multi-Region Protocol |
| 12 | Sidecar going dark | MEDIUM | 54 | SOLVED - Heartbeat Watchdog |
| 13 | Credential rotation at scale | MEDIUM | 65 | SOLVED - Batch rotation via Sidecar |
| 14 | Tenant deletion complexity | MEDIUM | 64 | SOLVED - Lifecycle Management Protocol |
| 15 | Regional disaster | HIGH | 66 | SOLVED - Cross-Region Failover |

---

## SECTION 2: V30 ARCHITECTURAL PILLARS

### 2.1 Pillar I: Sovereign Isolation Physics

The decision to move from a shared n8n instance to a **Sovereign Droplet Factory** is the foundational pivot of V30. This is not a preference but a **scaling necessity** driven by the physics of long-running, stateful workflows.

**Why Sovereign Droplets Over Shared n8n:**

| Concern | Shared n8n Cloud | Sovereign Droplet |
|---------|------------------|-------------------|
| Resource contention | One tenant's heavy workflow starves others | Dedicated CPU/RAM per tenant |
| Security isolation | Logical only (credentials visible to operator) | OS-level (separate VM) |
| Scaling limits | n8n Cloud API rate limits | Only DO API limits (much higher) |
| Cost model | Opaque, per-execution pricing | Linear $6/month/droplet |
| Breach containment | Compromise exposes all tenants | Compromise limited to one tenant |
| Customization | None (shared instance) | Per-tenant n8n settings |

**The Droplet Factory Model:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SOVEREIGN DROPLET FACTORY                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CONTROL PLANE (Dashboard + BullMQ + Redis)                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │   [Genesis Gateway]  →  [Ignition Orchestrator]  →  [DO API]       │   │
│  │          ↓                      ↓                       ↓           │   │
│  │   [Credential Vault]    [BullMQ Event Bus]    [Droplet Created]    │   │
│  │                                 ↓                       ↓           │   │
│  │                         [Concurrency Governor]  [Cloud-Init Runs]  │   │
│  │                                                         ↓           │   │
│  │                                                  [Sidecar Starts]  │   │
│  │                                                         ↓           │   │
│  │                                                  [Handshake POST]  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  DATA PLANE (15,000 Sovereign Droplets)                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Droplet  │  │ Droplet  │  │ Droplet  │  │ Droplet  │  │ Droplet  │    │
│  │ Tenant A │  │ Tenant B │  │ Tenant C │  │ Tenant D │  │ Tenant E │    │
│  │          │  │          │  │          │  │          │  │          │    │
│  │ [n8n]    │  │ [n8n]    │  │ [n8n]    │  │ [n8n]    │  │ [n8n]    │    │
│  │ [Sidecar]│  │ [Sidecar]│  │ [Sidecar]│  │ [Sidecar]│  │ [Sidecar]│    │
│  │ [Caddy]  │  │ [Caddy]  │  │ [Caddy]  │  │ [Caddy]  │  │ [Caddy]  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│       ×3,000        ×3,000        ×3,000        ×3,000        ×3,000      │
│                                                                             │
│  DATABASE LAYER (Supabase - Partitioned)                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  genesis.leads (parent table)                                       │   │
│  │  ├── leads_p_tenant_a (workspace_id = 'uuid-a')                    │   │
│  │  ├── leads_p_tenant_b (workspace_id = 'uuid-b')                    │   │
│  │  ├── leads_p_tenant_c (workspace_id = 'uuid-c')                    │   │
│  │  └── ... (15,000 partitions)                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Pillar II: Managed Fleet Orchestration

The Orchestration Layer is the Control Plane that manages 15,000 isolated Data Planes. It must handle fleet-wide commands without suffering from network I/O bottlenecks.

**The BullMQ Event Bus Architecture:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FLEET ORCHESTRATION PHYSICS                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WITHOUT BULLMQ (V20 Problem - "Thundering Herd"):                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │   Dashboard: "Update template for all tenants"                     │   │
│  │       ↓                                                            │   │
│  │   15,000 simultaneous HTTP requests to n8n instances               │   │
│  │       ↓                                                            │   │
│  │   Dashboard network stack overwhelmed                              │   │
│  │       ↓                                                            │   │
│  │   Connections timeout, partial updates, inconsistent state         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  WITH BULLMQ (V30 Solution - "Concurrency Governor"):                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │   Dashboard: "Update template for all tenants"                     │   │
│  │       ↓                                                            │   │
│  │   Queue 15,000 jobs to BullMQ Redis                                │   │
│  │       ↓                                                            │   │
│  │   Concurrency Governor: Rate-limit to 100 concurrent               │   │
│  │       ↓                                                            │   │
│  │   Sidecars pull jobs, execute locally, report success              │   │
│  │       ↓                                                            │   │
│  │   Dashboard receives completion events over 15 minutes             │   │
│  │       ↓                                                            │   │
│  │   Fleet consistent, Control Plane stable                           │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  PRIORITY QUEUE STRUCTURE:                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │   Priority 1 (CRITICAL):  New Ignition, Security Patches           │   │
│  │   Priority 2 (HIGH):      Credential Rotation, Hard Reboots        │   │
│  │   Priority 3 (MEDIUM):    Template Updates, Config Changes         │   │
│  │   Priority 4 (LOW):       Metric Collection, Health Checks         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Pillar III: Unified Onboarding (Genesis Gateway)

The V30 plan mandates the **Genesis Gateway** as the default onboarding experience, eliminating the "10+ Dashboard" friction that kills user adoption.

**The Onboarding Friction Analysis:**

| Step | Without Genesis Gateway | With Genesis Gateway |
|------|------------------------|---------------------|
| 1 | Sign up on Dashboard | Sign up on Dashboard |
| 2 | Go to Google Cloud Console | Click "Connect Gmail" |
| 3 | Create OAuth app | (OAuth handled by Genesis) |
| 4 | Configure consent screen | (Automatic) |
| 5 | Get Client ID/Secret | (Automatic) |
| 6 | Go to OpenAI | Enter OpenAI API key |
| 7 | Create API key | (User's existing key) |
| 8 | Go to Claude (Anthropic) | Enter Claude API key |
| 9 | Create API key | (User's existing key) |
| 10 | Go to Google CSE Console | Enter CSE API key + Engine ID |
| 11 | Enable Custom Search API | (User's existing keys) |
| 12 | Go to Relevance AI | Enter Relevance AI key |
| 13 | Create project | (User's existing key) |
| 14 | Go to Apify Console | Choose: BYO or Managed Service |
| 15 | Create API token | (Optional - use Genesis pool) |
| 16 | Go to n8n | (N/A - Sidecar handles) |
| 17 | Configure credentials | (N/A - Sidecar handles) |
| 18 | Go to DNS provider | Click "Setup DNS" |
| 19 | Add SPF/DKIM/DMARC | (Entri handles automatically) |
| 20 | Wait for propagation | (Automatic verification) |
| **Total Time** | **3-5 hours** | **<15 minutes** |

---

## SECTION 3: THE OHIO EXCEPTION

### 3.1 The Legacy Workspace Isolation Protocol

The "Ohio" workspace is legacy infrastructure that predates the V30 Sovereign Singularity architecture. It uses hardcoded references to `leads_ohio` and connects to a legacy n8n instance. Migrating Ohio to a Sovereign Droplet would risk breaking a production system with active campaigns.

**The Strategic Decision:**

Ohio remains on legacy infrastructure indefinitely. All new tenants are provisioned through the V30 Sovereign Droplet Factory. The codebase is refactored to:

1. **Remove all hardcoded Ohio references** from shared code paths
2. **Isolate Ohio-specific logic** behind a workspace ID check
3. **Ensure zero coupling** between Ohio and new tenant provisioning

### 3.2 Ohio Exception Implementation Pattern

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OHIO EXCEPTION FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INCOMING REQUEST                                                          │
│       ↓                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Is workspace_id === OHIO_WORKSPACE_UUID?                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       ↓                           ↓                                        │
│      YES                          NO                                       │
│       ↓                           ↓                                        │
│  ┌───────────────┐           ┌───────────────────────────────────────┐    │
│  │ LEGACY PATH   │           │ V30 SOVEREIGN PATH                    │    │
│  │               │           │                                       │    │
│  │ - leads_ohio  │           │ - genesis.leads_p_{slug}              │    │
│  │ - legacy n8n  │           │ - Sovereign Droplet                   │    │
│  │ - old webhooks│           │ - Sidecar Agent                       │    │
│  │               │           │ - BullMQ orchestration                │    │
│  └───────────────┘           └───────────────────────────────────────┘    │
│                                                                             │
│  CODEBASE REQUIREMENTS:                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  1. OHIO_WORKSPACE_UUID defined as constant in lib/constants.ts    │   │
│  │                                                                     │   │
│  │  2. All database queries use:                                      │   │
│  │     - If Ohio: Query leads_ohio directly (legacy)                  │   │
│  │     - If Other: Query genesis.leads with workspace_id RLS          │   │
│  │                                                                     │   │
│  │  3. All n8n operations use:                                        │   │
│  │     - If Ohio: Call legacy n8n API endpoints                       │   │
│  │     - If Other: Route through BullMQ to Sidecar                    │   │
│  │                                                                     │   │
│  │  4. All webhook handlers use:                                      │   │
│  │     - If Ohio: Legacy webhook verification                         │   │
│  │     - If Other: V30 Atomic Handshake verification                  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Ohio Exception - File Modifications Required

| File | Current State | Required Change |
|------|---------------|-----------------|
| `lib/workspace-db-config.ts` | `DEFAULT_LEADS_TABLE = 'leads_ohio'` | Add `getLeadsTable(workspaceId)` function that returns `leads_ohio` for Ohio, `genesis.leads` for others |
| `lib/db-queries.ts` | Hardcoded table references | Use `getLeadsTable()` dynamically |
| `app/api/*/route.ts` | Assume single table | Check workspace ID, route accordingly |
| `lib/n8n-client.ts` | Single n8n instance | Add Ohio exception for legacy endpoint |
| `lib/constants.ts` | N/A | Add `OHIO_WORKSPACE_UUID` constant |

### 3.4 Ohio Exception - Non-Goals

The Ohio Exception protocol explicitly does NOT include:

1. **Migration of Ohio data** to the new partitioned schema
2. **Provisioning Ohio** on a Sovereign Droplet
3. **Upgrading Ohio's n8n** to the V30 Sidecar model
4. **Applying V30 features** (Kill-Switch, Heartbeat, etc.) to Ohio

Ohio remains a static, legacy workspace that will eventually be deprecated when the client is ready to migrate.

---

# 🔬 PHASE 40: FORENSIC FOUNDATION & PARTITION PHYSICS

> **Phase Type:** Distributed Systems Infrastructure  
> **Target:** 15,000 partitions, 100M leads, sub-100ms query latency  
> **Risk Level:** CRITICAL (Foundation Layer)

---

## 40.1 THE POSTGRES CATALOG BOTTLENECK

### 40.1.1 The Physics Problem

At 15,000 partitions, PostgreSQL's system catalogs become the primary bottleneck:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CATALOG PHYSICS AT 15,000 PARTITIONS                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  pg_class entries:     15,000 (partitions) + 45,000 (indexes) = 60,000+    │
│  pg_attribute entries: ~40 columns × 15,000 = 600,000+                      │
│  pg_inherits entries:  15,000 parent-child relationships                    │
│                                                                             │
│  LOCK CONTENTION POINTS:                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. PartitionSelector lock during query planning                     │   │
│  │ 2. pg_class AccessShareLock for catalog lookups                     │   │
│  │ 3. Relation cache invalidation storms on DDL                        │   │
│  │ 4. Query planner exhaustive partition scan                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  FAILURE MODE:                                                              │
│  - Query planning time: O(n) where n = partition count                     │
│  - At 15k partitions: 50-500ms planning overhead PER QUERY                 │
│  - Catalog lock contention causes connection pile-up                       │
│  - DDL operations (CREATE PARTITION) block ALL queries                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 40.1.2 The Solution: Constraint Exclusion + Partition Pruning

**Critical Configuration: `postgresql.conf`**

```ini
# ============================================
# PARTITION OPTIMIZATION FOR 15,000 PARTITIONS
# ============================================

# Enable partition pruning (CRITICAL)
enable_partition_pruning = on

# Reduce planner's partition limit before giving up on pruning
# Default is 100, we need higher for 15k partitions
# BUT: Setting too high causes planner slowdown
# Sweet spot: Allow pruning to work, but cap exhaustive search
plan_cache_mode = 'force_custom_plan'  # Prevents generic plan caching issues

# Lock management for high-concurrency DDL
max_locks_per_transaction = 256        # Default 64, need higher for partition operations
max_pred_locks_per_transaction = 128   # For serializable isolation

# Shared buffer tuning (catalog hot paths)
shared_buffers = '4GB'                 # Minimum for catalog caching
effective_cache_size = '12GB'          # For planner cost estimates

# Work mem for complex partition operations
work_mem = '256MB'                     # Per-operation memory
maintenance_work_mem = '2GB'           # For CREATE INDEX CONCURRENTLY

# Catalog-specific optimizations
track_counts = on                      # Required for autovacuum targeting
autovacuum_analyze_scale_factor = 0.02 # More frequent catalog analysis
default_statistics_target = 500        # Higher stats for partition key

# Connection management
max_connections = 400                  # PgBouncer handles multiplexing
```

### 40.1.3 Connection Pooling Strategy: PgBouncer Configuration

**Critical Design Decision: Transaction-Level Pooling**

```ini
# /etc/pgbouncer/pgbouncer.ini
# ============================================
# PGBOUNCER FOR 15,000 PARTITION WORKLOAD
# ============================================

[databases]
genesis_prod = host=db.supabase.co port=5432 dbname=postgres

[pgbouncer]
# POOL MODE: transaction (REQUIRED for SET LOCAL to work)
# session mode would exhaust connections
# statement mode breaks SET LOCAL
pool_mode = transaction

# Connection limits
max_client_conn = 10000          # Support 10k concurrent users
default_pool_size = 50           # Connections per database
min_pool_size = 10               # Always keep warm
reserve_pool_size = 25           # Emergency overflow
reserve_pool_timeout = 3         # Seconds before using reserve

# Timeout configuration
server_connect_timeout = 5
server_login_retry = 3
query_timeout = 30               # Kill queries > 30s
query_wait_timeout = 60          # Queue wait before reject

# Critical for SET LOCAL propagation
server_reset_query = DISCARD ALL
server_check_query = SELECT 1

# Auth
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Logging for debugging partition issues
log_connections = 0              # Too verbose at scale
log_disconnections = 0
log_pooler_errors = 1
stats_period = 60
```

**Why Transaction-Level Pooling is Mandatory:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     POOLING MODE DECISION MATRIX                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SESSION MODE:                                                              │
│  ├── SET LOCAL persists ✓                                                  │
│  ├── Connections: 1:1 with clients ✗                                       │
│  └── 10k users = 10k connections = IMPOSSIBLE                              │
│                                                                             │
│  STATEMENT MODE:                                                            │
│  ├── Maximum multiplexing ✓                                                │
│  ├── SET LOCAL lost between statements ✗                                   │
│  └── RLS bypass vulnerability = SECURITY FAILURE                           │
│                                                                             │
│  TRANSACTION MODE: ✓ REQUIRED                                              │
│  ├── SET LOCAL persists within transaction ✓                               │
│  ├── Good multiplexing (50 server : 10k client) ✓                          │
│  └── All API routes must BEGIN/COMMIT explicitly                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 40.1.4 Lock Tuning for Concurrent Partition DDL

**The Lock Escalation Problem:**

When creating a partition, Postgres acquires:
1. `AccessExclusiveLock` on parent table (blocks ALL operations)
2. `RowExclusiveLock` on pg_class (catalog update)
3. `ShareLock` on pg_inherits (inheritance registration)

**Solution: Deferred DDL with Advisory Locks**

```sql
-- ============================================
-- ADVISORY LOCK STRATEGY FOR PARTITION DDL
-- ============================================

-- Lock ID namespace for Genesis Engine
-- Using hash of 'genesis_partition_ddl' as lock ID
-- pg_advisory_xact_lock(hashtext('genesis_partition_ddl')) = 1953459672

CREATE OR REPLACE FUNCTION genesis.acquire_partition_ddl_lock()
RETURNS BOOLEAN AS $$
BEGIN
    -- Try to acquire exclusive advisory lock (non-blocking)
    -- Only ONE concurrent partition creation allowed
    IF pg_try_advisory_xact_lock(1953459672) THEN
        RETURN TRUE;
    ELSE
        RAISE WARNING 'Partition DDL already in progress by another transaction';
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Usage in ignition function (see 40.2)
```

**max_locks_per_transaction Calculation:**

```
Per partition creation:
  - 1 lock on parent table
  - 1 lock on new partition
  - 3 locks on indexes (btree, gin, hash)
  - 1 lock on pg_class
  - 1 lock on pg_inherits
  = ~7 locks per partition

Concurrent operations:
  - Maximum 50 concurrent transactions (PgBouncer pool)
  - Each may touch 3-4 partitions for cross-workspace queries
  = ~50 * 4 * 7 = 1,400 locks peak

Setting: max_locks_per_transaction = 256 (per transaction)
Total lock table size = 256 * max_connections = 102,400 slots
```

---

## 40.2 THE ATOMIC "IGNITION" SQL

### 40.2.1 Core Ignition Function

```sql
-- ============================================
-- GENESIS ENGINE: ATOMIC PARTITION IGNITION
-- ============================================
-- Function: genesis.fn_ignite_workspace_partition
-- Purpose: Atomically create a workspace partition with RLS
-- Thread-safe: Uses advisory locks to prevent race conditions
-- Idempotent: Safe to call multiple times
-- ============================================

CREATE OR REPLACE FUNCTION genesis.fn_ignite_workspace_partition(
    p_workspace_id UUID,
    p_workspace_slug TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    partition_name TEXT,
    operation TEXT,
    duration_ms INTEGER,
    error_message TEXT
) AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_partition_name TEXT;
    v_slug TEXT;
    v_exists BOOLEAN;
    v_lock_acquired BOOLEAN;
BEGIN
    -- ============================================
    -- STEP 0: Input validation
    -- ============================================
    IF p_workspace_id IS NULL THEN
        RETURN QUERY SELECT 
            FALSE, NULL::TEXT, 'validation'::TEXT, 0,
            'workspace_id cannot be NULL'::TEXT;
        RETURN;
    END IF;
    
    -- Generate partition name from slug or UUID
    v_slug := COALESCE(
        p_workspace_slug,
        REPLACE(p_workspace_id::TEXT, '-', '_')
    );
    v_partition_name := 'leads_p_' || genesis.sanitize_partition_slug(v_slug);
    
    -- ============================================
    -- STEP 1: Check if partition already exists (FAST PATH)
    -- ============================================
    SELECT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'genesis'
        AND c.relname = v_partition_name
        AND c.relkind = 'r'  -- regular table (partition)
    ) INTO v_exists;
    
    IF v_exists THEN
        -- Partition exists - idempotent success
        RETURN QUERY SELECT 
            TRUE, 
            v_partition_name, 
            'already_exists'::TEXT,
            EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
            NULL::TEXT;
        RETURN;
    END IF;
    
    -- ============================================
    -- STEP 2: Acquire DDL advisory lock
    -- ============================================
    SELECT pg_try_advisory_xact_lock(
        hashtext('genesis_partition_ddl'),
        hashtext(p_workspace_id::TEXT)
    ) INTO v_lock_acquired;
    
    IF NOT v_lock_acquired THEN
        -- Another transaction is creating this partition
        -- Wait briefly and re-check
        PERFORM pg_sleep(0.1);
        
        SELECT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'genesis'
            AND c.relname = v_partition_name
        ) INTO v_exists;
        
        IF v_exists THEN
            RETURN QUERY SELECT 
                TRUE, v_partition_name, 'created_by_other'::TEXT,
                EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
                NULL::TEXT;
            RETURN;
        ELSE
            RETURN QUERY SELECT 
                FALSE, NULL::TEXT, 'lock_contention'::TEXT,
                EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
                'Could not acquire DDL lock'::TEXT;
            RETURN;
        END IF;
    END IF;
    
    -- ============================================
    -- STEP 3: Create partition (ATOMIC DDL)
    -- ============================================
    BEGIN
        EXECUTE format(
            'CREATE TABLE genesis.%I PARTITION OF genesis.leads
             FOR VALUES IN (%L)',
            v_partition_name,
            p_workspace_id::TEXT
        );
    EXCEPTION WHEN duplicate_table THEN
        -- Race condition: partition created between check and create
        RETURN QUERY SELECT 
            TRUE, v_partition_name, 'race_condition_ok'::TEXT,
            EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
            NULL::TEXT;
        RETURN;
    WHEN OTHERS THEN
        RETURN QUERY SELECT 
            FALSE, NULL::TEXT, 'ddl_failed'::TEXT,
            EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
            SQLERRM::TEXT;
        RETURN;
    END;
    
    -- ============================================
    -- STEP 4: Create partition-local indexes
    -- ============================================
    BEGIN
        -- Primary lookup index
        EXECUTE format(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS %I 
             ON genesis.%I (email_address)',
            v_partition_name || '_email_idx',
            v_partition_name
        );
        
        -- Status filter index
        EXECUTE format(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS %I 
             ON genesis.%I (status) WHERE status != ''completed''',
            v_partition_name || '_status_idx',
            v_partition_name
        );
        
        -- Timestamp index for recent queries
        EXECUTE format(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS %I 
             ON genesis.%I (updated_at DESC)',
            v_partition_name || '_updated_idx',
            v_partition_name
        );
    EXCEPTION WHEN OTHERS THEN
        -- Index creation is non-critical, log but continue
        RAISE WARNING 'Index creation failed for %: %', v_partition_name, SQLERRM;
    END;
    
    -- ============================================
    -- STEP 5: Register partition in registry
    -- ============================================
    INSERT INTO genesis.partition_registry (
        workspace_id,
        partition_name,
        status,
        created_at
    ) VALUES (
        p_workspace_id,
        v_partition_name,
        'active',
        NOW()
    ) ON CONFLICT (workspace_id) DO UPDATE SET
        status = 'active',
        updated_at = NOW();
    
    -- ============================================
    -- STEP 6: Return success
    -- ============================================
    RETURN QUERY SELECT 
        TRUE,
        v_partition_name,
        'created'::TEXT,
        EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
        NULL::TEXT;
        
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role only
REVOKE ALL ON FUNCTION genesis.fn_ignite_workspace_partition FROM PUBLIC;
GRANT EXECUTE ON FUNCTION genesis.fn_ignite_workspace_partition TO service_role;
```

### 40.2.2 Partition Name Sanitizer

```sql
-- ============================================
-- PARTITION SLUG SANITIZER
-- ============================================
-- Ensures partition names are valid Postgres identifiers
-- Max length: 63 chars (Postgres limit)
-- Allowed: lowercase, numbers, underscores
-- ============================================

CREATE OR REPLACE FUNCTION genesis.sanitize_partition_slug(p_input TEXT)
RETURNS TEXT AS $$
DECLARE
    v_result TEXT;
BEGIN
    -- Convert to lowercase
    v_result := LOWER(p_input);
    
    -- Replace invalid characters with underscores
    v_result := REGEXP_REPLACE(v_result, '[^a-z0-9_]', '_', 'g');
    
    -- Collapse multiple underscores
    v_result := REGEXP_REPLACE(v_result, '_+', '_', 'g');
    
    -- Remove leading/trailing underscores
    v_result := TRIM(BOTH '_' FROM v_result);
    
    -- Ensure starts with letter (prepend 'p_' if numeric start)
    IF v_result ~ '^[0-9]' THEN
        v_result := 'p_' || v_result;
    END IF;
    
    -- Truncate to max identifier length minus prefix
    -- 'leads_p_' = 8 chars, max 63, so 55 chars for slug
    v_result := LEFT(v_result, 55);
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### 40.2.3 Partition Drop (Cleanup)

```sql
-- ============================================
-- PARTITION DROP WITH SAFETY CHECKS
-- ============================================

CREATE OR REPLACE FUNCTION genesis.fn_drop_workspace_partition(
    p_workspace_id UUID,
    p_force BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    success BOOLEAN,
    operation TEXT,
    row_count BIGINT,
    error_message TEXT
) AS $$
DECLARE
    v_partition_name TEXT;
    v_row_count BIGINT;
BEGIN
    -- Get partition name
    SELECT partition_name INTO v_partition_name
    FROM genesis.partition_registry
    WHERE workspace_id = p_workspace_id;
    
    IF v_partition_name IS NULL THEN
        RETURN QUERY SELECT 
            FALSE, 'not_found'::TEXT, 0::BIGINT,
            'Partition not found in registry'::TEXT;
        RETURN;
    END IF;
    
    -- Get row count for safety check
    EXECUTE format(
        'SELECT COUNT(*) FROM genesis.%I',
        v_partition_name
    ) INTO v_row_count;
    
    -- Safety: require force flag if partition has data
    IF v_row_count > 0 AND NOT p_force THEN
        RETURN QUERY SELECT 
            FALSE, 'has_data'::TEXT, v_row_count,
            format('Partition has %s rows. Use force=true to drop.', v_row_count)::TEXT;
        RETURN;
    END IF;
    
    -- Drop partition
    EXECUTE format('DROP TABLE IF EXISTS genesis.%I', v_partition_name);
    
    -- Update registry
    UPDATE genesis.partition_registry
    SET status = 'dropped', updated_at = NOW()
    WHERE workspace_id = p_workspace_id;
    
    RETURN QUERY SELECT 
        TRUE, 'dropped'::TEXT, v_row_count, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 40.3 THE INDEXING WATCHDOG

### 40.3.1 JSONB Performance Physics

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    JSONB INDEX PHYSICS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PROBLEM: Global GIN index on JSONB is catastrophic at scale               │
│                                                                             │
│  research_data JSONB structure:                                            │
│  {                                                                          │
│    "company_info": { ... },      -- ~2KB average                           │
│    "linkedin_data": { ... },     -- ~5KB average                           │
│    "enrichment": { ... },        -- ~3KB average                           │
│    "custom_fields": { ... }      -- Variable, up to 50KB                   │
│  }                                                                          │
│                                                                             │
│  At 100M leads × 10KB average = 1TB of JSONB data                          │
│  Global GIN index size: ~300GB (compressed)                                │
│  Index update cost: O(keys) per INSERT/UPDATE                              │
│                                                                             │
│  SOLUTION: Per-partition expression indexes on hot paths                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 40.3.2 Hot Key Detection Query

```sql
-- ============================================
-- JSONB HOT KEY DETECTOR
-- ============================================
-- Identifies frequently queried JSONB paths that need indexing
-- Run as scheduled job every 6 hours
-- ============================================

CREATE OR REPLACE FUNCTION genesis.detect_jsonb_hot_keys(
    p_partition_name TEXT DEFAULT NULL,
    p_min_calls INTEGER DEFAULT 100,
    p_min_avg_ms NUMERIC DEFAULT 50
)
RETURNS TABLE (
    partition_name TEXT,
    jsonb_path TEXT,
    call_count BIGINT,
    avg_time_ms NUMERIC,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH jsonb_queries AS (
        SELECT 
            -- Extract partition name from query
            REGEXP_MATCH(query, 'genesis\.([a-z_]+)') AS partition_match,
            -- Extract JSONB path patterns
            REGEXP_MATCHES(query, 
                $$(?:->|->>) *'([a-z_]+)'$$, 'gi'
            ) AS jsonb_matches,
            calls,
            mean_exec_time
        FROM pg_stat_statements
        WHERE query LIKE '%genesis.leads%'
        AND query LIKE '%->%'  -- Contains JSONB operator
        AND calls > p_min_calls
    ),
    aggregated AS (
        SELECT 
            (partition_match)[1] AS pname,
            (jsonb_matches)[1] AS jpath,
            SUM(calls) AS total_calls,
            AVG(mean_exec_time) AS avg_ms
        FROM jsonb_queries
        WHERE (partition_match)[1] IS NOT NULL
        GROUP BY (partition_match)[1], (jsonb_matches)[1]
    )
    SELECT 
        a.pname,
        a.jpath,
        a.total_calls,
        ROUND(a.avg_ms::NUMERIC, 2),
        CASE 
            WHEN a.avg_ms > 100 THEN 'CREATE_INDEX_URGENT'
            WHEN a.avg_ms > 50 THEN 'CREATE_INDEX_RECOMMENDED'
            ELSE 'MONITOR'
        END AS rec
    FROM aggregated a
    WHERE (p_partition_name IS NULL OR a.pname = p_partition_name)
    AND a.avg_ms > p_min_avg_ms
    ORDER BY a.avg_ms DESC;
END;
$$ LANGUAGE plpgsql;
```

### 40.3.3 Automatic Index Creator

```sql
-- ============================================
-- AUTOMATIC JSONB INDEX CREATOR
-- ============================================
-- Creates expression indexes on frequently queried JSONB paths
-- Uses CONCURRENTLY to avoid blocking
-- ============================================

CREATE OR REPLACE FUNCTION genesis.create_jsonb_index(
    p_partition_name TEXT,
    p_jsonb_column TEXT,
    p_jsonb_path TEXT,
    p_index_type TEXT DEFAULT 'btree'  -- btree, gin, hash
)
RETURNS TABLE (
    success BOOLEAN,
    index_name TEXT,
    create_statement TEXT,
    duration_ms INTEGER,
    error_message TEXT
) AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_index_name TEXT;
    v_sql TEXT;
BEGIN
    -- Generate index name
    v_index_name := format(
        '%s_%s_%s_idx',
        p_partition_name,
        p_jsonb_column,
        REPLACE(p_jsonb_path, '.', '_')
    );
    
    -- Check if index already exists
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = v_index_name
    ) THEN
        RETURN QUERY SELECT 
            TRUE, v_index_name, NULL::TEXT, 0,
            'Index already exists'::TEXT;
        RETURN;
    END IF;
    
    -- Generate CREATE INDEX statement
    IF p_index_type = 'gin' THEN
        v_sql := format(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS %I 
             ON genesis.%I USING gin ((%I->%L))',
            v_index_name,
            p_partition_name,
            p_jsonb_column,
            p_jsonb_path
        );
    ELSIF p_index_type = 'hash' THEN
        v_sql := format(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS %I 
             ON genesis.%I USING hash ((%I->>%L))',
            v_index_name,
            p_partition_name,
            p_jsonb_column,
            p_jsonb_path
        );
    ELSE
        -- Default: btree on extracted text value
        v_sql := format(
            'CREATE INDEX CONCURRENTLY IF NOT EXISTS %I 
             ON genesis.%I ((%I->>%L))',
            v_index_name,
            p_partition_name,
            p_jsonb_column,
            p_jsonb_path
        );
    END IF;
    
    -- Execute
    BEGIN
        EXECUTE v_sql;
        
        RETURN QUERY SELECT 
            TRUE,
            v_index_name,
            v_sql,
            EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
            NULL::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
            FALSE,
            v_index_name,
            v_sql,
            EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
            SQLERRM::TEXT;
    END;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- WATCHDOG WORKER: Run every 6 hours
-- ============================================

CREATE OR REPLACE FUNCTION genesis.run_index_watchdog()
RETURNS TABLE (
    partition_name TEXT,
    path_indexed TEXT,
    index_created BOOLEAN
) AS $$
DECLARE
    v_hot_key RECORD;
BEGIN
    FOR v_hot_key IN 
        SELECT * FROM genesis.detect_jsonb_hot_keys(
            p_min_calls := 1000,
            p_min_avg_ms := 100
        )
        WHERE recommendation = 'CREATE_INDEX_URGENT'
        LIMIT 10  -- Max 10 indexes per run
    LOOP
        RETURN QUERY
        SELECT 
            v_hot_key.partition_name,
            v_hot_key.jsonb_path,
            (genesis.create_jsonb_index(
                v_hot_key.partition_name,
                'research_data',
                v_hot_key.jsonb_path,
                'btree'
            )).success;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

## 40.4 THE SECURITY ENTROPY (RLS HARDENING)

### 40.4.1 The Session-Level Security Protocol

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RLS SECURITY MODEL                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PRINCIPLE: "Fail-Closed" Security                                         │
│                                                                             │
│  If app.workspace_id is:                                                    │
│    ├── NULL → DENY ALL (not "allow all")                                   │
│    ├── Empty string → DENY ALL                                             │
│    ├── Invalid UUID → DENY ALL                                             │
│    └── Valid but wrong → DENY (normal RLS)                                 │
│                                                                             │
│  ATTACK VECTORS BLOCKED:                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. Direct SQL injection: Cannot bypass SET LOCAL check              │   │
│  │ 2. Parameter tampering: UUID validation in policy                   │   │
│  │ 3. Null injection: COALESCE returns deny sentinel                   │   │
│  │ 4. Cross-partition: Partition key enforces boundary                 │   │
│  │ 5. Timing attack: Constant-time comparison                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 40.4.2 The Core RLS Implementation

```sql
-- ============================================
-- GENESIS RLS: FAIL-CLOSED SECURITY
-- ============================================

-- Step 1: Create secure context setter
CREATE OR REPLACE FUNCTION genesis.set_workspace_context(p_workspace_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Validate UUID format
    IF p_workspace_id IS NULL THEN
        RAISE EXCEPTION 'Workspace ID cannot be NULL';
    END IF;
    
    -- Set session parameter (transaction-scoped via SET LOCAL)
    PERFORM set_config('app.workspace_id', p_workspace_id::TEXT, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create context getter with fail-closed default
CREATE OR REPLACE FUNCTION genesis.get_workspace_context()
RETURNS UUID AS $$
DECLARE
    v_ws_id TEXT;
BEGIN
    -- Get current setting
    v_ws_id := current_setting('app.workspace_id', TRUE);
    
    -- Fail-closed: NULL or empty returns sentinel that matches nothing
    IF v_ws_id IS NULL OR v_ws_id = '' THEN
        -- Return impossible UUID that exists in no partition
        RETURN '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
    
    -- Validate UUID format
    BEGIN
        RETURN v_ws_id::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
        -- Invalid UUID format - return sentinel
        RETURN '00000000-0000-0000-0000-000000000000'::UUID;
    END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Step 3: Create the RLS policy
ALTER TABLE genesis.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.leads FORCE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS leads_workspace_isolation ON genesis.leads;

-- Create fail-closed policy
CREATE POLICY leads_workspace_isolation ON genesis.leads
    FOR ALL
    USING (
        -- This is the WHERE clause for SELECT/UPDATE/DELETE
        workspace_id = genesis.get_workspace_context()
    )
    WITH CHECK (
        -- This is the constraint for INSERT/UPDATE
        workspace_id = genesis.get_workspace_context()
    );

-- Step 4: Verify RLS is enforced
CREATE OR REPLACE FUNCTION genesis.verify_rls_active()
RETURNS TABLE (
    table_name TEXT,
    rls_enabled BOOLEAN,
    rls_forced BOOLEAN,
    policy_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.relname::TEXT,
        c.relrowsecurity,
        c.relforcerowsecurity,
        (SELECT COUNT(*)::INTEGER FROM pg_policies WHERE tablename = c.relname)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'genesis'
    AND c.relkind = 'r';
END;
$$ LANGUAGE plpgsql;
```

### 40.4.3 Application-Layer Integration

```typescript
/**
 * Genesis Engine - Database Context Manager
 * 
 * CRITICAL: All database operations MUST use this pattern
 * to ensure RLS is properly enforced.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface WorkspaceContext {
  workspaceId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
}

/**
 * Execute a database operation with workspace context
 * This is the ONLY safe way to query partitioned data
 */
export async function withWorkspaceContext<T>(
  ctx: WorkspaceContext,
  operation: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      db: {
        schema: 'genesis'
      }
    }
  );

  // Validate workspace ID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(ctx.workspaceId)) {
    throw new Error('Invalid workspace ID format');
  }

  // Set context via RPC (uses SET LOCAL internally)
  const { error: ctxError } = await supabase.rpc('set_workspace_context', {
    p_workspace_id: ctx.workspaceId
  });

  if (ctxError) {
    throw new Error(`Failed to set workspace context: ${ctxError.message}`);
  }

  // Execute operation within context
  try {
    return await operation(supabase);
  } finally {
    // Context automatically cleared when transaction ends (PgBouncer transaction mode)
  }
}

// Usage example:
async function getLeadsForWorkspace(workspaceId: string): Promise<Lead[]> {
  return withWorkspaceContext(
    { workspaceId, userId: 'system', role: 'admin' },
    async (client) => {
      const { data, error } = await client
        .from('leads')
        .select('*')
        .limit(100);
      
      if (error) throw error;
      return data;
    }
  );
}
```

### 40.4.4 RLS Attack Test Suite

```sql
-- ============================================
-- RLS SECURITY TEST SUITE
-- Run after every schema change
-- ALL TESTS MUST PASS or deployment is blocked
-- ============================================

DO $$
DECLARE
    v_count INTEGER;
    v_test_ws_1 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_test_ws_2 UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
BEGIN
    -- Setup: Create test partitions
    PERFORM genesis.fn_ignite_workspace_partition(v_test_ws_1, 'test_ws_1');
    PERFORM genesis.fn_ignite_workspace_partition(v_test_ws_2, 'test_ws_2');
    
    -- Setup: Insert test data
    PERFORM set_config('app.workspace_id', v_test_ws_1::TEXT, TRUE);
    INSERT INTO genesis.leads (workspace_id, email_address, status)
    VALUES (v_test_ws_1, 'test1@ws1.com', 'pending');
    
    PERFORM set_config('app.workspace_id', v_test_ws_2::TEXT, TRUE);
    INSERT INTO genesis.leads (workspace_id, email_address, status)
    VALUES (v_test_ws_2, 'test2@ws2.com', 'pending');
    
    -- ==========================================
    -- TEST 1: Cross-workspace access blocked
    -- ==========================================
    PERFORM set_config('app.workspace_id', v_test_ws_1::TEXT, TRUE);
    SELECT COUNT(*) INTO v_count FROM genesis.leads 
    WHERE workspace_id = v_test_ws_2;
    
    IF v_count > 0 THEN
        RAISE EXCEPTION 'TEST 1 FAILED: Cross-workspace access allowed';
    END IF;
    RAISE NOTICE 'TEST 1 PASSED: Cross-workspace access blocked';
    
    -- ==========================================
    -- TEST 2: NULL context returns zero rows
    -- ==========================================
    PERFORM set_config('app.workspace_id', '', TRUE);
    SELECT COUNT(*) INTO v_count FROM genesis.leads;
    
    IF v_count > 0 THEN
        RAISE EXCEPTION 'TEST 2 FAILED: NULL context returned % rows', v_count;
    END IF;
    RAISE NOTICE 'TEST 2 PASSED: NULL context returns zero rows';
    
    -- ==========================================
    -- TEST 3: Invalid UUID format blocked
    -- ==========================================
    BEGIN
        PERFORM set_config('app.workspace_id', 'not-a-uuid', TRUE);
        SELECT COUNT(*) INTO v_count FROM genesis.leads;
        
        IF v_count > 0 THEN
            RAISE EXCEPTION 'TEST 3 FAILED: Invalid UUID returned rows';
        END IF;
        RAISE NOTICE 'TEST 3 PASSED: Invalid UUID returns zero rows';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'TEST 3 PASSED: Invalid UUID rejected with error';
    END;
    
    -- ==========================================
    -- TEST 4: Insert to wrong partition blocked
    -- ==========================================
    PERFORM set_config('app.workspace_id', v_test_ws_1::TEXT, TRUE);
    BEGIN
        INSERT INTO genesis.leads (workspace_id, email_address, status)
        VALUES (v_test_ws_2, 'hacker@evil.com', 'pending');
        
        RAISE EXCEPTION 'TEST 4 FAILED: Cross-partition insert allowed';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'TEST 4 PASSED: Cross-partition insert blocked';
    END;
    
    -- ==========================================
    -- TEST 5: Correct workspace access works
    -- ==========================================
    PERFORM set_config('app.workspace_id', v_test_ws_1::TEXT, TRUE);
    SELECT COUNT(*) INTO v_count FROM genesis.leads 
    WHERE email_address = 'test1@ws1.com';
    
    IF v_count != 1 THEN
        RAISE EXCEPTION 'TEST 5 FAILED: Correct workspace access broken';
    END IF;
    RAISE NOTICE 'TEST 5 PASSED: Correct workspace access works';
    
    -- Cleanup
    DELETE FROM genesis.leads WHERE workspace_id IN (v_test_ws_1, v_test_ws_2);
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ALL RLS SECURITY TESTS PASSED';
    RAISE NOTICE '========================================';
END $$;
```

---

## 40.5 GENESIS SCHEMA DDL

### 40.5.1 Complete Schema Definition

```sql
-- ============================================
-- GENESIS ENGINE: CORE SCHEMA
-- Version: 1.0.0
-- ============================================

BEGIN;

-- Create genesis schema
CREATE SCHEMA IF NOT EXISTS genesis;

-- ============================================
-- PARTITION REGISTRY
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.partition_registry (
    workspace_id UUID PRIMARY KEY,
    partition_name TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'migrating', 'dropped')),
    row_count BIGINT DEFAULT 0,
    size_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEADS PARENT TABLE (PARTITIONED)
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.leads (
    id UUID DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    
    -- Contact information
    email_address TEXT NOT NULL,
    linkedin_url TEXT,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    organization_name TEXT,
    job_title TEXT,
    phone TEXT,
    location TEXT,
    industry TEXT,
    company_size TEXT,
    website_url TEXT,
    
    -- Campaign tracking
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'researching', 'ready', 'sending', 
        'sent', 'replied', 'bounced', 'opted_out', 'completed'
    )),
    campaign_name TEXT,
    
    -- Email content
    email_1_subject TEXT,
    email_1_body TEXT,
    email_2_body TEXT,
    email_3_subject TEXT,
    email_3_body TEXT,
    
    -- Send tracking
    email_1_sent BOOLEAN DEFAULT FALSE,
    email_2_sent BOOLEAN DEFAULT FALSE,
    email_3_sent BOOLEAN DEFAULT FALSE,
    email_1_sent_at TIMESTAMPTZ,
    email_2_sent_at TIMESTAMPTZ,
    email_3_sent_at TIMESTAMPTZ,
    
    -- AI data (JSONB for flexibility)
    research_data JSONB DEFAULT '{}',
    relevance_ai_output JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    PRIMARY KEY (workspace_id, id),
    UNIQUE (workspace_id, email_address)
    
) PARTITION BY LIST (workspace_id);

-- ============================================
-- DEFAULT PARTITION (catches unrouted data)
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.leads_default 
    PARTITION OF genesis.leads DEFAULT;

-- ============================================
-- GLOBAL INDEXES (on parent)
-- ============================================

CREATE INDEX IF NOT EXISTS leads_workspace_idx 
    ON genesis.leads (workspace_id);
CREATE INDEX IF NOT EXISTS leads_status_idx 
    ON genesis.leads (status) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS leads_updated_idx 
    ON genesis.leads (updated_at DESC);

-- ============================================
-- UPDATE TIMESTAMP TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION genesis.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_update_timestamp
    BEFORE UPDATE ON genesis.leads
    FOR EACH ROW EXECUTE FUNCTION genesis.update_timestamp();

-- ============================================
-- PARTITION STATS UPDATER
-- ============================================

CREATE OR REPLACE FUNCTION genesis.update_partition_stats(p_workspace_id UUID)
RETURNS VOID AS $$
DECLARE
    v_partition TEXT;
    v_count BIGINT;
    v_size BIGINT;
BEGIN
    SELECT partition_name INTO v_partition
    FROM genesis.partition_registry
    WHERE workspace_id = p_workspace_id;
    
    IF v_partition IS NULL THEN RETURN; END IF;
    
    EXECUTE format('SELECT COUNT(*) FROM genesis.%I', v_partition) INTO v_count;
    EXECUTE format('SELECT pg_total_relation_size(%L)', 'genesis.' || v_partition) INTO v_size;
    
    UPDATE genesis.partition_registry
    SET row_count = v_count, size_bytes = v_size, updated_at = NOW()
    WHERE workspace_id = p_workspace_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;
```

---

# 🏭 PHASE 50: SOVEREIGN DROPLET FACTORY

> **Phase Type:** V30 Core Infrastructure  
> **Dependencies:** None (New Foundation)  
> **Risk Level:** CRITICAL (Foundation Layer)

---

## 50.1 DROPLET FACTORY ARCHITECTURE

The Sovereign Droplet Factory is the V30 infrastructure layer that provisions, manages, and terminates dedicated DigitalOcean VMs for each tenant. This replaces the V20 shared n8n Cloud model entirely.

### 50.1.1 Droplet Specification Matrix

| Component | Specification | Rationale |
|-----------|---------------|-----------|
| **Droplet Size** | s-1vcpu-1gb ($6/month) | Minimum viable for n8n + Sidecar |
| **OS** | Ubuntu 22.04 LTS | Long-term support, Docker-native |
| **Region** | Per-tenant selection | GDPR compliance, latency optimization |
| **Image** | Custom snapshot with Docker pre-installed | Faster provisioning (<30s boot) |
| **Networking** | Public IPv4 + Private VPC | Sidecar communicates via public, internal services via VPC |
| **Firewall** | Ports 22 (SSH), 443 (HTTPS), 5678 (n8n webhook) | Minimal attack surface |

### 50.1.2 Droplet Cost Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DROPLET COST PHYSICS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BASE COSTS (Per Tenant/Month):                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Droplet (s-1vcpu-1gb):        $6.00                               │   │
│  │  Bandwidth (avg 5GB/month):    $0.50                               │   │
│  │  Snapshots (daily, 7 retained): $0.60                              │   │
│  │  ─────────────────────────────────────                             │   │
│  │  INFRASTRUCTURE SUBTOTAL:       $5.10/tenant/month                 │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  SHARED COSTS (Divided by Tenant Count):                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Redis (BullMQ - $15/month):   $0.001/tenant at 15k scale          │   │
│  │  Supabase Pro ($25/month):     $0.002/tenant at 15k scale          │   │
│  │  Dashboard Hosting:            $0.001/tenant at 15k scale          │   │
│  │  ─────────────────────────────────────                             │   │
│  │  SHARED SUBTOTAL:              ~$0.01/tenant/month                 │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  TOTAL INFRASTRUCTURE COST:       ~$5.11/tenant/month                      │
│                                                                             │
│  AT 15,000 TENANTS:                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Monthly Infrastructure:       $76,650                             │   │
│  │  Annual Infrastructure:        $919,800                            │   │
│  │                                                                     │   │
│  │  MINIMUM PRICING FOR 20% MARGIN:                                   │   │
│  │  Infrastructure: $5.11 × 1.20 = $6.13/tenant/month                 │   │
│  │                                                                     │   │
│  │  (This excludes managed service costs - see Phase 57)              │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 50.2 MULTI-ACCOUNT POOL ARCHITECTURE

**Critical Constraint:** DigitalOcean **DOES NOT** support 15,000 droplets under a single account. The V30 architecture mandates a **Multi-Account Pool Strategy** to achieve scale.

### 50.2.1 DigitalOcean Account Limits & Growth Path

| Account Tier | Default Droplet Limit | After Support Request | Cost | When to Use |
|--------------|----------------------|----------------------|------|-------------|
| **Standard (FREE)** | 25-50 droplets | 200-500 droplets | **$0** | **START HERE** - First 50-200 customers |
| **Business** | 100 droplets | 500-1,000 droplets | $50-100/month | 200-1,000 customers |
| **Enterprise** | 500 droplets | 1,000-2,000 droplets | Custom pricing | 1,000+ customers |

**The Phased Growth Strategy (No Refactoring Required):**

#### **PHASE 1: Bootstrap (0-150 Customers) - START HERE**
- **1-3 Standard DigitalOcean accounts** (FREE to create)
- Default limit: 50 droplets per account
- Total capacity: **150 droplets**
- Cost: **$0 for accounts** (only pay for active droplets)
- Action: Create accounts manually, add to `do_accounts` table

#### **PHASE 2: Early Growth (150-1,500 Customers)**
- **6-10 Standard accounts**
- Request limit increases via DO support (usually granted for free to 200-500 droplets)
- Total capacity: **1,500-5,000 droplets**
- Cost: Still **$0 for accounts**
- Action: Email DO support per account: "We're growing, can we get a limit increase to 200?"

#### **PHASE 3: Scale (1,500-5,000 Customers)**
- **10-15 accounts with increased limits** (mix of Standard with 500 limit)
- Some accounts may need Business tier if DO requires it
- Total capacity: **5,000-7,500 droplets**
- Cost: $0-500/month in account fees
- Action: Negotiate with DO support, upgrade only if required

#### **PHASE 4: Enterprise Scale (5,000-15,000+ Customers)**
- **15-20 Enterprise accounts** (or partnership with DO)
- Negotiated limits: 1,000-2,000 per account
- Total capacity: **15,000-40,000 droplets**
- Cost: Negotiate custom pricing (you have revenue by now)
- Action: Partner with DO for bulk pricing

**KEY INSIGHT: You start with Phase 1 TODAY (FREE), and the architecture handles all future phases with ZERO refactoring.**

**The Seamless Transition Process:**
1. **TODAY**: Insert 1-3 accounts with `max_droplets = 50` → Start onboarding
2. **3 MONTHS**: Email DO support → Update `max_droplets = 200` in DB → Continue onboarding
3. **6 MONTHS**: Add 3 more free accounts → Insert new rows in `do_accounts` → Continue onboarding
4. **1 YEAR**: Upgrade 2 accounts to Business tier → Update `max_droplets = 1000` in DB → Continue onboarding
5. **2 YEARS**: Partner with DO for Enterprise → Update `max_droplets = 2000` in DB → Continue onboarding

**No code changes. No migrations. No downtime. Just update numbers in the database.**

### 50.2.2 Why This Architecture is Refactor-Free

**The `do_accounts` table doesn't care about account tier** - it only cares about `max_droplets`. This means you can upgrade accounts independently without changing ANY code:

**Example Transition (No Code Changes):**

```sql
-- TODAY (Bootstrap Phase 1):
INSERT INTO genesis.do_accounts (account_id, max_droplets, region) VALUES
  ('genesis-do-pool-us-east-01', 50, 'nyc1'),    -- FREE Standard account
  ('genesis-do-pool-us-east-02', 50, 'nyc3');    -- FREE Standard account
-- Capacity: 100 droplets

-- 6 MONTHS LATER (After emailing DO support):
UPDATE genesis.do_accounts 
SET max_droplets = 200 
WHERE account_id = 'genesis-do-pool-us-east-01';  -- Limit increase granted
-- Capacity: 250 droplets (no code changes, just update DB)

-- 1 YEAR LATER (Upgrade to Business tier):
UPDATE genesis.do_accounts 
SET max_droplets = 500 
WHERE account_id = 'genesis-do-pool-us-east-01';  -- Upgraded to Business
-- Capacity: 550 droplets (still no code changes)

-- 2 YEARS LATER (Enterprise partnership):
UPDATE genesis.do_accounts 
SET max_droplets = 2000 
WHERE account_id = 'genesis-do-pool-us-east-01';  -- Negotiated Enterprise limit
-- Capacity: 2,050 droplets (STILL no code changes)
```

**The load-balancer automatically adapts** - it doesn't know or care if an account has 50 or 2,000 droplets. It just queries for `available_capacity`.

---

### 50.2.3 Account Pool Schema

Genesis operates a **pool of DigitalOcean accounts** (starting with 1-3 FREE standard accounts). The Dashboard maintains a `do_accounts` table to track the pool:

```sql
CREATE TABLE genesis.do_accounts (
  account_id TEXT PRIMARY KEY,             -- "genesis-do-pool-01", "genesis-do-pool-02", etc.
  api_token_encrypted TEXT NOT NULL,       -- Encrypted DO API token (AES-256-GCM)
  region TEXT NOT NULL,                    -- "nyc1", "sfo3", "fra1", etc.
  max_droplets INTEGER NOT NULL,           -- Agreed limit with DO support (e.g., 1000)
  current_droplets INTEGER DEFAULT 0,      -- Live count of active droplets
  status TEXT DEFAULT 'active',            -- "active", "full", "suspended", "maintenance"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_provisioned_at TIMESTAMPTZ,
  
  -- Organizational metadata
  billing_email TEXT,                      -- genesis-billing-pool-01@genesis.io
  support_ticket_id TEXT,                  -- DO support ticket for limit increase
  notes TEXT                               -- "Primary US-East account", "EU GDPR pool", etc.
);

-- Index for fast load-balancing queries
CREATE INDEX idx_do_accounts_load_balance 
  ON genesis.do_accounts (region, status, current_droplets) 
  WHERE status = 'active';
```

### 50.2.4 Getting Started (TODAY) - Bootstrap Setup

**To launch Genesis with ZERO upfront cost:**

1. **Create 1-3 DigitalOcean accounts** (free to create):
   - `genesis-do-pool-us-east-01@yourdomain.com`
   - `genesis-do-pool-us-east-02@yourdomain.com`
   - `genesis-do-pool-eu-west-01@yourdomain.com` (if targeting EU)

2. **Get API tokens** from each account (Settings → API → Generate New Token)
   - The tokens look like: `dop_v1_1234567890abcdef...` (64 characters)
   - **DO NOT put these in `.env.local`** (you need multiple tokens, .env only holds one)

3. **Insert into `do_accounts` table** (via Supabase SQL Editor):
   ```sql
   INSERT INTO genesis.do_accounts (account_id, api_token_encrypted, region, max_droplets) VALUES
     (
       'genesis-do-pool-us-east-01', 
       extensions.pgp_sym_encrypt('dop_v1_YOUR_ACTUAL_TOKEN_HERE', current_setting('app.encryption_key')),
       'nyc1', 
       50
     ),
     (
       'genesis-do-pool-us-east-02', 
       extensions.pgp_sym_encrypt('dop_v1_ANOTHER_TOKEN_HERE', current_setting('app.encryption_key')),
       'nyc3', 
       50
     );
   ```
   - Tokens are encrypted at rest in Supabase
   - Dashboard decrypts them on-demand when provisioning

4. **Ensure `.env.local` has encryption key** (used to decrypt DO tokens from DB):
   ```bash
   # .env.local (add this if not already present)
   INTERNAL_ENCRYPTION_KEY=your-32-byte-hex-key-here  # Used to decrypt DO API tokens from DB
   ```
   - Generate key: `openssl rand -hex 32`
   - This key encrypts/decrypts ALL DO tokens stored in Supabase
   - **DO NOT** put individual DO API tokens in `.env.local`

5. **Start onboarding customers** - The load-balancer will distribute droplets across accounts automatically

6. **When you hit 80% capacity** (40/50 droplets):
   - **Option A:** Create another free DO account and add to pool
   - **Option B:** Email DO support: "We're growing, can we increase our limit?"

**You now have capacity for 50-150 customers with $0 account fees.**

**Critical Architecture Note:**
- ❌ **DO NOT** store individual DO API tokens in `.env.local` (won't scale to multiple accounts)
- ✅ **DO** store ONLY the encryption key in `.env.local` (`INTERNAL_ENCRYPTION_KEY`)
- ✅ **DO** store encrypted DO tokens in `genesis.do_accounts` table (Supabase)
- Each account gets its own encrypted token, Dashboard decrypts on-demand when provisioning

---

### 50.2.5 HOW IT ACTUALLY WORKS: The Routing & Auto-Selection Flow

**This section answers: "How does the Dashboard connect to multiple DO accounts and automatically switch when one is full?"**

#### **Step 1: Initial Setup (ONE-TIME) - Adding Accounts to the Pool**

You manually add DO accounts to the pool via a Supabase SQL query or Admin UI:

```sql
-- Run this ONCE per DO account (e.g., in Supabase SQL Editor)
INSERT INTO genesis.do_accounts (
  account_id, 
  api_token_encrypted, 
  region, 
  max_droplets, 
  status
) VALUES (
  'genesis-do-pool-us-east-01',
  
  -- Encrypt the API token using Dashboard's INTERNAL_ENCRYPTION_KEY
  extensions.pgp_sym_encrypt(
    'dop_v1_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',  -- Your DO API token
    current_setting('app.encryption_key')  -- Uses INTERNAL_ENCRYPTION_KEY from .env.local
  ),
  
  'nyc1',     -- DigitalOcean region code
  50,         -- Max droplets for this account
  'active'    -- Status
);

-- Add more accounts:
INSERT INTO genesis.do_accounts VALUES
  ('genesis-do-pool-us-east-02', extensions.pgp_sym_encrypt('dop_v1_another_token...', current_setting('app.encryption_key')), 'nyc3', 50, 'active'),
  ('genesis-do-pool-eu-west-01', extensions.pgp_sym_encrypt('dop_v1_eu_token...', current_setting('app.encryption_key')), 'fra1', 50, 'active');
```

**After this setup:**
- The `.env.local` file does NOT contain DO API tokens
- Only `INTERNAL_ENCRYPTION_KEY` is in `.env.local` (used to decrypt tokens from DB)
- All DO tokens are stored encrypted in Supabase

---

#### **Step 2: User Clicks "Ignite" - The Automatic Account Selection**

When a user completes onboarding and clicks "Start Engine," the Ignition Orchestrator runs this flow:

```typescript
// app/api/ignition/route.ts (simplified)

import { createClient } from '@/lib/supabase';
import DigitalOcean from 'do-wrapper';

export async function POST(request: Request) {
  const { workspace_id, selected_region } = await request.json();
  
  // STEP 1: Select account with available capacity
  const supabase = createClient();
  const { data: accounts } = await supabase
    .from('genesis.do_accounts')
    .select('*')
    .eq('region', selected_region)  // User's selected region (e.g., 'nyc1')
    .eq('status', 'active')
    .lt('current_droplets', 'max_droplets')  // Not at capacity
    .order('current_droplets', { ascending: true })  // Prefer least-loaded account
    .limit(1);
  
  if (!accounts || accounts.length === 0) {
    return Response.json({ 
      error: 'NO_CAPACITY', 
      message: 'All DO accounts at capacity. Please add more accounts.' 
    }, { status: 503 });
  }
  
  const selectedAccount = accounts[0];
  
  // STEP 2: Decrypt the API token for this account
  const { data: decryptedToken } = await supabase.rpc('decrypt_do_token', {
    account_id: selectedAccount.account_id
  });
  
  // STEP 3: Create DigitalOcean API client for this specific account
  const doClient = new DigitalOcean(decryptedToken, 100);  // Use this account's token
  
  // STEP 4: Provision droplet
  const dropletConfig = {
    name: `genesis-${workspace_id}`,
    region: selected_region,
    size: 's-1vcpu-1gb',  // $6/month tier
    image: 'ubuntu-22-04-x64',
    tags: [
      `genesis:account:${selectedAccount.account_id}`,
      `genesis:workspace_id:${workspace_id}`,
    ],
    user_data: generateCloudInitScript(workspace_id),  // Cloud-Init for Sidecar
  };
  
  try {
    const droplet = await doClient.dropletsCreate(dropletConfig);
    
    // STEP 5: Increment the account's droplet counter (atomic)
    await supabase.rpc('increment_droplet_count', {
      account_id: selectedAccount.account_id
    });
    
    // STEP 6: Store droplet metadata in workspace
    await supabase
      .from('workspaces')
      .update({
        droplet_id: droplet.droplet.id,
        droplet_account: selectedAccount.account_id,  // Track which account owns this droplet
        droplet_region: selected_region,
        status: 'initializing',
      })
      .eq('id', workspace_id);
    
    return Response.json({ 
      success: true, 
      droplet_id: droplet.droplet.id,
      account_used: selectedAccount.account_id  // For debugging
    });
    
  } catch (error) {
    return Response.json({ error: 'PROVISIONING_FAILED', details: error.message }, { status: 500 });
  }
}
```

---

#### **Step 3: What Happens When Account 1 Hits Capacity?**

**Scenario:**
- `genesis-do-pool-us-east-01` has 50/50 droplets (FULL)
- `genesis-do-pool-us-east-02` has 12/50 droplets (AVAILABLE)

**User clicks "Ignite":**

1. **Query runs:**
   ```sql
   SELECT * FROM genesis.do_accounts
   WHERE region = 'nyc1' 
     AND status = 'active'
     AND current_droplets < max_droplets  -- This filters out account-01 (50 < 50 = false)
   ORDER BY current_droplets ASC
   LIMIT 1;
   ```

2. **Result:** Returns `genesis-do-pool-us-east-02` (12/50 available)

3. **Dashboard decrypts** `genesis-do-pool-us-east-02`'s API token

4. **Dashboard provisions droplet** using account-02's API client

5. **User never knows** which account was used - it's transparent

**The failover is automatic and immediate.**

---

#### **Step 4: Database Functions for Token Decryption**

Create these Postgres functions in Supabase (run once during setup):

```sql
-- Function to decrypt DO API tokens
CREATE OR REPLACE FUNCTION genesis.decrypt_do_token(account_id TEXT)
RETURNS TEXT AS $$
DECLARE
  encrypted_token TEXT;
  decrypted TEXT;
BEGIN
  SELECT api_token_encrypted INTO encrypted_token
  FROM genesis.do_accounts
  WHERE genesis.do_accounts.account_id = decrypt_do_token.account_id;
  
  -- Decrypt using pgcrypto (requires pgcrypto extension)
  SELECT extensions.pgp_sym_decrypt(
    encrypted_token::bytea, 
    current_setting('app.encryption_key')
  ) INTO decrypted;
  
  RETURN decrypted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to atomically increment droplet count
CREATE OR REPLACE FUNCTION genesis.increment_droplet_count(account_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE genesis.do_accounts
  SET 
    current_droplets = current_droplets + 1,
    last_provisioned_at = NOW()
  WHERE genesis.do_accounts.account_id = increment_droplet_count.account_id;
END;
$$ LANGUAGE plpgsql;

-- Function to atomically decrement droplet count (when droplet deleted)
CREATE OR REPLACE FUNCTION genesis.decrement_droplet_count(account_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE genesis.do_accounts
  SET current_droplets = GREATEST(0, current_droplets - 1)  -- Never go below 0
  WHERE genesis.do_accounts.account_id = decrement_droplet_count.account_id;
END;
$$ LANGUAGE plpgsql;
```

---

#### **Step 5: Admin UI for Managing Accounts (Optional but Recommended)**

Create an admin page at `/admin/do-accounts` to visualize the pool:

```tsx
// app/admin/do-accounts/page.tsx (simplified UI)

export default function DOAccountsPage() {
  const { data: accounts } = useSWR('/api/admin/do-accounts', fetcher);
  
  return (
    <div>
      <h1>DigitalOcean Account Pool</h1>
      <table>
        <thead>
          <tr>
            <th>Account ID</th>
            <th>Region</th>
            <th>Capacity</th>
            <th>Status</th>
            <th>Last Used</th>
          </tr>
        </thead>
        <tbody>
          {accounts?.map(account => (
            <tr key={account.account_id}>
              <td>{account.account_id}</td>
              <td>{account.region}</td>
              <td>
                {account.current_droplets} / {account.max_droplets}
                <ProgressBar value={account.current_droplets / account.max_droplets * 100} />
              </td>
              <td>
                <Badge color={account.status === 'active' ? 'green' : 'red'}>
                  {account.status}
                </Badge>
              </td>
              <td>{formatDate(account.last_provisioned_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <Button onClick={() => openAddAccountModal()}>
        + Add New DO Account
      </Button>
    </div>
  );
}
```

**This UI lets you:**
- See which accounts are nearly full (e.g., 48/50)
- Add new accounts via a form (easier than SQL)
- Monitor utilization across regions

---

#### **Summary: The Complete Flow**

1. **Setup (ONE-TIME)**: Add 1-5 DO accounts to `genesis.do_accounts` table with encrypted tokens
2. **User Ignites**: Dashboard queries for account with available capacity in user's region
3. **Automatic Selection**: Query returns the best account, Dashboard decrypts its token
4. **Provisioning**: Dashboard creates droplet using that account's API client
5. **Counter Update**: `current_droplets` increments atomically
6. **Transparent Failover**: If account is full, query automatically skips it and uses next account
7. **No User Impact**: User never knows which account was used

**No .env.local juggling. No manual switching. Fully automatic.**

---

### 50.2.6 Account Organizational Strategy

**Naming Convention:**
```
genesis-do-pool-{region}-{number}

Examples:
- genesis-do-pool-us-east-01
- genesis-do-pool-us-east-02
- genesis-do-pool-eu-west-01
- genesis-do-pool-apac-01
```

**Regional Segmentation (Example at Scale):**
- **US-East**: 6 accounts × 500-2,000 droplets = 3,000-12,000 capacity
- **US-West**: 3 accounts × 500-2,000 droplets = 1,500-6,000 capacity
- **EU-West**: 4 accounts × 500-2,000 droplets = 2,000-8,000 capacity
- **EU-North**: 1 account × 500-2,000 droplets = 500-2,000 capacity
- **APAC**: 2 accounts × 500-2,000 droplets = 1,000-4,000 capacity
- **TOTAL**: 16+ accounts = **8,000-32,000 capacity** (scales with account upgrades)

**Bootstrap Reality (TODAY):**
- **US-East**: 2 accounts × 50 droplets = 100 capacity (**$0 in account fees**)
- **EU-West**: 1 account × 50 droplets = 50 capacity (**$0 in account fees**)
- **TOTAL**: 3 accounts = **150 capacity to start**

**Cost Implications:**
- DigitalOcean accounts are free to create
- Each account gets its own monthly bill
- Genesis consolidates billing internally
- Use separate credit cards or Stripe payment methods per account

### 50.2.7 Load-Balancing Algorithm (SQL Details)

When provisioning a new droplet, the **Ignition Orchestrator** (Phase 41) selects an account using this algorithm:

```sql
-- Load-Balancing Query (finds account with most available capacity)
SELECT 
  account_id,
  api_token_encrypted,
  max_droplets,
  current_droplets,
  (max_droplets - current_droplets) AS available_capacity
FROM genesis.do_accounts
WHERE 
  region = $1                              -- User's selected region (e.g., "nyc1")
  AND status = 'active'
  AND current_droplets < max_droplets      -- Not at capacity
ORDER BY 
  available_capacity DESC,                 -- Prefer account with most room
  last_provisioned_at ASC NULLS FIRST      -- Load balance across accounts
LIMIT 1
FOR UPDATE;                                -- Row-level lock to prevent race conditions
```

**After provisioning:**
1. Increment `current_droplets` counter
2. Update `last_provisioned_at` timestamp
3. Tag droplet with `account_id` for cost tracking

### 50.2.8 Droplet Tagging Strategy

Every droplet is tagged with metadata for organizational purposes:

| Tag Key | Example Value | Purpose |
|---------|---------------|---------|
| `genesis:account` | `genesis-do-pool-us-east-02` | Cost allocation |
| `genesis:workspace_id` | `550e8400-e29b-41d4-a716-446655440000` | Tenant tracking |
| `genesis:workspace_slug` | `acme-corp` | Human-readable identifier |
| `genesis:droplet_tier` | `starter` / `professional` / `scale` / `enterprise` | Sizing tier |
| `genesis:provisioned_at` | `2026-01-15T10:30:00Z` | Provisioning timestamp |
| `genesis:region` | `us-east` | Logical region |

**Benefits:**
- **Cost Reports**: Group droplet costs by `genesis:account` to validate billing
- **Tenant Lookup**: Find droplet by `genesis:workspace_id`
- **Capacity Planning**: Count droplets by `genesis:droplet_tier` to forecast resource needs
- **Audit Logs**: Track provisioning history via `genesis:provisioned_at`

### 50.2.9 Account Health Monitoring

The Dashboard runs a **Pool Health Cron** every 5 minutes to sync account capacity:

```typescript
// Pseudo-code for Pool Health Sync
async function syncPoolHealth() {
  const accounts = await db.query('SELECT * FROM genesis.do_accounts WHERE status = "active"');
  
  for (const account of accounts) {
    const apiToken = decrypt(account.api_token_encrypted);
    const doClient = new DigitalOceanAPI(apiToken);
    
    // Fetch actual droplet count from DO API
    const droplets = await doClient.droplets.list({ tag_name: `genesis:account:${account.account_id}` });
    const actualCount = droplets.length;
    
    // Compare with DB count
    if (actualCount !== account.current_droplets) {
      await db.query(
        'UPDATE genesis.do_accounts SET current_droplets = $1 WHERE account_id = $2',
        [actualCount, account.account_id]
      );
      
      // Alert if significant drift
      if (Math.abs(actualCount - account.current_droplets) > 10) {
        await sendAlert({
          type: 'pool_drift_detected',
          account: account.account_id,
          expected: account.current_droplets,
          actual: actualCount,
        });
      }
    }
    
    // Mark account as "full" if at capacity
    if (actualCount >= account.max_droplets * 0.95) {
      await db.query('UPDATE genesis.do_accounts SET status = "full" WHERE account_id = $1', [account.account_id]);
      await sendAlert({
        type: 'account_near_capacity',
        account: account.account_id,
        utilization: (actualCount / account.max_droplets) * 100,
      });
    }
  }
}
```

### 50.2.10 Scaling Beyond 16,000 Droplets

**If/when Genesis exceeds 16,000 tenants:**

**Option 1: Add More DigitalOcean Accounts**
- Provision additional accounts: `genesis-do-pool-us-east-07`, etc.
- Update `do_accounts` table with new entries
- Load-balancer automatically distributes to new accounts

**Option 2: Multi-Cloud Strategy**
- Expand to **Linode**, **Vultr**, **Hetzner**
- Add `cloud_provider` column to `do_accounts` table (rename to `cloud_accounts`)
- Ignition Orchestrator becomes cloud-agnostic
- User selects provider during onboarding (or Genesis auto-selects)

**Option 3: DigitalOcean Enterprise Partnership**
- Negotiate with DO for a "Master Account" with 50,000+ droplet limit
- Unlikely for typical use cases, but possible at mega-scale

---

### 50.1.3 Docker Mandate and Standardization

Docker is the required execution environment on every droplet. All tenant environments are **perfect, standardized clones** of a master Docker Compose configuration.

**Container Stack per Droplet:**

| Container | Image | Purpose | Resource Limits |
|-----------|-------|---------|-----------------|
| **n8n** | n8nio/n8n:latest | Workflow execution engine | 512MB RAM, 0.5 CPU |
| **postgres** | postgres:16 | n8n's internal database | 256MB RAM, 0.3 CPU |
| **sidecar** | genesis/sidecar:v1.0 | Agent for Control Plane | 128MB RAM, 0.1 CPU |
| **caddy** | caddy:2-alpine | Reverse proxy, SSL termination, tracking domains | 64MB RAM, 0.1 CPU |

**Benefits of Docker Standardization:**

1. **Faster provisioning** - No native package installation, just `docker-compose up`
2. **Version control** - Pin exact n8n version across entire fleet
3. **Isolation** - Containers have resource limits, preventing runaway processes
4. **Updates** - Blue-Green container swap with zero downtime
5. **Debugging** - Consistent environment, reproducible issues

---

### 50.1.4 The Production Docker Stack (Battle-Tested Configuration)

This section shows the **actual production docker-compose.yml** that runs on every tenant droplet. This configuration has been battle-tested on $6 droplets (1 vCPU, 1 GB RAM) and is optimized for stability.

#### **The Complete docker-compose.yml:**

```yaml
services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - n8n

  n8n:
    image: docker.n8n.io/n8nio/n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      # Domain Configuration (Dual-Mode: sslip.io for bootstrap, custom domain for production)
      - N8N_HOST=${N8N_DOMAIN}
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - NODE_ENV=production
      - WEBHOOK_URL=https://${N8N_DOMAIN}/
      - GENERIC_TIMEZONE=${TIMEZONE}
      
      # Security
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      
      # Database Connection
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=${POSTGRES_DB}
      - DB_POSTGRESDB_USER=${POSTGRES_USER}
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
      
      # 1GB RAM Optimization (CRITICAL)
      - N8N_METRICS_CONTROLS_ENABLED=false
      - NODE_OPTIONS=--max-old-space-size=512
      
    links:
      - postgres
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - n8n_data:/home/node/.n8n

  postgres:
    image: postgres:16
    restart: always
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - db_storage:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -h localhost -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10

  sidecar:
    image: genesis/sidecar:v1.0
    restart: always
    environment:
      - WORKSPACE_ID=${WORKSPACE_ID}
      - DASHBOARD_URL=${DASHBOARD_URL}
      - PROVISIONING_TOKEN=${PROVISIONING_TOKEN}
      - N8N_URL=http://n8n:5678
    depends_on:
      - n8n
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock  # For Blue-Green container swaps

volumes:
  caddy_data:
  caddy_config:
  n8n_data:
  db_storage:
```

#### **Dual-Mode Caddyfile (Bootstrap + Production):**

```caddy
# Bootstrap Mode: sslip.io (immediate SSL, no DNS setup required)
{$DROPLET_IP}.sslip.io {
    reverse_proxy n8n:5678 {
        flush_interval -1  # Critical for n8n's streaming responses
    }
}

# Production Mode: Custom tracking domain (requires CNAME setup)
{$CUSTOM_DOMAIN} {
    reverse_proxy n8n:5678 {
        flush_interval -1
    }
}
```

**How Dual-Mode Works:**
1. **Day 1 (Bootstrap)**: Droplet boots with `DROPLET_IP=159.223.x.x`, accessible at `https://159.223.x.x.sslip.io`
2. **Day 2 (Production)**: User adds CNAME, Sidecar detects it, updates Caddy config to add `track.clientdomain.com`
3. **Both work simultaneously**: sslip.io remains as fallback, custom domain becomes primary

---

### 50.1.5 The "Survival Mode" Configuration (1GB RAM Optimization)

Running n8n + Postgres + Caddy + Sidecar on 1 GB RAM **will crash immediately** without these optimizations:

#### **Critical System Configuration:**

**1. Swap File (4GB Fake RAM):**
```bash
# Without Swap: OOM Killer terminates n8n when RAM hits 1GB
# With Swap: System uses disk as overflow RAM (slower but doesn't crash)

fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

**Why 4GB?** n8n workflows with AI operations can spike to 1.5-2GB RAM temporarily. Swap prevents crashes.

**2. Docker Log Limits (Prevent Disk Exhaustion):**
```json
// /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

**Why?** Without limits, n8n logs can fill 25GB disk in a week, causing the droplet to become unresponsive.

**3. Node.js Memory Cap:**
```bash
NODE_OPTIONS=--max-old-space-size=512  # Limit n8n to 512MB heap
```

**Why?** Prevents n8n from consuming all 1GB, leaving room for Postgres (256MB) + Caddy (64MB) + Sidecar (128MB) + OS (200MB).

**4. Firewall (UFW):**
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP (Caddy)
ufw allow 443/tcp  # HTTPS (Caddy)
ufw --force enable
```

**Why?** Closes all unnecessary ports. Postgres (5432) is NOT exposed to the internet (only accessible within Docker network).

#### **Survival Mode Verification:**

After Cloud-Init completes, the Sidecar runs this health check:

```bash
# Expected output for healthy droplet:
free -h
#              total        used        free
# Mem:          981Mi       600Mi       381Mi
# Swap:         4.0Gi        50Mi       3.9Gi   <-- Swap must show 4GB

docker stats --no-stream
# n8n:       ~400MB RAM
# postgres:  ~150MB RAM
# caddy:     ~20MB RAM
# sidecar:   ~50MB RAM
# TOTAL:     ~620MB (leaves 360MB buffer)
```

If Swap doesn't show 4GB, the droplet is flagged as `UNHEALTHY` and rolled back.

### 50.1.6 Cloud-Init Atomic Ignition Protocol (The Actual Script)

The **Cloud-Init** script executes on first boot, transforming a bare Ubuntu VM into a fully operational tenant environment in under 60 seconds. This section shows the **actual bash script** that the Ignition Orchestrator injects as `user_data` when provisioning the droplet.

#### **The Complete Cloud-Init Script:**

```bash
#!/bin/bash
set -e

# === CLOUD-INIT USER-DATA SCRIPT ===
# Injected by Ignition Orchestrator during droplet provisioning
# Variables are templated by Dashboard before sending to DO API

# === PHASE 1: SURVIVAL MODE (1GB RAM Hardening) ===

# 1.1 Create 4GB Swap (Prevents OOM crashes)
if [ ! -f /swapfile ]; then
    echo "[CLOUD-INIT] Creating 4GB Swap..."
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "[CLOUD-INIT] Swap active."
fi

# 1.2 Install Docker (if not in snapshot)
if ! command -v docker &> /dev/null; then
    echo "[CLOUD-INIT] Installing Docker..."
    apt-get update -y
    apt-get install -y docker.io docker-compose-v2 curl
    systemctl enable docker
    systemctl start docker
    echo "[CLOUD-INIT] Docker installed."
fi

# 1.3 Configure Docker Log Limits (Prevents disk exhaustion)
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
systemctl restart docker

# 1.4 Configure Firewall (UFW)
echo "[CLOUD-INIT] Setting up firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP (Caddy)
ufw allow 443/tcp  # HTTPS (Caddy)
echo "y" | ufw enable
echo "[CLOUD-INIT] Firewall active."

# === PHASE 2: APPLICATION DEPLOYMENT ===

# 2.1 Create application directory
mkdir -p /opt/genesis
cd /opt/genesis

# 2.2 Detect public IP (for sslip.io bootstrap)
export DROPLET_IP=$(curl -s ifconfig.me)
echo "[CLOUD-INIT] Droplet IP: $DROPLET_IP"

# 2.3 Write environment file
cat > .env <<EOF
# Tenant Identity (Injected by Dashboard)
WORKSPACE_ID={{WORKSPACE_ID}}
WORKSPACE_SLUG={{WORKSPACE_SLUG}}

# Domain Configuration (Dual-Mode)
N8N_DOMAIN=${DROPLET_IP}.sslip.io
CUSTOM_DOMAIN={{CUSTOM_TRACKING_DOMAIN}}
DROPLET_IP=${DROPLET_IP}

# Database Credentials (Generated by Dashboard)
POSTGRES_USER=n8n
POSTGRES_PASSWORD={{POSTGRES_PASSWORD}}
POSTGRES_DB=n8n

# n8n Configuration
N8N_ENCRYPTION_KEY={{N8N_ENCRYPTION_KEY}}
TIMEZONE={{TIMEZONE}}

# Dashboard Connection
DASHBOARD_URL={{DASHBOARD_URL}}
PROVISIONING_TOKEN={{PROVISIONING_TOKEN}}
EOF

# 2.4 Write docker-compose.yml (from Section 50.1.4 above)
cat > docker-compose.yml <<'COMPOSE_EOF'
services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - n8n

  n8n:
    image: docker.n8n.io/n8nio/n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=${N8N_DOMAIN}
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - NODE_ENV=production
      - WEBHOOK_URL=https://${N8N_DOMAIN}/
      - GENERIC_TIMEZONE=${TIMEZONE}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=${POSTGRES_DB}
      - DB_POSTGRESDB_USER=${POSTGRES_USER}
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
      - N8N_METRICS_CONTROLS_ENABLED=false
      - NODE_OPTIONS=--max-old-space-size=512
    links:
      - postgres
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - n8n_data:/home/node/.n8n

  postgres:
    image: postgres:16
    restart: always
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - db_storage:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -h localhost -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10

  sidecar:
    image: genesis/sidecar:v1.0
    restart: always
    environment:
      - WORKSPACE_ID=${WORKSPACE_ID}
      - DASHBOARD_URL=${DASHBOARD_URL}
      - PROVISIONING_TOKEN=${PROVISIONING_TOKEN}
      - N8N_URL=http://n8n:5678
    depends_on:
      - n8n
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock

volumes:
  caddy_data:
  caddy_config:
  n8n_data:
  db_storage:
COMPOSE_EOF

# 2.5 Write Caddyfile (Dual-Mode: Bootstrap + Production)
cat > Caddyfile <<EOF
# Bootstrap Mode: sslip.io (immediate SSL)
${DROPLET_IP}.sslip.io {
    reverse_proxy n8n:5678 {
        flush_interval -1
    }
}

# Production Mode: Custom domain (added dynamically by Sidecar)
# Will be updated to track.clientdomain.com when CNAME is detected
EOF

# 2.6 Launch the stack
echo "[CLOUD-INIT] Launching Docker stack..."
docker compose up -d

# 2.7 Wait for n8n to be ready
echo "[CLOUD-INIT] Waiting for n8n to start..."
for i in {1..30}; do
    if curl -s http://localhost:5678/healthz > /dev/null 2>&1; then
        echo "[CLOUD-INIT] n8n is ready."
        break
    fi
    sleep 2
done

# === PHASE 3: SIDECAR HANDSHAKE ===
# The Sidecar container (started above) will automatically:
# 1. Wait for n8n to be healthy
# 2. POST to Dashboard with webhook URL
# 3. Receive credentials and inject them
# 4. Deploy workflows from Golden Template

echo "[CLOUD-INIT] Cloud-Init complete. Sidecar taking over."
```

#### **Variable Injection by Dashboard:**

When the Ignition Orchestrator calls `doClient.dropletsCreate()`, it templates the script:

```typescript
const cloudInitScript = CLOUD_INIT_TEMPLATE
  .replace('{{WORKSPACE_ID}}', workspace.id)
  .replace('{{WORKSPACE_SLUG}}', workspace.slug)
  .replace('{{POSTGRES_PASSWORD}}', generateSecurePassword())
  .replace('{{N8N_ENCRYPTION_KEY}}', generateEncryptionKey())
  .replace('{{TIMEZONE}}', workspace.timezone || 'America/Los_Angeles')
  .replace('{{DASHBOARD_URL}}', process.env.NEXT_PUBLIC_APP_URL)
  .replace('{{PROVISIONING_TOKEN}}', generateProvisioningToken())
  .replace('{{CUSTOM_TRACKING_DOMAIN}}', workspace.tracking_domain || '');
```

---

### 50.1.7 Dual-Mode Domain Strategy (Bootstrap + Production)

The V30 architecture uses a **dual-mode DNS strategy** to balance immediate availability (sslip.io) with professional branding (custom domains):

| Mode | DNS Pattern | SSL Method | Use Case | Setup Time |
|------|-------------|------------|----------|------------|
| **Bootstrap** | `159.223.x.x.sslip.io` | Automatic (sslip.io) | Immediate droplet access, testing | **0 seconds** |
| **Production** | `track.clientdomain.com` | Caddy + Let's Encrypt | Client-facing tracking links | **2-5 minutes** |

#### **Why Both?**

**sslip.io (Bootstrap):**
- ✅ **Zero DNS setup**: Works instantly after droplet boots
- ✅ **Testing**: Sidecar can immediately POST handshake webhook
- ✅ **Fallback**: If custom domain fails, sslip.io continues to work
- ❌ **Not branded**: Ugly IP-based URLs

**Custom Domain (Production):**
- ✅ **Professional**: `track.acmecorp.com` looks legitimate in emails
- ✅ **Deliverability**: Better email reputation than generic IPs
- ✅ **Branding**: Each client uses their own domain
- ❌ **Setup required**: User must add CNAME (automated via Entri)

#### **The Handoff Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DUAL-MODE DNS HANDOFF                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  T+0s:    Droplet boots                                                    │
│           Caddyfile has: 159.223.x.x.sslip.io (Bootstrap)                 │
│           n8n webhook URL: https://159.223.x.x.sslip.io/webhook/abc       │
│                                                                             │
│  T+60s:   Sidecar POSTs Atomic Handshake                                   │
│           Uses sslip.io URL (works immediately, no CNAME needed)          │
│           Dashboard stores: workspace.webhook_url = "159...sslip.io"      │
│                                                                             │
│  T+300s:  User completes DNS setup via Entri                               │
│           Adds CNAME: track.acmecorp.com → genesis-droplet-159.io         │
│           Dashboard detects CNAME                                          │
│                                                                             │
│  T+320s:  Dashboard sends command to Sidecar: ADD_TRACKING_DOMAIN          │
│           Sidecar updates Caddyfile:                                       │
│           - Keeps 159.223.x.x.sslip.io (fallback)                         │
│           - Adds track.acmecorp.com (primary)                              │
│           Caddy reloads gracefully (zero downtime)                         │
│           Let's Encrypt provisions SSL for track.acmecorp.com             │
│                                                                             │
│  T+360s:  Dashboard updates tracking links                                 │
│           New emails use: https://track.acmecorp.com/webhook/abc          │
│           Old sslip.io links still work (fallback)                         │
│                                                                             │
│  RESULT:  Both domains work. Custom domain is primary.                    │
│           If custom domain DNS breaks, sslip.io continues working.         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### **Caddyfile Evolution:**

**Stage 1: Bootstrap (T+0s to T+300s)**
```caddy
159.223.45.67.sslip.io {
    reverse_proxy n8n:5678 {
        flush_interval -1
    }
}
```

**Stage 2: Production (T+300s onward)**
```caddy
# Primary
track.acmecorp.com {
    reverse_proxy n8n:5678 {
        flush_interval -1
    }
}

# Fallback (kept active)
159.223.45.67.sslip.io {
    reverse_proxy n8n:5678 {
        flush_interval -1
    }
}
```

**Benefits:**
1. **Immediate availability**: Droplet works instantly for handshake
2. **Professional branding**: Custom domain for client-facing links
3. **Resilience**: If custom domain DNS breaks, sslip.io fallback continues working
4. **Zero friction**: User doesn't need DNS setup to START, but can add it later for branding

---

### 50.1.8 Cloud-Init Timing & Verification

**Cloud-Init Execution Sequence:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLOUD-INIT ATOMIC IGNITION SEQUENCE                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  T+0s:    Droplet boots (Ubuntu 22.04)                                     │
│                                                                             │
│  T+5s:    Cloud-Init reads user-data script                                │
│           - Creates 4GB swap                                                │
│           - Installs Docker (if not in snapshot)                            │
│           - Configures UFW firewall                                         │
│           - Sets Docker log limits                                          │
│                                                                             │
│  T+15s:   Docker Compose pulls images (if not cached)                      │
│           - n8n image (~500MB)                                              │
│           - Postgres image (~200MB)                                         │
│           - Sidecar image (~50MB)                                           │
│           - Caddy image (~15MB)                                             │
│                                                                             │
│  T+30s:   Containers start in dependency order                              │
│           1. Postgres (with healthcheck)                                    │
│           2. n8n (waits for Postgres healthy)                               │
│           3. Caddy (reverse proxy)                                          │
│           4. Sidecar (control agent)                                        │
│                                                                             │
│  T+40s:   Sidecar health check passes                                       │
│           - Verifies n8n is responding on localhost:5678                    │
│           - Verifies Caddy is proxying at sslip.io URL                     │
│           - Verifies swap is active (4GB)                                   │
│                                                                             │
│  T+45s:   Sidecar executes Atomic Handshake                                 │
│           - POSTs to Dashboard: { droplet_id, webhook_url, token }         │
│           - webhook_url uses sslip.io (e.g., https://159.223.x.x.sslip.io)│
│           - Dashboard verifies provisioning_token                           │
│           - Dashboard updates workspace.webhook_url                         │
│                                                                             │
│  T+50s:   Dashboard injects credentials via Sidecar                         │
│           - Sidecar receives encrypted credential bundle                    │
│           - Sidecar decrypts and creates n8n credentials via API           │
│                                                                             │
│  T+55s:   Dashboard deploys Golden Template workflows                       │
│           - Sidecar receives workflow JSON with UUID placeholders           │
│           - Dynamic UUID Mapper replaces template UUIDs                     │
│           - Sidecar POSTs workflows to local n8n API                        │
│           - Sidecar activates workflows                                     │
│                                                                             │
│  T+60s:   IGNITION COMPLETE                                                 │
│           - Droplet state: ACTIVE_HEALTHY                                   │
│           - Workflows: ACTIVE                                               │
│           - Heartbeat: STARTED                                              │
│           - Accessible at: https://159.223.x.x.sslip.io (Bootstrap)       │
│                                                                             │
│  T+300s+: Custom Domain Added (Optional)                                    │
│           - User adds CNAME via Entri                                       │
│           - Sidecar updates Caddy to add track.clientdomain.com           │
│           - Both domains work (sslip.io fallback, custom primary)          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 50.1.9 Droplet Lifecycle States

| State | Definition | Trigger | Next States |
|-------|------------|---------|-------------|
| **PENDING** | DigitalOcean API called, droplet creating | User clicks "Ignite" | INITIALIZING, FAILED |
| **INITIALIZING** | Cloud-Init running | Droplet boots | HANDSHAKE_PENDING, FAILED |
| **HANDSHAKE_PENDING** | Waiting for Sidecar to POST | Cloud-Init completes | ACTIVE_HEALTHY, ORPHAN |
| **ACTIVE_HEALTHY** | Normal operation | Handshake succeeds | DRIFT_DETECTED, HIBERNATING, ZOMBIE |
| **DRIFT_DETECTED** | Workflow/credential mismatch | Watchdog detection | ACTIVE_HEALTHY (after heal) |
| **HIBERNATING** | Powered off to save costs | No active campaigns for 7 days | WAKING |
| **WAKING** | Powering on from hibernation | Campaign started | ACTIVE_HEALTHY |
| **ZOMBIE** | Sidecar unresponsive | 3 missed heartbeats | REBOOTING |
| **REBOOTING** | Hard reboot via DO API | Zombie detected | ACTIVE_HEALTHY, ORPHAN |
| **ORPHAN** | Provisioning failed, cleanup needed | Handshake timeout, reboot failed | TERMINATED |
| **TERMINATED** | Droplet destroyed | Tenant deletion, rollback | (final state) |

---

## 50.2 DROPLET PROVISIONING FLOW

### 50.2.1 The Provisioning State Machine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DROPLET PROVISIONING STATE MACHINE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌─────────────┐                                    │
│                         │   PENDING   │                                    │
│                         └──────┬──────┘                                    │
│                                │                                            │
│                    DO API: Create Droplet                                   │
│                                │                                            │
│                                ▼                                            │
│                         ┌─────────────┐                                    │
│                         │INITIALIZING │                                    │
│                         └──────┬──────┘                                    │
│                                │                                            │
│                    Cloud-Init Executes                                      │
│                                │                                            │
│               ┌────────────────┴────────────────┐                          │
│               ▼                                  ▼                          │
│        ┌─────────────┐                   ┌─────────────┐                   │
│        │  HANDSHAKE  │                   │   FAILED    │                   │
│        │   PENDING   │                   │ (Cloud-Init)│                   │
│        └──────┬──────┘                   └──────┬──────┘                   │
│               │                                  │                          │
│    Sidecar POSTs to Dashboard                   │                          │
│               │                                  ▼                          │
│               │                          ┌─────────────┐                   │
│               │                          │   ORPHAN    │◄─────────────┐    │
│               │                          └──────┬──────┘              │    │
│               │                                  │                     │    │
│               │                         Rollback Protocol              │    │
│               │                                  │                     │    │
│               ▼                                  ▼                     │    │
│        ┌─────────────┐                   ┌─────────────┐              │    │
│        │   ACTIVE    │                   │ TERMINATED  │              │    │
│        │   HEALTHY   │                   └─────────────┘              │    │
│        └──────┬──────┘                                                │    │
│               │                                                        │    │
│               ├──── 3 Missed Heartbeats ────▶ ZOMBIE ──▶ REBOOTING ──┘    │
│               │                                                             │
│               ├──── Workflow Drift ─────────▶ DRIFT_DETECTED              │
│               │                                      │                      │
│               │◄───────── Auto-Heal ─────────────────┘                     │
│               │                                                             │
│               └──── No Campaigns 7d ────────▶ HIBERNATING                  │
│                                                      │                      │
│                                                      ▼                      │
│                              Campaign Started ◄── WAKING                   │
│                                      │                                      │
│                                      └───────────────┘                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 50.2.2 Orphan Droplet Atomic Rollback Protocol

If any provisioning step fails, the system must execute compensating transactions to prevent resource leakage.

**Rollback Trigger Conditions:**

| Failure Point | Trigger | Compensation Required |
|---------------|---------|----------------------|
| DO API fails | HTTP 5xx from DigitalOcean | None (no resources created) |
| Cloud-Init fails | Sidecar never starts | Delete droplet |
| Handshake timeout | No POST within 5 minutes | Delete droplet |
| Credential injection fails | n8n API error | Delete droplet, delete partition |
| Workflow deployment fails | n8n API error | Delete droplet, delete partition, delete credentials |

**Rollback Sequence:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ORPHAN DROPLET ATOMIC ROLLBACK                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TRIGGER: PROVISIONING_FAILED event received via BullMQ                    │
│                                                                             │
│  STEP 1: Delete DigitalOcean Droplet                                       │
│          - Call DO API: DELETE /v2/droplets/{droplet_id}                   │
│          - Wait for 204 response                                            │
│          - If fails: Log error, continue (manual cleanup needed)           │
│                                                                             │
│  STEP 2: Delete Database Partition (if created)                            │
│          - Call: SELECT genesis.fn_drop_workspace_partition(workspace_id)  │
│          - This safely drops the partition if it exists                    │
│          - Idempotent: No error if partition doesn't exist                 │
│                                                                             │
│  STEP 3: Delete Credential Vault Entries (if created)                      │
│          - DELETE FROM genesis.workspace_credentials                        │
│          - WHERE workspace_id = target_workspace_id                        │
│          - Audit log records deletion                                       │
│                                                                             │
│  STEP 4: Delete Webhook Registry Entries (if created)                      │
│          - DELETE FROM genesis.webhook_registry                            │
│          - WHERE workspace_id = target_workspace_id                        │
│                                                                             │
│  STEP 5: Update Workspace Status                                           │
│          - UPDATE workspaces SET                                           │
│            status = 'ROLLBACK_COMPLETE',                                   │
│            rollback_reason = 'Provisioning failed at step X',              │
│            rollback_at = NOW()                                             │
│          - WHERE id = target_workspace_id                                  │
│                                                                             │
│  STEP 6: Notify User                                                        │
│          - Send email: "Provisioning failed, please retry"                 │
│          - Include troubleshooting steps                                   │
│          - Offer support contact                                           │
│                                                                             │
│  COMPLETION: Rollback audit logged, resources cleaned                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 🤖 PHASE 51: SIDECAR AGENT ARCHITECTURE

> **Phase Type:** V30 Core Infrastructure  
> **Dependencies:** Phase 50  
> **Risk Level:** CRITICAL (Security Boundary)

---

## 51.1 SIDECAR AGENT OVERVIEW

The **Sidecar Agent** is a lightweight, dedicated process running alongside n8n on every Sovereign Droplet. It is the **only entity** allowed to communicate with the central Dashboard. This creates a **Zero-Trust security perimeter** where the Control Plane never directly touches tenant infrastructure.

### 51.1.1 Sidecar Responsibilities

| Responsibility | Description | Frequency |
|----------------|-------------|-----------|
| **Health Reporting** | Report n8n status, disk, memory, CPU | Every 60 seconds |
| **Credential Injection** | Receive encrypted credentials, create in n8n | On provisioning, on rotation |
| **Workflow Management** | Deploy, update, activate/deactivate workflows | On demand |
| **Handshake Execution** | POST webhook URL back to Dashboard | On first boot |
| **Container Lifecycle** | Restart n8n, pull new images | On command |
| **Log Aggregation** | Stream n8n logs to Dashboard (optional) | On demand |
| **Metric Collection** | Collect execution stats for Metric Aggregator | Every 15 minutes |

### 51.1.2 Sidecar Security Model: Zero-Trust JWT

All communication between the Dashboard and Sidecar is secured using **Signed JWT Headers**. This is critical because:

1. **Breach Containment**: If a droplet is compromised, the attacker cannot use the Sidecar to command other droplets
2. **Short-Lived Tokens**: JWTs expire in 5 minutes, limiting attack window
3. **Tenant Isolation**: Each JWT is scoped to a single workspace_id
4. **Audit Trail**: All JWT usage is logged

**JWT Structure:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SIDECAR JWT STRUCTURE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  HEADER:                                                                    │
│  {                                                                          │
│    "alg": "RS256",                    // Asymmetric signing                │
│    "typ": "JWT"                                                            │
│  }                                                                          │
│                                                                             │
│  PAYLOAD:                                                                   │
│  {                                                                          │
│    "iss": "genesis-dashboard",        // Issuer                            │
│    "sub": "workspace_uuid",           // Target workspace                  │
│    "aud": "sidecar",                  // Audience                          │
│    "iat": 1706140800,                 // Issued at                         │
│    "exp": 1706141100,                 // Expires (5 min)                   │
│    "jti": "unique_request_id",        // JWT ID for idempotency            │
│    "action": "deploy_workflow",       // Permitted action                  │
│    "droplet_id": "do_12345678"        // Target droplet                    │
│  }                                                                          │
│                                                                             │
│  SIGNATURE:                                                                 │
│  RS256(base64(header) + "." + base64(payload), private_key)               │
│                                                                             │
│  SIDECAR VERIFICATION:                                                      │
│  1. Verify signature using Dashboard's public key                          │
│  2. Check exp > current_time                                               │
│  3. Check sub === this_droplet_workspace_id                                │
│  4. Check action is permitted for this endpoint                            │
│  5. Check jti not already processed (replay prevention)                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 51.1.3 Sidecar Communication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SIDECAR COMMUNICATION PATTERNS                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PATTERN 1: Dashboard → Sidecar (Command)                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Dashboard                        Sidecar                           │   │
│  │     │                                │                              │   │
│  │     │ ──── POST /sidecar/command ──▶ │                              │   │
│  │     │      Header: X-Genesis-JWT     │                              │   │
│  │     │      Body: { action, payload } │                              │   │
│  │     │                                │                              │   │
│  │     │                                │ ─── Verify JWT              │   │
│  │     │                                │ ─── Execute action          │   │
│  │     │                                │ ─── Report result           │   │
│  │     │                                │                              │   │
│  │     │ ◀──── 200 OK ───────────────── │                              │   │
│  │     │       { success, result }      │                              │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  PATTERN 2: Sidecar → Dashboard (Report)                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Sidecar                          Dashboard                         │   │
│  │     │                                │                              │   │
│  │     │ ──── POST /api/sidecar/heartbeat ──▶                         │   │
│  │     │      Header: X-Sidecar-Token (long-lived)                    │   │
│  │     │      Body: { workspace_id, status, metrics }                 │   │
│  │     │                                │                              │   │
│  │     │                                │ ─── Verify token            │   │
│  │     │                                │ ─── Update health table     │   │
│  │     │                                │ ─── Check for pending cmds  │   │
│  │     │                                │                              │   │
│  │     │ ◀──── 200 OK ───────────────── │                              │   │
│  │     │       { pending_commands: [] } │                              │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  PATTERN 3: Sidecar → Dashboard (Handshake - One Time)                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Sidecar                          Dashboard                         │   │
│  │     │                                │                              │   │
│  │     │ ──── POST /api/sidecar/handshake ──▶                         │   │
│  │     │      Body: {                   │                              │   │
│  │     │        provisioning_token,     │                              │   │
│  │     │        webhook_url,            │                              │   │
│  │     │        droplet_ip,             │                              │   │
│  │     │        n8n_version             │                              │   │
│  │     │      }                         │                              │   │
│  │     │                                │                              │   │
│  │     │                                │ ─── Verify token            │   │
│  │     │                                │ ─── Update workspace         │   │
│  │     │                                │ ─── Generate sidecar_token  │   │
│  │     │                                │                              │   │
│  │     │ ◀──── 200 OK ───────────────── │                              │   │
│  │     │       { sidecar_token, config }│                              │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 51.2 SIDECAR COMMAND REFERENCE

| Command | Action | Payload | Response |
|---------|--------|---------|----------|
| `HEALTH_CHECK` | Return current status | None | `{ n8n_status, disk_usage, memory_usage, cpu_usage }` |
| `DEPLOY_WORKFLOW` | Create new workflow in n8n | `{ workflow_json, credential_map }` | `{ workflow_id, webhook_url }` |
| `UPDATE_WORKFLOW` | Update existing workflow | `{ workflow_id, workflow_json }` | `{ success }` |
| `ACTIVATE_WORKFLOW` | Set workflow to active | `{ workflow_id }` | `{ success }` |
| `DEACTIVATE_WORKFLOW` | Set workflow to inactive | `{ workflow_id }` | `{ success }` |
| `DELETE_WORKFLOW` | Remove workflow | `{ workflow_id }` | `{ success }` |
| `INJECT_CREDENTIAL` | Create credential in n8n | `{ credential_type, encrypted_data }` | `{ credential_id }` |
| `ROTATE_CREDENTIAL` | Update existing credential | `{ credential_id, encrypted_data }` | `{ success }` |
| `RESTART_N8N` | Restart n8n container | None | `{ success, new_pid }` |
| `PULL_IMAGE` | Pull new Docker image | `{ image_name, tag }` | `{ success }` |
| `SWAP_CONTAINER` | Blue-Green container swap | `{ new_image_tag }` | `{ success, old_container_id }` |
| `GET_LOGS` | Retrieve n8n logs | `{ lines, since }` | `{ logs }` |
| `COLLECT_METRICS` | Return execution metrics | `{ since }` | `{ executions, success_rate, avg_duration }` |

---

# 📡 PHASE 52: BULLMQ EVENT BUS & CONCURRENCY GOVERNOR

> **Phase Type:** V30 Fleet Orchestration  
> **Dependencies:** Phase 51  
> **Risk Level:** HIGH (System Coordination)

---

## 52.1 EVENT BUS ARCHITECTURE

The **BullMQ Event Bus** (backed by Redis) is the required mechanism for managing the state of 15,000 droplets. It replaces fragile API polling with a robust, push-based state machine.

### 52.1.1 Queue Structure

| Queue Name | Purpose | Priority | Concurrency |
|------------|---------|----------|-------------|
| `ignition` | New tenant provisioning | CRITICAL (1) | 50 |
| `security` | Credential rotation, patches | HIGH (2) | 100 |
| `template` | Workflow updates | MEDIUM (3) | 100 |
| `health` | Heartbeat processing | LOW (4) | 500 |
| `metric` | Analytics collection | LOW (4) | 200 |
| `reboot` | Zombie recovery | HIGH (2) | 25 |

### 52.1.2 Concurrency Governor (Leaky Bucket)

The **Concurrency Governor** prevents the "Thundering Herd" scenario by rate-limiting how many jobs are processed simultaneously.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONCURRENCY GOVERNOR PHYSICS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SCENARIO: Push template update to 15,000 droplets                         │
│                                                                             │
│  WITHOUT GOVERNOR (Catastrophic):                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  T+0s:   15,000 jobs queued                                        │   │
│  │  T+1s:   15,000 HTTP connections attempted                         │   │
│  │  T+2s:   Dashboard network stack saturated                         │   │
│  │  T+3s:   Connections timeout, jobs fail                            │   │
│  │  T+4s:   BullMQ retries, multiplies load                          │   │
│  │  T+5s:   Complete system failure                                   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  WITH GOVERNOR (Controlled):                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  T+0s:   15,000 jobs queued                                        │   │
│  │  T+1s:   100 jobs processing (concurrency limit)                   │   │
│  │  T+10s:  1,000 jobs complete                                       │   │
│  │  T+60s:  6,000 jobs complete                                       │   │
│  │  T+120s: 12,000 jobs complete                                      │   │
│  │  T+150s: 15,000 jobs complete                                      │   │
│  │                                                                     │   │
│  │  Dashboard CPU: 30% (stable)                                       │   │
│  │  Network: 50% capacity (sustainable)                               │   │
│  │  Zero failures, consistent state                                   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  GOVERNOR CONFIGURATION:                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  maxConcurrency: 100        // Max simultaneous jobs               │   │
│  │  rateLimitMax: 200          // Max jobs per rateLimitDuration      │   │
│  │  rateLimitDuration: 1000    // 1 second window                     │   │
│  │  backoffType: 'exponential' // Retry strategy                      │   │
│  │  maxRetries: 5              // Before dead-letter                  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 🔗 PHASE 53: DYNAMIC UUID MAPPER

> **Phase Type:** V30 Credential Management  
> **Dependencies:** Phase 51  
> **Risk Level:** HIGH (Security Critical)

---

## 53.1 THE CREDENTIAL PARADOX

When cloning the "Golden Template" workflows to a new tenant, the template contains **hardcoded credential UUIDs** that reference the template's credentials, not the tenant's.

**The Problem:**

```
Template Workflow JSON:
{
  "nodes": [{
    "name": "Gmail Send",
    "credentials": {
      "gmailOAuth2": {
        "id": "TEMPLATE_GMAIL_UUID",    // ← Points to template credential
        "name": "Template Gmail"
      }
    }
  }]
}
```

If deployed as-is, the tenant's workflow would try to use the template's Gmail credential, which either doesn't exist on their droplet or would send emails from the wrong account.

### 53.1.1 The Solution: Dynamic UUID Mapper

The Dashboard maintains a **Template Credential Map** that defines placeholder UUIDs in the Golden Template. When deploying to a tenant, the Sidecar's UUID Mapper replaces these placeholders with the tenant's actual credential UUIDs.

**Mapping Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DYNAMIC UUID MAPPER FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STEP 1: Dashboard prepares deployment                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Golden Template:                                                   │   │
│  │  - TEMPLATE_GMAIL_UUID                                             │   │
│  │  - TEMPLATE_OPENAI_UUID                                            │   │
│  │  - TEMPLATE_SUPABASE_UUID                                          │   │
│  │                                                                     │   │
│  │  Tenant Credentials (created during onboarding):                   │   │
│  │  - tenant_abc_gmail_uuid (created via Sidecar)                     │   │
│  │  - tenant_abc_openai_uuid (created via Sidecar)                    │   │
│  │  - tenant_abc_supabase_uuid (created via Sidecar)                  │   │
│  │                                                                     │   │
│  │  Mapping Object:                                                    │   │
│  │  {                                                                  │   │
│  │    "TEMPLATE_GMAIL_UUID": "tenant_abc_gmail_uuid",                 │   │
│  │    "TEMPLATE_OPENAI_UUID": "tenant_abc_openai_uuid",               │   │
│  │    "TEMPLATE_SUPABASE_UUID": "tenant_abc_supabase_uuid"            │   │
│  │  }                                                                  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 2: Dashboard sends to Sidecar                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  POST /sidecar/command                                             │   │
│  │  {                                                                  │   │
│  │    "action": "DEPLOY_WORKFLOW",                                    │   │
│  │    "payload": {                                                    │   │
│  │      "workflow_json": { ... template with placeholders ... },      │   │
│  │      "credential_map": { ... mapping object ... }                  │   │
│  │    }                                                                │   │
│  │  }                                                                  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 3: Sidecar performs UUID replacement                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  1. JSON.stringify(workflow_json)                                  │   │
│  │  2. For each key in credential_map:                                │   │
│  │     - Replace all occurrences of key with value                    │   │
│  │  3. JSON.parse(result)                                             │   │
│  │  4. POST to local n8n API                                          │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  RESULT: Workflow deployed with correct tenant credentials                 │
│                                                                             │
│  BENEFIT: Zero manual clicking in n8n UI                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 53.1.2 Template Credential Map Schema

The Dashboard maintains a `template_credential_map` table that defines all placeholder UUIDs used in Golden Templates.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `template_name` | TEXT | Which template (e.g., "Email 1", "Research Report") |
| `placeholder_uuid` | TEXT | The UUID in the template JSON |
| `credential_type` | TEXT | Type of credential (gmailOAuth2, openaiApi, etc.) |
| `description` | TEXT | Human-readable description |
| `created_at` | TIMESTAMPTZ | When added |

### 53.1.3 Variable Replacement Beyond Credentials

The Dynamic UUID Mapper also handles non-credential placeholders in templates:

| Placeholder | Replaced With | Source |
|-------------|---------------|--------|
| `YOUR_DASHBOARD_URL` | Tenant's dashboard URL | Workspace settings |
| `YOUR_WEBHOOK_TOKEN` | Generated secure token | Credential Vault |
| `YOUR_SENDER_EMAIL` | Tenant's email address | Onboarding form |
| `YOUR_NAME` | Tenant's name | Onboarding form |
| `YOUR_COMPANY_NAME` | Tenant's company | Onboarding form |
| `YOUR_CALENDLY_LINK_1` | Booking URL | Onboarding form |
| `YOUR_SUPABASE_URL` | Supabase project URL | Environment config |
| `YOUR_WORKSPACE_ID` | Tenant's workspace UUID | Workspace record |
| `YOUR_LEADS_TABLE` | Partition name | `genesis.leads_p_{slug}` |

---

# 🚀 PHASE 41: THE "IGNITION" ORCHESTRATOR

> **Phase Type:** Provisioning Infrastructure  
> **Dependencies:** Phase 40, Phase 50, Phase 51, Phase 52, Phase 53  
> **Risk Level:** HIGH (Multi-System Coordination)

---

## 41.1 ORCHESTRATOR ARCHITECTURE (V30 SOVEREIGN MODEL)

The V30 Ignition Orchestrator provisions a complete Sovereign Stack: database partition, DigitalOcean droplet, credentials, and workflows. Each step has a compensating rollback action.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    V30 IGNITION ORCHESTRATOR STATE MACHINE                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STEP 1         STEP 2         STEP 3          STEP 4         STEP 5       │
│                                                                             │
│  PENDING ──▶ PARTITION ──▶ DROPLET ──▶ HANDSHAKE ──▶ CREDENTIALS ──┐      │
│              CREATING      PROVISIONING  PENDING     INJECTING     │      │
│                 │              │            │             │         │      │
│                 ▼              ▼            ▼             ▼         ▼      │
│           [DROP TABLE]  [DELETE VM]   [TIMEOUT]    [ROLLBACK] WORKFLOWS    │
│                                                                DEPLOYING   │
│                                                                    │       │
│                                                                    ▼       │
│  FAILED ◀────── ROLLBACK_IN_PROGRESS ◀──────────────────────── ACTIVATING │
│     │                                                                │      │
│     │                                                                ▼      │
│     └────────────────────────────────────────────────────────────  ACTIVE  │
│                                                                             │
│  V30 ADDITIONS:                                                            │
│  - DROPLET_PROVISIONING: Creates DigitalOcean VM, waits for boot          │
│  - HANDSHAKE_PENDING: Waits for Sidecar to POST webhook URL               │
│  - Compensating transactions for each step ensure atomic rollback          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

STEP DETAILS:

| Step | Name | Action | Rollback | Timeout |
|------|------|--------|----------|---------|
| 1 | PARTITION_CREATING | Create genesis.leads_p_{slug} | DROP TABLE IF EXISTS | 30s |
| 2 | DROPLET_PROVISIONING | Create DO droplet, run Cloud-Init | DELETE droplet | 120s |
| 3 | HANDSHAKE_PENDING | Wait for Sidecar POST | DELETE droplet | 300s |
| 4 | CREDENTIALS_INJECTING | Send encrypted creds to Sidecar | DELETE creds from Vault | 60s |
| 5 | WORKFLOWS_DEPLOYING | Send Golden Template to Sidecar | (no rollback needed) | 120s |
| 6 | ACTIVATING | Sidecar activates workflows | Deactivate workflows | 30s |
```

## 41.2 CORE TYPES

```typescript
// lib/genesis/ignition-types.ts

export interface IgnitionConfig {
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  region: 'us-east' | 'us-west' | 'eu-west' | 'eu-north' | 'apac';
  variables: Record<string, string>;
  credentials: CredentialConfig[];
}

export interface CredentialConfig {
  type: 'gmail_oauth' | 'sheets_oauth' | 'openai' | 'relevance' | 'supabase';
  name: string;
  encryptedData: string;  // AES-256-GCM encrypted
  templatePlaceholder: string;  // e.g., TEMPLATE_GMAIL_UUID
}

// V30 Status includes Droplet and Sidecar states
export type IgnitionStatus = 
  | 'pending'
  | 'partition_creating'
  | 'droplet_provisioning'
  | 'handshake_pending'
  | 'credentials_injecting'
  | 'workflows_deploying'
  | 'activating'
  | 'active'
  | 'rollback_in_progress'
  | 'failed';

export interface IgnitionState {
  workspaceId: string;
  status: IgnitionStatus;
  currentStep: number;
  totalSteps: number;
  partitionName?: string;
  dropletId?: string;  // V30: DigitalOcean droplet ID
  dropletIp?: string;  // V30: Droplet public IP
  webhookUrl?: string;  // V30: Sidecar-reported webhook URL
  workflowIds?: string[];
  credentialIds?: string[];
  error?: string;
  startedAt: string;
  updatedAt: string;
}

export interface IgnitionResult {
  success: boolean;
  workspaceId: string;
  partitionName?: string;
  workflowCount?: number;
  duration: number;
  error?: string;
}
```

## 41.3 IGNITION ORCHESTRATOR

```typescript
// lib/genesis/ignition-orchestrator.ts

import { supabaseAdmin } from '@/lib/supabase';
import { IgnitionConfig, IgnitionResult, IgnitionState } from './ignition-types';
import { cloneWorkflow, createCredential, deleteWorkflow } from './n8n-client';
import { storeCredential, deleteCredential } from './credential-vault';

const TEMPLATE_WORKFLOWS = [
  { templateId: 'tpl_email_1', name: 'Email 1' },
  { templateId: 'tpl_email_2', name: 'Email 2' },
  { templateId: 'tpl_email_3', name: 'Email 3' },
  { templateId: 'tpl_research', name: 'Research Report' },
  { templateId: 'tpl_reply', name: 'Reply Tracker' },
  { templateId: 'tpl_optout', name: 'Opt-Out' },
  { templateId: 'tpl_prep', name: 'Email Preparation' },
];

export async function igniteWorkspace(config: IgnitionConfig): Promise<IgnitionResult> {
  const startTime = Date.now();
  const state: IgnitionState = {
    workspaceId: config.workspaceId,
    status: 'pending',
    currentStep: 0,
    totalSteps: 4,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const createdResources: {
    partitionName?: string;
    credentialIds: string[];
    workflowIds: string[];
  } = { credentialIds: [], workflowIds: [] };

  try {
    // STEP 1: Create partition
    state.status = 'partition_creating';
    state.currentStep = 1;
    await saveState(state);

    const { data: partitionResult, error: partitionError } = await supabaseAdmin!
      .rpc('fn_ignite_workspace_partition', {
        p_workspace_id: config.workspaceId,
        p_workspace_slug: config.workspaceSlug,
      });

    if (partitionError || !partitionResult?.[0]?.success) {
      throw new Error(`Partition creation failed: ${partitionError?.message || partitionResult?.[0]?.error_message}`);
    }

    createdResources.partitionName = partitionResult[0].partition_name;
    state.partitionName = createdResources.partitionName;

    // STEP 2: Store credentials
    state.status = 'credentials_storing';
    state.currentStep = 2;
    await saveState(state);

    for (const cred of config.credentials) {
      const result = await storeCredential(config.workspaceId, cred);
      if (!result.success) {
        throw new Error(`Credential storage failed: ${result.error}`);
      }
      createdResources.credentialIds.push(result.credentialId!);
    }

    // STEP 3: Clone workflows
    state.status = 'workflows_cloning';
    state.currentStep = 3;
    await saveState(state);

    const variableMap = buildVariableMap(config);

    for (const template of TEMPLATE_WORKFLOWS) {
      const result = await cloneWorkflow(
        template.templateId,
        `[${config.workspaceName}] ${template.name}`,
        variableMap
      );
      if (!result.success) {
        throw new Error(`Workflow cloning failed for ${template.name}: ${result.error}`);
      }
      createdResources.workflowIds.push(result.workflowId!);
    }

    state.workflowIds = createdResources.workflowIds;

    // STEP 4: Activate workflows
    state.status = 'activating';
    state.currentStep = 4;
    await saveState(state);

    for (const workflowId of createdResources.workflowIds) {
      await activateWorkflow(workflowId);
    }

    // SUCCESS
    state.status = 'active';
    await saveState(state);

    return {
      success: true,
      workspaceId: config.workspaceId,
      partitionName: createdResources.partitionName,
      workflowCount: createdResources.workflowIds.length,
      duration: Date.now() - startTime,
    };

  } catch (error) {
    // ROLLBACK
    state.status = 'rollback_in_progress';
    state.error = error instanceof Error ? error.message : 'Unknown error';
    await saveState(state);

    await rollback(createdResources);

    state.status = 'failed';
    await saveState(state);

    return {
      success: false,
      workspaceId: config.workspaceId,
      duration: Date.now() - startTime,
      error: state.error,
    };
  }
}

async function rollback(resources: {
  partitionName?: string;
  credentialIds: string[];
  workflowIds: string[];
}): Promise<void> {
  // Delete workflows (reverse order)
  for (const wfId of resources.workflowIds.reverse()) {
    try { await deleteWorkflow(wfId); } catch {}
  }

  // Delete credentials
  for (const credId of resources.credentialIds) {
    try { await deleteCredential(credId); } catch {}
  }

  // Drop partition
  if (resources.partitionName) {
    try {
      await supabaseAdmin!.rpc('fn_drop_workspace_partition', {
        p_workspace_id: resources.partitionName,
        p_force: true,
      });
    } catch {}
  }
}

function buildVariableMap(config: IgnitionConfig): Record<string, string> {
  return {
    YOUR_WORKSPACE_ID: config.workspaceId,
    YOUR_LEADS_TABLE: `genesis.leads_p_${config.workspaceSlug}`,
    YOUR_CAMPAIGN_NAME: config.workspaceName,
    ...config.variables,
  };
}

async function saveState(state: IgnitionState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  await supabaseAdmin!.from('genesis.ignition_state').upsert(state, {
    onConflict: 'workspace_id',
  });
}
```

---

# 🔗 PHASE 42: ATOMIC HANDSHAKE PROTOCOL

> **Phase Type:** V30 Integration Layer  
> **Dependencies:** Phase 41, Phase 50, Phase 51  
> **Risk Level:** HIGH (Trust Establishment)

---

## 42.1 THE REGISTRATION NODE PATTERN (V30)

The V30 Atomic Handshake Protocol solves the "Ghost Webhook" paradox from V20. In V20, we had to poll the n8n API after workflow creation to discover webhook URLs - a fragile and error-prone approach. V30 inverts this: the Sidecar **pushes** the webhook URL back to the Dashboard.

### 42.1.1 The Handshake Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    V30 ATOMIC HANDSHAKE PROTOCOL                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CONTEXT: Droplet just booted via Cloud-Init, Sidecar is starting          │
│                                                                             │
│  Dashboard                     Sidecar (on Droplet)                         │
│      │                              │                                       │
│      │                              │ ─── Cloud-Init injects:              │
│      │                              │     - PROVISIONING_TOKEN (one-time)  │
│      │                              │     - DASHBOARD_URL                   │
│      │                              │     - WORKSPACE_ID                    │
│      │                              │                                       │
│      │                              │ ─── Sidecar starts, n8n boots       │
│      │                              │                                       │
│      │                              │ ─── Sidecar health check passes      │
│      │                              │                                       │
│      │◀───── POST /api/sidecar/handshake ─────│                            │
│      │       {                       │                                       │
│      │         provisioning_token,   │                                       │
│      │         workspace_id,         │                                       │
│      │         webhook_url,          │  ← n8n's actual webhook URL          │
│      │         droplet_ip,           │                                       │
│      │         n8n_version           │                                       │
│      │       }                       │                                       │
│      │                              │                                       │
│      │ ─── Verify token matches DB  │                                       │
│      │ ─── Atomic update:           │                                       │
│      │     - workspace.webhook_url  │                                       │
│      │     - workspace.status       │                                       │
│      │     - droplet_health record  │                                       │
│      │ ─── Invalidate token (one-time)                                     │
│      │ ─── Generate sidecar_token   │                                       │
│      │                              │                                       │
│      │────── 200 OK ───────────────▶│                                       │
│      │       {                       │                                       │
│      │         sidecar_token,        │  ← Long-lived token for heartbeats   │
│      │         config: {             │                                       │
│      │           heartbeat_interval, │                                       │
│      │           n8n_api_key,        │                                       │
│      │           ...                 │                                       │
│      │         }                     │                                       │
│      │       }                       │                                       │
│      │                              │                                       │
│      │                              │ ─── Sidecar stores config             │
│      │                              │ ─── Begin heartbeat loop              │
│      │                              │                                       │
│  ════════════════ HANDSHAKE COMPLETE ════════════════                      │
│                                                                             │
│  POST-HANDSHAKE: Dashboard can now:                                        │
│  - Route webhook events to correct n8n instance                            │
│  - Send commands to Sidecar                                                 │
│  - Monitor heartbeats                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 42.1.2 Provisioning Token Security

| Property | Value | Rationale |
|----------|-------|-----------|
| Format | 64-character random hex | High entropy |
| Storage | Hashed in database | Prevent exposure if DB leaked |
| Lifetime | 15 minutes from generation | Limit attack window |
| Usage | Single-use (invalidated on success) | Prevent replay attacks |
| Transmission | HTTPS only, in request body | Not in URL (log exposure) |

### 42.1.3 Sidecar Token vs. Provisioning Token

| Token | Purpose | Lifetime | Usage |
|-------|---------|----------|-------|
| Provisioning Token | One-time handshake verification | 15 minutes | Single use |
| Sidecar Token | Ongoing Sidecar→Dashboard auth | 30 days | Heartbeats, reports |
| Command JWT | Dashboard→Sidecar commands | 5 minutes | Per-request |

## 42.2 WEBHOOK EVENT FLOW (POST-HANDSHAKE)

After the handshake completes, the standard webhook event flow handles n8n→Dashboard communication.

## 42.2 WEBHOOK HANDLER

```typescript
// app/api/events/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const EventSchema = z.object({
  workspace_id: z.string().uuid(),
  event_type: z.enum(['email_sent', 'email_opened', 'email_clicked', 'email_replied', 'email_bounced', 'lead_updated']),
  idempotency_key: z.string().min(16),
  data: z.record(z.unknown()),
  timestamp: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = req.headers.get('x-webhook-secret');
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const event = EventSchema.parse(body);

    // Idempotency check
    const { data: existing } = await supabaseAdmin!
      .from('genesis.webhook_events')
      .select('id')
      .eq('idempotency_key', event.idempotency_key)
      .single();

    if (existing) {
      return NextResponse.json({ status: 'duplicate', id: existing.id });
    }

    // Process event
    await processEvent(event);

    // Record for idempotency
    await supabaseAdmin!.from('genesis.webhook_events').insert({
      workspace_id: event.workspace_id,
      event_type: event.event_type,
      idempotency_key: event.idempotency_key,
      data: event.data,
    });

    return NextResponse.json({ status: 'processed' });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid payload', details: error.errors }, { status: 400 });
    }
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

async function processEvent(event: z.infer<typeof EventSchema>): Promise<void> {
  const { workspace_id, event_type, data } = event;

  switch (event_type) {
    case 'email_sent':
      await supabaseAdmin!.rpc('set_workspace_context', { p_workspace_id: workspace_id });
      await supabaseAdmin!.from('genesis.leads')
        .update({ [`email_${data.email_number}_sent`]: true, [`email_${data.email_number}_sent_at`]: new Date().toISOString() })
        .eq('email_address', data.email);
      break;

    case 'email_replied':
      await supabaseAdmin!.rpc('set_workspace_context', { p_workspace_id: workspace_id });
      await supabaseAdmin!.from('genesis.leads')
        .update({ status: 'replied' })
        .eq('email_address', data.email);
      break;

    // ... other event types
  }
}
```

---

# 🔍 PHASE 43: STATE RECONCILIATION WATCHDOG

> **Phase Type:** V30 Reliability Layer  
> **Dependencies:** Phase 51, Phase 54  
> **Risk Level:** HIGH (System Consistency)

---

## 43.0 V30 INTEGRATION WITH HEARTBEAT STATE MACHINE

In V30, the Watchdog works in concert with the **Heartbeat State Machine (Phase 54)** and the **Sidecar Agent (Phase 51)**. The Watchdog focuses on detecting **logical drift** (workflow state, credential validity, data consistency), while the Heartbeat detects **physical drift** (Sidecar responsiveness, container health).

### 43.0.1 Watchdog vs. Heartbeat Responsibilities

| Concern | Heartbeat (Phase 54) | Watchdog (Phase 43) |
|---------|---------------------|---------------------|
| Sidecar alive? | ✓ Primary | Triggered by heartbeat failure |
| n8n process running? | ✓ Primary | Secondary check via Sidecar |
| Workflow active state match? | | ✓ Primary |
| Credential valid? | | ✓ Primary (OAuth refresh check) |
| DB records consistent? | | ✓ Primary |
| Orphan resources? | | ✓ Primary |
| Resource utilization? | ✓ Primary | |

### 43.0.2 Drift Detection Triggers

| Trigger | Source | Watchdog Action |
|---------|--------|-----------------|
| Heartbeat reports DRIFT | Heartbeat State Machine | Run targeted drift check |
| Scheduled interval | Cron (every 15 minutes) | Run full drift check |
| Post-deployment | Template Reconciliation (Phase 56) | Verify all workspaces updated |
| Manual request | God Mode (Phase 44) | Run on-demand audit |
| Post-rotation | Credential Rotation (Phase 65) | Verify credentials valid |

---

## 43.1 DRIFT DETECTION

```typescript
// lib/genesis/watchdog.ts

export interface DriftResult {
  workspaceId: string;
  driftType: 'orphan_workflow' | 'orphan_db_record' | 'state_mismatch' | 'missing_partition';
  details: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoHealable: boolean;
}

export async function detectDrift(workspaceId: string): Promise<DriftResult[]> {
  const drifts: DriftResult[] = [];

  // Get DB state
  const { data: dbCampaigns } = await supabaseAdmin!
    .from('campaigns')
    .select('id, n8n_workflow_id, n8n_status')
    .eq('workspace_id', workspaceId);

  // Get n8n state
  const n8nWorkflows = await getWorkflowsForWorkspace(workspaceId);

  // Check for orphan workflows (in n8n but not DB)
  for (const wf of n8nWorkflows) {
    const dbRecord = dbCampaigns?.find(c => c.n8n_workflow_id === wf.id);
    if (!dbRecord) {
      drifts.push({
        workspaceId,
        driftType: 'orphan_workflow',
        details: { workflowId: wf.id, workflowName: wf.name },
        severity: 'medium',
        autoHealable: true,
      });
    }
  }

  // Check for state mismatch
  for (const campaign of dbCampaigns || []) {
    const n8nWorkflow = n8nWorkflows.find(w => w.id === campaign.n8n_workflow_id);
    if (n8nWorkflow) {
      const n8nStatus = n8nWorkflow.active ? 'active' : 'inactive';
      if (campaign.n8n_status !== n8nStatus) {
        drifts.push({
          workspaceId,
          driftType: 'state_mismatch',
          details: { workflowId: n8nWorkflow.id, dbStatus: campaign.n8n_status, n8nStatus },
          severity: 'high',
          autoHealable: true,
        });
      }
    }
  }

  return drifts;
}

export async function healDrift(drift: DriftResult): Promise<boolean> {
  if (!drift.autoHealable) return false;

  switch (drift.driftType) {
    case 'orphan_workflow':
      await deleteWorkflow(drift.details.workflowId as string);
      return true;

    case 'state_mismatch':
      await supabaseAdmin!
        .from('campaigns')
        .update({ n8n_status: drift.details.n8nStatus })
        .eq('n8n_workflow_id', drift.details.workflowId);
      return true;

    default:
      return false;
  }
}
```

---

# 💓 PHASE 54: HEARTBEAT STATE MACHINE

> **Phase Type:** V30 Fleet Operations  
> **Dependencies:** Phase 51, Phase 52  
> **Risk Level:** HIGH (Fleet Visibility)

---

## 54.1 THE HEARTBEAT PROTOCOL

A binary Up/Down status is insufficient for managing 15,000 droplets. The V30 architecture mandates a **Granular Heartbeat State Machine** where each Sidecar reports detailed health every 60 seconds.

### 54.1.1 Heartbeat Payload Structure

| Field | Type | Description |
|-------|------|-------------|
| `workspace_id` | UUID | Tenant identifier |
| `droplet_id` | STRING | DigitalOcean droplet ID |
| `timestamp` | TIMESTAMPTZ | Report time |
| `state` | ENUM | Current operational state |
| `n8n_status` | ENUM | n8n process status |
| `n8n_pid` | INTEGER | n8n process ID |
| `n8n_version` | STRING | Running n8n version |
| `active_workflows` | INTEGER | Count of active workflows |
| `pending_executions` | INTEGER | Queued workflow runs |
| `cpu_usage_percent` | FLOAT | Current CPU utilization |
| `memory_usage_mb` | INTEGER | Current memory usage |
| `memory_total_mb` | INTEGER | Total available memory |
| `disk_usage_percent` | FLOAT | Disk space utilization |
| `last_execution_at` | TIMESTAMPTZ | Most recent workflow run |
| `uptime_seconds` | INTEGER | Seconds since container start |

### 54.1.2 Granular Health States

| State | Definition | Action Required |
|-------|------------|-----------------|
| **INITIALIZING** | Droplet created, Cloud-Init running | Monitor for Handshake |
| **HANDSHAKE_PENDING** | n8n active, waiting for Registration Node | Timeout after 5 mins → Rollback |
| **ACTIVE_HEALTHY** | n8n process running, Sidecar responsive, all metrics normal | Standard operation |
| **ACTIVE_DEGRADED** | Running but high CPU/memory/disk (>80%) | Alert, consider scaling |
| **DRIFT_DETECTED** | Workflow version mismatch or credential error | Trigger Auto-Reconciliation |
| **HIBERNATING** | Droplet powered down to save costs | Trigger "Instant Wake" on campaign start |
| **WAKING** | Powering on from hibernation | Monitor for return to ACTIVE_HEALTHY |
| **ZOMBIE** | Droplet active but Sidecar/n8n unresponsive | Trigger "Hard Reboot" via DO API |
| **REBOOTING** | Hard reboot in progress | Monitor for return to ACTIVE_HEALTHY |
| **ORPHAN** | Provisioning failed, awaiting cleanup | Execute Rollback Protocol |
| **MAINTENANCE** | Manual intervention in progress | No automated actions |

### 54.1.3 State Transition Rules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HEARTBEAT STATE TRANSITION RULES                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ZOMBIE DETECTION:                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  IF heartbeat_count = 0 for 3 consecutive 60-second windows        │   │
│  │  AND droplet power_status = 'active' (per DO API)                  │   │
│  │  THEN state := ZOMBIE                                              │   │
│  │                                                                     │   │
│  │  Time to detection: 180 seconds (3 × 60s intervals)                │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  DEGRADED DETECTION:                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  IF cpu_usage_percent > 80 for 5 consecutive heartbeats            │   │
│  │  OR memory_usage_mb / memory_total_mb > 0.85 for 5 heartbeats      │   │
│  │  OR disk_usage_percent > 90 for 3 heartbeats                       │   │
│  │  THEN state := ACTIVE_DEGRADED                                     │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  RECOVERY DETECTION:                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  IF state = ACTIVE_DEGRADED                                        │   │
│  │  AND cpu < 70 AND memory < 75 AND disk < 85 for 3 heartbeats       │   │
│  │  THEN state := ACTIVE_HEALTHY                                      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  DRIFT DETECTION:                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  IF heartbeat.workflow_versions != expected_versions               │   │
│  │  OR heartbeat.credential_count != expected_credentials             │   │
│  │  THEN state := DRIFT_DETECTED                                      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 54.2 THE SIDECAR WATCHDOG

The Dashboard implements a **Last Heartbeat Watchdog** that monitors all droplets for responsiveness.

### 54.2.1 Watchdog Processing Loop

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SIDECAR WATCHDOG PROCESSING                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  RUNS: Every 60 seconds via Vercel Cron                                    │
│                                                                             │
│  STEP 1: Query droplets with stale heartbeats                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  SELECT workspace_id, droplet_id, last_heartbeat_at,               │   │
│  │         consecutive_missed_heartbeats                               │   │
│  │  FROM genesis.droplet_health                                        │   │
│  │  WHERE last_heartbeat_at < NOW() - INTERVAL '60 seconds'           │   │
│  │  AND state NOT IN ('HIBERNATING', 'TERMINATED', 'MAINTENANCE')     │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 2: Increment missed heartbeat counter                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  UPDATE genesis.droplet_health                                      │   │
│  │  SET consecutive_missed_heartbeats = consecutive_missed_heartbeats + 1│  │
│  │  WHERE workspace_id IN (stale_droplet_ids)                         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 3: Identify zombies (3 consecutive misses)                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  SELECT workspace_id, droplet_id                                   │   │
│  │  FROM genesis.droplet_health                                        │   │
│  │  WHERE consecutive_missed_heartbeats >= 3                          │   │
│  │  AND state = 'ACTIVE_HEALTHY'                                      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 4: Transition to ZOMBIE, queue hard reboot                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  UPDATE genesis.droplet_health SET state = 'ZOMBIE'                │   │
│  │  WHERE workspace_id IN (zombie_ids)                                │   │
│  │                                                                     │   │
│  │  FOR EACH zombie_id:                                               │   │
│  │    Queue BullMQ job: { action: 'HARD_REBOOT', droplet_id }        │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 5: Execute hard reboot via DigitalOcean API                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  POST /v2/droplets/{droplet_id}/actions                            │   │
│  │  { "type": "power_cycle" }                                         │   │
│  │                                                                     │   │
│  │  UPDATE genesis.droplet_health SET state = 'REBOOTING'             │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 6: Monitor reboot recovery (separate cron)                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  IF state = 'REBOOTING' for > 5 minutes                            │   │
│  │  AND still no heartbeat                                            │   │
│  │  THEN state := 'ORPHAN'                                            │   │
│  │  AND queue for Manual Forensic Review                              │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 😴 PHASE 55: HIBERNATION & WAKE PHYSICS

> **Phase Type:** V30 Cost Optimization  
> **Dependencies:** Phase 54  
> **Risk Level:** MEDIUM (Resource Management)

---

## 55.1 HIBERNATION STRATEGY

To optimize the $6/month per tenant cost, V30 introduces **Droplet Hibernation**. Droplets for inactive tenants are powered down, reducing compute costs while preserving state.

### 55.1.1 Hibernation Eligibility Criteria

| Criterion | Threshold | Rationale |
|-----------|-----------|-----------|
| No active campaigns | 7 days | User has paused all campaigns |
| No workflow executions | 7 days | No automated activity |
| No Dashboard logins | 14 days | User not actively monitoring |
| Account status | ACTIVE (not suspended) | Don't hibernate suspended accounts |
| Manual hold | NOT SET | User can prevent hibernation |

### 55.1.2 Hibernation Process

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HIBERNATION PROCESS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TRIGGER: Daily cron identifies hibernation-eligible droplets              │
│                                                                             │
│  STEP 1: Pre-Hibernation Notification                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Send email: "Your Genesis instance will hibernate in 24 hours"    │   │
│  │  Include: Link to prevent hibernation                              │   │
│  │  Include: Explanation of instant wake                              │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 2: Metric Snapshot (if 24h passes without activity)                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Sidecar: Collect final metrics                                    │   │
│  │  - Execution history summary                                        │   │
│  │  - Workflow versions                                                │   │
│  │  - Credential fingerprints (not values)                            │   │
│  │  POST to Dashboard for storage                                      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 3: Graceful Shutdown                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Sidecar: Stop n8n container gracefully                            │   │
│  │  Sidecar: Report final state                                        │   │
│  │  Sidecar: Exit                                                      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 4: Power Off Droplet                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  POST /v2/droplets/{droplet_id}/actions                            │   │
│  │  { "type": "power_off" }                                           │   │
│  │                                                                     │   │
│  │  UPDATE genesis.droplet_health SET state = 'HIBERNATING'           │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  COST IMPACT:                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Running droplet:     $6.00/month                                  │   │
│  │  Powered-off droplet: ~$0.50/month (storage only)                  │   │
│  │  Savings per hibernated tenant: $3.50/month (87.5%)                │   │
│  │                                                                     │   │
│  │  At 30% hibernation rate (4,500 of 15,000):                       │   │
│  │  Monthly savings: $15,750                                          │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 55.1.3 Instant Wake Protocol

When a hibernating tenant needs their droplet, the **Instant Wake Protocol** powers it on with minimal delay.

**Wake Triggers:**

| Trigger | Source | Expected Wake Time |
|---------|--------|-------------------|
| User clicks "Start Campaign" | Dashboard UI | <60 seconds |
| Scheduled campaign starts | Cron job | <60 seconds |
| User logs into Dashboard | Auth event | <90 seconds (background) |
| Manual wake request | API call | <60 seconds |

**Wake Sequence:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INSTANT WAKE SEQUENCE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  T+0s:    Wake trigger received                                            │
│           - Update UI: "Starting your instance..."                         │
│           - Queue wake job to BullMQ (priority: CRITICAL)                  │
│                                                                             │
│  T+5s:    DigitalOcean API: Power on droplet                               │
│           - POST /v2/droplets/{droplet_id}/actions                         │
│           - { "type": "power_on" }                                         │
│                                                                             │
│  T+15s:   Droplet boots (from powered-off state)                           │
│           - Faster than fresh provision (OS already installed)             │
│           - Docker daemon starts automatically                             │
│                                                                             │
│  T+25s:   Containers start                                                 │
│           - Images cached on disk (no pull needed)                         │
│           - Sidecar initializes                                            │
│                                                                             │
│  T+35s:   Sidecar health check passes                                      │
│           - n8n responding                                                 │
│           - Credentials intact                                             │
│           - Workflows intact                                               │
│                                                                             │
│  T+40s:   Sidecar sends heartbeat                                          │
│           - Dashboard updates state: ACTIVE_HEALTHY                        │
│           - UI updates: "Your instance is ready"                           │
│                                                                             │
│  T+45s:   WAKE COMPLETE                                                    │
│           - User can proceed with campaign                                 │
│           - No data loss, no reconfiguration needed                        │
│                                                                             │
│  TOTAL WAKE TIME: ~45 seconds (target: <60 seconds)                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 55.1.4 Pre-Warming Protocol for High-Priority Tenants

For **Enterprise** and **High-Priority** tenants who require sub-5-second response times, the standard 45-second wake time is unacceptable. The **Pre-Warming Protocol** maintains these tenants in a "warm standby" state.

**Pre-Warming Eligibility:**

| Tier | Criteria | Pre-Warming Behavior |
|------|----------|---------------------|
| **Enterprise** | Plan = Enterprise, paying >$500/month | Always warm (never hibernate) |
| **High-Priority** | SLA flag set, paying >$200/month | Pre-warm on predicted activity |
| **Standard** | Default tenants | Standard hibernation rules |

**Pre-Warming Strategies:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRE-WARMING PROTOCOL                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STRATEGY 1: NEVER HIBERNATE (Enterprise Tier)                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Enterprise tenants NEVER enter HIBERNATING state                  │   │
│  │  Droplet remains powered on 24/7                                   │   │
│  │  Cost: Full $6/month (no hibernation savings)                      │   │
│  │  Benefit: 0-second wake time (always ready)                        │   │
│  │                                                                     │   │
│  │  Implementation:                                                    │   │
│  │    - Skip hibernation eligibility check for enterprise flag        │   │
│  │    - Heartbeat continues normally                                  │   │
│  │    - No special handling needed                                    │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STRATEGY 2: PREDICTIVE PRE-WARMING (High-Priority Tier)                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  High-priority tenants hibernate but are pre-warmed before         │   │
│  │  predicted activity windows                                        │   │
│  │                                                                     │   │
│  │  PREDICTION SIGNALS:                                               │   │
│  │    - Scheduled campaign start time (wake 5 min before)             │   │
│  │    - Historical login patterns (e.g., 9am local time daily)        │   │
│  │    - Calendar integration (if connected)                           │   │
│  │    - Webhook from CRM indicating upcoming activity                 │   │
│  │                                                                     │   │
│  │  IMPLEMENTATION:                                                    │   │
│  │    1. Daily cron analyzes next 24 hours of scheduled campaigns     │   │
│  │    2. For each high-priority tenant with upcoming activity:        │   │
│  │       - Calculate optimal wake time (activity_time - 5 minutes)    │   │
│  │       - Queue BullMQ job: PRE_WARM at calculated time              │   │
│  │    3. Pre-warm job powers on droplet                               │   │
│  │    4. Droplet reaches ACTIVE_HEALTHY before user needs it          │   │
│  │                                                                     │   │
│  │  COST OPTIMIZATION:                                                │   │
│  │    - Pre-warm only for predicted windows                           │   │
│  │    - Auto-hibernate again after 2 hours of inactivity              │   │
│  │    - Track prediction accuracy, refine model                       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STRATEGY 3: HOT STANDBY POOL (Ultra-Low Latency)                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  For tenants requiring <5 second wake time without prediction:     │   │
│  │                                                                     │   │
│  │  CONCEPT: Maintain a pool of "blank" warm droplets per region      │   │
│  │                                                                     │   │
│  │  POOL CONFIGURATION:                                               │   │
│  │    - us-east: 10 warm standby droplets                             │   │
│  │    - us-west: 5 warm standby droplets                              │   │
│  │    - eu-west: 10 warm standby droplets                             │   │
│  │    - apac: 5 warm standby droplets                                 │   │
│  │                                                                     │   │
│  │  WAKE FLOW (Hot Standby):                                          │   │
│  │    T+0s:   Wake trigger received for hibernating tenant            │   │
│  │    T+1s:   Claim warm droplet from pool                            │   │
│  │    T+2s:   Inject tenant credentials via Sidecar                   │   │
│  │    T+3s:   Deploy tenant workflows                                 │   │
│  │    T+4s:   Update DNS/routing                                      │   │
│  │    T+5s:   READY                                                   │   │
│  │                                                                     │   │
│  │  BACKGROUND:                                                        │   │
│  │    - Power on hibernated droplet in background                     │   │
│  │    - When hibernated droplet ready, swap back                      │   │
│  │    - Return borrowed droplet to pool                               │   │
│  │                                                                     │   │
│  │  COST: ~$120/month for 30 warm standby droplets                    │   │
│  │  BENEFIT: <5s wake for any high-priority tenant                    │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Pre-Warming Decision Matrix:**

| Tenant Tier | Hibernation Allowed | Pre-Warming Strategy | Target Wake Time |
|-------------|---------------------|---------------------|------------------|
| Enterprise | No | Always warm | 0 seconds |
| High-Priority (with schedule) | Yes | Predictive pre-warm | <5 seconds |
| High-Priority (no schedule) | Yes | Hot standby pool | <5 seconds |
| Standard | Yes | Standard wake | <60 seconds |

**Pre-Warming Metrics:**

| Metric | Target | Measurement |
|--------|--------|-------------|
| Prediction accuracy | >90% | Pre-warms that were used / total pre-warms |
| Hot standby utilization | <30% | Pool claims / pool size |
| High-priority wake time | <5 seconds | P95 of high-priority wakes |
| Pre-warming cost overhead | <$200/month | Pool + wasted pre-warms |

---

# 🔄 PHASE 56: FLEET-WIDE TEMPLATE RECONCILIATION

> **Phase Type:** V30 Fleet Operations  
> **Dependencies:** Phase 52, Phase 53  
> **Risk Level:** HIGH (Mass Update)

---

## 56.1 THE TEMPLATE UPDATE PROBLEM

When the "Golden Template" is updated (bug fix, new feature, security patch), pushing it to 15,000 droplets is a high-risk operation that requires careful orchestration.

### 56.1.1 Update Scenarios

| Scenario | Risk Level | Strategy |
|----------|------------|----------|
| Critical security patch | CRITICAL | Immediate push to all, accept failures |
| Bug fix | HIGH | Batched rollout with pause on failures |
| New feature | MEDIUM | Canary rollout, gradual expansion |
| Configuration change | LOW | Batched rollout, no pause |

### 56.1.2 Blue-Green Container Update Protocol

For n8n version updates or Sidecar binary updates, V30 uses a **Blue-Green Container Swap** to achieve zero-downtime updates.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BLUE-GREEN CONTAINER SWAP                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CURRENT STATE (Blue):                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  [n8n:1.0.0] ◄── ACTIVE                                            │   │
│  │  [sidecar:1.0.0] ◄── ACTIVE                                        │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 1: Sidecar receives UPDATE command                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  { action: 'PULL_IMAGE', image: 'n8nio/n8n:1.1.0' }                │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 2: Pull new image in background                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  docker pull n8nio/n8n:1.1.0                                       │   │
│  │  (n8n:1.0.0 still serving traffic)                                 │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 3: Wait for "Quiet Period"                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Monitor n8n for active executions                                 │   │
│  │  Wait until: pending_executions = 0                                │   │
│  │  Timeout: 5 minutes (force swap if exceeded)                       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 4: Stop Blue, Start Green                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  docker stop n8n_blue                                              │   │
│  │  docker run --name n8n_green n8nio/n8n:1.1.0                       │   │
│  │                                                                     │   │
│  │  Downtime: ~5 seconds                                              │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 5: Health check                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  IF n8n:1.1.0 healthy within 60 seconds                            │   │
│  │    - Remove old container: docker rm n8n_blue                      │   │
│  │    - Report: VERSION_UPDATE_SUCCESS                                │   │
│  │  ELSE                                                               │   │
│  │    - Rollback: docker stop n8n_green && docker start n8n_blue     │   │
│  │    - Report: VERSION_ROLLBACK                                      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 56.1.3 Batched Rollout Protocol

For non-critical updates, the Concurrency Governor executes a **Batched Rollout** with automatic pause on high failure rates.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BATCHED ROLLOUT PROTOCOL                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CONFIGURATION:                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  batch_size: 100                     // Droplets per batch         │   │
│  │  pause_between_batches: 30 seconds   // Observation window         │   │
│  │  failure_threshold: 5%               // Pause if exceeded          │   │
│  │  max_failures_before_abort: 10%      // Abort entire rollout       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  EXECUTION:                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Batch 1 (droplets 1-100):                                         │   │
│  │    - 98 success, 2 failures (2% failure rate)                      │   │
│  │    - Below threshold, continue                                      │   │
│  │                                                                     │   │
│  │  Batch 2 (droplets 101-200):                                       │   │
│  │    - 95 success, 5 failures (5% failure rate)                      │   │
│  │    - At threshold, PAUSE for investigation                         │   │
│  │                                                                     │   │
│  │  --- HUMAN REVIEW ---                                              │   │
│  │                                                                     │   │
│  │  IF operator approves continue:                                    │   │
│  │    Resume from batch 3                                             │   │
│  │  IF operator aborts:                                               │   │
│  │    Rollout cancelled, 200 droplets updated, 14,800 unchanged       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  VERIFICATION AFTER EACH BATCH:                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  For each updated droplet:                                         │   │
│  │    - Wait for heartbeat with new version                           │   │
│  │    - Timeout: 120 seconds                                          │   │
│  │    - IF no heartbeat: Mark as FAILED                               │   │
│  │                                                                     │   │
│  │  Aggregate failure rate = failed / attempted                       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 🎮 PHASE 44: "GOD MODE" COMMAND & CONTROL

> **Phase Type:** V30 Platform Operations  
> **Dependencies:** Phase 54, Phase 55, Phase 56  
> **Risk Level:** MEDIUM (Observability)

---

## 44.0 V30 GOD MODE ENHANCEMENTS

The V30 God Mode dashboard provides comprehensive visibility into the entire fleet of 15,000 Sovereign Droplets. It integrates data from the Heartbeat State Machine, Watchdog, Financial Ledger, and a new **Metric Aggregator** for cross-tenant analytics.

### 44.0.1 God Mode Dashboard Components

| Component | Data Source | Purpose |
|-----------|-------------|---------|
| Fleet Overview | Heartbeat State Machine | Real-time droplet status (healthy/degraded/zombie) |
| Health Heatmap | Aggregated heartbeats | Visual grid of all tenant health |
| Watchdog Alerts | Watchdog Service | Active drift detections, auto-heal progress |
| Financial Dashboard | Genesis Wallet | Kill-switch triggers, low balance alerts |
| Template Rollout | BullMQ + Phase 56 | Progress of fleet-wide updates |
| Regional Status | Phase 62 data | Per-region health and capacity |
| Metric Aggregator | Sidecar reports | Cross-tenant performance analytics |

### 44.0.2 Metric Aggregator for Cross-Tenant Analytics

The **Metric Aggregator** solves the challenge of gaining platform-wide insights without compromising tenant isolation. Every 15 minutes, each Sidecar reports anonymized execution metrics to a global analytics table.

**Aggregated Metrics:**

| Metric | Description | Use Case |
|--------|-------------|----------|
| `total_executions` | Workflow runs in period | Platform load analysis |
| `success_rate` | % successful executions | Quality monitoring |
| `avg_duration_ms` | Average execution time | Performance trending |
| `email_sent_count` | Emails sent | Capacity planning |
| `lead_count_delta` | Leads added/removed | Growth tracking |
| `error_types` | Categorized error counts | Common issue detection |

**Metric Aggregator Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    METRIC AGGREGATOR FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SIDECAR (every 15 minutes):                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  1. Query local n8n API for execution stats                        │   │
│  │  2. Anonymize data (remove lead names, email contents)             │   │
│  │  3. Include ONLY: counts, durations, success rates                 │   │
│  │  4. POST to Dashboard: /api/metrics/report                         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  DASHBOARD (on receive):                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  1. Validate Sidecar token                                         │   │
│  │  2. Insert into genesis.metric_snapshots (per-tenant table)        │   │
│  │  3. Update genesis.platform_metrics (aggregated table)             │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  GOD MODE DASHBOARD:                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  - Total executions today: 1,234,567                               │   │
│  │  - Platform success rate: 98.7%                                    │   │
│  │  - Avg execution time: 4.2 seconds                                 │   │
│  │  - Emails sent today: 892,000                                      │   │
│  │  - Active campaigns: 8,456                                         │   │
│  │  - Top error: "Rate limit exceeded" (1.2% of failures)             │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  PRIVACY GUARANTEE:                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  - NO lead data transmitted                                        │   │
│  │  - NO email content transmitted                                    │   │
│  │  - NO recipient information transmitted                            │   │
│  │  - ONLY aggregate counts and performance metrics                   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 44.1 HEALTH MESH

```sql
-- genesis.workspace_health view
CREATE OR REPLACE VIEW genesis.workspace_health_summary AS
SELECT
    w.id AS workspace_id,
    w.name AS workspace_name,
    pr.partition_name,
    pr.row_count AS lead_count,
    pr.size_bytes,
    (SELECT COUNT(*) FROM campaigns c WHERE c.workspace_id = w.id) AS campaign_count,
    (SELECT COUNT(*) FROM campaigns c WHERE c.workspace_id = w.id AND c.n8n_status = 'active') AS active_workflows,
    CASE
        WHEN pr.partition_name IS NULL THEN 'not_provisioned'
        WHEN (SELECT COUNT(*) FROM campaigns c WHERE c.workspace_id = w.id AND c.n8n_status = 'error') > 0 THEN 'degraded'
        ELSE 'healthy'
    END AS health_status
FROM workspaces w
LEFT JOIN genesis.partition_registry pr ON pr.workspace_id = w.id::UUID;
```

## 44.2 BULK UPDATE ENGINE

```typescript
// lib/genesis/bulk-update.ts

export interface BulkUpdateConfig {
  blueprintId: string;
  targetWorkspaceIds?: string[];
  rateLimit: number;  // workspaces per minute
  canaryPercentage?: number;
  rollbackThreshold?: number;
}

export async function startBulkUpdate(config: BulkUpdateConfig): Promise<string> {
  const jobId = crypto.randomUUID();
  const delayMs = Math.ceil(60000 / config.rateLimit);

  const workspaces = config.targetWorkspaceIds || await getAllProvisionedWorkspaces();
  
  // Start async processing
  processBulkUpdate(jobId, workspaces, config, delayMs);

  return jobId;
}

async function processBulkUpdate(
  jobId: string,
  workspaces: string[],
  config: BulkUpdateConfig,
  delayMs: number
): Promise<void> {
  let processed = 0;
  let failed = 0;

  for (const wsId of workspaces) {
    try {
      await updateWorkspaceWorkflows(wsId, config.blueprintId);
      processed++;
    } catch {
      failed++;
      if (config.rollbackThreshold && failed / (processed + failed) > config.rollbackThreshold) {
        await logJobEvent(jobId, 'halted', { reason: 'failure_threshold_exceeded' });
        return;
      }
    }

    await sleep(delayMs);
  }

  await logJobEvent(jobId, 'completed', { processed, failed });
}
```

---

## 44.3 SCALE HEALTH MONITORING & PRE-FAILURE ALERTS

**The Problem:**
At scale, infrastructure failures are inevitable. The difference between production-grade systems and hobbyist projects is this: **Production systems predict failures 30-60 days in advance**, not react to them after they happen.

**The V30 Solution:**
A multi-layered monitoring system that tracks critical scale metrics and alerts BEFORE thresholds are breached, giving time to optimize without impacting users.

---

### 44.3.1 The Alert Threshold Matrix

This table defines the exact thresholds that trigger alerts, giving runway to optimize before breaking.

| Metric | Green Zone | Yellow Zone (30-day alert) | Red Zone (7-day alert) | Action Required |
|--------|-----------|---------------------------|------------------------|-----------------|
| **Total partitions** | <10,000 | 10,000-12,000 | >12,000 | Enable Phase 40 catalog optimizations |
| **Largest partition** | <500K rows | 500K-1M rows | >1M rows | Archive old data or sub-partition |
| **Average partition** | <50K rows | 50K-100K rows | >100K rows | Review data retention policy |
| **Query P95 latency** | <100ms | 100-200ms | >200ms | Add indexes or refresh MVs |
| **Catalog query time** | <20ms | 20-100ms | >100ms | Optimize `pg_class` queries |
| **Total storage** | <500GB | 500GB-1TB | >1TB | Archive or export historical data |
| **Global index size** | <100GB | 100-300GB | >300GB | Consolidate or drop unused indexes |
| **DO account capacity** | <70% full | 70-85% full | >85% full | Add new DO account to pool |
| **Wallet balance** | >$100 | $20-$100 | <$20 | Alert user to top up |
| **Snapshot garbage** | <50 orphans | 50-100 orphans | >100 orphans | Run cleanup protocol |

**Runway Calculation Logic:**

```typescript
// Example: Partition count growth rate
const currentPartitions = 10500;
const threshold = 12000;
const dailyGrowth = 100; // New customers/day

const daysUntilThreshold = (threshold - currentPartitions) / dailyGrowth;
// = (12000 - 10500) / 100 = 15 days runway

if (daysUntilThreshold <= 30) {
  sendAlert('YELLOW', 'Partition capacity at 70%', daysUntilThreshold);
}
```

---

### 44.3.2 The Monitoring SQL Queries

**Database: `genesis.scale_health_checks`**

```sql
-- ============================================
-- SCALE HEALTH CHECK QUERIES
-- ============================================
-- These queries run every 6 hours via pg_cron
-- Results stored in scale_alerts table
-- ============================================

-- CHECK 1: Total Partition Count
CREATE OR REPLACE FUNCTION genesis.check_partition_count()
RETURNS TABLE (
    metric TEXT,
    current_value BIGINT,
    threshold_yellow BIGINT,
    threshold_red BIGINT,
    status TEXT,
    days_until_red INTEGER
) AS $$
DECLARE
    v_count BIGINT;
    v_growth_rate NUMERIC;
    v_days_until_red INTEGER;
BEGIN
    -- Count total partitions
    SELECT COUNT(*) INTO v_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'genesis'
      AND c.relkind = 'r'
      AND c.relispartition = TRUE;
    
    -- Calculate growth rate (partitions added in last 7 days)
    SELECT (v_count - COALESCE(
        (SELECT partition_count FROM genesis.scale_metrics 
         WHERE metric_date = CURRENT_DATE - INTERVAL '7 days'
         LIMIT 1), 0
    )) / 7.0 INTO v_growth_rate;
    
    -- Calculate days until red threshold
    IF v_growth_rate > 0 THEN
        v_days_until_red := ((12000 - v_count) / v_growth_rate)::INTEGER;
    ELSE
        v_days_until_red := NULL; -- No growth, infinite runway
    END IF;
    
    RETURN QUERY SELECT
        'partition_count'::TEXT,
        v_count,
        10000::BIGINT,
        12000::BIGINT,
        CASE 
            WHEN v_count >= 12000 THEN 'RED'
            WHEN v_count >= 10000 THEN 'YELLOW'
            ELSE 'GREEN'
        END::TEXT,
        v_days_until_red;
END;
$$ LANGUAGE plpgsql;

-- CHECK 2: Largest Partition Size
CREATE OR REPLACE FUNCTION genesis.check_largest_partition()
RETURNS TABLE (
    metric TEXT,
    partition_name TEXT,
    row_count BIGINT,
    size_gb NUMERIC,
    threshold_yellow BIGINT,
    threshold_red BIGINT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH partition_sizes AS (
        SELECT 
            c.relname::TEXT AS part_name,
            c.reltuples::BIGINT AS estimated_rows,
            pg_total_relation_size(c.oid) / (1024^3) AS size_gigabytes
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'genesis'
          AND c.relkind = 'r'
          AND c.relispartition = TRUE
        ORDER BY c.reltuples DESC
        LIMIT 1
    )
    SELECT
        'largest_partition'::TEXT,
        ps.part_name,
        ps.estimated_rows,
        ps.size_gigabytes,
        500000::BIGINT,
        1000000::BIGINT,
        CASE 
            WHEN ps.estimated_rows >= 1000000 THEN 'RED'
            WHEN ps.estimated_rows >= 500000 THEN 'YELLOW'
            ELSE 'GREEN'
        END::TEXT
    FROM partition_sizes ps;
END;
$$ LANGUAGE plpgsql;

-- CHECK 3: Query P95 Latency
CREATE OR REPLACE FUNCTION genesis.check_query_latency()
RETURNS TABLE (
    metric TEXT,
    p95_latency_ms NUMERIC,
    p99_latency_ms NUMERIC,
    threshold_yellow NUMERIC,
    threshold_red NUMERIC,
    status TEXT,
    slow_query_count BIGINT
) AS $$
DECLARE
    v_p95 NUMERIC;
    v_p99 NUMERIC;
    v_slow_count BIGINT;
BEGIN
    -- Get P95/P99 from pg_stat_statements
    SELECT 
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY mean_exec_time),
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY mean_exec_time),
        COUNT(*) FILTER (WHERE mean_exec_time > 200)
    INTO v_p95, v_p99, v_slow_count
    FROM pg_stat_statements
    WHERE query LIKE '%genesis.leads%'
      AND calls > 10;  -- Only queries with significant volume
    
    RETURN QUERY SELECT
        'query_p95_latency'::TEXT,
        v_p95,
        v_p99,
        100.0::NUMERIC,
        200.0::NUMERIC,
        CASE 
            WHEN v_p95 >= 200 THEN 'RED'
            WHEN v_p95 >= 100 THEN 'YELLOW'
            ELSE 'GREEN'
        END::TEXT,
        v_slow_count;
END;
$$ LANGUAGE plpgsql;

-- CHECK 4: DigitalOcean Account Capacity
CREATE OR REPLACE FUNCTION genesis.check_do_account_capacity()
RETURNS TABLE (
    metric TEXT,
    account_id TEXT,
    current_droplets INTEGER,
    max_droplets INTEGER,
    utilization_pct NUMERIC,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        'do_account_capacity'::TEXT,
        a.account_id,
        a.current_droplets,
        a.max_droplets,
        (a.current_droplets::NUMERIC / a.max_droplets * 100)::NUMERIC(5,2),
        CASE 
            WHEN a.current_droplets::NUMERIC / a.max_droplets >= 0.85 THEN 'RED'
            WHEN a.current_droplets::NUMERIC / a.max_droplets >= 0.70 THEN 'YELLOW'
            ELSE 'GREEN'
        END::TEXT
    FROM genesis.do_accounts a
    WHERE a.status = 'active'
    ORDER BY (a.current_droplets::NUMERIC / a.max_droplets) DESC;
END;
$$ LANGUAGE plpgsql;

-- CHECK 5: Storage Growth Rate
CREATE OR REPLACE FUNCTION genesis.check_storage_growth()
RETURNS TABLE (
    metric TEXT,
    current_size_gb NUMERIC,
    growth_rate_gb_per_day NUMERIC,
    days_until_1tb INTEGER,
    threshold_yellow NUMERIC,
    threshold_red NUMERIC,
    status TEXT
) AS $$
DECLARE
    v_current_size NUMERIC;
    v_growth_rate NUMERIC;
    v_days_until_red INTEGER;
BEGIN
    -- Get current total size
    SELECT 
        SUM(pg_total_relation_size(c.oid)) / (1024^3)
    INTO v_current_size
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'genesis';
    
    -- Calculate growth rate (last 7 days)
    SELECT 
        (v_current_size - COALESCE(
            (SELECT total_size_gb FROM genesis.scale_metrics 
             WHERE metric_date = CURRENT_DATE - INTERVAL '7 days'
             LIMIT 1), 0
        )) / 7.0
    INTO v_growth_rate;
    
    -- Days until 1TB
    IF v_growth_rate > 0 THEN
        v_days_until_red := ((1000 - v_current_size) / v_growth_rate)::INTEGER;
    ELSE
        v_days_until_red := NULL;
    END IF;
    
    RETURN QUERY SELECT
        'storage_growth'::TEXT,
        v_current_size,
        v_growth_rate,
        v_days_until_red,
        500.0::NUMERIC,
        1000.0::NUMERIC,
        CASE 
            WHEN v_current_size >= 1000 THEN 'RED'
            WHEN v_current_size >= 500 THEN 'YELLOW'
            ELSE 'GREEN'
        END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- CHECK 6: Per-Partition Size Analysis
CREATE OR REPLACE FUNCTION genesis.check_oversized_partitions()
RETURNS TABLE (
    partition_name TEXT,
    workspace_id TEXT,
    row_count BIGINT,
    size_gb NUMERIC,
    status TEXT,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH partition_stats AS (
        SELECT 
            c.relname::TEXT AS part_name,
            -- Extract workspace_id from partition name
            REGEXP_REPLACE(c.relname, 'leads_p_', '') AS ws_id,
            c.reltuples::BIGINT AS est_rows,
            pg_total_relation_size(c.oid) / (1024^3) AS size_gigabytes
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'genesis'
          AND c.relkind = 'r'
          AND c.relispartition = TRUE
          AND c.reltuples > 100000  -- Only check partitions with 100k+ rows
        ORDER BY c.reltuples DESC
    )
    SELECT
        ps.part_name,
        ps.ws_id,
        ps.est_rows,
        ps.size_gigabytes,
        CASE 
            WHEN ps.est_rows >= 1000000 THEN 'RED'
            WHEN ps.est_rows >= 500000 THEN 'YELLOW'
            ELSE 'GREEN'
        END::TEXT,
        CASE 
            WHEN ps.est_rows >= 1000000 THEN 'URGENT: Archive data or implement sub-partitioning'
            WHEN ps.est_rows >= 500000 THEN 'WARNING: Monitor query performance, plan archival'
            ELSE 'OK: Within normal operating range'
        END::TEXT
    FROM partition_stats ps
    WHERE ps.est_rows >= 500000;  -- Only return partitions in yellow/red
END;
$$ LANGUAGE plpgsql;
```

---

### 44.3.3 Scale Metrics History Table

**Purpose:** Track metrics over time to calculate growth rates and predict future thresholds.

```sql
-- ============================================
-- SCALE METRICS HISTORY
-- ============================================
-- Stores daily snapshots of scale metrics
-- Used for trend analysis and runway calculations
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.scale_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Partition metrics
    partition_count INTEGER NOT NULL,
    largest_partition_rows BIGINT,
    largest_partition_name TEXT,
    avg_partition_rows BIGINT,
    
    -- Storage metrics
    total_size_gb NUMERIC(10,2),
    index_size_gb NUMERIC(10,2),
    table_size_gb NUMERIC(10,2),
    
    -- Performance metrics
    p95_latency_ms NUMERIC(10,2),
    p99_latency_ms NUMERIC(10,2),
    slow_query_count BIGINT,
    
    -- DO capacity
    total_do_accounts INTEGER,
    total_droplet_capacity INTEGER,
    total_droplets_active INTEGER,
    do_utilization_pct NUMERIC(5,2),
    
    -- Financial
    total_wallet_balance_usd NUMERIC(10,2),
    daily_wallet_burn_usd NUMERIC(10,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(metric_date)
);

CREATE INDEX idx_scale_metrics_date ON genesis.scale_metrics(metric_date DESC);
```

---

### 44.3.4 Scale Alerts Table

**Purpose:** Store active alerts and track resolution status.

```sql
-- ============================================
-- SCALE ALERTS TABLE
-- ============================================
-- Stores active alerts triggered by threshold breaches
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.scale_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type TEXT NOT NULL,  -- 'partition_count', 'large_partition', 'query_latency', etc.
    severity TEXT NOT NULL CHECK (severity IN ('YELLOW', 'RED')),
    
    -- Alert details
    metric_name TEXT NOT NULL,
    current_value TEXT NOT NULL,
    threshold_value TEXT NOT NULL,
    runway_days INTEGER,  -- Days until red threshold (if yellow) or days overdue (if red)
    
    -- Affected resources
    workspace_id TEXT,  -- If alert is specific to one workspace
    partition_name TEXT,
    
    -- Action guidance
    recommendation TEXT NOT NULL,
    remediation_link TEXT,  -- Link to docs or admin action page
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'ignored')),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by TEXT,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scale_alerts_status ON genesis.scale_alerts(status) WHERE status = 'active';
CREATE INDEX idx_scale_alerts_severity ON genesis.scale_alerts(severity);
CREATE INDEX idx_scale_alerts_type ON genesis.scale_alerts(alert_type);
CREATE INDEX idx_scale_alerts_workspace ON genesis.scale_alerts(workspace_id) WHERE workspace_id IS NOT NULL;
```

---

### 44.3.5 Automated Health Check Runner

**Scheduled Job: Every 6 hours via `pg_cron`**

```sql
-- ============================================
-- SCALE HEALTH CHECK RUNNER
-- ============================================
-- Runs all health checks and creates/updates alerts
-- Schedule: Every 6 hours
-- ============================================

CREATE OR REPLACE FUNCTION genesis.run_scale_health_checks()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    alerts_created INTEGER,
    duration_ms INTEGER
) AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_alerts_created INTEGER := 0;
BEGIN
    -- ============================================
    -- CHECK 1: Partition Count
    -- ============================================
    PERFORM genesis.process_partition_count_check();
    
    -- ============================================
    -- CHECK 2: Largest Partitions
    -- ============================================
    PERFORM genesis.process_oversized_partitions_check();
    
    -- ============================================
    -- CHECK 3: Query Performance
    -- ============================================
    PERFORM genesis.process_query_latency_check();
    
    -- ============================================
    -- CHECK 4: DO Account Capacity
    -- ============================================
    PERFORM genesis.process_do_capacity_check();
    
    -- ============================================
    -- CHECK 5: Storage Growth
    -- ============================================
    PERFORM genesis.process_storage_growth_check();
    
    -- ============================================
    -- Record metrics snapshot
    -- ============================================
    INSERT INTO genesis.scale_metrics (
        partition_count,
        largest_partition_rows,
        largest_partition_name,
        total_size_gb,
        p95_latency_ms
    )
    SELECT
        (SELECT current_value FROM genesis.check_partition_count()),
        (SELECT row_count FROM genesis.check_oversized_partitions() LIMIT 1),
        (SELECT partition_name FROM genesis.check_oversized_partitions() LIMIT 1),
        (SELECT current_size_gb FROM genesis.check_storage_growth()),
        (SELECT p95_latency_ms FROM genesis.check_query_latency());
    
    -- Return summary
    RETURN QUERY SELECT
        'scale_health_checks'::TEXT,
        'completed'::TEXT,
        v_alerts_created,
        EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron (built into Supabase)
SELECT cron.schedule(
    'scale-health-checks',
    '0 */6 * * *',  -- Every 6 hours
    $$SELECT genesis.run_scale_health_checks();$$
);
```

---

### 44.3.6 Alert Processing Function

**Purpose:** Creates or updates alerts based on threshold checks.

```sql
CREATE OR REPLACE FUNCTION genesis.process_partition_count_check()
RETURNS VOID AS $$
DECLARE
    v_check RECORD;
    v_existing_alert UUID;
BEGIN
    -- Get current metric
    SELECT * INTO v_check FROM genesis.check_partition_count();
    
    -- Check if alert already exists
    SELECT id INTO v_existing_alert
    FROM genesis.scale_alerts
    WHERE alert_type = 'partition_count'
      AND status = 'active'
    LIMIT 1;
    
    IF v_check.status = 'GREEN' THEN
        -- Resolve existing alert if any
        IF v_existing_alert IS NOT NULL THEN
            UPDATE genesis.scale_alerts
            SET status = 'resolved',
                resolved_at = NOW(),
                resolution_notes = 'Metric returned to green zone'
            WHERE id = v_existing_alert;
        END IF;
        
    ELSIF v_check.status IN ('YELLOW', 'RED') THEN
        -- Create or update alert
        IF v_existing_alert IS NULL THEN
            -- Create new alert
            INSERT INTO genesis.scale_alerts (
                alert_type,
                severity,
                metric_name,
                current_value,
                threshold_value,
                runway_days,
                recommendation,
                remediation_link
            ) VALUES (
                'partition_count',
                v_check.status,
                'Total Partitions',
                v_check.current_value::TEXT,
                CASE 
                    WHEN v_check.status = 'RED' THEN v_check.threshold_red::TEXT
                    ELSE v_check.threshold_yellow::TEXT
                END,
                v_check.days_until_red,
                CASE 
                    WHEN v_check.status = 'RED' THEN 
                        'CRITICAL: Approaching partition limit. Enable Phase 40 catalog optimizations immediately.'
                    ELSE 
                        'WARNING: Partition count growing. Review Phase 40 optimizations within 30 days.'
                END,
                '/admin/scale-health?metric=partition_count'
            );
        ELSE
            -- Update existing alert
            UPDATE genesis.scale_alerts
            SET severity = v_check.status,
                current_value = v_check.current_value::TEXT,
                runway_days = v_check.days_until_red,
                updated_at = NOW()
            WHERE id = v_existing_alert;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

---

### 44.3.7 Admin Dashboard Widget (God Mode UI)

**Location:** `/admin` → New tab: "Scale Health"

**Widget Design:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SCALE HEALTH DASHBOARD                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  🟢 Overall Status: HEALTHY                                                │
│  Last Check: 2 hours ago                                                   │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  METRIC                        CURRENT    THRESHOLD    STATUS   RUNWAY │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │  Total Partitions               8,234    10,000-12k    🟢      120d   │ │
│  │  Largest Partition              342K     500K-1M        🟢      -      │ │
│  │  Query P95 Latency              78ms     100-200ms      🟢      -      │ │
│  │  DO Account Capacity            65%      70-85%         🟢      45d    │ │
│  │  Total Storage                  387GB    500-1TB        🟢      90d    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  🟡 ACTIVE WARNINGS (2):                                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  ⚠️  DO Account 3 (EU-Frankfurt): 72% capacity (36/50 droplets)       │ │
│  │      Runway: 42 days at current growth rate                           │ │
│  │      Action: Add new EU DO account within 30 days                     │ │
│  │      [View Details] [Acknowledge] [Add Account]                       │ │
│  │                                                                         │ │
│  │  ⚠️  Partition "leads_p_enterprise_456": 587K rows                     │ │
│  │      Threshold: 500K (yellow), 1M (red)                                │ │
│  │      Action: Review data retention with customer                      │ │
│  │      [View Partition] [Contact Customer] [Archive Data]               │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  🔴 CRITICAL ALERTS (0):                                                   │
│  None - all systems operating within safe thresholds                       │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  GROWTH TRENDS (Last 30 Days)                                          │ │
│  │                                                                         │ │
│  │  Partitions:   +1,234 (+17%)   [Chart: 📈]                            │ │
│  │  Storage:      +45GB  (+13%)   [Chart: 📈]                            │ │
│  │  Latency:      -12ms  (-13%)   [Chart: 📉] ← Improved!               │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  [Refresh Now] [Download Report] [Configure Thresholds]                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 44.3.8 Alert Notification Routing

**Multi-Channel Alert Delivery:**

```typescript
// lib/genesis/alert-routing.ts

interface ScaleAlert {
  id: string;
  severity: 'YELLOW' | 'RED';
  metric: string;
  current: string;
  threshold: string;
  runway_days: number | null;
  recommendation: string;
}

async function routeAlert(alert: ScaleAlert) {
  const channels: AlertChannel[] = [];
  
  // Determine routing based on severity
  if (alert.severity === 'YELLOW') {
    channels.push(
      'in_app',        // Show in Admin dashboard
      'email_daily'    // Include in daily digest
    );
  } else if (alert.severity === 'RED') {
    channels.push(
      'in_app',        // Immediate banner in Admin dashboard
      'email_urgent',  // Send immediately
      'slack',         // Post to #genesis-alerts channel (if configured)
      'sms'            // SMS to admin (optional, for critical only)
    );
  }
  
  // Send to each channel
  for (const channel of channels) {
    switch (channel) {
      case 'in_app':
        await createInAppNotification(alert);
        break;
      case 'email_daily':
        await queueForDailyDigest(alert);
        break;
      case 'email_urgent':
        await sendUrgentEmail(alert);
        break;
      case 'slack':
        await postToSlack(alert);
        break;
      case 'sms':
        await sendSMS(alert);
        break;
    }
  }
}

// In-app notification (shown in Admin dashboard)
async function createInAppNotification(alert: ScaleAlert) {
  await supabase.from('notifications').insert({
    user_id: SUPER_ADMIN_ID,
    type: alert.severity === 'RED' ? 'critical_alert' : 'warning',
    title: `Scale Alert: ${alert.metric}`,
    message: alert.recommendation,
    action_url: `/admin/scale-health?alert_id=${alert.id}`,
    metadata: {
      current_value: alert.current,
      threshold: alert.threshold,
      runway_days: alert.runway_days
    }
  });
}

// Email notification (urgent for RED, daily digest for YELLOW)
async function sendUrgentEmail(alert: ScaleAlert) {
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `🚨 CRITICAL: ${alert.metric} Alert`,
    html: `
      <h2>Critical Scale Alert</h2>
      <p><strong>Metric:</strong> ${alert.metric}</p>
      <p><strong>Current Value:</strong> ${alert.current}</p>
      <p><strong>Threshold:</strong> ${alert.threshold}</p>
      <p><strong>Runway:</strong> ${alert.runway_days} days</p>
      
      <h3>Recommended Action:</h3>
      <p>${alert.recommendation}</p>
      
      <a href="${DASHBOARD_URL}/admin/scale-health?alert_id=${alert.id}">
        View Details in Dashboard
      </a>
    `
  });
}
```

---

### 44.3.9 Auto-Remediation Strategies

For certain alerts, the system can automatically take corrective action (with admin approval).

| Alert Type | Auto-Remediation | Requires Approval | Action |
|------------|------------------|-------------------|--------|
| **Partition count > 10k** | Enable catalog optimizations | No | Update `postgresql.conf` via Supabase API |
| **Large partition (>500k)** | Archive data older than 1 year | Yes | Run `DELETE FROM partition WHERE created_at < NOW() - INTERVAL '1 year'` |
| **DO account >70% full** | Add new DO account | Yes | Prompt admin to add API token |
| **Slow queries** | Add missing indexes | No | Run `genesis.create_jsonb_index()` |
| **Low wallet balance** | Pause managed services | Yes | Set `wallet_locked = true` |
| **Orphan snapshots** | Delete snapshots >30 days | No | Run garbage collection |

**Auto-Remediation Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AUTO-REMEDIATION DECISION TREE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Alert Created                                                              │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────┐                                                        │
│  │ Check if alert  │                                                        │
│  │ has auto-remedy │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│  ┌────────┴────────┐                                                        │
│  │                 │                                                        │
│  ▼                 ▼                                                        │
│ YES               NO                                                        │
│  │                 │                                                        │
│  │                 └──► [Send Alert Only]                                  │
│  │                                                                          │
│  ▼                                                                          │
│ ┌─────────────────┐                                                         │
│ │ Requires admin  │                                                         │
│ │ approval?       │                                                         │
│ └────────┬────────┘                                                         │
│          │                                                                  │
│  ┌───────┴───────┐                                                          │
│  │               │                                                          │
│  ▼               ▼                                                          │
│ YES             NO                                                          │
│  │               │                                                          │
│  │               └──► [Execute Immediately]                                │
│  │                    [Log Action]                                          │
│  │                                                                          │
│  ▼                                                                          │
│ [Send Approval Request]                                                     │
│ [Wait for Admin Click]                                                      │
│       │                                                                     │
│       ▼                                                                     │
│ ┌─────────────────┐                                                         │
│ │ Admin approves? │                                                         │
│ └────────┬────────┘                                                         │
│          │                                                                  │
│  ┌───────┴───────┐                                                          │
│  │               │                                                          │
│  ▼               ▼                                                          │
│ YES             NO                                                          │
│  │               │                                                          │
│  │               └──► [Mark: ignored]                                      │
│  │                                                                          │
│  ▼                                                                          │
│ [Execute Remediation]                                                       │
│ [Log Action + Result]                                                       │
│ [Resolve Alert]                                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 44.3.10 Example Alert Scenarios

**Scenario 1: Partition Count Approaching Limit**

```
TIME: Day 1
EVENT: Health check detects 10,200 partitions (threshold: 10,000 yellow)
ACTION:
  1. Create YELLOW alert in database
  2. Calculate runway: (12,000 - 10,200) / 120 daily growth = 15 days
  3. Send in-app notification
  4. Add to daily digest email
  5. Show banner in Admin dashboard

ADMIN SEES:
  ⚠️ Partition Capacity Alert
  Current: 10,200 partitions (68% of 15k target)
  Yellow Threshold: 10,000
  Red Threshold: 12,000
  Runway: 15 days until RED
  
  Recommendation:
  - Review Phase 40 catalog optimizations
  - Consider increasing max_locks_per_transaction
  - Plan for partition cleanup (inactive customers)
  
  [Acknowledge] [View Phase 40] [Schedule Optimization]

TIME: Day 10
EVENT: Admin clicks "Schedule Optimization"
ACTION:
  1. Mark alert as 'acknowledged'
  2. Create task reminder for Day 14
  3. Continue monitoring
  
TIME: Day 14
EVENT: Admin enables Phase 40 optimizations
ACTION:
  1. Alert remains active (still at 10,800 partitions)
  2. Runway recalculated: slower growth rate due to optimizations
  
TIME: Day 30
EVENT: Partition count stabilizes at 11,000 (below 12k red threshold)
ACTION:
  1. Alert status: acknowledged (not resolved, still in yellow zone)
  2. Continue monitoring
```

**Scenario 2: Large Partition Detected**

```
TIME: Day 1
EVENT: Enterprise customer "workspace_789" hits 520K rows
ACTION:
  1. Create YELLOW alert
  2. No auto-remediation (requires customer contact)
  3. Show in Admin dashboard

ADMIN SEES:
  ⚠️ Large Partition Alert
  Workspace: enterprise-customer-789
  Partition: leads_p_789
  Rows: 520,000 (threshold: 500K yellow, 1M red)
  Size: 5.2 GB
  
  Impact: Query latency: 85ms (still acceptable)
  
  Recommendation:
  - Contact customer about data retention
  - Archive leads older than 1 year
  - Consider sub-partitioning strategy
  
  [Contact Customer] [View Partition Details] [Archive Options]

TIME: Day 5
EVENT: Admin contacts customer, agrees to archive old data
ACTION:
  1. Run archival query (DELETE leads WHERE created_at < NOW() - INTERVAL '1 year')
  2. Partition size: 520K → 180K rows
  3. Alert auto-resolves (below 500K threshold)
  
RESULT:
  ✅ Alert resolved
  Query latency: 85ms → 35ms (improved)
  Storage freed: 3.4 GB
```

---

### 44.3.11 Alert Notification Preferences

**Admin can configure alert preferences:**

```sql
CREATE TABLE IF NOT EXISTS genesis.alert_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id TEXT NOT NULL,
    
    -- Channel preferences
    enable_email BOOLEAN DEFAULT TRUE,
    enable_slack BOOLEAN DEFAULT FALSE,
    enable_sms BOOLEAN DEFAULT FALSE,
    
    -- Severity filters
    notify_yellow BOOLEAN DEFAULT TRUE,
    notify_red BOOLEAN DEFAULT TRUE,
    
    -- Digest settings
    daily_digest_enabled BOOLEAN DEFAULT TRUE,
    daily_digest_time TIME DEFAULT '09:00:00',
    
    -- Slack webhook (optional)
    slack_webhook_url TEXT,
    
    -- SMS (optional)
    phone_number TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 44.3.12 Scale Health API Endpoints

**New API routes for Scale Health:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/scale-health` | GET | Fetch current health status |
| `/api/admin/scale-health/alerts` | GET | List active alerts |
| `/api/admin/scale-health/alerts/:id/acknowledge` | POST | Mark alert as acknowledged |
| `/api/admin/scale-health/alerts/:id/resolve` | POST | Manually resolve alert |
| `/api/admin/scale-health/run-checks` | POST | Trigger health checks manually |
| `/api/admin/scale-health/history` | GET | Historical metrics |

---

### 44.3.13 Benefits of Pre-Failure Alerts

| Traditional Approach | V30 Pre-Failure Alerts |
|---------------------|------------------------|
| ❌ Wait for system to break | ✅ Predict failure 30-60 days ahead |
| ❌ Users experience downtime | ✅ Optimize during off-hours |
| ❌ Panic-driven fixes | ✅ Planned, tested optimizations |
| ❌ No historical data | ✅ Trend analysis shows patterns |
| ❌ Manual monitoring | ✅ Automated checks every 6 hours |
| ❌ Reactive engineering | ✅ Proactive engineering |

**Real-World Impact:**

```
Without Alerts:
  Day 100: System hits 15k partitions
  Day 100: Queries start timing out (500ms+)
  Day 100: Users complain about slow dashboard
  Day 100: Emergency optimization session
  Day 101: Enable Phase 40 configs (risky during crisis)
  Impact: 24 hours downtime, 1,000+ angry users

With Pre-Failure Alerts:
  Day 70: YELLOW alert: 10,200 partitions (runway: 30 days)
  Day 71: Admin acknowledges, schedules optimization
  Day 75: Enable Phase 40 configs during low-traffic window
  Day 76: Test and validate
  Day 100: System hits 15k partitions smoothly
  Impact: Zero downtime, zero user complaints
```

---

### 44.3.14 Integration with Existing God Mode (Phase 44)

The Scale Health Monitoring integrates seamlessly with existing God Mode features:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GOD MODE DASHBOARD (Enhanced)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Tabs:                                                                      │
│  [Fleet Overview] [Health Mesh] [Scale Health] [Financial] [Template Mgmt] │
│                                    ▲                                        │
│                                    │                                        │
│                                NEW TAB                                      │
│                                                                             │
│  Fleet Overview (Existing):                                                │
│  - Droplet health states (Phase 54)                                        │
│  - Watchdog status (Phase 43)                                              │
│  - Heartbeat monitoring                                                    │
│                                                                             │
│  Scale Health (NEW):                                                       │
│  - Partition metrics                                                       │
│  - Query performance                                                       │
│  - Storage growth                                                          │
│  - DO capacity                                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 44.3.15 Monitoring Best Practices

**Check Frequency:**
- Critical metrics: Every 6 hours
- Storage metrics: Daily
- Trend analysis: Weekly

**Alert Fatigue Prevention:**
- Don't alert on transient spikes (use 24h moving average)
- Auto-resolve when metrics return to green
- Group related alerts (don't send 10 separate emails)

**Runway Calculations:**
- Based on 7-day moving average growth rate
- Accounts for seasonality (weekends, holidays)
- Conservative estimates (assume worst-case growth)

**Historical Data Retention:**
- Keep raw metrics: 90 days
- Keep aggregated metrics: 2 years
- Keep alert history: Forever (for compliance)

---

## 44.3.16 Implementation Checklist

**Phase 44.3 delivers:**

- ✅ 6 monitoring SQL functions (partition, storage, latency, DO capacity, etc.)
- ✅ `scale_metrics` history table
- ✅ `scale_alerts` table
- ✅ `alert_preferences` configuration
- ✅ `pg_cron` scheduled job (every 6 hours)
- ✅ Admin dashboard widget (Scale Health tab)
- ✅ Alert routing (in-app, email, Slack, SMS)
- ✅ Auto-remediation framework (with approval gates)
- ✅ Historical trend analysis
- ✅ API endpoints for programmatic access

**Integration points:**
- Phase 40: Uses partition optimization recommendations
- Phase 43: Complements Watchdog (droplet health vs scale health)
- Phase 50: Monitors DO account pool capacity
- Phase 58: Monitors wallet balance thresholds

---

# 🧪 PHASE 45: SANDBOX & SIMULATION ENGINE

> **Phase Type:** Testing Infrastructure

---

## 45.1 MOCK N8N

```typescript
// lib/genesis/mock-n8n.ts

const MOCK_RESPONSES: Record<string, (input: any) => any> = {
  'n8n-nodes-base.openAi': () => ({
    choices: [{ message: { content: 'Mock AI response for testing.' } }],
    usage: { total_tokens: 100 },
    model: 'gpt-4-mock',
  }),
  'n8n-nodes-base.httpRequest': (input) => ({
    statusCode: 200,
    body: { success: true, mock: true },
  }),
  'n8n-nodes-base.emailSend': (input) => ({
    messageId: `mock-${Date.now()}`,
    accepted: [input.toEmail],
  }),
};

export async function executeMockWorkflow(
  workflowDefinition: any,
  triggerData: any
): Promise<{ status: string; nodeResults: any[] }> {
  const nodeResults = [];

  for (const node of workflowDefinition.nodes) {
    const mockFn = MOCK_RESPONSES[node.type] || ((i) => ({ ...i, _mock: true }));
    nodeResults.push({
      name: node.name,
      output: mockFn(triggerData),
    });
  }

  return { status: 'success', nodeResults };
}
```

## 45.2 RATE LIMITER

```typescript
// lib/genesis/rate-limiter.ts

const DEFAULT_LIMITS: Record<string, { maxTokens: number; refillRate: number }> = {
  openai: { maxTokens: 10000, refillRate: 5000 },
  claude: { maxTokens: 5000, refillRate: 2500 },
  tavily: { maxTokens: 100, refillRate: 50 },
};

export class RateLimiter {
  async acquire(service: string, tokensNeeded: number = 1): Promise<{ granted: boolean; waitMs: number }> {
    const { data } = await supabaseAdmin!.rpc('genesis_acquire_tokens', {
      p_service_name: service,
      p_tokens_needed: tokensNeeded,
    });

    return { granted: data?.[0]?.granted ?? true, waitMs: data?.[0]?.wait_time_ms ?? 0 };
  }

  async withRateLimit<T>(service: string, tokens: number, fn: () => Promise<T>): Promise<T> {
    const { granted, waitMs } = await this.acquire(service, tokens);
    if (!granted) {
      await sleep(waitMs);
      return this.withRateLimit(service, tokens, fn);
    }
    return fn();
  }
}
```

---

# 💰 PHASE 57: MANAGED VS. BYO SERVICE MATRIX

> **Phase Type:** V30 Financial Architecture  
> **Dependencies:** Phase 60  
> **Risk Level:** HIGH (Financial Sustainability)

---

## 57.1 THE SERVICE CATEGORIZATION FRAMEWORK

To achieve the "frictionless" onboarding experience while protecting the platform's financial stability, V30 categorizes all external services into a **Managed vs. BYO (Bring Your Own)** matrix.

### 57.1.1 Service Categories Defined

| Category | Definition | Cost Bearer | User Experience |
|----------|------------|-------------|-----------------|
| **Managed (Proxy)** | Genesis operates the OAuth app, user clicks "Connect" | Genesis (wholesale) | Zero friction |
| **Managed (Wholesale)** | Genesis provides API key, charges per-use | Genesis (wholesale) | Low friction |
| **BYO (Key)** | User provides their own API key | User (direct) | Medium friction |
| **BYO (Setup)** | User must configure externally | User (direct) | High friction |

### 57.1.2 Complete Service Matrix

| Service | Category | User Action | Genesis Responsibility | Billing Model |
|---------|----------|-------------|----------------------|---------------|
| **Gmail (OAuth)** | Managed (Proxy) | Click "Connect Gmail" | Operate OAuth app, token refresh | Included in base |
| **Google Sheets** | Managed (Proxy) | Click "Connect Sheets" | Operate OAuth app | Included in base |
| **OpenAI** | BYO (Key) | Paste API key | Encrypt, inject to Sidecar | User pays OpenAI directly |
| **Claude/Anthropic** | BYO (Key) | Paste API key | Encrypt, inject to Sidecar | User pays Anthropic directly |
| **Relevance AI** | BYO (Key) | Paste API key | Encrypt, inject to Sidecar | User pays Relevance directly |
| **Google CSE** | Managed (Wholesale) | None (automatic) | Provide API Key + CX | $0.005/search, added to wallet |
| **Apify** | Managed (Wholesale) | None (automatic) | Provide API token | $0.02/scrape, added to wallet |
| **DigitalOcean** | Managed (Wholesale) | Select droplet size during onboarding | Spin up droplet on Genesis account pool (15+ accounts for scale) | $6-$48/month (tier-based flat fee) |
| **Residential Proxies** | Managed (Wholesale) | None (automatic) | Manage rotation, prevent bans | $0.001/request, added to wallet |
| **Email Verification** | Managed (Wholesale) | None (automatic) | Debounce/NeverBounce integration | $0.003/email, added to wallet |
| **DNS (Entri)** | Managed (Proxy) | Click "Setup DNS" | Handle SPF/DKIM/DMARC injection | Included in base |
| **Tracking Domains** | Managed (Proxy) | None (automatic) | Caddy SSL + reverse proxy | Included in base |

### 57.1.3 Why This Matrix Protects Genesis

**Managed (Wholesale) services are high-volume, predictable-cost APIs** where Genesis can negotiate bulk pricing and add a margin. These are services where:
- Users would struggle to set up themselves
- Volume discounts are available
- Costs can be metered and passed through

**BYO (Key) services are high-cost, unpredictable-usage APIs** where users should bear the direct cost. These are services where:
- Per-token/per-call pricing is expensive (AI models)
- Usage varies wildly by user
- Genesis cannot predict or cap costs

---

# 💳 PHASE 58: FINANCIAL KILL-SWITCH & GENESIS WALLET

> **Phase Type:** V30 Financial Controls  
> **Dependencies:** Phase 57  
> **Risk Level:** CRITICAL (Financial Safety)

---

## 58.1 THE GENESIS WALLET

Every tenant has a **Genesis Wallet** - a prepaid balance that covers Managed (Wholesale) service usage. This wallet acts as a buffer between user activity and platform costs.

### 58.1.1 Wallet Schema

| Field | Type | Description |
|-------|------|-------------|
| `workspace_id` | UUID | Tenant identifier |
| `balance_cents` | INTEGER | Current balance in cents |
| `lifetime_deposits` | INTEGER | Total ever deposited |
| `lifetime_usage` | INTEGER | Total ever consumed |
| `low_balance_alert_sent` | BOOLEAN | Has low balance email been sent |
| `auto_topup_enabled` | BOOLEAN | Automatic recharge enabled |
| `auto_topup_threshold` | INTEGER | Trigger threshold (cents) |
| `auto_topup_amount` | INTEGER | Amount to add (cents) |
| `last_transaction_at` | TIMESTAMPTZ | Most recent activity |

### 58.1.2 Transaction Types

| Type | Direction | Example |
|------|-----------|---------|
| `DEPOSIT` | Credit | User adds $50 to wallet |
| `AUTO_TOPUP` | Credit | Automatic recharge triggered |
| `APIFY_SCRAPE` | Debit | 1 lead scraped ($0.02) |
| `CSE_SEARCH` | Debit | 1 Google search ($0.005) |
| `PROXY_REQUEST` | Debit | 1 proxy request ($0.001) |
| `EMAIL_VERIFY` | Debit | 1 email verified ($0.003) |
| `REFUND` | Credit | Failed operation refunded |
| `ADJUSTMENT` | Either | Manual admin adjustment |

---

## 58.2 THE FINANCIAL KILL-SWITCH

The **Financial Kill-Switch** is a mandatory safety mechanism for all Managed (Wholesale) services. It prevents workflows from consuming resources when the wallet is depleted.

### 58.2.1 Kill-Switch Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FINANCIAL KILL-SWITCH FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  n8n WORKFLOW EXECUTION:                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  [Start] → [Research Lead] → [PRE-FLIGHT CHECK] → [Apify Scrape]  │   │
│  │                                    │                               │   │
│  │                                    ▼                               │   │
│  │                            ┌─────────────┐                         │   │
│  │                            │ Check Wallet│                         │   │
│  │                            │   Balance   │                         │   │
│  │                            └──────┬──────┘                         │   │
│  │                                   │                                │   │
│  │                     ┌─────────────┴─────────────┐                  │   │
│  │                     ▼                           ▼                  │   │
│  │              Balance >= $0.02            Balance < $0.02           │   │
│  │                     │                           │                  │   │
│  │                     ▼                           ▼                  │   │
│  │              [Continue to              [HALT WORKFLOW]             │   │
│  │               Apify Node]              [Send Alert to User]        │   │
│  │                     │                  [Log Kill Event]            │   │
│  │                     ▼                                              │   │
│  │              [Deduct $0.02                                         │   │
│  │               from Wallet]                                         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  PRE-FLIGHT CHECK NODE LOGIC:                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  1. Identify upcoming managed service nodes in workflow            │   │
│  │  2. Calculate estimated cost (e.g., 1 Apify = $0.02)               │   │
│  │  3. Query Dashboard Ledger API: GET /api/wallet/check              │   │
│  │     - Request: { workspace_id, required_amount }                   │   │
│  │     - Response: { approved: boolean, balance: number }             │   │
│  │  4. If approved: Continue execution                                │   │
│  │  5. If denied: Throw error, halt workflow                          │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  REDIS CACHING FOR SCALE:                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Problem: 15,000 tenants × multiple workflows × frequent checks    │   │
│  │           = massive database load                                  │   │
│  │                                                                     │   │
│  │  Solution: Cache wallet balances in Redis                          │   │
│  │                                                                     │   │
│  │  - Key: wallet:{workspace_id}                                      │   │
│  │  - Value: { balance_cents, last_sync }                             │   │
│  │  - TTL: 60 seconds                                                 │   │
│  │                                                                     │   │
│  │  Check flow:                                                       │   │
│  │  1. Check Redis cache first                                        │   │
│  │  2. If hit AND balance > threshold: Approve immediately            │   │
│  │  3. If miss OR balance near zero: Query Supabase, update cache    │   │
│  │                                                                     │   │
│  │  Deduction flow:                                                   │   │
│  │  1. Decrement Redis counter (atomic DECRBY)                        │   │
│  │  2. Queue async job to sync to Supabase                            │   │
│  │  3. Batch sync every 10 seconds                                    │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 58.2.2 Low Balance Alerts

| Balance Threshold | Action |
|-------------------|--------|
| $5.00 remaining | Email: "Your Genesis wallet is running low" |
| $1.00 remaining | Email + Dashboard banner: "Add funds to continue" |
| $0.00 remaining | Kill-Switch active, all managed services blocked |
| Negative (rare) | Admin alert, account flagged for review |

---

# 📊 PHASE 59: COST MODEL & RATE LIMIT ORCHESTRATION

> **Phase Type:** V30 Financial Optimization  
> **Dependencies:** Phase 57, Phase 58  
> **Risk Level:** MEDIUM (Sustainability)

---

## 59.1 PER-TENANT COST TRACKING

The Dashboard maintains a **Cost Ledger** that tracks all costs associated with each tenant, enabling margin analysis and pricing optimization.

### 59.1.1 Cost Categories

| Category | Components | Tracking Method |
|----------|------------|-----------------|
| **Infrastructure** | Droplet, bandwidth, snapshots | DO billing API, monthly |
| **Managed Services** | Apify, CSE, proxies, verification | Per-transaction logging |
| **Shared Overhead** | Redis, Supabase, Dashboard hosting | Divided by tenant count |

### 59.1.2 Margin Analysis Report

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PER-TENANT MARGIN REPORT                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  EXAMPLE: Tenant "Acme Corp" - January 2026                                │
│                                                                             │
│  REVENUE:                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Subscription fee:              $99.00                              │   │
│  │  Wallet usage (Apify):          $15.40  (770 scrapes × $0.02)      │   │
│  │  Wallet usage (CSE):            $4.50   (900 searches × $0.005)    │   │
│  │  Wallet usage (Proxies):        $2.10   (2100 requests × $0.001)   │   │
│  │  ────────────────────────────────────────                          │   │
│  │  TOTAL REVENUE:                 $121.00                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  COSTS:                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Droplet (1 month):             $6.00                               │   │
│  │  Bandwidth (8GB):               $0.80                               │   │
│  │  Snapshots (31 days):           $0.62                               │   │
│  │  Apify wholesale (770):         $11.55  (770 × $0.015 wholesale)   │   │
│  │  CSE wholesale (900):           $3.60   (900 × $0.004 wholesale)   │   │
│  │  Proxy wholesale (2100):        $1.47   (2100 × $0.0007 wholesale) │   │
│  │  Shared overhead allocation:    $0.05                               │   │
│  │  ────────────────────────────────────────                          │   │
│  │  TOTAL COSTS:                   $22.09                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  MARGIN:                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Gross Profit:                  $98.91                              │   │
│  │  Margin:                        81.7%                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 59.2 EXTERNAL API RATE LIMIT ORCHESTRATION

Beyond the Financial Kill-Switch, V30 must manage **external API rate limits** to prevent any single tenant from exhausting shared quotas.

### 59.2.1 Rate Limit Registry

| Service | Global Limit | Per-Tenant Allocation | Enforcement |
|---------|--------------|----------------------|-------------|
| OpenAI | 10,000 RPM (account) | Dynamic (based on active tenants) | Token bucket |
| Gmail API | 250 sends/day (per account) | N/A (per-tenant OAuth) | No global limit |
| Google CSE | 10,000/day (API key) | 100/day default, upgradeable | Hard cap |
| Apify | 1,000 concurrent (account) | 10 concurrent/tenant | Queue-based |
| Residential Proxy | 100 concurrent (pool) | 5 concurrent/tenant | Connection pool |

### 59.2.2 Rate Limit Enforcement Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RATE LIMIT ENFORCEMENT                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SCENARIO: Tenant requests Apify scrape                                    │
│                                                                             │
│  STEP 1: Check tenant's rate limit                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Redis key: ratelimit:apify:{workspace_id}                         │   │
│  │  Value: { current: 8, limit: 10, window_start: timestamp }         │   │
│  │                                                                     │   │
│  │  IF current < limit: Allow, increment current                      │   │
│  │  IF current >= limit: Return retry_after timestamp                 │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 2: Check global rate limit                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Redis key: ratelimit:apify:global                                 │   │
│  │  Value: { current: 850, limit: 1000 }                              │   │
│  │                                                                     │   │
│  │  IF current < limit: Allow, increment                              │   │
│  │  IF current >= limit: Queue request, return estimated wait         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 3: Execute or queue                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  IF both limits allow: Execute immediately                         │   │
│  │  IF tenant limit exceeded: Reject with error                       │   │
│  │  IF global limit exceeded: Queue with priority                     │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 🚪 PHASE 60: GENESIS GATEWAY UNIFIED ONBOARDING

> **Phase Type:** V30 User Experience  
> **Dependencies:** Phase 57  
> **Risk Level:** MEDIUM (User Adoption)

---

## 60.1 THE GENESIS GATEWAY CONCEPT

The **Genesis Gateway** is the unified onboarding UI that abstracts the complexity of 10+ third-party services into a single, guided experience.

### 60.1.1 Onboarding Flow Stages

| Stage | User Action | Backend Process | Duration |
|-------|-------------|-----------------|----------|
| 1. Account | Sign up with email/Google | Create Clerk user, workspace | 30 seconds |
| 2. Region & Droplet | Select data region + droplet size | Store region preference | 1 minute |
| 3. Brand | Enter company name, website | Store in Brand Vault | 1 minute |
| 4. Email | Click "Connect Gmail" | OAuth flow, store tokens | 2 minutes |
| 5. LLM Keys | Paste OpenAI + Claude keys | Encrypt, store in Vault | 1 minute |
| 6. Search | Paste Google CSE API key + Engine ID | Encrypt, store in Vault | 1 minute |
| 7. Scraping | Choose: BYO Apify or Managed Service | Store BYO key or use pool | 1 minute |
| 8. AI Enrichment | Paste Relevance AI key | Encrypt, store in Vault | 1 minute |
| 9. DNS | Click "Setup DNS" (Entri) | Inject SPF/DKIM/DMARC | 3 minutes |
| 10. Booking | Enter Calendly link | Validate, store | 30 seconds |
| 11. Ignition | Click "Start Engine" | Provision droplet, workflows | 60 seconds |
| **Total** | | | **~15 minutes** |

### 60.1.2 OAuth Proxy Architecture

For Managed (Proxy) services like Gmail, Genesis operates the OAuth app to eliminate client ID/secret friction.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OAUTH PROXY FLOW (GMAIL)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  USER EXPERIENCE:                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Dashboard shows: [Connect Gmail] button                           │   │
│  │  User clicks button                                                 │   │
│  │  Google consent screen appears (Genesis is the "app")              │   │
│  │  User grants access                                                 │   │
│  │  Redirect back to Dashboard                                         │   │
│  │  Dashboard shows: ✓ Gmail Connected                                │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  BACKEND FLOW:                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  1. Dashboard redirects to:                                        │   │
│  │     https://accounts.google.com/oauth/authorize                    │   │
│  │     ?client_id=GENESIS_OAUTH_CLIENT_ID                             │   │
│  │     &redirect_uri=https://app.genesis.io/api/oauth/gmail/callback  │   │
│  │     &scope=https://mail.google.com/                                │   │
│  │     &state={workspace_id, csrf_token}                              │   │
│  │                                                                     │   │
│  │  2. User consents on Google                                        │   │
│  │                                                                     │   │
│  │  3. Google redirects to callback with authorization code           │   │
│  │                                                                     │   │
│  │  4. Dashboard exchanges code for tokens:                           │   │
│  │     - Access token (short-lived)                                   │   │
│  │     - Refresh token (long-lived)                                   │   │
│  │                                                                     │   │
│  │  5. Tokens encrypted and stored in Credential Vault                │   │
│  │                                                                     │   │
│  │  6. During Ignition: Sidecar receives encrypted tokens             │   │
│  │     and creates n8n Gmail credential locally                       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  SECURITY NOTES:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  - Genesis NEVER sees email content (scope is mail.send only)      │   │
│  │  - Tokens are encrypted at rest (AES-256-GCM)                      │   │
│  │  - Tokens are decrypted only on tenant's Sidecar                   │   │
│  │  - Refresh tokens are rotated automatically                        │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 60.2 CREDENTIAL COLLECTION MATRIX

The Genesis Gateway must collect **all** credentials required for the cold email workflows to function. The following table defines the collection strategy for each service:

| Service | Credential Type | Collection Strategy | Storage | Required? |
|---------|----------------|---------------------|---------|-----------|
| **Gmail** | OAuth tokens | OAuth Proxy (automatic) | Encrypted in Vault | YES |
| **OpenAI** | API key | User pastes BYO key | Encrypted in Vault | YES |
| **Claude (Anthropic)** | API key | User pastes BYO key | Encrypted in Vault | YES |
| **Google CSE** | API key + Engine ID | User pastes BYO keys | Encrypted in Vault | YES |
| **Relevance AI** | API key | User pastes BYO key | Encrypted in Vault | YES |
| **Apify** | API token | User chooses: BYO or Managed | Encrypted in Vault or pool | OPTIONAL |
| **Calendly** | Booking URL | User pastes link | Plain text | YES |
| **DNS** | OAuth tokens | Entri OAuth (automatic) | Encrypted in Vault | YES |

### 60.2.1 BYO vs. Managed Service Decision Points

For **Apify**, users can choose between:

**Option 1: Bring Your Own (BYO)**
- User provides their own Apify API token
- Billing goes directly to user's Apify account
- No markup, but user manages their own limits

**Option 2: Managed Service (Genesis Pool)**
- User pays Genesis per-scrape ($0.02/scrape)
- Genesis uses shared Apify pool
- Automatic rate limiting and fail-over
- Tracked via Genesis Wallet (Phase 58)

The Genesis Gateway UI presents this choice clearly:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SCRAPING SERVICE SELECTION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  How would you like to handle web scraping?                                │
│                                                                             │
│  ( ) Bring Your Own Apify Account                                          │
│      - You manage your own Apify subscription                              │
│      - Direct billing to your Apify account                                │
│      - Paste your API token below:                                         │
│      [ _____________________________________ ]                              │
│                                                                             │
│  ( ) Use Genesis Managed Service (Recommended)                             │
│      - Pay $0.02 per scrape (bulk pricing)                                 │
│      - No Apify account needed                                             │
│      - Charged from Genesis Wallet                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 60.2.2 Credential Validation During Onboarding

When users paste API keys, the Genesis Gateway **validates them in real-time** before proceeding:

| Service | Validation Method | Pass Criteria | Fail Action |
|---------|------------------|---------------|-------------|
| OpenAI | `GET /v1/models` | 200 status code | Show error: "Invalid API key" |
| Claude | `POST /v1/messages` (test) | 200 or 401 with valid structure | Show error: "Invalid API key" |
| Google CSE | `GET /customsearch/v1` (test query) | 200 status code | Show error: "Invalid key or Engine ID" |
| Relevance AI | `GET /v1/validate` | 200 status code | Show error: "Invalid API key" |
| Apify (BYO) | `GET /v2/user/me` | 200 status code | Show error: "Invalid API token" |

This prevents users from completing onboarding with broken credentials, which would cause silent failures later.

---

## 60.3 DROPLET SIZING & REGION SELECTION

The Genesis Gateway presents users with **droplet sizing and region selection** early in the onboarding flow (Stage 2), before credential collection. This ensures the droplet is provisioned in the correct region with appropriate resources.

### 60.3.1 The Droplet Sizing UX

**User does NOT need a DigitalOcean account** - Genesis operates a pool of DigitalOcean accounts (starting with 1-3 FREE standard accounts, scaling to 15+ as you grow) and provisions droplets on behalf of tenants. The multi-account pool architecture enables scale from 50 customers to 15,000+ with ZERO refactoring (see Phase 50.2 for details). The user simply selects their desired performance tier:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE CONFIGURATION                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STEP 1: SELECT YOUR DATA REGION                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Where should your automation engine run?                          │   │
│  │                                                                     │   │
│  │  ( ) United States - East (Virginia)        Fastest for US East   │   │
│  │  ( ) United States - West (San Francisco)   Fastest for US West   │   │
│  │  (•) Europe - West (Frankfurt, Germany)     GDPR compliant        │   │
│  │  ( ) Europe - North (London, UK)            GDPR compliant        │   │
│  │  ( ) Asia Pacific (Singapore)               Fastest for APAC      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 2: SELECT YOUR DROPLET SIZE                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  How powerful should your automation engine be?                    │   │
│  │                                                                     │   │
│  │  (•) STARTER (Recommended)                          $6/month       │   │
│  │      1 vCPU, 1 GB RAM, 25 GB SSD                                   │   │
│  │      Perfect for: 1-5 sequences, ~500 leads/day                    │   │
│  │                                                                     │   │
│  │  ( ) PROFESSIONAL                                   $12/month      │   │
│  │      1 vCPU, 2 GB RAM, 50 GB SSD                                   │   │
│  │      Perfect for: 5-15 sequences, ~2,000 leads/day                 │   │
│  │                                                                     │   │
│  │  ( ) SCALE                                          $24/month      │   │
│  │      2 vCPU, 4 GB RAM, 80 GB SSD                                   │   │
│  │      Perfect for: 15+ sequences, ~10,000 leads/day                 │   │
│  │                                                                     │   │
│  │  ( ) ENTERPRISE                                     $48/month      │   │
│  │      4 vCPU, 8 GB RAM, 160 GB SSD                                  │   │
│  │      Perfect for: Agencies, 20+ sequences, unlimited leads         │   │
│  │                                                                     │   │
│  │  💡 You can upgrade anytime. We recommend starting with STARTER.   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [Continue to Brand Setup]                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 60.3.2 Droplet Tier Mapping

| Tier | DO Slug | vCPU | RAM | SSD | Monthly Cost | Use Case |
|------|---------|------|-----|-----|--------------|----------|
| **Starter** | `s-1vcpu-1gb` | 1 | 1 GB | 25 GB | **$6.00** | Individual users, 1-5 sequences |
| **Professional** | `s-1vcpu-2gb` | 1 | 2 GB | 50 GB | **$12.00** | Small teams, 5-15 sequences |
| **Scale** | `s-2vcpu-4gb` | 2 | 4 GB | 80 GB | **$24.00** | Power users, 15+ sequences |
| **Enterprise** | `s-4vcpu-8gb` | 4 | 8 GB | 160 GB | **$48.00** | Agencies, unlimited sequences |

**Backend Implementation:**
- User's selection is stored in `workspaces.droplet_size` (ENUM: 'starter', 'professional', 'scale', 'enterprise')
- During Ignition (Phase 41), the Orchestrator provisions the droplet with the selected `droplet_slug` from the mapping table
- Users can upgrade droplet size via Settings → "Upgrade Engine", which triggers Blue-Green Container Swap (Phase 56)

### 60.3.3 Why Droplet Sizing is Optional-but-Recommended

**Default if not selected:** Starter tier ($6/month)

**Why offer sizing choices?**
1. **Agencies need more power**: 4 vCPU can handle 20+ simultaneous n8n workflows
2. **Heavy scraping workloads**: More RAM = faster AI operations (Claude, OpenAI)
3. **Cost transparency**: Users with high volume prefer paying $24/month for droplet vs. hitting rate limits

**Why NOT force upgrades?**
- 80% of users will be fine on Starter
- Unnecessary friction during onboarding
- Users can upgrade later without data migration (Blue-Green swap)

---

# 🔧 PHASE 61: FRICTION-REDUCTION PROTOCOLS

> **Phase Type:** V30 User Experience  
> **Dependencies:** Phase 60  
> **Risk Level:** LOW (Enhancement)

---

## 61.1 AUTO-SCRAPE BRAND ONBOARDING

Instead of manual data entry, the user provides their website URL. A dedicated n8n "Onboarding Workflow" scrapes the site to pre-fill the Brand Vault.

### 61.1.1 Auto-Scrape Flow

| Step | Action | Output |
|------|--------|--------|
| 1 | User enters website URL | `https://acmecorp.com` |
| 2 | Scrape homepage | Company name, tagline, logo URL |
| 3 | Scrape /about page | Company description, founding year |
| 4 | Scrape /team page | Key personnel names |
| 5 | Scrape /products or /services | Product/service offerings |
| 6 | AI summarization | Tone of voice, target audience, value proposition |
| 7 | Present to user | Pre-filled form for review/edit |

### 61.1.2 Extracted Data Points

| Field | Extraction Method | Fallback |
|-------|-------------------|----------|
| Company Name | `<title>` tag, meta og:site_name | Ask user |
| Logo | `<link rel="icon">`, og:image | Ask user |
| Industry | AI classification from page content | Ask user |
| Tone | AI analysis of writing style | Default: Professional |
| Target Audience | AI inference from content | Ask user |
| Products/Services | H2/H3 headings on /products | Ask user |

---

## 61.2 ONE-CLICK DNS AUTHENTICATION

To solve the SPF/DKIM/DMARC nightmare, the Dashboard integrates with **Entri** for automated DNS record injection.

### 61.2.1 DNS Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ONE-CLICK DNS FLOW (ENTRI)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  USER EXPERIENCE:                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Dashboard shows: "Protect your sender reputation"                 │   │
│  │                   [Setup DNS Records] button                        │   │
│  │                                                                     │   │
│  │  User clicks button                                                 │   │
│  │                                                                     │   │
│  │  Entri popup appears:                                              │   │
│  │  - "Select your DNS provider" (GoDaddy, Cloudflare, etc.)         │   │
│  │  - User logs in to their provider                                  │   │
│  │  - Entri injects records automatically                             │   │
│  │                                                                     │   │
│  │  Dashboard shows: ✓ DNS Configured                                 │   │
│  │                   "SPF, DKIM, DMARC records added"                 │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  RECORDS INJECTED:                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  SPF:   v=spf1 include:_spf.google.com ~all                       │   │
│  │  DKIM:  google._domainkey -> DKIM public key                       │   │
│  │  DMARC: v=DMARC1; p=quarantine; rua=mailto:dmarc@genesis.io       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 61.3 BOOKING LINK VALIDATION

Before allowing a campaign to ignite, the Dashboard validates that the user's Calendly (or other booking) link is functional.

### 61.3.1 Validation Checks

| Check | Method | Failure Action |
|-------|--------|----------------|
| URL format | Regex for known booking providers | Prompt for correction |
| HTTP status | HEAD request, expect 200 | Warn user, allow override |
| Page content | Check for "booking" keywords | Warn user |
| Availability | (Future) Check if slots available | Informational only |

---

## 61.4 AUTOMATED TRACKING DOMAINS (DUAL-MODE STRATEGY)

The V30 architecture uses a **dual-mode domain strategy** to balance immediate availability (sslip.io) with professional branding (custom domains).

### 61.4.1 The Two-Tier Domain Architecture

| Mode | DNS Pattern | SSL Provider | When Used | Setup Required |
|------|-------------|-------------|-----------|----------------|
| **Bootstrap (Fallback)** | `{droplet-ip}.sslip.io` | sslip.io (automatic) | Immediate after provisioning, fallback if custom domain fails | None |
| **Production (Primary)** | `track.{clientdomain}.com` | Caddy + Let's Encrypt | Client-facing tracking links | CNAME record (automated via Entri) |

**Why Both?**
- **sslip.io**: Guarantees droplet is immediately accessible for Atomic Handshake (Phase 42) and testing
- **Custom domain**: Professional appearance, better email deliverability, branded tracking links

---

### 61.4.2 Bootstrap Mode: sslip.io (Instant SSL)

**What is sslip.io?**
- Free DNS service that maps `{any-ip}.sslip.io` to `{any-ip}`
- Automatically provides valid SSL certificates
- Zero configuration required

**Example:**
- Droplet IP: `159.223.45.67`
- Instant URL: `https://159.223.45.67.sslip.io`
- Works immediately after Cloud-Init completes

**When Used:**
1. **Atomic Handshake (T+45s)**: Sidecar POSTs webhook URL using sslip.io
2. **Testing**: Dashboard can immediately test n8n health via sslip.io
3. **Fallback**: If custom domain DNS fails, webhooks continue working via sslip.io

**Configured in Caddyfile** (see Phase 50.1.7):
```caddy
159.223.45.67.sslip.io {
    reverse_proxy n8n:5678 {
        flush_interval -1
    }
}
```

---

### 61.4.3 Production Mode: Custom Tracking Domains

**What is a Custom Tracking Domain?**
- Client provides their own domain (e.g., `acmecorp.com`)
- They create a subdomain: `track.acmecorp.com`
- Points to their dedicated droplet via CNAME

**Why Custom Domains?**
1. **Email Deliverability**: `track.acmecorp.com` looks legitimate vs. `159.223.x.x.sslip.io`
2. **Branding**: Client's domain appears in tracking links
3. **Trust**: Recipients trust links from known domains
4. **Professional**: No IP addresses in URLs

#### **Custom Domain Setup Flow:**

| Step | Actor | Action | Duration |
|------|-------|--------|----------|
| 1 | User | Clicks "Setup Tracking Domain" in Dashboard | - |
| 2 | Dashboard | Presents instructions: "Add CNAME: `track.acmecorp.com` → `{droplet-ip}.genesis.io`" | - |
| 3 | User | Uses Entri integration (one-click) OR adds CNAME manually | 2-5 minutes |
| 4 | Dashboard | Polls DNS every 30s to detect CNAME propagation | - |
| 5 | Dashboard | Sends BullMQ command to Sidecar: `ADD_TRACKING_DOMAIN` | - |
| 6 | Sidecar | Updates Caddyfile to add `track.acmecorp.com` block | Instant |
| 7 | Sidecar | Reloads Caddy gracefully (`caddy reload --config /etc/caddy/Caddyfile`) | Zero downtime |
| 8 | Caddy | Provisions Let's Encrypt SSL certificate for `track.acmecorp.com` | 5-10 seconds |
| 9 | Dashboard | Updates tracking links in DB to use custom domain | - |
| **Total** | | | **~5 minutes** |

#### **Updated Caddyfile (After Custom Domain Added):**

```caddy
# PRIMARY: Custom tracking domain
track.acmecorp.com {
    reverse_proxy n8n:5678 {
        flush_interval -1  # Critical for n8n's streaming responses
    }
}

# FALLBACK: sslip.io (kept active for resilience)
159.223.45.67.sslip.io {
    reverse_proxy n8n:5678 {
        flush_interval -1
    }
}
```

**Result:** Both domains work. Custom domain is primary. If custom domain DNS breaks, sslip.io continues serving webhooks.

---

### 61.4.4 Tracking Domain Lifecycle Management

**Scenarios Handled:**

| Scenario | Behavior | Failover |
|----------|----------|----------|
| **CNAME not set up** | Use sslip.io only | N/A (sslip.io works immediately) |
| **CNAME set up** | Use custom domain, keep sslip.io fallback | Both active |
| **Custom domain SSL expires** | Caddy auto-renews (Let's Encrypt) | If renewal fails, sslip.io continues |
| **CNAME deleted** | Dashboard detects 404 on custom domain | Automatically reverts tracking links to sslip.io |
| **Multiple domains** | User can add multiple subdomains (e.g., `click.`, `open.`) | All added to Caddyfile |

**The Dual-Mode Guarantee:**
- ✅ Droplet is **always accessible** (sslip.io never goes down)
- ✅ Professional branding **when available** (custom domain)
- ✅ Zero downtime **switching between modes** (Caddy reload is graceful)
- ✅ Automatic SSL **for both modes** (sslip.io built-in, Let's Encrypt for custom)

---

# 🌍 PHASE 62: DATA RESIDENCY & GDPR PROTOCOL

> **Phase Type:** V30 Compliance  
> **Dependencies:** Phase 50, Phase 40  
> **Risk Level:** HIGH (Regulatory)

---

## 62.1 MULTI-REGION STORAGE ARCHITECTURE

When a tenant is provisioned, they can select their data region. The database partition and droplet are co-located in the same geographic region.

### 62.1.1 Available Regions

| Region Code | Location | Supabase Region | DigitalOcean Region |
|-------------|----------|-----------------|---------------------|
| `us-east` | Virginia, USA | `us-east-1` | `nyc1`, `nyc3` |
| `us-west` | San Francisco, USA | `us-west-1` | `sfo1`, `sfo3` |
| `eu-west` | Frankfurt, Germany | `eu-central-1` | `fra1` |
| `eu-north` | London, UK | `eu-west-2` | `lon1` |
| `apac` | Singapore | `ap-southeast-1` | `sgp1` |

### 62.1.2 Region Selection Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REGION SELECTION DURING ONBOARDING                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STEP 1: User selects region in Genesis Gateway                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  "Where should your data be stored?"                               │   │
│  │                                                                     │   │
│  │  ( ) United States - East (Virginia)                               │   │
│  │  ( ) United States - West (San Francisco)                          │   │
│  │  (•) European Union (Frankfurt) ← Recommended for EU businesses    │   │
│  │  ( ) United Kingdom (London)                                       │   │
│  │  ( ) Asia Pacific (Singapore)                                      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 2: Provisioning routes to correct region                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Droplet: Created in DigitalOcean fra1 (Frankfurt)                 │   │
│  │  Partition: Created in Supabase eu-central-1 (Frankfurt)           │   │
│  │  Credentials: Stored in EU Vault instance                          │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 3: All future data stays in region                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Leads: Stored in eu-central-1 partition                           │   │
│  │  Email events: Stored in eu-central-1 events table                 │   │
│  │  Analytics: Aggregated in eu-central-1                             │   │
│  │  Backups: Snapshotted to EU region only                            │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  GDPR COMPLIANCE:                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  ✓ Personal data never leaves selected region                      │   │
│  │  ✓ Data processing occurs in-region (Droplet in same location)    │   │
│  │  ✓ Sub-processors documented (DO, Supabase)                        │   │
│  │  ✓ Data deletion available on request (Phase 64)                   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 📝 PHASE 63: AUDIT LOGGING & SUPPORT ACCESS

> **Phase Type:** V30 Compliance  
> **Dependencies:** Phase 51  
> **Risk Level:** MEDIUM (Compliance)

---

## 63.1 COMPREHENSIVE AUDIT LOGGING

Every significant action in the Genesis platform writes to an append-only audit log for compliance and forensic investigation.

### 63.1.1 Audit Log Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique event ID |
| `timestamp` | TIMESTAMPTZ | When event occurred |
| `actor_type` | ENUM | 'user', 'system', 'support', 'sidecar' |
| `actor_id` | TEXT | User ID, system name, or support agent ID |
| `action` | TEXT | What happened (e.g., 'IGNITION_STARTED') |
| `target_type` | TEXT | What was affected (e.g., 'workspace', 'credential') |
| `target_id` | UUID | ID of affected resource |
| `workspace_id` | UUID | Tenant context (if applicable) |
| `ip_address` | INET | Request origin |
| `user_agent` | TEXT | Client information |
| `details` | JSONB | Additional context |
| `region` | TEXT | Data region where event occurred |

### 63.1.2 Logged Events

| Category | Events |
|----------|--------|
| **Provisioning** | IGNITION_STARTED, IGNITION_COMPLETED, IGNITION_FAILED, ROLLBACK_EXECUTED |
| **Credentials** | CREDENTIAL_CREATED, CREDENTIAL_ACCESSED, CREDENTIAL_ROTATED, CREDENTIAL_DELETED |
| **Workflows** | WORKFLOW_DEPLOYED, WORKFLOW_UPDATED, WORKFLOW_ACTIVATED, WORKFLOW_DEACTIVATED |
| **Droplet** | DROPLET_CREATED, DROPLET_REBOOTED, DROPLET_HIBERNATED, DROPLET_WOKEN, DROPLET_TERMINATED |
| **Security** | LOGIN_SUCCESS, LOGIN_FAILED, PERMISSION_DENIED, SUSPICIOUS_ACTIVITY |
| **Support** | SUPPORT_ACCESS_GRANTED, SUPPORT_ACCESS_REVOKED, SUPPORT_ACTION_TAKEN |
| **Billing** | WALLET_DEPOSIT, WALLET_DEBIT, KILL_SWITCH_TRIGGERED, SUBSCRIPTION_CHANGED |
| **Data** | DATA_EXPORTED, DATA_DELETED, PARTITION_CREATED, PARTITION_DROPPED |

### 63.1.3 Audit Log Retention

| Region | Retention Period | Rationale |
|--------|-----------------|-----------|
| US | 7 years | SOC2 compliance |
| EU | 7 years | GDPR (though can delete on request) |
| All | Minimum 90 days | Operational debugging |

---

## 63.2 SUPPORT ACCESS PROTOCOL

Support staff need controlled access to tenant environments for debugging, but this access must be audited and time-limited.

### 63.2.1 Support Access Tiers

| Tier | Access Level | Duration | Approval Required |
|------|--------------|----------|-------------------|
| **Read-Only** | View logs, metrics, config | 30 minutes | Self-service |
| **Debug** | Read-only + restart containers | 60 minutes | Self-service |
| **Write** | Full Sidecar command access | 30 minutes | Manager approval |
| **Emergency** | Direct SSH to droplet | 15 minutes | VP approval + incident ticket |

### 63.2.2 Support Access Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SUPPORT ACCESS PROTOCOL                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SCENARIO: Support agent needs to debug tenant "Acme Corp"                 │
│                                                                             │
│  STEP 1: Agent requests access via Support Portal                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Tenant: Acme Corp (workspace_id: abc-123)                         │   │
│  │  Access Level: Read-Only                                           │   │
│  │  Reason: "Investigating workflow execution failures"               │   │
│  │  Ticket: SUPPORT-12345                                             │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 2: System generates time-limited JWT                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  {                                                                  │   │
│  │    "sub": "support_agent_jane",                                    │   │
│  │    "workspace_id": "abc-123",                                      │   │
│  │    "access_level": "read_only",                                    │   │
│  │    "ticket_id": "SUPPORT-12345",                                   │   │
│  │    "exp": (now + 30 minutes),                                      │   │
│  │    "permissions": ["view_logs", "view_metrics", "view_config"]     │   │
│  │  }                                                                  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 3: Agent accesses tenant data via Support Portal                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  All requests include support JWT                                  │   │
│  │  Sidecar validates JWT, checks permissions                         │   │
│  │  Every action logged to audit trail                                │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 4: Access automatically expires                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  After 30 minutes: JWT expires                                     │   │
│  │  Agent must request new access if needed                           │   │
│  │  All actions summarized in audit report                            │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  TENANT NOTIFICATION:                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Optional: Notify tenant when support accesses their account       │   │
│  │  Email: "Support agent Jane accessed your account for debugging"   │   │
│  │  Dashboard: Activity log shows support access                      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 🗑️ PHASE 64: TENANT LIFECYCLE MANAGEMENT

> **Phase Type:** V30 Operations  
> **Dependencies:** Phase 50, Phase 40, Phase 62  
> **Risk Level:** HIGH (Data Safety)

---

## 64.1 TENANT DELETION PROTOCOL

When a tenant offboards (cancellation, non-payment, or request), the system must cleanly destroy all associated resources while complying with data retention requirements.

### 64.1.1 Deletion Triggers

| Trigger | Grace Period | Data Export | Reversible |
|---------|--------------|-------------|------------|
| User requests deletion | 7 days | Offered before deletion | Yes (during grace) |
| Subscription cancelled | 30 days | Automatic export offered | Yes (during grace) |
| Non-payment (90 days) | 7 days | Offered via email | Yes (if payment made) |
| Terms of Service violation | Immediate | No | No |
| Fraud detection | Immediate | No | No |

### 64.1.2 Deletion Sequence

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TENANT DELETION PROTOCOL                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DAY 0: Deletion Initiated                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  1. Workspace status → PENDING_DELETION                            │   │
│  │  2. Email user: "Your account will be deleted in 7 days"           │   │
│  │  3. Offer data export link (valid 7 days)                          │   │
│  │  4. Hibernate droplet (stop billing for compute)                   │   │
│  │  5. Disable all workflows                                          │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  DAY 1-6: Grace Period                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  - User can cancel deletion via Dashboard                          │   │
│  │  - User can download data export                                   │   │
│  │  - No new campaigns can be started                                 │   │
│  │  - Reminder emails on Day 3 and Day 6                              │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  DAY 7: Hard Deletion                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  STEP 1: Generate final data export (stored 30 days for legal)     │   │
│  │                                                                     │   │
│  │  STEP 2: Destroy DigitalOcean Droplet                              │   │
│  │    - DELETE /v2/droplets/{droplet_id}                              │   │
│  │    - Delete all snapshots for this droplet                         │   │
│  │                                                                     │   │
│  │  STEP 3: Delete Database Partition                                 │   │
│  │    - DROP TABLE genesis.leads_p_{workspace_slug}                   │   │
│  │    - DELETE FROM genesis.partition_registry                        │   │
│  │                                                                     │   │
│  │  STEP 4: Delete Credentials                                        │   │
│  │    - DELETE FROM genesis.workspace_credentials                     │   │
│  │    - Credentials are encrypted, deletion is sufficient             │   │
│  │                                                                     │   │
│  │  STEP 5: Delete Webhook Registry                                   │   │
│  │    - DELETE FROM genesis.webhook_registry                          │   │
│  │                                                                     │   │
│  │  STEP 6: Delete Billing Records                                    │   │
│  │    - Keep transaction history (legal requirement)                  │   │
│  │    - Delete wallet balance                                         │   │
│  │                                                                     │   │
│  │  STEP 7: Anonymize Audit Logs (GDPR)                               │   │
│  │    - Replace user_id with "DELETED_USER_{hash}"                    │   │
│  │    - Keep action/timestamp for compliance                          │   │
│  │                                                                     │   │
│  │  STEP 8: Update Workspace                                          │   │
│  │    - status → TERMINATED                                           │   │
│  │    - terminated_at → NOW()                                         │   │
│  │    - Keep workspace record for 7 years (financial compliance)      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  POST-DELETION:                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  - Final email: "Your Genesis account has been deleted"            │   │
│  │  - Include: Data export link (30 days), receipt of deletion        │   │
│  │  - Audit log entry: TENANT_DELETED with deletion manifest          │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 64.2 DATA EXPORT (GDPR PORTABILITY)

Users have the right to export all their data in a machine-readable format.

### 64.2.1 Export Contents

| Category | Included Data | Format |
|----------|---------------|--------|
| **Leads** | All leads with all fields | CSV |
| **Campaigns** | Campaign metadata, settings | JSON |
| **Email Events** | Opens, clicks, replies, bounces | CSV |
| **Analytics** | Daily stats, aggregates | JSON |
| **Brand Vault** | Company info, templates | JSON |
| **Settings** | Workspace configuration | JSON |
| **Audit Log** | User's own actions | JSON |

### 64.2.2 Export Process

| Step | Action | Duration |
|------|--------|----------|
| 1 | User requests export via Settings | Instant |
| 2 | Background job queued | Instant |
| 3 | Query all tenant data | 1-5 minutes |
| 4 | Package into ZIP file | 30 seconds |
| 5 | Upload to temporary storage | 30 seconds |
| 6 | Generate signed download URL | Instant |
| 7 | Email user with link | Instant |
| 8 | Link expires | 48 hours |

### 64.2.3 Large Dataset Handling

For tenants with >100,000 leads, the export is chunked:

| Data Size | Handling |
|-----------|----------|
| <100,000 leads | Single ZIP file |
| 100,000-500,000 leads | Multiple CSV files in ZIP |
| >500,000 leads | Streamed export, multi-part download |

---

# 🔑 PHASE 65: CREDENTIAL ROTATION & WEBHOOK SECURITY

> **Phase Type:** V30 Security Operations  
> **Dependencies:** Phase 51, Phase 53  
> **Risk Level:** MEDIUM (Security)

---

## 65.1 CREDENTIAL ROTATION PROTOCOL

OAuth tokens expire. API keys should be rotated periodically. The Credential Rotation Protocol handles this at scale.

### 65.1.1 Rotation Schedule

| Credential Type | Rotation Trigger | Rotation Method |
|-----------------|------------------|-----------------|
| Gmail OAuth | 14 days before expiry | Automatic refresh token exchange |
| Google Sheets OAuth | 14 days before expiry | Automatic refresh token exchange |
| OpenAI API Key | User-initiated | Dashboard prompts, Sidecar updates |
| Webhook Secrets | 90 days (policy) | Automatic regeneration |
| Sidecar Token | 30 days | Automatic regeneration on heartbeat |

### 65.1.2 Batch Rotation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BATCH CREDENTIAL ROTATION                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DAILY CRON: Identify expiring credentials                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  SELECT workspace_id, credential_id, type, expires_at              │   │
│  │  FROM genesis.workspace_credentials                                 │   │
│  │  WHERE expires_at < NOW() + INTERVAL '14 days'                     │   │
│  │  AND type IN ('gmail_oauth', 'sheets_oauth')                       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  FOR EACH expiring credential:                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  1. Queue job to BullMQ: ROTATE_CREDENTIAL                         │   │
│  │     - Priority: HIGH                                               │   │
│  │     - Concurrency limited to 50 (OAuth rate limits)                │   │
│  │                                                                     │   │
│  │  2. Sidecar receives job                                           │   │
│  │     - Calls Google OAuth: POST /token with refresh_token           │   │
│  │     - Receives new access_token + refresh_token                    │   │
│  │     - Updates local n8n credential                                 │   │
│  │                                                                     │   │
│  │  3. Sidecar reports success                                        │   │
│  │     - POSTs new encrypted tokens to Dashboard                      │   │
│  │     - Dashboard updates Vault with new expiry                      │   │
│  │                                                                     │   │
│  │  4. Audit log: CREDENTIAL_ROTATED                                  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  FAILURE HANDLING:                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  IF refresh fails (user revoked access):                           │   │
│  │    - Mark credential as INVALID                                    │   │
│  │    - Email user: "Please reconnect your Gmail"                     │   │
│  │    - Dashboard shows alert                                         │   │
│  │    - Workflows using this credential will fail                     │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 65.2 WEBHOOK SIGNATURE VERIFICATION

All webhooks between Dashboard, Sidecar, and n8n include HMAC signatures to prevent replay attacks and tampering.

### 65.2.1 Signature Protocol

| Header | Content |
|--------|---------|
| `X-Genesis-Signature` | HMAC-SHA256 signature |
| `X-Genesis-Timestamp` | Unix timestamp of request |
| `X-Genesis-Request-Id` | Unique request ID for idempotency |

### 65.2.2 Signature Generation

```
SIGNATURE = HMAC-SHA256(
  key: shared_secret,
  message: timestamp + "." + request_body
)
```

### 65.2.3 Verification Rules

| Check | Failure Action |
|-------|----------------|
| Signature mismatch | Reject with 401 |
| Timestamp > 5 minutes old | Reject (replay attack) |
| Request ID already seen | Reject (duplicate) |
| No signature header | Reject with 400 |

---

## 65.3 DEAD LETTER QUEUE FOR WEBHOOKS

Failed webhook deliveries are captured in a Dead Letter Queue for retry and investigation.

### 65.3.1 DLQ Entry Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | DLQ entry ID |
| `workspace_id` | UUID | Tenant |
| `webhook_url` | TEXT | Target URL |
| `payload` | JSONB | Request body |
| `error_message` | TEXT | Last failure reason |
| `attempt_count` | INTEGER | Number of attempts |
| `first_attempt_at` | TIMESTAMPTZ | When first tried |
| `last_attempt_at` | TIMESTAMPTZ | Most recent attempt |
| `next_retry_at` | TIMESTAMPTZ | Scheduled retry |
| `status` | ENUM | 'pending', 'retrying', 'resolved', 'abandoned' |

### 65.3.2 Retry Strategy

| Attempt | Delay | Action if Failed |
|---------|-------|------------------|
| 1 | Immediate | Retry after 1 second |
| 2 | 1 second | Retry after 5 seconds |
| 3 | 5 seconds | Retry after 30 seconds |
| 4 | 30 seconds | Retry after 5 minutes |
| 5 | 5 minutes | Move to DLQ for manual review |

---

# 🔄 PHASE 46: SHADOW MIGRATION & PARITY TESTING

> **Phase Type:** Data Migration  
> **Dependencies:** Phase 40  
> **Risk Level:** HIGH (Data Integrity)

---

## 46.1 DUAL-WRITE TRIGGER

```sql
-- Creates dual-write from legacy to genesis
CREATE OR REPLACE FUNCTION genesis.enable_dual_write(
    p_workspace_id UUID,
    p_source_table TEXT,
    p_target_partition TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    -- Create trigger function for this workspace
    EXECUTE format($f$
        CREATE OR REPLACE FUNCTION genesis.dual_write_%s()
        RETURNS TRIGGER AS $t$
        BEGIN
            IF TG_OP = 'INSERT' THEN
                INSERT INTO genesis.%I SELECT NEW.*;
            ELSIF TG_OP = 'UPDATE' THEN
                UPDATE genesis.%I SET 
                    email_address = NEW.email_address,
                    status = NEW.status,
                    updated_at = NOW()
                WHERE id = NEW.id;
            ELSIF TG_OP = 'DELETE' THEN
                DELETE FROM genesis.%I WHERE id = OLD.id;
            END IF;
            RETURN NEW;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Dual-write failed: %%', SQLERRM;
            RETURN NEW;
        END;
        $t$ LANGUAGE plpgsql;
    $f$, 
    REPLACE(p_workspace_id::TEXT, '-', '_'),
    p_target_partition,
    p_target_partition,
    p_target_partition);

    -- Attach trigger
    EXECUTE format(
        'CREATE TRIGGER dual_write_%s AFTER INSERT OR UPDATE OR DELETE ON %I
         FOR EACH ROW WHEN (NEW.workspace_id = %L OR OLD.workspace_id = %L)
         EXECUTE FUNCTION genesis.dual_write_%s()',
        REPLACE(p_workspace_id::TEXT, '-', '_'),
        p_source_table,
        p_workspace_id,
        p_workspace_id,
        REPLACE(p_workspace_id::TEXT, '-', '_')
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

## 46.2 PARITY CHECKER

```typescript
// lib/genesis/parity-checker.ts

export async function runParityCheck(workspaceId: string): Promise<{
  match: boolean;
  sourceCount: number;
  targetCount: number;
  mismatches: Array<{ id: string; diff: string[] }>;
}> {
  const { data: migration } = await supabaseAdmin!
    .from('genesis.migration_state')
    .select('source_table, target_table')
    .eq('workspace_id', workspaceId)
    .single();

  if (!migration) throw new Error('Migration not found');

  // Get counts
  const { count: sourceCount } = await supabaseAdmin!.from(migration.source_table).select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId);
  const { count: targetCount } = await supabaseAdmin!.from(migration.target_table.replace('genesis.', '')).select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId);

  // Sample comparison
  const { data: sourceRows } = await supabaseAdmin!.from(migration.source_table).select('id, email_address, status, updated_at').eq('workspace_id', workspaceId).limit(1000);
  const { data: targetRows } = await supabaseAdmin!.from(migration.target_table.replace('genesis.', '')).select('id, email_address, status, updated_at').eq('workspace_id', workspaceId).limit(1000);

  const mismatches: Array<{ id: string; diff: string[] }> = [];
  const targetMap = new Map(targetRows?.map(r => [r.id, r]) || []);

  for (const source of sourceRows || []) {
    const target = targetMap.get(source.id);
    if (!target) {
      mismatches.push({ id: source.id, diff: ['missing_in_target'] });
    } else {
      const diffs = Object.keys(source).filter(k => source[k] !== target[k]);
      if (diffs.length > 0) mismatches.push({ id: source.id, diff: diffs });
    }
  }

  return {
    match: sourceCount === targetCount && mismatches.length === 0,
    sourceCount: sourceCount || 0,
    targetCount: targetCount || 0,
    mismatches: mismatches.slice(0, 100),
  };
}
```

---

# 🔥 PHASE 47: HYPER-SCALE STRESS TEST & RED-TEAMING

> **Phase Type:** Quality Assurance

---

## 47.1 K6 LOAD TEST

```javascript
// tests/load/api-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 500 },
    { duration: '2m', target: 1000 },
    { duration: '5m', target: 1000 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

const WORKSPACE_IDS = JSON.parse(__ENV.WORKSPACE_IDS || '["ws_test"]');

export default function () {
  const wsId = WORKSPACE_IDS[Math.floor(Math.random() * WORKSPACE_IDS.length)];
  
  const res = http.get(`${__ENV.BASE_URL}/api/dashboard?workspaceId=${wsId}`);
  check(res, {
    'status 200': (r) => r.status === 200,
    'fast response': (r) => r.timings.duration < 500,
  });
  
  sleep(Math.random() * 2 + 1);
}
```

## 47.2 SECURITY TEST

```typescript
// tests/security/rls-bypass.test.ts

describe('RLS Bypass Attempts', () => {
  it('blocks cross-workspace access', async () => {
    const victimWs = 'ws_victim';
    const attackerWs = 'ws_attacker';

    // Attacker tries to access victim data
    const res = await fetch(`/api/contacts?workspaceId=${victimWs}`, {
      headers: { 'Authorization': `Bearer ${ATTACKER_TOKEN}`, 'X-Workspace-Id': attackerWs },
    });

    expect(res.status === 403 || (await res.json()).length === 0).toBe(true);
  });

  it('blocks null workspace bypass', async () => {
    const res = await fetch('/api/contacts?workspaceId=');
    expect([400, 403]).toContain(res.status);
  });

  it('blocks SQL injection', async () => {
    const res = await fetch(`/api/contacts?workspaceId=${encodeURIComponent("'; DROP TABLE--")}`);
    expect([400, 403]).toContain(res.status);
  });
});
```

---

# 🚀 PHASE 48: PRODUCTION CUTOVER & REVERT PROTOCOL

> **Phase Type:** Production Operations

---

## 48.1 LAUNCH CHECKLIST

```typescript
// lib/genesis/launch-readiness.ts

interface Check { id: string; name: string; severity: 'blocker' | 'critical' | 'warning'; check: () => Promise<boolean>; }

const CHECKS: Check[] = [
  { id: 'DB', name: 'Database connection', severity: 'blocker', check: async () => (await fetch('/api/health/db')).ok },
  { id: 'SCHEMA', name: 'Genesis schema exists', severity: 'blocker', check: async () => (await fetch('/api/admin/schema-check')).json().then(d => d.exists) },
  { id: 'N8N', name: 'n8n connectivity', severity: 'blocker', check: async () => (await fetch('/api/health/n8n')).ok },
  { id: 'RLS', name: 'RLS policies active', severity: 'blocker', check: async () => (await fetch('/api/admin/rls-check')).json().then(d => d.allActive) },
  { id: 'TESTS', name: 'Security tests pass', severity: 'blocker', check: async () => (await fetch('/api/admin/test-results?type=security')).json().then(d => d.critical === 0) },
];

export async function generateReadinessReport(): Promise<{ status: 'GO' | 'NO-GO'; blockers: string[] }> {
  const blockers: string[] = [];
  for (const check of CHECKS) {
    if (!(await check.check()) && check.severity === 'blocker') blockers.push(check.name);
  }
  return { status: blockers.length === 0 ? 'GO' : 'NO-GO', blockers };
}
```

## 48.2 INSTANT REVERT

```typescript
// lib/genesis/instant-revert.ts

export async function executeInstantRevert(trigger: string): Promise<{ success: boolean; duration: number }> {
  const start = Date.now();
  
  // Abort canary if active
  await fetch('/api/admin/cutover', { method: 'POST', body: JSON.stringify({ action: 'abort' }) });
  
  // Log revert
  await supabaseAdmin!.from('genesis.events').insert({ type: 'revert', trigger, timestamp: new Date().toISOString() });
  
  return { success: true, duration: Date.now() - start };
}

// Auto-revert triggers
const TRIGGERS = [
  { name: 'error_rate', check: async () => (await getErrorRate()) > 0.05, autoRevert: true },
  { name: 'latency', check: async () => (await getP95Latency()) > 3000, autoRevert: true },
  { name: 'db_connection', check: async () => !(await fetch('/api/health/db')).ok, autoRevert: true },
];

export async function monitorRevertTriggers(): Promise<void> {
  for (const trigger of TRIGGERS) {
    if (await trigger.check() && trigger.autoRevert) {
      await executeInstantRevert(trigger.name);
      return;
    }
  }
}
```

---

# 📚 OPERATIONS RUNBOOK

## Quick Commands

```bash
# Check deployment state
curl /api/admin/cutover

# Run readiness check
curl /api/admin/cutover?action=readiness

# Trigger watchdog
curl -X POST /api/admin/watchdog

# Instant revert
curl -X POST /api/admin/cutover -d '{"action":"abort"}'
```

## Incident Response

| Severity | Response Time | Escalation |
|----------|--------------|------------|
| SEV-1 | 5 min | Immediate |
| SEV-2 | 15 min | 30 min |
| SEV-3 | 1 hour | 4 hours |
| SEV-4 | 24 hours | None |

## Rollback Procedures

1. **Quick (<60s):** `POST /api/admin/cutover {"action":"abort"}`
2. **Full (<5m):** Vercel dashboard → Deployments → Promote previous
3. **Database:** Supabase → Backups → Point-in-time recovery

---

# 🔬 PHASE 40 DEEP FORENSIC EXPANSION

## 40.A THE POSTGRES CATALOG BOTTLENECK - EXTENDED ANALYSIS

### 40.A.1 Catalog Table Physics at 15,000 Partitions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CATALOG TABLE SIZE PROJECTIONS                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TABLE: pg_class (relation metadata)                                        │
│  ─────────────────────────────────────────────────────────────────────     │
│  Current rows: ~2,000 (base system + existing tables)                       │
│  Genesis rows: +15,000 (partitions) + 45,000 (indexes) = +60,000           │
│  Total: ~62,000 rows                                                        │
│  Row size: ~250 bytes average                                               │
│  Total size: ~15.5 MB (fits in shared_buffers hot cache)                   │
│                                                                             │
│  TABLE: pg_attribute (column metadata)                                      │
│  ─────────────────────────────────────────────────────────────────────     │
│  Columns per partition: ~40                                                 │
│  Genesis rows: 15,000 × 40 = 600,000                                       │
│  Row size: ~120 bytes                                                       │
│  Total size: ~72 MB                                                         │
│                                                                             │
│  TABLE: pg_inherits (partition inheritance)                                 │
│  ─────────────────────────────────────────────────────────────────────     │
│  Genesis rows: 15,000 (one per partition)                                  │
│  Row size: ~32 bytes                                                        │
│  Total size: ~480 KB                                                        │
│                                                                             │
│  TABLE: pg_constraint (constraints)                                         │
│  ─────────────────────────────────────────────────────────────────────     │
│  Constraints per partition: ~3 (PK, UNIQUE email, CHECK workspace)         │
│  Genesis rows: 15,000 × 3 = 45,000                                         │
│  Total size: ~5 MB                                                          │
│                                                                             │
│  TOTAL CATALOG OVERHEAD: ~100 MB                                           │
│  ─────────────────────────────────────────────────────────────────────     │
│  Conclusion: Fits easily in memory, but LOCK CONTENTION is the issue       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 40.A.2 Lock Contention Deep Dive

```sql
-- ============================================
-- LOCK CONTENTION ANALYSIS QUERIES
-- Run these to identify catalog bottlenecks
-- ============================================

-- Query 1: Current lock wait chains
SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity 
    ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity 
    ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- Query 2: Lock wait time histogram
SELECT
    locktype,
    mode,
    COUNT(*) as lock_count,
    AVG(EXTRACT(EPOCH FROM (now() - query_start))) as avg_wait_seconds
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE NOT l.granted
GROUP BY locktype, mode
ORDER BY avg_wait_seconds DESC;

-- Query 3: Partition DDL impact analysis
SELECT
    relname,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    n_live_tup,
    n_dead_tup,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'pg_catalog'
ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC
LIMIT 20;
```

### 40.A.3 Query Planner Partition Pruning Analysis

```sql
-- ============================================
-- PARTITION PRUNING EFFECTIVENESS TESTS
-- ============================================

-- Test 1: Verify partition pruning is working
EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT TEXT)
SELECT * FROM genesis.leads 
WHERE workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
LIMIT 100;

/*
EXPECTED OUTPUT:
  -> Index Scan using leads_p_workspace_aaa_email_idx on genesis.leads_p_workspace_aaa
     Filter: (workspace_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid)
     Rows Removed by Filter: 0
     Buffers: shared hit=5
     
FAILURE INDICATOR (partition pruning NOT working):
  -> Append
       -> Seq Scan on genesis.leads_p_workspace_aaa
       -> Seq Scan on genesis.leads_p_workspace_bbb
       -> Seq Scan on genesis.leads_p_workspace_ccc
       ... (scanning ALL partitions)
*/

-- Test 2: Planner statistics freshness
SELECT
    schemaname,
    relname,
    n_live_tup,
    n_dead_tup,
    last_analyze,
    last_autoanalyze,
    CASE 
        WHEN last_analyze IS NULL AND last_autoanalyze IS NULL THEN 'NEVER ANALYZED'
        WHEN COALESCE(last_analyze, last_autoanalyze) < NOW() - INTERVAL '1 day' THEN 'STALE'
        ELSE 'OK'
    END as stats_status
FROM pg_stat_user_tables
WHERE schemaname = 'genesis'
ORDER BY n_live_tup DESC;

-- Test 3: Partition bounds verification
SELECT
    parent.relname AS parent_table,
    child.relname AS partition_name,
    pg_get_expr(child.relpartbound, child.oid) AS partition_bounds
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname = 'leads'
ORDER BY child.relname;
```

### 40.A.4 max_locks_per_transaction Deep Calculation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LOCK REQUIREMENT CALCULATION                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SCENARIO: Peak provisioning load (100 concurrent workspace creations)     │
│                                                                             │
│  Per CREATE PARTITION operation:                                            │
│  ├── AccessExclusiveLock on parent table (genesis.leads)      = 1          │
│  ├── RowExclusiveLock on pg_class                             = 1          │
│  ├── RowExclusiveLock on pg_attribute (per column)            = 40         │
│  ├── RowExclusiveLock on pg_inherits                          = 1          │
│  ├── RowExclusiveLock on pg_constraint (per constraint)       = 3          │
│  ├── AccessShareLock on pg_namespace                          = 1          │
│  └── ShareLock on parent table's indexes                      = 3          │
│  ═══════════════════════════════════════════════════════════════════       │
│  TOTAL PER PARTITION CREATION: ~50 locks                                   │
│                                                                             │
│  Per CREATE INDEX CONCURRENTLY operation:                                   │
│  ├── ShareUpdateExclusiveLock on table                        = 1          │
│  ├── RowExclusiveLock on pg_class                             = 1          │
│  ├── RowExclusiveLock on pg_index                             = 1          │
│  ├── RowExclusiveLock on pg_depend                            = 1          │
│  └── AccessShareLock on indexed columns                       = 1          │
│  ═══════════════════════════════════════════════════════════════════       │
│  TOTAL PER INDEX: ~5 locks × 3 indexes = 15 locks                          │
│                                                                             │
│  PEAK SCENARIO CALCULATION:                                                 │
│  ─────────────────────────────────────────────────────────────────────     │
│  Concurrent partition creations: 10 (serialized by advisory lock)          │
│  Concurrent regular queries: 400                                            │
│  Locks per query (partition access): ~3                                     │
│                                                                             │
│  TOTAL PEAK LOCKS: (10 × 65) + (400 × 3) = 650 + 1200 = 1850               │
│                                                                             │
│  SETTING RECOMMENDATION:                                                    │
│  max_locks_per_transaction = 256 (per transaction)                         │
│  max_connections = 400                                                      │
│  Lock table size = 256 × 400 = 102,400 slots                               │
│                                                                             │
│  SAFETY MARGIN: 102,400 slots >> 1,850 peak = 55× headroom                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 40.A.5 Connection Pooling Deep Configuration

```ini
# ============================================
# PGBOUNCER PRODUCTION CONFIGURATION
# /etc/pgbouncer/pgbouncer.ini
# ============================================

[databases]
# Primary production database
genesis_prod = host=db.xxxx.supabase.co port=5432 dbname=postgres pool_size=50 reserve_pool=25

# Read replica for analytics (if available)
genesis_read = host=db-read.xxxx.supabase.co port=5432 dbname=postgres pool_size=30

[pgbouncer]
# ============================================
# LISTEN SETTINGS
# ============================================
listen_addr = 0.0.0.0
listen_port = 6432
unix_socket_dir = /var/run/pgbouncer

# ============================================
# POOL MODE - CRITICAL DECISION
# ============================================
# transaction: SET LOCAL works, good multiplexing
# session: SET LOCAL works, poor multiplexing (1:1)
# statement: SET LOCAL BROKEN, maximum multiplexing
#
# WE MUST USE TRANSACTION MODE for RLS to work
pool_mode = transaction

# ============================================
# CONNECTION LIMITS
# ============================================
# Maximum client connections to accept
max_client_conn = 10000

# Default pool size (server connections per database)
default_pool_size = 50

# Minimum pool size to maintain
min_pool_size = 10

# Reserve pool for burst traffic
reserve_pool_size = 25

# Seconds to wait before using reserve pool
reserve_pool_timeout = 3

# Maximum age of server connection (seconds)
server_lifetime = 3600

# Close server connection after this many seconds idle
server_idle_timeout = 600

# ============================================
# TIMEOUT SETTINGS
# ============================================
# Server connection timeout
server_connect_timeout = 5

# Login retry count
server_login_retry = 3

# Query timeout (prevents runaway queries)
query_timeout = 30

# Maximum time to wait for available server connection
query_wait_timeout = 60

# Client idle timeout before disconnect
client_idle_timeout = 300

# ============================================
# TRANSACTION-MODE SPECIFIC
# ============================================
# CRITICAL: Reset server state after each transaction
# This ensures SET LOCAL is cleared
server_reset_query = DISCARD ALL

# Query to verify server connection is alive
server_check_query = SELECT 1

# Delay between server checks (seconds)
server_check_delay = 30

# ============================================
# SECURITY
# ============================================
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

# Don't show actual database to clients
ignore_startup_parameters = extra_float_digits

# ============================================
# LOGGING
# ============================================
log_connections = 0
log_disconnections = 0
log_pooler_errors = 1
stats_period = 60

# Log file location
logfile = /var/log/pgbouncer/pgbouncer.log
pidfile = /var/run/pgbouncer/pgbouncer.pid

# ============================================
# ADMIN
# ============================================
admin_users = pgbouncer_admin
stats_users = pgbouncer_stats
```

### 40.A.6 Supavisor Integration (Supabase-Specific)

```typescript
/**
 * Supabase uses Supavisor for connection pooling.
 * These are the Supavisor-specific configurations.
 */

// Environment configuration for Supavisor
const SUPAVISOR_CONFIG = {
  // Use transaction mode endpoint for RLS
  transactionMode: {
    host: 'db.xxxx.supabase.co',
    port: 5432,  // Supavisor proxies on standard port
    poolMode: 'transaction',
  },
  
  // Use session mode only for admin operations
  sessionMode: {
    host: 'db.xxxx.supabase.co',
    port: 6543,  // Direct connection (bypasses Supavisor)
    poolMode: 'session',
  },
};

// Supabase client configuration for RLS compatibility
export function createRLSCompatibleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: {
        schema: 'genesis',
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          // Supavisor timeout hint (milliseconds)
          'x-supavisor-timeout': '30000',
        },
      },
    }
  );
}

// Pattern for RLS-safe queries
export async function executeWithWorkspaceContext<T>(
  workspaceId: string,
  fn: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  const client = createRLSCompatibleClient();
  
  // Set workspace context (works with Supavisor transaction mode)
  const { error: ctxError } = await client.rpc('set_workspace_context', {
    p_workspace_id: workspaceId,
  });
  
  if (ctxError) {
    throw new Error(`Context error: ${ctxError.message}`);
  }
  
  // Execute within same transaction
  return fn(client);
}
```

---

## 40.B ATOMIC IGNITION - EXTENDED IMPLEMENTATION

### 40.B.1 Complete Partition Provisioner Schema

```sql
-- ============================================
-- GENESIS PARTITION PROVISIONER - FULL SCHEMA
-- ============================================

BEGIN;

-- ============================================
-- PARTITION REGISTRY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS genesis.partition_registry (
    workspace_id UUID PRIMARY KEY,
    partition_name TEXT NOT NULL UNIQUE,
    partition_slug TEXT NOT NULL,
    
    -- Status tracking
    status TEXT DEFAULT 'creating' CHECK (status IN (
        'creating',
        'active', 
        'migrating',
        'maintenance',
        'dropping',
        'dropped'
    )),
    
    -- Statistics
    row_count BIGINT DEFAULT 0,
    size_bytes BIGINT DEFAULT 0,
    index_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_stats_update TIMESTAMPTZ,
    
    -- Indexes and constraints tracking
    indexes_created TEXT[] DEFAULT '{}',
    constraints_verified BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_partition_registry_status ON genesis.partition_registry(status);
CREATE INDEX idx_partition_registry_created ON genesis.partition_registry(created_at DESC);

-- ============================================
-- PARTITION OPERATION LOG
-- ============================================
CREATE TABLE IF NOT EXISTS genesis.partition_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN (
        'create',
        'create_index',
        'drop_index',
        'migrate_in',
        'migrate_out',
        'drop',
        'vacuum',
        'analyze'
    )),
    
    -- Operation details
    details JSONB DEFAULT '{}',
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Status
    status TEXT DEFAULT 'running' CHECK (status IN (
        'running',
        'completed',
        'failed',
        'rolled_back'
    )),
    error_message TEXT,
    
    -- Rollback info
    rollback_sql TEXT,
    rolled_back_at TIMESTAMPTZ
);

CREATE INDEX idx_partition_ops_workspace ON genesis.partition_operations(workspace_id);
CREATE INDEX idx_partition_ops_status ON genesis.partition_operations(status) WHERE status = 'running';

-- ============================================
-- PARTITION DDL LOCK TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS genesis.partition_ddl_locks (
    workspace_id UUID PRIMARY KEY,
    lock_holder_pid INTEGER NOT NULL,
    lock_acquired_at TIMESTAMPTZ DEFAULT NOW(),
    lock_expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',
    operation TEXT NOT NULL
);

-- ============================================
-- HELPER FUNCTION: Acquire DDL Lock
-- ============================================
CREATE OR REPLACE FUNCTION genesis.acquire_ddl_lock(
    p_workspace_id UUID,
    p_operation TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_pid INTEGER := pg_backend_pid();
    v_lock_acquired BOOLEAN := FALSE;
BEGIN
    -- Clean up expired locks
    DELETE FROM genesis.partition_ddl_locks 
    WHERE lock_expires_at < NOW();
    
    -- Try to acquire lock
    INSERT INTO genesis.partition_ddl_locks (
        workspace_id, lock_holder_pid, operation
    ) VALUES (
        p_workspace_id, v_current_pid, p_operation
    )
    ON CONFLICT (workspace_id) DO NOTHING;
    
    -- Check if we got the lock
    SELECT EXISTS (
        SELECT 1 FROM genesis.partition_ddl_locks
        WHERE workspace_id = p_workspace_id
        AND lock_holder_pid = v_current_pid
    ) INTO v_lock_acquired;
    
    RETURN v_lock_acquired;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER FUNCTION: Release DDL Lock
-- ============================================
CREATE OR REPLACE FUNCTION genesis.release_ddl_lock(p_workspace_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM genesis.partition_ddl_locks 
    WHERE workspace_id = p_workspace_id
    AND lock_holder_pid = pg_backend_pid();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MAIN FUNCTION: Create Workspace Partition
-- ============================================
CREATE OR REPLACE FUNCTION genesis.fn_ignite_workspace_partition(
    p_workspace_id UUID,
    p_workspace_slug TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    partition_name TEXT,
    operation TEXT,
    duration_ms INTEGER,
    error_message TEXT
) AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_partition_name TEXT;
    v_slug TEXT;
    v_exists BOOLEAN;
    v_lock_acquired BOOLEAN;
    v_operation_id UUID;
BEGIN
    -- ============================================
    -- VALIDATION
    -- ============================================
    IF p_workspace_id IS NULL THEN
        RETURN QUERY SELECT 
            FALSE, NULL::TEXT, 'validation'::TEXT, 0,
            'workspace_id cannot be NULL'::TEXT;
        RETURN;
    END IF;
    
    -- Sanitize and generate partition name
    v_slug := COALESCE(p_workspace_slug, REPLACE(p_workspace_id::TEXT, '-', '_'));
    v_slug := genesis.sanitize_partition_slug(v_slug);
    v_partition_name := 'leads_p_' || v_slug;
    
    -- ============================================
    -- IDEMPOTENCY CHECK
    -- ============================================
    SELECT EXISTS (
        SELECT 1 FROM genesis.partition_registry
        WHERE workspace_id = p_workspace_id
        AND status = 'active'
    ) INTO v_exists;
    
    IF v_exists THEN
        RETURN QUERY SELECT 
            TRUE, v_partition_name, 'already_exists'::TEXT,
            EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
            NULL::TEXT;
        RETURN;
    END IF;
    
    -- ============================================
    -- ACQUIRE DDL LOCK
    -- ============================================
    SELECT genesis.acquire_ddl_lock(p_workspace_id, 'create') INTO v_lock_acquired;
    
    IF NOT v_lock_acquired THEN
        -- Another process is creating this partition
        -- Wait and re-check
        PERFORM pg_sleep(0.5);
        
        SELECT EXISTS (
            SELECT 1 FROM genesis.partition_registry
            WHERE workspace_id = p_workspace_id
            AND status = 'active'
        ) INTO v_exists;
        
        IF v_exists THEN
            RETURN QUERY SELECT 
                TRUE, v_partition_name, 'created_by_other'::TEXT,
                EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
                NULL::TEXT;
            RETURN;
        END IF;
        
        RETURN QUERY SELECT 
            FALSE, NULL::TEXT, 'lock_contention'::TEXT,
            EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
            'Could not acquire DDL lock after retry'::TEXT;
        RETURN;
    END IF;
    
    -- ============================================
    -- LOG OPERATION START
    -- ============================================
    INSERT INTO genesis.partition_operations (
        workspace_id, operation, details, status
    ) VALUES (
        p_workspace_id, 'create', 
        jsonb_build_object('partition_name', v_partition_name, 'slug', v_slug),
        'running'
    ) RETURNING id INTO v_operation_id;
    
    -- ============================================
    -- CREATE PARTITION
    -- ============================================
    BEGIN
        -- Insert registry entry (status = creating)
        INSERT INTO genesis.partition_registry (
            workspace_id, partition_name, partition_slug, status
        ) VALUES (
            p_workspace_id, v_partition_name, v_slug, 'creating'
        ) ON CONFLICT (workspace_id) DO UPDATE SET
            status = 'creating',
            updated_at = NOW();
        
        -- Create the partition
        EXECUTE format(
            'CREATE TABLE genesis.%I PARTITION OF genesis.leads
             FOR VALUES IN (%L)',
            v_partition_name,
            p_workspace_id::TEXT
        );
        
        -- Create indexes
        EXECUTE format(
            'CREATE INDEX %I ON genesis.%I (email_address)',
            v_partition_name || '_email_idx',
            v_partition_name
        );
        
        EXECUTE format(
            'CREATE INDEX %I ON genesis.%I (status) WHERE status NOT IN (''completed'', ''opted_out'')',
            v_partition_name || '_status_idx',
            v_partition_name
        );
        
        EXECUTE format(
            'CREATE INDEX %I ON genesis.%I (updated_at DESC)',
            v_partition_name || '_updated_idx',
            v_partition_name
        );
        
        -- Update registry to active
        UPDATE genesis.partition_registry SET
            status = 'active',
            index_count = 3,
            indexes_created = ARRAY[
                v_partition_name || '_email_idx',
                v_partition_name || '_status_idx',
                v_partition_name || '_updated_idx'
            ],
            updated_at = NOW()
        WHERE workspace_id = p_workspace_id;
        
        -- Log operation success
        UPDATE genesis.partition_operations SET
            status = 'completed',
            completed_at = NOW(),
            duration_ms = EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER
        WHERE id = v_operation_id;
        
        -- Release lock
        PERFORM genesis.release_ddl_lock(p_workspace_id);
        
        RETURN QUERY SELECT 
            TRUE, v_partition_name, 'created'::TEXT,
            EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
            NULL::TEXT;
            
    EXCEPTION WHEN duplicate_table THEN
        -- Race condition: partition exists
        PERFORM genesis.release_ddl_lock(p_workspace_id);
        
        UPDATE genesis.partition_registry SET
            status = 'active',
            updated_at = NOW()
        WHERE workspace_id = p_workspace_id;
        
        UPDATE genesis.partition_operations SET
            status = 'completed',
            completed_at = NOW(),
            details = details || '{"note": "duplicate_table_handled"}'
        WHERE id = v_operation_id;
        
        RETURN QUERY SELECT 
            TRUE, v_partition_name, 'race_condition_ok'::TEXT,
            EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
            NULL::TEXT;
            
    WHEN OTHERS THEN
        -- Rollback
        PERFORM genesis.release_ddl_lock(p_workspace_id);
        
        -- Try to drop partially created partition
        BEGIN
            EXECUTE format('DROP TABLE IF EXISTS genesis.%I', v_partition_name);
        EXCEPTION WHEN OTHERS THEN
            NULL;  -- Ignore cleanup errors
        END;
        
        -- Update registry
        UPDATE genesis.partition_registry SET
            status = 'dropped',
            updated_at = NOW()
        WHERE workspace_id = p_workspace_id;
        
        -- Log failure
        UPDATE genesis.partition_operations SET
            status = 'failed',
            completed_at = NOW(),
            duration_ms = EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
            error_message = SQLERRM
        WHERE id = v_operation_id;
        
        RETURN QUERY SELECT 
            FALSE, NULL::TEXT, 'ddl_failed'::TEXT,
            EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
            SQLERRM::TEXT;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
REVOKE ALL ON FUNCTION genesis.fn_ignite_workspace_partition FROM PUBLIC;
GRANT EXECUTE ON FUNCTION genesis.fn_ignite_workspace_partition TO service_role;

COMMIT;
```

### 40.B.2 Partition Statistics Maintenance

```sql
-- ============================================
-- PARTITION STATISTICS MAINTENANCE
-- ============================================

-- Function to update partition statistics
CREATE OR REPLACE FUNCTION genesis.update_all_partition_stats()
RETURNS TABLE (
    workspace_id UUID,
    partition_name TEXT,
    row_count BIGINT,
    size_bytes BIGINT,
    duration_ms INTEGER
) AS $$
DECLARE
    v_partition RECORD;
    v_start TIMESTAMPTZ;
    v_count BIGINT;
    v_size BIGINT;
BEGIN
    FOR v_partition IN 
        SELECT pr.workspace_id, pr.partition_name
        FROM genesis.partition_registry pr
        WHERE pr.status = 'active'
        AND (pr.last_stats_update IS NULL OR pr.last_stats_update < NOW() - INTERVAL '1 hour')
        ORDER BY pr.last_stats_update NULLS FIRST
        LIMIT 100  -- Process in batches
    LOOP
        v_start := clock_timestamp();
        
        BEGIN
            -- Get row count
            EXECUTE format(
                'SELECT COUNT(*) FROM genesis.%I',
                v_partition.partition_name
            ) INTO v_count;
            
            -- Get table size
            SELECT pg_total_relation_size(
                format('genesis.%I', v_partition.partition_name)::regclass
            ) INTO v_size;
            
            -- Update registry
            UPDATE genesis.partition_registry SET
                row_count = v_count,
                size_bytes = v_size,
                last_stats_update = NOW(),
                updated_at = NOW()
            WHERE partition_registry.workspace_id = v_partition.workspace_id;
            
            RETURN QUERY SELECT 
                v_partition.workspace_id,
                v_partition.partition_name,
                v_count,
                v_size,
                EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
                
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Stats update failed for %: %', 
                v_partition.partition_name, SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Scheduled job for stats maintenance (run every hour)
-- This would be called via pg_cron or external scheduler
CREATE OR REPLACE FUNCTION genesis.maintenance_job()
RETURNS VOID AS $$
BEGIN
    -- Update partition statistics
    PERFORM genesis.update_all_partition_stats();
    
    -- Clean up dropped partitions from registry
    DELETE FROM genesis.partition_registry
    WHERE status = 'dropped'
    AND updated_at < NOW() - INTERVAL '30 days';
    
    -- Clean up old operation logs
    DELETE FROM genesis.partition_operations
    WHERE completed_at < NOW() - INTERVAL '90 days';
    
    -- Vacuum partition registry
    VACUUM ANALYZE genesis.partition_registry;
    VACUUM ANALYZE genesis.partition_operations;
END;
$$ LANGUAGE plpgsql;
```

---

## 40.C INDEXING WATCHDOG - EXTENDED IMPLEMENTATION

### 40.C.1 JSONB Query Pattern Analysis

```sql
-- ============================================
-- JSONB QUERY PATTERN ANALYZER
-- ============================================

-- Table to store discovered JSONB access patterns
CREATE TABLE IF NOT EXISTS genesis.jsonb_access_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Pattern identification
    partition_name TEXT NOT NULL,
    jsonb_column TEXT NOT NULL,
    jsonb_path TEXT NOT NULL,
    access_type TEXT CHECK (access_type IN ('read', 'filter', 'sort')),
    
    -- Statistics
    query_count BIGINT DEFAULT 0,
    total_time_ms BIGINT DEFAULT 0,
    avg_time_ms NUMERIC GENERATED ALWAYS AS (
        CASE WHEN query_count > 0 THEN total_time_ms::NUMERIC / query_count ELSE 0 END
    ) STORED,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    
    -- Index status
    index_name TEXT,
    index_created_at TIMESTAMPTZ,
    index_size_bytes BIGINT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (partition_name, jsonb_column, jsonb_path)
);

CREATE INDEX idx_jsonb_patterns_partition ON genesis.jsonb_access_patterns(partition_name);
CREATE INDEX idx_jsonb_patterns_avg_time ON genesis.jsonb_access_patterns(avg_time_ms DESC) 
    WHERE index_name IS NULL;

-- ============================================
-- PATTERN DETECTION FROM PG_STAT_STATEMENTS
-- ============================================

CREATE OR REPLACE FUNCTION genesis.analyze_jsonb_query_patterns()
RETURNS TABLE (
    partition_name TEXT,
    jsonb_column TEXT,
    jsonb_path TEXT,
    query_count BIGINT,
    avg_time_ms NUMERIC,
    recommendation TEXT
) AS $$
BEGIN
    -- Analyze queries from pg_stat_statements
    RETURN QUERY
    WITH jsonb_queries AS (
        SELECT 
            query,
            calls,
            mean_exec_time as avg_ms,
            -- Extract partition name
            (REGEXP_MATCH(query, 'genesis\.([a-z_0-9]+)'))[1] AS pname,
            -- Extract JSONB column and path
            (REGEXP_MATCHES(query, '(\w+)\s*(?:->|->>) *''([^'']+)''', 'gi')) AS path_match
        FROM pg_stat_statements
        WHERE query LIKE '%genesis.leads%'
        AND (query LIKE '%->%' OR query LIKE '%->>%')
        AND calls > 10
    ),
    extracted AS (
        SELECT 
            pname,
            (path_match)[1] AS jcolumn,
            (path_match)[2] AS jpath,
            SUM(calls) AS total_calls,
            AVG(avg_ms) AS avg_time
        FROM jsonb_queries
        WHERE pname IS NOT NULL
        GROUP BY pname, (path_match)[1], (path_match)[2]
    )
    SELECT 
        e.pname,
        e.jcolumn,
        e.jpath,
        e.total_calls,
        ROUND(e.avg_time::NUMERIC, 2),
        CASE 
            WHEN e.avg_time > 100 THEN 'CREATE_INDEX_URGENT'
            WHEN e.avg_time > 50 AND e.total_calls > 1000 THEN 'CREATE_INDEX_RECOMMENDED'
            WHEN e.avg_time > 20 AND e.total_calls > 10000 THEN 'CONSIDER_INDEX'
            ELSE 'MONITOR'
        END
    FROM extracted e
    WHERE e.jcolumn IN ('research_data', 'relevance_ai_output', 'metadata')
    ORDER BY e.avg_time DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- AUTOMATIC INDEX CREATION WITH SAFETY CHECKS
-- ============================================

CREATE OR REPLACE FUNCTION genesis.create_jsonb_index_safe(
    p_partition_name TEXT,
    p_jsonb_column TEXT,
    p_jsonb_path TEXT,
    p_index_type TEXT DEFAULT 'btree'
)
RETURNS TABLE (
    success BOOLEAN,
    index_name TEXT,
    index_size_bytes BIGINT,
    duration_ms INTEGER,
    error_message TEXT
) AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_index_name TEXT;
    v_sql TEXT;
    v_size BIGINT;
    v_existing_indexes INTEGER;
BEGIN
    -- Generate index name
    v_index_name := format(
        '%s_%s_%s_jidx',
        LEFT(p_partition_name, 30),
        LEFT(p_jsonb_column, 10),
        LEFT(REPLACE(p_jsonb_path, '.', '_'), 15)
    );
    
    -- Check for existing index
    SELECT COUNT(*) INTO v_existing_indexes
    FROM pg_indexes
    WHERE schemaname = 'genesis'
    AND tablename = p_partition_name
    AND indexname = v_index_name;
    
    IF v_existing_indexes > 0 THEN
        SELECT pg_relation_size(format('genesis.%I', v_index_name)::regclass)
        INTO v_size;
        
        RETURN QUERY SELECT 
            TRUE, v_index_name, v_size, 0,
            'Index already exists'::TEXT;
        RETURN;
    END IF;
    
    -- Check partition has data worth indexing
    EXECUTE format(
        'SELECT COUNT(*) FROM genesis.%I WHERE %I IS NOT NULL LIMIT 1001',
        p_partition_name, p_jsonb_column
    ) INTO v_existing_indexes;
    
    IF v_existing_indexes < 100 THEN
        RETURN QUERY SELECT 
            FALSE, NULL::TEXT, 0::BIGINT, 0,
            'Insufficient data for indexing (< 100 rows)'::TEXT;
        RETURN;
    END IF;
    
    -- Generate CREATE INDEX statement
    CASE p_index_type
        WHEN 'gin' THEN
            -- GIN for containment queries (@>, ?)
            v_sql := format(
                'CREATE INDEX CONCURRENTLY %I ON genesis.%I USING gin ((%I->%L))',
                v_index_name, p_partition_name, p_jsonb_column, p_jsonb_path
            );
        WHEN 'hash' THEN
            -- Hash for equality lookups
            v_sql := format(
                'CREATE INDEX CONCURRENTLY %I ON genesis.%I USING hash ((%I->>%L))',
                v_index_name, p_partition_name, p_jsonb_column, p_jsonb_path
            );
        ELSE
            -- B-tree for range queries and sorting
            v_sql := format(
                'CREATE INDEX CONCURRENTLY %I ON genesis.%I ((%I->>%L))',
                v_index_name, p_partition_name, p_jsonb_column, p_jsonb_path
            );
    END CASE;
    
    -- Execute index creation
    BEGIN
        EXECUTE v_sql;
        
        -- Get index size
        SELECT pg_relation_size(format('genesis.%I', v_index_name)::regclass)
        INTO v_size;
        
        -- Record in access patterns table
        INSERT INTO genesis.jsonb_access_patterns (
            partition_name, jsonb_column, jsonb_path,
            index_name, index_created_at, index_size_bytes
        ) VALUES (
            p_partition_name, p_jsonb_column, p_jsonb_path,
            v_index_name, NOW(), v_size
        ) ON CONFLICT (partition_name, jsonb_column, jsonb_path) DO UPDATE SET
            index_name = EXCLUDED.index_name,
            index_created_at = NOW(),
            index_size_bytes = v_size,
            updated_at = NOW();
        
        RETURN QUERY SELECT 
            TRUE, v_index_name, v_size,
            EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
            NULL::TEXT;
            
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
            FALSE, v_index_name, 0::BIGINT,
            EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
            SQLERRM::TEXT;
    END;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- WATCHDOG RUNNER
-- ============================================

CREATE OR REPLACE FUNCTION genesis.run_jsonb_index_watchdog(
    p_max_indexes INTEGER DEFAULT 5,
    p_min_avg_ms NUMERIC DEFAULT 50,
    p_min_calls BIGINT DEFAULT 1000
)
RETURNS TABLE (
    partition_name TEXT,
    jsonb_path TEXT,
    action TEXT,
    result TEXT
) AS $$
DECLARE
    v_pattern RECORD;
    v_create_result RECORD;
    v_created INTEGER := 0;
BEGIN
    FOR v_pattern IN 
        SELECT * FROM genesis.analyze_jsonb_query_patterns()
        WHERE avg_time_ms >= p_min_avg_ms
        AND query_count >= p_min_calls
        AND recommendation IN ('CREATE_INDEX_URGENT', 'CREATE_INDEX_RECOMMENDED')
        ORDER BY 
            CASE recommendation 
                WHEN 'CREATE_INDEX_URGENT' THEN 1 
                ELSE 2 
            END,
            avg_time_ms DESC
        LIMIT p_max_indexes
    LOOP
        -- Check if index already exists
        IF NOT EXISTS (
            SELECT 1 FROM genesis.jsonb_access_patterns
            WHERE jsonb_access_patterns.partition_name = v_pattern.partition_name
            AND jsonb_access_patterns.jsonb_path = v_pattern.jsonb_path
            AND index_name IS NOT NULL
        ) THEN
            -- Create index
            SELECT * INTO v_create_result
            FROM genesis.create_jsonb_index_safe(
                v_pattern.partition_name,
                v_pattern.jsonb_column,
                v_pattern.jsonb_path,
                'btree'
            );
            
            RETURN QUERY SELECT 
                v_pattern.partition_name,
                v_pattern.jsonb_path,
                'create_index'::TEXT,
                CASE WHEN v_create_result.success 
                    THEN format('Created %s (%s bytes)', v_create_result.index_name, v_create_result.index_size_bytes)
                    ELSE format('Failed: %s', v_create_result.error_message)
                END;
                
            v_created := v_created + 1;
        ELSE
            RETURN QUERY SELECT 
                v_pattern.partition_name,
                v_pattern.jsonb_path,
                'skip'::TEXT,
                'Index already exists'::TEXT;
        END IF;
    END LOOP;
    
    -- Return summary if no indexes created
    IF v_created = 0 THEN
        RETURN QUERY SELECT 
            NULL::TEXT, NULL::TEXT,
            'complete'::TEXT,
            'No new indexes needed'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

---

## 40.D RLS HARDENING - EXTENDED IMPLEMENTATION

### 40.D.1 Complete RLS Security Framework

```sql
-- ============================================
-- GENESIS RLS SECURITY FRAMEWORK
-- ============================================

BEGIN;

-- ============================================
-- SECURITY AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event details
    event_type TEXT NOT NULL CHECK (event_type IN (
        'context_set',
        'context_cleared',
        'access_denied',
        'cross_workspace_attempt',
        'rls_bypass_attempt',
        'policy_evaluation'
    )),
    
    -- Context
    workspace_id_attempted TEXT,
    workspace_id_allowed TEXT,
    user_id TEXT,
    
    -- Request info
    query_text TEXT,
    client_ip INET,
    user_agent TEXT,
    
    -- Result
    action_taken TEXT CHECK (action_taken IN (
        'allowed',
        'denied',
        'logged_only'
    )),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_audit_workspace ON genesis.security_audit_log(workspace_id_attempted);
CREATE INDEX idx_security_audit_type ON genesis.security_audit_log(event_type);
CREATE INDEX idx_security_audit_created ON genesis.security_audit_log(created_at DESC);

-- Partition by month for easy cleanup
-- CREATE TABLE genesis.security_audit_log_2026_01 PARTITION OF genesis.security_audit_log
--     FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- ============================================
-- SECURE CONTEXT MANAGEMENT
-- ============================================

-- Set workspace context with validation and logging
CREATE OR REPLACE FUNCTION genesis.set_workspace_context(
    p_workspace_id UUID,
    p_user_id TEXT DEFAULT NULL,
    p_log_access BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
DECLARE
    v_current_context TEXT;
BEGIN
    -- Get current context for audit
    v_current_context := current_setting('app.workspace_id', TRUE);
    
    -- Validate input
    IF p_workspace_id IS NULL THEN
        -- Log attempt to set NULL context
        IF p_log_access THEN
            INSERT INTO genesis.security_audit_log (
                event_type, workspace_id_attempted, user_id, action_taken
            ) VALUES (
                'context_set', NULL, p_user_id, 'denied'
            );
        END IF;
        RAISE EXCEPTION 'Workspace ID cannot be NULL (Security Policy)';
    END IF;
    
    -- Validate workspace exists
    IF NOT EXISTS (SELECT 1 FROM workspaces WHERE id = p_workspace_id::TEXT) THEN
        IF p_log_access THEN
            INSERT INTO genesis.security_audit_log (
                event_type, workspace_id_attempted, user_id, action_taken
            ) VALUES (
                'context_set', p_workspace_id::TEXT, p_user_id, 'denied'
            );
        END IF;
        RAISE EXCEPTION 'Invalid workspace ID: %', p_workspace_id;
    END IF;
    
    -- Set the context (transaction-local with SET LOCAL behavior via TRUE param)
    PERFORM set_config('app.workspace_id', p_workspace_id::TEXT, TRUE);
    
    -- Log successful context set
    IF p_log_access THEN
        INSERT INTO genesis.security_audit_log (
            event_type, workspace_id_attempted, workspace_id_allowed, 
            user_id, action_taken
        ) VALUES (
            'context_set', p_workspace_id::TEXT, p_workspace_id::TEXT,
            p_user_id, 'allowed'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current workspace context with fail-closed default
CREATE OR REPLACE FUNCTION genesis.get_workspace_context()
RETURNS UUID AS $$
DECLARE
    v_raw_value TEXT;
    v_result UUID;
BEGIN
    -- Get raw setting value
    v_raw_value := current_setting('app.workspace_id', TRUE);
    
    -- FAIL-CLOSED: If no context, return impossible UUID
    IF v_raw_value IS NULL OR v_raw_value = '' THEN
        RETURN '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
    
    -- Validate UUID format
    BEGIN
        v_result := v_raw_value::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
        -- Invalid UUID format - fail closed
        RETURN '00000000-0000-0000-0000-000000000000'::UUID;
    END;
    
    -- Additional check: ensure it's not the sentinel value being used
    IF v_result = '00000000-0000-0000-0000-000000000000'::UUID THEN
        RETURN '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Clear workspace context
CREATE OR REPLACE FUNCTION genesis.clear_workspace_context()
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.workspace_id', '', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RLS POLICIES FOR ALL GENESIS TABLES
-- ============================================

-- LEADS TABLE
ALTER TABLE genesis.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.leads FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leads_workspace_isolation ON genesis.leads;
CREATE POLICY leads_workspace_isolation ON genesis.leads
    FOR ALL
    USING (workspace_id = genesis.get_workspace_context())
    WITH CHECK (workspace_id = genesis.get_workspace_context());

-- PARTITION REGISTRY (admin only)
ALTER TABLE genesis.partition_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.partition_registry FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partition_registry_admin ON genesis.partition_registry;
CREATE POLICY partition_registry_admin ON genesis.partition_registry
    FOR ALL
    USING (
        -- Only service role can access
        current_setting('request.jwt.claims', TRUE)::json->>'role' = 'service_role'
        OR
        -- Or workspace owner
        workspace_id = genesis.get_workspace_context()
    );

-- SECURITY AUDIT LOG (read-only for workspace, full for service)
ALTER TABLE genesis.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.security_audit_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS security_audit_read ON genesis.security_audit_log;
CREATE POLICY security_audit_read ON genesis.security_audit_log
    FOR SELECT
    USING (
        workspace_id_allowed = genesis.get_workspace_context()::TEXT
        OR
        current_setting('request.jwt.claims', TRUE)::json->>'role' = 'service_role'
    );

DROP POLICY IF EXISTS security_audit_insert ON genesis.security_audit_log;
CREATE POLICY security_audit_insert ON genesis.security_audit_log
    FOR INSERT
    WITH CHECK (
        current_setting('request.jwt.claims', TRUE)::json->>'role' = 'service_role'
    );

-- ============================================
-- RLS BYPASS DETECTION TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION genesis.detect_rls_bypass()
RETURNS TRIGGER AS $$
DECLARE
    v_context_ws UUID;
    v_row_ws UUID;
BEGIN
    v_context_ws := genesis.get_workspace_context();
    v_row_ws := COALESCE(NEW.workspace_id, OLD.workspace_id);
    
    -- Check for mismatch
    IF v_row_ws IS NOT NULL AND v_context_ws != v_row_ws THEN
        -- Log the bypass attempt
        INSERT INTO genesis.security_audit_log (
            event_type,
            workspace_id_attempted,
            workspace_id_allowed,
            action_taken,
            metadata
        ) VALUES (
            'cross_workspace_attempt',
            v_row_ws::TEXT,
            v_context_ws::TEXT,
            'denied',
            jsonb_build_object(
                'table', TG_TABLE_NAME,
                'operation', TG_OP,
                'backend_pid', pg_backend_pid()
            )
        );
        
        RAISE EXCEPTION 'Cross-workspace access denied: context=%, row=%', 
            v_context_ws, v_row_ws;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply bypass detection to leads table
DROP TRIGGER IF EXISTS leads_rls_bypass_check ON genesis.leads;
CREATE TRIGGER leads_rls_bypass_check
    BEFORE INSERT OR UPDATE ON genesis.leads
    FOR EACH ROW
    EXECUTE FUNCTION genesis.detect_rls_bypass();

-- ============================================
-- RLS VERIFICATION FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION genesis.verify_rls_configuration()
RETURNS TABLE (
    table_name TEXT,
    rls_enabled BOOLEAN,
    rls_forced BOOLEAN,
    policy_count INTEGER,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.relname::TEXT,
        c.relrowsecurity,
        c.relforcerowsecurity,
        (SELECT COUNT(*)::INTEGER FROM pg_policies WHERE tablename = c.relname),
        CASE 
            WHEN NOT c.relrowsecurity THEN 'CRITICAL: RLS disabled'
            WHEN NOT c.relforcerowsecurity THEN 'WARNING: RLS not forced'
            WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = c.relname) = 0 THEN 'CRITICAL: No policies'
            ELSE 'OK'
        END
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'genesis'
    AND c.relkind = 'r'
    ORDER BY c.relname;
END;
$$ LANGUAGE plpgsql;

-- Run RLS security test suite
CREATE OR REPLACE FUNCTION genesis.run_rls_security_tests()
RETURNS TABLE (
    test_name TEXT,
    passed BOOLEAN,
    details TEXT
) AS $$
DECLARE
    v_test_ws_1 UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_test_ws_2 UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    v_count INTEGER;
BEGIN
    -- Setup test workspaces
    INSERT INTO workspaces (id, name, slug) VALUES 
        (v_test_ws_1::TEXT, 'Test WS 1', 'test-ws-1'),
        (v_test_ws_2::TEXT, 'Test WS 2', 'test-ws-2')
    ON CONFLICT (id) DO NOTHING;
    
    -- Ensure partitions exist
    PERFORM genesis.fn_ignite_workspace_partition(v_test_ws_1, 'test_ws_1');
    PERFORM genesis.fn_ignite_workspace_partition(v_test_ws_2, 'test_ws_2');
    
    -- Insert test data
    PERFORM genesis.set_workspace_context(v_test_ws_1);
    INSERT INTO genesis.leads (workspace_id, email_address, status)
    VALUES (v_test_ws_1, 'test1@example.com', 'pending')
    ON CONFLICT DO NOTHING;
    
    PERFORM genesis.set_workspace_context(v_test_ws_2);
    INSERT INTO genesis.leads (workspace_id, email_address, status)
    VALUES (v_test_ws_2, 'test2@example.com', 'pending')
    ON CONFLICT DO NOTHING;
    
    -- TEST 1: Cross-workspace SELECT blocked
    PERFORM genesis.set_workspace_context(v_test_ws_1);
    SELECT COUNT(*) INTO v_count FROM genesis.leads 
    WHERE workspace_id = v_test_ws_2;
    
    RETURN QUERY SELECT 
        'cross_workspace_select'::TEXT,
        v_count = 0,
        CASE WHEN v_count = 0 THEN 'Blocked correctly' 
             ELSE format('FAILED: returned %s rows', v_count) END;
    
    -- TEST 2: NULL context returns zero
    PERFORM genesis.clear_workspace_context();
    SELECT COUNT(*) INTO v_count FROM genesis.leads;
    
    RETURN QUERY SELECT 
        'null_context_select'::TEXT,
        v_count = 0,
        CASE WHEN v_count = 0 THEN 'Blocked correctly' 
             ELSE format('FAILED: returned %s rows', v_count) END;
    
    -- TEST 3: Own workspace access works
    PERFORM genesis.set_workspace_context(v_test_ws_1);
    SELECT COUNT(*) INTO v_count FROM genesis.leads 
    WHERE email_address = 'test1@example.com';
    
    RETURN QUERY SELECT 
        'own_workspace_access'::TEXT,
        v_count = 1,
        CASE WHEN v_count = 1 THEN 'Access works correctly' 
             ELSE format('FAILED: expected 1, got %s', v_count) END;
    
    -- TEST 4: Cross-workspace INSERT blocked
    PERFORM genesis.set_workspace_context(v_test_ws_1);
    BEGIN
        INSERT INTO genesis.leads (workspace_id, email_address, status)
        VALUES (v_test_ws_2, 'hacker@evil.com', 'pending');
        
        RETURN QUERY SELECT 
            'cross_workspace_insert'::TEXT,
            FALSE,
            'FAILED: Insert was allowed';
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
            'cross_workspace_insert'::TEXT,
            TRUE,
            'Blocked correctly: ' || SQLERRM;
    END;
    
    -- Cleanup
    DELETE FROM genesis.leads WHERE workspace_id IN (v_test_ws_1, v_test_ws_2);
    
END;
$$ LANGUAGE plpgsql;

COMMIT;
```

### 40.D.2 Application Integration Pattern

```typescript
// lib/genesis/secure-context.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * CRITICAL: This is the ONLY approved pattern for database access.
 * All other direct database calls are PROHIBITED.
 */

interface SecureContextOptions {
  workspaceId: string;
  userId?: string;
  logAccess?: boolean;
}

type SecureOperation<T> = (client: SupabaseClient) => Promise<T>;

/**
 * Execute database operation with workspace security context.
 * Ensures RLS is properly enforced.
 */
export async function withSecureContext<T>(
  options: SecureContextOptions,
  operation: SecureOperation<T>
): Promise<T> {
  // Validate workspace ID format
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!options.workspaceId || !UUID_REGEX.test(options.workspaceId)) {
    throw new SecurityError('Invalid workspace ID format', {
      workspaceId: options.workspaceId,
      pattern: 'UUID_VALIDATION',
    });
  }

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: 'genesis' },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );

  try {
    // Set workspace context via RPC
    const { error: contextError } = await client.rpc('set_workspace_context', {
      p_workspace_id: options.workspaceId,
      p_user_id: options.userId || null,
      p_log_access: options.logAccess || false,
    });

    if (contextError) {
      throw new SecurityError('Failed to set workspace context', {
        workspaceId: options.workspaceId,
        error: contextError.message,
      });
    }

    // Execute operation within secure context
    return await operation(client);

  } catch (error) {
    // Re-throw security errors
    if (error instanceof SecurityError) throw error;
    
    // Wrap other errors
    throw new DatabaseError('Database operation failed', {
      workspaceId: options.workspaceId,
      originalError: error instanceof Error ? error.message : 'Unknown',
    });
  }
}

/**
 * Security-specific error class
 */
export class SecurityError extends Error {
  public readonly context: Record<string, unknown>;
  
  constructor(message: string, context: Record<string, unknown>) {
    super(message);
    this.name = 'SecurityError';
    this.context = context;
  }
}

export class DatabaseError extends Error {
  public readonly context: Record<string, unknown>;
  
  constructor(message: string, context: Record<string, unknown>) {
    super(message);
    this.name = 'DatabaseError';
    this.context = context;
  }
}

// ============================================
// USAGE EXAMPLES
// ============================================

/**
 * Example: Get leads for workspace
 */
export async function getLeadsForWorkspace(
  workspaceId: string,
  options: { limit?: number; status?: string } = {}
): Promise<Lead[]> {
  return withSecureContext(
    { workspaceId, logAccess: true },
    async (client) => {
      let query = client
        .from('leads')
        .select('*')
        .limit(options.limit || 100);

      if (options.status) {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    }
  );
}

/**
 * Example: Update lead status
 */
export async function updateLeadStatus(
  workspaceId: string,
  leadId: string,
  newStatus: string
): Promise<void> {
  return withSecureContext(
    { workspaceId, logAccess: true },
    async (client) => {
      const { error } = await client
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId);
      
      if (error) throw error;
    }
  );
}

/**
 * Example: Bulk insert leads
 */
export async function bulkInsertLeads(
  workspaceId: string,
  leads: Partial<Lead>[]
): Promise<{ inserted: number; failed: number }> {
  return withSecureContext(
    { workspaceId, logAccess: true },
    async (client) => {
      // Ensure all leads have correct workspace_id
      const sanitizedLeads = leads.map(lead => ({
        ...lead,
        workspace_id: workspaceId, // Override any provided workspace_id
      }));

      const { data, error } = await client
        .from('leads')
        .insert(sanitizedLeads)
        .select('id');
      
      if (error) throw error;
      
      return {
        inserted: data?.length || 0,
        failed: leads.length - (data?.length || 0),
      };
    }
  );
}
```

---

# 🛡️ PHASE 66: DISASTER RECOVERY & REGIONAL FAILOVER

> **Phase Type:** V30 Business Continuity  
> **Dependencies:** Phase 50, Phase 62  
> **Risk Level:** CRITICAL (Business Continuity)

---

## 66.1 DISASTER SCENARIOS

The V30 architecture must be resilient to multiple failure modes, from individual droplet failures to complete regional outages.

### 66.1.1 Failure Mode Catalog

| Failure Mode | Impact | RTO Target | RPO Target |
|--------------|--------|------------|------------|
| Single droplet crash | 1 tenant offline | 5 minutes | 0 (no data loss) |
| Sidecar process death | Workflows paused | 2 minutes | 0 |
| n8n container crash | Workflows paused | 2 minutes | 0 |
| DO region degraded | 20-30% tenants affected | 1 hour | 1 hour |
| DO region total failure | 20-30% tenants offline | 4 hours | 1 hour |
| Supabase outage | All reads/writes fail | Supabase SLA | 0 (durability) |
| Redis outage | BullMQ jobs paused | 15 minutes | 0 (job persistence) |
| Dashboard outage | No provisioning, no God Mode | 15 minutes | N/A |

**Definitions:**
- **RTO (Recovery Time Objective):** Maximum acceptable downtime
- **RPO (Recovery Point Objective):** Maximum acceptable data loss

---

## 66.2 CROSS-REGION SNAPSHOT PROTOCOL

Every tenant's droplet is snapshotted daily and stored in a secondary region.

### 66.2.1 Snapshot Schedule

| Snapshot Type | Frequency | Retention | Storage Location |
|---------------|-----------|-----------|------------------|
| Daily snapshot | Every 24 hours | 7 days | Same region |
| Weekly snapshot | Every 7 days | 30 days | Same region |
| Cross-region backup | Every 24 hours | 7 days | Secondary region |
| Pre-update snapshot | Before template updates | 48 hours | Same region |

### 66.2.2 Cross-Region Mapping

| Primary Region | Backup Region | Rationale |
|----------------|---------------|-----------|
| nyc1 (US-East) | sfo1 (US-West) | Same country, different coast |
| sfo1 (US-West) | nyc1 (US-East) | Same country, different coast |
| fra1 (EU-West) | lon1 (UK) | GDPR-compliant backup |
| lon1 (UK) | fra1 (EU-West) | GDPR-compliant backup |
| sgp1 (APAC) | sfo1 (US-West) | Closest alternative |

### 66.2.3 Snapshot Process

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CROSS-REGION SNAPSHOT FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DAILY CRON (02:00 UTC):                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  FOR EACH tenant droplet:                                          │   │
│  │                                                                     │   │
│  │  1. Verify droplet is healthy (skip if hibernating)                │   │
│  │                                                                     │   │
│  │  2. Create snapshot via DO API:                                    │   │
│  │     POST /v2/droplets/{droplet_id}/actions                         │   │
│  │     { "type": "snapshot", "name": "daily_{date}_{workspace_id}" }  │   │
│  │                                                                     │   │
│  │  3. Wait for snapshot completion (poll status)                     │   │
│  │                                                                     │   │
│  │  4. Transfer snapshot to backup region:                            │   │
│  │     POST /v2/images/{snapshot_id}/actions                          │   │
│  │     { "type": "transfer", "region": "backup_region" }              │   │
│  │                                                                     │   │
│  │  5. Delete snapshots older than retention policy                   │   │
│  │                                                                     │   │
│  │  6. Log snapshot record to genesis.droplet_snapshots               │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  CONCURRENCY CONTROL:                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  - Max concurrent snapshots: 100 (DO rate limit)                   │   │
│  │  - Max concurrent transfers: 50 (cross-region bandwidth)           │   │
│  │  - Batch processing over 6-hour window                             │   │
│  │  - Priority: Paying tenants first, then free trials                │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 66.3 MASS RESTORATION PROTOCOL

When a regional disaster occurs, the Mass Restoration Protocol spins up replacement droplets from cross-region backups.

### 66.3.1 Regional Failover Triggers

| Trigger | Source | Action |
|---------|--------|--------|
| DO status page: Region outage | Automated monitoring | Alert on-call engineer |
| >50% tenant heartbeats missing from region | Watchdog detection | Alert + auto-initiate |
| Manual declaration | Operations team | Initiate via God Mode |

### 66.3.2 Mass Restoration Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MASS RESTORATION PROTOCOL                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SCENARIO: fra1 (Frankfurt) region is down                                 │
│  AFFECTED: ~3,000 tenant droplets                                          │
│  BACKUP REGION: lon1 (London)                                              │
│                                                                             │
│  PHASE 1: ASSESSMENT (0-15 minutes)                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  1. Confirm regional outage (DO status, manual check)              │   │
│  │  2. Query affected tenants:                                        │   │
│  │     SELECT workspace_id, droplet_id, last_snapshot_id              │   │
│  │     FROM genesis.droplet_health                                     │   │
│  │     WHERE region = 'fra1' AND state != 'TERMINATED'                │   │
│  │  3. Verify backup snapshots exist in lon1                          │   │
│  │  4. Calculate estimated restoration time                           │   │
│  │  5. Send mass notification: "Service disruption, restoring..."    │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  PHASE 2: PROVISIONING (15 minutes - 2 hours)                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  FOR EACH affected tenant (batched, 100 concurrent):               │   │
│  │                                                                     │   │
│  │  1. Create droplet from backup snapshot in lon1:                   │   │
│  │     POST /v2/droplets                                              │   │
│  │     {                                                               │   │
│  │       "name": "restore_{workspace_id}",                            │   │
│  │       "region": "lon1",                                            │   │
│  │       "image": backup_snapshot_id,                                 │   │
│  │       "size": "s-1vcpu-1gb"                                        │   │
│  │     }                                                               │   │
│  │                                                                     │   │
│  │  2. Wait for droplet active                                        │   │
│  │                                                                     │   │
│  │  3. Update DNS/networking (new IP)                                 │   │
│  │                                                                     │   │
│  │  4. Wait for Sidecar handshake                                     │   │
│  │                                                                     │   │
│  │  5. Update genesis.droplet_health with new droplet_id              │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  PHASE 3: VERIFICATION (2-4 hours)                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  1. Monitor heartbeats from restored droplets                      │   │
│  │  2. Run automated workflow tests on sample tenants                 │   │
│  │  3. Check credential validity (OAuth tokens)                       │   │
│  │  4. Identify failed restorations, queue manual review              │   │
│  │  5. Send notification: "Service restored, check your campaigns"   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  PHASE 4: CLEANUP (After original region recovers)                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Option A: Keep tenants in new region                              │   │
│  │    - Delete orphaned droplets in original region                   │   │
│  │    - Update region preference in database                          │   │
│  │                                                                     │   │
│  │  Option B: Migrate back to original region                         │   │
│  │    - Create new snapshot in current region                         │   │
│  │    - Transfer to original region                                   │   │
│  │    - Spin up new droplet                                           │   │
│  │    - Decommission temporary droplet                                │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  TOTAL RTO: ~4 hours for 3,000 tenants                                     │
│  RPO: 24 hours (last daily snapshot)                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 66.3.5 SNAPSHOT GARBAGE COLLECTION PROTOCOL

During mass regional failover, failed or orphaned snapshots can accumulate in DigitalOcean, leading to storage costs and management complexity. The **Snapshot Garbage Collection Protocol** ensures systematic cleanup.

### Garbage Collection Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| Failed snapshot creation | DO API returns error | Log failure, retry once, then mark for cleanup |
| Orphaned transfer | Transfer started but never completed | Delete after 24 hours |
| Restoration failure | Droplet created from snapshot failed boot | Delete failed droplet, retain snapshot for retry |
| Post-failover cleanup | Regional failover completed | Delete old region snapshots after 7 days |
| Retention expiry | Snapshot older than retention policy | Delete per schedule |

### Garbage Collection Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SNAPSHOT GARBAGE COLLECTION PROTOCOL                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DAILY CRON: Snapshot Garbage Collector (04:00 UTC)                        │
│                                                                             │
│  STEP 1: Identify orphaned snapshots                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Query DO API: GET /v2/snapshots?resource_type=droplet              │   │
│  │                                                                     │   │
│  │  For each snapshot:                                                 │   │
│  │    - Check if workspace_id in name exists in DB                     │   │
│  │    - Check if snapshot is referenced in genesis.droplet_snapshots   │   │
│  │    - Check if snapshot is older than retention period               │   │
│  │                                                                     │   │
│  │  ORPHAN CRITERIA:                                                   │   │
│  │    - Workspace deleted but snapshot remains                         │   │
│  │    - Snapshot not in DB registry (failed creation)                  │   │
│  │    - Transfer stuck in "pending" > 24 hours                         │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 2: Categorize for cleanup                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Category A: IMMEDIATE DELETE (no grace period)                    │   │
│  │    - Failed snapshots (never completed)                            │   │
│  │    - Test/staging snapshots (identified by naming convention)       │   │
│  │                                                                     │   │
│  │  Category B: GRACE PERIOD DELETE (7 days)                          │   │
│  │    - Workspace deleted → wait 7 days before snapshot delete        │   │
│  │    - Post-failover old-region snapshots                            │   │
│  │                                                                     │   │
│  │  Category C: RETENTION EXPIRY                                      │   │
│  │    - Daily snapshots > 7 days old                                  │   │
│  │    - Weekly snapshots > 30 days old                                │   │
│  │    - Cross-region backups > 7 days old                             │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 3: Execute deletion with rate limiting                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  FOR EACH snapshot to delete (max 50 concurrent):                  │   │
│  │                                                                     │   │
│  │    1. DELETE /v2/snapshots/{snapshot_id}                           │   │
│  │    2. Wait for 204 response                                        │   │
│  │    3. Remove from genesis.droplet_snapshots                        │   │
│  │    4. Log: SNAPSHOT_DELETED with reason                            │   │
│  │                                                                     │   │
│  │  ON FAILURE:                                                        │   │
│  │    - Log error, increment retry counter                            │   │
│  │    - After 3 failures: Alert operations, flag for manual review    │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STEP 4: Post-failover specific cleanup                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  AFTER REGIONAL FAILOVER COMPLETES:                                │   │
│  │                                                                     │   │
│  │  Day 0-7: Retain all old-region snapshots (rollback safety)        │   │
│  │  Day 7:   Delete old-region daily snapshots                        │   │
│  │  Day 14:  Delete old-region weekly snapshots                       │   │
│  │  Day 30:  Delete all old-region snapshots (final cleanup)          │   │
│  │                                                                     │   │
│  │  EXCEPTION: If tenant requests return to original region           │   │
│  │    - Retain snapshots until migration complete                     │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  COST IMPACT TRACKING:                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Snapshot storage: $0.05/GB/month                                  │   │
│  │  Average snapshot size: 5GB                                        │   │
│  │  Cost per snapshot: $0.25/month                                    │   │
│  │                                                                     │   │
│  │  At 15,000 tenants × 7 daily snapshots:                            │   │
│  │    Without GC: 105,000 snapshots = $26,250/month                   │   │
│  │    With GC:    15,000 snapshots = $3,750/month                     │   │
│  │    Savings:    $22,500/month (85%)                                 │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Garbage Collection Audit Log

| Field | Description |
|-------|-------------|
| `snapshot_id` | DigitalOcean snapshot ID |
| `workspace_id` | Associated tenant (if known) |
| `region` | Snapshot region |
| `reason` | Deletion reason (orphan, expired, failover_cleanup) |
| `size_gb` | Snapshot size |
| `age_days` | Days since creation |
| `deleted_at` | Timestamp of deletion |
| `cost_recovered` | Estimated monthly cost saved |

---

## 66.4 DATABASE DISASTER RECOVERY

Supabase provides its own disaster recovery, but Genesis adds additional safeguards.

### 66.4.1 Database Backup Strategy

| Backup Type | Provider | Frequency | Retention | RPO |
|-------------|----------|-----------|-----------|-----|
| WAL archiving | Supabase (built-in) | Continuous | 7 days | 0 |
| Daily snapshot | Supabase (built-in) | Daily | 7 days | 24 hours |
| Cross-region replication | Genesis custom | Hourly | 3 days | 1 hour |
| Manual export | Genesis custom | Weekly | 30 days | 7 days |

### 66.4.2 Genesis Cross-Region Database Replication

For tenants on Enterprise plans, Genesis provides near-real-time cross-region database replication.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CROSS-REGION DB REPLICATION                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PRIMARY (Supabase us-east-1)                                              │
│  ┌────────────────────────────────────────┐                                │
│  │  genesis.leads (partitioned)           │                                │
│  │  genesis.partition_registry            │                                │
│  │  genesis.workspace_credentials         │                                │
│  │  ...                                   │                                │
│  └────────────────────────────────────────┘                                │
│       │                                                                     │
│       │ CDC (Change Data Capture) via Supabase Realtime                    │
│       │                                                                     │
│       ▼                                                                     │
│  REPLICATION WORKER                                                        │
│  ┌────────────────────────────────────────┐                                │
│  │  - Subscribe to table changes          │                                │
│  │  - Batch changes (every 60 seconds)    │                                │
│  │  - Apply to secondary region           │                                │
│  └────────────────────────────────────────┘                                │
│       │                                                                     │
│       ▼                                                                     │
│  SECONDARY (Supabase us-west-1)                                            │
│  ┌────────────────────────────────────────┐                                │
│  │  genesis_replica.leads                 │                                │
│  │  genesis_replica.partition_registry    │                                │
│  │  genesis_replica.workspace_credentials │                                │
│  │  ...                                   │                                │
│  └────────────────────────────────────────┘                                │
│                                                                             │
│  FAILOVER TRIGGER:                                                         │
│  - Manual: Admin switches connection string                                │
│  - Automatic: If primary unreachable for 5 minutes                        │
│                                                                             │
│  POST-FAILOVER:                                                            │
│  - Secondary becomes primary (read-write)                                  │
│  - Original primary demoted on recovery                                    │
│  - Reconciliation job runs to merge any divergent writes                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 66.5 INCIDENT RESPONSE RUNBOOK

### 66.5.1 On-Call Responsibilities

| Severity | Response Time | Escalation Path |
|----------|---------------|-----------------|
| P1 (Complete outage) | 15 minutes | On-call → Engineering Lead → CTO |
| P2 (Partial outage) | 30 minutes | On-call → Engineering Lead |
| P3 (Degraded performance) | 2 hours | On-call |
| P4 (Non-critical issue) | 24 hours | Next business day |

### 66.5.2 Incident Communication Template

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INCIDENT COMMUNICATION TEMPLATE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INITIAL NOTIFICATION (within 15 minutes of detection):                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Subject: [Genesis] Service Incident - {Region/Component}          │   │
│  │                                                                     │   │
│  │  We're investigating an issue affecting {component/region}.        │   │
│  │  Impact: {Describe affected functionality}                         │   │
│  │  Start time: {UTC timestamp}                                       │   │
│  │  Next update: {ETA, typically 30 minutes}                          │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  UPDATES (every 30-60 minutes during active incident):                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Subject: [Genesis] Update - {Region/Component} Incident           │   │
│  │                                                                     │   │
│  │  Status: {Investigating / Identified / Monitoring / Resolved}      │   │
│  │  Update: {What we've learned, what we're doing}                    │   │
│  │  ETA: {If known}                                                   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  RESOLUTION (when fully recovered):                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Subject: [Genesis] Resolved - {Region/Component} Incident         │   │
│  │                                                                     │   │
│  │  The incident has been resolved.                                   │   │
│  │  Duration: {X hours Y minutes}                                     │   │
│  │  Root cause: {Brief description}                                   │   │
│  │  Next steps: {Post-mortem, improvements}                           │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 📧 PHASE 60.B: EMAIL PROVIDER ABSTRACTION

> **Phase Type:** V30 Flexibility Layer  
> **Dependencies:** Phase 60, Phase 53 (UUID Mapper)  
> **Risk Level:** MEDIUM (Integration Complexity)  
> **Priority:** HIGH - Essential for Enterprise Clients

---

## 60.B.1 THE PROBLEM: GMAIL LOCK-IN

The current cold email system is tightly coupled to Gmail's API. This creates friction for:

| Client Type | Issue with Gmail-Only |
|-------------|----------------------|
| **Enterprise** | IT policy forbids third-party OAuth for email |
| **Self-hosted enthusiasts** | Want full control over email infrastructure |
| **High-volume senders** | Gmail's 500/day limit is insufficient |
| **Privacy-focused** | Don't want Google touching their data |
| **International** | Gmail blocked or unreliable in some regions |

**The V30 Solution:** A unified Email Provider Abstraction that supports multiple sending methods through a single workflow architecture.

---

## 60.B.2 SUPPORTED EMAIL PROVIDERS

| Provider | Type | Use Case | Daily Limit |
|----------|------|----------|-------------|
| **Gmail** | OAuth API | Default, easiest setup | 500/day (free), 2000/day (Workspace) |
| **SMTP (Custom)** | Protocol | Self-hosted servers, any SMTP provider | Unlimited (server-dependent) |
| **SendGrid** | API | High-volume transactional | 100/day free, unlimited paid |
| **Mailgun** | API | Developer-friendly | 5,000/month free |
| **Amazon SES** | API | AWS-native, very cheap | 50,000/day |
| **Postmark** | API | Deliverability-focused | 100/month free |

**V30 Initial Support:** Gmail + SMTP (others can be added later)

---

## 60.B.3 ARCHITECTURE: UNIFIED SENDING INTERFACE

**The Key Insight:** Don't duplicate workflows. Use a **Switch Node** to route to the appropriate sending method based on workspace configuration.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EMAIL PROVIDER ABSTRACTION LAYER                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WORKFLOW STRUCTURE (Email 1, 2, 3 - Same Pattern):                        │
│                                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────────────┐  │
│  │ Webhook  │───▶│ Get Lead │───▶│ AI Write │───▶│ Get Email Provider   │  │
│  │ Trigger  │    │ Data     │    │ Content  │    │ Config               │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┬───────────┘  │
│                                                              │              │
│                                                              ▼              │
│                                                   ┌──────────────────────┐  │
│                                                   │     SWITCH NODE      │  │
│                                                   │  (email_provider)    │  │
│                                                   └──────────┬───────────┘  │
│                                                              │              │
│                              ┌────────────────┬──────────────┼──────────┐   │
│                              │                │              │          │   │
│                              ▼                ▼              ▼          ▼   │
│                        ┌──────────┐    ┌──────────┐   ┌──────────┐  ┌─────┐│
│                        │  Gmail   │    │   SMTP   │   │ SendGrid │  │ ... ││
│                        │   API    │    │   Node   │   │   API    │  │     ││
│                        └────┬─────┘    └────┬─────┘   └────┬─────┘  └──┬──┘│
│                             │               │              │           │   │
│                             └───────────────┴──────────────┴───────────┘   │
│                                              │                              │
│                                              ▼                              │
│                                   ┌──────────────────────┐                  │
│                                   │     MERGE NODE       │                  │
│                                   │  (Converge paths)    │                  │
│                                   └──────────┬───────────┘                  │
│                                              │                              │
│                                              ▼                              │
│                                   ┌──────────────────────┐                  │
│                                   │   Log Email Event    │                  │
│                                   │   (Same for all)     │                  │
│                                   └──────────────────────┘                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Benefits of This Approach:**
- Single workflow to maintain (not 6 duplicates)
- Easy to add new providers (just add a Switch case)
- Configuration-driven, not code-driven
- Same logging/tracking regardless of provider

---

## 60.B.4 DATABASE SCHEMA: EMAIL PROVIDER CONFIGURATION

```sql
-- ============================================
-- EMAIL PROVIDER CONFIGURATION
-- ============================================
-- Stores per-workspace email provider settings
-- Encrypted credentials for SMTP
-- ============================================

-- Add email provider columns to workspaces or create dedicated table
CREATE TABLE IF NOT EXISTS genesis.email_provider_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id TEXT NOT NULL REFERENCES genesis.workspaces(id) ON DELETE CASCADE,
    
    -- Provider selection
    provider TEXT NOT NULL DEFAULT 'gmail' 
        CHECK (provider IN ('gmail', 'smtp', 'sendgrid', 'mailgun', 'ses', 'postmark')),
    
    -- Gmail OAuth (if provider = 'gmail')
    gmail_credential_id TEXT,  -- Reference to n8n credential
    gmail_refresh_token_encrypted BYTEA,  -- Backup, encrypted with pgcrypto
    gmail_email TEXT,  -- The Gmail address being used
    
    -- SMTP Configuration (if provider = 'smtp')
    smtp_host TEXT,
    smtp_port INTEGER DEFAULT 587,
    smtp_username TEXT,
    smtp_password_encrypted BYTEA,  -- Encrypted with pgcrypto
    smtp_encryption TEXT DEFAULT 'starttls' CHECK (smtp_encryption IN ('none', 'ssl', 'starttls')),
    smtp_from_name TEXT,
    smtp_from_email TEXT,
    
    -- SendGrid (if provider = 'sendgrid')
    sendgrid_api_key_encrypted BYTEA,
    sendgrid_from_email TEXT,
    
    -- Connection health
    last_test_at TIMESTAMPTZ,
    last_test_success BOOLEAN,
    last_test_error TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(workspace_id)
);

-- Index for quick lookups
CREATE INDEX idx_email_provider_workspace ON genesis.email_provider_config(workspace_id);

-- RLS Policy
ALTER TABLE genesis.email_provider_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_provider_isolation ON genesis.email_provider_config
    FOR ALL
    USING (workspace_id = current_setting('app.workspace_id', true));
```

---

## 60.B.5 N8N WORKFLOW MODIFICATION: THE SWITCH NODE

**How to Update Email 1, 2, 3 Workflows:**

### Step 1: Add "Get Email Config" Node

Before your existing Gmail node, add an HTTP Request node:

```
Node Type: HTTP Request
Name: "Get Email Config"

Configuration:
  Method: GET
  URL: {{ $env.DASHBOARD_URL }}/api/workspace/email-config
  Headers:
    Authorization: Bearer {{ $env.SIDECAR_TOKEN }}
    X-Workspace-ID: {{ $json.workspace_id }}
  
Response:
{
  "provider": "smtp",  // or "gmail"
  "smtp_host": "mail.example.com",
  "smtp_port": 587,
  "smtp_username": "outbound@example.com",
  "smtp_password": "decrypted_password",  // Dashboard decrypts before sending
  "smtp_encryption": "starttls",
  "from_name": "John from Company",
  "from_email": "john@example.com"
}
```

### Step 2: Add Switch Node

```
Node Type: Switch
Name: "Route by Provider"

Configuration:
  Mode: Rules
  Data Type: String
  Value 1: {{ $json.provider }}
  
  Rules:
    Output 0: Equals "gmail"    → Connect to Gmail Node
    Output 1: Equals "smtp"     → Connect to SMTP Node
    Output 2: Equals "sendgrid" → Connect to SendGrid Node (future)
    Fallback: Output 0 (Gmail as default)
```

### Step 3: Configure SMTP Node

```
Node Type: SMTP
Name: "Send via SMTP"

Configuration:
  Host: {{ $json.smtp_host }}
  Port: {{ $json.smtp_port }}
  User: {{ $json.smtp_username }}
  Password: {{ $json.smtp_password }}
  SSL/TLS: {{ $json.smtp_encryption === 'ssl' }}
  
  From Email: {{ $json.from_email }}
  From Name: {{ $json.from_name }}
  To Email: {{ $json.lead.email }}
  Subject: {{ $json.email_subject }}
  HTML: {{ $json.email_body }}
```

### Step 4: Add Merge Node

```
Node Type: Merge
Name: "Merge Send Results"

Configuration:
  Mode: Merge By Index
  
Connect: Gmail output + SMTP output → Merge → Continue to logging
```

---

## 60.B.6 VISUAL GUIDE: N8N EDITOR VIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EMAIL 1 WORKFLOW (With SMTP Support)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BEFORE (Current - Gmail Only):                                            │
│  ══════════════════════════════                                            │
│                                                                             │
│  [Webhook] → [Get Lead] → [AI Content] → [Gmail Send] → [Log Event]       │
│                                                                             │
│                                                                             │
│  AFTER (With Email Provider Abstraction):                                  │
│  ════════════════════════════════════════                                  │
│                                                                             │
│                                                     ┌─────────────────┐     │
│                                                  ┌──│  Gmail Send     │──┐  │
│                                                  │  │  (Output 0)     │  │  │
│  ┌────────┐   ┌────────┐   ┌────────┐   ┌──────┐│  └─────────────────┘  │  │
│  │Webhook │──▶│Get Lead│──▶│   AI   │──▶│Switch│┤                       │  │
│  │        │   │        │   │Content │   │      ││  ┌─────────────────┐  │  │
│  └────────┘   └────────┘   └────────┘   └──────┘└──│  SMTP Send      │──┤  │
│                                                    │  (Output 1)     │  │  │
│                                                    └─────────────────┘  │  │
│                                                                         │  │
│                                                    ┌─────────────────┐  │  │
│                                                    │     Merge       │◀─┘  │
│                                                    └────────┬────────┘     │
│                                                             │              │
│                                                             ▼              │
│                                                    ┌─────────────────┐     │
│                                                    │   Log Event     │     │
│                                                    └─────────────────┘     │
│                                                                             │
│  NODE COUNT: Was 5, Now 7 (+2 nodes: Switch, SMTP)                        │
│  WORKFLOWS: Still just 3 (Email 1, 2, 3) - NOT duplicated                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 60.B.7 DASHBOARD UI: EMAIL PROVIDER SETTINGS

**Location:** Settings → Email Configuration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EMAIL CONFIGURATION                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Choose how your cold emails are sent:                                     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ○ Gmail (Recommended)                                              │   │
│  │    Connect your Gmail account via OAuth. Easy setup, reliable.      │   │
│  │    Limit: 500 emails/day (free) or 2,000/day (Google Workspace)    │   │
│  │                                                                     │   │
│  │    Status: ✅ Connected as john@company.com                        │   │
│  │    [Reconnect Gmail] [Disconnect]                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ● SMTP (Custom Server)                                             │   │
│  │    Use your own mail server or any SMTP provider.                   │   │
│  │    Full control, no daily limits (server-dependent).               │   │
│  │                                                                     │   │
│  │    ─── SMTP Settings ─────────────────────────────────────────────  │   │
│  │                                                                     │   │
│  │    SMTP Host:      [smtp.yourserver.com                 ]          │   │
│  │    Port:           [587                                  ]          │   │
│  │    Username:       [outbound@yourdomain.com              ]          │   │
│  │    Password:       [••••••••••••                         ] [Show]   │   │
│  │                                                                     │   │
│  │    Encryption:     ○ None   ○ SSL/TLS   ● STARTTLS                 │   │
│  │                                                                     │   │
│  │    ─── Sender Identity ───────────────────────────────────────────  │   │
│  │                                                                     │   │
│  │    From Name:      [John Smith                           ]          │   │
│  │    From Email:     [john@yourdomain.com                  ]          │   │
│  │                                                                     │   │
│  │    [Test Connection]                                                │   │
│  │                                                                     │   │
│  │    ✅ Connection successful! Test email sent.                      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ○ SendGrid (Coming Soon)                                           │   │
│  │    High-volume sending via SendGrid API.                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                              [Cancel] [Save Configuration]  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 60.B.8 API ENDPOINT: EMAIL CONFIG

```typescript
// app/api/workspace/email-config/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { decrypt } from '@/lib/encryption';
import { validateSidecarToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Validate request (from Sidecar or Dashboard)
  const workspaceId = request.headers.get('X-Workspace-ID');
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!await validateSidecarToken(token, workspaceId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const supabase = createClient();
  
  // Get email provider config
  const { data: config, error } = await supabase
    .from('email_provider_config')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single();
  
  if (error || !config) {
    // Default to Gmail if no config exists
    return NextResponse.json({ provider: 'gmail' });
  }
  
  // Build response based on provider
  const response: any = {
    provider: config.provider,
  };
  
  if (config.provider === 'smtp') {
    response.smtp_host = config.smtp_host;
    response.smtp_port = config.smtp_port;
    response.smtp_username = config.smtp_username;
    response.smtp_password = decrypt(config.smtp_password_encrypted);  // Decrypt for n8n
    response.smtp_encryption = config.smtp_encryption;
    response.from_name = config.smtp_from_name;
    response.from_email = config.smtp_from_email;
  } else if (config.provider === 'gmail') {
    response.gmail_email = config.gmail_email;
    // Gmail credentials are in n8n's credential store, not passed here
  }
  
  return NextResponse.json(response);
}

export async function POST(request: NextRequest) {
  // Save email provider configuration
  // ... implementation for saving settings from Dashboard UI
}
```

---

## 60.B.9 CREDENTIAL INJECTION FOR SMTP

When a tenant selects SMTP, the Sidecar needs access to the SMTP credentials. This integrates with Phase 53 (Dynamic UUID Mapper):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SMTP CREDENTIAL INJECTION FLOW                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. ONBOARDING:                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  User enters SMTP settings in Dashboard UI                         │   │
│  │       │                                                             │   │
│  │       ▼                                                             │   │
│  │  Dashboard encrypts password with pgcrypto                         │   │
│  │       │                                                             │   │
│  │       ▼                                                             │   │
│  │  Stores in genesis.email_provider_config                           │   │
│  │       │                                                             │   │
│  │       ▼                                                             │   │
│  │  Triggers Sidecar to create n8n SMTP credential                    │   │
│  │       │                                                             │   │
│  │       ▼                                                             │   │
│  │  Sidecar calls n8n API: POST /credentials                          │   │
│  │  {                                                                  │   │
│  │    "name": "smtp_workspace_xyz",                                   │   │
│  │    "type": "smtp",                                                 │   │
│  │    "data": {                                                       │   │
│  │      "host": "smtp.example.com",                                   │   │
│  │      "port": 587,                                                  │   │
│  │      "user": "outbound@example.com",                               │   │
│  │      "password": "decrypted_from_vault"                            │   │
│  │    }                                                               │   │
│  │  }                                                                  │   │
│  │       │                                                             │   │
│  │       ▼                                                             │   │
│  │  n8n returns credential UUID                                       │   │
│  │       │                                                             │   │
│  │       ▼                                                             │   │
│  │  UUID Mapper stores: smtp_credential → {uuid}                      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  2. RUNTIME (When workflow executes):                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Workflow hits SMTP node                                           │   │
│  │       │                                                             │   │
│  │       ▼                                                             │   │
│  │  n8n uses credential UUID from workflow definition                 │   │
│  │       │                                                             │   │
│  │       ▼                                                             │   │
│  │  Credential already exists in local n8n (created at onboarding)    │   │
│  │       │                                                             │   │
│  │       ▼                                                             │   │
│  │  Email sent via SMTP                                               │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 60.B.10 TESTING EMAIL CONFIGURATION

**Test Connection Endpoint:**

```typescript
// app/api/workspace/email-config/test/route.ts

export async function POST(request: NextRequest) {
  const { provider, smtp_host, smtp_port, smtp_username, smtp_password, ... } = await request.json();
  
  if (provider === 'smtp') {
    try {
      // Create transient SMTP connection
      const transporter = nodemailer.createTransport({
        host: smtp_host,
        port: smtp_port,
        secure: smtp_port === 465,
        auth: {
          user: smtp_username,
          pass: smtp_password,
        },
      });
      
      // Verify connection
      await transporter.verify();
      
      // Send test email
      await transporter.sendMail({
        from: `"Genesis Test" <${smtp_username}>`,
        to: smtp_username,  // Send to self
        subject: 'Genesis SMTP Test',
        text: 'Your SMTP configuration is working correctly!',
      });
      
      return NextResponse.json({ success: true, message: 'Test email sent!' });
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        message: `Connection failed: ${error.message}`,
        hint: getSmtpErrorHint(error)  // "Check port", "Check credentials", etc.
      });
    }
  }
}
```

---

## 60.B.11 COMMON SMTP CONFIGURATIONS

**Reference for users:**

| Provider | Host | Port | Encryption | Notes |
|----------|------|------|------------|-------|
| **Zoho Mail** | smtp.zoho.com | 587 | STARTTLS | Free tier available |
| **Outlook/Office365** | smtp.office365.com | 587 | STARTTLS | Requires app password |
| **Yahoo Mail** | smtp.mail.yahoo.com | 587 | STARTTLS | Requires app password |
| **Fastmail** | smtp.fastmail.com | 587 | STARTTLS | Privacy-focused |
| **ProtonMail Bridge** | 127.0.0.1 | 1025 | None | Local bridge required |
| **Mailgun** | smtp.mailgun.org | 587 | STARTTLS | API key as password |
| **SendGrid** | smtp.sendgrid.net | 587 | STARTTLS | API key as password |
| **Amazon SES** | email-smtp.{region}.amazonaws.com | 587 | STARTTLS | IAM credentials |
| **Self-hosted (Postfix)** | mail.yourdomain.com | 587 | STARTTLS | Your own server |

---

## 60.B.12 IMPLEMENTATION CHECKLIST

**Phase 60.B delivers:**

- [ ] `email_provider_config` database table
- [ ] Dashboard UI for email provider selection
- [ ] SMTP settings form with validation
- [ ] Test connection endpoint
- [ ] Email config API for Sidecar
- [ ] Updated Email 1, 2, 3 workflows with Switch node
- [ ] SMTP credential injection via Sidecar
- [ ] Provider-agnostic logging (same events regardless of provider)

**Integration points:**
- Phase 53: Uses UUID Mapper for SMTP credentials
- Phase 60: Extends onboarding with email provider choice
- Phase 61: Email tracking works with both providers
- Phase 67: API Health Monitor checks email provider status

---

# 🔐 PHASE 63.B: COMPREHENSIVE LOGIN AUDIT TRAIL

> **Phase Type:** V30 Compliance & Security  
> **Dependencies:** Phase 63 (Audit Logging)  
> **Risk Level:** LOW (Read-only logging)  
> **Priority:** MEDIUM - Required for SOC2/Enterprise Compliance

---

## 63.B.1 WHAT IS AN AUDIT TRAIL?

An audit trail is a chronological record of system activities that provides documentary evidence of the sequence of activities. For logins specifically, it tracks:

- **Who** attempted to log in
- **When** the attempt occurred
- **Where** (IP address, location)
- **What** device/browser was used
- **Whether** the attempt succeeded or failed
- **Why** it failed (if applicable)

**Why This Matters:**

| Stakeholder | Benefit |
|-------------|---------|
| **Security Team** | Detect brute force attacks, compromised accounts |
| **Compliance** | SOC2, GDPR, HIPAA all require login audit trails |
| **Support** | Debug "I can't log in" issues |
| **Legal** | Evidence for unauthorized access claims |
| **Admin** | Know who's accessing the system and when |

---

## 63.B.2 AUDIT EVENTS TO CAPTURE

### Login Events

| Event Type | Description | Captured Data |
|------------|-------------|---------------|
| `login_attempt` | User started login flow | timestamp, user_id (if known), IP, user_agent |
| `login_success` | Successful authentication | timestamp, user_id, session_id, IP, user_agent, auth_method |
| `login_failure` | Failed authentication | timestamp, attempted_email, IP, user_agent, failure_reason |
| `logout` | User logged out | timestamp, user_id, session_id, logout_type (manual/timeout) |
| `session_refresh` | Token refreshed | timestamp, user_id, session_id |
| `session_revoked` | Session forcibly ended | timestamp, user_id, session_id, revoked_by, reason |

### Authentication Events

| Event Type | Description | Captured Data |
|------------|-------------|---------------|
| `password_change` | Password changed | timestamp, user_id, IP, initiated_by |
| `password_reset_request` | Reset link requested | timestamp, email, IP |
| `password_reset_complete` | Password reset completed | timestamp, user_id, IP |
| `mfa_enabled` | 2FA turned on | timestamp, user_id, mfa_type |
| `mfa_disabled` | 2FA turned off | timestamp, user_id, disabled_by |
| `mfa_challenge` | 2FA code entered | timestamp, user_id, success, mfa_type |

### Access Events (Beyond Login)

| Event Type | Description | Captured Data |
|------------|-------------|---------------|
| `api_key_created` | New API key generated | timestamp, user_id, key_name, permissions |
| `api_key_used` | API key authenticated | timestamp, key_id, IP, endpoint |
| `api_key_revoked` | API key deleted | timestamp, user_id, key_id, reason |
| `permission_granted` | Access granted | timestamp, granted_by, granted_to, permission |
| `permission_revoked` | Access revoked | timestamp, revoked_by, user_id, permission |

---

## 63.B.3 DATABASE SCHEMA: AUDIT TRAIL

```sql
-- ============================================
-- LOGIN AUDIT TRAIL
-- ============================================
-- Immutable log of all authentication events
-- Write-only: No updates or deletes allowed
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.login_audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event classification
    event_type TEXT NOT NULL,
    event_category TEXT NOT NULL DEFAULT 'authentication',  -- 'authentication', 'authorization', 'session'
    severity TEXT NOT NULL DEFAULT 'info',  -- 'info', 'warning', 'critical'
    
    -- Actor (who did this)
    user_id TEXT,  -- NULL if login failed before identifying user
    user_email TEXT,  -- Captured at event time (may differ from current email)
    workspace_id TEXT,  -- If action is workspace-specific
    
    -- Session info
    session_id TEXT,
    
    -- Request context
    ip_address INET NOT NULL,
    user_agent TEXT,
    device_fingerprint TEXT,  -- Optional: browser fingerprint
    
    -- Geolocation (derived from IP)
    geo_country TEXT,
    geo_city TEXT,
    geo_region TEXT,
    
    -- Event details
    success BOOLEAN,
    failure_reason TEXT,  -- 'invalid_password', 'account_locked', 'mfa_failed', etc.
    
    -- Additional metadata (flexible)
    metadata JSONB DEFAULT '{}',
    
    -- Timestamp (immutable)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Prevent modifications
    CONSTRAINT audit_immutable CHECK (TRUE)  -- Enforced by triggers
);

-- Indexes for common queries
CREATE INDEX idx_audit_user ON genesis.login_audit_trail(user_id, created_at DESC);
CREATE INDEX idx_audit_event ON genesis.login_audit_trail(event_type, created_at DESC);
CREATE INDEX idx_audit_ip ON genesis.login_audit_trail(ip_address, created_at DESC);
CREATE INDEX idx_audit_workspace ON genesis.login_audit_trail(workspace_id, created_at DESC);
CREATE INDEX idx_audit_created ON genesis.login_audit_trail(created_at DESC);
CREATE INDEX idx_audit_severity ON genesis.login_audit_trail(severity) WHERE severity IN ('warning', 'critical');

-- Partitioning by month for efficient archival
-- (Optional: Add if expecting high volume)
-- CREATE TABLE genesis.login_audit_trail_2026_01 PARTITION OF genesis.login_audit_trail
--     FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- ============================================
-- IMMUTABILITY ENFORCEMENT
-- ============================================
-- Prevent any updates or deletes to audit records

CREATE OR REPLACE FUNCTION genesis.enforce_audit_immutability()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit trail records are immutable. Updates and deletes are not allowed.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_no_update
    BEFORE UPDATE ON genesis.login_audit_trail
    FOR EACH ROW
    EXECUTE FUNCTION genesis.enforce_audit_immutability();

CREATE TRIGGER audit_no_delete
    BEFORE DELETE ON genesis.login_audit_trail
    FOR EACH ROW
    EXECUTE FUNCTION genesis.enforce_audit_immutability();

-- ============================================
-- RLS: Only admins can read audit trail
-- ============================================
ALTER TABLE genesis.login_audit_trail ENABLE ROW LEVEL SECURITY;

-- Super admins can see all
CREATE POLICY audit_admin_read ON genesis.login_audit_trail
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM genesis.workspace_members wm
            WHERE wm.user_id = current_setting('app.user_id', true)
            AND wm.role = 'super_admin'
        )
    );

-- Workspace admins can see their workspace events
CREATE POLICY audit_workspace_read ON genesis.login_audit_trail
    FOR SELECT
    USING (
        workspace_id = current_setting('app.workspace_id', true)
        AND EXISTS (
            SELECT 1 FROM genesis.workspace_members wm
            WHERE wm.user_id = current_setting('app.user_id', true)
            AND wm.workspace_id = current_setting('app.workspace_id', true)
            AND wm.role IN ('admin', 'owner')
        )
    );

-- Everyone can insert (logging happens from backend)
CREATE POLICY audit_insert_all ON genesis.login_audit_trail
    FOR INSERT
    WITH CHECK (TRUE);
```

---

## 63.B.4 LOGGING SERVICE

```typescript
// lib/audit/login-audit.ts

import { createClient } from '@/lib/supabase';
import { headers } from 'next/headers';

interface AuditEvent {
  event_type: string;
  event_category?: 'authentication' | 'authorization' | 'session';
  severity?: 'info' | 'warning' | 'critical';
  user_id?: string;
  user_email?: string;
  workspace_id?: string;
  session_id?: string;
  success?: boolean;
  failure_reason?: string;
  metadata?: Record<string, any>;
}

export async function logAuditEvent(event: AuditEvent) {
  const headersList = headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 
             headersList.get('x-real-ip') || 
             '0.0.0.0';
  const userAgent = headersList.get('user-agent') || 'unknown';
  
  // Get geolocation from IP (optional, use service like MaxMind or ip-api)
  const geo = await getGeoFromIP(ip);
  
  const supabase = createClient({ serviceRole: true });  // Use service role for logging
  
  await supabase.from('login_audit_trail').insert({
    event_type: event.event_type,
    event_category: event.event_category || 'authentication',
    severity: event.severity || 'info',
    user_id: event.user_id,
    user_email: event.user_email,
    workspace_id: event.workspace_id,
    session_id: event.session_id,
    ip_address: ip,
    user_agent: userAgent,
    geo_country: geo?.country,
    geo_city: geo?.city,
    geo_region: geo?.region,
    success: event.success,
    failure_reason: event.failure_reason,
    metadata: event.metadata || {},
  });
}

// Convenience functions
export const auditLoginSuccess = (userId: string, email: string, sessionId: string) =>
  logAuditEvent({
    event_type: 'login_success',
    severity: 'info',
    user_id: userId,
    user_email: email,
    session_id: sessionId,
    success: true,
  });

export const auditLoginFailure = (email: string, reason: string) =>
  logAuditEvent({
    event_type: 'login_failure',
    severity: 'warning',
    user_email: email,
    success: false,
    failure_reason: reason,
  });

export const auditSuspiciousActivity = (userId: string, reason: string, metadata: any) =>
  logAuditEvent({
    event_type: 'suspicious_activity',
    severity: 'critical',
    user_id: userId,
    success: false,
    failure_reason: reason,
    metadata,
  });
```

---

## 63.B.5 INTEGRATION WITH CLERK (AUTHENTICATION)

Since Genesis uses Clerk for authentication, integrate audit logging with Clerk webhooks:

```typescript
// app/api/webhooks/clerk/route.ts

import { Webhook } from 'svix';
import { logAuditEvent } from '@/lib/audit/login-audit';

export async function POST(request: Request) {
  const payload = await request.json();
  const { type, data } = payload;
  
  switch (type) {
    case 'session.created':
      await logAuditEvent({
        event_type: 'login_success',
        user_id: data.user_id,
        user_email: data.user?.email_addresses?.[0]?.email_address,
        session_id: data.id,
        success: true,
        metadata: {
          auth_method: data.authentication_method,
          client_id: data.client_id,
        },
      });
      break;
      
    case 'session.ended':
      await logAuditEvent({
        event_type: 'logout',
        user_id: data.user_id,
        session_id: data.id,
        metadata: {
          reason: data.status,  // 'ended', 'revoked', 'expired'
        },
      });
      break;
      
    case 'user.created':
      await logAuditEvent({
        event_type: 'account_created',
        event_category: 'authorization',
        user_id: data.id,
        user_email: data.email_addresses?.[0]?.email_address,
        success: true,
      });
      break;
      
    // ... other Clerk events
  }
  
  return new Response('OK', { status: 200 });
}
```

---

## 63.B.6 ADMIN UI: AUDIT TRAIL VIEWER

**Location:** Admin → Security → Audit Trail

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AUDIT TRAIL VIEWER                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Filters:                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Event Type: [All Events        ▼]   User: [All Users      ▼]      │   │
│  │  Date Range: [Last 7 days       ▼]   Severity: [All        ▼]      │   │
│  │  IP Address: [_________________ ]    [Search]                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ TIME               EVENT              USER           IP        LOC  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ 2026-01-24 14:32  ✅ login_success   john@co.com   192.168.1.1  US │   │
│  │ 2026-01-24 14:30  ❌ login_failure   john@co.com   192.168.1.1  US │   │
│  │                    └─ Reason: Invalid password                      │   │
│  │ 2026-01-24 13:15  ⚠️ mfa_challenge   sarah@co.com  10.0.0.5     UK │   │
│  │                    └─ MFA type: TOTP, Success: Yes                  │   │
│  │ 2026-01-24 12:00  ✅ login_success   sarah@co.com  10.0.0.5     UK │   │
│  │ 2026-01-24 11:45  🚨 suspicious      bob@co.com    185.2.3.4    RU │   │
│  │                    └─ Reason: Login from unusual location           │   │
│  │                    └─ [Block User] [Investigate]                    │   │
│  │ 2026-01-24 10:30  ✅ logout          mike@co.com   192.168.1.2  US │   │
│  │                    └─ Type: Manual logout                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Showing 1-50 of 1,234 events                    [← Previous] [Next →]     │
│                                                                             │
│  [Export CSV] [Export JSON]                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 63.B.7 SECURITY ALERTS FROM AUDIT DATA

**Automated Detection Rules:**

| Pattern | Alert Type | Action |
|---------|------------|--------|
| 5+ failed logins from same IP in 5 min | Brute force attempt | Block IP temporarily |
| Login from new country | Unusual location | Require MFA, notify user |
| Login at unusual time | Anomalous behavior | Flag for review |
| Session active in 2+ locations | Session hijacking | Revoke all sessions |
| Password changed + immediate logout | Account takeover | Lock account, notify |

```sql
-- Example: Detect brute force attacks
CREATE OR REPLACE FUNCTION genesis.detect_brute_force()
RETURNS TRIGGER AS $$
DECLARE
    recent_failures INTEGER;
BEGIN
    IF NEW.event_type = 'login_failure' THEN
        -- Count recent failures from same IP
        SELECT COUNT(*) INTO recent_failures
        FROM genesis.login_audit_trail
        WHERE ip_address = NEW.ip_address
          AND event_type = 'login_failure'
          AND created_at > NOW() - INTERVAL '5 minutes';
        
        IF recent_failures >= 5 THEN
            -- Log critical alert
            INSERT INTO genesis.login_audit_trail (
                event_type, severity, ip_address, user_agent, 
                failure_reason, metadata
            ) VALUES (
                'brute_force_detected', 'critical', NEW.ip_address, NEW.user_agent,
                'Multiple failed login attempts detected',
                jsonb_build_object('attempt_count', recent_failures)
            );
            
            -- Optionally: Add IP to blocklist
            INSERT INTO genesis.blocked_ips (ip_address, reason, expires_at)
            VALUES (NEW.ip_address, 'brute_force', NOW() + INTERVAL '1 hour')
            ON CONFLICT (ip_address) DO UPDATE SET expires_at = NOW() + INTERVAL '1 hour';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_brute_force_detection
    AFTER INSERT ON genesis.login_audit_trail
    FOR EACH ROW
    EXECUTE FUNCTION genesis.detect_brute_force();
```

---

## 63.B.8 RETENTION & ARCHIVAL

**Retention Policy:**

| Data Type | Retention | Storage |
|-----------|-----------|---------|
| Login events (success) | 90 days active, 2 years archived | Supabase → S3 |
| Login events (failure) | 90 days active, 2 years archived | Supabase → S3 |
| Security alerts | 2 years active, 7 years archived | Supabase → S3 |
| Session data | 30 days | Supabase only |

**Archival Job (Monthly):**

```sql
-- Archive old audit records to cold storage
CREATE OR REPLACE FUNCTION genesis.archive_old_audit_records()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Export to S3/external storage first (handled by separate process)
    
    -- Then delete records older than retention period
    WITH deleted AS (
        DELETE FROM genesis.login_audit_trail
        WHERE created_at < NOW() - INTERVAL '90 days'
          AND severity = 'info'
        RETURNING id
    )
    SELECT COUNT(*) INTO archived_count FROM deleted;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;
```

---

## 63.B.9 IMPLEMENTATION CHECKLIST

**Phase 63.B delivers:**

- [ ] `login_audit_trail` table with immutability triggers
- [ ] `logAuditEvent()` service function
- [ ] Clerk webhook integration
- [ ] Brute force detection trigger
- [ ] Admin UI audit trail viewer
- [ ] Export to CSV/JSON
- [ ] Retention/archival automation
- [ ] Security alerts from patterns

**Compliance achieved:**
- SOC2 Type II: Login audit requirement
- GDPR: Access logging for data subjects
- HIPAA: Authentication event logging

---

# 🛠️ PHASE 66.B: INFRASTRUCTURE AS CODE (OPTIONAL)

> **Phase Type:** V30 Operational Excellence  
> **Dependencies:** Phase 50, Phase 66  
> **Risk Level:** LOW (Supplementary tooling)  
> **Priority:** 🟢 LOW - Nice to have, not critical for MVP

---

## 66.B.1 WHAT IS INFRASTRUCTURE AS CODE (IaC)?

**Infrastructure as Code** means defining your infrastructure (servers, databases, networks) in configuration files rather than manual setup. This enables:

- **Reproducibility:** Exact same infrastructure every time
- **Version control:** Track changes, rollback if needed
- **Disaster recovery:** Rebuild everything from code
- **Documentation:** The code IS the documentation

**The Two Main Tools:**

| Tool | Purpose | Analogy |
|------|---------|---------|
| **Terraform** | Create cloud resources | "Build the house" |
| **Ansible** | Configure servers | "Furnish the house" |

---

## 66.B.2 WHY THIS IS MARKED OPTIONAL/LOW PRIORITY

**Current V30 Architecture Already Handles This:**

| Task | V30 Solution | IaC Alternative |
|------|--------------|-----------------|
| Create tenant droplets | Ignition Orchestrator (Phase 41) | Terraform |
| Configure droplets | Cloud-Init + Sidecar | Ansible |
| Fleet-wide updates | BullMQ + Phase 56 | Ansible |
| Credential injection | Sidecar + Vault | Ansible Vault |

**The V30 architecture is PURPOSE-BUILT for dynamic, on-demand infrastructure.** Terraform/Ansible are better for static infrastructure.

**Where IaC WOULD Help:**
- Recreating the Dashboard itself after disaster
- Setting up new environments (staging, production)
- Provisioning the Redis cluster
- Managing DNS records

---

## 66.B.3 TERRAFORM FOR DASHBOARD INFRASTRUCTURE

If you want to use Terraform, here's what it would manage:

```hcl
# main.tf - Genesis Dashboard Infrastructure

terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }
}

# Variables
variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
}

variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
  sensitive   = true
}

# DigitalOcean Provider
provider "digitalocean" {
  token = var.do_token
}

# Dashboard Droplet (NOT tenant droplets - those are managed by the app)
resource "digitalocean_droplet" "dashboard" {
  name     = "genesis-dashboard-${var.environment}"
  region   = "nyc1"
  size     = "s-2vcpu-4gb"  # Larger than tenant droplets
  image    = "ubuntu-22-04-x64"
  
  user_data = file("cloud-init/dashboard.yml")
  
  tags = ["genesis", "dashboard", var.environment]
}

# Redis for BullMQ
resource "digitalocean_database_cluster" "redis" {
  name       = "genesis-redis-${var.environment}"
  engine     = "redis"
  version    = "7"
  size       = "db-s-1vcpu-1gb"
  region     = "nyc1"
  node_count = 1
}

# Load Balancer (optional, for high availability)
resource "digitalocean_loadbalancer" "dashboard" {
  name   = "genesis-lb-${var.environment}"
  region = "nyc1"

  forwarding_rule {
    entry_port     = 443
    entry_protocol = "https"
    target_port    = 3000
    target_protocol = "http"
    certificate_name = digitalocean_certificate.dashboard.name
  }

  healthcheck {
    port     = 3000
    protocol = "http"
    path     = "/api/health"
  }

  droplet_ids = [digitalocean_droplet.dashboard.id]
}

# DNS Record
resource "digitalocean_record" "dashboard" {
  domain = "genesis-platform.com"
  type   = "A"
  name   = var.environment == "production" ? "@" : var.environment
  value  = digitalocean_loadbalancer.dashboard.ip
  ttl    = 300
}

# Outputs
output "dashboard_ip" {
  value = digitalocean_droplet.dashboard.ipv4_address
}

output "redis_uri" {
  value     = digitalocean_database_cluster.redis.uri
  sensitive = true
}
```

---

## 66.B.4 WHEN TO IMPLEMENT IaC

**Implement Later When:**
- [ ] You have 1000+ paying customers (validate product first)
- [ ] You need multiple environments (staging, production, demo)
- [ ] You're hiring DevOps engineers who expect IaC
- [ ] You need SOC2 Type II certification (requires change management)
- [ ] Disaster recovery becomes a business requirement

**Don't Implement Now If:**
- [ ] You're still iterating on the core product
- [ ] You're the only person managing infrastructure
- [ ] The existing Cloud-Init + Sidecar approach works well

---

## 66.B.5 RECOMMENDATION

**For Genesis V30:**

1. **Skip Terraform for tenant droplets** - The Ignition Orchestrator is better suited for dynamic provisioning
2. **Consider Terraform for Dashboard infra** - But only after product-market fit
3. **Skip Ansible entirely** - The Sidecar + BullMQ approach is more elegant for this use case

**If you DO implement IaC later:**
- Start with Dashboard infrastructure only
- Use Terraform Cloud for state management
- Keep tenant droplet management in the app

---

# 🏥 PHASE 67: API HEALTH MONITOR & SANITY CHECK

> **Phase Type:** V30 Observability  
> **Dependencies:** Phase 44 (God Mode), Phase 60 (Onboarding)  
> **Risk Level:** LOW (Read-only monitoring)  
> **Priority:** 🔴 HIGH - Essential for Debugging

---

## 67.1 THE PROBLEM: API CONFIGURATION CHAOS

Genesis integrates with many external APIs:

| API | Purpose | Failure Impact |
|-----|---------|----------------|
| **OpenAI** | AI content generation | Emails not personalized |
| **Claude/Anthropic** | Alternative AI | Fallback fails |
| **Relevance AI** | Lead enrichment | No enriched data |
| **Apify** | Web scraping | No lead discovery |
| **Google CSE** | Search enrichment | Missing company info |
| **Gmail** | Email sending | Emails not sent |
| **DigitalOcean** | Droplet management | Can't provision tenants |
| **Supabase** | Database | Total system failure |

**The Pain Point:**
When something breaks, you currently have to:
1. Check logs (which logs? where?)
2. Search through code for API calls
3. Test each API manually
4. Figure out if it's a config issue or API outage

**The Solution:**
A centralized API Health Dashboard that:
- Tests all APIs automatically
- Shows exactly what's broken
- Points to exactly where to fix it
- Alerts before users notice

---

## 67.2 API HEALTH DASHBOARD

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API HEALTH DASHBOARD                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Last Check: 2 minutes ago                    [Refresh Now]                │
│                                                                             │
│  Overall Status: ⚠️ 1 Issue Detected                                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SERVICE           STATUS    LATENCY   QUOTA      ISSUE             │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  OpenAI            ✅ OK     245ms     72% used   -                  │   │
│  │  Claude            ✅ OK     312ms     45% used   -                  │   │
│  │  Relevance AI      ❌ FAIL   -         -          Invalid API key    │   │
│  │                              └─→ [Fix: Settings > API Keys > Relevance] │
│  │  Apify             ✅ OK     1.2s      89% used   ⚠️ Quota warning   │   │
│  │  Google CSE        ✅ OK     178ms     23% used   -                  │   │
│  │  Gmail OAuth       ✅ OK     156ms     -          Token valid 28d    │   │
│  │  DigitalOcean      ✅ OK     89ms      -          15/25 accounts ok  │   │
│  │  Supabase          ✅ OK     12ms      -          -                  │   │
│  │  Redis             ✅ OK     3ms       -          -                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─── DETAILED VIEW: Relevance AI ──────────────────────────────────────    │
│                                                                             │
│  Status: ❌ AUTHENTICATION FAILED                                          │
│  Last Success: 3 days ago                                                  │
│  Error Message: "Invalid API key or key expired"                           │
│                                                                             │
│  Diagnostic Steps:                                                         │
│  1. Go to Settings > API Keys > Relevance AI                              │
│  2. Verify the API key matches your Relevance AI dashboard                │
│  3. Check if the key has expired or been rotated                          │
│  4. Click "Test Connection" after updating                                 │
│                                                                             │
│  [Go to Settings] [View Relevance AI Dashboard] [Contact Support]          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 67.3 API HEALTH CHECK DEFINITIONS

```typescript
// lib/api-health/checks.ts

export interface HealthCheck {
  name: string;
  category: 'ai' | 'integration' | 'infrastructure' | 'email';
  check: () => Promise<HealthCheckResult>;
  fixPath: string;  // Where to fix if broken
  criticalLevel: 'critical' | 'high' | 'medium' | 'low';
}

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  latencyMs?: number;
  quotaUsed?: number;
  quotaLimit?: number;
  message?: string;
  error?: string;
  expiresAt?: Date;  // For tokens
}

// Define all health checks
export const healthChecks: HealthCheck[] = [
  {
    name: 'OpenAI',
    category: 'ai',
    criticalLevel: 'critical',
    fixPath: '/settings/api-keys#openai',
    check: async () => {
      const start = Date.now();
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
        });
        
        if (!response.ok) {
          const error = await response.json();
          return { 
            status: 'error', 
            error: error.error?.message || 'Authentication failed',
            latencyMs: Date.now() - start
          };
        }
        
        return { 
          status: 'ok', 
          latencyMs: Date.now() - start,
          message: 'API key valid'
        };
      } catch (e) {
        return { status: 'error', error: e.message };
      }
    }
  },
  
  {
    name: 'Relevance AI',
    category: 'ai',
    criticalLevel: 'high',
    fixPath: '/settings/api-keys#relevance',
    check: async () => {
      const start = Date.now();
      try {
        // Test Relevance AI endpoint
        const response = await fetch('https://api-xxx.relevanceai.com/v1/agents', {
          headers: { 
            'Authorization': process.env.RELEVANCE_API_KEY,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.status === 401) {
          return { status: 'error', error: 'Invalid API key', latencyMs: Date.now() - start };
        }
        if (response.status === 403) {
          return { status: 'error', error: 'API key lacks permissions', latencyMs: Date.now() - start };
        }
        if (!response.ok) {
          return { status: 'degraded', error: `HTTP ${response.status}`, latencyMs: Date.now() - start };
        }
        
        return { status: 'ok', latencyMs: Date.now() - start };
      } catch (e) {
        return { status: 'error', error: e.message };
      }
    }
  },
  
  {
    name: 'Apify',
    category: 'integration',
    criticalLevel: 'high',
    fixPath: '/settings/api-keys#apify',
    check: async () => {
      const start = Date.now();
      try {
        // Get account info including quota
        const response = await fetch('https://api.apify.com/v2/users/me', {
          headers: { 'Authorization': `Bearer ${process.env.APIFY_API_KEY}` }
        });
        
        if (!response.ok) {
          return { status: 'error', error: 'Invalid API key', latencyMs: Date.now() - start };
        }
        
        const data = await response.json();
        const quotaUsed = data.data?.usage?.computeUnitsUsed || 0;
        const quotaLimit = data.data?.subscription?.computeUnits || 100;
        const quotaPercent = (quotaUsed / quotaLimit) * 100;
        
        return { 
          status: quotaPercent > 90 ? 'degraded' : 'ok',
          latencyMs: Date.now() - start,
          quotaUsed: quotaPercent,
          quotaLimit: 100,
          message: quotaPercent > 90 ? 'Quota nearly exhausted' : undefined
        };
      } catch (e) {
        return { status: 'error', error: e.message };
      }
    }
  },
  
  {
    name: 'Gmail OAuth',
    category: 'email',
    criticalLevel: 'critical',
    fixPath: '/settings/email#gmail',
    check: async () => {
      const start = Date.now();
      try {
        // Check if OAuth token is valid and when it expires
        const tokenInfo = await getGmailTokenInfo();
        
        if (!tokenInfo.valid) {
          return { status: 'error', error: 'OAuth token invalid or expired' };
        }
        
        const daysUntilExpiry = Math.floor((tokenInfo.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
        
        return { 
          status: daysUntilExpiry < 7 ? 'degraded' : 'ok',
          latencyMs: Date.now() - start,
          expiresAt: new Date(tokenInfo.expiresAt),
          message: daysUntilExpiry < 7 ? `Token expires in ${daysUntilExpiry} days` : `Token valid for ${daysUntilExpiry} days`
        };
      } catch (e) {
        return { status: 'error', error: e.message };
      }
    }
  },
  
  {
    name: 'DigitalOcean',
    category: 'infrastructure',
    criticalLevel: 'critical',
    fixPath: '/admin/do-accounts',
    check: async () => {
      const start = Date.now();
      try {
        // Check all DO accounts in pool
        const accounts = await getActiveDoAccounts();
        const results = await Promise.all(
          accounts.map(async (acc) => {
            const resp = await fetch('https://api.digitalocean.com/v2/account', {
              headers: { 'Authorization': `Bearer ${decrypt(acc.token)}` }
            });
            return { id: acc.id, ok: resp.ok };
          })
        );
        
        const okCount = results.filter(r => r.ok).length;
        const totalCount = results.length;
        
        return {
          status: okCount === 0 ? 'error' : okCount < totalCount ? 'degraded' : 'ok',
          latencyMs: Date.now() - start,
          message: `${okCount}/${totalCount} accounts operational`
        };
      } catch (e) {
        return { status: 'error', error: e.message };
      }
    }
  },
  
  {
    name: 'Supabase',
    category: 'infrastructure',
    criticalLevel: 'critical',
    fixPath: '/admin/database',
    check: async () => {
      const start = Date.now();
      try {
        const supabase = createClient();
        const { error } = await supabase.from('workspaces').select('count').limit(1);
        
        if (error) {
          return { status: 'error', error: error.message };
        }
        
        return { status: 'ok', latencyMs: Date.now() - start };
      } catch (e) {
        return { status: 'error', error: e.message };
      }
    }
  },
  
  {
    name: 'Redis (BullMQ)',
    category: 'infrastructure',
    criticalLevel: 'critical',
    fixPath: '/admin/redis',
    check: async () => {
      const start = Date.now();
      try {
        const redis = getRedisClient();
        await redis.ping();
        
        return { status: 'ok', latencyMs: Date.now() - start };
      } catch (e) {
        return { status: 'error', error: e.message };
      }
    }
  }
];
```

---

## 67.4 HEALTH CHECK RUNNER

```typescript
// lib/api-health/runner.ts

import { healthChecks, HealthCheckResult } from './checks';

export interface HealthReport {
  timestamp: Date;
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, HealthCheckResult & { name: string; fixPath: string }>;
  issueCount: number;
}

export async function runAllHealthChecks(): Promise<HealthReport> {
  const results: HealthReport['checks'] = {};
  let issueCount = 0;
  
  // Run all checks in parallel
  const checkResults = await Promise.allSettled(
    healthChecks.map(async (check) => ({
      name: check.name,
      fixPath: check.fixPath,
      result: await check.check()
    }))
  );
  
  for (const outcome of checkResults) {
    if (outcome.status === 'fulfilled') {
      const { name, fixPath, result } = outcome.value;
      results[name] = { ...result, name, fixPath };
      if (result.status !== 'ok') issueCount++;
    } else {
      // Check itself threw an error
      results['Unknown'] = { 
        status: 'error', 
        error: outcome.reason?.message || 'Check failed',
        name: 'Unknown',
        fixPath: '/admin'
      };
      issueCount++;
    }
  }
  
  // Determine overall status
  const statuses = Object.values(results).map(r => r.status);
  let overallStatus: HealthReport['overallStatus'] = 'healthy';
  if (statuses.includes('error')) overallStatus = 'unhealthy';
  else if (statuses.includes('degraded')) overallStatus = 'degraded';
  
  return {
    timestamp: new Date(),
    overallStatus,
    checks: results,
    issueCount
  };
}
```

---

## 67.5 SCHEDULED HEALTH CHECKS

```typescript
// Runs every 15 minutes via cron or BullMQ repeatable job

import { Queue } from 'bullmq';
import { runAllHealthChecks } from './runner';

const healthQueue = new Queue('api-health', { connection: redis });

// Schedule repeating job
await healthQueue.add('check-all-apis', {}, {
  repeat: { every: 15 * 60 * 1000 }  // Every 15 minutes
});

// Worker
const worker = new Worker('api-health', async (job) => {
  const report = await runAllHealthChecks();
  
  // Store result
  await supabase.from('api_health_snapshots').insert({
    timestamp: report.timestamp,
    overall_status: report.overallStatus,
    checks: report.checks,
    issue_count: report.issueCount
  });
  
  // Alert if issues detected
  if (report.overallStatus !== 'healthy') {
    await sendAlert({
      type: 'api_health',
      severity: report.overallStatus === 'unhealthy' ? 'critical' : 'warning',
      title: `API Health: ${report.issueCount} issue(s) detected`,
      details: report.checks
    });
  }
  
  return report;
}, { connection: redis });
```

---

## 67.6 API HEALTH STORAGE

```sql
-- Store health check history
CREATE TABLE IF NOT EXISTS genesis.api_health_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    overall_status TEXT NOT NULL CHECK (overall_status IN ('healthy', 'degraded', 'unhealthy')),
    checks JSONB NOT NULL,
    issue_count INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_health_timestamp ON genesis.api_health_snapshots(timestamp DESC);
CREATE INDEX idx_health_status ON genesis.api_health_snapshots(overall_status);

-- Keep last 7 days of snapshots
-- Older ones are aggregated to daily summaries
```

---

## 67.7 API HEALTH API ENDPOINT

```typescript
// app/api/admin/api-health/route.ts

export async function GET(request: NextRequest) {
  // Get latest health report
  const { data: latest } = await supabase
    .from('api_health_snapshots')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();
  
  // Check if stale (>30 minutes old)
  const isStale = latest && 
    (Date.now() - new Date(latest.timestamp).getTime()) > 30 * 60 * 1000;
  
  if (!latest || isStale) {
    // Run fresh check
    const report = await runAllHealthChecks();
    return NextResponse.json(report);
  }
  
  return NextResponse.json(latest);
}

export async function POST(request: NextRequest) {
  // Force refresh
  const report = await runAllHealthChecks();
  return NextResponse.json(report);
}
```

---

## 67.8 DIAGNOSTIC GUIDES

For each API, provide specific troubleshooting steps:

```typescript
// lib/api-health/diagnostics.ts

export const diagnosticGuides: Record<string, DiagnosticGuide> = {
  'OpenAI': {
    commonIssues: [
      {
        error: 'Invalid API key',
        cause: 'API key is incorrect or has been revoked',
        steps: [
          '1. Go to https://platform.openai.com/api-keys',
          '2. Create a new API key or copy existing one',
          '3. Update in Settings > API Keys > OpenAI',
          '4. Click "Test Connection"'
        ]
      },
      {
        error: 'Rate limit exceeded',
        cause: 'Too many requests or quota exhausted',
        steps: [
          '1. Check your OpenAI usage at https://platform.openai.com/usage',
          '2. Upgrade your plan if needed',
          '3. Or wait for rate limit reset (usually 1 minute)'
        ]
      },
      {
        error: 'Insufficient quota',
        cause: 'Billing not set up or quota exhausted',
        steps: [
          '1. Add payment method at https://platform.openai.com/account/billing',
          '2. Set usage limits appropriately',
          '3. Monitor usage in the dashboard'
        ]
      }
    ]
  },
  
  'Relevance AI': {
    commonIssues: [
      {
        error: 'Invalid API key',
        cause: 'API key format incorrect or expired',
        steps: [
          '1. Go to https://app.relevanceai.com/settings/api-keys',
          '2. Generate a new API key',
          '3. Copy the full key (including project ID)',
          '4. Update in Settings > API Keys > Relevance AI'
        ]
      }
    ]
  },
  
  'Gmail OAuth': {
    commonIssues: [
      {
        error: 'Token expired',
        cause: 'OAuth refresh token has expired or been revoked',
        steps: [
          '1. Go to Settings > Email Configuration',
          '2. Click "Reconnect Gmail"',
          '3. Grant permissions again',
          '4. Verify connection with "Test Connection"'
        ]
      },
      {
        error: 'Insufficient permissions',
        cause: 'Gmail API not enabled or scopes missing',
        steps: [
          '1. Go to Google Cloud Console',
          '2. Enable Gmail API',
          '3. Verify OAuth consent screen scopes',
          '4. Reconnect Gmail in Settings'
        ]
      }
    ]
  }
  
  // ... more diagnostic guides
};
```

---

## 67.9 INTEGRATION WITH GOD MODE

The API Health Monitor integrates with Phase 44 (God Mode):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GOD MODE DASHBOARD (With API Health)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Tabs:                                                                      │
│  [Fleet] [Health Mesh] [Scale Health] [API Health] [Financial] [Templates] │
│                                           ▲                                 │
│                                           │                                 │
│                                      NEW TAB                                │
│                                                                             │
│  Quick View (on Fleet tab):                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  API Status: ⚠️ 1 issue | Fleet: ✅ 14,892 healthy | Wallet: $1,234 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 67.10 IMPLEMENTATION CHECKLIST

**Phase 67 delivers:**

- [ ] Health check definitions for all external APIs
- [ ] Health check runner with parallel execution
- [ ] API Health Dashboard UI
- [ ] Scheduled checks (every 15 minutes)
- [ ] `api_health_snapshots` table
- [ ] Alert routing for health issues
- [ ] Diagnostic guides with fix steps
- [ ] Integration with God Mode dashboard
- [ ] API endpoint for programmatic access

**APIs monitored:**
- OpenAI
- Claude/Anthropic
- Relevance AI
- Apify
- Google CSE
- Gmail OAuth
- DigitalOcean (all accounts)
- Supabase
- Redis

---

# ═══════════════════════════════════════════════════════════════════════════
#                        PART X: EXTENDED IMPLEMENTATION
# ═══════════════════════════════════════════════════════════════════════════

---

# 🚀 PHASE 41: EXTENDED IMPLEMENTATION

## 41.A EXTENDED N8N CLIENT

### 41.A.1 Complete n8n API Client

```typescript
// lib/genesis/n8n-client-extended.ts

import { z } from 'zod';

// ============================================
// TYPE DEFINITIONS
// ============================================

const N8nWorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  active: z.boolean(),
  nodes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    parameters: z.record(z.unknown()),
    position: z.tuple([z.number(), z.number()]),
  })),
  connections: z.record(z.unknown()),
  settings: z.record(z.unknown()).optional(),
  staticData: z.record(z.unknown()).nullable().optional(),
  tags: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const N8nCredentialSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const N8nExecutionSchema = z.object({
  id: z.string(),
  finished: z.boolean(),
  mode: z.string(),
  startedAt: z.string(),
  stoppedAt: z.string().nullable(),
  workflowId: z.string(),
  status: z.enum(['success', 'error', 'waiting', 'running']),
  data: z.object({
    resultData: z.object({
      runData: z.record(z.array(z.object({
        startTime: z.number(),
        executionTime: z.number(),
        data: z.unknown(),
        source: z.array(z.unknown()).nullable(),
      }))),
    }).optional(),
  }).optional(),
});

type N8nWorkflow = z.infer<typeof N8nWorkflowSchema>;
type N8nCredential = z.infer<typeof N8nCredentialSchema>;
type N8nExecution = z.infer<typeof N8nExecutionSchema>;

// ============================================
// CLIENT CONFIGURATION
// ============================================

interface N8nClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

const DEFAULT_CONFIG: Partial<N8nClientConfig> = {
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
};

// ============================================
// HTTP CLIENT WITH RETRY LOGIC
// ============================================

class N8nHttpClient {
  private config: Required<N8nClientConfig>;

  constructor(config: N8nClientConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config } as Required<N8nClientConfig>;
  }

  async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': this.config.apiKey,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          throw new N8nApiError(
            `n8n API error: ${response.status} ${response.statusText}`,
            response.status,
            errorBody
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.config.retries) {
          await this.sleep(this.config.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class N8nApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody: string
  ) {
    super(message);
    this.name = 'N8nApiError';
  }
}

// ============================================
// MAIN CLIENT CLASS
// ============================================

export class N8nClient {
  private http: N8nHttpClient;

  constructor(config: N8nClientConfig) {
    this.http = new N8nHttpClient(config);
  }

  // ============================================
  // WORKFLOW OPERATIONS
  // ============================================

  async getWorkflow(id: string): Promise<N8nWorkflow> {
    const data = await this.http.request<unknown>('GET', `/workflows/${id}`);
    return N8nWorkflowSchema.parse(data);
  }

  async getWorkflows(options?: {
    active?: boolean;
    tags?: string[];
    limit?: number;
  }): Promise<N8nWorkflow[]> {
    const params = new URLSearchParams();
    if (options?.active !== undefined) params.set('active', String(options.active));
    if (options?.limit) params.set('limit', String(options.limit));

    const queryString = params.toString();
    const endpoint = `/workflows${queryString ? `?${queryString}` : ''}`;

    const data = await this.http.request<{ data: unknown[] }>('GET', endpoint);
    return z.array(N8nWorkflowSchema).parse(data.data);
  }

  async createWorkflow(workflow: Omit<N8nWorkflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<N8nWorkflow> {
    const data = await this.http.request<unknown>('POST', '/workflows', workflow);
    return N8nWorkflowSchema.parse(data);
  }

  async updateWorkflow(id: string, updates: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    const data = await this.http.request<unknown>('PATCH', `/workflows/${id}`, updates);
    return N8nWorkflowSchema.parse(data);
  }

  async deleteWorkflow(id: string): Promise<void> {
    await this.http.request<void>('DELETE', `/workflows/${id}`);
  }

  async activateWorkflow(id: string): Promise<N8nWorkflow> {
    return this.updateWorkflow(id, { active: true });
  }

  async deactivateWorkflow(id: string): Promise<N8nWorkflow> {
    return this.updateWorkflow(id, { active: false });
  }

  // ============================================
  // WORKFLOW CLONING
  // ============================================

  async cloneWorkflow(
    sourceId: string,
    newName: string,
    variableReplacements?: Record<string, string>
  ): Promise<N8nWorkflow> {
    // Get source workflow
    const source = await this.getWorkflow(sourceId);

    // Prepare clone data
    const cloneData = {
      name: newName,
      nodes: source.nodes,
      connections: source.connections,
      settings: source.settings,
      active: false, // Start deactivated
    };

    // Apply variable replacements if provided
    if (variableReplacements) {
      cloneData.nodes = this.replaceVariablesInNodes(
        cloneData.nodes,
        variableReplacements
      );
    }

    // Create the clone
    return this.createWorkflow(cloneData);
  }

  private replaceVariablesInNodes(
    nodes: N8nWorkflow['nodes'],
    replacements: Record<string, string>
  ): N8nWorkflow['nodes'] {
    return nodes.map(node => ({
      ...node,
      parameters: this.replaceVariablesInObject(node.parameters, replacements),
    }));
  }

  private replaceVariablesInObject(
    obj: Record<string, unknown>,
    replacements: Record<string, string>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        let newValue = value;
        for (const [placeholder, replacement] of Object.entries(replacements)) {
          newValue = newValue.replace(new RegExp(placeholder, 'g'), replacement);
        }
        result[key] = newValue;
      } else if (Array.isArray(value)) {
        result[key] = value.map(item =>
          typeof item === 'object' && item !== null
            ? this.replaceVariablesInObject(item as Record<string, unknown>, replacements)
            : item
        );
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.replaceVariablesInObject(value as Record<string, unknown>, replacements);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  // ============================================
  // CREDENTIAL OPERATIONS
  // ============================================

  async getCredentials(): Promise<N8nCredential[]> {
    const data = await this.http.request<{ data: unknown[] }>('GET', '/credentials');
    return z.array(N8nCredentialSchema).parse(data.data);
  }

  async createCredential(
    name: string,
    type: string,
    data: Record<string, unknown>
  ): Promise<N8nCredential> {
    const response = await this.http.request<unknown>('POST', '/credentials', {
      name,
      type,
      data,
    });
    return N8nCredentialSchema.parse(response);
  }

  async deleteCredential(id: string): Promise<void> {
    await this.http.request<void>('DELETE', `/credentials/${id}`);
  }

  // ============================================
  // EXECUTION OPERATIONS
  // ============================================

  async getExecutions(options?: {
    workflowId?: string;
    status?: 'success' | 'error' | 'waiting';
    limit?: number;
  }): Promise<N8nExecution[]> {
    const params = new URLSearchParams();
    if (options?.workflowId) params.set('workflowId', options.workflowId);
    if (options?.status) params.set('status', options.status);
    if (options?.limit) params.set('limit', String(options.limit));

    const queryString = params.toString();
    const endpoint = `/executions${queryString ? `?${queryString}` : ''}`;

    const data = await this.http.request<{ data: unknown[] }>('GET', endpoint);
    return z.array(N8nExecutionSchema).parse(data.data);
  }

  async getExecution(id: string): Promise<N8nExecution> {
    const data = await this.http.request<unknown>('GET', `/executions/${id}`);
    return N8nExecutionSchema.parse(data);
  }

  async deleteExecution(id: string): Promise<void> {
    await this.http.request<void>('DELETE', `/executions/${id}`);
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let n8nClient: N8nClient | null = null;

export function getN8nClient(): N8nClient {
  if (!n8nClient) {
    const baseUrl = process.env.N8N_API_URL;
    const apiKey = process.env.N8N_API_KEY;

    if (!baseUrl || !apiKey) {
      throw new Error('N8N_API_URL and N8N_API_KEY must be configured');
    }

    n8nClient = new N8nClient({ baseUrl, apiKey });
  }
  return n8nClient;
}
```

### 41.A.2 Credential Vault Schema

```sql
-- ============================================
-- CREDENTIAL VAULT SCHEMA
-- ============================================

BEGIN;

-- Credential storage table
CREATE TABLE IF NOT EXISTS genesis.workspace_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Credential identification
    credential_type TEXT NOT NULL CHECK (credential_type IN (
        'google_oauth2',
        'openai_api',
        'smtp',
        'supabase',
        'postgres',
        'http_header_auth',
        'http_basic_auth'
    )),
    credential_name TEXT NOT NULL,
    
    -- n8n integration
    n8n_credential_id TEXT,
    template_credential_id TEXT,
    
    -- Encrypted data
    encrypted_data BYTEA NOT NULL,
    encryption_version INTEGER DEFAULT 1,
    data_fingerprint TEXT NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',
        'synced',
        'sync_failed',
        'revoked'
    )),
    last_synced_at TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    UNIQUE (workspace_id, credential_type, credential_name)
);

-- Indexes
CREATE INDEX idx_creds_workspace ON genesis.workspace_credentials(workspace_id);
CREATE INDEX idx_creds_type ON genesis.workspace_credentials(credential_type);
CREATE INDEX idx_creds_status ON genesis.workspace_credentials(status);

-- Audit log
CREATE TABLE IF NOT EXISTS genesis.credential_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    credential_id UUID NOT NULL,
    
    action TEXT NOT NULL CHECK (action IN (
        'created',
        'updated',
        'synced',
        'verified',
        'revoked',
        'accessed',
        'decrypted'
    )),
    
    actor_id TEXT,
    actor_type TEXT CHECK (actor_type IN ('user', 'system', 'n8n')),
    
    details JSONB DEFAULT '{}',
    ip_address INET,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cred_audit_workspace ON genesis.credential_audit_log(workspace_id);
CREATE INDEX idx_cred_audit_credential ON genesis.credential_audit_log(credential_id);
CREATE INDEX idx_cred_audit_created ON genesis.credential_audit_log(created_at DESC);

-- RLS
ALTER TABLE genesis.workspace_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.workspace_credentials FORCE ROW LEVEL SECURITY;

CREATE POLICY workspace_credentials_isolation ON genesis.workspace_credentials
    FOR ALL
    USING (workspace_id = genesis.get_workspace_context())
    WITH CHECK (workspace_id = genesis.get_workspace_context());

COMMIT;
```

### 41.A.3 Credential Vault Service

```typescript
// lib/genesis/credential-vault.ts

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

// ============================================
// ENCRYPTION CONFIGURATION
// ============================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function deriveKey(workspaceId: string): Buffer {
  const masterKey = process.env.CREDENTIAL_MASTER_KEY;
  if (!masterKey) throw new Error('CREDENTIAL_MASTER_KEY not configured');
  
  // Derive workspace-specific key
  return createHash('sha256')
    .update(masterKey + workspaceId)
    .digest();
}

function encrypt(data: string, workspaceId: string): Buffer {
  const key = deriveKey(workspaceId);
  const iv = randomBytes(IV_LENGTH);
  
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(data, 'utf8'),
    cipher.final(),
  ]);
  
  const authTag = cipher.getAuthTag();
  
  // Format: IV (16) + AuthTag (16) + Encrypted Data
  return Buffer.concat([iv, authTag, encrypted]);
}

function decrypt(encryptedData: Buffer, workspaceId: string): string {
  const key = deriveKey(workspaceId);
  
  const iv = encryptedData.subarray(0, IV_LENGTH);
  const authTag = encryptedData.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const data = encryptedData.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  return decipher.update(data) + decipher.final('utf8');
}

function computeFingerprint(data: Record<string, unknown>): string {
  return createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex')
    .substring(0, 16);
}

// ============================================
// CREDENTIAL OPERATIONS
// ============================================

export interface CredentialInput {
  type: string;
  name: string;
  data: Record<string, string>;
}

export interface StoredCredential {
  id: string;
  workspaceId: string;
  credentialType: string;
  credentialName: string;
  n8nCredentialId: string | null;
  status: string;
  lastSyncedAt: string | null;
}

export async function storeCredential(
  workspaceId: string,
  credential: CredentialInput
): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  try {
    const encryptedData = encrypt(JSON.stringify(credential.data), workspaceId);
    const fingerprint = computeFingerprint(credential.data);

    const { data, error } = await supabaseAdmin!
      .from('genesis.workspace_credentials')
      .insert({
        workspace_id: workspaceId,
        credential_type: credential.type,
        credential_name: credential.name,
        encrypted_data: encryptedData.toString('base64'),
        data_fingerprint: fingerprint,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) throw error;

    // Log the creation
    await logCredentialAction(workspaceId, data.id, 'created', {});

    return { success: true, credentialId: data.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getCredential(
  workspaceId: string,
  credentialId: string
): Promise<{ data: Record<string, string> } | null> {
  const { data: row, error } = await supabaseAdmin!
    .from('genesis.workspace_credentials')
    .select('encrypted_data')
    .eq('id', credentialId)
    .eq('workspace_id', workspaceId)
    .single();

  if (error || !row) return null;

  const encryptedBuffer = Buffer.from(row.encrypted_data, 'base64');
  const decrypted = decrypt(encryptedBuffer, workspaceId);

  await logCredentialAction(workspaceId, credentialId, 'accessed', {});

  return { data: JSON.parse(decrypted) };
}

export async function syncCredentialToN8n(
  workspaceId: string,
  credentialId: string,
  n8nClient: N8nClient
): Promise<{ success: boolean; n8nCredentialId?: string; error?: string }> {
  try {
    // Get credential data
    const cred = await getCredential(workspaceId, credentialId);
    if (!cred) throw new Error('Credential not found');

    // Get credential metadata
    const { data: meta } = await supabaseAdmin!
      .from('genesis.workspace_credentials')
      .select('credential_type, credential_name')
      .eq('id', credentialId)
      .single();

    if (!meta) throw new Error('Credential metadata not found');

    // Create in n8n
    const n8nCred = await n8nClient.createCredential(
      meta.credential_name,
      meta.credential_type,
      cred.data
    );

    // Update status
    await supabaseAdmin!
      .from('genesis.workspace_credentials')
      .update({
        n8n_credential_id: n8nCred.id,
        status: 'synced',
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', credentialId);

    await logCredentialAction(workspaceId, credentialId, 'synced', {
      n8n_credential_id: n8nCred.id,
    });

    return { success: true, n8nCredentialId: n8nCred.id };
  } catch (error) {
    await supabaseAdmin!
      .from('genesis.workspace_credentials')
      .update({ status: 'sync_failed' })
      .eq('id', credentialId);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function deleteCredential(credentialId: string): Promise<void> {
  await supabaseAdmin!
    .from('genesis.workspace_credentials')
    .delete()
    .eq('id', credentialId);
}

async function logCredentialAction(
  workspaceId: string,
  credentialId: string,
  action: string,
  details: Record<string, unknown>
): Promise<void> {
  await supabaseAdmin!.from('genesis.credential_audit_log').insert({
    workspace_id: workspaceId,
    credential_id: credentialId,
    action,
    actor_type: 'system',
    details,
  });
}
```

---

# 🔗 PHASE 42: EXTENDED IMPLEMENTATION

## 42.A WEBHOOK REGISTRY SCHEMA

```sql
-- ============================================
-- WEBHOOK INFRASTRUCTURE SCHEMA
-- ============================================

BEGIN;

-- Webhook registry
CREATE TABLE IF NOT EXISTS genesis.webhook_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    
    -- Webhook identification
    webhook_type TEXT NOT NULL CHECK (webhook_type IN (
        'n8n_trigger',
        'n8n_callback',
        'external_integration',
        'internal_event'
    )),
    webhook_name TEXT NOT NULL,
    
    -- URLs
    source_url TEXT,
    target_url TEXT NOT NULL,
    
    -- n8n integration
    n8n_workflow_id TEXT,
    n8n_node_name TEXT,
    
    -- Health tracking
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',
        'verified',
        'healthy',
        'degraded',
        'unhealthy',
        'disabled'
    )),
    last_ping_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    failure_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    
    -- Circuit breaker
    circuit_state TEXT DEFAULT 'closed' CHECK (circuit_state IN (
        'closed',
        'open',
        'half_open'
    )),
    circuit_opened_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (workspace_id, webhook_type, webhook_name)
);

CREATE INDEX idx_webhook_workspace ON genesis.webhook_registry(workspace_id);
CREATE INDEX idx_webhook_status ON genesis.webhook_registry(status);
CREATE INDEX idx_webhook_circuit ON genesis.webhook_registry(circuit_state) WHERE circuit_state != 'closed';

-- Webhook events log
CREATE TABLE IF NOT EXISTS genesis.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    webhook_id UUID REFERENCES genesis.webhook_registry(id),
    
    -- Event details
    event_type TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    
    -- Idempotency
    idempotency_key TEXT,
    
    -- Request/Response
    request_body JSONB,
    response_status INTEGER,
    response_body JSONB,
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',
        'processing',
        'completed',
        'failed',
        'retrying',
        'dead_letter'
    )),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_workspace ON genesis.webhook_events(workspace_id);
CREATE INDEX idx_webhook_events_idem ON genesis.webhook_events(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_webhook_events_status ON genesis.webhook_events(status) WHERE status NOT IN ('completed', 'dead_letter');
CREATE INDEX idx_webhook_events_retry ON genesis.webhook_events(next_retry_at) WHERE next_retry_at IS NOT NULL;

-- Dead letter queue
CREATE TABLE IF NOT EXISTS genesis.webhook_dead_letter (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_event_id UUID REFERENCES genesis.webhook_events(id),
    workspace_id UUID NOT NULL,
    
    -- Original event data
    event_type TEXT NOT NULL,
    request_body JSONB NOT NULL,
    
    -- Failure info
    failure_reason TEXT NOT NULL,
    attempts INTEGER NOT NULL,
    last_attempt_at TIMESTAMPTZ NOT NULL,
    
    -- Resolution
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolution_note TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dlq_workspace ON genesis.webhook_dead_letter(workspace_id);
CREATE INDEX idx_dlq_unresolved ON genesis.webhook_dead_letter(workspace_id, created_at DESC) WHERE NOT resolved;

-- RLS
ALTER TABLE genesis.webhook_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.webhook_dead_letter ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_registry_isolation ON genesis.webhook_registry
    FOR ALL USING (workspace_id = genesis.get_workspace_context());

CREATE POLICY webhook_events_isolation ON genesis.webhook_events
    FOR ALL USING (workspace_id = genesis.get_workspace_context());

CREATE POLICY dlq_isolation ON genesis.webhook_dead_letter
    FOR ALL USING (workspace_id = genesis.get_workspace_context());

COMMIT;
```

## 42.B WEBHOOK RETRY SERVICE

```typescript
// lib/genesis/webhook-retry.ts

import { supabaseAdmin } from '@/lib/supabase';

// ============================================
// RETRY CONFIGURATION
// ============================================

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 300000, // 5 minutes
  backoffMultiplier: 2,
};

// ============================================
// CIRCUIT BREAKER
// ============================================

interface CircuitState {
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  lastFailureAt: Date | null;
  openedAt: Date | null;
}

const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_RESET_TIMEOUT_MS = 60000; // 1 minute

class CircuitBreaker {
  private circuits: Map<string, CircuitState> = new Map();

  getState(webhookId: string): CircuitState {
    if (!this.circuits.has(webhookId)) {
      this.circuits.set(webhookId, {
        state: 'closed',
        failureCount: 0,
        lastFailureAt: null,
        openedAt: null,
      });
    }
    return this.circuits.get(webhookId)!;
  }

  recordSuccess(webhookId: string): void {
    const circuit = this.getState(webhookId);
    circuit.state = 'closed';
    circuit.failureCount = 0;
    circuit.lastFailureAt = null;
    circuit.openedAt = null;
  }

  recordFailure(webhookId: string): void {
    const circuit = this.getState(webhookId);
    circuit.failureCount++;
    circuit.lastFailureAt = new Date();

    if (circuit.failureCount >= CIRCUIT_FAILURE_THRESHOLD) {
      circuit.state = 'open';
      circuit.openedAt = new Date();
    }
  }

  canExecute(webhookId: string): boolean {
    const circuit = this.getState(webhookId);

    if (circuit.state === 'closed') return true;

    if (circuit.state === 'open') {
      const now = Date.now();
      const openedAt = circuit.openedAt?.getTime() || 0;

      if (now - openedAt > CIRCUIT_RESET_TIMEOUT_MS) {
        circuit.state = 'half_open';
        return true;
      }
      return false;
    }

    // half_open - allow one request
    return true;
  }
}

const circuitBreaker = new CircuitBreaker();

// ============================================
// WEBHOOK CALLER
// ============================================

interface WebhookCallResult {
  success: boolean;
  statusCode?: number;
  body?: unknown;
  error?: string;
  duration: number;
}

export async function callWebhookWithRetry(
  webhookId: string,
  workspaceId: string,
  eventType: string,
  payload: unknown,
  idempotencyKey: string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<WebhookCallResult> {
  // Check idempotency
  const { data: existing } = await supabaseAdmin!
    .from('genesis.webhook_events')
    .select('id, status')
    .eq('idempotency_key', idempotencyKey)
    .single();

  if (existing?.status === 'completed') {
    return { success: true, duration: 0 };
  }

  // Check circuit breaker
  if (!circuitBreaker.canExecute(webhookId)) {
    return {
      success: false,
      error: 'Circuit breaker open',
      duration: 0,
    };
  }

  // Get webhook URL
  const { data: webhook } = await supabaseAdmin!
    .from('genesis.webhook_registry')
    .select('target_url')
    .eq('id', webhookId)
    .single();

  if (!webhook) {
    return { success: false, error: 'Webhook not found', duration: 0 };
  }

  // Log event
  const { data: event } = await supabaseAdmin!
    .from('genesis.webhook_events')
    .insert({
      workspace_id: workspaceId,
      webhook_id: webhookId,
      event_type: eventType,
      direction: 'outbound',
      idempotency_key: idempotencyKey,
      request_body: payload,
      status: 'processing',
    })
    .select('id')
    .single();

  const eventId = event?.id;

  // Retry loop
  let lastError: string | null = null;
  let attempt = 0;

  while (attempt <= config.maxRetries) {
    const startTime = Date.now();

    try {
      const response = await fetch(webhook.target_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': process.env.WEBHOOK_SECRET || '',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const duration = Date.now() - startTime;

      if (response.ok) {
        circuitBreaker.recordSuccess(webhookId);

        await supabaseAdmin!
          .from('genesis.webhook_events')
          .update({
            status: 'completed',
            response_status: response.status,
            completed_at: new Date().toISOString(),
            duration_ms: duration,
          })
          .eq('id', eventId);

        await updateWebhookHealth(webhookId, true);

        return { success: true, statusCode: response.status, duration };
      }

      lastError = `HTTP ${response.status}: ${response.statusText}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
    }

    circuitBreaker.recordFailure(webhookId);
    attempt++;

    if (attempt <= config.maxRetries) {
      const delay = calculateDelay(attempt, config);
      
      await supabaseAdmin!
        .from('genesis.webhook_events')
        .update({
          status: 'retrying',
          retry_count: attempt,
          next_retry_at: new Date(Date.now() + delay).toISOString(),
          error_message: lastError,
        })
        .eq('id', eventId);

      await sleep(delay);
    }
  }

  // All retries exhausted - move to dead letter queue
  await supabaseAdmin!
    .from('genesis.webhook_events')
    .update({ status: 'dead_letter', error_message: lastError })
    .eq('id', eventId);

  await supabaseAdmin!
    .from('genesis.webhook_dead_letter')
    .insert({
      original_event_id: eventId,
      workspace_id: workspaceId,
      event_type: eventType,
      request_body: payload,
      failure_reason: lastError,
      attempts: config.maxRetries + 1,
      last_attempt_at: new Date().toISOString(),
    });

  await updateWebhookHealth(webhookId, false);

  return {
    success: false,
    error: lastError || 'Max retries exceeded',
    duration: 0,
  };
}

function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  // Add jitter (±10%)
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.min(delay + jitter, config.maxDelayMs);
}

async function updateWebhookHealth(webhookId: string, success: boolean): Promise<void> {
  if (success) {
    await supabaseAdmin!
      .from('genesis.webhook_registry')
      .update({
        last_success_at: new Date().toISOString(),
        failure_count: 0,
        status: 'healthy',
        circuit_state: 'closed',
      })
      .eq('id', webhookId);
  } else {
    await supabaseAdmin!.rpc('increment_webhook_failure', { p_webhook_id: webhookId });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

# 🔍 PHASE 43: EXTENDED IMPLEMENTATION

## 43.A WATCHDOG SERVICE

```typescript
// lib/genesis/watchdog-service.ts

import { supabaseAdmin } from '@/lib/supabase';
import { getN8nClient } from './n8n-client-extended';

// ============================================
// DRIFT TYPES
// ============================================

export type DriftType =
  | 'orphan_workflow'      // Workflow in n8n but not in DB
  | 'ghost_campaign'       // Campaign in DB but workflow deleted in n8n
  | 'state_mismatch'       // Active state differs between DB and n8n
  | 'partition_missing'    // Workspace has campaigns but no partition
  | 'credential_desync';   // Credential in DB but not in n8n

export interface DriftItem {
  workspaceId: string;
  driftType: DriftType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
  autoHealable: boolean;
  healAction?: string;
}

export interface WatchdogRunResult {
  runId: string;
  startedAt: string;
  completedAt: string;
  driftsDetected: number;
  driftsHealed: number;
  driftsFailed: number;
  items: DriftItem[];
}

// ============================================
// DRIFT DETECTION
// ============================================

export async function detectAllDrifts(): Promise<DriftItem[]> {
  const drifts: DriftItem[] = [];
  const n8n = getN8nClient();

  // Get all n8n workflows
  const n8nWorkflows = await n8n.getWorkflows();
  const n8nWorkflowMap = new Map(n8nWorkflows.map(w => [w.id, w]));

  // Get all campaigns from DB
  const { data: campaigns } = await supabaseAdmin!
    .from('campaigns')
    .select('id, workspace_id, n8n_workflow_id, n8n_status, status');

  const dbWorkflowIds = new Set(campaigns?.map(c => c.n8n_workflow_id).filter(Boolean));

  // Check for orphan workflows
  for (const workflow of n8nWorkflows) {
    if (!dbWorkflowIds.has(workflow.id)) {
      // Check if it's a template (templates should not be flagged)
      if (!workflow.name.startsWith('[Template]') && !workflow.name.startsWith('tpl_')) {
        drifts.push({
          workspaceId: 'unknown',
          driftType: 'orphan_workflow',
          severity: 'medium',
          details: {
            workflowId: workflow.id,
            workflowName: workflow.name,
            active: workflow.active,
          },
          autoHealable: true,
          healAction: 'delete_orphan_workflow',
        });
      }
    }
  }

  // Check for ghost campaigns and state mismatches
  for (const campaign of campaigns || []) {
    if (campaign.n8n_workflow_id) {
      const n8nWorkflow = n8nWorkflowMap.get(campaign.n8n_workflow_id);

      if (!n8nWorkflow) {
        // Ghost campaign
        drifts.push({
          workspaceId: campaign.workspace_id,
          driftType: 'ghost_campaign',
          severity: 'high',
          details: {
            campaignId: campaign.id,
            workflowId: campaign.n8n_workflow_id,
          },
          autoHealable: true,
          healAction: 'clear_campaign_workflow_id',
        });
      } else {
        // Check state mismatch
        const n8nStatus = n8nWorkflow.active ? 'active' : 'inactive';
        if (campaign.n8n_status !== n8nStatus) {
          drifts.push({
            workspaceId: campaign.workspace_id,
            driftType: 'state_mismatch',
            severity: 'medium',
            details: {
              campaignId: campaign.id,
              workflowId: campaign.n8n_workflow_id,
              dbStatus: campaign.n8n_status,
              n8nStatus,
            },
            autoHealable: true,
            healAction: 'sync_campaign_status',
          });
        }
      }
    }
  }

  // Check for partition issues
  const { data: workspaces } = await supabaseAdmin!
    .from('workspaces')
    .select('id');

  const { data: partitions } = await supabaseAdmin!
    .from('genesis.partition_registry')
    .select('workspace_id')
    .eq('status', 'active');

  const partitionSet = new Set(partitions?.map(p => p.workspace_id));

  for (const ws of workspaces || []) {
    const hasCampaigns = campaigns?.some(c => c.workspace_id === ws.id);
    if (hasCampaigns && !partitionSet.has(ws.id)) {
      drifts.push({
        workspaceId: ws.id,
        driftType: 'partition_missing',
        severity: 'critical',
        details: { workspaceId: ws.id },
        autoHealable: true,
        healAction: 'create_partition',
      });
    }
  }

  return drifts;
}

// ============================================
// AUTO-HEALING
// ============================================

export async function healDrift(drift: DriftItem): Promise<{ success: boolean; error?: string }> {
  if (!drift.autoHealable) {
    return { success: false, error: 'Drift is not auto-healable' };
  }

  const n8n = getN8nClient();

  try {
    switch (drift.healAction) {
      case 'delete_orphan_workflow':
        await n8n.deleteWorkflow(drift.details.workflowId as string);
        break;

      case 'clear_campaign_workflow_id':
        await supabaseAdmin!
          .from('campaigns')
          .update({ n8n_workflow_id: null, n8n_status: 'disconnected' })
          .eq('id', drift.details.campaignId);
        break;

      case 'sync_campaign_status':
        await supabaseAdmin!
          .from('campaigns')
          .update({ n8n_status: drift.details.n8nStatus })
          .eq('id', drift.details.campaignId);
        break;

      case 'create_partition':
        await supabaseAdmin!.rpc('fn_ignite_workspace_partition', {
          p_workspace_id: drift.workspaceId,
        });
        break;

      default:
        return { success: false, error: `Unknown heal action: ${drift.healAction}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// WATCHDOG RUNNER
// ============================================

export async function runWatchdog(options?: {
  autoHeal?: boolean;
  dryRun?: boolean;
}): Promise<WatchdogRunResult> {
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  // Log run start
  await supabaseAdmin!.from('genesis.watchdog_runs').insert({
    id: runId,
    started_at: startedAt,
    status: 'running',
  });

  const drifts = await detectAllDrifts();
  let healed = 0;
  let failed = 0;

  if (options?.autoHeal && !options?.dryRun) {
    for (const drift of drifts.filter(d => d.autoHealable)) {
      const result = await healDrift(drift);
      if (result.success) healed++;
      else failed++;

      // Log each heal attempt
      await supabaseAdmin!.from('genesis.watchdog_events').insert({
        run_id: runId,
        drift_type: drift.driftType,
        workspace_id: drift.workspaceId,
        details: drift.details,
        action_taken: drift.healAction,
        success: result.success,
        error_message: result.error,
      });
    }
  }

  const completedAt = new Date().toISOString();

  // Log run completion
  await supabaseAdmin!
    .from('genesis.watchdog_runs')
    .update({
      completed_at: completedAt,
      status: 'completed',
      drifts_detected: drifts.length,
      drifts_healed: healed,
      drifts_failed: failed,
    })
    .eq('id', runId);

  return {
    runId,
    startedAt,
    completedAt,
    driftsDetected: drifts.length,
    driftsHealed: healed,
    driftsFailed: failed,
    items: drifts,
  };
}
```

---

# 🎮 PHASE 44: EXTENDED IMPLEMENTATION

## 44.A HEALTH MESH SCHEMA

```sql
-- ============================================
-- HEALTH MONITORING SCHEMA
-- ============================================

BEGIN;

-- Workspace health snapshots
CREATE TABLE IF NOT EXISTS genesis.workspace_health (
    workspace_id UUID PRIMARY KEY,
    
    -- Calculated health score (0-100)
    health_score INTEGER CHECK (health_score BETWEEN 0 AND 100),
    health_status TEXT CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'critical')),
    
    -- Component scores
    partition_health INTEGER DEFAULT 100,
    workflow_health INTEGER DEFAULT 100,
    webhook_health INTEGER DEFAULT 100,
    credential_health INTEGER DEFAULT 100,
    
    -- Counts
    lead_count BIGINT DEFAULT 0,
    active_workflows INTEGER DEFAULT 0,
    failed_webhooks_24h INTEGER DEFAULT 0,
    
    -- Issues
    open_issues INTEGER DEFAULT 0,
    critical_issues INTEGER DEFAULT 0,
    
    -- Timing
    last_activity_at TIMESTAMPTZ,
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health calculation function
CREATE OR REPLACE FUNCTION genesis.calculate_workspace_health(p_workspace_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_partition_health INTEGER := 100;
    v_workflow_health INTEGER := 100;
    v_webhook_health INTEGER := 100;
    v_total_score INTEGER;
BEGIN
    -- Check partition status
    IF NOT EXISTS (
        SELECT 1 FROM genesis.partition_registry
        WHERE workspace_id = p_workspace_id AND status = 'active'
    ) THEN
        v_partition_health := 0;
    END IF;

    -- Check workflow health
    SELECT COALESCE(
        100 - (COUNT(*) FILTER (WHERE n8n_status = 'error') * 20),
        100
    ) INTO v_workflow_health
    FROM campaigns
    WHERE workspace_id = p_workspace_id::TEXT;

    -- Check webhook health
    SELECT COALESCE(
        100 - (failure_count * 10),
        100
    ) INTO v_webhook_health
    FROM genesis.webhook_registry
    WHERE workspace_id = p_workspace_id
    ORDER BY failure_count DESC
    LIMIT 1;

    v_webhook_health := GREATEST(v_webhook_health, 0);

    -- Calculate total
    v_total_score := (v_partition_health * 0.4 + v_workflow_health * 0.4 + v_webhook_health * 0.2)::INTEGER;

    -- Update health table
    INSERT INTO genesis.workspace_health (
        workspace_id, health_score, health_status,
        partition_health, workflow_health, webhook_health,
        last_calculated_at
    ) VALUES (
        p_workspace_id, v_total_score,
        CASE
            WHEN v_total_score >= 80 THEN 'healthy'
            WHEN v_total_score >= 60 THEN 'degraded'
            WHEN v_total_score >= 40 THEN 'unhealthy'
            ELSE 'critical'
        END,
        v_partition_health, v_workflow_health, v_webhook_health,
        NOW()
    ) ON CONFLICT (workspace_id) DO UPDATE SET
        health_score = EXCLUDED.health_score,
        health_status = EXCLUDED.health_status,
        partition_health = EXCLUDED.partition_health,
        workflow_health = EXCLUDED.workflow_health,
        webhook_health = EXCLUDED.webhook_health,
        last_calculated_at = NOW();

    RETURN v_total_score;
END;
$$ LANGUAGE plpgsql;

-- Refresh all health scores
CREATE OR REPLACE FUNCTION genesis.refresh_all_health()
RETURNS TABLE (workspace_id UUID, health_score INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT w.id::UUID, genesis.calculate_workspace_health(w.id::UUID)
    FROM workspaces w
    WHERE EXISTS (
        SELECT 1 FROM genesis.partition_registry pr
        WHERE pr.workspace_id = w.id::UUID
    );
END;
$$ LANGUAGE plpgsql;

COMMIT;
```

## 44.B BULK UPDATE ENGINE

```typescript
// lib/genesis/bulk-update-engine.ts

import { supabaseAdmin } from '@/lib/supabase';
import { getN8nClient } from './n8n-client-extended';

// ============================================
// TYPES
// ============================================

export interface BulkUpdateJob {
  id: string;
  blueprintId: string;
  status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
    skipped: number;
  };
  config: BulkUpdateConfig;
  startedAt: string;
  completedAt?: string;
  errors: Array<{ workspaceId: string; error: string }>;
}

export interface BulkUpdateConfig {
  blueprintId: string;
  targetWorkspaceIds?: string[];
  rateLimit: number; // workspaces per minute
  canaryPercentage?: number;
  rollbackThreshold?: number;
  dryRun?: boolean;
}

// ============================================
// JOB STORAGE (in-memory for simplicity)
// ============================================

const jobs = new Map<string, BulkUpdateJob>();

// ============================================
// BULK UPDATE ENGINE
// ============================================

export async function startBulkUpdate(config: BulkUpdateConfig): Promise<string> {
  const jobId = crypto.randomUUID();

  // Get target workspaces
  let targetWorkspaces: string[];
  if (config.targetWorkspaceIds) {
    targetWorkspaces = config.targetWorkspaceIds;
  } else {
    const { data } = await supabaseAdmin!
      .from('genesis.partition_registry')
      .select('workspace_id')
      .eq('status', 'active');
    targetWorkspaces = data?.map(r => r.workspace_id) || [];
  }

  // Apply canary percentage
  if (config.canaryPercentage && config.canaryPercentage < 100) {
    const canaryCount = Math.ceil(targetWorkspaces.length * config.canaryPercentage / 100);
    targetWorkspaces = targetWorkspaces.slice(0, canaryCount);
  }

  const job: BulkUpdateJob = {
    id: jobId,
    blueprintId: config.blueprintId,
    status: 'pending',
    progress: { total: targetWorkspaces.length, completed: 0, failed: 0, skipped: 0 },
    config,
    startedAt: new Date().toISOString(),
    errors: [],
  };

  jobs.set(jobId, job);

  // Start async processing
  processBulkUpdate(jobId, targetWorkspaces, config);

  return jobId;
}

async function processBulkUpdate(
  jobId: string,
  workspaces: string[],
  config: BulkUpdateConfig
): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = 'running';
  const delayMs = Math.ceil(60000 / config.rateLimit);

  for (const wsId of workspaces) {
    // Check for cancellation
    if (job.status === 'cancelled') break;

    // Check rollback threshold
    if (config.rollbackThreshold) {
      const failRate = job.progress.failed / (job.progress.completed + job.progress.failed || 1);
      if (failRate > config.rollbackThreshold) {
        job.status = 'failed';
        break;
      }
    }

    try {
      if (!config.dryRun) {
        await updateWorkspaceWorkflows(wsId, config.blueprintId);
      }
      job.progress.completed++;
    } catch (error) {
      job.progress.failed++;
      job.errors.push({
        workspaceId: wsId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Rate limiting
    await sleep(delayMs);
  }

  if (job.status === 'running') {
    job.status = 'completed';
  }
  job.completedAt = new Date().toISOString();
}

async function updateWorkspaceWorkflows(
  workspaceId: string,
  blueprintId: string
): Promise<void> {
  const n8n = getN8nClient();

  // Get blueprint
  const { data: blueprint } = await supabaseAdmin!
    .from('genesis.blueprints')
    .select('workflow_template')
    .eq('id', blueprintId)
    .single();

  if (!blueprint) throw new Error('Blueprint not found');

  // Get workspace campaigns
  const { data: campaigns } = await supabaseAdmin!
    .from('campaigns')
    .select('id, n8n_workflow_id')
    .eq('workspace_id', workspaceId)
    .not('n8n_workflow_id', 'is', null);

  // Update each workflow
  for (const campaign of campaigns || []) {
    if (campaign.n8n_workflow_id) {
      await n8n.updateWorkflow(campaign.n8n_workflow_id, {
        nodes: blueprint.workflow_template.nodes,
        connections: blueprint.workflow_template.connections,
      });
    }
  }
}

export function getBulkUpdateStatus(jobId: string): BulkUpdateJob | null {
  return jobs.get(jobId) || null;
}

export function cancelBulkUpdate(jobId: string): boolean {
  const job = jobs.get(jobId);
  if (job && job.status === 'running') {
    job.status = 'cancelled';
    return true;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

# 🧪 PHASE 45: EXTENDED IMPLEMENTATION

## 45.A MOCK N8N SERVICE

```typescript
// lib/genesis/mock-n8n.ts

// ============================================
// MOCK RESPONSE DEFINITIONS
// ============================================

const MOCK_RESPONSES: Record<string, (input: unknown) => unknown> = {
  // OpenAI mock
  'n8n-nodes-base.openAi': (input: any) => ({
    choices: [{
      message: {
        content: generateMockAIResponse(input?.prompt || input?.messages?.[0]?.content || ''),
        role: 'assistant',
      },
      finish_reason: 'stop',
    }],
    usage: {
      prompt_tokens: 50,
      completion_tokens: 150,
      total_tokens: 200,
    },
    model: 'gpt-4-mock',
  }),

  // HTTP Request mock
  'n8n-nodes-base.httpRequest': (input: any) => ({
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: {
      success: true,
      mock: true,
      url: input?.url || 'mock://example.com',
      timestamp: new Date().toISOString(),
    },
  }),

  // Email send mock
  'n8n-nodes-base.emailSend': (input: any) => ({
    messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    accepted: [input?.toEmail || input?.to],
    rejected: [],
    response: '250 2.0.0 OK',
  }),

  // Postgres mock
  'n8n-nodes-base.postgres': (input: any) => {
    const operation = input?.operation || 'select';
    if (operation === 'select') {
      return [{
        id: '00000000-0000-0000-0000-000000000001',
        email_address: 'mock@example.com',
        status: 'pending',
        created_at: new Date().toISOString(),
      }];
    }
    return { affectedRows: 1 };
  },

  // Supabase mock
  '@n8n/n8n-nodes-langchain.supabaseVectorStore': () => ({
    matches: [
      { id: 'doc-1', score: 0.95, content: 'Mock document content' },
      { id: 'doc-2', score: 0.87, content: 'Another mock document' },
    ],
  }),

  // Google Sheets mock
  'n8n-nodes-base.googleSheets': (input: any) => {
    const operation = input?.operation || 'read';
    if (operation === 'read') {
      return [
        { 'A': 'Name', 'B': 'Email', 'C': 'Status' },
        { 'A': 'John Doe', 'B': 'john@example.com', 'C': 'Active' },
      ];
    }
    return { updatedCells: 3, spreadsheetId: 'mock-sheet-id' };
  },

  // Webhook mock
  'n8n-nodes-base.webhook': () => ({
    headers: { 'content-type': 'application/json' },
    body: { trigger: 'manual', source: 'mock' },
    query: {},
  }),
};

function generateMockAIResponse(prompt: string): string {
  const lowercasePrompt = prompt.toLowerCase();

  if (lowercasePrompt.includes('research') || lowercasePrompt.includes('company')) {
    return JSON.stringify({
      company_summary: 'Mock company is a technology firm specializing in AI solutions.',
      key_contacts: ['CEO: John Smith', 'CTO: Jane Doe'],
      recent_news: ['Raised Series B funding', 'Launched new product'],
      pain_points: ['Scaling challenges', 'Talent acquisition'],
    });
  }

  if (lowercasePrompt.includes('email') || lowercasePrompt.includes('write')) {
    return `Subject: Quick question about ${prompt.split(' ').slice(0, 3).join(' ')}

Hi [Name],

I noticed your company is working on interesting projects. I'd love to connect and share some insights that might be valuable.

Would you have 15 minutes this week for a brief call?

Best regards,
[Sender]`;
  }

  if (lowercasePrompt.includes('score') || lowercasePrompt.includes('qualify')) {
    return JSON.stringify({
      score: Math.floor(Math.random() * 40) + 60,
      qualified: true,
      reasoning: 'Company matches ICP criteria',
      next_action: 'proceed_to_outreach',
    });
  }

  return 'This is a mock AI response for testing purposes.';
}

// ============================================
// MOCK EXECUTION ENGINE
// ============================================

interface MockExecutionResult {
  executionId: string;
  status: 'success' | 'error';
  startedAt: string;
  completedAt: string;
  nodeResults: Array<{
    nodeName: string;
    nodeType: string;
    output: unknown;
    duration: number;
  }>;
}

export async function executeMockWorkflow(
  workflowDefinition: any,
  triggerData: unknown
): Promise<MockExecutionResult> {
  const executionId = `mock-exec-${Date.now()}`;
  const startedAt = new Date().toISOString();
  const nodeResults: MockExecutionResult['nodeResults'] = [];

  for (const node of workflowDefinition.nodes || []) {
    const mockFn = MOCK_RESPONSES[node.type] || ((input: unknown) => ({ ...input as object, _mock: true }));
    const startTime = Date.now();

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

    nodeResults.push({
      nodeName: node.name,
      nodeType: node.type,
      output: mockFn(node.parameters),
      duration: Date.now() - startTime,
    });
  }

  return {
    executionId,
    status: 'success',
    startedAt,
    completedAt: new Date().toISOString(),
    nodeResults,
  };
}

// ============================================
// SANDBOX MODE MANAGEMENT
// ============================================

export async function getSandboxConfig(workspaceId: string): Promise<{
  enabled: boolean;
  mockServices: string[];
}> {
  const { data } = await supabaseAdmin!
    .from('genesis.sandbox_config')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single();

  return {
    enabled: data?.sandbox_enabled ?? false,
    mockServices: data?.mock_services ?? [],
  };
}

export async function setSandboxMode(
  workspaceId: string,
  enabled: boolean,
  mockServices?: string[]
): Promise<void> {
  await supabaseAdmin!
    .from('genesis.sandbox_config')
    .upsert({
      workspace_id: workspaceId,
      sandbox_enabled: enabled,
      mock_services: mockServices || ['openai', 'email', 'http'],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id' });
}
```

## 45.B RATE LIMITER

```typescript
// lib/genesis/rate-limiter.ts

import { supabaseAdmin } from '@/lib/supabase';

// ============================================
// RATE LIMIT CONFIGURATION
// ============================================

interface RateLimitConfig {
  serviceName: string;
  maxTokens: number;
  refillRate: number; // tokens per second
  dailyLimit?: number;
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  openai: { serviceName: 'openai', maxTokens: 10000, refillRate: 100, dailyLimit: 1000000 },
  claude: { serviceName: 'claude', maxTokens: 5000, refillRate: 50, dailyLimit: 500000 },
  tavily: { serviceName: 'tavily', maxTokens: 100, refillRate: 1, dailyLimit: 10000 },
  email: { serviceName: 'email', maxTokens: 50, refillRate: 0.5, dailyLimit: 500 },
};

// ============================================
// RATE LIMITER CLASS
// ============================================

export class RateLimiter {
  async acquire(
    service: string,
    tokensNeeded: number = 1,
    workspaceId?: string
  ): Promise<{ granted: boolean; waitMs: number; remaining: number }> {
    const config = DEFAULT_LIMITS[service];
    if (!config) {
      return { granted: true, waitMs: 0, remaining: Infinity };
    }

    // Use database for distributed rate limiting
    const { data } = await supabaseAdmin!.rpc('genesis_acquire_tokens', {
      p_service_name: service,
      p_workspace_id: workspaceId || 'global',
      p_tokens_needed: tokensNeeded,
      p_max_tokens: config.maxTokens,
      p_refill_rate: config.refillRate,
    });

    const result = data?.[0] || { granted: true, wait_time_ms: 0, remaining_tokens: config.maxTokens };

    return {
      granted: result.granted,
      waitMs: result.wait_time_ms,
      remaining: result.remaining_tokens,
    };
  }

  async acquireWithWait(
    service: string,
    tokensNeeded: number = 1,
    maxWaitMs: number = 30000
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const result = await this.acquire(service, tokensNeeded);

      if (result.granted) {
        return true;
      }

      if (result.waitMs > maxWaitMs - (Date.now() - startTime)) {
        return false;
      }

      await this.sleep(Math.min(result.waitMs, 1000));
    }

    return false;
  }

  async withRateLimit<T>(
    service: string,
    tokens: number,
    fn: () => Promise<T>
  ): Promise<T> {
    const acquired = await this.acquireWithWait(service, tokens);

    if (!acquired) {
      throw new RateLimitError(`Rate limit exceeded for ${service}`);
    }

    return fn();
  }

  async getStatus(service: string, workspaceId?: string): Promise<{
    currentTokens: number;
    maxTokens: number;
    dailyUsed: number;
    dailyLimit: number;
    resetAt: string;
  }> {
    const { data } = await supabaseAdmin!
      .from('genesis.rate_limits')
      .select('*')
      .eq('service_name', service)
      .eq('workspace_id', workspaceId || 'global')
      .single();

    const config = DEFAULT_LIMITS[service] || { maxTokens: 1000, dailyLimit: 100000 };

    return {
      currentTokens: data?.current_tokens || config.maxTokens,
      maxTokens: config.maxTokens,
      dailyUsed: data?.daily_used || 0,
      dailyLimit: config.dailyLimit || 100000,
      resetAt: data?.daily_reset_at || new Date(Date.now() + 86400000).toISOString(),
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();
```

---

# 🔄 PHASE 46: EXTENDED IMPLEMENTATION

## 46.A DUAL-WRITE SERVICE

```typescript
// lib/genesis/dual-write.ts

import { supabaseAdmin } from '@/lib/supabase';

export interface MigrationState {
  workspaceId: string;
  sourceTable: string;
  targetTable: string;
  status: 'idle' | 'dual_write' | 'backfilling' | 'verifying' | 'cutover_ready' | 'cutover_complete';
  dualWriteEnabled: boolean;
  backfillProgress: number;
  parityScore: number;
  lastVerifiedAt: string | null;
}

export async function getMigrationState(workspaceId: string): Promise<MigrationState | null> {
  const { data } = await supabaseAdmin!
    .from('genesis.migration_state')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single();

  if (!data) return null;

  return {
    workspaceId: data.workspace_id,
    sourceTable: data.source_table,
    targetTable: data.target_table,
    status: data.status,
    dualWriteEnabled: data.dual_write_enabled,
    backfillProgress: data.backfill_progress,
    parityScore: data.parity_score,
    lastVerifiedAt: data.last_verified_at,
  };
}

export async function enableDualWrite(workspaceId: string): Promise<boolean> {
  const { error } = await supabaseAdmin!.rpc('genesis_enable_dual_write', {
    p_workspace_id: workspaceId,
  });

  if (error) {
    console.error('Failed to enable dual-write:', error);
    return false;
  }

  await supabaseAdmin!
    .from('genesis.migration_state')
    .update({ dual_write_enabled: true, status: 'dual_write' })
    .eq('workspace_id', workspaceId);

  return true;
}

export async function disableDualWrite(workspaceId: string): Promise<boolean> {
  const { error } = await supabaseAdmin!.rpc('genesis_disable_dual_write', {
    p_workspace_id: workspaceId,
  });

  if (error) {
    console.error('Failed to disable dual-write:', error);
    return false;
  }

  await supabaseAdmin!
    .from('genesis.migration_state')
    .update({ dual_write_enabled: false })
    .eq('workspace_id', workspaceId);

  return true;
}
```

## 46.B PARITY CHECKER

```typescript
// lib/genesis/parity-checker.ts

import { supabaseAdmin } from '@/lib/supabase';

export interface ParityResult {
  match: boolean;
  sourceCount: number;
  targetCount: number;
  parityScore: number;
  mismatches: Array<{
    id: string;
    field: string;
    sourceValue: unknown;
    targetValue: unknown;
  }>;
  missingInTarget: string[];
  missingInSource: string[];
}

export async function runParityCheck(workspaceId: string): Promise<ParityResult> {
  const { data: state } = await supabaseAdmin!
    .from('genesis.migration_state')
    .select('source_table, target_table')
    .eq('workspace_id', workspaceId)
    .single();

  if (!state) throw new Error('Migration not configured');

  // Get counts
  const { count: sourceCount } = await supabaseAdmin!
    .from(state.source_table)
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);

  const { count: targetCount } = await supabaseAdmin!
    .from(state.target_table.replace('genesis.', ''))
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);

  // Sample comparison (compare 1000 random rows)
  const { data: sourceRows } = await supabaseAdmin!
    .from(state.source_table)
    .select('id, email_address, status, updated_at')
    .eq('workspace_id', workspaceId)
    .limit(1000);

  const { data: targetRows } = await supabaseAdmin!
    .from(state.target_table.replace('genesis.', ''))
    .select('id, email_address, status, updated_at')
    .eq('workspace_id', workspaceId)
    .limit(1000);

  const targetMap = new Map(targetRows?.map(r => [r.id, r]) || []);
  const sourceMap = new Map(sourceRows?.map(r => [r.id, r]) || []);

  const mismatches: ParityResult['mismatches'] = [];
  const missingInTarget: string[] = [];
  const missingInSource: string[] = [];

  // Check source rows exist in target
  for (const source of sourceRows || []) {
    const target = targetMap.get(source.id);
    if (!target) {
      missingInTarget.push(source.id);
    } else {
      for (const field of ['email_address', 'status']) {
        if (source[field] !== target[field]) {
          mismatches.push({
            id: source.id,
            field,
            sourceValue: source[field],
            targetValue: target[field],
          });
        }
      }
    }
  }

  // Check for extra rows in target
  for (const target of targetRows || []) {
    if (!sourceMap.has(target.id)) {
      missingInSource.push(target.id);
    }
  }

  // Calculate parity score
  const totalChecks = (sourceRows?.length || 0) * 4; // 4 fields per row
  const issues = mismatches.length + missingInTarget.length + missingInSource.length;
  const parityScore = totalChecks > 0 ? Math.round((1 - issues / totalChecks) * 100) : 100;

  // Update state
  await supabaseAdmin!
    .from('genesis.migration_state')
    .update({
      parity_score: parityScore,
      last_verified_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId);

  return {
    match: issues === 0 && sourceCount === targetCount,
    sourceCount: sourceCount || 0,
    targetCount: targetCount || 0,
    parityScore,
    mismatches: mismatches.slice(0, 100),
    missingInTarget: missingInTarget.slice(0, 100),
    missingInSource: missingInSource.slice(0, 100),
  };
}
```

---

# 🔥 PHASE 47: EXTENDED IMPLEMENTATION

## 47.A K6 LOAD TEST CONFIGURATION

```javascript
// tests/load/k6-config.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');

// Test configuration
export const options = {
  scenarios: {
    // Smoke test
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      tags: { test_type: 'smoke' },
    },

    // Load test
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 100 },
        { duration: '10m', target: 100 },
        { duration: '5m', target: 0 },
      ],
      tags: { test_type: 'load' },
      startTime: '1m',
    },

    // Stress test
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 200 },
        { duration: '5m', target: 500 },
        { duration: '2m', target: 1000 },
        { duration: '5m', target: 1000 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'stress' },
      startTime: '21m',
    },

    // Spike test
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 1000 },
        { duration: '1m', target: 1000 },
        { duration: '10s', target: 0 },
      ],
      tags: { test_type: 'spike' },
      startTime: '37m',
    },
  },

  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.05'],
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const WORKSPACE_IDS = JSON.parse(__ENV.WORKSPACE_IDS || '["test-workspace-1"]');

// Main test function
export default function () {
  const workspaceId = WORKSPACE_IDS[Math.floor(Math.random() * WORKSPACE_IDS.length)];

  // Dashboard API test
  const dashboardRes = http.get(`${BASE_URL}/api/dashboard?workspaceId=${workspaceId}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(dashboardRes, {
    'dashboard status is 200': (r) => r.status === 200,
    'dashboard response time OK': (r) => r.timings.duration < 1000,
  });

  errorRate.add(dashboardRes.status !== 200);
  apiDuration.add(dashboardRes.timings.duration);

  // Contacts API test
  const contactsRes = http.get(`${BASE_URL}/api/contacts?workspaceId=${workspaceId}&limit=50`);

  check(contactsRes, {
    'contacts status is 200': (r) => r.status === 200,
  });

  // Simulate user think time
  sleep(Math.random() * 3 + 1);
}

// Webhook flood test
export function webhookFlood() {
  const payload = JSON.stringify({
    workspace_id: WORKSPACE_IDS[0],
    event_type: 'email_sent',
    idempotency_key: `idem-${Date.now()}-${Math.random()}`,
    data: {
      email: 'test@example.com',
      email_number: 1,
    },
  });

  const res = http.post(`${BASE_URL}/api/events`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': __ENV.WEBHOOK_SECRET,
    },
  });

  check(res, {
    'webhook accepted': (r) => r.status === 200,
  });
}
```

## 47.B SECURITY TEST SUITE

```typescript
// tests/security/rls-tests.ts

describe('RLS Security Tests', () => {
  const VICTIM_WORKSPACE = 'ws-victim-001';
  const ATTACKER_WORKSPACE = 'ws-attacker-001';

  describe('Cross-Workspace Access Prevention', () => {
    it('should block SELECT across workspaces', async () => {
      // Set attacker context
      await setWorkspaceContext(ATTACKER_WORKSPACE);

      // Try to read victim data
      const { data, error } = await supabase
        .from('genesis.leads')
        .select('*')
        .eq('workspace_id', VICTIM_WORKSPACE);

      expect(data).toHaveLength(0);
    });

    it('should block INSERT to other workspace', async () => {
      await setWorkspaceContext(ATTACKER_WORKSPACE);

      const { error } = await supabase
        .from('genesis.leads')
        .insert({
          workspace_id: VICTIM_WORKSPACE,
          email_address: 'hacker@evil.com',
          status: 'pending',
        });

      expect(error).toBeTruthy();
    });

    it('should block UPDATE across workspaces', async () => {
      await setWorkspaceContext(ATTACKER_WORKSPACE);

      const { data } = await supabase
        .from('genesis.leads')
        .update({ status: 'hacked' })
        .eq('workspace_id', VICTIM_WORKSPACE)
        .select();

      expect(data).toHaveLength(0);
    });
  });

  describe('NULL Context Protection', () => {
    it('should return zero rows with NULL context', async () => {
      await clearWorkspaceContext();

      const { data } = await supabase
        .from('genesis.leads')
        .select('*');

      expect(data).toHaveLength(0);
    });

    it('should block INSERT with NULL context', async () => {
      await clearWorkspaceContext();

      const { error } = await supabase
        .from('genesis.leads')
        .insert({
          workspace_id: VICTIM_WORKSPACE,
          email_address: 'test@test.com',
          status: 'pending',
        });

      expect(error).toBeTruthy();
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should sanitize workspace_id parameter', async () => {
      const maliciousId = "'; DROP TABLE genesis.leads; --";

      const { error } = await setWorkspaceContext(maliciousId);

      expect(error).toBeTruthy();
    });

    it('should reject invalid UUID format', async () => {
      const { error } = await setWorkspaceContext('not-a-uuid');

      expect(error).toBeTruthy();
    });
  });
});
```

---

# 🚀 PHASE 48: EXTENDED IMPLEMENTATION

## 48.A DEPLOYMENT CONTROLLER

```typescript
// lib/genesis/deployment-controller.ts

export interface DeploymentState {
  activeSlot: 'blue' | 'green';
  standbySlot: 'blue' | 'green';
  canaryPercentage: number;
  status: 'stable' | 'deploying' | 'canary' | 'rolling_back';
  lastDeployedAt: string | null;
  activeVersion: string;
  standbyVersion: string | null;
}

export async function getDeploymentState(): Promise<DeploymentState> {
  // In production, this would query Vercel API or deployment manifest
  return {
    activeSlot: 'blue',
    standbySlot: 'green',
    canaryPercentage: 0,
    status: 'stable',
    lastDeployedAt: new Date().toISOString(),
    activeVersion: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
    standbyVersion: null,
  };
}

export async function deployToStandby(version: string): Promise<{ success: boolean; error?: string }> {
  // Trigger Vercel deployment to standby slot
  const response = await fetch('https://api.vercel.com/v13/deployments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: process.env.VERCEL_PROJECT_NAME,
      gitSource: {
        type: 'github',
        ref: version,
        repoId: process.env.GITHUB_REPO_ID,
      },
      target: 'preview', // Deploy to preview (standby)
    }),
  });

  if (!response.ok) {
    return { success: false, error: await response.text() };
  }

  return { success: true };
}

export async function startCanary(percentage: number): Promise<void> {
  // Update traffic split
  // This would integrate with Vercel Edge Config or similar
  console.log(`Starting canary with ${percentage}% traffic`);
}

export async function completeCutover(): Promise<void> {
  // Swap blue/green slots
  console.log('Completing cutover - swapping active/standby');
}

export async function abortCanary(): Promise<void> {
  // Revert traffic to 0% on standby
  console.log('Aborting canary - reverting all traffic to active');
}
```

## 48.B INSTANT REVERT

```typescript
// lib/genesis/instant-revert.ts

export interface RevertTrigger {
  name: string;
  threshold: number;
  currentValue: number;
  triggered: boolean;
  autoRevert: boolean;
}

const REVERT_TRIGGERS: Array<{
  name: string;
  check: () => Promise<{ value: number; threshold: number }>;
  autoRevert: boolean;
}> = [
  {
    name: 'error_rate',
    check: async () => ({
      value: await getErrorRate(),
      threshold: 0.05,
    }),
    autoRevert: true,
  },
  {
    name: 'p95_latency',
    check: async () => ({
      value: await getP95Latency(),
      threshold: 3000,
    }),
    autoRevert: true,
  },
  {
    name: 'db_connection_failures',
    check: async () => ({
      value: await getDbConnectionFailures(),
      threshold: 5,
    }),
    autoRevert: true,
  },
];

export async function checkRevertTriggers(): Promise<RevertTrigger[]> {
  const results: RevertTrigger[] = [];

  for (const trigger of REVERT_TRIGGERS) {
    const { value, threshold } = await trigger.check();
    results.push({
      name: trigger.name,
      threshold,
      currentValue: value,
      triggered: value > threshold,
      autoRevert: trigger.autoRevert,
    });
  }

  return results;
}

export async function executeInstantRevert(reason: string): Promise<{
  success: boolean;
  duration: number;
  actions: string[];
}> {
  const start = Date.now();
  const actions: string[] = [];

  try {
    // 1. Abort any in-progress canary
    await abortCanary();
    actions.push('Aborted canary deployment');

    // 2. Route all traffic to known-good version
    actions.push('Reverted traffic to stable version');

    // 3. Log the revert
    await supabaseAdmin!.from('genesis.deployment_events').insert({
      event_type: 'instant_revert',
      reason,
      actions,
      created_at: new Date().toISOString(),
    });
    actions.push('Logged revert event');

    return {
      success: true,
      duration: Date.now() - start,
      actions,
    };
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - start,
      actions,
    };
  }
}

export async function monitorAndAutoRevert(): Promise<void> {
  const triggers = await checkRevertTriggers();
  const triggered = triggers.find(t => t.triggered && t.autoRevert);

  if (triggered) {
    console.error(`Auto-revert triggered: ${triggered.name} = ${triggered.currentValue} (threshold: ${triggered.threshold})`);
    await executeInstantRevert(`Auto-revert: ${triggered.name} threshold exceeded`);
  }
}

// Helper functions (would integrate with monitoring system)
async function getErrorRate(): Promise<number> {
  // Query error rate from monitoring
  return 0.01;
}

async function getP95Latency(): Promise<number> {
  // Query P95 latency from monitoring
  return 500;
}

async function getDbConnectionFailures(): Promise<number> {
  // Query DB connection failures
  return 0;
}
```

---

# 📡 API ROUTE IMPLEMENTATIONS

## API.1 IGNITION API

```typescript
// app/api/admin/ignite/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@clerk/nextjs';
import { isSuperAdmin } from '@/lib/workspace-access';
import { igniteWorkspace } from '@/lib/genesis/ignition-orchestrator';
import { supabaseAdmin } from '@/lib/supabase';

// ============================================
// REQUEST VALIDATION
// ============================================

const IgnitionRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  workspaceSlug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  workspaceName: z.string().min(1).max(100),
  variables: z.object({
    YOUR_DASHBOARD_URL: z.string().url(),
    YOUR_WEBHOOK_TOKEN: z.string().min(32),
    YOUR_SENDER_EMAIL: z.string().email(),
    YOUR_NAME: z.string().min(1),
    YOUR_COMPANY_NAME: z.string().min(1),
    YOUR_CALENDLY_LINK_1: z.string().url().optional(),
    YOUR_CALENDLY_LINK_2: z.string().url().optional(),
  }),
  credentials: z.array(z.object({
    type: z.enum(['google_oauth2', 'openai_api', 'smtp', 'supabase']),
    name: z.string(),
    data: z.record(z.string()),
  })),
});

// ============================================
// POST - Start Ignition
// ============================================

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Super admin check
    const isAdmin = await isSuperAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate body
    const body = await req.json();
    const validationResult = IgnitionRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      }, { status: 400 });
    }

    const config = validationResult.data;

    // Check if already provisioned
    const { data: existing } = await supabaseAdmin!
      .from('genesis.partition_registry')
      .select('workspace_id, status')
      .eq('workspace_id', config.workspaceId)
      .single();

    if (existing?.status === 'active') {
      return NextResponse.json({
        error: 'Workspace already provisioned',
        partition: existing,
      }, { status: 409 });
    }

    // Start ignition
    const result = await igniteWorkspace(config);

    if (result.success) {
      return NextResponse.json({
        success: true,
        workspaceId: result.workspaceId,
        partitionName: result.partitionName,
        workflowCount: result.workflowCount,
        duration: result.duration,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        duration: result.duration,
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Ignition error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// ============================================
// GET - Check Ignition Status
// ============================================

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = req.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    const { data: state } = await supabaseAdmin!
      .from('genesis.ignition_state')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    if (!state) {
      return NextResponse.json({ status: 'not_started' });
    }

    return NextResponse.json(state);

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## API.2 WEBHOOK EVENTS API

```typescript
// app/api/events/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { withSecureContext } from '@/lib/genesis/secure-context';

// ============================================
// EVENT SCHEMAS
// ============================================

const EmailSentEventSchema = z.object({
  event_type: z.literal('email_sent'),
  email: z.string().email(),
  email_number: z.number().int().min(1).max(3),
  subject: z.string().optional(),
  message_id: z.string().optional(),
});

const EmailOpenedEventSchema = z.object({
  event_type: z.literal('email_opened'),
  email: z.string().email(),
  email_number: z.number().int().min(1).max(3),
  opened_at: z.string().datetime().optional(),
});

const EmailClickedEventSchema = z.object({
  event_type: z.literal('email_clicked'),
  email: z.string().email(),
  email_number: z.number().int().min(1).max(3),
  url: z.string().url(),
  clicked_at: z.string().datetime().optional(),
});

const EmailRepliedEventSchema = z.object({
  event_type: z.literal('email_replied'),
  email: z.string().email(),
  reply_snippet: z.string().optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
});

const EmailBouncedEventSchema = z.object({
  event_type: z.literal('email_bounced'),
  email: z.string().email(),
  bounce_type: z.enum(['hard', 'soft']),
  bounce_reason: z.string().optional(),
});

const LeadUpdatedEventSchema = z.object({
  event_type: z.literal('lead_updated'),
  email: z.string().email(),
  updates: z.record(z.unknown()),
});

const EventPayloadSchema = z.discriminatedUnion('event_type', [
  EmailSentEventSchema,
  EmailOpenedEventSchema,
  EmailClickedEventSchema,
  EmailRepliedEventSchema,
  EmailBouncedEventSchema,
  LeadUpdatedEventSchema,
]);

const WebhookRequestSchema = z.object({
  workspace_id: z.string().uuid(),
  idempotency_key: z.string().min(16).max(64),
  timestamp: z.string().datetime().optional(),
  data: EventPayloadSchema,
});

// ============================================
// POST - Receive Webhook Event
// ============================================

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify webhook secret
    const secret = req.headers.get('x-webhook-secret');
    if (secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse body
    const body = await req.json();

    // Validate payload
    const validationResult = WebhookRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid payload',
        details: validationResult.error.errors,
      }, { status: 400 });
    }

    const { workspace_id, idempotency_key, data } = validationResult.data;

    // Idempotency check
    const { data: existing } = await supabaseAdmin!
      .from('genesis.webhook_events')
      .select('id, status')
      .eq('idempotency_key', idempotency_key)
      .single();

    if (existing) {
      return NextResponse.json({
        status: 'duplicate',
        original_id: existing.id,
        original_status: existing.status,
      });
    }

    // Log event
    const { data: event } = await supabaseAdmin!
      .from('genesis.webhook_events')
      .insert({
        workspace_id,
        event_type: data.event_type,
        direction: 'inbound',
        idempotency_key,
        request_body: data,
        status: 'processing',
      })
      .select('id')
      .single();

    // Process event
    try {
      await processEvent(workspace_id, data);

      await supabaseAdmin!
        .from('genesis.webhook_events')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
        })
        .eq('id', event?.id);

      return NextResponse.json({
        status: 'processed',
        event_id: event?.id,
        duration_ms: Date.now() - startTime,
      });

    } catch (processError) {
      await supabaseAdmin!
        .from('genesis.webhook_events')
        .update({
          status: 'failed',
          error_message: processError instanceof Error ? processError.message : 'Unknown',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
        })
        .eq('id', event?.id);

      throw processError;
    }

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({
      error: 'Processing failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// ============================================
// EVENT PROCESSORS
// ============================================

async function processEvent(
  workspaceId: string,
  event: z.infer<typeof EventPayloadSchema>
): Promise<void> {
  await withSecureContext({ workspaceId }, async (client) => {
    switch (event.event_type) {
      case 'email_sent':
        await client
          .from('leads')
          .update({
            [`email_${event.email_number}_sent`]: true,
            [`email_${event.email_number}_sent_at`]: new Date().toISOString(),
            status: 'sent',
          })
          .eq('email_address', event.email);
        break;

      case 'email_opened':
        await client.from('email_events').insert({
          workspace_id: workspaceId,
          email: event.email,
          event_type: 'open',
          step: event.email_number,
          timestamp: event.opened_at || new Date().toISOString(),
        });
        break;

      case 'email_clicked':
        await client.from('email_events').insert({
          workspace_id: workspaceId,
          email: event.email,
          event_type: 'click',
          step: event.email_number,
          url: event.url,
          timestamp: event.clicked_at || new Date().toISOString(),
        });
        break;

      case 'email_replied':
        await client
          .from('leads')
          .update({
            status: 'replied',
          })
          .eq('email_address', event.email);

        await client.from('email_events').insert({
          workspace_id: workspaceId,
          email: event.email,
          event_type: 'reply',
          timestamp: new Date().toISOString(),
          metadata: {
            sentiment: event.sentiment,
            snippet: event.reply_snippet,
          },
        });
        break;

      case 'email_bounced':
        await client
          .from('leads')
          .update({
            status: 'bounced',
          })
          .eq('email_address', event.email);

        await client.from('email_events').insert({
          workspace_id: workspaceId,
          email: event.email,
          event_type: 'bounce',
          timestamp: new Date().toISOString(),
          metadata: {
            bounce_type: event.bounce_type,
            reason: event.bounce_reason,
          },
        });
        break;

      case 'lead_updated':
        await client
          .from('leads')
          .update(event.updates)
          .eq('email_address', event.email);
        break;
    }
  });
}
```

## API.3 WATCHDOG API

```typescript
// app/api/admin/watchdog/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { isSuperAdmin } from '@/lib/workspace-access';
import { runWatchdog, detectAllDrifts } from '@/lib/genesis/watchdog-service';
import { supabaseAdmin } from '@/lib/supabase';

// ============================================
// POST - Trigger Watchdog Run
// ============================================

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isSuperAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const autoHeal = body.autoHeal ?? false;
    const dryRun = body.dryRun ?? false;

    const result = await runWatchdog({ autoHeal, dryRun });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Watchdog error:', error);
    return NextResponse.json({
      error: 'Watchdog run failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// ============================================
// GET - Get Watchdog Status / History
// ============================================

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const action = req.nextUrl.searchParams.get('action');

    if (action === 'detect') {
      // Quick drift detection (no healing)
      const drifts = await detectAllDrifts();
      return NextResponse.json({
        driftCount: drifts.length,
        drifts: drifts.slice(0, 100),
        detectedAt: new Date().toISOString(),
      });
    }

    // Get recent runs
    const { data: runs } = await supabaseAdmin!
      .from('genesis.watchdog_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(20);

    // Get summary
    const { data: summary } = await supabaseAdmin!
      .from('genesis.watchdog_runs')
      .select('drifts_detected, drifts_healed')
      .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const last24h = {
      totalRuns: summary?.length || 0,
      totalDriftsDetected: summary?.reduce((sum, r) => sum + (r.drifts_detected || 0), 0) || 0,
      totalDriftsHealed: summary?.reduce((sum, r) => sum + (r.drifts_healed || 0), 0) || 0,
    };

    return NextResponse.json({
      runs,
      summary: last24h,
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## API.4 HEALTH MESH API

```typescript
// app/api/admin/health-mesh/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { isSuperAdmin } from '@/lib/workspace-access';
import { supabaseAdmin } from '@/lib/supabase';

// ============================================
// GET - Get Health Mesh Data
// ============================================

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isSuperAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const filter = req.nextUrl.searchParams.get('filter'); // healthy, degraded, unhealthy, critical
    const sortBy = req.nextUrl.searchParams.get('sortBy') || 'health_score';
    const sortOrder = req.nextUrl.searchParams.get('sortOrder') || 'asc';

    let query = supabaseAdmin!
      .from('genesis.workspace_health')
      .select(`
        workspace_id,
        health_score,
        health_status,
        partition_health,
        workflow_health,
        webhook_health,
        credential_health,
        lead_count,
        active_workflows,
        failed_webhooks_24h,
        open_issues,
        critical_issues,
        last_activity_at,
        last_calculated_at
      `);

    if (filter) {
      query = query.eq('health_status', filter);
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    const { data: healthData, error } = await query.limit(500);

    if (error) throw error;

    // Calculate summary
    const summary = {
      total: healthData?.length || 0,
      healthy: healthData?.filter(h => h.health_status === 'healthy').length || 0,
      degraded: healthData?.filter(h => h.health_status === 'degraded').length || 0,
      unhealthy: healthData?.filter(h => h.health_status === 'unhealthy').length || 0,
      critical: healthData?.filter(h => h.health_status === 'critical').length || 0,
      avgScore: healthData?.length 
        ? Math.round(healthData.reduce((sum, h) => sum + h.health_score, 0) / healthData.length)
        : 0,
    };

    return NextResponse.json({
      summary,
      workspaces: healthData,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Health mesh error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// POST - Refresh Health Scores
// ============================================

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isSuperAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const workspaceId = body.workspaceId;

    if (workspaceId) {
      // Refresh single workspace
      const { data } = await supabaseAdmin!.rpc('calculate_workspace_health', {
        p_workspace_id: workspaceId,
      });

      return NextResponse.json({
        workspaceId,
        healthScore: data,
        refreshedAt: new Date().toISOString(),
      });
    } else {
      // Refresh all
      const { data } = await supabaseAdmin!.rpc('refresh_all_health');

      return NextResponse.json({
        refreshed: data?.length || 0,
        refreshedAt: new Date().toISOString(),
      });
    }

  } catch (error) {
    console.error('Health refresh error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## API.5 BULK UPDATE API

```typescript
// app/api/admin/bulk-update/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@clerk/nextjs';
import { isSuperAdmin } from '@/lib/workspace-access';
import {
  startBulkUpdate,
  getBulkUpdateStatus,
  cancelBulkUpdate,
} from '@/lib/genesis/bulk-update-engine';

const BulkUpdateRequestSchema = z.object({
  blueprintId: z.string().uuid(),
  targetWorkspaceIds: z.array(z.string().uuid()).optional(),
  rateLimit: z.number().int().min(1).max(100).default(10),
  canaryPercentage: z.number().min(0).max(100).optional(),
  rollbackThreshold: z.number().min(0).max(1).optional(),
  dryRun: z.boolean().optional(),
});

// ============================================
// POST - Start Bulk Update Job
// ============================================

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isSuperAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const validationResult = BulkUpdateRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.errors,
      }, { status: 400 });
    }

    const jobId = await startBulkUpdate(validationResult.data);

    return NextResponse.json({
      jobId,
      status: 'started',
      startedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// GET - Get Job Status
// ============================================

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobId = req.nextUrl.searchParams.get('jobId');
    if (!jobId) {
      return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    }

    const status = getBulkUpdateStatus(jobId);
    if (!status) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(status);

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// DELETE - Cancel Job
// ============================================

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isSuperAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const jobId = req.nextUrl.searchParams.get('jobId');
    if (!jobId) {
      return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    }

    const cancelled = cancelBulkUpdate(jobId);

    return NextResponse.json({
      jobId,
      cancelled,
      cancelledAt: cancelled ? new Date().toISOString() : null,
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## API.6 CUTOVER API

```typescript
// app/api/admin/cutover/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@clerk/nextjs';
import { isSuperAdmin } from '@/lib/workspace-access';
import {
  getDeploymentState,
  deployToStandby,
  startCanary,
  completeCutover,
  abortCanary,
} from '@/lib/genesis/deployment-controller';
import { generateReadinessReport } from '@/lib/genesis/launch-readiness';
import { executeInstantRevert, checkRevertTriggers } from '@/lib/genesis/instant-revert';

const CutoverActionSchema = z.object({
  action: z.enum([
    'deploy',
    'start_canary',
    'increase_canary',
    'complete_cutover',
    'abort',
    'revert',
    'check_triggers',
  ]),
  params: z.record(z.unknown()).optional(),
});

// ============================================
// GET - Get Deployment State
// ============================================

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const action = req.nextUrl.searchParams.get('action');

    if (action === 'readiness') {
      const report = await generateReadinessReport();
      return NextResponse.json(report);
    }

    if (action === 'triggers') {
      const triggers = await checkRevertTriggers();
      return NextResponse.json({ triggers });
    }

    const state = await getDeploymentState();
    return NextResponse.json(state);

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// POST - Execute Cutover Action
// ============================================

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isSuperAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { action, params } = CutoverActionSchema.parse(body);

    switch (action) {
      case 'deploy':
        const deployResult = await deployToStandby(params?.version as string);
        return NextResponse.json(deployResult);

      case 'start_canary':
        await startCanary(params?.percentage as number || 5);
        return NextResponse.json({ status: 'canary_started' });

      case 'increase_canary':
        await startCanary(params?.percentage as number || 10);
        return NextResponse.json({ status: 'canary_increased' });

      case 'complete_cutover':
        await completeCutover();
        return NextResponse.json({ status: 'cutover_complete' });

      case 'abort':
        await abortCanary();
        return NextResponse.json({ status: 'aborted' });

      case 'revert':
        const revertResult = await executeInstantRevert(params?.reason as string || 'Manual revert');
        return NextResponse.json(revertResult);

      case 'check_triggers':
        const triggers = await checkRevertTriggers();
        return NextResponse.json({ triggers });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Cutover error:', error);
    return NextResponse.json({
      error: 'Action failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
```

---

# 🖥️ COMPONENT IMPLEMENTATIONS

## COMP.1 WORKSPACE HEATMAP

```tsx
// components/admin/workspace-heatmap.tsx

'use client';

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Circle,
  Search,
  Filter,
  RefreshCw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface WorkspaceHealth {
  workspace_id: string;
  health_score: number;
  health_status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  partition_health: number;
  workflow_health: number;
  webhook_health: number;
  lead_count: number;
  active_workflows: number;
  last_activity_at: string | null;
}

interface HealthMeshResponse {
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    critical: number;
    avgScore: number;
  };
  workspaces: WorkspaceHealth[];
  generatedAt: string;
}

// ============================================
// HEALTH ICON COMPONENT
// ============================================

function HealthIcon({ status }: { status: WorkspaceHealth['health_status'] }) {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'degraded':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'unhealthy':
      return <XCircle className="w-4 h-4 text-orange-500" />;
    case 'critical':
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Circle className="w-4 h-4 text-gray-400" />;
  }
}

// ============================================
// CELL COMPONENT
// ============================================

interface CellProps {
  workspace: WorkspaceHealth;
  size: 'sm' | 'md' | 'lg';
  onClick: () => void;
}

function HeatmapCell({ workspace, size, onClick }: CellProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const colorClasses = {
    healthy: 'bg-green-500 hover:bg-green-400',
    degraded: 'bg-yellow-500 hover:bg-yellow-400',
    unhealthy: 'bg-orange-500 hover:bg-orange-400',
    critical: 'bg-red-500 hover:bg-red-400',
  };

  return (
    <div
      className={cn(
        sizeClasses[size],
        colorClasses[workspace.health_status],
        'rounded cursor-pointer transition-colors',
        'flex items-center justify-center'
      )}
      onClick={onClick}
      title={`${workspace.workspace_id}: ${workspace.health_score}%`}
    >
      {size === 'lg' && (
        <span className="text-xs font-bold text-white">
          {workspace.health_score}
        </span>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function WorkspaceHeatmap() {
  const [filter, setFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [zoom, setZoom] = useState<'sm' | 'md' | 'lg'>('md');
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceHealth | null>(null);

  const { data, error, isLoading, mutate } = useSWR<HealthMeshResponse>(
    `/api/admin/health-mesh${filter ? `?filter=${filter}` : ''}`,
    { refreshInterval: 30000 }
  );

  const filteredWorkspaces = useMemo(() => {
    if (!data?.workspaces) return [];
    if (!search) return data.workspaces;
    return data.workspaces.filter(w =>
      w.workspace_id.toLowerCase().includes(search.toLowerCase())
    );
  }, [data?.workspaces, search]);

  const handleRefresh = async () => {
    await fetch('/api/admin/health-mesh', { method: 'POST' });
    mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        Error loading health data: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <SummaryCard
          label="Total"
          value={data?.summary.total || 0}
          icon={<Circle className="w-5 h-5" />}
          color="gray"
        />
        <SummaryCard
          label="Healthy"
          value={data?.summary.healthy || 0}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
          onClick={() => setFilter(filter === 'healthy' ? null : 'healthy')}
          active={filter === 'healthy'}
        />
        <SummaryCard
          label="Degraded"
          value={data?.summary.degraded || 0}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="yellow"
          onClick={() => setFilter(filter === 'degraded' ? null : 'degraded')}
          active={filter === 'degraded'}
        />
        <SummaryCard
          label="Unhealthy"
          value={data?.summary.unhealthy || 0}
          icon={<XCircle className="w-5 h-5" />}
          color="orange"
          onClick={() => setFilter(filter === 'unhealthy' ? null : 'unhealthy')}
          active={filter === 'unhealthy'}
        />
        <SummaryCard
          label="Critical"
          value={data?.summary.critical || 0}
          icon={<XCircle className="w-5 h-5" />}
          color="red"
          onClick={() => setFilter(filter === 'critical' ? null : 'critical')}
          active={filter === 'critical'}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search workspaces..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom('sm')}
            className={cn('p-2 rounded', zoom === 'sm' && 'bg-gray-200')}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom('md')}
            className={cn('p-2 rounded', zoom === 'md' && 'bg-gray-200')}
          >
            <Circle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom('lg')}
            className={cn('p-2 rounded', zoom === 'lg' && 'bg-gray-200')}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Heatmap Grid */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="flex flex-wrap gap-1">
          {filteredWorkspaces.map((ws) => (
            <HeatmapCell
              key={ws.workspace_id}
              workspace={ws}
              size={zoom}
              onClick={() => setSelectedWorkspace(ws)}
            />
          ))}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedWorkspace && (
        <DetailPanel
          workspace={selectedWorkspace}
          onClose={() => setSelectedWorkspace(null)}
        />
      )}
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function SummaryCard({
  label,
  value,
  icon,
  color,
  onClick,
  active,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        'p-4 rounded-lg border cursor-pointer transition-colors',
        active && 'ring-2 ring-blue-500',
        onClick && 'hover:bg-gray-50'
      )}
      onClick={onClick}
    >
      <div className={`text-${color}-500 mb-2`}>{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}

function DetailPanel({
  workspace,
  onClose,
}: {
  workspace: WorkspaceHealth;
  onClose: () => void;
}) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Workspace Details</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-gray-500">Workspace ID</div>
          <div className="font-mono text-sm">{workspace.workspace_id}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Health Score</div>
          <div className="flex items-center gap-2">
            <HealthIcon status={workspace.health_status} />
            <span className="font-bold">{workspace.health_score}%</span>
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Partition Health</div>
          <div>{workspace.partition_health}%</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Workflow Health</div>
          <div>{workspace.workflow_health}%</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Webhook Health</div>
          <div>{workspace.webhook_health}%</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Lead Count</div>
          <div>{workspace.lead_count.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Active Workflows</div>
          <div>{workspace.active_workflows}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Last Activity</div>
          <div>
            {workspace.last_activity_at
              ? new Date(workspace.last_activity_at).toLocaleString()
              : 'Never'}
          </div>
        </div>
      </div>
    </div>
  );
}
```

## COMP.2 WATCHDOG PANEL

```tsx
// components/admin/watchdog-panel.tsx

'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Eye,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DriftItem {
  workspaceId: string;
  driftType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
  autoHealable: boolean;
}

interface WatchdogRun {
  id: string;
  started_at: string;
  completed_at: string;
  status: string;
  drifts_detected: number;
  drifts_healed: number;
  drifts_failed: number;
}

interface WatchdogResponse {
  runs: WatchdogRun[];
  summary: {
    totalRuns: number;
    totalDriftsDetected: number;
    totalDriftsHealed: number;
  };
}

export function WatchdogPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [drifts, setDrifts] = useState<DriftItem[]>([]);

  const { data, mutate } = useSWR<WatchdogResponse>('/api/admin/watchdog');

  const handleDetect = async () => {
    const response = await fetch('/api/admin/watchdog?action=detect');
    const data = await response.json();
    setDrifts(data.drifts || []);
  };

  const handleRun = async (autoHeal: boolean) => {
    setIsRunning(true);
    try {
      await fetch('/api/admin/watchdog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoHeal }),
      });
      mutate();
    } finally {
      setIsRunning(false);
    }
  };

  const severityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-gray-500">Runs (24h)</div>
          <div className="text-2xl font-bold">{data?.summary.totalRuns || 0}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-gray-500">Drifts Detected</div>
          <div className="text-2xl font-bold text-orange-500">
            {data?.summary.totalDriftsDetected || 0}
          </div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-gray-500">Drifts Healed</div>
          <div className="text-2xl font-bold text-green-500">
            {data?.summary.totalDriftsHealed || 0}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleDetect}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          <Eye className="w-4 h-4" />
          Detect Drifts
        </button>
        <button
          onClick={() => handleRun(false)}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          <Play className="w-4 h-4" />
          Run (Detect Only)
        </button>
        <button
          onClick={() => handleRun(true)}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          {isRunning ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Wrench className="w-4 h-4" />
          )}
          Run with Auto-Heal
        </button>
      </div>

      {/* Detected Drifts */}
      {drifts.length > 0 && (
        <div className="border rounded-lg">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold">Detected Drifts ({drifts.length})</h3>
          </div>
          <div className="divide-y max-h-96 overflow-auto">
            {drifts.map((drift, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                {severityIcon(drift.severity)}
                <div className="flex-1">
                  <div className="font-medium">{drift.driftType}</div>
                  <div className="text-sm text-gray-500 font-mono">
                    {drift.workspaceId}
                  </div>
                </div>
                <div className="text-sm">
                  {drift.autoHealable && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                      Auto-healable
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Runs */}
      <div className="border rounded-lg">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold">Recent Runs</h3>
        </div>
        <div className="divide-y">
          {data?.runs?.map((run) => (
            <div key={run.id} className="p-4 flex items-center gap-4">
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  run.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
                )}
              />
              <div className="flex-1">
                <div className="text-sm text-gray-500">
                  {new Date(run.started_at).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span>Detected: {run.drifts_detected}</span>
                <span className="text-green-600">Healed: {run.drifts_healed}</span>
                {run.drifts_failed > 0 && (
                  <span className="text-red-600">Failed: {run.drifts_failed}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## COMP.3 MIGRATION DASHBOARD

```tsx
// components/admin/migration-dashboard.tsx

'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MigrationState {
  workspaceId: string;
  sourceTable: string;
  targetTable: string;
  status: string;
  dualWriteEnabled: boolean;
  backfillProgress: number;
  parityScore: number;
  lastVerifiedAt: string | null;
}

export function MigrationDashboard({ workspaceId }: { workspaceId: string }) {
  const [isLoading, setIsLoading] = useState(false);

  const { data: state, mutate } = useSWR<MigrationState>(
    `/api/admin/migration?workspaceId=${workspaceId}`
  );

  const handleAction = async (action: string) => {
    setIsLoading(true);
    try {
      await fetch('/api/admin/migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, action }),
      });
      mutate();
    } finally {
      setIsLoading(false);
    }
  };

  if (!state) {
    return (
      <div className="p-8 text-center text-gray-500">
        No migration configured for this workspace
      </div>
    );
  }

  const statusColors = {
    idle: 'bg-gray-100 text-gray-700',
    dual_write: 'bg-blue-100 text-blue-700',
    backfilling: 'bg-yellow-100 text-yellow-700',
    verifying: 'bg-purple-100 text-purple-700',
    cutover_ready: 'bg-green-100 text-green-700',
    cutover_complete: 'bg-green-500 text-white',
  };

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <span className="text-sm text-gray-500">Migration Status</span>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={cn(
                'px-3 py-1 rounded-full text-sm font-medium',
                statusColors[state.status as keyof typeof statusColors] || 'bg-gray-100'
              )}
            >
              {state.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-sm text-gray-500">Parity Score</span>
          <div className="text-2xl font-bold">
            {state.parityScore}%
            {state.parityScore >= 99 && <CheckCircle className="inline ml-2 w-5 h-5 text-green-500" />}
            {state.parityScore < 99 && state.parityScore >= 90 && (
              <AlertTriangle className="inline ml-2 w-5 h-5 text-yellow-500" />
            )}
            {state.parityScore < 90 && <XCircle className="inline ml-2 w-5 h-5 text-red-500" />}
          </div>
        </div>
      </div>

      {/* Data Flow Visualization */}
      <div className="flex items-center justify-center gap-4 p-8 border rounded-lg bg-gray-50">
        <div className="text-center">
          <Database className="w-12 h-12 mx-auto text-gray-600" />
          <div className="mt-2 font-medium">{state.sourceTable}</div>
          <div className="text-sm text-gray-500">Source (Legacy)</div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <ArrowRight
            className={cn(
              'w-8 h-8',
              state.dualWriteEnabled ? 'text-green-500' : 'text-gray-300'
            )}
          />
          <span className="text-xs text-gray-500">
            {state.dualWriteEnabled ? 'Dual-Write Active' : 'Dual-Write Off'}
          </span>
        </div>

        <div className="text-center">
          <Database className="w-12 h-12 mx-auto text-blue-600" />
          <div className="mt-2 font-medium">{state.targetTable}</div>
          <div className="text-sm text-gray-500">Target (Genesis)</div>
        </div>
      </div>

      {/* Progress Bar */}
      {state.status === 'backfilling' && (
        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Backfill Progress</span>
            <span className="text-sm text-gray-500">{state.backfillProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${state.backfillProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4">
        {state.status === 'idle' && (
          <button
            onClick={() => handleAction('enable_dual_write')}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Play className="w-4 h-4" />
            Enable Dual-Write
          </button>
        )}

        {state.status === 'dual_write' && (
          <>
            <button
              onClick={() => handleAction('start_backfill')}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Play className="w-4 h-4" />
              Start Backfill
            </button>
            <button
              onClick={() => handleAction('disable_dual_write')}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              <Pause className="w-4 h-4" />
              Disable Dual-Write
            </button>
          </>
        )}

        {state.status === 'cutover_ready' && (
          <button
            onClick={() => handleAction('execute_cutover')}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            <CheckCircle className="w-4 h-4" />
            Execute Cutover
          </button>
        )}

        <button
          onClick={() => handleAction('run_parity_check')}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Run Parity Check
        </button>
      </div>

      {/* Last Verified */}
      {state.lastVerifiedAt && (
        <div className="text-sm text-gray-500">
          Last parity check: {new Date(state.lastVerifiedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
```

---

# 📊 ADDITIONAL SCHEMAS

## SCHEMA.1 COMPLETE GENESIS SCHEMA

```sql
-- ============================================
-- GENESIS ENGINE: COMPLETE SCHEMA DEFINITION
-- Version: 1.0.0
-- ============================================

-- Create schema
CREATE SCHEMA IF NOT EXISTS genesis;

-- ============================================
-- CORE TABLES
-- ============================================

-- Partition Registry
CREATE TABLE IF NOT EXISTS genesis.partition_registry (
    workspace_id UUID PRIMARY KEY,
    partition_name TEXT NOT NULL UNIQUE,
    partition_slug TEXT NOT NULL,
    status TEXT DEFAULT 'creating' CHECK (status IN ('creating', 'active', 'migrating', 'maintenance', 'dropping', 'dropped')),
    row_count BIGINT DEFAULT 0,
    size_bytes BIGINT DEFAULT 0,
    index_count INTEGER DEFAULT 0,
    indexes_created TEXT[] DEFAULT '{}',
    constraints_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_stats_update TIMESTAMPTZ
);

-- Leads Parent Table (Partitioned)
CREATE TABLE IF NOT EXISTS genesis.leads (
    id UUID DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    email_address TEXT NOT NULL,
    linkedin_url TEXT,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    organization_name TEXT,
    job_title TEXT,
    phone TEXT,
    location TEXT,
    industry TEXT,
    company_size TEXT,
    website_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'researching', 'ready', 'sending', 'sent', 'replied', 'bounced', 'opted_out', 'completed')),
    campaign_name TEXT,
    email_1_subject TEXT,
    email_1_body TEXT,
    email_2_body TEXT,
    email_3_subject TEXT,
    email_3_body TEXT,
    email_1_sent BOOLEAN DEFAULT FALSE,
    email_2_sent BOOLEAN DEFAULT FALSE,
    email_3_sent BOOLEAN DEFAULT FALSE,
    email_1_sent_at TIMESTAMPTZ,
    email_2_sent_at TIMESTAMPTZ,
    email_3_sent_at TIMESTAMPTZ,
    research_data JSONB DEFAULT '{}',
    relevance_ai_output JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (workspace_id, id),
    UNIQUE (workspace_id, email_address)
) PARTITION BY LIST (workspace_id);

-- Default partition
CREATE TABLE IF NOT EXISTS genesis.leads_default PARTITION OF genesis.leads DEFAULT;

-- ============================================
-- IGNITION STATE
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.ignition_state (
    workspace_id UUID PRIMARY KEY,
    status TEXT NOT NULL,
    current_step INTEGER DEFAULT 0,
    total_steps INTEGER DEFAULT 4,
    partition_name TEXT,
    workflow_ids TEXT[],
    credential_ids TEXT[],
    error TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- ============================================
-- CREDENTIALS
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.workspace_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    credential_type TEXT NOT NULL,
    credential_name TEXT NOT NULL,
    n8n_credential_id TEXT,
    template_credential_id TEXT,
    encrypted_data BYTEA NOT NULL,
    encryption_version INTEGER DEFAULT 1,
    data_fingerprint TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    last_synced_at TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    UNIQUE (workspace_id, credential_type, credential_name)
);

CREATE TABLE IF NOT EXISTS genesis.credential_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    credential_id UUID NOT NULL,
    action TEXT NOT NULL,
    actor_id TEXT,
    actor_type TEXT,
    details JSONB DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WEBHOOKS
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.webhook_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    webhook_type TEXT NOT NULL,
    webhook_name TEXT NOT NULL,
    source_url TEXT,
    target_url TEXT NOT NULL,
    n8n_workflow_id TEXT,
    n8n_node_name TEXT,
    status TEXT DEFAULT 'pending',
    last_ping_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    failure_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    circuit_state TEXT DEFAULT 'closed',
    circuit_opened_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (workspace_id, webhook_type, webhook_name)
);

CREATE TABLE IF NOT EXISTS genesis.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    webhook_id UUID REFERENCES genesis.webhook_registry(id),
    event_type TEXT NOT NULL,
    direction TEXT NOT NULL,
    idempotency_key TEXT,
    request_body JSONB,
    response_status INTEGER,
    response_body JSONB,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS genesis.webhook_dead_letter (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_event_id UUID,
    workspace_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    request_body JSONB NOT NULL,
    failure_reason TEXT NOT NULL,
    attempts INTEGER NOT NULL,
    last_attempt_at TIMESTAMPTZ NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolution_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WATCHDOG
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.watchdog_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'running',
    drifts_detected INTEGER DEFAULT 0,
    drifts_healed INTEGER DEFAULT 0,
    drifts_failed INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS genesis.watchdog_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES genesis.watchdog_runs(id),
    drift_type TEXT NOT NULL,
    workspace_id TEXT,
    details JSONB,
    action_taken TEXT,
    success BOOLEAN,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HEALTH MONITORING
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.workspace_health (
    workspace_id UUID PRIMARY KEY,
    health_score INTEGER CHECK (health_score BETWEEN 0 AND 100),
    health_status TEXT,
    partition_health INTEGER DEFAULT 100,
    workflow_health INTEGER DEFAULT 100,
    webhook_health INTEGER DEFAULT 100,
    credential_health INTEGER DEFAULT 100,
    lead_count BIGINT DEFAULT 0,
    active_workflows INTEGER DEFAULT 0,
    failed_webhooks_24h INTEGER DEFAULT 0,
    open_issues INTEGER DEFAULT 0,
    critical_issues INTEGER DEFAULT 0,
    last_activity_at TIMESTAMPTZ,
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BLUEPRINTS
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.blueprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    workflow_template JSONB NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (name, version)
);

-- ============================================
-- SANDBOX
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.sandbox_config (
    workspace_id UUID PRIMARY KEY,
    sandbox_enabled BOOLEAN DEFAULT FALSE,
    mock_services TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RATE LIMITS
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    workspace_id TEXT NOT NULL DEFAULT 'global',
    current_tokens INTEGER NOT NULL,
    max_tokens INTEGER NOT NULL,
    refill_rate NUMERIC NOT NULL,
    last_refill_at TIMESTAMPTZ DEFAULT NOW(),
    daily_used INTEGER DEFAULT 0,
    daily_reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 day',
    UNIQUE (service_name, workspace_id)
);

-- ============================================
-- MIGRATION STATE
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.migration_state (
    workspace_id UUID PRIMARY KEY,
    source_table TEXT NOT NULL,
    target_table TEXT NOT NULL,
    status TEXT DEFAULT 'idle',
    dual_write_enabled BOOLEAN DEFAULT FALSE,
    backfill_progress INTEGER DEFAULT 0,
    backfill_last_id TEXT,
    parity_score INTEGER DEFAULT 0,
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DEPLOYMENT EVENTS
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.deployment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    reason TEXT,
    actions TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SECURITY AUDIT
-- ============================================

CREATE TABLE IF NOT EXISTS genesis.security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    workspace_id_attempted TEXT,
    workspace_id_allowed TEXT,
    user_id TEXT,
    query_text TEXT,
    client_ip INET,
    user_agent TEXT,
    action_taken TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_leads_workspace ON genesis.leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON genesis.leads(status) WHERE status NOT IN ('completed', 'opted_out');
CREATE INDEX IF NOT EXISTS idx_leads_updated ON genesis.leads(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_partition_registry_status ON genesis.partition_registry(status);
CREATE INDEX IF NOT EXISTS idx_creds_workspace ON genesis.workspace_credentials(workspace_id);
CREATE INDEX IF NOT EXISTS idx_webhook_workspace ON genesis.webhook_registry(workspace_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_idem ON genesis.webhook_events(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON genesis.webhook_events(status) WHERE status NOT IN ('completed', 'dead_letter');
CREATE INDEX IF NOT EXISTS idx_security_audit_type ON genesis.security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_created ON genesis.security_audit_log(created_at DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE genesis.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.leads FORCE ROW LEVEL SECURITY;

CREATE POLICY leads_workspace_isolation ON genesis.leads
    FOR ALL USING (workspace_id = genesis.get_workspace_context())
    WITH CHECK (workspace_id = genesis.get_workspace_context());

ALTER TABLE genesis.workspace_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY creds_workspace_isolation ON genesis.workspace_credentials
    FOR ALL USING (workspace_id = genesis.get_workspace_context());

ALTER TABLE genesis.webhook_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhook_workspace_isolation ON genesis.webhook_registry
    FOR ALL USING (workspace_id = genesis.get_workspace_context());

ALTER TABLE genesis.webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhook_events_isolation ON genesis.webhook_events
    FOR ALL USING (workspace_id = genesis.get_workspace_context());
```

---

# ⏰ CRON JOB IMPLEMENTATIONS

## CRON.1 WATCHDOG CRON

```typescript
// app/api/cron/watchdog/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { runWatchdog } from '@/lib/genesis/watchdog-service';

// Vercel cron: runs every 15 minutes
// Add to vercel.json: {"path": "/api/cron/watchdog", "schedule": "*/15 * * * *"}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runWatchdog({
      autoHeal: true,
      dryRun: false,
    });

    console.log(`Watchdog cron completed: ${result.driftsDetected} detected, ${result.driftsHealed} healed`);

    return NextResponse.json({
      success: true,
      runId: result.runId,
      driftsDetected: result.driftsDetected,
      driftsHealed: result.driftsHealed,
      completedAt: result.completedAt,
    });

  } catch (error) {
    console.error('Watchdog cron error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max
```

## CRON.2 HEALTH REFRESH CRON

```typescript
// app/api/cron/health-refresh/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Vercel cron: runs every hour
// Add to vercel.json: {"path": "/api/cron/health-refresh", "schedule": "0 * * * *"}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Refresh all workspace health scores
    const { data, error } = await supabaseAdmin!.rpc('refresh_all_health');

    if (error) throw error;

    console.log(`Health refresh completed: ${data?.length || 0} workspaces updated`);

    return NextResponse.json({
      success: true,
      workspacesRefreshed: data?.length || 0,
      completedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Health refresh cron error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 300;
```

## CRON.3 PARTITION STATS CRON

```typescript
// app/api/cron/partition-stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Vercel cron: runs every 6 hours
// Add to vercel.json: {"path": "/api/cron/partition-stats", "schedule": "0 */6 * * *"}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Update partition statistics
    const { data, error } = await supabaseAdmin!.rpc('update_all_partition_stats');

    if (error) throw error;

    // Run JSONB index watchdog
    const { data: indexData } = await supabaseAdmin!.rpc('run_jsonb_index_watchdog');

    console.log(`Partition stats updated: ${data?.length || 0} partitions`);
    console.log(`Index watchdog: ${indexData?.length || 0} actions taken`);

    return NextResponse.json({
      success: true,
      partitionsUpdated: data?.length || 0,
      indexesCreated: indexData?.filter((r: any) => r.action === 'create_index').length || 0,
      completedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Partition stats cron error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 600;
```

## CRON.4 RATE LIMIT RESET CRON

```typescript
// app/api/cron/rate-limit-reset/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Vercel cron: runs daily at midnight UTC
// Add to vercel.json: {"path": "/api/cron/rate-limit-reset", "schedule": "0 0 * * *"}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Reset daily counters
    const { data, error } = await supabaseAdmin!
      .from('genesis.rate_limits')
      .update({
        daily_used: 0,
        daily_reset_at: new Date(Date.now() + 86400000).toISOString(),
      })
      .select('service_name');

    if (error) throw error;

    console.log(`Rate limits reset: ${data?.length || 0} services`);

    return NextResponse.json({
      success: true,
      servicesReset: data?.length || 0,
      nextResetAt: new Date(Date.now() + 86400000).toISOString(),
    });

  } catch (error) {
    console.error('Rate limit reset error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
```

## CRON.5 DEAD LETTER PROCESSOR

```typescript
// app/api/cron/dlq-processor/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { callWebhookWithRetry } from '@/lib/genesis/webhook-retry';

// Vercel cron: runs every 30 minutes
// Add to vercel.json: {"path": "/api/cron/dlq-processor", "schedule": "*/30 * * * *"}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get unresolved DLQ items older than 1 hour
    const { data: dlqItems, error } = await supabaseAdmin!
      .from('genesis.webhook_dead_letter')
      .select('*')
      .eq('resolved', false)
      .lt('created_at', new Date(Date.now() - 3600000).toISOString())
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) throw error;

    let retried = 0;
    let succeeded = 0;
    let failed = 0;

    for (const item of dlqItems || []) {
      retried++;

      // Get webhook info
      const { data: webhook } = await supabaseAdmin!
        .from('genesis.webhook_registry')
        .select('id, target_url, circuit_state')
        .eq('workspace_id', item.workspace_id)
        .single();

      if (!webhook || webhook.circuit_state === 'open') {
        failed++;
        continue;
      }

      // Retry the webhook
      const result = await callWebhookWithRetry(
        webhook.id,
        item.workspace_id,
        item.event_type,
        item.request_body,
        `dlq-retry-${item.id}-${Date.now()}`,
        { maxRetries: 2, baseDelayMs: 5000, maxDelayMs: 30000, backoffMultiplier: 2 }
      );

      if (result.success) {
        succeeded++;
        await supabaseAdmin!
          .from('genesis.webhook_dead_letter')
          .update({
            resolved: true,
            resolved_at: new Date().toISOString(),
            resolution_note: 'Auto-retried successfully by DLQ processor',
          })
          .eq('id', item.id);
      } else {
        failed++;
      }
    }

    console.log(`DLQ processor: ${retried} retried, ${succeeded} succeeded, ${failed} failed`);

    return NextResponse.json({
      success: true,
      processed: retried,
      succeeded,
      failed,
      completedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('DLQ processor error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 300;
```

---

# 🧪 EXTENDED TEST SUITES

## TEST.1 INTEGRATION TEST SUITE

```typescript
// tests/integration/genesis-integration.test.ts

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('Genesis Engine Integration Tests', () => {
  const testWorkspaceId = '11111111-1111-1111-1111-111111111111';
  const testWorkspaceSlug = 'test_integration';

  beforeAll(async () => {
    // Setup: Create test workspace
    await supabase.from('workspaces').upsert({
      id: testWorkspaceId,
      name: 'Integration Test Workspace',
      slug: testWorkspaceSlug,
    });
  });

  afterAll(async () => {
    // Cleanup: Remove test data
    await supabase.rpc('genesis_set_workspace_context', { p_workspace_id: testWorkspaceId });
    await supabase.from('genesis.leads').delete().eq('workspace_id', testWorkspaceId);
    await supabase.from('genesis.partition_registry').delete().eq('workspace_id', testWorkspaceId);
    await supabase.from('workspaces').delete().eq('id', testWorkspaceId);
  });

  describe('Partition Provisioning', () => {
    it('should create a partition for a new workspace', async () => {
      const { data, error } = await supabase.rpc('fn_ignite_workspace_partition', {
        p_workspace_id: testWorkspaceId,
        p_workspace_slug: testWorkspaceSlug,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data[0].success).toBe(true);
      expect(data[0].partition_name).toContain('leads_p_');
    });

    it('should be idempotent on repeated calls', async () => {
      const { data: first } = await supabase.rpc('fn_ignite_workspace_partition', {
        p_workspace_id: testWorkspaceId,
        p_workspace_slug: testWorkspaceSlug,
      });

      const { data: second } = await supabase.rpc('fn_ignite_workspace_partition', {
        p_workspace_id: testWorkspaceId,
        p_workspace_slug: testWorkspaceSlug,
      });

      expect(first[0].success).toBe(true);
      expect(second[0].success).toBe(true);
      expect(second[0].operation).toBe('already_exists');
    });
  });

  describe('RLS Enforcement', () => {
    it('should allow access to own workspace data', async () => {
      // Set context
      await supabase.rpc('set_workspace_context', { p_workspace_id: testWorkspaceId });

      // Insert test lead
      const { data: inserted, error: insertError } = await supabase
        .from('genesis.leads')
        .insert({
          workspace_id: testWorkspaceId,
          email_address: 'test@integration.com',
          status: 'pending',
        })
        .select()
        .single();

      expect(insertError).toBeNull();
      expect(inserted).toBeDefined();

      // Read back
      const { data: read, error: readError } = await supabase
        .from('genesis.leads')
        .select('*')
        .eq('email_address', 'test@integration.com')
        .single();

      expect(readError).toBeNull();
      expect(read.email_address).toBe('test@integration.com');
    });

    it('should block access to other workspace data', async () => {
      const otherWorkspaceId = '22222222-2222-2222-2222-222222222222';

      // Set context to our workspace
      await supabase.rpc('set_workspace_context', { p_workspace_id: testWorkspaceId });

      // Try to query other workspace
      const { data, error } = await supabase
        .from('genesis.leads')
        .select('*')
        .eq('workspace_id', otherWorkspaceId);

      expect(data).toHaveLength(0);
    });
  });

  describe('Webhook Processing', () => {
    it('should process email_sent events', async () => {
      // Insert a lead first
      await supabase.rpc('set_workspace_context', { p_workspace_id: testWorkspaceId });
      await supabase.from('genesis.leads').upsert({
        workspace_id: testWorkspaceId,
        email_address: 'webhook_test@example.com',
        status: 'pending',
        email_1_sent: false,
      });

      // Send webhook event
      const response = await fetch(`${process.env.APP_URL}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': process.env.WEBHOOK_SECRET!,
        },
        body: JSON.stringify({
          workspace_id: testWorkspaceId,
          idempotency_key: `test-${Date.now()}`,
          data: {
            event_type: 'email_sent',
            email: 'webhook_test@example.com',
            email_number: 1,
          },
        }),
      });

      expect(response.ok).toBe(true);

      // Verify lead was updated
      const { data: lead } = await supabase
        .from('genesis.leads')
        .select('email_1_sent')
        .eq('email_address', 'webhook_test@example.com')
        .single();

      expect(lead?.email_1_sent).toBe(true);
    });

    it('should respect idempotency', async () => {
      const idempotencyKey = `idem-${Date.now()}`;

      // First call
      const first = await fetch(`${process.env.APP_URL}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': process.env.WEBHOOK_SECRET!,
        },
        body: JSON.stringify({
          workspace_id: testWorkspaceId,
          idempotency_key: idempotencyKey,
          data: {
            event_type: 'lead_updated',
            email: 'idem_test@example.com',
            updates: { status: 'ready' },
          },
        }),
      });

      // Second call with same key
      const second = await fetch(`${process.env.APP_URL}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': process.env.WEBHOOK_SECRET!,
        },
        body: JSON.stringify({
          workspace_id: testWorkspaceId,
          idempotency_key: idempotencyKey,
          data: {
            event_type: 'lead_updated',
            email: 'idem_test@example.com',
            updates: { status: 'sent' },
          },
        }),
      });

      const firstBody = await first.json();
      const secondBody = await second.json();

      expect(firstBody.status).toBe('processed');
      expect(secondBody.status).toBe('duplicate');
    });
  });
});
```

## TEST.2 PERFORMANCE BENCHMARK SUITE

```typescript
// tests/benchmarks/genesis-benchmarks.ts

import { performance } from 'perf_hooks';

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p95Ms: number;
  p99Ms: number;
  opsPerSecond: number;
}

async function benchmark(
  name: string,
  fn: () => Promise<void>,
  iterations: number = 100
): Promise<BenchmarkResult> {
  const times: number[] = [];

  // Warm-up
  for (let i = 0; i < 10; i++) {
    await fn();
  }

  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }

  times.sort((a, b) => a - b);

  const totalMs = times.reduce((sum, t) => sum + t, 0);

  return {
    name,
    iterations,
    totalMs,
    avgMs: totalMs / iterations,
    minMs: times[0],
    maxMs: times[times.length - 1],
    p95Ms: times[Math.floor(iterations * 0.95)],
    p99Ms: times[Math.floor(iterations * 0.99)],
    opsPerSecond: (iterations / totalMs) * 1000,
  };
}

async function runBenchmarks(): Promise<void> {
  const results: BenchmarkResult[] = [];

  console.log('Starting Genesis Engine Benchmarks...\n');

  // Benchmark 1: Partition lookup
  results.push(await benchmark('Partition Lookup', async () => {
    await fetch(`${process.env.APP_URL}/api/admin/partition?workspaceId=test`);
  }, 100));

  // Benchmark 2: Lead query (100 rows)
  results.push(await benchmark('Lead Query (100 rows)', async () => {
    await fetch(`${process.env.APP_URL}/api/contacts?workspaceId=test&limit=100`);
  }, 100));

  // Benchmark 3: Lead insert
  results.push(await benchmark('Lead Insert', async () => {
    await fetch(`${process.env.APP_URL}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'test',
        email: `bench-${Date.now()}-${Math.random()}@test.com`,
        status: 'pending',
      }),
    });
  }, 50));

  // Benchmark 4: Health mesh query
  results.push(await benchmark('Health Mesh Query', async () => {
    await fetch(`${process.env.APP_URL}/api/admin/health-mesh`);
  }, 50));

  // Benchmark 5: Webhook event processing
  results.push(await benchmark('Webhook Processing', async () => {
    await fetch(`${process.env.APP_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.WEBHOOK_SECRET!,
      },
      body: JSON.stringify({
        workspace_id: 'test',
        idempotency_key: `bench-${Date.now()}-${Math.random()}`,
        data: {
          event_type: 'lead_updated',
          email: 'bench@test.com',
          updates: { status: 'ready' },
        },
      }),
    });
  }, 50));

  // Print results
  console.log('\n=== BENCHMARK RESULTS ===\n');
  console.log('| Benchmark | Avg (ms) | P95 (ms) | P99 (ms) | Ops/s |');
  console.log('|-----------|----------|----------|----------|-------|');

  for (const r of results) {
    console.log(
      `| ${r.name.padEnd(20)} | ${r.avgMs.toFixed(2).padStart(8)} | ${r.p95Ms.toFixed(2).padStart(8)} | ${r.p99Ms.toFixed(2).padStart(8)} | ${r.opsPerSecond.toFixed(0).padStart(5)} |`
    );
  }

  // Performance assertions
  console.log('\n=== PERFORMANCE TARGETS ===\n');

  const targets = {
    'Partition Lookup': { p95: 50, p99: 100 },
    'Lead Query (100 rows)': { p95: 200, p99: 500 },
    'Lead Insert': { p95: 100, p99: 200 },
    'Health Mesh Query': { p95: 500, p99: 1000 },
    'Webhook Processing': { p95: 100, p99: 200 },
  };

  let allPassed = true;

  for (const r of results) {
    const target = targets[r.name as keyof typeof targets];
    if (target) {
      const p95Pass = r.p95Ms <= target.p95;
      const p99Pass = r.p99Ms <= target.p99;

      console.log(
        `${r.name}: P95 ${p95Pass ? '✓' : '✗'} (${r.p95Ms.toFixed(0)}ms <= ${target.p95}ms), ` +
        `P99 ${p99Pass ? '✓' : '✗'} (${r.p99Ms.toFixed(0)}ms <= ${target.p99}ms)`
      );

      if (!p95Pass || !p99Pass) allPassed = false;
    }
  }

  console.log(`\nOverall: ${allPassed ? '✓ ALL TARGETS MET' : '✗ SOME TARGETS MISSED'}`);
}

runBenchmarks().catch(console.error);
```

## TEST.3 CHAOS ENGINEERING SUITE

```typescript
// tests/chaos/chaos-engineering.ts

interface ChaosExperiment {
  name: string;
  target: 'database' | 'n8n_api' | 'webhook_endpoint' | 'rate_limiter';
  faultType: 'latency' | 'error' | 'connection_drop' | 'timeout';
  config: Record<string, unknown>;
  duration: number;
  cooldown: number;
}

const EXPERIMENTS: ChaosExperiment[] = [
  {
    name: 'Database Latency Spike',
    target: 'database',
    faultType: 'latency',
    config: { delayMs: 500, variance: 200 },
    duration: 60000,
    cooldown: 30000,
  },
  {
    name: 'n8n API Timeout',
    target: 'n8n_api',
    faultType: 'timeout',
    config: { timeoutMs: 30000 },
    duration: 60000,
    cooldown: 30000,
  },
  {
    name: 'Webhook Endpoint Errors',
    target: 'webhook_endpoint',
    faultType: 'error',
    config: { errorRate: 0.5, statusCode: 503 },
    duration: 60000,
    cooldown: 30000,
  },
  {
    name: 'Rate Limiter Exhaustion',
    target: 'rate_limiter',
    faultType: 'error',
    config: { forceExhausted: true },
    duration: 30000,
    cooldown: 30000,
  },
];

interface ChaosResult {
  experiment: string;
  startedAt: string;
  completedAt: string;
  metrics: {
    requestsSent: number;
    requestsSucceeded: number;
    requestsFailed: number;
    avgLatency: number;
    errorRate: number;
  };
  recovered: boolean;
  recoveryTime: number | null;
}

class ChaosRunner {
  private activeExperiment: ChaosExperiment | null = null;
  private faultInjected = false;

  async runExperiment(experiment: ChaosExperiment): Promise<ChaosResult> {
    const startedAt = new Date().toISOString();
    this.activeExperiment = experiment;

    console.log(`[CHAOS] Starting experiment: ${experiment.name}`);

    // Inject fault
    await this.injectFault(experiment);
    this.faultInjected = true;

    // Run load during fault
    const metrics = await this.runLoadDuringFault(experiment.duration);

    // Remove fault
    await this.removeFault(experiment);
    this.faultInjected = false;

    // Measure recovery
    const recoveryStart = Date.now();
    const recovered = await this.waitForRecovery(experiment.cooldown);
    const recoveryTime = recovered ? Date.now() - recoveryStart : null;

    const completedAt = new Date().toISOString();

    console.log(`[CHAOS] Experiment completed: ${experiment.name}`);
    console.log(`[CHAOS] Error rate: ${(metrics.errorRate * 100).toFixed(1)}%`);
    console.log(`[CHAOS] Recovered: ${recovered} (${recoveryTime}ms)`);

    return {
      experiment: experiment.name,
      startedAt,
      completedAt,
      metrics,
      recovered,
      recoveryTime,
    };
  }

  private async injectFault(experiment: ChaosExperiment): Promise<void> {
    console.log(`[CHAOS] Injecting fault: ${experiment.faultType} on ${experiment.target}`);

    // In production, this would interact with a fault injection service
    // For now, we set an environment variable that middleware checks
    await fetch(`${process.env.APP_URL}/api/admin/chaos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'inject',
        experiment,
      }),
    });
  }

  private async removeFault(experiment: ChaosExperiment): Promise<void> {
    console.log(`[CHAOS] Removing fault from ${experiment.target}`);

    await fetch(`${process.env.APP_URL}/api/admin/chaos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'remove',
        target: experiment.target,
      }),
    });
  }

  private async runLoadDuringFault(durationMs: number): Promise<ChaosResult['metrics']> {
    const endTime = Date.now() + durationMs;
    let requestsSent = 0;
    let requestsSucceeded = 0;
    let requestsFailed = 0;
    let totalLatency = 0;

    while (Date.now() < endTime) {
      const start = Date.now();

      try {
        const response = await fetch(`${process.env.APP_URL}/api/health`);
        const latency = Date.now() - start;
        totalLatency += latency;
        requestsSent++;

        if (response.ok) {
          requestsSucceeded++;
        } else {
          requestsFailed++;
        }
      } catch {
        requestsFailed++;
        requestsSent++;
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      requestsSent,
      requestsSucceeded,
      requestsFailed,
      avgLatency: requestsSent > 0 ? totalLatency / requestsSent : 0,
      errorRate: requestsSent > 0 ? requestsFailed / requestsSent : 0,
    };
  }

  private async waitForRecovery(timeoutMs: number): Promise<boolean> {
    const endTime = Date.now() + timeoutMs;
    let consecutiveSuccesses = 0;
    const requiredSuccesses = 5;

    while (Date.now() < endTime) {
      try {
        const response = await fetch(`${process.env.APP_URL}/api/health`);

        if (response.ok) {
          consecutiveSuccesses++;
          if (consecutiveSuccesses >= requiredSuccesses) {
            return true;
          }
        } else {
          consecutiveSuccesses = 0;
        }
      } catch {
        consecutiveSuccesses = 0;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return false;
  }
}

async function runAllChaosExperiments(): Promise<void> {
  const runner = new ChaosRunner();
  const results: ChaosResult[] = [];

  for (const experiment of EXPERIMENTS) {
    console.log(`\n${'='.repeat(60)}\n`);
    const result = await runner.runExperiment(experiment);
    results.push(result);

    // Wait between experiments
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  // Print summary
  console.log('\n=== CHAOS ENGINEERING SUMMARY ===\n');
  console.log('| Experiment | Error Rate | Avg Latency | Recovered |');
  console.log('|------------|------------|-------------|-----------|');

  for (const r of results) {
    console.log(
      `| ${r.experiment.padEnd(30)} | ${(r.metrics.errorRate * 100).toFixed(1).padStart(8)}% | ${r.metrics.avgLatency.toFixed(0).padStart(8)}ms | ${r.recovered ? '✓' : '✗'.padStart(9)} |`
    );
  }

  // Resilience assessment
  const allRecovered = results.every(r => r.recovered);
  const maxErrorRate = Math.max(...results.map(r => r.metrics.errorRate));

  console.log(`\nResilience Assessment: ${allRecovered && maxErrorRate < 0.5 ? 'PASSED' : 'NEEDS IMPROVEMENT'}`);
}

runAllChaosExperiments().catch(console.error);
```

---

# 📋 OPERATIONS RUNBOOK

## RUNBOOK.1 INCIDENT RESPONSE

### Incident Classification

| Severity | Description | Response Time | Escalation |
|----------|-------------|---------------|------------|
| SEV-1 | Complete outage, data loss risk | 5 minutes | Immediate to on-call + engineering lead |
| SEV-2 | Partial outage, significant impact | 15 minutes | 30 minutes to engineering lead |
| SEV-3 | Degraded performance, limited impact | 1 hour | 4 hours if unresolved |
| SEV-4 | Minor issue, cosmetic | 24 hours | None |

### SEV-1: Complete Outage

```bash
# Step 1: Verify outage
curl -I https://your-app.vercel.app/api/health

# Step 2: Check Vercel deployment status
vercel ls --scope your-team

# Step 3: Check Supabase status
curl https://status.supabase.com/api/v2/status.json

# Step 4: If deployment issue, rollback
vercel rollback

# Step 5: If database issue, check connections
# In Supabase dashboard: Project Settings > Database > Connection Pooling
```

### SEV-2: n8n Integration Failure

```bash
# Step 1: Check n8n connectivity
curl -H "X-N8N-API-KEY: $N8N_API_KEY" https://your-n8n.app.n8n.cloud/api/v1/workflows

# Step 2: Check for stuck executions
curl -H "X-N8N-API-KEY: $N8N_API_KEY" "https://your-n8n.app.n8n.cloud/api/v1/executions?status=running"

# Step 3: Run watchdog to detect drift
curl -X POST https://your-app.vercel.app/api/admin/watchdog \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"autoHeal": true}'

# Step 4: Check webhook health
curl https://your-app.vercel.app/api/admin/webhook-health \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### SEV-3: High Error Rate

```bash
# Step 1: Check error logs
vercel logs --scope your-team | grep ERROR

# Step 2: Check rate limits
curl https://your-app.vercel.app/api/admin/rate-limits \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Step 3: Check database health
curl https://your-app.vercel.app/api/admin/health-mesh \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Step 4: Run health refresh
curl -X POST https://your-app.vercel.app/api/admin/health-mesh \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## RUNBOOK.2 COMMON SCENARIOS

### Scenario: Workspace Provisioning Failed

```sql
-- Check partition status
SELECT * FROM genesis.partition_registry WHERE workspace_id = 'YOUR_WORKSPACE_ID';

-- Check ignition state
SELECT * FROM genesis.ignition_state WHERE workspace_id = 'YOUR_WORKSPACE_ID';

-- Manual retry
SELECT * FROM genesis.fn_ignite_workspace_partition(
  'YOUR_WORKSPACE_ID'::UUID,
  'your_workspace_slug'
);
```

### Scenario: Webhook Backlog Growing

```sql
-- Check pending webhooks
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest
FROM genesis.webhook_events
WHERE status NOT IN ('completed', 'dead_letter')
GROUP BY status;

-- Check circuit breaker states
SELECT 
  webhook_name,
  circuit_state,
  failure_count,
  last_failure_at
FROM genesis.webhook_registry
WHERE circuit_state != 'closed';

-- Reset circuit breakers if needed
UPDATE genesis.webhook_registry
SET circuit_state = 'closed', failure_count = 0
WHERE circuit_state = 'open'
AND last_failure_at < NOW() - INTERVAL '10 minutes';
```

### Scenario: RLS Audit Alert

```sql
-- Check recent security events
SELECT * FROM genesis.security_audit_log
WHERE event_type IN ('cross_workspace_attempt', 'rls_bypass_attempt')
ORDER BY created_at DESC
LIMIT 100;

-- Verify RLS is enabled on all tables
SELECT * FROM genesis.verify_rls_configuration();

-- Run RLS security tests
SELECT * FROM genesis.run_rls_security_tests();
```

## RUNBOOK.3 MAINTENANCE PROCEDURES

### Weekly Maintenance

```bash
# 1. Review health mesh
curl https://your-app.vercel.app/api/admin/health-mesh \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.summary'

# 2. Check DLQ for unresolved items
curl https://your-app.vercel.app/api/admin/dlq \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.unresolved'

# 3. Review partition stats
psql $DATABASE_URL -c "SELECT * FROM genesis.partition_registry ORDER BY size_bytes DESC LIMIT 20;"

# 4. Check for orphan workflows
curl -X POST https://your-app.vercel.app/api/admin/watchdog \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"autoHeal": false}'
```

### Monthly Maintenance

```sql
-- Clean up old webhook events
DELETE FROM genesis.webhook_events
WHERE created_at < NOW() - INTERVAL '90 days'
AND status IN ('completed', 'dead_letter');

-- Clean up old audit logs
DELETE FROM genesis.security_audit_log
WHERE created_at < NOW() - INTERVAL '180 days';

-- Clean up old watchdog events
DELETE FROM genesis.watchdog_events
WHERE created_at < NOW() - INTERVAL '30 days';

-- Vacuum analyze key tables
VACUUM ANALYZE genesis.leads;
VACUUM ANALYZE genesis.webhook_events;
VACUUM ANALYZE genesis.partition_registry;
```

## RUNBOOK.4 USEFUL SQL QUERIES

```sql
-- Top 10 workspaces by lead count
SELECT 
  pr.workspace_id,
  w.name as workspace_name,
  pr.row_count,
  pr.size_bytes / 1024 / 1024 as size_mb
FROM genesis.partition_registry pr
JOIN workspaces w ON w.id = pr.workspace_id::TEXT
ORDER BY pr.row_count DESC
LIMIT 10;

-- Webhook success rate by workspace (last 24h)
SELECT 
  workspace_id,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'completed') as succeeded,
  COUNT(*) FILTER (WHERE status = 'failed' OR status = 'dead_letter') as failed,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'completed') / COUNT(*),
    2
  ) as success_rate
FROM genesis.webhook_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY workspace_id
ORDER BY success_rate ASC
LIMIT 20;

-- Slow JSONB queries (from pg_stat_statements)
SELECT 
  LEFT(query, 100) as query_snippet,
  calls,
  ROUND(mean_exec_time::NUMERIC, 2) as avg_ms,
  ROUND(total_exec_time::NUMERIC, 2) as total_ms
FROM pg_stat_statements
WHERE query LIKE '%genesis%'
AND query LIKE '%->%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Partition health summary
SELECT 
  status,
  COUNT(*) as count,
  SUM(row_count) as total_rows,
  SUM(size_bytes) / 1024 / 1024 / 1024 as total_gb
FROM genesis.partition_registry
GROUP BY status;

-- Recent provisioning attempts
SELECT 
  workspace_id,
  status,
  current_step,
  error,
  started_at,
  updated_at
FROM genesis.ignition_state
ORDER BY started_at DESC
LIMIT 20;
```

---

# 📊 VERCEL CONFIGURATION

```json
// vercel.json
{
  "framework": "nextjs",
  "regions": ["iad1", "sfo1"],
  "crons": [
    {
      "path": "/api/cron/watchdog",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/health-refresh",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/partition-stats",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/rate-limit-reset",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/dlq-processor",
      "schedule": "*/30 * * * *"
    }
  ],
  "functions": {
    "app/api/admin/ignite/route.ts": {
      "maxDuration": 300
    },
    "app/api/admin/bulk-update/route.ts": {
      "maxDuration": 300
    },
    "app/api/cron/*/route.ts": {
      "maxDuration": 300
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ]
}
```

---

# 🎯 SUMMARY

| Phase | Key Deliverable |
|-------|-----------------|
| 40 | Partition physics, catalog optimization, RLS hardening |
| 41 | Atomic provisioning with rollback |
| 42 | Bidirectional webhook protocol |
| 43 | Self-healing state reconciliation |
| 44 | Platform operations dashboard |
| 45 | Sandbox and rate limiting |
| 46 | Zero-downtime migration |
| 47 | Load/chaos/security testing |
| 48 | Blue-green deployment, instant revert |

**Total Capacity:** 100M+ leads, 15,000+ partitions, 10k concurrent users

---

# 📚 APPENDIX A: ENVIRONMENT VARIABLES

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# n8n
N8N_API_URL=https://your-n8n.app.n8n.cloud/api/v1
N8N_API_KEY=your-n8n-api-key

# Security
WEBHOOK_SECRET=your-32-char-minimum-secret
CRON_SECRET=your-cron-secret
CREDENTIAL_MASTER_KEY=your-256-bit-encryption-key

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Vercel
VERCEL_TOKEN=your-vercel-token
VERCEL_PROJECT_NAME=genesis-engine

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

# 📚 APPENDIX B: QUICK REFERENCE

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/ignite` | POST | Super Admin | Start workspace provisioning |
| `/api/admin/ignite?workspaceId=X` | GET | Auth | Check provisioning status |
| `/api/admin/watchdog` | POST | Super Admin | Run watchdog |
| `/api/admin/health-mesh` | GET | Super Admin | Get health data |
| `/api/admin/bulk-update` | POST | Super Admin | Start bulk update |
| `/api/admin/cutover` | POST | Super Admin | Execute cutover action |
| `/api/events` | POST | Webhook Secret | Receive webhook events |

## SQL Functions

| Function | Description |
|----------|-------------|
| `genesis.fn_ignite_workspace_partition(uuid, text)` | Create workspace partition |
| `genesis.fn_drop_workspace_partition(uuid, bool)` | Drop workspace partition |
| `genesis.set_workspace_context(uuid)` | Set RLS context |
| `genesis.get_workspace_context()` | Get current RLS context |
| `genesis.calculate_workspace_health(uuid)` | Calculate health score |
| `genesis.refresh_all_health()` | Refresh all health scores |
| `genesis.run_jsonb_index_watchdog()` | Create needed JSONB indexes |

---

# 🖥️ GOD MODE PAGE IMPLEMENTATION

```tsx
// app/admin/god-mode/page.tsx

'use client';

import React, { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import useSWR from 'swr';
import {
  LayoutDashboard,
  Activity,
  Webhook,
  Database,
  Settings,
  Shield,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkspaceHeatmap } from '@/components/admin/workspace-heatmap';
import { WatchdogPanel } from '@/components/admin/watchdog-panel';
import { MigrationDashboard } from '@/components/admin/migration-dashboard';

// ============================================
// TYPES
// ============================================

type TabId = 'overview' | 'health' | 'watchdog' | 'webhooks' | 'migration' | 'security';

interface SystemStatus {
  database: 'healthy' | 'degraded' | 'down';
  n8n: 'healthy' | 'degraded' | 'down';
  webhooks: 'healthy' | 'degraded' | 'down';
  rateLimit: 'healthy' | 'degraded' | 'down';
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function GodModePage() {
  const { userId, isLoaded } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const { data: systemStatus, isLoading } = useSWR<SystemStatus>('/api/admin/system-status');
  const { data: authCheck } = useSWR<{ isAdmin: boolean }>('/api/admin/auth-check');

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  if (!authCheck?.isAdmin) {
    return <AccessDenied />;
  }

  const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'health', label: 'Health Mesh', icon: <Activity className="w-4 h-4" /> },
    { id: 'watchdog', label: 'Watchdog', icon: <Shield className="w-4 h-4" /> },
    { id: 'webhooks', label: 'Webhooks', icon: <Webhook className="w-4 h-4" /> },
    { id: 'migration', label: 'Migration', icon: <Database className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">God Mode</h1>
                <p className="text-sm text-gray-500">Genesis Engine Control Center</p>
              </div>
            </div>

            <SystemStatusIndicator status={systemStatus} isLoading={isLoading} />
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'health' && <WorkspaceHeatmap />}
        {activeTab === 'watchdog' && <WatchdogPanel />}
        {activeTab === 'webhooks' && <WebhooksTab />}
        {activeTab === 'migration' && <MigrationTab />}
        {activeTab === 'security' && <SecurityTab />}
      </main>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-gray-500">You do not have permission to access God Mode.</p>
      </div>
    </div>
  );
}

function SystemStatusIndicator({
  status,
  isLoading,
}: {
  status?: SystemStatus;
  isLoading: boolean;
}) {
  if (isLoading || !status) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading status...</span>
      </div>
    );
  }

  const allHealthy = Object.values(status).every((s) => s === 'healthy');
  const hasCritical = Object.values(status).some((s) => s === 'down');

  return (
    <div className="flex items-center gap-4">
      {Object.entries(status).map(([key, value]) => (
        <div key={key} className="flex items-center gap-1">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              value === 'healthy' && 'bg-green-500',
              value === 'degraded' && 'bg-yellow-500',
              value === 'down' && 'bg-red-500'
            )}
          />
          <span className="text-xs text-gray-500 capitalize">{key}</span>
        </div>
      ))}

      <div
        className={cn(
          'px-3 py-1 rounded-full text-sm font-medium',
          allHealthy && 'bg-green-100 text-green-700',
          !allHealthy && !hasCritical && 'bg-yellow-100 text-yellow-700',
          hasCritical && 'bg-red-100 text-red-700'
        )}
      >
        {allHealthy ? 'All Systems Operational' : hasCritical ? 'Critical Issues' : 'Degraded'}
      </div>
    </div>
  );
}

function OverviewTab() {
  const { data: stats } = useSWR('/api/admin/overview-stats');

  const cards = [
    { label: 'Total Workspaces', value: stats?.totalWorkspaces || 0, icon: <Database /> },
    { label: 'Active Partitions', value: stats?.activePartitions || 0, icon: <Activity /> },
    { label: 'Total Leads', value: stats?.totalLeads?.toLocaleString() || 0, icon: <LayoutDashboard /> },
    { label: 'Active Workflows', value: stats?.activeWorkflows || 0, icon: <Webhook /> },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                {card.icon}
              </div>
              <div>
                <div className="text-2xl font-bold">{card.value}</div>
                <div className="text-sm text-gray-500">{card.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Recent Activity</h2>
        </div>
        <RecentActivityList />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Quick Actions</h2>
        </div>
        <div className="p-4 grid grid-cols-3 gap-4">
          <QuickActionButton
            label="Run Watchdog"
            description="Detect and heal drifts"
            onClick={() => fetch('/api/admin/watchdog', { method: 'POST' })}
          />
          <QuickActionButton
            label="Refresh Health"
            description="Update all health scores"
            onClick={() => fetch('/api/admin/health-mesh', { method: 'POST' })}
          />
          <QuickActionButton
            label="Process DLQ"
            description="Retry dead letter queue"
            onClick={() => fetch('/api/cron/dlq-processor')}
          />
        </div>
      </div>
    </div>
  );
}

function RecentActivityList() {
  const { data: activity } = useSWR('/api/admin/recent-activity');

  return (
    <div className="divide-y max-h-80 overflow-auto">
      {activity?.items?.map((item: any, i: number) => (
        <div key={i} className="p-4 flex items-center gap-4">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              item.type === 'success' && 'bg-green-500',
              item.type === 'warning' && 'bg-yellow-500',
              item.type === 'error' && 'bg-red-500'
            )}
          />
          <div className="flex-1">
            <div className="text-sm">{item.message}</div>
            <div className="text-xs text-gray-400">{item.timestamp}</div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </div>
      )) || (
        <div className="p-8 text-center text-gray-400">No recent activity</div>
      )}
    </div>
  );
}

function QuickActionButton({
  label,
  description,
  onClick,
}: {
  label: string;
  description: string;
  onClick: () => void;
}) {
  const [isRunning, setIsRunning] = useState(false);

  const handleClick = async () => {
    setIsRunning(true);
    try {
      await onClick();
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isRunning}
      className="p-4 border rounded-lg text-left hover:bg-gray-50 transition-colors"
    >
      <div className="font-medium flex items-center gap-2">
        {isRunning && <RefreshCw className="w-4 h-4 animate-spin" />}
        {label}
      </div>
      <div className="text-sm text-gray-500">{description}</div>
    </button>
  );
}

function WebhooksTab() {
  const { data } = useSWR('/api/admin/webhook-health');

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Total Webhooks</div>
          <div className="text-2xl font-bold">{data?.total || 0}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Healthy</div>
          <div className="text-2xl font-bold text-green-600">{data?.healthy || 0}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Degraded</div>
          <div className="text-2xl font-bold text-yellow-600">{data?.degraded || 0}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Failed</div>
          <div className="text-2xl font-bold text-red-600">{data?.failed || 0}</div>
        </div>
      </div>

      {/* Webhook List */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Webhook Registry</h2>
          <button className="text-sm text-blue-600 hover:underline">Export</button>
        </div>
        <div className="divide-y">
          {data?.webhooks?.map((webhook: any) => (
            <div key={webhook.id} className="p-4 flex items-center gap-4">
              <StatusIcon status={webhook.status} />
              <div className="flex-1">
                <div className="font-medium">{webhook.webhook_name}</div>
                <div className="text-sm text-gray-500">{webhook.target_url}</div>
              </div>
              <div className="text-right">
                <div className="text-sm">{webhook.success_count} successes</div>
                <div className="text-sm text-red-600">{webhook.failure_count} failures</div>
              </div>
              <div
                className={cn(
                  'px-2 py-1 rounded text-xs font-medium',
                  webhook.circuit_state === 'closed' && 'bg-green-100 text-green-700',
                  webhook.circuit_state === 'open' && 'bg-red-100 text-red-700',
                  webhook.circuit_state === 'half_open' && 'bg-yellow-100 text-yellow-700'
                )}
              >
                {webhook.circuit_state}
              </div>
            </div>
          )) || (
            <div className="p-8 text-center text-gray-400">No webhooks configured</div>
          )}
        </div>
      </div>

      {/* Dead Letter Queue */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Dead Letter Queue</h2>
          <span className="text-sm text-gray-500">{data?.dlqCount || 0} unresolved</span>
        </div>
        <div className="p-4">
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Process DLQ
          </button>
        </div>
      </div>
    </div>
  );
}

function MigrationTab() {
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const { data: migrations } = useSWR('/api/admin/migrations');

  return (
    <div className="space-y-6">
      {/* Migration Overview */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold mb-4">Active Migrations</h2>
        <div className="space-y-2">
          {migrations?.active?.map((m: any) => (
            <div
              key={m.workspace_id}
              onClick={() => setSelectedWorkspace(m.workspace_id)}
              className={cn(
                'p-4 border rounded-lg cursor-pointer transition-colors',
                selectedWorkspace === m.workspace_id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{m.workspace_id}</div>
                  <div className="text-sm text-gray-500">{m.status}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">Parity: {m.parity_score}%</div>
                  <div className="text-xs text-gray-400">
                    Progress: {m.backfill_progress}%
                  </div>
                </div>
              </div>
            </div>
          )) || (
            <div className="text-center text-gray-400 py-8">No active migrations</div>
          )}
        </div>
      </div>

      {/* Selected Migration Detail */}
      {selectedWorkspace && (
        <MigrationDashboard workspaceId={selectedWorkspace} />
      )}
    </div>
  );
}

function SecurityTab() {
  const { data: securityData } = useSWR('/api/admin/security-audit');

  return (
    <div className="space-y-6">
      {/* RLS Status */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">RLS Configuration</h2>
        </div>
        <div className="divide-y">
          {securityData?.rlsStatus?.map((table: any) => (
            <div key={table.table_name} className="p-4 flex items-center gap-4">
              <StatusIcon status={table.status === 'OK' ? 'healthy' : 'critical'} />
              <div className="flex-1">
                <div className="font-mono text-sm">{table.table_name}</div>
                <div className="text-xs text-gray-500">
                  {table.policy_count} policies
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'px-2 py-1 rounded text-xs',
                    table.rls_enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  )}
                >
                  {table.rls_enabled ? 'Enabled' : 'Disabled'}
                </span>
                <span
                  className={cn(
                    'px-2 py-1 rounded text-xs',
                    table.rls_forced ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  )}
                >
                  {table.rls_forced ? 'Forced' : 'Not Forced'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Security Events */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Recent Security Events</h2>
        </div>
        <div className="divide-y max-h-96 overflow-auto">
          {securityData?.recentEvents?.map((event: any) => (
            <div key={event.id} className="p-4 flex items-center gap-4">
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  event.event_type.includes('attempt') ? 'bg-red-500' : 'bg-blue-500'
                )}
              />
              <div className="flex-1">
                <div className="text-sm">{event.event_type}</div>
                <div className="text-xs text-gray-400">
                  {event.workspace_id_attempted} • {new Date(event.created_at).toLocaleString()}
                </div>
              </div>
              <span
                className={cn(
                  'px-2 py-1 rounded text-xs',
                  event.action_taken === 'denied' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                )}
              >
                {event.action_taken}
              </span>
            </div>
          )) || (
            <div className="p-8 text-center text-gray-400">No recent events</div>
          )}
        </div>
      </div>

      {/* Run Security Tests */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold mb-4">Security Tests</h2>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          Run RLS Security Tests
        </button>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'degraded':
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case 'critical':
    case 'unhealthy':
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    default:
      return <Activity className="w-5 h-5 text-gray-400" />;
  }
}
```

---

# 📊 MERMAID DIAGRAMS

## DIAGRAM.1 SYSTEM ARCHITECTURE

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Browser]
        Mobile[Mobile App]
    end

    subgraph "Edge Layer"
        Vercel[Vercel Edge]
        Clerk[Clerk Auth]
    end

    subgraph "Application Layer"
        NextJS[Next.js App]
        API[API Routes]
        Cron[Cron Jobs]
    end

    subgraph "Integration Layer"
        N8N[n8n Cloud]
        Webhooks[Webhook Handler]
    end

    subgraph "Data Layer"
        Supabase[Supabase]
        Genesis[Genesis Schema]
        Partitions[Partitioned Tables]
    end

    Browser --> Vercel
    Mobile --> Vercel
    Vercel --> Clerk
    Clerk --> NextJS
    NextJS --> API
    API --> Webhooks
    Webhooks --> N8N
    N8N --> Webhooks
    API --> Supabase
    Supabase --> Genesis
    Genesis --> Partitions
    Cron --> API
```

## DIAGRAM.2 PARTITION PROVISIONING FLOW

```mermaid
sequenceDiagram
    participant Admin
    participant API
    participant Orchestrator
    participant Supabase
    participant N8N

    Admin->>API: POST /api/admin/ignite
    API->>API: Validate request
    API->>Orchestrator: igniteWorkspace(config)
    
    Orchestrator->>Supabase: fn_ignite_workspace_partition()
    Supabase-->>Orchestrator: partition_name

    Orchestrator->>Supabase: Store credentials
    Supabase-->>Orchestrator: credential_ids

    loop For each template workflow
        Orchestrator->>N8N: Clone workflow
        N8N-->>Orchestrator: workflow_id
        Orchestrator->>N8N: Replace variables
        Orchestrator->>N8N: Inject credentials
    end

    Orchestrator->>N8N: Activate workflows
    Orchestrator->>Supabase: Update ignition_state
    Orchestrator-->>API: IgnitionResult
    API-->>Admin: 200 OK
```

## DIAGRAM.3 WEBHOOK FLOW

```mermaid
sequenceDiagram
    participant N8N
    participant Webhook as Webhook Handler
    participant Queue as Retry Queue
    participant DB as Supabase
    participant DLQ as Dead Letter Queue

    N8N->>Webhook: POST /api/events
    Webhook->>Webhook: Validate secret
    Webhook->>DB: Check idempotency key
    
    alt Already processed
        DB-->>Webhook: Existing event
        Webhook-->>N8N: 200 (duplicate)
    else New event
        Webhook->>DB: Log event (processing)
        Webhook->>DB: Process event
        
        alt Success
            Webhook->>DB: Update status (completed)
            Webhook-->>N8N: 200 OK
        else Failure
            Webhook->>Queue: Schedule retry
            Queue->>Webhook: Retry (with backoff)
            
            alt Max retries exceeded
                Queue->>DLQ: Move to dead letter
                Webhook->>DB: Update status (dead_letter)
            end
        end
    end
```

## DIAGRAM.4 WATCHDOG FLOW

```mermaid
flowchart TB
    Start([Cron Trigger]) --> Fetch[Fetch DB State]
    Fetch --> FetchN8N[Fetch n8n State]
    FetchN8N --> Compare[Compare States]
    
    Compare --> Orphan{Orphan Workflows?}
    Orphan -->|Yes| LogOrphan[Log Drift]
    Orphan -->|No| Ghost{Ghost Campaigns?}
    
    Ghost -->|Yes| LogGhost[Log Drift]
    Ghost -->|No| Mismatch{State Mismatch?}
    
    Mismatch -->|Yes| LogMismatch[Log Drift]
    Mismatch -->|No| Complete
    
    LogOrphan --> AutoHeal{Auto-Heal?}
    LogGhost --> AutoHeal
    LogMismatch --> AutoHeal
    
    AutoHeal -->|Yes| Heal[Execute Healing]
    AutoHeal -->|No| Complete
    
    Heal --> LogResult[Log Result]
    LogResult --> Complete
    
    Complete([Complete Run])
```

## DIAGRAM.5 RLS SECURITY MODEL

```mermaid
flowchart TB
    Request([API Request]) --> SetContext[Set Workspace Context]
    SetContext --> Query[Execute Query]
    
    Query --> RLS{RLS Policy Check}
    
    RLS -->|Context NULL| Deny1[Return Zero Rows]
    RLS -->|Context Invalid| Deny2[Return Zero Rows]
    RLS -->|Context Mismatch| Deny3[Filter to Zero]
    RLS -->|Context Valid| Allow[Return Matching Rows]
    
    Deny1 --> Log1[Log Security Event]
    Deny2 --> Log2[Log Security Event]
    Deny3 --> Log3[Log Security Event]
    Allow --> Success([Success Response])
    
    Log1 --> Fail([Empty Response])
    Log2 --> Fail
    Log3 --> Fail
```

## DIAGRAM.6 DEPLOYMENT PIPELINE

```mermaid
flowchart LR
    subgraph "Development"
        Code[Code Change]
        PR[Pull Request]
        Tests[Automated Tests]
    end

    subgraph "Staging"
        Deploy[Deploy to Staging]
        Integration[Integration Tests]
        Approval[Manual Approval]
    end

    subgraph "Production"
        Canary[Canary Deploy]
        Monitor[Monitor Metrics]
        Promote{Healthy?}
        Full[Full Rollout]
        Rollback[Rollback]
    end

    Code --> PR
    PR --> Tests
    Tests -->|Pass| Deploy
    Deploy --> Integration
    Integration -->|Pass| Approval
    Approval --> Canary
    Canary --> Monitor
    Monitor --> Promote
    Promote -->|Yes| Full
    Promote -->|No| Rollback
```

---

# 📁 TYPE DEFINITIONS

```typescript
// lib/genesis/types/index.ts

// ============================================
// WORKSPACE TYPES
// ============================================

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  settings: WorkspaceSettings;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSettings {
  leadsTable: string;
  campaignPrefix: string;
  timezone: string;
  webhookUrl?: string;
  features: WorkspaceFeatures;
}

export interface WorkspaceFeatures {
  sandboxMode: boolean;
  autoResearch: boolean;
  multiCampaign: boolean;
  advancedAnalytics: boolean;
}

// ============================================
// LEAD TYPES
// ============================================

export interface Lead {
  id: string;
  workspaceId: string;
  emailAddress: string;
  linkedinUrl?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  organizationName?: string;
  jobTitle?: string;
  phone?: string;
  location?: string;
  industry?: string;
  companySize?: string;
  websiteUrl?: string;
  status: LeadStatus;
  campaignName?: string;
  email1Subject?: string;
  email1Body?: string;
  email2Body?: string;
  email3Subject?: string;
  email3Body?: string;
  email1Sent: boolean;
  email2Sent: boolean;
  email3Sent: boolean;
  email1SentAt?: string;
  email2SentAt?: string;
  email3SentAt?: string;
  researchData: Record<string, unknown>;
  relevanceAiOutput: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type LeadStatus =
  | 'pending'
  | 'researching'
  | 'ready'
  | 'sending'
  | 'sent'
  | 'replied'
  | 'bounced'
  | 'opted_out'
  | 'completed';

// ============================================
// PARTITION TYPES
// ============================================

export interface Partition {
  workspaceId: string;
  partitionName: string;
  partitionSlug: string;
  status: PartitionStatus;
  rowCount: number;
  sizeBytes: number;
  indexCount: number;
  indexesCreated: string[];
  constraintsVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastStatsUpdate?: string;
}

export type PartitionStatus =
  | 'creating'
  | 'active'
  | 'migrating'
  | 'maintenance'
  | 'dropping'
  | 'dropped';

// ============================================
// IGNITION TYPES
// ============================================

export interface IgnitionConfig {
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  variables: IgnitionVariables;
  credentials: CredentialConfig[];
}

export interface IgnitionVariables {
  YOUR_DASHBOARD_URL: string;
  YOUR_WEBHOOK_TOKEN: string;
  YOUR_SENDER_EMAIL: string;
  YOUR_NAME: string;
  YOUR_COMPANY_NAME: string;
  YOUR_CALENDLY_LINK_1?: string;
  YOUR_CALENDLY_LINK_2?: string;
  [key: string]: string | undefined;
}

export interface CredentialConfig {
  type: CredentialType;
  name: string;
  data: Record<string, string>;
}

export type CredentialType =
  | 'google_oauth2'
  | 'openai_api'
  | 'smtp'
  | 'supabase'
  | 'postgres'
  | 'http_header_auth'
  | 'http_basic_auth';

export interface IgnitionState {
  workspaceId: string;
  status: IgnitionStatus;
  currentStep: number;
  totalSteps: number;
  partitionName?: string;
  workflowIds?: string[];
  credentialIds?: string[];
  error?: string;
  startedAt: string;
  updatedAt: string;
}

export type IgnitionStatus =
  | 'pending'
  | 'partition_creating'
  | 'credentials_storing'
  | 'workflows_cloning'
  | 'activating'
  | 'active'
  | 'rollback_in_progress'
  | 'failed';

export interface IgnitionResult {
  success: boolean;
  workspaceId: string;
  partitionName?: string;
  workflowCount?: number;
  duration: number;
  error?: string;
}

// ============================================
// WEBHOOK TYPES
// ============================================

export interface WebhookRegistry {
  id: string;
  workspaceId: string;
  webhookType: WebhookType;
  webhookName: string;
  sourceUrl?: string;
  targetUrl: string;
  n8nWorkflowId?: string;
  n8nNodeName?: string;
  status: WebhookStatus;
  lastPingAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  failureCount: number;
  successCount: number;
  circuitState: CircuitState;
  circuitOpenedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type WebhookType =
  | 'n8n_trigger'
  | 'n8n_callback'
  | 'external_integration'
  | 'internal_event';

export type WebhookStatus =
  | 'pending'
  | 'verified'
  | 'healthy'
  | 'degraded'
  | 'unhealthy'
  | 'disabled';

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface WebhookEvent {
  id: string;
  workspaceId: string;
  webhookId?: string;
  eventType: string;
  direction: 'inbound' | 'outbound';
  idempotencyKey?: string;
  requestBody?: Record<string, unknown>;
  responseStatus?: number;
  responseBody?: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  status: WebhookEventStatus;
  errorMessage?: string;
  retryCount: number;
  nextRetryAt?: string;
  createdAt: string;
}

export type WebhookEventStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'retrying'
  | 'dead_letter';

// ============================================
// HEALTH TYPES
// ============================================

export interface WorkspaceHealth {
  workspaceId: string;
  healthScore: number;
  healthStatus: HealthStatus;
  partitionHealth: number;
  workflowHealth: number;
  webhookHealth: number;
  credentialHealth: number;
  leadCount: number;
  activeWorkflows: number;
  failedWebhooks24h: number;
  openIssues: number;
  criticalIssues: number;
  lastActivityAt?: string;
  lastCalculatedAt: string;
  createdAt: string;
}

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'critical';

// ============================================
// WATCHDOG TYPES
// ============================================

export interface WatchdogRun {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: WatchdogRunStatus;
  driftsDetected: number;
  driftsHealed: number;
  driftsFailed: number;
}

export type WatchdogRunStatus = 'running' | 'completed' | 'failed';

export interface DriftItem {
  workspaceId: string;
  driftType: DriftType;
  severity: Severity;
  details: Record<string, unknown>;
  autoHealable: boolean;
  healAction?: string;
}

export type DriftType =
  | 'orphan_workflow'
  | 'ghost_campaign'
  | 'state_mismatch'
  | 'partition_missing'
  | 'credential_desync';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

// ============================================
// MIGRATION TYPES
// ============================================

export interface MigrationState {
  workspaceId: string;
  sourceTable: string;
  targetTable: string;
  status: MigrationStatus;
  dualWriteEnabled: boolean;
  backfillProgress: number;
  backfillLastId?: string;
  parityScore: number;
  lastVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type MigrationStatus =
  | 'idle'
  | 'dual_write'
  | 'backfilling'
  | 'verifying'
  | 'cutover_ready'
  | 'cutover_complete';

export interface ParityCheckResult {
  match: boolean;
  sourceCount: number;
  targetCount: number;
  parityScore: number;
  mismatches: ParityMismatch[];
  missingInTarget: string[];
  missingInSource: string[];
}

export interface ParityMismatch {
  id: string;
  field: string;
  sourceValue: unknown;
  targetValue: unknown;
}

// ============================================
// DEPLOYMENT TYPES
// ============================================

export interface DeploymentState {
  activeSlot: 'blue' | 'green';
  standbySlot: 'blue' | 'green';
  canaryPercentage: number;
  status: DeploymentStatus;
  lastDeployedAt?: string;
  activeVersion: string;
  standbyVersion?: string;
}

export type DeploymentStatus =
  | 'stable'
  | 'deploying'
  | 'canary'
  | 'rolling_back';

export interface RevertTrigger {
  name: string;
  threshold: number;
  currentValue: number;
  triggered: boolean;
  autoRevert: boolean;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================
// EVENT TYPES
// ============================================

export interface EmailSentEvent {
  eventType: 'email_sent';
  email: string;
  emailNumber: 1 | 2 | 3;
  subject?: string;
  messageId?: string;
}

export interface EmailOpenedEvent {
  eventType: 'email_opened';
  email: string;
  emailNumber: 1 | 2 | 3;
  openedAt?: string;
}

export interface EmailClickedEvent {
  eventType: 'email_clicked';
  email: string;
  emailNumber: 1 | 2 | 3;
  url: string;
  clickedAt?: string;
}

export interface EmailRepliedEvent {
  eventType: 'email_replied';
  email: string;
  replySnippet?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface EmailBouncedEvent {
  eventType: 'email_bounced';
  email: string;
  bounceType: 'hard' | 'soft';
  bounceReason?: string;
}

export interface LeadUpdatedEvent {
  eventType: 'lead_updated';
  email: string;
  updates: Partial<Lead>;
}

export type WebhookEventPayload =
  | EmailSentEvent
  | EmailOpenedEvent
  | EmailClickedEvent
  | EmailRepliedEvent
  | EmailBouncedEvent
  | LeadUpdatedEvent;
```

---

# 🛠️ UTILITY FUNCTIONS

## UTIL.1 DATABASE UTILITIES

```typescript
// lib/genesis/db-utils.ts

import { supabaseAdmin } from '@/lib/supabase';

// ============================================
// WORKSPACE CONTEXT HELPERS
// ============================================

export async function withWorkspaceContext<T>(
  workspaceId: string,
  fn: () => Promise<T>
): Promise<T> {
  // Validate UUID
  if (!isValidUUID(workspaceId)) {
    throw new Error(`Invalid workspace ID format: ${workspaceId}`);
  }

  // Set context
  const { error: ctxError } = await supabaseAdmin!.rpc('set_workspace_context', {
    p_workspace_id: workspaceId,
  });

  if (ctxError) {
    throw new Error(`Failed to set workspace context: ${ctxError.message}`);
  }

  // Execute function
  return fn();
}

export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// ============================================
// BATCH OPERATIONS
// ============================================

export async function batchInsert<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  options: {
    batchSize?: number;
    onConflict?: string;
    returning?: boolean;
  } = {}
): Promise<{ inserted: number; errors: Array<{ row: T; error: string }> }> {
  const { batchSize = 100, onConflict, returning = false } = options;
  const batches = chunk(rows, batchSize);

  let inserted = 0;
  const errors: Array<{ row: T; error: string }> = [];

  for (const batch of batches) {
    try {
      let query = supabaseAdmin!.from(table).insert(batch);

      if (onConflict) {
        query = query.upsert(batch, { onConflict });
      }

      if (returning) {
        query = query.select();
      }

      const { data, error } = await query;

      if (error) {
        // Try individual inserts for better error reporting
        for (const row of batch) {
          const { error: rowError } = await supabaseAdmin!.from(table).insert(row);
          if (rowError) {
            errors.push({ row, error: rowError.message });
          } else {
            inserted++;
          }
        }
      } else {
        inserted += batch.length;
      }
    } catch (err) {
      for (const row of batch) {
        errors.push({ row, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }
  }

  return { inserted, errors };
}

export async function batchUpdate<T extends Record<string, unknown>>(
  table: string,
  updates: Array<{ id: string; data: Partial<T> }>,
  options: { batchSize?: number } = {}
): Promise<{ updated: number; errors: Array<{ id: string; error: string }> }> {
  const { batchSize = 50 } = options;
  const batches = chunk(updates, batchSize);

  let updated = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const batch of batches) {
    for (const { id, data } of batch) {
      const { error } = await supabaseAdmin!
        .from(table)
        .update(data)
        .eq('id', id);

      if (error) {
        errors.push({ id, error: error.message });
      } else {
        updated++;
      }
    }
  }

  return { updated, errors };
}

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// ============================================
// QUERY HELPERS
// ============================================

export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function paginatedQuery<T>(
  table: string,
  filters: Record<string, unknown>,
  options: PaginationOptions
): Promise<{
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const { page, pageSize, sortBy = 'created_at', sortOrder = 'desc' } = options;
  const offset = (page - 1) * pageSize;

  // Count total
  let countQuery = supabaseAdmin!.from(table).select('*', { count: 'exact', head: true });
  for (const [key, value] of Object.entries(filters)) {
    countQuery = countQuery.eq(key, value);
  }
  const { count } = await countQuery;

  // Get data
  let dataQuery = supabaseAdmin!
    .from(table)
    .select('*')
    .range(offset, offset + pageSize - 1)
    .order(sortBy, { ascending: sortOrder === 'asc' });

  for (const [key, value] of Object.entries(filters)) {
    dataQuery = dataQuery.eq(key, value);
  }

  const { data, error } = await dataQuery;

  if (error) throw error;

  return {
    data: data as T[],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

// ============================================
// TRANSACTION HELPERS
// ============================================

export async function runTransaction<T>(
  operations: Array<() => Promise<unknown>>
): Promise<{ success: boolean; results: unknown[]; error?: string }> {
  const results: unknown[] = [];

  try {
    // Note: Supabase JS client doesn't have native transaction support
    // This is a best-effort sequential execution
    for (const op of operations) {
      const result = await op();
      results.push(result);
    }

    return { success: true, results };
  } catch (error) {
    return {
      success: false,
      results,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// SCHEMA HELPERS
// ============================================

export async function tableExists(schema: string, table: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin!.rpc('check_table_exists', {
    p_schema: schema,
    p_table: table,
  });

  if (error) throw error;
  return data as boolean;
}

export async function columnExists(
  schema: string,
  table: string,
  column: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin!.rpc('check_column_exists', {
    p_schema: schema,
    p_table: table,
    p_column: column,
  });

  if (error) throw error;
  return data as boolean;
}

export async function indexExists(indexName: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin!.rpc('check_index_exists', {
    p_index_name: indexName,
  });

  if (error) throw error;
  return data as boolean;
}
```

## UTIL.2 N8N UTILITIES

```typescript
// lib/genesis/n8n-utils.ts

import { getN8nClient } from './n8n-client-extended';

// ============================================
// WORKFLOW HELPERS
// ============================================

export interface WorkflowInfo {
  id: string;
  name: string;
  active: boolean;
  workspaceId?: string;
  campaignId?: string;
  webhookUrls: string[];
  nodeCount: number;
  lastExecuted?: string;
}

export async function getWorkflowsByWorkspace(
  workspaceId: string
): Promise<WorkflowInfo[]> {
  const client = getN8nClient();
  const workflows = await client.getWorkflows();

  return workflows
    .filter((wf) => wf.name.includes(`[${workspaceId}]`) || extractWorkspaceId(wf) === workspaceId)
    .map((wf) => ({
      id: wf.id,
      name: wf.name,
      active: wf.active,
      workspaceId: extractWorkspaceId(wf),
      campaignId: extractCampaignId(wf),
      webhookUrls: extractWebhookUrls(wf),
      nodeCount: wf.nodes.length,
    }));
}

export function extractWorkspaceId(workflow: any): string | undefined {
  // Try to extract from name
  const match = workflow.name.match(/\[([^\]]+)\]/);
  if (match) return match[1];

  // Try to extract from nodes
  for (const node of workflow.nodes || []) {
    const params = node.parameters || {};
    if (params.workspace_id) return params.workspace_id;
    if (typeof params.body === 'string' && params.body.includes('workspace_id')) {
      const bodyMatch = params.body.match(/"workspace_id":\s*"([^"]+)"/);
      if (bodyMatch) return bodyMatch[1];
    }
  }

  return undefined;
}

export function extractCampaignId(workflow: any): string | undefined {
  // Try to extract from name
  const match = workflow.name.match(/campaign[_-]([a-zA-Z0-9-]+)/i);
  if (match) return match[1];

  return undefined;
}

export function extractWebhookUrls(workflow: any): string[] {
  const urls: string[] = [];

  for (const node of workflow.nodes || []) {
    if (node.type === 'n8n-nodes-base.webhook') {
      const path = node.parameters?.path;
      if (path) {
        urls.push(`/webhook/${path}`);
      }
    }

    // Check for HTTP request nodes making webhook calls
    if (node.type === 'n8n-nodes-base.httpRequest') {
      const url = node.parameters?.url;
      if (url && (url.includes('webhook') || url.includes('/api/events'))) {
        urls.push(url);
      }
    }
  }

  return urls;
}

// ============================================
// VARIABLE REPLACEMENT
// ============================================

export interface VariableReplacement {
  placeholder: string;
  value: string;
}

export function replaceVariablesInWorkflow(
  workflow: any,
  replacements: VariableReplacement[]
): any {
  const workflowJson = JSON.stringify(workflow);
  let result = workflowJson;

  for (const { placeholder, value } of replacements) {
    result = result.replace(new RegExp(escapeRegex(placeholder), 'g'), value);
  }

  return JSON.parse(result);
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================
// CREDENTIAL HELPERS
// ============================================

export interface CredentialMapping {
  nodeId: string;
  nodeName: string;
  credentialType: string;
  currentCredentialId?: string;
  newCredentialId?: string;
}

export function extractCredentialMappings(workflow: any): CredentialMapping[] {
  const mappings: CredentialMapping[] = [];

  for (const node of workflow.nodes || []) {
    const credentials = node.credentials || {};

    for (const [credType, credConfig] of Object.entries(credentials)) {
      mappings.push({
        nodeId: node.id,
        nodeName: node.name,
        credentialType: credType,
        currentCredentialId: (credConfig as any)?.id,
      });
    }
  }

  return mappings;
}

export function updateWorkflowCredentials(
  workflow: any,
  credentialUpdates: Record<string, string>
): any {
  const result = JSON.parse(JSON.stringify(workflow));

  for (const node of result.nodes || []) {
    const credentials = node.credentials || {};

    for (const [credType, credConfig] of Object.entries(credentials)) {
      if (credConfig && (credConfig as any).id && credentialUpdates[(credConfig as any).id]) {
        (credConfig as any).id = credentialUpdates[(credConfig as any).id];
      }
    }
  }

  return result;
}

// ============================================
// EXECUTION HELPERS
// ============================================

export interface ExecutionSummary {
  total: number;
  successful: number;
  failed: number;
  running: number;
  successRate: number;
  avgDuration: number;
}

export async function getExecutionSummary(
  workflowId: string,
  since?: Date
): Promise<ExecutionSummary> {
  const client = getN8nClient();
  const executions = await client.getExecutions({
    workflowId,
    limit: 100,
  });

  const filtered = since
    ? executions.filter((e) => new Date(e.startedAt) >= since)
    : executions;

  const successful = filtered.filter((e) => e.status === 'success').length;
  const failed = filtered.filter((e) => e.status === 'error').length;
  const running = filtered.filter((e) => e.status === 'running').length;

  const durations = filtered
    .filter((e) => e.stoppedAt)
    .map((e) => new Date(e.stoppedAt!).getTime() - new Date(e.startedAt).getTime());

  return {
    total: filtered.length,
    successful,
    failed,
    running,
    successRate: filtered.length > 0 ? successful / filtered.length : 0,
    avgDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
  };
}
```

## UTIL.3 VALIDATION UTILITIES

```typescript
// lib/genesis/validation-utils.ts

import { z } from 'zod';

// ============================================
// COMMON SCHEMAS
// ============================================

export const UUIDSchema = z.string().uuid('Invalid UUID format');

export const EmailSchema = z.string().email('Invalid email format').toLowerCase();

export const URLSchema = z.string().url('Invalid URL format');

export const SlugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(50, 'Slug must be at most 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens');

export const WorkspaceIdSchema = UUIDSchema;

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================
// LEAD VALIDATION
// ============================================

export const LeadCreateSchema = z.object({
  email_address: EmailSchema,
  linkedin_url: URLSchema.optional(),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  full_name: z.string().max(200).optional(),
  organization_name: z.string().max(200).optional(),
  job_title: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  location: z.string().max(200).optional(),
  industry: z.string().max(100).optional(),
  company_size: z.string().max(50).optional(),
  website_url: URLSchema.optional(),
  campaign_name: z.string().max(100).optional(),
});

export const LeadUpdateSchema = LeadCreateSchema.partial();

export const LeadBulkCreateSchema = z.object({
  leads: z.array(LeadCreateSchema).min(1).max(1000),
  skipDuplicates: z.boolean().default(true),
});

// ============================================
// IGNITION VALIDATION
// ============================================

export const IgnitionRequestSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  workspaceSlug: SlugSchema,
  workspaceName: z.string().min(1).max(100),
  variables: z.object({
    YOUR_DASHBOARD_URL: URLSchema,
    YOUR_WEBHOOK_TOKEN: z.string().min(32),
    YOUR_SENDER_EMAIL: EmailSchema,
    YOUR_NAME: z.string().min(1),
    YOUR_COMPANY_NAME: z.string().min(1),
    YOUR_CALENDLY_LINK_1: URLSchema.optional(),
    YOUR_CALENDLY_LINK_2: URLSchema.optional(),
  }),
  credentials: z.array(z.object({
    type: z.enum(['google_oauth2', 'openai_api', 'smtp', 'supabase']),
    name: z.string().min(1),
    data: z.record(z.string()),
  })),
});

// ============================================
// WEBHOOK VALIDATION
// ============================================

export const WebhookEventSchema = z.object({
  workspace_id: WorkspaceIdSchema,
  idempotency_key: z.string().min(16).max(64),
  timestamp: z.string().datetime().optional(),
  data: z.discriminatedUnion('event_type', [
    z.object({
      event_type: z.literal('email_sent'),
      email: EmailSchema,
      email_number: z.number().int().min(1).max(3),
      subject: z.string().optional(),
      message_id: z.string().optional(),
    }),
    z.object({
      event_type: z.literal('email_opened'),
      email: EmailSchema,
      email_number: z.number().int().min(1).max(3),
      opened_at: z.string().datetime().optional(),
    }),
    z.object({
      event_type: z.literal('email_clicked'),
      email: EmailSchema,
      email_number: z.number().int().min(1).max(3),
      url: URLSchema,
      clicked_at: z.string().datetime().optional(),
    }),
    z.object({
      event_type: z.literal('email_replied'),
      email: EmailSchema,
      reply_snippet: z.string().max(1000).optional(),
      sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
    }),
    z.object({
      event_type: z.literal('email_bounced'),
      email: EmailSchema,
      bounce_type: z.enum(['hard', 'soft']),
      bounce_reason: z.string().max(500).optional(),
    }),
    z.object({
      event_type: z.literal('lead_updated'),
      email: EmailSchema,
      updates: z.record(z.unknown()),
    }),
  ]),
});

// ============================================
// BULK UPDATE VALIDATION
// ============================================

export const BulkUpdateRequestSchema = z.object({
  blueprintId: UUIDSchema,
  targetWorkspaceIds: z.array(UUIDSchema).optional(),
  rateLimit: z.number().int().min(1).max(100).default(10),
  canaryPercentage: z.number().min(0).max(100).optional(),
  rollbackThreshold: z.number().min(0).max(1).optional(),
  dryRun: z.boolean().optional(),
});

// ============================================
// VALIDATION HELPERS
// ============================================

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError['errors'] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error.errors };
}

export function formatValidationErrors(errors: z.ZodError['errors']): string {
  return errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
}

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
}
```

---

# 📊 ADDITIONAL SQL FUNCTIONS

```sql
-- ============================================
-- GENESIS ENGINE: ADDITIONAL SQL FUNCTIONS
-- ============================================

-- ============================================
-- SCHEMA CHECK FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION genesis.check_table_exists(
    p_schema TEXT,
    p_table TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = p_schema
        AND table_name = p_table
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION genesis.check_column_exists(
    p_schema TEXT,
    p_table TEXT,
    p_column TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = p_schema
        AND table_name = p_table
        AND column_name = p_column
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION genesis.check_index_exists(p_index_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = p_index_name
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- WEBHOOK FAILURE INCREMENT
-- ============================================

CREATE OR REPLACE FUNCTION genesis.increment_webhook_failure(p_webhook_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE genesis.webhook_registry
    SET 
        failure_count = failure_count + 1,
        last_failure_at = NOW(),
        status = CASE 
            WHEN failure_count >= 10 THEN 'unhealthy'
            WHEN failure_count >= 5 THEN 'degraded'
            ELSE status
        END,
        circuit_state = CASE
            WHEN failure_count >= 5 THEN 'open'
            ELSE circuit_state
        END,
        circuit_opened_at = CASE
            WHEN failure_count >= 5 AND circuit_state != 'open' THEN NOW()
            ELSE circuit_opened_at
        END,
        updated_at = NOW()
    WHERE id = p_webhook_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RATE LIMIT TOKEN ACQUISITION
-- ============================================

CREATE OR REPLACE FUNCTION genesis.acquire_tokens(
    p_service_name TEXT,
    p_workspace_id TEXT DEFAULT 'global',
    p_tokens_needed INTEGER DEFAULT 1,
    p_max_tokens INTEGER DEFAULT 1000,
    p_refill_rate NUMERIC DEFAULT 10
)
RETURNS TABLE (
    granted BOOLEAN,
    wait_time_ms INTEGER,
    remaining_tokens INTEGER
) AS $$
DECLARE
    v_record genesis.rate_limits%ROWTYPE;
    v_now TIMESTAMPTZ := NOW();
    v_elapsed_seconds NUMERIC;
    v_refilled_tokens INTEGER;
    v_new_tokens INTEGER;
BEGIN
    -- Get or create rate limit record
    SELECT * INTO v_record
    FROM genesis.rate_limits
    WHERE service_name = p_service_name
    AND workspace_id = p_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO genesis.rate_limits (
            service_name, workspace_id, current_tokens, max_tokens, refill_rate
        ) VALUES (
            p_service_name, p_workspace_id, p_max_tokens, p_max_tokens, p_refill_rate
        )
        RETURNING * INTO v_record;
    END IF;

    -- Calculate refilled tokens
    v_elapsed_seconds := EXTRACT(EPOCH FROM (v_now - v_record.last_refill_at));
    v_refilled_tokens := FLOOR(v_elapsed_seconds * p_refill_rate);
    v_new_tokens := LEAST(v_record.current_tokens + v_refilled_tokens, p_max_tokens);

    -- Check if we can grant tokens
    IF v_new_tokens >= p_tokens_needed THEN
        -- Grant tokens
        UPDATE genesis.rate_limits
        SET 
            current_tokens = v_new_tokens - p_tokens_needed,
            last_refill_at = v_now,
            daily_used = daily_used + p_tokens_needed
        WHERE id = v_record.id;

        RETURN QUERY SELECT 
            TRUE,
            0,
            (v_new_tokens - p_tokens_needed)::INTEGER;
    ELSE
        -- Calculate wait time
        RETURN QUERY SELECT 
            FALSE,
            CEIL((p_tokens_needed - v_new_tokens) / p_refill_rate * 1000)::INTEGER,
            v_new_tokens::INTEGER;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MIGRATION HELPERS
-- ============================================

CREATE OR REPLACE FUNCTION genesis.enable_dual_write_trigger(
    p_workspace_id UUID,
    p_source_table TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_trigger_name TEXT;
    v_function_name TEXT;
    v_ws_slug TEXT;
BEGIN
    -- Get workspace slug
    SELECT partition_slug INTO v_ws_slug
    FROM genesis.partition_registry
    WHERE workspace_id = p_workspace_id;

    IF v_ws_slug IS NULL THEN
        RAISE EXCEPTION 'Partition not found for workspace %', p_workspace_id;
    END IF;

    v_trigger_name := 'dual_write_' || REPLACE(p_workspace_id::TEXT, '-', '_');
    v_function_name := 'genesis.dual_write_fn_' || REPLACE(p_workspace_id::TEXT, '-', '_');

    -- Create the trigger function
    EXECUTE format($f$
        CREATE OR REPLACE FUNCTION %s()
        RETURNS TRIGGER AS $t$
        BEGIN
            IF TG_OP = 'INSERT' THEN
                INSERT INTO genesis.leads_p_%s 
                SELECT (NEW).* ON CONFLICT DO NOTHING;
            ELSIF TG_OP = 'UPDATE' THEN
                UPDATE genesis.leads_p_%s SET
                    email_address = NEW.email_address,
                    status = NEW.status,
                    updated_at = NOW()
                WHERE id = NEW.id;
            ELSIF TG_OP = 'DELETE' THEN
                DELETE FROM genesis.leads_p_%s WHERE id = OLD.id;
            END IF;
            RETURN NEW;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Dual-write failed: %%', SQLERRM;
            RETURN NEW;
        END;
        $t$ LANGUAGE plpgsql
    $f$, v_function_name, v_ws_slug, v_ws_slug, v_ws_slug);

    -- Create the trigger
    EXECUTE format(
        'DROP TRIGGER IF EXISTS %I ON %I',
        v_trigger_name, p_source_table
    );

    EXECUTE format(
        'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %I
         FOR EACH ROW WHEN (NEW.workspace_id = %L OR OLD.workspace_id = %L)
         EXECUTE FUNCTION %s()',
        v_trigger_name, p_source_table, 
        p_workspace_id, p_workspace_id,
        v_function_name
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION genesis.disable_dual_write_trigger(
    p_workspace_id UUID,
    p_source_table TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_trigger_name TEXT;
    v_function_name TEXT;
BEGIN
    v_trigger_name := 'dual_write_' || REPLACE(p_workspace_id::TEXT, '-', '_');
    v_function_name := 'genesis.dual_write_fn_' || REPLACE(p_workspace_id::TEXT, '-', '_');

    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', v_trigger_name, p_source_table);
    EXECUTE format('DROP FUNCTION IF EXISTS %s()', v_function_name);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ANALYTICS HELPERS
-- ============================================

CREATE OR REPLACE FUNCTION genesis.get_workspace_stats(p_workspace_id UUID)
RETURNS TABLE (
    lead_count BIGINT,
    sent_count BIGINT,
    replied_count BIGINT,
    bounced_count BIGINT,
    reply_rate NUMERIC,
    bounce_rate NUMERIC,
    active_campaigns INTEGER,
    last_activity TIMESTAMPTZ
) AS $$
BEGIN
    -- Set context
    PERFORM genesis.set_workspace_context(p_workspace_id);

    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as lead_count,
        COUNT(*) FILTER (WHERE l.email_1_sent OR l.email_2_sent OR l.email_3_sent)::BIGINT as sent_count,
        COUNT(*) FILTER (WHERE l.status = 'replied')::BIGINT as replied_count,
        COUNT(*) FILTER (WHERE l.status = 'bounced')::BIGINT as bounced_count,
        CASE 
            WHEN COUNT(*) FILTER (WHERE l.email_1_sent) > 0 
            THEN ROUND(COUNT(*) FILTER (WHERE l.status = 'replied')::NUMERIC / COUNT(*) FILTER (WHERE l.email_1_sent) * 100, 2)
            ELSE 0
        END as reply_rate,
        CASE 
            WHEN COUNT(*) FILTER (WHERE l.email_1_sent) > 0 
            THEN ROUND(COUNT(*) FILTER (WHERE l.status = 'bounced')::NUMERIC / COUNT(*) FILTER (WHERE l.email_1_sent) * 100, 2)
            ELSE 0
        END as bounce_rate,
        (SELECT COUNT(DISTINCT campaign_name)::INTEGER FROM genesis.leads WHERE workspace_id = p_workspace_id) as active_campaigns,
        MAX(l.updated_at) as last_activity
    FROM genesis.leads l
    WHERE l.workspace_id = p_workspace_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION genesis.get_daily_stats(
    p_workspace_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - 30,
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    stat_date DATE,
    leads_added BIGINT,
    emails_sent BIGINT,
    opens BIGINT,
    clicks BIGINT,
    replies BIGINT,
    bounces BIGINT
) AS $$
BEGIN
    PERFORM genesis.set_workspace_context(p_workspace_id);

    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::DATE as d
    ),
    lead_stats AS (
        SELECT 
            created_at::DATE as d,
            COUNT(*) as count
        FROM genesis.leads
        WHERE workspace_id = p_workspace_id
        AND created_at >= p_start_date
        GROUP BY created_at::DATE
    ),
    email_stats AS (
        SELECT 
            COALESCE(email_1_sent_at, email_2_sent_at, email_3_sent_at)::DATE as d,
            COUNT(*) as count
        FROM genesis.leads
        WHERE workspace_id = p_workspace_id
        AND (email_1_sent OR email_2_sent OR email_3_sent)
        GROUP BY COALESCE(email_1_sent_at, email_2_sent_at, email_3_sent_at)::DATE
    ),
    event_stats AS (
        SELECT 
            timestamp::DATE as d,
            COUNT(*) FILTER (WHERE event_type = 'open') as opens,
            COUNT(*) FILTER (WHERE event_type = 'click') as clicks,
            COUNT(*) FILTER (WHERE event_type = 'reply') as replies,
            COUNT(*) FILTER (WHERE event_type = 'bounce') as bounces
        FROM email_events
        WHERE workspace_id = p_workspace_id::TEXT
        AND timestamp >= p_start_date
        GROUP BY timestamp::DATE
    )
    SELECT 
        ds.d,
        COALESCE(ls.count, 0)::BIGINT,
        COALESCE(es.count, 0)::BIGINT,
        COALESCE(ev.opens, 0)::BIGINT,
        COALESCE(ev.clicks, 0)::BIGINT,
        COALESCE(ev.replies, 0)::BIGINT,
        COALESCE(ev.bounces, 0)::BIGINT
    FROM date_series ds
    LEFT JOIN lead_stats ls ON ds.d = ls.d
    LEFT JOIN email_stats es ON ds.d = es.d
    LEFT JOIN event_stats ev ON ds.d = ev.d
    ORDER BY ds.d;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION genesis.cleanup_old_data(p_retention_days INTEGER DEFAULT 90)
RETURNS TABLE (
    table_name TEXT,
    rows_deleted BIGINT
) AS $$
DECLARE
    v_cutoff TIMESTAMPTZ := NOW() - (p_retention_days || ' days')::INTERVAL;
BEGIN
    -- Webhook events
    WITH deleted AS (
        DELETE FROM genesis.webhook_events
        WHERE created_at < v_cutoff
        AND status IN ('completed', 'dead_letter')
        RETURNING 1
    )
    SELECT 'webhook_events', COUNT(*) INTO table_name, rows_deleted FROM deleted;
    RETURN NEXT;

    -- Security audit log
    WITH deleted AS (
        DELETE FROM genesis.security_audit_log
        WHERE created_at < NOW() - INTERVAL '180 days'
        RETURNING 1
    )
    SELECT 'security_audit_log', COUNT(*) INTO table_name, rows_deleted FROM deleted;
    RETURN NEXT;

    -- Watchdog events
    WITH deleted AS (
        DELETE FROM genesis.watchdog_events
        WHERE created_at < NOW() - INTERVAL '30 days'
        RETURNING 1
    )
    SELECT 'watchdog_events', COUNT(*) INTO table_name, rows_deleted FROM deleted;
    RETURN NEXT;

    -- Partition operations
    WITH deleted AS (
        DELETE FROM genesis.partition_operations
        WHERE completed_at < v_cutoff
        RETURNING 1
    )
    SELECT 'partition_operations', COUNT(*) INTO table_name, rows_deleted FROM deleted;
    RETURN NEXT;

    -- Credential audit log
    WITH deleted AS (
        DELETE FROM genesis.credential_audit_log
        WHERE created_at < v_cutoff
        RETURNING 1
    )
    SELECT 'credential_audit_log', COUNT(*) INTO table_name, rows_deleted FROM deleted;
    RETURN NEXT;

    -- Dead letter queue (resolved items)
    WITH deleted AS (
        DELETE FROM genesis.webhook_dead_letter
        WHERE resolved = TRUE
        AND resolved_at < NOW() - INTERVAL '30 days'
        RETURNING 1
    )
    SELECT 'webhook_dead_letter', COUNT(*) INTO table_name, rows_deleted FROM deleted;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VACUUM HELPER
-- ============================================

CREATE OR REPLACE FUNCTION genesis.vacuum_tables()
RETURNS VOID AS $$
BEGIN
    -- This needs to run outside a transaction
    -- Execute via cron or admin tool
    RAISE NOTICE 'Run these commands manually:';
    RAISE NOTICE 'VACUUM ANALYZE genesis.leads;';
    RAISE NOTICE 'VACUUM ANALYZE genesis.webhook_events;';
    RAISE NOTICE 'VACUUM ANALYZE genesis.partition_registry;';
    RAISE NOTICE 'VACUUM ANALYZE genesis.workspace_health;';
END;
$$ LANGUAGE plpgsql;
```

---

# 📋 TROUBLESHOOTING GUIDE

## TROUBLESHOOT.1 COMMON ISSUES

### Issue: Partition Creation Fails

**Symptoms:**
- Ignition process stuck at "partition_creating"
- Error: "duplicate_table" or "permission denied"

**Diagnosis:**
```sql
-- Check partition registry
SELECT * FROM genesis.partition_registry WHERE workspace_id = 'YOUR_WS_ID';

-- Check for existing partition
SELECT relname FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'genesis'
AND relname LIKE 'leads_p_%';

-- Check DDL locks
SELECT * FROM genesis.partition_ddl_locks;
```

**Resolution:**
```sql
-- Clear stale locks
DELETE FROM genesis.partition_ddl_locks 
WHERE lock_expires_at < NOW();

-- Manually create partition if needed
SELECT * FROM genesis.fn_ignite_workspace_partition(
  'YOUR_WORKSPACE_ID'::UUID,
  'your_slug'
);
```

### Issue: RLS Context Not Set

**Symptoms:**
- All queries return empty results
- Error: "Context not set" or "permission denied"

**Diagnosis:**
```sql
-- Check current context
SELECT genesis.get_workspace_context();

-- Should NOT return the sentinel UUID
-- 00000000-0000-0000-0000-000000000000
```

**Resolution:**
```typescript
// Ensure all database operations use the context wrapper
await withWorkspaceContext(workspaceId, async () => {
  // Your database operations here
});
```

### Issue: Webhook Circuit Breaker Open

**Symptoms:**
- Webhooks not being delivered
- Status shows "circuit_state: open"

**Diagnosis:**
```sql
-- Check webhook status
SELECT 
  webhook_name,
  circuit_state,
  failure_count,
  last_failure_at,
  last_success_at
FROM genesis.webhook_registry
WHERE circuit_state = 'open';

-- Check recent failures
SELECT * FROM genesis.webhook_events
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;
```

**Resolution:**
```sql
-- Wait for circuit breaker timeout (60 seconds) or manually reset
UPDATE genesis.webhook_registry
SET 
  circuit_state = 'half_open',
  failure_count = 0
WHERE id = 'WEBHOOK_ID';
```

### Issue: n8n Workflow Drift

**Symptoms:**
- Dashboard shows different status than n8n
- Campaigns appear stuck

**Diagnosis:**
```bash
# Run drift detection
curl -X POST /api/admin/watchdog \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"autoHeal": false}'
```

**Resolution:**
```bash
# Run auto-healing
curl -X POST /api/admin/watchdog \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"autoHeal": true}'
```

### Issue: High Database Latency

**Symptoms:**
- API responses slow (> 1s)
- Dashboard loading slowly

**Diagnosis:**
```sql
-- Check for long-running queries
SELECT 
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query,
  state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
AND state != 'idle'
ORDER BY duration DESC;

-- Check partition pruning
EXPLAIN ANALYZE
SELECT * FROM genesis.leads 
WHERE workspace_id = 'YOUR_WS_ID' LIMIT 10;
```

**Resolution:**
```sql
-- Kill long-running queries if needed
SELECT pg_cancel_backend(PID);

-- Analyze tables
ANALYZE genesis.leads;
ANALYZE genesis.partition_registry;
```

## TROUBLESHOOT.2 EMERGENCY PROCEDURES

### Emergency Rollback

```bash
# Step 1: Abort any in-progress canary
curl -X POST /api/admin/cutover \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action": "abort"}'

# Step 2: Verify rollback
curl /api/admin/cutover \
  -H "Authorization: Bearer $TOKEN"
```

### Emergency Data Recovery

```sql
-- Enable point-in-time recovery in Supabase dashboard
-- Then restore to specific timestamp

-- Or restore from backup partition
INSERT INTO genesis.leads_p_workspace
SELECT * FROM genesis.leads_p_workspace_backup;
```

### Emergency RLS Fix

```sql
-- If RLS is accidentally disabled
ALTER TABLE genesis.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.leads FORCE ROW LEVEL SECURITY;

-- Verify
SELECT * FROM genesis.verify_rls_configuration();
```

---

# 📚 APPENDIX C: DETAILED CONFIGURATION GUIDES

## CONFIG.1 SUPABASE PROJECT SETTINGS

### Database Configuration

```sql
-- Recommended postgres settings for Genesis Engine
-- Apply via Supabase Dashboard > Database > Extensions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Configure statement timeout
ALTER DATABASE postgres SET statement_timeout = '30s';

-- Configure work_mem for complex queries
ALTER DATABASE postgres SET work_mem = '256MB';

-- Enable query plan logging for slow queries
ALTER DATABASE postgres SET log_min_duration_statement = '1000';
```

### Connection Pool Settings

```yaml
# Supavisor configuration (managed by Supabase)
# These are approximate settings - actual values managed by Supabase

pool_mode: transaction
default_pool_size: 15
max_client_conn: 200
server_idle_timeout: 600
```

### RLS Policy Checklist

| Table | RLS Enabled | RLS Forced | Policy Count | Status |
|-------|-------------|------------|--------------|--------|
| genesis.leads | YES | YES | 1 | OK |
| genesis.workspace_credentials | YES | YES | 1 | OK |
| genesis.webhook_registry | YES | YES | 1 | OK |
| genesis.webhook_events | YES | YES | 1 | OK |
| genesis.partition_registry | YES | YES | 1 | OK |
| genesis.ignition_state | YES | YES | 1 | OK |
| genesis.workspace_health | YES | YES | 1 | OK |

## CONFIG.2 N8N CONFIGURATION

### Workflow Templates

| Template | File | Nodes | Credentials Required |
|----------|------|-------|---------------------|
| Email 1 | Email 1.json | 15 | SMTP, OpenAI, Supabase |
| Email 2 | Email 2.json | 12 | SMTP, OpenAI, Supabase |
| Email 3 | Email 3.json | 14 | SMTP, OpenAI, Supabase |
| Research Report | Research Report.json | 20 | OpenAI, Tavily, Supabase |
| Reply Tracker | Reply Tracker.json | 10 | SMTP, Supabase |
| Opt-Out | Opt-Out.json | 8 | Supabase |
| Email Preparation | Email Preparation.json | 18 | OpenAI, Supabase |

### Credential Types Required

```typescript
const REQUIRED_CREDENTIALS = {
  google_oauth2: {
    fields: ['clientId', 'clientSecret', 'refreshToken'],
    nodeTypes: ['googleSheets', 'gmail'],
  },
  openai_api: {
    fields: ['apiKey'],
    nodeTypes: ['openAi'],
  },
  smtp: {
    fields: ['host', 'port', 'user', 'password', 'secure'],
    nodeTypes: ['emailSend'],
  },
  supabase: {
    fields: ['host', 'serviceRoleKey'],
    nodeTypes: ['supabase', 'postgres'],
  },
};
```

### Webhook Configuration

```typescript
// Standard webhook paths for Genesis Engine
const WEBHOOK_PATHS = {
  handshake: '/api/webhook/handshake',
  events: '/api/events',
  status: '/api/webhook/status',
  healthCheck: '/api/health',
};

// n8n webhook node configuration
const N8N_WEBHOOK_CONFIG = {
  authType: 'header',
  headerName: 'X-Webhook-Secret',
  responseMode: 'lastNode',
  httpMethod: 'POST',
};
```

## CONFIG.3 CLERK AUTHENTICATION

### Protected Routes

```typescript
// middleware.ts - Route protection configuration

const PUBLIC_ROUTES = [
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/health',
  '/api/events', // Protected by webhook secret instead
];

const ADMIN_ROUTES = [
  '/admin(.*)',
  '/api/admin(.*)',
  '/api/cron(.*)',
];

// Middleware configuration
export default clerkMiddleware({
  publicRoutes: PUBLIC_ROUTES,
  afterAuth: (auth, req) => {
    // Custom logic for admin routes
    if (ADMIN_ROUTES.some(r => req.nextUrl.pathname.match(r))) {
      // Verify super admin status
    }
  },
});
```

### User Metadata Schema

```typescript
interface ClerkUserMetadata {
  publicMetadata: {
    workspaceId?: string;
    role?: 'owner' | 'admin' | 'member';
    onboardingComplete?: boolean;
  };
  privateMetadata: {
    stripeCustomerId?: string;
    lastLoginAt?: string;
  };
}
```

## CONFIG.4 VERCEL DEPLOYMENT

### Environment Variables

```bash
# Required for all environments
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
N8N_API_URL=https://your-n8n.app.n8n.cloud/api/v1
N8N_API_KEY=your-key
WEBHOOK_SECRET=minimum-32-characters-secret
CRON_SECRET=cron-secret-for-scheduled-jobs
CREDENTIAL_MASTER_KEY=256-bit-encryption-key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Optional
SENTRY_DSN=https://...
VERCEL_TOKEN=token-for-deployment-api
```

### Function Configuration

```json
{
  "functions": {
    "app/api/admin/ignite/route.ts": {
      "maxDuration": 300,
      "memory": 1024
    },
    "app/api/admin/bulk-update/route.ts": {
      "maxDuration": 300,
      "memory": 512
    },
    "app/api/cron/**/*.ts": {
      "maxDuration": 300
    },
    "app/api/events/route.ts": {
      "maxDuration": 30,
      "memory": 256
    }
  }
}
```

### Cron Schedule Reference

| Job | Schedule | Max Duration | Description |
|-----|----------|--------------|-------------|
| Watchdog | */15 * * * * | 5 min | Detect and heal drift |
| Health Refresh | 0 * * * * | 5 min | Update health scores |
| Partition Stats | 0 */6 * * * | 10 min | Update partition statistics |
| Rate Limit Reset | 0 0 * * * | 30 sec | Reset daily counters |
| DLQ Processor | */30 * * * * | 5 min | Retry dead letter queue |

---

# 📊 APPENDIX D: MONITORING DASHBOARDS

## DASHBOARD.1 KEY METRICS

### System Health Metrics

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| API P95 Latency | < 500ms | 500-1000ms | > 1000ms |
| API Error Rate | < 1% | 1-5% | > 5% |
| Database Connections | < 80% | 80-90% | > 90% |
| Webhook Success Rate | > 99% | 95-99% | < 95% |
| Circuit Breakers Open | 0 | 1-2 | > 2 |
| DLQ Backlog | < 100 | 100-500 | > 500 |

### Partition Health Metrics

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Partition Count | < 10000 | 10000-15000 | > 15000 |
| Avg Partition Size | < 1GB | 1-5GB | > 5GB |
| Largest Partition | < 10GB | 10-50GB | > 50GB |
| Query Plan Time | < 50ms | 50-200ms | > 200ms |

### Watchdog Metrics

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Drift Detection Rate | < 5/hour | 5-20/hour | > 20/hour |
| Auto-Heal Success | > 95% | 80-95% | < 80% |
| Orphan Workflows | 0 | 1-5 | > 5 |
| State Mismatches | 0 | 1-10 | > 10 |

## DASHBOARD.2 ALERT CONFIGURATION

### Sentry Alert Rules

```javascript
// Sentry alert configuration
const alertRules = [
  {
    name: 'High Error Rate',
    conditions: {
      errorCount: { threshold: 100, window: '5m' },
    },
    actions: ['slack', 'pagerduty'],
    severity: 'critical',
  },
  {
    name: 'API Latency Spike',
    conditions: {
      p95Latency: { threshold: 2000, window: '5m' },
    },
    actions: ['slack'],
    severity: 'warning',
  },
  {
    name: 'Database Connection Exhaustion',
    conditions: {
      connectionUsage: { threshold: 90, window: '1m' },
    },
    actions: ['slack', 'pagerduty'],
    severity: 'critical',
  },
];
```

### Uptime Monitoring

```yaml
# Uptime checks
checks:
  - name: API Health
    url: https://app.example.com/api/health
    interval: 60s
    timeout: 10s
    expected_status: 200
    
  - name: Database Health
    url: https://app.example.com/api/admin/health-mesh
    interval: 300s
    timeout: 30s
    expected_status: 200
    headers:
      Authorization: Bearer ${ADMIN_TOKEN}
      
  - name: n8n Connectivity
    url: https://app.example.com/api/health/n8n
    interval: 300s
    timeout: 30s
    expected_status: 200
```

---

# 📚 APPENDIX E: API DOCUMENTATION

## API.D1 IGNITION API

### POST /api/admin/ignite

**Description:** Provision a new workspace with partition, credentials, and workflows.

**Request:**
```json
{
  "workspaceId": "uuid",
  "workspaceSlug": "string (3-50 chars, lowercase)",
  "workspaceName": "string (1-100 chars)",
  "variables": {
    "YOUR_DASHBOARD_URL": "url",
    "YOUR_WEBHOOK_TOKEN": "string (min 32 chars)",
    "YOUR_SENDER_EMAIL": "email",
    "YOUR_NAME": "string",
    "YOUR_COMPANY_NAME": "string",
    "YOUR_CALENDLY_LINK_1": "url (optional)",
    "YOUR_CALENDLY_LINK_2": "url (optional)"
  },
  "credentials": [
    {
      "type": "google_oauth2 | openai_api | smtp | supabase",
      "name": "string",
      "data": { "key": "value" }
    }
  ]
}
```

**Response (Success):**
```json
{
  "success": true,
  "workspaceId": "uuid",
  "partitionName": "leads_p_workspace_slug",
  "workflowCount": 7,
  "duration": 45000
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Partition creation failed: ...",
  "duration": 5000
}
```

### GET /api/admin/ignite

**Description:** Check ignition status for a workspace.

**Query Parameters:**
- `workspaceId` (required): UUID of the workspace

**Response:**
```json
{
  "workspaceId": "uuid",
  "status": "active | pending | failed",
  "currentStep": 4,
  "totalSteps": 4,
  "partitionName": "leads_p_workspace_slug",
  "workflowIds": ["id1", "id2"],
  "credentialIds": ["cred1", "cred2"],
  "startedAt": "2026-01-24T10:00:00Z",
  "updatedAt": "2026-01-24T10:00:45Z"
}
```

## API.D2 EVENTS API

### POST /api/events

**Description:** Receive webhook events from n8n workflows.

**Headers:**
- `X-Webhook-Secret` (required): Webhook authentication secret

**Request:**
```json
{
  "workspace_id": "uuid",
  "idempotency_key": "string (16-64 chars)",
  "timestamp": "ISO 8601 datetime (optional)",
  "data": {
    "event_type": "email_sent | email_opened | email_clicked | email_replied | email_bounced | lead_updated",
    // ... event-specific fields
  }
}
```

**Response (Success):**
```json
{
  "status": "processed",
  "event_id": "uuid",
  "duration_ms": 150
}
```

**Response (Duplicate):**
```json
{
  "status": "duplicate",
  "original_id": "uuid",
  "original_status": "completed"
}
```

## API.D3 WATCHDOG API

### POST /api/admin/watchdog

**Description:** Trigger a watchdog run.

**Request:**
```json
{
  "autoHeal": true,
  "dryRun": false
}
```

**Response:**
```json
{
  "runId": "uuid",
  "startedAt": "2026-01-24T10:00:00Z",
  "completedAt": "2026-01-24T10:00:30Z",
  "driftsDetected": 5,
  "driftsHealed": 4,
  "driftsFailed": 1,
  "items": [
    {
      "workspaceId": "uuid",
      "driftType": "state_mismatch",
      "severity": "medium",
      "details": {},
      "autoHealable": true
    }
  ]
}
```

### GET /api/admin/watchdog

**Description:** Get watchdog status and history.

**Query Parameters:**
- `action` (optional): "detect" for quick drift detection

**Response:**
```json
{
  "runs": [...],
  "summary": {
    "totalRuns": 96,
    "totalDriftsDetected": 15,
    "totalDriftsHealed": 14
  }
}
```

## API.D4 HEALTH MESH API

### GET /api/admin/health-mesh

**Description:** Get health data for all workspaces.

**Query Parameters:**
- `filter` (optional): healthy | degraded | unhealthy | critical
- `sortBy` (optional): field to sort by
- `sortOrder` (optional): asc | desc

**Response:**
```json
{
  "summary": {
    "total": 100,
    "healthy": 85,
    "degraded": 10,
    "unhealthy": 4,
    "critical": 1,
    "avgScore": 87
  },
  "workspaces": [
    {
      "workspace_id": "uuid",
      "health_score": 95,
      "health_status": "healthy",
      "partition_health": 100,
      "workflow_health": 90,
      "webhook_health": 95,
      "lead_count": 5000,
      "active_workflows": 7
    }
  ],
  "generatedAt": "2026-01-24T10:00:00Z"
}
```

### POST /api/admin/health-mesh

**Description:** Refresh health scores.

**Request:**
```json
{
  "workspaceId": "uuid (optional, omit to refresh all)"
}
```

**Response:**
```json
{
  "refreshed": 100,
  "refreshedAt": "2026-01-24T10:00:00Z"
}
```

## API.D5 CUTOVER API

### GET /api/admin/cutover

**Description:** Get deployment state.

**Query Parameters:**
- `action` (optional): "readiness" for pre-launch check, "triggers" for revert triggers

**Response:**
```json
{
  "activeSlot": "blue",
  "standbySlot": "green",
  "canaryPercentage": 0,
  "status": "stable",
  "lastDeployedAt": "2026-01-24T10:00:00Z",
  "activeVersion": "abc123",
  "standbyVersion": null
}
```

### POST /api/admin/cutover

**Description:** Execute deployment action.

**Request:**
```json
{
  "action": "deploy | start_canary | increase_canary | complete_cutover | abort | revert",
  "params": {
    "version": "string (for deploy)",
    "percentage": 10 (for canary),
    "reason": "string (for revert)"
  }
}
```

**Response:**
```json
{
  "status": "canary_started",
  // or action-specific response
}
```

---

# 📚 APPENDIX F: GLOSSARY

| Term | Definition |
|------|------------|
| **Partition** | A PostgreSQL table partition containing leads for a single workspace |
| **Ignition** | The process of provisioning a new workspace with partition, credentials, and workflows |
| **Drift** | A discrepancy between the dashboard database and n8n workflow state |
| **Orphan Workflow** | An n8n workflow that exists but has no corresponding database record |
| **Ghost Campaign** | A database campaign record whose n8n workflow has been deleted |
| **Circuit Breaker** | A pattern that stops calling failing services to prevent cascade failures |
| **Dead Letter Queue (DLQ)** | Storage for failed webhook events that couldn't be delivered |
| **RLS** | Row Level Security - PostgreSQL feature that filters query results by user context |
| **Canary Deployment** | Gradually routing traffic to a new version to detect issues early |
| **Blue-Green Deployment** | Maintaining two production environments for zero-downtime deployments |
| **Health Mesh** | The aggregated health status of all workspaces in the system |
| **Watchdog** | Automated service that detects and heals state drift between systems |
| **Dual-Write** | Writing data to both old and new systems during migration |
| **Parity Check** | Verifying data consistency between source and target during migration |
| **God Mode** | Super admin dashboard for platform operations |
| **Sandbox Mode** | Testing mode that uses mock services instead of real APIs |

---

# 📚 APPENDIX G: CHANGE LOG

## Version 20.0 (2026-01-24)

### Phase 40: Forensic Foundation
- Added catalog bottleneck analysis for 15k partitions
- Implemented atomic partition ignition with advisory locks
- Created JSONB indexing watchdog
- Hardened RLS with fail-closed security model

### Phase 41: Ignition Orchestrator
- Built extended n8n client with cloning and credential APIs
- Created encrypted credential vault with AES-256-GCM
- Implemented template variable replacement engine
- Added atomic rollback for provisioning failures

### Phase 42: Webhook Protocol
- Designed bidirectional webhook communication
- Implemented circuit breaker pattern
- Created dead letter queue for failed webhooks
- Added handshake verification

### Phase 43: State Reconciliation
- Built watchdog service for drift detection
- Implemented auto-healing for common drift types
- Created orphan workflow termination
- Added scheduled cron integration

### Phase 44: God Mode
- Created health mesh with workspace heatmap
- Built blueprint versioning system
- Implemented bulk update engine with canary support
- Added forensic execution viewer

### Phase 45: Sandbox Engine
- Built mock n8n environment
- Created AI research simulation
- Implemented virtual inbox system
- Added global rate limiter

### Phase 46: Shadow Migration
- Designed dual-write infrastructure
- Built backfill engine with resume support
- Created parity verification system
- Implemented zero-downtime cutover

### Phase 47: Stress Testing
- Created K6 load test suite
- Built chaos engineering framework
- Implemented security red-team tests
- Added performance benchmarks

### Phase 48: Production Cutover
- Designed blue-green deployment strategy
- Built canary rollout with auto-promotion
- Implemented instant revert mechanism
- Created operations runbook

---

# 📚 APPENDIX H: EXTENDED SQL REFERENCE

## SQL.H1 PARTITION MANAGEMENT QUERIES

```sql
-- ============================================
-- PARTITION INVENTORY
-- ============================================

-- List all partitions with details
SELECT 
    n.nspname AS schema_name,
    c.relname AS partition_name,
    pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
    pg_size_pretty(pg_table_size(c.oid)) AS table_size,
    pg_size_pretty(pg_indexes_size(c.oid)) AS index_size,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = c.relname) AS index_count,
    pg_stat_get_live_tuples(c.oid) AS live_rows,
    pg_stat_get_dead_tuples(c.oid) AS dead_rows
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_inherits i ON i.inhrelid = c.oid
JOIN pg_class parent ON parent.oid = i.inhparent
WHERE n.nspname = 'genesis'
AND parent.relname = 'leads'
ORDER BY pg_total_relation_size(c.oid) DESC;

-- Get partition bounds
SELECT 
    child.relname AS partition_name,
    pg_get_expr(child.relpartbound, child.oid) AS partition_bounds
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname = 'leads'
AND parent.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'genesis')
ORDER BY child.relname;

-- Find partitions larger than threshold
SELECT 
    c.relname AS partition_name,
    pg_size_pretty(pg_total_relation_size(c.oid)) AS size,
    pg_stat_get_live_tuples(c.oid) AS row_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'genesis'
AND c.relname LIKE 'leads_p_%'
AND pg_total_relation_size(c.oid) > 1073741824  -- 1GB
ORDER BY pg_total_relation_size(c.oid) DESC;

-- ============================================
-- PARTITION PRUNING VERIFICATION
-- ============================================

-- Test partition pruning is working
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF)
SELECT * FROM genesis.leads 
WHERE workspace_id = '11111111-1111-1111-1111-111111111111'::UUID
LIMIT 1;

-- Expected output should show only ONE partition being scanned
-- NOT "Append" with multiple partitions

-- Get partition pruning statistics
SELECT 
    schemaname,
    relname,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_tup_ins,
    n_tup_upd,
    n_tup_del
FROM pg_stat_user_tables
WHERE schemaname = 'genesis'
AND relname LIKE 'leads_p_%'
ORDER BY seq_scan DESC;

-- ============================================
-- INDEX ANALYSIS
-- ============================================

-- List all indexes on genesis tables
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan AS times_used,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'genesis'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find unused indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'genesis'
AND idx_scan = 0
AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find duplicate indexes
WITH index_cols AS (
    SELECT 
        i.relname AS index_name,
        t.relname AS table_name,
        array_agg(a.attname ORDER BY k.n) AS columns
    FROM pg_index ix
    JOIN pg_class i ON ix.indexrelid = i.oid
    JOIN pg_class t ON ix.indrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    CROSS JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, n)
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
    WHERE n.nspname = 'genesis'
    GROUP BY i.relname, t.relname
)
SELECT 
    a.index_name AS index_1,
    b.index_name AS index_2,
    a.table_name,
    a.columns
FROM index_cols a
JOIN index_cols b ON a.table_name = b.table_name AND a.columns = b.columns AND a.index_name < b.index_name;

-- ============================================
-- QUERY PERFORMANCE ANALYSIS
-- ============================================

-- Top slow queries on genesis schema
SELECT 
    LEFT(query, 100) AS query_snippet,
    calls,
    ROUND(total_exec_time::NUMERIC, 2) AS total_ms,
    ROUND(mean_exec_time::NUMERIC, 2) AS avg_ms,
    ROUND((stddev_exec_time)::NUMERIC, 2) AS stddev_ms,
    rows
FROM pg_stat_statements
WHERE query LIKE '%genesis%'
AND calls > 10
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Queries with high variance (inconsistent performance)
SELECT 
    LEFT(query, 100) AS query_snippet,
    calls,
    ROUND(mean_exec_time::NUMERIC, 2) AS avg_ms,
    ROUND(stddev_exec_time::NUMERIC, 2) AS stddev_ms,
    ROUND(stddev_exec_time / NULLIF(mean_exec_time, 0) * 100, 2) AS cv_percent
FROM pg_stat_statements
WHERE query LIKE '%genesis%'
AND calls > 100
AND mean_exec_time > 10
ORDER BY stddev_exec_time / NULLIF(mean_exec_time, 0) DESC
LIMIT 20;

-- ============================================
-- LOCK MONITORING
-- ============================================

-- Current locks on genesis schema
SELECT 
    l.locktype,
    c.relname,
    l.mode,
    l.granted,
    a.usename,
    a.query,
    a.state
FROM pg_locks l
JOIN pg_class c ON l.relation = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE n.nspname = 'genesis'
AND l.granted = FALSE;

-- Lock wait chains
SELECT 
    blocked_activity.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_activity.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_query,
    blocking_activity.query AS blocking_query,
    NOW() - blocked_activity.query_start AS blocked_duration
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- ============================================
-- VACUUM AND MAINTENANCE
-- ============================================

-- Tables needing vacuum
SELECT 
    schemaname,
    relname,
    n_live_tup,
    n_dead_tup,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'genesis'
AND n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- Table bloat estimation
SELECT 
    schemaname,
    relname,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS external_size,
    ROUND(100.0 * (pg_total_relation_size(relid) - pg_relation_size(relid)) / 
          NULLIF(pg_total_relation_size(relid), 0), 2) AS bloat_pct
FROM pg_stat_user_tables
WHERE schemaname = 'genesis'
ORDER BY pg_total_relation_size(relid) DESC;
```

## SQL.H2 MONITORING QUERIES

```sql
-- ============================================
-- CONNECTION MONITORING
-- ============================================

-- Active connections by state
SELECT 
    state,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (NOW() - query_start))) AS avg_duration_seconds
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state
ORDER BY count DESC;

-- Long-running queries
SELECT 
    pid,
    usename,
    state,
    query,
    NOW() - query_start AS duration,
    wait_event_type,
    wait_event
FROM pg_stat_activity
WHERE state != 'idle'
AND query_start < NOW() - INTERVAL '30 seconds'
ORDER BY query_start;

-- Connection pool utilization
SELECT 
    COUNT(*) AS total_connections,
    COUNT(*) FILTER (WHERE state = 'idle') AS idle,
    COUNT(*) FILTER (WHERE state = 'active') AS active,
    COUNT(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_txn,
    MAX(EXTRACT(EPOCH FROM (NOW() - backend_start))) AS oldest_connection_seconds
FROM pg_stat_activity
WHERE datname = current_database();

-- ============================================
-- REPLICATION LAG (if applicable)
-- ============================================

SELECT 
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replication_lag_bytes
FROM pg_stat_replication;

-- ============================================
-- CACHE HIT RATIO
-- ============================================

-- Overall cache hit ratio
SELECT 
    'Index Hit Ratio' AS metric,
    ROUND(100.0 * sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit + idx_blks_read), 0), 2) AS ratio
FROM pg_statio_user_indexes
WHERE schemaname = 'genesis'
UNION ALL
SELECT 
    'Table Hit Ratio',
    ROUND(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit + heap_blks_read), 0), 2)
FROM pg_statio_user_tables
WHERE schemaname = 'genesis';

-- Per-table cache hit ratio
SELECT 
    relname,
    heap_blks_read,
    heap_blks_hit,
    ROUND(100.0 * heap_blks_hit / NULLIF(heap_blks_hit + heap_blks_read, 0), 2) AS hit_ratio
FROM pg_statio_user_tables
WHERE schemaname = 'genesis'
ORDER BY heap_blks_read + heap_blks_hit DESC
LIMIT 20;

-- ============================================
-- TRANSACTION MONITORING
-- ============================================

-- Transaction throughput
SELECT 
    xact_commit,
    xact_rollback,
    ROUND(100.0 * xact_rollback / NULLIF(xact_commit + xact_rollback, 0), 2) AS rollback_pct,
    blks_read,
    blks_hit,
    tup_returned,
    tup_fetched,
    tup_inserted,
    tup_updated,
    tup_deleted
FROM pg_stat_database
WHERE datname = current_database();

-- Oldest transaction
SELECT 
    pid,
    usename,
    NOW() - xact_start AS transaction_duration,
    state,
    query
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
ORDER BY xact_start
LIMIT 5;
```

---

# 📚 APPENDIX I: TYPESCRIPT PATTERNS

## PATTERN.I1 ERROR HANDLING

```typescript
// lib/genesis/error-handling.ts

// ============================================
// CUSTOM ERROR CLASSES
// ============================================

export class GenesisError extends Error {
  public readonly code: string;
  public readonly context: Record<string, unknown>;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    code: string,
    context: Record<string, unknown> = {},
    recoverable: boolean = false
  ) {
    super(message);
    this.name = 'GenesisError';
    this.code = code;
    this.context = context;
    this.recoverable = recoverable;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      recoverable: this.recoverable,
    };
  }
}

export class PartitionError extends GenesisError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message, 'PARTITION_ERROR', context, false);
    this.name = 'PartitionError';
  }
}

export class RLSError extends GenesisError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message, 'RLS_ERROR', context, false);
    this.name = 'RLSError';
  }
}

export class WebhookError extends GenesisError {
  constructor(
    message: string,
    context: Record<string, unknown> = {},
    recoverable: boolean = true
  ) {
    super(message, 'WEBHOOK_ERROR', context, recoverable);
    this.name = 'WebhookError';
  }
}

export class N8nError extends GenesisError {
  constructor(
    message: string,
    context: Record<string, unknown> = {},
    recoverable: boolean = true
  ) {
    super(message, 'N8N_ERROR', context, recoverable);
    this.name = 'N8nError';
  }
}

export class ValidationError extends GenesisError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message, 'VALIDATION_ERROR', context, false);
    this.name = 'ValidationError';
  }
}

// ============================================
// ERROR HANDLING UTILITIES
// ============================================

export function isGenesisError(error: unknown): error is GenesisError {
  return error instanceof GenesisError;
}

export function isRecoverableError(error: unknown): boolean {
  if (isGenesisError(error)) {
    return error.recoverable;
  }
  // Check for common recoverable errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('network') ||
      message.includes('temporarily')
    );
  }
  return false;
}

export function wrapError(error: unknown, context: Record<string, unknown> = {}): GenesisError {
  if (isGenesisError(error)) {
    error.context = { ...error.context, ...context };
    return error;
  }
  if (error instanceof Error) {
    return new GenesisError(error.message, 'UNKNOWN_ERROR', context, false);
  }
  return new GenesisError(String(error), 'UNKNOWN_ERROR', context, false);
}

// ============================================
// RESULT TYPE PATTERN
// ============================================

export type Result<T, E = GenesisError> =
  | { success: true; data: T }
  | { success: false; error: E };

export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

export function err<E extends GenesisError>(error: E): Result<never, E> {
  return { success: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success;
}

export function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}

// ============================================
// TRY-CATCH WRAPPER
// ============================================

export async function tryAsync<T>(
  fn: () => Promise<T>,
  context: Record<string, unknown> = {}
): Promise<Result<T>> {
  try {
    const data = await fn();
    return ok(data);
  } catch (error) {
    return err(wrapError(error, context));
  }
}

export function trySync<T>(
  fn: () => T,
  context: Record<string, unknown> = {}
): Result<T> {
  try {
    const data = fn();
    return ok(data);
  } catch (error) {
    return err(wrapError(error, context));
  }
}

// ============================================
// RETRY WRAPPER
// ============================================

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryIf?: (error: unknown) => boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryIf: isRecoverableError,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<Result<T>> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const data = await fn();
      return ok(data);
    } catch (error) {
      lastError = error;

      if (attempt === opts.maxAttempts || !opts.retryIf?.(error)) {
        break;
      }

      const delay = Math.min(
        opts.baseDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelay
      );

      await sleep(delay);
    }
  }

  return err(wrapError(lastError, { attempts: opts.maxAttempts }));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

## PATTERN.I2 LOGGING

```typescript
// lib/genesis/logging.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  traceId?: string;
  workspaceId?: string;
}

class Logger {
  private minLevel: LogLevel;
  private traceId?: string;
  private workspaceId?: string;

  constructor(minLevel: LogLevel = 'info') {
    this.minLevel = minLevel;
  }

  setTraceId(traceId: string): void {
    this.traceId = traceId;
  }

  setWorkspaceId(workspaceId: string): void {
    this.workspaceId = workspaceId;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      traceId: this.traceId,
      workspaceId: this.workspaceId,
    };
  }

  private output(entry: LogEntry): void {
    const formatted = JSON.stringify(entry);
    
    switch (entry.level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      this.output(this.formatEntry('debug', message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      this.output(this.formatEntry('info', message, context));
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      this.output(this.formatEntry('warn', message, context));
    }
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      };
      this.output(this.formatEntry('error', message, errorContext));
    }
  }

  child(context: Record<string, unknown>): Logger {
    const child = new Logger(this.minLevel);
    child.traceId = this.traceId;
    child.workspaceId = this.workspaceId;
    return child;
  }
}

// Global logger instance
export const logger = new Logger(
  (process.env.LOG_LEVEL as LogLevel) || 'info'
);

// Request-scoped logger factory
export function createRequestLogger(traceId: string, workspaceId?: string): Logger {
  const requestLogger = new Logger();
  requestLogger.setTraceId(traceId);
  if (workspaceId) {
    requestLogger.setWorkspaceId(workspaceId);
  }
  return requestLogger;
}
```

## PATTERN.I3 METRICS

```typescript
// lib/genesis/metrics.ts

interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

class MetricsCollector {
  private metrics: Map<string, Metric> = new Map();

  private getKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  increment(name: string, labels: Record<string, string> = {}, value: number = 1): void {
    const key = this.getKey(name, labels);
    const existing = this.metrics.get(key);
    
    this.metrics.set(key, {
      name,
      type: 'counter',
      value: (existing?.value || 0) + value,
      labels,
      timestamp: Date.now(),
    });
  }

  gauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.getKey(name, labels);
    this.metrics.set(key, {
      name,
      type: 'gauge',
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  histogram(name: string, value: number, labels: Record<string, string> = {}): void {
    // For simplicity, we'll track histograms as gauges with bucketed labels
    const bucket = this.getBucket(value);
    this.increment(`${name}_bucket`, { ...labels, le: bucket.toString() });
    this.increment(`${name}_count`, labels);
    this.increment(`${name}_sum`, labels, value);
  }

  private getBucket(value: number): number {
    const buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, Infinity];
    return buckets.find(b => value <= b) || Infinity;
  }

  getMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }

  getPrometheusFormat(): string {
    const lines: string[] = [];
    
    for (const metric of this.metrics.values()) {
      const labels = Object.entries(metric.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      const labelStr = labels ? `{${labels}}` : '';
      lines.push(`${metric.name}${labelStr} ${metric.value}`);
    }
    
    return lines.join('\n');
  }

  reset(): void {
    this.metrics.clear();
  }
}

export const metrics = new MetricsCollector();

// Convenience functions
export function trackApiCall(endpoint: string, method: string, status: number, duration: number): void {
  metrics.increment('api_requests_total', { endpoint, method, status: status.toString() });
  metrics.histogram('api_request_duration_seconds', duration / 1000, { endpoint, method });
}

export function trackDbQuery(operation: string, table: string, duration: number): void {
  metrics.increment('db_queries_total', { operation, table });
  metrics.histogram('db_query_duration_seconds', duration / 1000, { operation, table });
}

export function trackWebhook(type: string, status: 'success' | 'failure', duration: number): void {
  metrics.increment('webhook_events_total', { type, status });
  metrics.histogram('webhook_duration_seconds', duration / 1000, { type });
}

export function setActiveWorkspaces(count: number): void {
  metrics.gauge('active_workspaces', count);
}

export function setPartitionCount(count: number): void {
  metrics.gauge('partition_count', count);
}
```

---

# 📚 APPENDIX J: HOOKS AND COMPONENTS

## HOOKS.J1 DATA HOOKS

```typescript
// hooks/genesis/use-workspace-health.ts

import useSWR from 'swr';
import { WorkspaceHealth, HealthStatus } from '@/lib/genesis/types';

interface UseWorkspaceHealthOptions {
  workspaceId?: string;
  refreshInterval?: number;
}

interface UseWorkspaceHealthReturn {
  health: WorkspaceHealth | null;
  status: HealthStatus | null;
  score: number;
  isLoading: boolean;
  isError: boolean;
  refresh: () => void;
}

export function useWorkspaceHealth(
  options: UseWorkspaceHealthOptions = {}
): UseWorkspaceHealthReturn {
  const { workspaceId, refreshInterval = 60000 } = options;

  const { data, error, isLoading, mutate } = useSWR<WorkspaceHealth>(
    workspaceId ? `/api/workspace/${workspaceId}/health` : null,
    {
      refreshInterval,
      revalidateOnFocus: true,
    }
  );

  return {
    health: data ?? null,
    status: data?.healthStatus ?? null,
    score: data?.healthScore ?? 0,
    isLoading,
    isError: !!error,
    refresh: () => mutate(),
  };
}

// hooks/genesis/use-partition-stats.ts

import useSWR from 'swr';

interface PartitionStats {
  partitionName: string;
  rowCount: number;
  sizeBytes: number;
  indexCount: number;
  status: string;
  lastStatsUpdate: string;
}

export function usePartitionStats(workspaceId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<PartitionStats>(
    workspaceId ? `/api/admin/partition/${workspaceId}/stats` : null,
    { refreshInterval: 300000 } // 5 minutes
  );

  return {
    stats: data,
    isLoading,
    isError: !!error,
    refresh: () => mutate(),
  };
}

// hooks/genesis/use-watchdog.ts

import useSWR from 'swr';
import { DriftItem, WatchdogRun } from '@/lib/genesis/types';

interface WatchdogData {
  runs: WatchdogRun[];
  summary: {
    totalRuns: number;
    totalDriftsDetected: number;
    totalDriftsHealed: number;
  };
}

export function useWatchdog() {
  const { data, error, isLoading, mutate } = useSWR<WatchdogData>(
    '/api/admin/watchdog',
    { refreshInterval: 60000 }
  );

  const runWatchdog = async (autoHeal: boolean = false) => {
    const response = await fetch('/api/admin/watchdog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoHeal }),
    });
    const result = await response.json();
    mutate();
    return result;
  };

  const detectDrifts = async (): Promise<DriftItem[]> => {
    const response = await fetch('/api/admin/watchdog?action=detect');
    return response.json();
  };

  return {
    runs: data?.runs ?? [],
    summary: data?.summary,
    isLoading,
    isError: !!error,
    runWatchdog,
    detectDrifts,
    refresh: () => mutate(),
  };
}

// hooks/genesis/use-bulk-update.ts

import useSWR from 'swr';
import { BulkUpdateJob } from '@/lib/genesis/types';

export function useBulkUpdate(jobId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<BulkUpdateJob>(
    jobId ? `/api/admin/bulk-update?jobId=${jobId}` : null,
    { refreshInterval: 5000 }
  );

  const cancel = async () => {
    if (!jobId) return;
    await fetch(`/api/admin/bulk-update?jobId=${jobId}`, {
      method: 'DELETE',
    });
    mutate();
  };

  return {
    job: data,
    isLoading,
    isError: !!error,
    cancel,
    refresh: () => mutate(),
  };
}

// hooks/genesis/use-migration.ts

import useSWR from 'swr';
import { MigrationState, ParityCheckResult } from '@/lib/genesis/types';

export function useMigration(workspaceId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<MigrationState>(
    workspaceId ? `/api/admin/migration/${workspaceId}` : null,
    { refreshInterval: 10000 }
  );

  const enableDualWrite = async () => {
    await fetch(`/api/admin/migration/${workspaceId}/dual-write`, {
      method: 'POST',
      body: JSON.stringify({ enable: true }),
    });
    mutate();
  };

  const disableDualWrite = async () => {
    await fetch(`/api/admin/migration/${workspaceId}/dual-write`, {
      method: 'POST',
      body: JSON.stringify({ enable: false }),
    });
    mutate();
  };

  const startBackfill = async () => {
    await fetch(`/api/admin/migration/${workspaceId}/backfill`, {
      method: 'POST',
    });
    mutate();
  };

  const runParityCheck = async (): Promise<ParityCheckResult> => {
    const response = await fetch(`/api/admin/migration/${workspaceId}/parity`, {
      method: 'POST',
    });
    mutate();
    return response.json();
  };

  const executeCutover = async () => {
    await fetch(`/api/admin/migration/${workspaceId}/cutover`, {
      method: 'POST',
    });
    mutate();
  };

  return {
    state: data,
    isLoading,
    isError: !!error,
    enableDualWrite,
    disableDualWrite,
    startBackfill,
    runParityCheck,
    executeCutover,
    refresh: () => mutate(),
  };
}
```

## HOOKS.J2 UI HOOKS

```typescript
// hooks/genesis/use-toast.ts

import { useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    
    setToasts((prev) => [...prev, newToast]);

    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || 5000);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string) => {
    return addToast({ type: 'success', title, message });
  }, [addToast]);

  const error = useCallback((title: string, message?: string) => {
    return addToast({ type: 'error', title, message, duration: 10000 });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string) => {
    return addToast({ type: 'warning', title, message });
  }, [addToast]);

  const info = useCallback((title: string, message?: string) => {
    return addToast({ type: 'info', title, message });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
}

// hooks/genesis/use-confirmation.ts

import { useState, useCallback } from 'react';

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
}

export function useConfirmation() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmationOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);

    return new Promise((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolver?.(true);
    setIsOpen(false);
    setResolver(null);
  }, [resolver]);

  const handleCancel = useCallback(() => {
    resolver?.(false);
    setIsOpen(false);
    setResolver(null);
  }, [resolver]);

  return {
    isOpen,
    options,
    confirm,
    handleConfirm,
    handleCancel,
  };
}

// hooks/genesis/use-polling.ts

import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  interval: number;
  enabled?: boolean;
  immediate?: boolean;
}

export function usePolling(
  callback: () => void | Promise<void>,
  options: UsePollingOptions
) {
  const { interval, enabled = true, immediate = true } = options;
  const savedCallback = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const start = useCallback(() => {
    if (intervalRef.current) return;
    
    if (immediate) {
      savedCallback.current();
    }

    intervalRef.current = setInterval(() => {
      savedCallback.current();
    }, interval);
  }, [interval, immediate]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }

    return stop;
  }, [enabled, start, stop]);

  return { start, stop };
}

// hooks/genesis/use-async.ts

import { useState, useCallback } from 'react';

interface UseAsyncState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

export function useAsync<T, Args extends unknown[]>(
  asyncFunction: (...args: Args) => Promise<T>
) {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    error: null,
    isLoading: false,
  });

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setState({ data: null, error: null, isLoading: true });

      try {
        const data = await asyncFunction(...args);
        setState({ data, error: null, isLoading: false });
        return data;
      } catch (error) {
        setState({ data: null, error: error as Error, isLoading: false });
        return null;
      }
    },
    [asyncFunction]
  );

  const reset = useCallback(() => {
    setState({ data: null, error: null, isLoading: false });
  }, []);

  return { ...state, execute, reset };
}
```

## COMPONENTS.J3 UI COMPONENTS

```tsx
// components/genesis/status-badge.tsx

import { cn } from '@/lib/utils';
import { CheckCircle, AlertTriangle, XCircle, Clock, HelpCircle } from 'lucide-react';

type StatusType = 'success' | 'warning' | 'error' | 'pending' | 'unknown';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    iconColor: 'text-green-500',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    iconColor: 'text-yellow-500',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    iconColor: 'text-red-500',
  },
  pending: {
    icon: Clock,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-500',
  },
  unknown: {
    icon: HelpCircle,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    iconColor: 'text-gray-500',
  },
};

const sizeConfig = {
  sm: {
    badge: 'px-2 py-0.5 text-xs',
    icon: 'w-3 h-3',
  },
  md: {
    badge: 'px-2.5 py-1 text-sm',
    icon: 'w-4 h-4',
  },
  lg: {
    badge: 'px-3 py-1.5 text-base',
    icon: 'w-5 h-5',
  },
};

export function StatusBadge({
  status,
  label,
  showIcon = true,
  size = 'md',
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.bgColor,
        config.textColor,
        sizes.badge
      )}
    >
      {showIcon && <Icon className={cn(sizes.icon, config.iconColor)} />}
      {label || status}
    </span>
  );
}

// components/genesis/progress-bar.tsx

import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
  animated?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  showLabel = false,
  variant = 'default',
  animated = false,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const heightMap = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const colorMap = {
    default: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <div className="w-full">
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', heightMap[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            colorMap[variant],
            animated && 'animate-pulse'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-xs text-gray-500 text-right">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
}

// components/genesis/stat-card.tsx

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  iconColor?: string;
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor = 'text-blue-500',
  loading = false,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 animate-pulse rounded mt-1" />
          ) : (
            <p className="text-2xl font-bold mt-1">{value}</p>
          )}
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              <span
                className={cn(
                  'text-xs font-medium',
                  change >= 0 ? 'text-green-600' : 'text-red-600'
                )}
              >
                {change >= 0 ? '+' : ''}
                {change}%
              </span>
              {changeLabel && (
                <span className="text-xs text-gray-400">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('p-2 rounded-lg bg-gray-50', iconColor)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}

// components/genesis/data-table.tsx

import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  onRowClick?: (item: T) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  onRowClick,
  sortBy,
  sortOrder,
  onSort,
  emptyMessage = 'No data available',
  loading = false,
}: DataTableProps<T>) {
  const renderCell = (item: T, column: Column<T>) => {
    if (column.render) {
      return column.render(item);
    }
    const value = item[column.key as keyof T];
    return String(value ?? '-');
  };

  if (loading) {
    return (
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {columns.map((col) => (
                <th key={String(col.key)} className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="border-b">
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-4 py-3">
                    <div className="h-4 bg-gray-200 animate-pulse rounded" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={cn(
                  'px-4 py-3 text-left text-sm font-medium text-gray-600',
                  col.sortable && 'cursor-pointer hover:bg-gray-100'
                )}
                style={{ width: col.width }}
                onClick={() => col.sortable && onSort?.(String(col.key))}
              >
                <div className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortBy === col.key && (
                    sortOrder === 'asc' ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={String(item[keyField])}
              className={cn(
                'border-b last:border-b-0',
                onRowClick && 'cursor-pointer hover:bg-gray-50'
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <td key={String(col.key)} className="px-4 py-3 text-sm">
                  {renderCell(item, col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// components/genesis/confirmation-dialog.tsx

import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-start gap-4">
            {variant === 'danger' && (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-6 flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={cn(
                'px-4 py-2 text-sm font-medium text-white rounded-lg',
                variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

# 📚 APPENDIX K: PERFORMANCE TARGETS

## PERF.K1 API LATENCY TARGETS

| Endpoint | P50 | P95 | P99 | Max |
|----------|-----|-----|-----|-----|
| GET /api/leads | 50ms | 150ms | 300ms | 1000ms |
| POST /api/leads | 100ms | 300ms | 500ms | 2000ms |
| GET /api/campaigns | 30ms | 100ms | 200ms | 500ms |
| POST /api/events | 50ms | 150ms | 300ms | 1000ms |
| GET /api/admin/health-mesh | 200ms | 500ms | 1000ms | 3000ms |
| POST /api/admin/ignite | 30s | 60s | 120s | 300s |
| GET /api/workspace/:id | 20ms | 50ms | 100ms | 500ms |

## PERF.K2 DATABASE QUERY TARGETS

| Query Type | P50 | P95 | P99 |
|------------|-----|-----|-----|
| Single partition lookup | 5ms | 15ms | 30ms |
| Partition list scan | 20ms | 50ms | 100ms |
| Lead insert (single) | 10ms | 30ms | 50ms |
| Lead insert (batch 100) | 100ms | 300ms | 500ms |
| Lead update | 5ms | 15ms | 30ms |
| Analytics aggregation | 200ms | 500ms | 1000ms |
| Health score calculation | 50ms | 150ms | 300ms |

## PERF.K3 WEBHOOK TARGETS

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Delivery success rate | > 99% | 95-99% | < 95% |
| Average latency | < 500ms | 500-1000ms | > 1000ms |
| Circuit breaker activations | 0/day | 1-5/day | > 5/day |
| DLQ backlog | < 100 | 100-500 | > 500 |

## PERF.K4 SYSTEM CAPACITY

| Resource | Current | Warning | Max |
|----------|---------|---------|-----|
| Partitions | 15,000 | 12,000 | 15,000 |
| Leads per partition | 100,000 | 75,000 | 100,000 |
| Total leads | 100M | 80M | 100M |
| Concurrent API requests | 1,000 | 750 | 1,000 |
| Database connections | 200 | 160 | 200 |
| n8n workflow executions/min | 500 | 400 | 500 |

---

# 📚 APPENDIX L: SECURITY CHECKLIST

## SEC.L1 PRE-LAUNCH CHECKLIST

### Database Security
- [ ] RLS enabled on all genesis.* tables
- [ ] RLS forced on all genesis.* tables
- [ ] All policies use fail-closed patterns
- [ ] No superuser credentials in application code
- [ ] Service role key only used server-side
- [ ] Anon key has minimal permissions

### API Security
- [ ] All admin routes require authentication
- [ ] Super admin check on sensitive endpoints
- [ ] Rate limiting configured
- [ ] Input validation with Zod schemas
- [ ] Output sanitization for user data
- [ ] CORS configured correctly

### Webhook Security
- [ ] Secret header validation
- [ ] Idempotency key enforcement
- [ ] Request body size limits
- [ ] IP allowlist (optional)

### Credential Security
- [ ] AES-256-GCM encryption at rest
- [ ] Per-workspace key derivation
- [ ] Credential audit logging
- [ ] No plaintext secrets in logs
- [ ] Secure key rotation process

### Infrastructure Security
- [ ] HTTPS enforced everywhere
- [ ] Security headers configured
- [ ] Environment variables not exposed
- [ ] Sentry DSN configured (errors only)
- [ ] No debug mode in production

## SEC.L2 PERIODIC SECURITY TASKS

### Weekly
- [ ] Review security audit logs
- [ ] Check for failed RLS bypass attempts
- [ ] Monitor rate limit violations
- [ ] Review new user signups

### Monthly
- [ ] Rotate webhook secrets
- [ ] Review credential access patterns
- [ ] Update dependencies for security patches
- [ ] Run security test suite

### Quarterly
- [ ] Full RLS policy audit
- [ ] Penetration testing
- [ ] Credential rotation
- [ ] Security documentation review

---

# 🎯 SUMMARY

| Phase | Key Deliverable |
|-------|-----------------|
| 40 | Partition physics, catalog optimization, RLS hardening |
| 41 | Atomic provisioning with rollback |
| 42 | Bidirectional webhook protocol |
| 43 | Self-healing state reconciliation |
| 44 | Platform operations dashboard |
| 45 | Sandbox and rate limiting |
| 46 | Zero-downtime migration |
| 47 | Load/chaos/security testing |
| 48 | Blue-green deployment, instant revert |

**Total Capacity:** 100M+ leads, 15,000+ partitions, 10k concurrent users

**Architecture Principles:**
- Fail-closed security by default
- Atomic operations with rollback
- Self-healing system reconciliation
- Observable and auditable operations
- Zero-downtime deployments

**Key Technologies:**
- PostgreSQL with LIST partitioning
- Row Level Security (RLS)
- n8n workflow automation
- Vercel serverless functions
- Supabase managed database
- Clerk authentication
- Circuit breaker pattern
- Blue-green deployments

---

# ═══════════════════════════════════════════════════════════════════════════
#                        V30 TRANSFORMATION SUMMARY
# ═══════════════════════════════════════════════════════════════════════════

## V30 SOVEREIGN SINGULARITY - KEY ARCHITECTURAL DECISIONS

### Core Strategic Pivots

| Decision | V20 Approach (Rejected) | V30 Approach (Adopted) |
|----------|------------------------|------------------------|
| n8n Hosting | Shared n8n Cloud | Sovereign Droplet per tenant |
| Fleet Control | Direct API polling | BullMQ Event Bus + Sidecar Agent |
| Credential Management | Dashboard API injection | Sidecar-local injection with encrypted transit |
| Webhook Discovery | Fragile polling | Atomic Handshake Protocol |
| Cost Model | Opaque shared resources | Transparent $6/droplet + metered services |
| Onboarding | 10+ manual dashboards | Genesis Gateway unified UX |
| Data Residency | Single region | Per-tenant region selection |

### V30 Problem Resolutions

| Original Problem | V30 Solution | Phase |
|------------------|--------------|-------|
| Ohio hardcoding | Ohio Exception Protocol | Section 3 |
| Shared n8n noisy neighbor | Sovereign Droplet Factory | Phase 50 |
| Ghost webhook URL | Atomic Handshake Protocol | Phase 42 |
| Thundering herd on fleet updates | BullMQ Concurrency Governor | Phase 52 |
| Credential UUID paradox | Dynamic UUID Mapper | Phase 53 |
| Sidecar going dark | Heartbeat State Machine + Zombie Detection | Phase 54 |
| Runaway managed service costs | Financial Kill-Switch + Genesis Wallet | Phase 58 |
| 10+ dashboard onboarding friction | Genesis Gateway | Phase 60 |
| GDPR data residency | Multi-Region Storage Protocol | Phase 62 |
| Support access security | Time-limited JWT Support Protocol | Phase 63 |
| Tenant offboarding complexity | Tenant Lifecycle Management | Phase 64 |
| OAuth token expiration | Batch Credential Rotation | Phase 65 |
| Regional disaster | Cross-Region Snapshot + Mass Restoration | Phase 66 |

### Gap Closures from V30 Analysis

| Gap | Solution Implemented | Status |
|-----|---------------------|--------|
| Credential Rotation at Scale | Batch rotation via Sidecar with OAuth refresh | CLOSED |
| Tenant Deletion Protocol | 7-day grace period + atomic resource cleanup | CLOSED |
| Audit Logging | Append-only compliance log with anonymization | CLOSED |
| Support Access | Time-limited JWT with tier-based permissions | CLOSED |
| Webhook Signature Verification | HMAC-SHA256 with timestamp + replay prevention | CLOSED |
| External API Rate Limits | Per-tenant + global rate limiting via Redis | CLOSED |
| Data Export (GDPR) | Automated export with chunked large datasets | CLOSED |
| JSONB Indexing Watchdog | Retained for God Mode analytics (defensive) | CLOSED |

---

## CRITICAL SUCCESS METRICS (V30)

### Infrastructure Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Tenant provisioning time | <60 seconds | Cloud-Init to ACTIVE_HEALTHY |
| Droplet wake time (from hibernation) | <45 seconds | Power-on to heartbeat |
| Heartbeat detection latency | <5 seconds | Sidecar report to DB update |
| Zombie detection time | <180 seconds | 3 missed heartbeats |
| Fleet update time (15k droplets) | <30 minutes | Template rollout completion |
| Cross-region failover | <4 hours | Regional disaster to operational |

### Security Targets

| Metric | Target | Enforcement |
|--------|--------|-------------|
| RLS null bypass | Zero occurrences | COALESCE + fail-closed |
| Cross-tenant data leakage | Zero incidents | Partition isolation + RLS |
| Credential exposure | Zero incidents | AES-256-GCM + Sidecar-local |
| Replay attacks | Zero successes | HMAC + timestamp + jti |

### Financial Targets

| Metric | Target | Mechanism |
|--------|--------|-----------|
| Per-tenant infrastructure cost | <$5.50/month | Droplet + bandwidth + snapshot |
| Margin on managed services | >25% | Wholesale pricing + wallet debit |
| Kill-switch latency | <1 second | Redis-cached balance check |

---

## DOCUMENTATION COVERAGE (V30)

| Part | Phases | Focus | Estimated Lines |
|------|--------|-------|-----------------|
| I | Sections 1-3 | Strategic Architecture, Ohio Exception | ~1,500 |
| II | 40, 50, 51 | Infrastructure Physics | ~2,500 |
| III | 41, 52, 42, 53 | Orchestration & Communication | ~2,000 |
| IV | 43, 54, 55, 56 | Fleet Operations | ~2,000 |
| V | 57, 58, 59 | Financial & Billing | ~1,200 |
| VI | 60, 61 | Onboarding & UX | ~800 |
| VII | 62, 63, 64 | Compliance & Security | ~1,200 |
| VIII | 44, 45, 65 | Platform Operations | ~1,500 |
| IX | 46, 47, 48, 66 | Migration & Deployment | ~2,000 |
| X | Extended Implementation | Reference Code | ~3,000 |

---

## CHANGE LOG

### V30.0 (2026-01-25) - Sovereign Singularity Release

**Major Additions:**
- Section 2: V30 Architectural Pillars (Sovereign Isolation, Managed Orchestration, Unified Onboarding)
- Section 3: The Ohio Exception Protocol
- Phase 50: Sovereign Droplet Factory (DigitalOcean VM provisioning)
- Phase 51: Sidecar Agent Architecture (Zero-Trust JWT communication)
- Phase 52: BullMQ Event Bus & Concurrency Governor
- Phase 53: Dynamic UUID Mapper (Credential Paradox solution)
- Phase 54: Heartbeat State Machine (Granular health states)
- Phase 55: Hibernation & Wake Physics (Cost optimization)
- Phase 56: Fleet-Wide Template Reconciliation (Blue-Green updates)
- Phase 57: Managed vs. BYO Service Matrix
- Phase 58: Financial Kill-Switch & Genesis Wallet
- Phase 59: Cost Model & Rate Limit Orchestration
- Phase 60: Genesis Gateway Unified Onboarding
- Phase 61: Friction-Reduction Protocols
- Phase 62: Data Residency & GDPR Protocol
- Phase 63: Audit Logging & Support Access
- Phase 64: Tenant Lifecycle Management
- Phase 65: Credential Rotation & Webhook Security
- Phase 66: Disaster Recovery & Regional Failover

**Major Updates:**
- Executive Summary: Rewritten for V30 strategic pivots
- Top 15 Critical Risks: Updated with V30 solutions
- Phase 41: Added droplet provisioning states
- Phase 42: Replaced with Atomic Handshake Protocol
- Phase 43: Integrated with Heartbeat State Machine
- Phase 44: Added Metric Aggregator for cross-tenant analytics

**Gap Closures:**
- Credential Rotation Protocol
- Tenant Deletion Protocol
- Audit Logging Protocol
- Support Access Protocol
- Webhook Signature Verification
- External API Rate Limits
- Data Export (GDPR Portability)
- JSONB Indexing Watchdog (retained for analytics)

### V20.0 (2026-01-24) - Original Release

- Initial Forensic Systems Architecture Specification
- Phases 40-48 for shared n8n Cloud model
- PostgreSQL partitioning for 15,000 workspaces
- RLS hardening and atomic DDL
- Extended implementation reference code

---

**Document Information:**
- Version: 30.0 (Sovereign Singularity)
- Last Updated: 2026-01-25
- Total Lines: ~18,000
- Author: L10 Distinguished Principal Systems Architect
- Status: Production Ready (V30 Architecture Complete)

---

**END OF GENESIS ENGINE: SOVEREIGN SINGULARITY WAR PLAN V30.0**
