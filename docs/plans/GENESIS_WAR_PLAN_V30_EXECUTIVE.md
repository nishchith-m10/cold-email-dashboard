# 🧬 THE GENESIS ENGINE: SOVEREIGN SINGULARITY EXECUTIVE ARCHITECTURE V30.0

> **Document Type:** Executive Architectural Specification (Code-Free)  
> **Status:** Complete - Strategic Overview  
> **Created:** 2026-01-25  
> **Architect Level:** L10 Distinguished Principal Systems Architect  
> **Target:** 100M+ Leads | 15,000+ Sovereign Droplets | Zero-Failure Tolerance  
> **Note:** This document contains NO code examples. For implementation details, see GENESIS_WAR_PLAN_V30.md

---

## 📋 MASTER TABLE OF CONTENTS

### PART I: STRATEGIC ARCHITECTURE

| Section | Title | Focus |
|---------|-------|-------|
| **1** | Executive Summary | V30 Mandate, Strategic Pivots, Architecture Overview |
| **2** | V30 Architectural Pillars | Sovereign Isolation, Fleet Orchestration, Unified Onboarding |
| **3** | The Ohio Exception | Legacy Workspace Isolation Protocol |

### PART II: INFRASTRUCTURE PHYSICS

| Phase | Title | Focus |
|-------|-------|-------|
| **40** | Database Foundation & Partition Physics | Catalog optimization, atomic provisioning, RLS hardening |
| **50** | Sovereign Droplet Factory | DigitalOcean VM provisioning, Docker standardization |
| **51** | Sidecar Agent Architecture | Zero-Trust JWT, local n8n management, health reporting |

### PART III: ORCHESTRATION & COMMUNICATION

| Phase | Title | Focus |
|-------|-------|-------|
| **41** | The "Ignition" Orchestrator | Atomic provisioning, credential vault, state machine |
| **52** | BullMQ Event Bus & Concurrency Governor | Fleet-wide command distribution |
| **42** | Atomic Handshake Protocol | Registration Node, webhook URL discovery |
| **53** | Dynamic UUID Mapper | Credential Paradox solution, template rewriting |

### PART IV: FLEET OPERATIONS

| Phase | Title | Focus |
|-------|-------|-------|
| **43** | State Reconciliation Watchdog | Drift detection, auto-healing |
| **54** | Heartbeat State Machine | Granular health states, zombie detection |
| **55** | Hibernation & Wake Physics | Cost optimization, pre-warming |
| **56** | Fleet-Wide Template Reconciliation | Blue-Green updates, batch rollout |

### PART V: FINANCIAL & BILLING

| Phase | Title | Focus |
|-------|-------|-------|
| **57** | Managed vs. BYO Service Matrix | Service categorization |
| **58** | Financial Kill-Switch & Genesis Wallet | Pre-flight balance checks |
| **59** | Cost Model & Rate Limit Orchestration | Per-tenant margins |

### PART VI: ONBOARDING & UX

| Phase | Title | Focus |
|-------|-------|-------|
| **60** | Genesis Gateway Unified Onboarding | OAuth proxy, BYO key collection |
| **61** | Friction-Reduction Protocols | Auto-scrape brand, DNS automation |

### PART VII: COMPLIANCE & SECURITY

| Phase | Title | Focus |
|-------|-------|-------|
| **62** | Data Residency & GDPR Protocol | Multi-region storage |
| **63** | Audit Logging & Support Access | Compliance trail |
| **64** | Tenant Lifecycle Management | Deletion protocol, data export |

### PART VIII: PLATFORM OPERATIONS

| Phase | Title | Focus |
|-------|-------|-------|
| **44** | "God Mode" Command & Control | Platform operations dashboard |
| **45** | Sandbox & Simulation Engine | Mock environment, testing |
| **65** | Credential Rotation & Webhook Security | OAuth refresh, HMAC signatures |

### PART IX: MIGRATION & DEPLOYMENT

| Phase | Title | Focus |
|-------|-------|-------|
| **46** | Shadow Migration & Parity Testing | Zero-downtime data migration |
| **47** | Hyper-Scale Stress Test & Red-Teaming | Load, chaos, security testing |
| **48** | Production Cutover & Revert Protocol | Blue-green deployment |
| **66** | Disaster Recovery & Regional Failover | Cross-region snapshots |

---

# ═══════════════════════════════════════════════════════════════════════════
#                        PART I: STRATEGIC ARCHITECTURE
# ═══════════════════════════════════════════════════════════════════════════

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
| **Cost Model** | Opaque shared resources | $4/droplet/tenant linear model | Predictable per-tenant margins |

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
| Cost model | Opaque, per-execution pricing | Linear $4/month/droplet |
| Breach containment | Compromise exposes all tenants | Compromise limited to one tenant |
| Customization | None (shared instance) | Per-tenant n8n settings |

**The Droplet Factory Model - Visual Architecture:**

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
│                          × 15,000 TOTAL                                    │
│                                                                             │
│  DATABASE LAYER (Supabase - Partitioned)                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  genesis.leads (parent table) with 15,000 partitions               │   │
│  │  Each partition isolated by workspace_id with RLS                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Pillar II: Managed Fleet Orchestration

The Orchestration Layer is the Control Plane that manages 15,000 isolated Data Planes. It must handle fleet-wide commands without suffering from network I/O bottlenecks.

**The BullMQ Event Bus - Problem & Solution:**

**WITHOUT BullMQ (V20 Problem - "Thundering Herd"):**
- Dashboard issues "Update template for all tenants"
- 15,000 simultaneous HTTP requests to n8n instances
- Dashboard network stack overwhelmed
- Connections timeout, partial updates, inconsistent state
- **RESULT: Complete system failure**

**WITH BullMQ (V30 Solution - "Concurrency Governor"):**
- Dashboard issues "Update template for all tenants"
- Queue 15,000 jobs to BullMQ Redis
- Concurrency Governor rate-limits to 100 concurrent
- Sidecars pull jobs, execute locally, report success
- Dashboard receives completion events over 15 minutes
- **RESULT: Fleet consistent, Control Plane stable**

**Priority Queue Structure:**

| Priority | Level | Job Types |
|----------|-------|-----------|
| 1 | CRITICAL | New Ignition, Security Patches |
| 2 | HIGH | Credential Rotation, Hard Reboots |
| 3 | MEDIUM | Template Updates, Config Changes |
| 4 | LOW | Metric Collection, Health Checks |

### 2.3 Pillar III: Unified Onboarding (Genesis Gateway)

The V30 plan mandates the **Genesis Gateway** as the default onboarding experience, eliminating the "10+ Dashboard" friction that kills user adoption.

**Onboarding Friction Comparison:**

| Step | Without Genesis Gateway | With Genesis Gateway |
|------|------------------------|---------------------|
| 1 | Sign up on Dashboard | Sign up on Dashboard |
| 2 | Go to Google Cloud Console | Click "Connect Gmail" |
| 3 | Create OAuth app | (OAuth handled by Genesis) |
| 4 | Configure consent screen | (Automatic) |
| 5 | Get Client ID/Secret | (Automatic) |
| 6 | Go to OpenAI | Enter OpenAI API key |
| 7 | Create API key | (User's existing key) |
| 8 | Go to Relevance AI | Enter Relevance AI key |
| 9 | Go to n8n | (N/A - Sidecar handles) |
| 10 | Configure credentials | (N/A - Sidecar handles) |
| 11 | Go to DNS provider | Click "Setup DNS" |
| 12 | Add SPF/DKIM/DMARC | (Entri handles automatically) |
| **Total Time** | **2-4 hours** | **<10 minutes** |

---

## SECTION 3: THE OHIO EXCEPTION

### 3.1 The Legacy Workspace Isolation Protocol

The "Ohio" workspace is legacy infrastructure that predates the V30 Sovereign Singularity architecture. It uses hardcoded references to `leads_ohio` and connects to a legacy n8n instance. Migrating Ohio to a Sovereign Droplet would risk breaking a production system with active campaigns.

**The Strategic Decision:**

Ohio remains on legacy infrastructure indefinitely. All new tenants are provisioned through the V30 Sovereign Droplet Factory. The codebase is refactored to:

1. **Remove all hardcoded Ohio references** from shared code paths
2. **Isolate Ohio-specific logic** behind a workspace ID check
3. **Ensure zero coupling** between Ohio and new tenant provisioning

### 3.2 Ohio Exception Flow

**Request Processing Logic:**

1. Incoming request received
2. Check: Is workspace_id === OHIO_WORKSPACE_UUID?
3. **IF YES (Ohio):** Route to legacy path
   - Use `leads_ohio` table directly
   - Connect to legacy n8n instance
   - Use old webhook handlers
4. **IF NO (All other tenants):** Route to V30 Sovereign path
   - Use `genesis.leads_p_{slug}` partition
   - Route through Sidecar Agent
   - Use BullMQ orchestration

### 3.3 Ohio Exception - Non-Goals

The Ohio Exception protocol explicitly does NOT include:

1. Migration of Ohio data to the new partitioned schema
2. Provisioning Ohio on a Sovereign Droplet
3. Upgrading Ohio's n8n to the V30 Sidecar model
4. Applying V30 features (Kill-Switch, Heartbeat, etc.) to Ohio

Ohio remains a static, legacy workspace that will eventually be deprecated when the client is ready to migrate.

---

# ═══════════════════════════════════════════════════════════════════════════
#                        PART II: INFRASTRUCTURE PHYSICS
# ═══════════════════════════════════════════════════════════════════════════

---

## PHASE 40: DATABASE FOUNDATION & PARTITION PHYSICS

> **Phase Type:** Distributed Systems Infrastructure  
> **Target:** 15,000 partitions, 100M leads, sub-100ms query latency  
> **Risk Level:** CRITICAL (Foundation Layer)

### 40.1 The PostgreSQL Catalog Bottleneck

At 15,000 partitions, PostgreSQL's system catalogs become the primary bottleneck.

**Catalog Physics at Scale:**

| Catalog Table | Entries at 15k Partitions |
|---------------|---------------------------|
| pg_class | 60,000+ (15k partitions + 45k indexes) |
| pg_attribute | 600,000+ (40 columns × 15k) |
| pg_inherits | 15,000 parent-child relationships |

**Lock Contention Points:**
1. PartitionSelector lock during query planning
2. pg_class AccessShareLock for catalog lookups
3. Relation cache invalidation storms on DDL
4. Query planner exhaustive partition scan

**Failure Mode Without Optimization:**
- Query planning time: O(n) where n = partition count
- At 15k partitions: 50-500ms planning overhead PER QUERY
- Catalog lock contention causes connection pile-up
- DDL operations (CREATE PARTITION) block ALL queries

### 40.2 The Solution: Configuration & Pooling

**Critical PostgreSQL Settings:**

| Setting | Value | Purpose |
|---------|-------|---------|
| `enable_partition_pruning` | on | Eliminates non-matching partitions from query plan |
| `plan_cache_mode` | force_custom_plan | Prevents generic plan caching issues |
| `max_locks_per_transaction` | 256 | Handles partition operations (default 64 insufficient) |
| `max_pred_locks_per_transaction` | 128 | For serializable isolation |
| `shared_buffers` | 4GB minimum | Catalog caching |
| `work_mem` | 256MB | Per-operation memory |
| `maintenance_work_mem` | 2GB | For CREATE INDEX CONCURRENTLY |

**Connection Pooling: PgBouncer**

| Setting | Value | Rationale |
|---------|-------|-----------|
| `pool_mode` | transaction | REQUIRED for SET LOCAL to work with RLS |
| `max_client_conn` | 10,000 | Support 10k concurrent users |
| `default_pool_size` | 50 | Connections per database |
| `query_timeout` | 30s | Kill runaway queries |
| `server_reset_query` | DISCARD ALL | Clean state between transactions |

**Why Transaction-Level Pooling is Mandatory:**

| Pool Mode | SET LOCAL RLS | Connection Reuse | Verdict |
|-----------|---------------|------------------|---------|
| Session | Works | No reuse (1:1) | Exhausts connections |
| Transaction | Works | Full reuse | REQUIRED |
| Statement | BROKEN | Full reuse | Cannot use RLS |

### 40.3 Partition Naming Convention

**Standard Format:** `leads_p_{workspace_slug}`

| Component | Example | Rules |
|-----------|---------|-------|
| Prefix | `leads_p_` | Always literal |
| Slug | `acme_corp` | Lowercase, underscores only, max 50 chars |

**Example Partitions:**
- `genesis.leads_p_acme_corp`
- `genesis.leads_p_startup_xyz`
- `genesis.leads_p_enterprise_123`

### 40.4 RLS (Row Level Security) Hardening

**The Vulnerability: Null Workspace Context**

If `app.workspace_id` is not set, a naive RLS policy could return all rows or no rows unpredictably.

**The Solution: Fail-Closed COALESCE Pattern**

The RLS policy must use COALESCE to default to an impossible value (empty string) when the context is not set. This ensures:
- If context not set → policy evaluates to FALSE → zero rows returned
- If context set → policy evaluates normally → correct rows returned

**Security Audit Requirements:**
1. Every query must call context-setting function FIRST
2. Context-setting function must validate UUID format
3. All access attempts must be logged to audit table
4. RLS bypass attempts must trigger immediate alerts

### 40.5 Atomic DDL for Partition Creation

**The Principle:** Either ALL steps complete, or ALL are rolled back.

**Partition Creation Steps:**

| Step | Action | Rollback |
|------|--------|----------|
| 1 | Acquire advisory lock (prevents concurrent creation) | Release lock |
| 2 | Check partition doesn't exist | N/A |
| 3 | CREATE TABLE partition | DROP TABLE IF EXISTS |
| 4 | Create indexes on partition | N/A (dropped with table) |
| 5 | Register in partition_registry | DELETE registry entry |
| 6 | Release advisory lock | N/A |

**Idempotency Guarantee:** Re-running partition creation with same workspace_id safely returns existing partition without error.

---

## PHASE 50: SOVEREIGN DROPLET FACTORY

> **Phase Type:** V30 Core Infrastructure  
> **Dependencies:** None (New Foundation)  
> **Risk Level:** CRITICAL (Foundation Layer)

### 50.1 Droplet Specification Matrix

| Component | Specification | Rationale |
|-----------|---------------|-----------|
| **Droplet Size** | s-1vcpu-1gb ($4/month) | Minimum viable for n8n + Sidecar |
| **OS** | Ubuntu 22.04 LTS | Long-term support, Docker-native |
| **Region** | Per-tenant selection | GDPR compliance, latency optimization |
| **Image** | Custom snapshot with Docker pre-installed | Faster provisioning (<30s boot) |
| **Networking** | Public IPv4 + Private VPC | Sidecar via public, internal via VPC |
| **Firewall** | Ports 22, 443, 5678 only | Minimal attack surface |

### 50.2 Droplet Cost Model

**Per-Tenant Monthly Costs:**

| Component | Cost |
|-----------|------|
| Droplet (s-1vcpu-1gb) | $4.00 |
| Bandwidth (avg 5GB) | $0.50 |
| Snapshots (daily, 7 retained) | $0.60 |
| **Infrastructure Subtotal** | **$5.10/tenant** |

**Shared Costs (at 15k scale):**

| Component | Total | Per Tenant |
|-----------|-------|------------|
| Redis (BullMQ) | $15/month | $0.001 |
| Supabase Pro | $25/month | $0.002 |
| Dashboard Hosting | ~$15/month | $0.001 |
| **Shared Subtotal** | | **~$0.01/tenant** |

**Total Infrastructure Cost:** ~$5.11/tenant/month

**At 15,000 Tenants:**
- Monthly Infrastructure: $76,650
- Annual Infrastructure: $919,800
- Minimum Pricing for 20% Margin: $6.13/tenant/month

### 50.3 Docker Container Stack

Every droplet runs three containers:

| Container | Purpose | Resource Limits |
|-----------|---------|-----------------|
| **n8n** | Workflow execution engine | 512MB RAM, 0.5 CPU |
| **sidecar** | Agent for Control Plane | 128MB RAM, 0.1 CPU |
| **caddy** | Reverse proxy, SSL, tracking domains | 64MB RAM, 0.1 CPU |

**Benefits of Docker Standardization:**
1. Faster provisioning - No native package installation
2. Version control - Pin exact n8n version across fleet
3. Isolation - Resource limits prevent runaway processes
4. Updates - Blue-Green container swap with zero downtime
5. Debugging - Consistent environment, reproducible issues

### 50.4 Cloud-Init Atomic Ignition Sequence

**Timeline:**

| Time | Action |
|------|--------|
| T+0s | Droplet boots (Ubuntu with Docker pre-installed) |
| T+5s | Cloud-Init reads user-data, injects environment variables |
| T+15s | Docker Compose pulls images (if not cached) |
| T+30s | Containers start in order: Caddy → n8n → Sidecar |
| T+40s | Sidecar health check passes |
| T+45s | Sidecar executes Atomic Handshake (POSTs to Dashboard) |
| T+50s | Dashboard injects credentials via Sidecar |
| T+55s | Sidecar deploys Golden Template workflows |
| T+60s | **IGNITION COMPLETE** |

### 50.5 Droplet Lifecycle States

| State | Definition | Next States |
|-------|------------|-------------|
| **PENDING** | DO API called, droplet creating | INITIALIZING, FAILED |
| **INITIALIZING** | Cloud-Init running | HANDSHAKE_PENDING, FAILED |
| **HANDSHAKE_PENDING** | Waiting for Sidecar POST | ACTIVE_HEALTHY, ORPHAN |
| **ACTIVE_HEALTHY** | Normal operation | DRIFT_DETECTED, HIBERNATING, ZOMBIE |
| **DRIFT_DETECTED** | Workflow/credential mismatch | ACTIVE_HEALTHY (after heal) |
| **HIBERNATING** | Powered off for cost savings | WAKING |
| **WAKING** | Powering on from hibernation | ACTIVE_HEALTHY |
| **ZOMBIE** | Sidecar unresponsive | REBOOTING |
| **REBOOTING** | Hard reboot in progress | ACTIVE_HEALTHY, ORPHAN |
| **ORPHAN** | Provisioning failed | TERMINATED |
| **TERMINATED** | Droplet destroyed | (final state) |

### 50.6 Orphan Droplet Atomic Rollback

**Rollback Trigger Conditions:**

| Failure Point | Compensation Required |
|---------------|----------------------|
| DO API fails | None (no resources created) |
| Cloud-Init fails | Delete droplet |
| Handshake timeout (5 min) | Delete droplet |
| Credential injection fails | Delete droplet, delete partition |
| Workflow deployment fails | Delete droplet, delete partition, delete credentials |

**Rollback Sequence:**
1. Delete DigitalOcean Droplet
2. Delete Database Partition (if created)
3. Delete Credential Vault Entries (if created)
4. Delete Webhook Registry Entries (if created)
5. Update Workspace Status to ROLLBACK_COMPLETE
6. Notify User with troubleshooting steps

---

## PHASE 51: SIDECAR AGENT ARCHITECTURE

> **Phase Type:** V30 Core Infrastructure  
> **Dependencies:** Phase 50  
> **Risk Level:** CRITICAL (Security Boundary)

### 51.1 Sidecar Overview

The **Sidecar Agent** is a lightweight process running alongside n8n on every Sovereign Droplet. It is the **only entity** allowed to communicate with the central Dashboard, creating a **Zero-Trust security perimeter**.

### 51.2 Sidecar Responsibilities

| Responsibility | Description | Frequency |
|----------------|-------------|-----------|
| **Health Reporting** | Report n8n status, disk, memory, CPU | Every 60 seconds |
| **Credential Injection** | Receive encrypted credentials, create in n8n | On provisioning, on rotation |
| **Workflow Management** | Deploy, update, activate/deactivate workflows | On demand |
| **Handshake Execution** | POST webhook URL back to Dashboard | On first boot |
| **Container Lifecycle** | Restart n8n, pull new images | On command |
| **Log Aggregation** | Stream n8n logs to Dashboard | On demand |
| **Metric Collection** | Collect execution stats | Every 15 minutes |

### 51.3 Sidecar Security Model: Zero-Trust JWT

All communication between Dashboard and Sidecar uses **Signed JWT Headers**.

**Why This Matters:**
1. **Breach Containment:** Compromised droplet cannot command other droplets
2. **Short-Lived Tokens:** JWTs expire in 5 minutes
3. **Tenant Isolation:** Each JWT scoped to single workspace_id
4. **Audit Trail:** All JWT usage logged

**JWT Payload Contents:**

| Field | Purpose |
|-------|---------|
| `iss` | Issuer (genesis-dashboard) |
| `sub` | Target workspace UUID |
| `aud` | Audience (sidecar) |
| `exp` | Expiration (5 minutes from issue) |
| `jti` | Unique request ID (idempotency) |
| `action` | Permitted action (e.g., deploy_workflow) |
| `droplet_id` | Target droplet |

**Sidecar Verification Steps:**
1. Verify signature using Dashboard's public key
2. Check exp > current_time
3. Check sub === this_droplet_workspace_id
4. Check action is permitted for this endpoint
5. Check jti not already processed (replay prevention)

### 51.4 Sidecar Command Reference

| Command | Action | Response |
|---------|--------|----------|
| `HEALTH_CHECK` | Return current status | n8n_status, disk, memory, cpu |
| `DEPLOY_WORKFLOW` | Create new workflow | workflow_id, webhook_url |
| `UPDATE_WORKFLOW` | Update existing workflow | success |
| `ACTIVATE_WORKFLOW` | Set workflow active | success |
| `DEACTIVATE_WORKFLOW` | Set workflow inactive | success |
| `DELETE_WORKFLOW` | Remove workflow | success |
| `INJECT_CREDENTIAL` | Create credential in n8n | credential_id |
| `ROTATE_CREDENTIAL` | Update existing credential | success |
| `RESTART_N8N` | Restart n8n container | success, new_pid |
| `PULL_IMAGE` | Pull new Docker image | success |
| `SWAP_CONTAINER` | Blue-Green container swap | success |
| `GET_LOGS` | Retrieve n8n logs | logs |
| `COLLECT_METRICS` | Return execution metrics | stats |

---

# ═══════════════════════════════════════════════════════════════════════════
#                        PART III: ORCHESTRATION & COMMUNICATION
# ═══════════════════════════════════════════════════════════════════════════

---

## PHASE 52: BULLMQ EVENT BUS & CONCURRENCY GOVERNOR

> **Phase Type:** V30 Fleet Orchestration  
> **Dependencies:** Phase 51  
> **Risk Level:** HIGH (System Coordination)

### 52.1 Queue Structure

| Queue Name | Purpose | Priority | Concurrency |
|------------|---------|----------|-------------|
| `ignition` | New tenant provisioning | CRITICAL (1) | 50 |
| `security` | Credential rotation, patches | HIGH (2) | 100 |
| `template` | Workflow updates | MEDIUM (3) | 100 |
| `health` | Heartbeat processing | LOW (4) | 500 |
| `metric` | Analytics collection | LOW (4) | 200 |
| `reboot` | Zombie recovery | HIGH (2) | 25 |

### 52.2 Concurrency Governor Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| maxConcurrency | 100 | Max simultaneous jobs |
| rateLimitMax | 200 | Max jobs per window |
| rateLimitDuration | 1000ms | 1 second window |
| backoffType | exponential | Retry strategy |
| maxRetries | 5 | Before dead-letter |

### 52.3 Fleet Update Timeline (15k Droplets)

| Time | Progress | Jobs Complete |
|------|----------|---------------|
| T+0s | Start | 0 |
| T+1s | 100 concurrent | 0 |
| T+10s | Steady state | 1,000 |
| T+60s | | 6,000 |
| T+120s | | 12,000 |
| T+150s | Complete | 15,000 |

**Result:** 15,000 droplets updated in ~2.5 minutes with zero Dashboard stress

---

## PHASE 41: THE "IGNITION" ORCHESTRATOR

> **Phase Type:** Provisioning Infrastructure  
> **Dependencies:** Phase 40, Phase 50, Phase 51, Phase 52, Phase 53  
> **Risk Level:** HIGH (Multi-System Coordination)

### 41.1 V30 Ignition State Machine

| Step | State | Action | Rollback | Timeout |
|------|-------|--------|----------|---------|
| 1 | PARTITION_CREATING | Create database partition | DROP TABLE | 30s |
| 2 | DROPLET_PROVISIONING | Create DO droplet | DELETE droplet | 120s |
| 3 | HANDSHAKE_PENDING | Wait for Sidecar POST | DELETE droplet | 300s |
| 4 | CREDENTIALS_INJECTING | Send creds to Sidecar | Delete from Vault | 60s |
| 5 | WORKFLOWS_DEPLOYING | Send Golden Template | N/A | 120s |
| 6 | ACTIVATING | Activate workflows | Deactivate | 30s |

**ATOMIC GUARANTEE:** Either ALL steps complete, or ALL are rolled back.

### 41.2 Ignition Flow Visualization

```
PENDING → PARTITION_CREATING → DROPLET_PROVISIONING → HANDSHAKE_PENDING
                                                              ↓
FAILED ← ROLLBACK_IN_PROGRESS ←← CREDENTIALS_INJECTING ← ←←←←┘
   ↑                                      ↓
   └←←←←←←←←←←←←←←←←←←←←←←←←← WORKFLOWS_DEPLOYING
                                          ↓
                                     ACTIVATING
                                          ↓
                                       ACTIVE
```

---

## PHASE 42: ATOMIC HANDSHAKE PROTOCOL

> **Phase Type:** V30 Integration Layer  
> **Dependencies:** Phase 41, Phase 50, Phase 51  
> **Risk Level:** HIGH (Trust Establishment)

### 42.1 The Registration Node Pattern

The V30 Atomic Handshake Protocol solves the "Ghost Webhook" paradox from V20. The Sidecar **pushes** the webhook URL back to the Dashboard instead of the Dashboard polling for it.

### 42.2 Handshake Flow

**Context:** Droplet just booted via Cloud-Init, Sidecar is starting

| Step | Actor | Action |
|------|-------|--------|
| 1 | Cloud-Init | Injects PROVISIONING_TOKEN, DASHBOARD_URL, WORKSPACE_ID |
| 2 | Sidecar | Starts, n8n boots |
| 3 | Sidecar | Health check passes |
| 4 | Sidecar | POSTs to /api/sidecar/handshake with token + webhook_url |
| 5 | Dashboard | Verifies token matches database |
| 6 | Dashboard | Atomically updates workspace.webhook_url and status |
| 7 | Dashboard | Invalidates token (one-time use) |
| 8 | Dashboard | Generates long-lived sidecar_token |
| 9 | Dashboard | Returns sidecar_token + config |
| 10 | Sidecar | Stores config, begins heartbeat loop |

### 42.3 Token Security Properties

| Token Type | Purpose | Lifetime | Usage |
|------------|---------|----------|-------|
| Provisioning Token | One-time handshake | 15 minutes | Single use |
| Sidecar Token | Ongoing auth | 30 days | Heartbeats, reports |
| Command JWT | Dashboard→Sidecar | 5 minutes | Per-request |

---

## PHASE 53: DYNAMIC UUID MAPPER

> **Phase Type:** V30 Credential Management  
> **Dependencies:** Phase 51  
> **Risk Level:** HIGH (Security Critical)

### 53.1 The Credential Paradox

When cloning "Golden Template" workflows to a new tenant, the template contains **hardcoded credential UUIDs** that reference the template's credentials, not the tenant's.

**The Problem:** Template workflow has `TEMPLATE_GMAIL_UUID` but tenant needs `tenant_abc_gmail_uuid`

### 53.2 The Solution: Dynamic UUID Mapper

The Dashboard maintains a **Template Credential Map**. When deploying to a tenant, the Sidecar replaces template placeholders with tenant-specific credential UUIDs.

**Mapping Example:**

| Template Placeholder | Replaced With |
|---------------------|---------------|
| `TEMPLATE_GMAIL_UUID` | `tenant_abc_gmail_uuid` |
| `TEMPLATE_OPENAI_UUID` | `tenant_abc_openai_uuid` |
| `TEMPLATE_SUPABASE_UUID` | `tenant_abc_supabase_uuid` |

### 53.3 Variable Replacement Beyond Credentials

| Placeholder | Replaced With | Source |
|-------------|---------------|--------|
| `YOUR_DASHBOARD_URL` | Tenant's dashboard URL | Workspace settings |
| `YOUR_WEBHOOK_TOKEN` | Generated secure token | Credential Vault |
| `YOUR_SENDER_EMAIL` | Tenant's email | Onboarding form |
| `YOUR_NAME` | Tenant's name | Onboarding form |
| `YOUR_COMPANY_NAME` | Tenant's company | Onboarding form |
| `YOUR_CALENDLY_LINK_1` | Booking URL | Onboarding form |
| `YOUR_WORKSPACE_ID` | Tenant's UUID | Workspace record |
| `YOUR_LEADS_TABLE` | Partition name | `genesis.leads_p_{slug}` |

---

# ═══════════════════════════════════════════════════════════════════════════
#                        PART IV: FLEET OPERATIONS
# ═══════════════════════════════════════════════════════════════════════════

---

## PHASE 43: STATE RECONCILIATION WATCHDOG

> **Phase Type:** V30 Reliability Layer  
> **Dependencies:** Phase 51, Phase 54  
> **Risk Level:** HIGH (System Consistency)

### 43.1 Watchdog vs. Heartbeat Responsibilities

| Concern | Heartbeat (Phase 54) | Watchdog (Phase 43) |
|---------|---------------------|---------------------|
| Sidecar alive? | Primary | Triggered by failure |
| n8n process running? | Primary | Secondary |
| Workflow state match? | | Primary |
| Credential valid? | | Primary |
| DB records consistent? | | Primary |
| Orphan resources? | | Primary |
| Resource utilization? | Primary | |

### 43.2 Drift Types

| Drift Type | Definition | Severity | Auto-Healable |
|------------|------------|----------|---------------|
| `orphan_workflow` | In n8n but not DB | MEDIUM | Yes |
| `orphan_db_record` | In DB but not n8n | HIGH | Yes |
| `state_mismatch` | DB says active, n8n says inactive | HIGH | Yes |
| `missing_partition` | Workspace exists, partition missing | CRITICAL | No |
| `credential_expired` | OAuth token expired | MEDIUM | Yes |
| `version_mismatch` | Workflow version differs | MEDIUM | Yes |

### 43.3 Auto-Heal Actions

| Drift Type | Heal Action |
|------------|-------------|
| orphan_workflow | Deactivate and archive in n8n |
| orphan_db_record | Mark campaign as error in DB |
| state_mismatch | Sync n8n state to match DB |
| credential_expired | Trigger OAuth refresh flow |
| version_mismatch | Re-deploy correct version |

---

## PHASE 54: HEARTBEAT STATE MACHINE

> **Phase Type:** V30 Fleet Operations  
> **Dependencies:** Phase 51, Phase 52  
> **Risk Level:** HIGH (Fleet Visibility)

### 54.1 Heartbeat Payload

Every 60 seconds, each Sidecar reports:

| Field | Description |
|-------|-------------|
| workspace_id | Tenant identifier |
| droplet_id | DigitalOcean ID |
| state | Current operational state |
| n8n_status | n8n process status |
| n8n_pid | Process ID |
| active_workflows | Count |
| pending_executions | Queued runs |
| cpu_usage_percent | Current CPU |
| memory_usage_mb | Current memory |
| disk_usage_percent | Disk space |
| uptime_seconds | Since container start |

### 54.2 Granular Health States

| State | Definition | Action Required |
|-------|------------|-----------------|
| **INITIALIZING** | Cloud-Init running | Monitor |
| **HANDSHAKE_PENDING** | Waiting for Registration | Timeout → Rollback |
| **ACTIVE_HEALTHY** | All normal | Standard operation |
| **ACTIVE_DEGRADED** | High resource usage (>80%) | Alert, consider scaling |
| **DRIFT_DETECTED** | Version/credential mismatch | Trigger reconciliation |
| **HIBERNATING** | Powered off | Trigger wake on activity |
| **WAKING** | Powering on | Monitor for healthy |
| **ZOMBIE** | Sidecar unresponsive | Hard reboot |
| **REBOOTING** | Reboot in progress | Monitor |
| **ORPHAN** | Provisioning failed | Execute rollback |
| **MAINTENANCE** | Manual intervention | No automation |

### 54.3 State Transition Rules

**Zombie Detection:**
- IF 3 consecutive 60-second windows with no heartbeat
- AND droplet power_status = 'active' per DO API
- THEN state := ZOMBIE
- Time to detection: 180 seconds

**Degraded Detection:**
- IF cpu > 80% for 5 consecutive heartbeats
- OR memory > 85% for 5 heartbeats
- OR disk > 90% for 3 heartbeats
- THEN state := ACTIVE_DEGRADED

**Recovery Detection:**
- IF state = ACTIVE_DEGRADED
- AND cpu < 70% AND memory < 75% AND disk < 85% for 3 heartbeats
- THEN state := ACTIVE_HEALTHY

### 54.4 Zombie Recovery Flow

1. Watchdog detects 3 missed heartbeats
2. Query DO API to confirm droplet is powered on
3. Update state to ZOMBIE
4. Queue hard reboot job to BullMQ
5. Execute DO API power_cycle
6. Update state to REBOOTING
7. Monitor for heartbeat return
8. If no heartbeat after 5 minutes → state = ORPHAN → manual review

---

## PHASE 55: HIBERNATION & WAKE PHYSICS

> **Phase Type:** V30 Cost Optimization  
> **Dependencies:** Phase 54  
> **Risk Level:** MEDIUM (Resource Management)

### 55.1 Hibernation Eligibility

| Criterion | Threshold |
|-----------|-----------|
| No active campaigns | 7 days |
| No workflow executions | 7 days |
| No Dashboard logins | 14 days |
| Account status | ACTIVE (not suspended) |
| Manual hold | NOT SET |

### 55.2 Hibernation Process

| Step | Action |
|------|--------|
| 1 | Send notification: "Your instance will hibernate in 24 hours" |
| 2 | If 24h passes without activity: Collect final metrics |
| 3 | Sidecar stops n8n container gracefully |
| 4 | DO API: power_off droplet |
| 5 | Update state to HIBERNATING |

**Cost Impact:**
- Running droplet: $4.00/month
- Powered-off droplet: ~$0.50/month (storage only)
- Savings per hibernated tenant: $3.50/month (87.5%)
- At 30% hibernation rate (4,500 of 15,000): $15,750/month savings

### 55.3 Instant Wake Protocol

**Wake Triggers:**

| Trigger | Expected Wake Time |
|---------|-------------------|
| User clicks "Start Campaign" | <60 seconds |
| Scheduled campaign starts | <60 seconds |
| User logs into Dashboard | <90 seconds |
| Manual API call | <60 seconds |

**Wake Sequence:**

| Time | Action |
|------|--------|
| T+0s | Wake trigger received |
| T+5s | DO API: power_on |
| T+15s | Droplet boots |
| T+25s | Containers start (images cached) |
| T+35s | Sidecar health check passes |
| T+40s | Heartbeat sent, state = ACTIVE_HEALTHY |
| T+45s | **WAKE COMPLETE** |

### 55.4 Pre-Warming Protocol for High-Priority Tenants

For tenants requiring <5 second response times:

**Strategy 1: Never Hibernate (Enterprise)**
- Enterprise tenants NEVER hibernate
- Always warm, 0-second wake time
- Full $4/month cost

**Strategy 2: Predictive Pre-Warming (High-Priority)**
- Analyze scheduled campaigns and login patterns
- Pre-warm 5 minutes before predicted activity
- Auto-hibernate after 2 hours of inactivity

**Strategy 3: Hot Standby Pool (Ultra-Low Latency)**
- Maintain pool of 30 warm "blank" droplets across regions
- On wake: Claim warm droplet, inject credentials, deploy workflows
- Background: Power on hibernated droplet, swap back when ready
- Wake time: <5 seconds
- Pool cost: ~$120/month

**Pre-Warming Decision Matrix:**

| Tier | Hibernation | Strategy | Wake Time |
|------|-------------|----------|-----------|
| Enterprise | No | Always warm | 0s |
| High-Priority (scheduled) | Yes | Predictive | <5s |
| High-Priority (no schedule) | Yes | Hot standby | <5s |
| Standard | Yes | Standard wake | <60s |

---

## PHASE 56: FLEET-WIDE TEMPLATE RECONCILIATION

> **Phase Type:** V30 Fleet Operations  
> **Dependencies:** Phase 52, Phase 53  
> **Risk Level:** HIGH (Mass Update)

### 56.1 Update Scenarios

| Scenario | Risk | Strategy |
|----------|------|----------|
| Critical security patch | CRITICAL | Immediate push, accept failures |
| Bug fix | HIGH | Batched with pause on failures |
| New feature | MEDIUM | Canary rollout, gradual expansion |
| Config change | LOW | Batched, no pause |

### 56.2 Blue-Green Container Update

| Step | Action |
|------|--------|
| 1 | Sidecar receives UPDATE command |
| 2 | Pull new image in background (n8n still serving) |
| 3 | Wait for "Quiet Period" (pending_executions = 0) |
| 4 | Stop old container, start new container (~5s downtime) |
| 5 | Health check new container |
| 6 | If healthy: Remove old container, report success |
| 7 | If unhealthy: Rollback to old container, report failure |

### 56.3 Batched Rollout Configuration

| Setting | Value |
|---------|-------|
| batch_size | 100 droplets |
| pause_between_batches | 30 seconds |
| failure_threshold | 5% (pause for investigation) |
| max_failures_before_abort | 10% (cancel rollout) |

**Example Execution:**
- Batch 1 (1-100): 98 success, 2 failures (2%) → Continue
- Batch 2 (101-200): 95 success, 5 failures (5%) → PAUSE
- Human review required to continue or abort

---

# ═══════════════════════════════════════════════════════════════════════════
#                        PART V: FINANCIAL & BILLING
# ═══════════════════════════════════════════════════════════════════════════

---

## PHASE 57: MANAGED VS. BYO SERVICE MATRIX

> **Phase Type:** V30 Financial Architecture  
> **Dependencies:** Phase 60  
> **Risk Level:** HIGH (Financial Sustainability)

### 57.1 Service Categories

| Category | Definition | Cost Bearer | User Experience |
|----------|------------|-------------|-----------------|
| **Managed (Proxy)** | Genesis operates OAuth app | Genesis | Zero friction |
| **Managed (Wholesale)** | Genesis provides API key | Genesis | Low friction |
| **BYO (Key)** | User provides API key | User | Medium friction |
| **BYO (Setup)** | User configures externally | User | High friction |

### 57.2 Complete Service Matrix

| Service | Category | User Action | Billing Model |
|---------|----------|-------------|---------------|
| Gmail (OAuth) | Managed (Proxy) | Click "Connect" | Included |
| Google Sheets | Managed (Proxy) | Click "Connect" | Included |
| OpenAI | BYO (Key) | Paste API key | User pays direct |
| Claude/Anthropic | BYO (Key) | Paste API key | User pays direct |
| Relevance AI | BYO (Key) | Paste API key | User pays direct |
| Google CSE | Managed (Wholesale) | Automatic | $0.005/search |
| Apify | Managed (Wholesale) | Automatic | $0.02/scrape |
| DigitalOcean | Managed (Wholesale) | Automatic | $4.50/month flat |
| Residential Proxies | Managed (Wholesale) | Automatic | $0.001/request |
| Email Verification | Managed (Wholesale) | Automatic | $0.003/email |
| DNS (Entri) | Managed (Proxy) | Click "Setup DNS" | Included |
| Tracking Domains | Managed (Proxy) | Automatic | Included |

### 57.3 Why This Matrix Protects Genesis

**Managed (Wholesale)** = High-volume, predictable-cost APIs with bulk pricing
**BYO (Key)** = High-cost, unpredictable-usage APIs (AI models)

---

## PHASE 58: FINANCIAL KILL-SWITCH & GENESIS WALLET

> **Phase Type:** V30 Financial Controls  
> **Dependencies:** Phase 57  
> **Risk Level:** CRITICAL (Financial Safety)

### 58.1 The Genesis Wallet

Every tenant has a prepaid balance for Managed (Wholesale) services.

**Wallet Properties:**

| Field | Description |
|-------|-------------|
| balance_cents | Current balance |
| lifetime_deposits | Total ever added |
| lifetime_usage | Total ever consumed |
| auto_topup_enabled | Automatic recharge |
| auto_topup_threshold | Trigger threshold |
| auto_topup_amount | Recharge amount |

**Transaction Types:**

| Type | Direction | Example |
|------|-----------|---------|
| DEPOSIT | Credit | User adds $50 |
| AUTO_TOPUP | Credit | Automatic recharge |
| APIFY_SCRAPE | Debit | 1 scrape ($0.02) |
| CSE_SEARCH | Debit | 1 search ($0.005) |
| PROXY_REQUEST | Debit | 1 request ($0.001) |
| EMAIL_VERIFY | Debit | 1 verify ($0.003) |
| REFUND | Credit | Failed operation |

### 58.2 Kill-Switch Flow

**Before every managed service call:**

1. Identify cost of upcoming operation
2. Query wallet balance (Redis-cached for performance)
3. If balance >= cost: Approve, deduct, continue
4. If balance < cost: **HALT WORKFLOW**, alert user, log event

**Low Balance Alerts:**

| Threshold | Action |
|-----------|--------|
| $5.00 | Email: "Wallet running low" |
| $1.00 | Email + Dashboard banner |
| $0.00 | Kill-Switch active, all managed services blocked |

### 58.3 Redis Caching for Scale

**Problem:** 15,000 tenants × multiple workflows × frequent checks = massive DB load

**Solution:**
- Cache wallet balances in Redis
- Key: `wallet:{workspace_id}`
- TTL: 60 seconds
- Atomic DECRBY for deductions
- Batch sync to Supabase every 10 seconds

---

## PHASE 59: COST MODEL & RATE LIMIT ORCHESTRATION

> **Phase Type:** V30 Financial Optimization  
> **Dependencies:** Phase 57, Phase 58  
> **Risk Level:** MEDIUM (Sustainability)

### 59.1 Per-Tenant Margin Analysis

**Example: Tenant "Acme Corp" - January 2026**

**Revenue:**
| Source | Amount |
|--------|--------|
| Subscription | $99.00 |
| Wallet (Apify - 770 scrapes) | $15.40 |
| Wallet (CSE - 900 searches) | $4.50 |
| Wallet (Proxies - 2100 requests) | $2.10 |
| **Total Revenue** | **$121.00** |

**Costs:**
| Component | Amount |
|-----------|--------|
| Droplet | $4.00 |
| Bandwidth | $0.80 |
| Snapshots | $0.62 |
| Apify wholesale | $11.55 |
| CSE wholesale | $3.60 |
| Proxy wholesale | $1.47 |
| Overhead | $0.05 |
| **Total Costs** | **$22.09** |

**Margin:** $98.91 (81.7%)

### 59.2 Rate Limit Registry

| Service | Global Limit | Per-Tenant | Enforcement |
|---------|--------------|------------|-------------|
| OpenAI | 10,000 RPM | Dynamic | Token bucket |
| Gmail | 250/day/account | N/A | Per-tenant OAuth |
| Google CSE | 10,000/day | 100/day default | Hard cap |
| Apify | 1,000 concurrent | 10/tenant | Queue-based |
| Proxies | 100 concurrent | 5/tenant | Connection pool |

---

# ═══════════════════════════════════════════════════════════════════════════
#                        PART VI: ONBOARDING & UX
# ═══════════════════════════════════════════════════════════════════════════

---

## PHASE 60: GENESIS GATEWAY UNIFIED ONBOARDING

> **Phase Type:** V30 User Experience  
> **Dependencies:** Phase 57  
> **Risk Level:** MEDIUM (User Adoption)

### 60.1 Onboarding Flow Stages

| Stage | User Action | Duration |
|-------|-------------|----------|
| 1. Account | Sign up | 30 seconds |
| 2. Brand | Enter company name, website | 1 minute |
| 3. Email | Click "Connect Gmail" | 2 minutes |
| 4. AI Keys | Paste OpenAI/Relevance keys | 1 minute |
| 5. DNS | Click "Setup DNS" (Entri) | 3 minutes |
| 6. Booking | Enter Calendly link | 30 seconds |
| 7. Ignition | Click "Start Engine" | 60 seconds |
| **Total** | | **~10 minutes** |

### 60.2 OAuth Proxy Architecture

For Managed (Proxy) services like Gmail:

1. User clicks "Connect Gmail"
2. Redirect to Google with Genesis OAuth client_id
3. User consents on Google
4. Redirect back with authorization code
5. Dashboard exchanges code for tokens
6. Tokens encrypted and stored in Vault
7. During Ignition: Sidecar receives tokens, creates n8n credential

**Security Notes:**
- Genesis NEVER sees email content (scope is mail.send only)
- Tokens encrypted at rest (AES-256-GCM)
- Tokens decrypted only on tenant's Sidecar
- Refresh tokens rotated automatically

---

## PHASE 61: FRICTION-REDUCTION PROTOCOLS

> **Phase Type:** V30 User Experience  
> **Dependencies:** Phase 60  
> **Risk Level:** LOW (Enhancement)

### 61.1 Auto-Scrape Brand Onboarding

User provides website URL, system auto-fills:

| Extracted Field | Method |
|-----------------|--------|
| Company Name | Title tag, og:site_name |
| Logo | Favicon, og:image |
| Industry | AI classification |
| Tone | AI writing analysis |
| Products/Services | H2/H3 from /products page |

### 61.2 One-Click DNS (Entri Integration)

| Step | Action |
|------|--------|
| 1 | User clicks "Setup DNS Records" |
| 2 | Entri popup: Select DNS provider |
| 3 | User logs into provider |
| 4 | Entri injects SPF/DKIM/DMARC automatically |
| 5 | Dashboard shows: "DNS Configured" |

### 61.3 Booking Link Validation

Before campaign ignition:
1. Validate URL format (known booking providers)
2. HTTP HEAD request (expect 200)
3. Check page content for "booking" keywords
4. Warn user if issues detected

### 61.4 Automated Tracking Domains

1. User adds CNAME: `track.clientdomain.com` → droplet IP
2. Dashboard detects new CNAME via DNS lookup
3. Sidecar updates Caddy config
4. Caddy auto-provisions SSL via Let's Encrypt
5. Tracking links use custom domain

---

# ═══════════════════════════════════════════════════════════════════════════
#                        PART VII: COMPLIANCE & SECURITY
# ═══════════════════════════════════════════════════════════════════════════

---

## PHASE 62: DATA RESIDENCY & GDPR PROTOCOL

> **Phase Type:** V30 Compliance  
> **Dependencies:** Phase 50, Phase 40  
> **Risk Level:** HIGH (Regulatory)

### 62.1 Available Regions

| Code | Location | Supabase | DigitalOcean |
|------|----------|----------|--------------|
| us-east | Virginia | us-east-1 | nyc1/nyc3 |
| us-west | San Francisco | us-west-1 | sfo1/sfo3 |
| eu-west | Frankfurt | eu-central-1 | fra1 |
| eu-north | London | eu-west-2 | lon1 |
| apac | Singapore | ap-southeast-1 | sgp1 |

### 62.2 Region Selection During Onboarding

User selects: "Where should your data be stored?"
- Droplet created in selected DO region
- Partition created in matching Supabase region
- Credentials stored in region-specific Vault

**GDPR Compliance:**
- Personal data never leaves selected region
- Data processing in-region (Droplet co-located)
- Sub-processors documented (DO, Supabase)
- Data deletion available on request

---

## PHASE 63: AUDIT LOGGING & SUPPORT ACCESS

> **Phase Type:** V30 Compliance  
> **Dependencies:** Phase 51  
> **Risk Level:** MEDIUM (Compliance)

### 63.1 Logged Events

| Category | Events |
|----------|--------|
| Provisioning | IGNITION_STARTED, COMPLETED, FAILED, ROLLBACK |
| Credentials | CREATED, ACCESSED, ROTATED, DELETED |
| Workflows | DEPLOYED, UPDATED, ACTIVATED, DEACTIVATED |
| Droplet | CREATED, REBOOTED, HIBERNATED, WOKEN, TERMINATED |
| Security | LOGIN_SUCCESS, LOGIN_FAILED, PERMISSION_DENIED |
| Support | ACCESS_GRANTED, ACCESS_REVOKED, ACTION_TAKEN |
| Billing | WALLET_DEPOSIT, WALLET_DEBIT, KILL_SWITCH |
| Data | EXPORTED, DELETED, PARTITION_CREATED |

### 63.2 Audit Log Retention

| Region | Retention | Rationale |
|--------|-----------|-----------|
| US | 7 years | SOC2 compliance |
| EU | 7 years | GDPR (can delete on request) |
| All | Min 90 days | Operational debugging |

### 63.3 Support Access Tiers

| Tier | Access Level | Duration | Approval |
|------|--------------|----------|----------|
| Read-Only | View logs, metrics, config | 30 min | Self-service |
| Debug | + restart containers | 60 min | Self-service |
| Write | Full Sidecar commands | 30 min | Manager |
| Emergency | Direct SSH | 15 min | VP + incident |

---

## PHASE 64: TENANT LIFECYCLE MANAGEMENT

> **Phase Type:** V30 Operations  
> **Dependencies:** Phase 50, Phase 40, Phase 62  
> **Risk Level:** HIGH (Data Safety)

### 64.1 Deletion Triggers

| Trigger | Grace Period | Reversible |
|---------|--------------|------------|
| User requests | 7 days | Yes (during grace) |
| Subscription cancelled | 30 days | Yes (during grace) |
| Non-payment (90 days) | 7 days | Yes (if paid) |
| TOS violation | Immediate | No |
| Fraud | Immediate | No |

### 64.2 Deletion Sequence

**Day 0: Initiated**
1. Status → PENDING_DELETION
2. Email: "Account will be deleted in 7 days"
3. Offer data export link
4. Hibernate droplet
5. Disable all workflows

**Days 1-6: Grace Period**
- User can cancel deletion
- User can download data export
- No new campaigns allowed
- Reminder emails on Day 3 and 6

**Day 7: Hard Deletion**
1. Generate final data export (stored 30 days)
2. DELETE DigitalOcean Droplet + snapshots
3. DROP TABLE partition
4. DELETE credentials from Vault
5. DELETE webhook registry
6. DELETE wallet balance (keep transaction history)
7. ANONYMIZE audit logs (replace user_id)
8. Status → TERMINATED

### 64.3 Data Export (GDPR Portability)

**Export Contents:**

| Category | Format |
|----------|--------|
| Leads | CSV |
| Campaigns | JSON |
| Email Events | CSV |
| Analytics | JSON |
| Brand Vault | JSON |
| Settings | JSON |
| Audit Log | JSON |

**Large Dataset Handling:**
- <100k leads: Single ZIP
- 100k-500k leads: Multiple CSVs in ZIP
- >500k leads: Streamed multi-part download

---

# ═══════════════════════════════════════════════════════════════════════════
#                        PART VIII: PLATFORM OPERATIONS
# ═══════════════════════════════════════════════════════════════════════════

---

## PHASE 44: "GOD MODE" COMMAND & CONTROL

> **Phase Type:** V30 Platform Operations  
> **Dependencies:** Phase 54, Phase 55, Phase 56  
> **Risk Level:** MEDIUM (Observability)

### 44.1 God Mode Dashboard Components

| Component | Data Source | Purpose |
|-----------|-------------|---------|
| Fleet Overview | Heartbeat State Machine | Real-time droplet status |
| Health Heatmap | Aggregated heartbeats | Visual grid of health |
| Watchdog Alerts | Watchdog Service | Active drift detections |
| Financial Dashboard | Genesis Wallet | Kill-switch triggers |
| Template Rollout | BullMQ + Phase 56 | Fleet update progress |
| Regional Status | Phase 62 data | Per-region health |
| Metric Aggregator | Sidecar reports | Cross-tenant analytics |

### 44.2 Metric Aggregator

Every 15 minutes, each Sidecar reports anonymized metrics:

| Metric | Purpose |
|--------|---------|
| total_executions | Platform load |
| success_rate | Quality monitoring |
| avg_duration_ms | Performance trending |
| email_sent_count | Capacity planning |
| error_types | Common issue detection |

**Privacy Guarantee:** NO lead data, NO email content, NO recipient info - ONLY aggregate counts.

---

## PHASE 65: CREDENTIAL ROTATION & WEBHOOK SECURITY

> **Phase Type:** V30 Security Operations  
> **Dependencies:** Phase 51, Phase 53  
> **Risk Level:** MEDIUM (Security)

### 65.1 Rotation Schedule

| Credential | Trigger | Method |
|------------|---------|--------|
| Gmail OAuth | 14 days before expiry | Auto refresh token exchange |
| Sheets OAuth | 14 days before expiry | Auto refresh token exchange |
| OpenAI Key | User-initiated | Dashboard prompts, Sidecar updates |
| Webhook Secrets | 90 days (policy) | Auto regeneration |
| Sidecar Token | 30 days | Auto on heartbeat |

### 65.2 Batch Rotation Flow

1. Daily cron identifies expiring credentials
2. Queue jobs to BullMQ (50 concurrent - OAuth rate limits)
3. Sidecar calls OAuth refresh endpoint
4. New tokens encrypted, POSTed to Dashboard
5. Dashboard updates Vault
6. Audit log: CREDENTIAL_ROTATED

### 65.3 Webhook Signature Verification

| Header | Content |
|--------|---------|
| X-Genesis-Signature | HMAC-SHA256 signature |
| X-Genesis-Timestamp | Unix timestamp |
| X-Genesis-Request-Id | Unique ID (idempotency) |

**Verification Rules:**
- Signature mismatch → Reject 401
- Timestamp > 5 min old → Reject (replay)
- Request ID seen before → Reject (duplicate)

### 65.4 Dead Letter Queue

Failed webhook deliveries captured for retry:

| Attempt | Delay | Action if Failed |
|---------|-------|------------------|
| 1 | Immediate | Retry 1s |
| 2 | 1s | Retry 5s |
| 3 | 5s | Retry 30s |
| 4 | 30s | Retry 5min |
| 5 | 5min | Move to DLQ |

---

# ═══════════════════════════════════════════════════════════════════════════
#                        PART IX: MIGRATION & DEPLOYMENT
# ═══════════════════════════════════════════════════════════════════════════

---

## PHASE 46: SHADOW MIGRATION & PARITY TESTING

> **Phase Type:** Data Migration  
> **Dependencies:** Phase 40  
> **Risk Level:** HIGH (Data Integrity)

### 46.1 Dual-Write Strategy

During migration, writes go to BOTH legacy table AND new partition:

1. Write to legacy `leads_ohio`
2. Transform data to genesis schema
3. Write to `genesis.leads_p_{workspace}`
4. Compare results, log discrepancies

### 46.2 Parity Verification

| Check | Method |
|-------|--------|
| Row count | SELECT COUNT(*) from both |
| Checksum | Hash comparison of key columns |
| Sample spot check | Random 1000 rows deep compare |
| Edge cases | NULL handling, Unicode, timestamps |

---

## PHASE 47: HYPER-SCALE STRESS TEST & RED-TEAMING

> **Phase Type:** Testing Framework  
> **Dependencies:** Phase 45  
> **Risk Level:** CRITICAL (Production Readiness)

### 47.1 Load Testing Targets

| Metric | Target | Tool |
|--------|--------|------|
| Concurrent partitions | 15,000 | K6 |
| Queries per second | 10,000 | K6 |
| Partition creation rate | 100/minute | K6 |
| Webhook throughput | 5,000/second | K6 |

### 47.2 Chaos Engineering Scenarios

| Scenario | Purpose |
|----------|---------|
| Kill random Sidecar | Test zombie detection |
| Partition database | Test query routing |
| Saturate Redis | Test BullMQ backpressure |
| DO API 503 | Test retry logic |
| Credential vault down | Test graceful degradation |

### 47.3 Security Penetration Tests

| Test | Target |
|------|--------|
| Cross-tenant access | RLS bypass attempts |
| JWT manipulation | Signature forgery |
| Privilege escalation | Support access abuse |
| SQL injection | Partition name injection |
| IDOR | Workspace ID enumeration |

---

## PHASE 48: PRODUCTION CUTOVER & REVERT PROTOCOL

> **Phase Type:** Production Operations  
> **Dependencies:** Phase 46, Phase 47  
> **Risk Level:** CRITICAL (Business Continuity)

### 48.1 Blue-Green Deployment

| Step | Action |
|------|--------|
| 1 | Deploy new version to Green environment |
| 2 | Run automated tests on Green |
| 3 | Shift 10% traffic to Green (canary) |
| 4 | Monitor for 15 minutes |
| 5 | If healthy: Shift 50% → 100% |
| 6 | If unhealthy: Revert to Blue |

### 48.2 Instant Revert Protocol

**Revert Trigger Conditions:**
- Error rate > 1%
- P95 latency > 500ms
- Any CRITICAL alert
- Manual operator decision

**Revert Time:** <60 seconds

### 48.3 Feature Flags

| Flag | Purpose |
|------|---------|
| genesis_enabled | Enable/disable entire Genesis system |
| sovereign_droplet | Use V30 vs V20 path |
| bullmq_orchestration | BullMQ vs direct API |
| kill_switch_enabled | Financial controls active |
| pre_warming_enabled | Hot standby pool active |

---

## PHASE 66: DISASTER RECOVERY & REGIONAL FAILOVER

> **Phase Type:** V30 Business Continuity  
> **Dependencies:** Phase 50, Phase 62  
> **Risk Level:** CRITICAL (Business Continuity)

### 66.1 Failure Mode Catalog

| Failure | Impact | RTO | RPO |
|---------|--------|-----|-----|
| Single droplet | 1 tenant | 5 min | 0 |
| Sidecar death | Workflows pause | 2 min | 0 |
| n8n crash | Workflows pause | 2 min | 0 |
| Region degraded | 20-30% tenants | 1 hour | 1 hour |
| Region total failure | 20-30% offline | 4 hours | 1 hour |

### 66.2 Snapshot Schedule

| Type | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| Daily | 24 hours | 7 days | Same region |
| Weekly | 7 days | 30 days | Same region |
| Cross-region | 24 hours | 7 days | Backup region |
| Pre-update | Before updates | 48 hours | Same region |

### 66.3 Cross-Region Mapping

| Primary | Backup |
|---------|--------|
| nyc1 (US-East) | sfo1 (US-West) |
| sfo1 (US-West) | nyc1 (US-East) |
| fra1 (EU-West) | lon1 (UK) |
| lon1 (UK) | fra1 (EU-West) |
| sgp1 (APAC) | sfo1 (US-West) |

### 66.4 Mass Restoration Protocol

**Scenario:** Frankfurt (fra1) down, 3,000 tenants affected

**Phase 1: Assessment (0-15 min)**
- Confirm outage via DO status
- Query affected tenants
- Verify backup snapshots exist
- Send mass notification

**Phase 2: Provisioning (15 min - 2 hours)**
- Batch create droplets from backups (100 concurrent)
- Update DNS/networking
- Wait for Sidecar handshakes

**Phase 3: Verification (2-4 hours)**
- Monitor heartbeats
- Run workflow tests
- Check credentials
- Send "Service restored" notification

**Phase 4: Cleanup (After original region recovers)**
- Option A: Keep tenants in new region
- Option B: Migrate back to original region

**Total RTO:** ~4 hours for 3,000 tenants
**RPO:** 24 hours (last daily snapshot)

### 66.5 Snapshot Garbage Collection

**Trigger Conditions:**

| Condition | Action |
|-----------|--------|
| Failed snapshot | Delete after retry |
| Orphaned transfer | Delete after 24h |
| Workspace deleted | Grace 7 days, then delete |
| Retention expired | Delete per schedule |
| Post-failover | Day 7 delete daily, Day 30 final cleanup |

**Cost Impact:**
- Without GC: 105,000 snapshots = $26,250/month
- With GC: 15,000 snapshots = $3,750/month
- Savings: $22,500/month (85%)

---

# ═══════════════════════════════════════════════════════════════════════════
#                        V30 TRANSFORMATION SUMMARY
# ═══════════════════════════════════════════════════════════════════════════

## Core Strategic Pivots

| Decision | V20 (Rejected) | V30 (Adopted) |
|----------|----------------|---------------|
| n8n Hosting | Shared Cloud | Sovereign Droplet |
| Fleet Control | API polling | BullMQ + Sidecar |
| Credentials | Dashboard injection | Sidecar-local |
| Webhook Discovery | Polling | Atomic Handshake |
| Cost Model | Opaque | $4/droplet + metered |
| Onboarding | 10+ dashboards | Genesis Gateway |
| Data Residency | Single region | Per-tenant selection |

## Critical Success Metrics

| Metric | Target |
|--------|--------|
| Provisioning time | <60 seconds |
| Wake time (standard) | <45 seconds |
| Wake time (high-priority) | <5 seconds |
| Zombie detection | <180 seconds |
| Fleet update (15k) | <30 minutes |
| Cross-region failover | <4 hours |
| RLS overhead | <1ms |
| Webhook success | >99% |
| Zero cross-tenant leakage | Mandatory |

## Document Information

- **Version:** 30.0 (Sovereign Singularity) - Executive Edition
- **Last Updated:** 2026-01-25
- **Author:** L10 Distinguished Principal Systems Architect
- **Status:** Production Ready
- **For Implementation Details:** See GENESIS_WAR_PLAN_V30.md

---

**END OF GENESIS ENGINE: SOVEREIGN SINGULARITY EXECUTIVE ARCHITECTURE V30.0**
