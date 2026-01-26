# 🏛️ GENESIS SINGULARITY V30 - MASTER ARCHITECTURE VISUALIZATION

> **Document Type**: Architecture Visualization  
> **Version**: V30 (Sovereign Singularity)  
> **Purpose**: Complete visual representation of the Genesis platform architecture  
> **Target**: 100M+ leads, 15,000+ isolated tenant partitions  

---

## 📋 DOCUMENT STRUCTURE

| Section | Content | Format |
|---------|---------|--------|
| **PART I** | Architecture Evolution (Before → After) | Mermaid.js |
| **PART II** | V30 Complete System Architecture | Mermaid.js |
| **PART III** | Component Deep Dives | Mermaid.js |
| **PART IV** | ASCII Diagrams | ASCII Art |

---

# ═══════════════════════════════════════════════════════════════════════════════
# PART I: ARCHITECTURE EVOLUTION
# ═══════════════════════════════════════════════════════════════════════════════

## 1.1 LEGACY ARCHITECTURE (Pre-Phase 40)

This is the original "Ohio" architecture - a single-tenant system with shared infrastructure.

```mermaid
graph TB
    subgraph CLIENT["CLIENT LAYER"]
        subgraph Desktop["Desktop UI"]
            HEADER[Header<br/>Nav + Search + Notifications]
            DASH[Dashboard<br/>Widgets + Charts]
            CONTACTS[Contacts<br/>TanStack Table]
            SEQ[Sequences<br/>Dispatch Monitor]
            SETTINGS[Settings<br/>General + Security]
        end

        subgraph Mobile["Mobile UI"]
            MHEADER[Mobile Header<br/>Logo + Menu]
            MDRAWER[Slide Drawer<br/>Workspace + Theme]
            BNAV[Bottom Nav<br/>5-Tab Bar]
            FAB[Floating Action<br/>Quick Create]
        end

        subgraph Admin["Super Admin"]
            ADMIN[Admin Panel<br/>Cross-Workspace]
            AUDIT[Audit Log<br/>Activity Timeline]
            GOV[Governance<br/>Freeze Controls]
        end
    end

    subgraph STATE["STATE MANAGEMENT"]
        SWR[SWR Cache<br/>10s Dedup]
        DCTX[Dashboard Context<br/>Filters + Dates]
        WCTX[Workspace Context<br/>Active Workspace]
        PERMS[Permissions Hook<br/>Role-Based UI]
    end

    subgraph SECURITY["SECURITY LAYER"]
        CLERK[Clerk Auth<br/>SSO + JWT]
        MW[Middleware<br/>Route Protection]
        RBAC[RBAC Engine<br/>4 Roles]
        GUARD[API Guard<br/>Workspace Validation]
        RATE[Rate Limiter<br/>Request Throttle]
        SANITIZE[Sanitizer<br/>Response Cleaning]
        ENCRYPT[Encryption<br/>AES-256-GCM]
    end

    subgraph API["API LAYER - 40+ Routes"]
        subgraph CoreAPI["Core"]
            API_DASH[Dashboard Aggregate]
            API_METRICS[Metrics API<br/>summary, timeseries]
            API_SEARCH[Search API]
        end

        subgraph DataAPI["Data"]
            API_CAMPAIGNS[Campaigns API]
            API_CONTACTS[Contacts API]
            API_SEQ[Sequences API]
            API_NOTIF[Notifications API]
        end

        subgraph AdminAPI["Admin"]
            API_ADMIN[Admin API<br/>audit, freeze, users]
            API_WS[Workspaces API<br/>CRUD, invites, access]
            API_SETTINGS[Workspace Settings]
        end

        subgraph IntegrationAPI["Integration"]
            API_EVENTS[Events Webhook<br/>Receiver]
            API_TRACK[Tracking API<br/>open, click]
            API_ASK[Ask AI<br/>Chat]
            API_WEBHOOKS[Webhooks<br/>clerk, n8n]
        end
    end

    subgraph DATA["DATA LAYER - Supabase"]
        subgraph Tables["Core Tables"]
            LEADS[(leads_ohio<br/>Master Leads)]
            EVENTS[(email_events<br/>Timeline)]
            LLM[(llm_usage<br/>Cost Ledger)]
        end

        subgraph Multi["Multi-Tenant"]
            WS[(workspaces)]
            UW[(user_workspaces<br/>RBAC Mapping)]
            NOTIF_T[(notifications)]
        end

        subgraph Perf["Performance"]
            MV1[mv_daily_stats<br/>Pre-aggregated]
            MV2[mv_llm_cost<br/>Pre-aggregated]
            WQ[webhook_queue<br/>Async Buffer]
        end

        subgraph Sec["Security"]
            KEYS[(workspace_keys<br/>Encrypted)]
            AUDIT_T[(audit_log)]
            RLS{RLS Policies<br/>Row Isolation}
        end
    end

    subgraph EXTERNAL["EXTERNAL INTEGRATIONS"]
        subgraph N8N["n8n Workflows"]
            N8N_PREP[Email Prep]
            N8N_SEQ[Sequences 1-3]
            N8N_REPLY[Reply Tracker]
            N8N_CLICK[Click Tracker]
        end

        subgraph LLM_EXT["LLM Providers"]
            OPENAI[OpenAI]
            ANTHROPIC[Anthropic]
        end

        subgraph Track["Email Tracking"]
            PIXEL[Open Pixel]
            REDIRECT[Click Redirect]
        end
    end

    %% Client to State
    Desktop --> SWR
    Mobile --> SWR
    Admin --> SWR
    SWR --> DCTX
    DCTX --> WCTX
    WCTX --> PERMS

    %% Security Flow
    CLIENT --> MW
    MW --> CLERK
    CLERK --> RBAC
    API --> GUARD
    GUARD --> RATE
    RATE --> SANITIZE

    %% API to Data
    CoreAPI --> MV1
    CoreAPI --> MV2
    DataAPI --> LEADS
    DataAPI --> EVENTS
    AdminAPI --> AUDIT_T
    AdminAPI --> WS
    IntegrationAPI --> WQ

    %% Data Processing
    WQ --> EVENTS
    EVENTS --> MV1
    LLM --> MV2
    RLS --> Tables
    RLS --> Multi

    %% External Integrations
    N8N --> API_EVENTS
    N8N --> API_TRACK
    API_ASK --> LLM_EXT
    Track --> API_TRACK
    ENCRYPT --> KEYS
```

### Legacy Architecture Limitations

| Problem | Impact | V30 Solution |
|---------|--------|--------------|
| **Single n8n Instance** | All tenants share one n8n | Dedicated droplet per tenant |
| **Shared Database** | Noisy neighbor, scaling limits | Partitioned data + isolated n8n DB |
| **No Hibernation** | Paying for idle resources | Snapshot-based hibernation |
| **Manual Provisioning** | Can't scale beyond 50 clients | Automated Cloud-Init ignition |
| **Credential Mixing** | All API keys in one place | Encrypted vault per workspace |

---

## 1.2 V30 GENESIS SINGULARITY ARCHITECTURE (The Evolution)

The V30 architecture introduces **Sovereign Isolation** - each tenant gets their own dedicated droplet with isolated n8n, database, and credentials.

```mermaid
graph TB
    subgraph GENESIS["GENESIS CONTROL PLANE - Vercel"]
        subgraph Dashboard["Dashboard - Next.js 14"]
            UI[Client UI]
            ADMIN_UI[Admin Console]
            ONBOARD[Onboarding Wizard]
        end

        subgraph API_LAYER["API Layer - 60+ Routes"]
            API_CORE[Core APIs]
            API_FLEET[Fleet APIs]
            API_WALLET[Wallet APIs]
            API_WEBHOOK[Webhook Receiver]
        end

        subgraph ORCHESTRATION["Orchestration Engine"]
            IGNITION[Ignition Orchestrator]
            BULLMQ[BullMQ Event Bus]
            WATCHDOG[Fleet Watchdog]
            HIBERNATE[Hibernation Controller]
        end
    end

    subgraph CENTRAL_DB["CENTRAL DATABASE - Supabase"]
        subgraph Control["Control Tables"]
            WS_T[(workspaces)]
            FLEET_T[(fleet_status)]
            LEDGER_T[(wallet_ledger)]
        end

        subgraph Vault["Credential Vault"]
            CREDS[(credentials)]
            DO_POOL[(do_accounts)]
            TEMPLATES[(workflow_templates)]
        end

        subgraph Analytics["Analytics - Partitioned"]
            EVENTS_P[(email_events)]
            LEADS_P[(leads)]
            MV_P[Materialized Views]
        end
    end

    subgraph DO_POOL_LAYER["DIGITALOCEAN ACCOUNT POOL"]
        DO1[DO Account 1 - US-East]
        DO2[DO Account 2 - US-West]
        DO3[DO Account 3 - EU-Frankfurt]
        DON[DO Account N - Scalable]
    end

    subgraph TENANT_FLEET["TENANT DROPLET FLEET - 15000+"]
        subgraph Droplet1["Tenant A Droplet - $6/mo"]
            N8N_1[n8n Container]
            PG_1[Postgres]
            CADDY_1[Caddy]
            SIDECAR_1[Sidecar Agent]
        end

        subgraph Droplet2["Tenant B Droplet - $6/mo"]
            N8N_2[n8n Container]
            PG_2[Postgres]
            CADDY_2[Caddy]
            SIDECAR_2[Sidecar Agent]
        end

        subgraph DropletN["Tenant N Droplet"]
            N8N_N[n8n Container]
            PG_N[Postgres]
            CADDY_N[Caddy]
            SIDECAR_N[Sidecar Agent]
        end

        subgraph Hibernated["Hibernated - Snapshots"]
            SNAP1[Tenant X Snapshot]
            SNAP2[Tenant Y Snapshot]
            SNAPN[...]
        end
    end

    subgraph EXTERNAL_V30["EXTERNAL SERVICES"]
        subgraph Managed["Genesis Managed - Pooled"]
            APIFY[Apify]
            PROXY[Residential Proxy]
            CSE[Google CSE]
        end

        subgraph BYO["Bring Your Own"]
            GMAIL[Gmail OAuth]
            OPENAI_T[OpenAI]
            CLAUDE_T[Claude]
            CALENDLY[Calendly]
        end

        subgraph DNS["DNS Services"]
            ENTRI[Entri]
            SSLIP[sslip.io]
            CUSTOM[Custom Domains]
        end
    end

    UI --> API_CORE
    ADMIN_UI --> API_FLEET
    ONBOARD --> API_WALLET
    API_WEBHOOK --> BULLMQ
    
    IGNITION --> DO_POOL_LAYER
    BULLMQ --> TENANT_FLEET
    WATCHDOG --> FLEET_T
    HIBERNATE --> Hibernated

    API_CORE --> Analytics
    API_FLEET --> Control
    API_WALLET --> LEDGER_T
    IGNITION --> DO_POOL
    IGNITION --> TEMPLATES

    DO1 --> Droplet1
    DO2 --> Droplet2
    DON --> DropletN

    SIDECAR_1 --> BULLMQ
    BULLMQ --> SIDECAR_1
    SIDECAR_2 --> BULLMQ
    BULLMQ --> SIDECAR_2
    SIDECAR_N --> BULLMQ
    BULLMQ --> SIDECAR_N
    SIDECAR_1 --> API_WEBHOOK
    SIDECAR_2 --> API_WEBHOOK

    Managed --> API_WALLET
    N8N_1 --> BYO
    N8N_2 --> BYO
    CADDY_1 --> DNS
    CADDY_2 --> DNS

    CREDS --> SIDECAR_1
    CREDS --> SIDECAR_2
    CREDS --> SIDECAR_N
```

---

## 1.3 SIDE-BY-SIDE COMPARISON

```mermaid
graph LR
    subgraph LEGACY["LEGACY - Pre-V30"]
        L_N8N[Single n8n - Shared]
        L_DB[(Single Database)]
        L_CREDS[Shared Credentials]
        L_COST[$200+/mo Fixed]
    end

    subgraph V30["V30 SINGULARITY"]
        V_N8N[Dedicated n8n - Per Tenant]
        V_DB[(Isolated Postgres)]
        V_CREDS[Encrypted Vault]
        V_COST[$6/mo Per Tenant]
    end

    L_N8N -->|Evolution| V_N8N
    L_DB -->|Evolution| V_DB
    L_CREDS -->|Evolution| V_CREDS
    L_COST -->|Evolution| V_COST
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# PART II: V30 COMPLETE SYSTEM ARCHITECTURE
# ═══════════════════════════════════════════════════════════════════════════════

## 2.1 THE PINNACLE ARCHITECTURE (Full System)

This is the **complete, final architecture** combining all V30 components with the existing dashboard.

```mermaid
graph TB
    subgraph CLIENTS["CLIENT TIER"]
        subgraph WebApp["Web Application"]
            DESKTOP[Desktop UI]
            MOBILE[Mobile UI]
            PWA[PWA Mode]
        end
        
        subgraph AdminPortal["Admin Portal"]
            SUPER_ADMIN[Super Admin]
            WORKSPACE_ADMIN[Workspace Admin]
            FLEET_MONITOR[Fleet Monitor]
        end
        
        subgraph Onboarding["Onboarding Flow"]
            SIGNUP[Sign Up]
            OAUTH_FLOW[OAuth Flow]
            KEY_INPUT[API Key Input]
            DROPLET_CONFIG[Droplet Config]
        end
    end

    subgraph STATE_TIER["STATE TIER"]
        subgraph ClientState["Client State"]
            SWR_CACHE[SWR Cache]
            DASHBOARD_CTX[Dashboard Context]
            WORKSPACE_CTX[Workspace Context]
            PERMS_HOOK[Permissions Hook]
        end
        
        subgraph ServerCache["Server Cache"]
            REDIS[Redis]
            WALLET_CACHE[Wallet Cache]
            RATE_CACHE[Rate Limit Cache]
        end
    end

    subgraph SECURITY_TIER["SECURITY TIER"]
        subgraph AuthN["Authentication"]
            CLERK_AUTH[Clerk Auth]
            JWT_VERIFY[JWT Verification]
            SESSION_MGR[Session Manager]
        end
        
        subgraph AuthZ["Authorization"]
            RBAC_ENGINE[RBAC Engine]
            WORKSPACE_GUARD[Workspace Guard]
            FEATURE_FLAGS[Feature Flags]
        end
        
        subgraph Protection["Protection"]
            RATE_LIMITER[Rate Limiter]
            INPUT_SANITIZE[Input Sanitizer]
            RESPONSE_CLEAN[Response Cleaner]
            ENCRYPTION[AES-256-GCM]
        end
        
        subgraph ZeroTrust["Zero-Trust Sidecar"]
            SIGNED_JWT[Signed JWT Headers]
            PROVISIONING_TOKEN[Provisioning Token]
            HEARTBEAT_AUTH[Heartbeat Auth]
        end
    end

    subgraph API_TIER["API TIER - 70+ Routes"]
        subgraph CoreAPIs["Core APIs"]
            API_DASHBOARD[api/dashboard]
            API_METRICS[api/metrics]
            API_SEARCH[api/search]
            API_ANALYTICS[api/analytics]
        end
        
        subgraph DataAPIs["Data APIs"]
            API_CAMPAIGNS[api/campaigns]
            API_CONTACTS[api/contacts]
            API_SEQUENCES[api/sequences]
            API_NOTIFICATIONS[api/notifications]
        end
        
        subgraph FleetAPIs["Fleet APIs - V30"]
            API_IGNITION[api/fleet/ignition]
            API_COMMANDS[api/fleet/commands]
            API_STATUS[api/fleet/status]
            API_HIBERNATE[api/fleet/hibernate]
        end
        
        subgraph WalletAPIs["Wallet APIs - V30"]
            API_BALANCE[api/wallet/balance]
            API_TOPUP[api/wallet/topup]
            API_LEDGER[api/wallet/ledger]
            API_PREFLIGHT[api/wallet/preflight]
        end
        
        subgraph WebhookAPIs["Webhook APIs"]
            API_EVENTS[api/events]
            API_TRACKING[api/track]
            API_CLERK_WH[api/webhooks/clerk]
            API_SIDECAR_WH[api/webhooks/sidecar]
        end
        
        subgraph AdminAPIs["Admin APIs"]
            API_ADMIN[api/admin]
            API_WORKSPACES[api/workspaces]
            API_AUDIT[api/audit]
            API_GOVERNANCE[api/governance]
        end
    end

    subgraph ORCHESTRATION_TIER["ORCHESTRATION TIER - V30"]
        subgraph Provisioning["Provisioning Engine"]
            IGNITION_ORCH[Ignition Orchestrator]
            CLOUD_INIT[Cloud-Init Generator]
            ACCOUNT_SELECTOR[Account Selector]
            ROLLBACK_ENGINE[Rollback Engine]
        end
        
        subgraph CommandControl["Command and Control"]
            BULLMQ_BUS[BullMQ Event Bus]
            COMMAND_ROUTER[Command Router]
            CONCURRENCY_GOV[Concurrency Governor]
        end
        
        subgraph FleetManagement["Fleet Management"]
            WATCHDOG[Fleet Watchdog]
            HIBERNATE_CTRL[Hibernation Controller]
            UPDATE_MANAGER[Update Manager]
            PRE_WARMER[Pre-Warmer]
        end
    end

    subgraph DATABASE_TIER["DATABASE TIER - Supabase"]
        subgraph ControlPlane["Control Plane Tables"]
            TB_WORKSPACES[(workspaces)]
            TB_USERS[(user_workspaces)]
            TB_FLEET[(fleet_status)]
            TB_DO_ACCOUNTS[(do_accounts)]
        end
        
        subgraph DataPlane["Data Plane Tables"]
            TB_LEADS[(leads)]
            TB_EVENTS[(email_events)]
            TB_LLM[(llm_usage)]
            TB_NOTIFICATIONS[(notifications)]
        end
        
        subgraph FinancialPlane["Financial Tables - V30"]
            TB_WALLET[(wallet_balance)]
            TB_LEDGER[(wallet_ledger)]
            TB_SUBSCRIPTIONS[(subscriptions)]
        end
        
        subgraph SecurityPlane["Security Tables"]
            TB_CREDENTIALS[(credentials)]
            TB_AUDIT[(audit_log)]
            TB_TEMPLATES[(workflow_templates)]
        end
        
        subgraph Performance["Performance Layer"]
            MV_DAILY[mv_daily_stats]
            MV_LLM[mv_llm_cost]
            MV_FUNNEL[mv_funnel_metrics]
            IDX_WORKSPACE[workspace_id Indexes]
        end
        
        subgraph Security["Security Layer"]
            RLS_POLICIES{RLS Policies}
            PG_CRYPTO[pgcrypto]
            TRIGGERS[Audit Triggers]
        end
    end

    subgraph DO_TIER["DIGITALOCEAN TIER"]
        subgraph AccountPool["Account Pool - 15+ Accounts"]
            DO_ACC_1[Account 1 - US-East]
            DO_ACC_2[Account 2 - US-West]
            DO_ACC_3[Account 3 - EU-Frankfurt]
            DO_ACC_4[Account 4 - SG-Singapore]
            DO_ACC_N[Account N - Scalable]
        end
        
        subgraph Regions["Regional Distribution"]
            REGION_NYC[NYC - US East]
            REGION_SFO[SFO - US West]
            REGION_FRA[FRA - EU Germany]
            REGION_SGP[SGP - Asia Pacific]
            REGION_LON[LON - UK/GDPR]
        end
    end

    subgraph FLEET_TIER["TENANT FLEET - 15000+ Droplets"]
        subgraph ActiveDroplets["Active Droplets"]
            subgraph Droplet_A["Tenant A - $6/mo"]
                D_A_N8N[n8n Container]
                D_A_PG[Postgres 16]
                D_A_CADDY[Caddy 2]
                D_A_SIDECAR[Sidecar Agent]
            end
            
            subgraph Droplet_B["Tenant B - $6/mo"]
                D_B_N8N[n8n Container]
                D_B_PG[Postgres 16]
                D_B_CADDY[Caddy 2]
                D_B_SIDECAR[Sidecar Agent]
            end
            
            subgraph Droplet_N["Tenant N - $6-48/mo"]
                D_N_N8N[n8n Container]
                D_N_PG[Postgres 16]
                D_N_CADDY[Caddy 2]
                D_N_SIDECAR[Sidecar Agent]
            end
        end
        
        subgraph HibernatedDroplets["Hibernated Snapshots"]
            SNAPSHOT_X[Tenant X Snapshot]
            SNAPSHOT_Y[Tenant Y Snapshot]
            SNAPSHOT_Z[Tenant Z Snapshot]
        end
        
        subgraph PreWarmed["Pre-Warmed Pool - VIP"]
            HOT_SPARE_1[Hot Spare 1]
            HOT_SPARE_2[Hot Spare 2]
        end
    end

    subgraph EXTERNAL_TIER["EXTERNAL TIER"]
        subgraph ManagedServices["Genesis Managed - Pooled"]
            EXT_APIFY[Apify]
            EXT_PROXY[Residential Proxy]
            EXT_CSE[Google CSE]
            EXT_RELEVANCE[Relevance AI]
        end
        
        subgraph BYOServices["Bring Your Own"]
            EXT_GMAIL[Gmail OAuth]
            EXT_OPENAI[OpenAI]
            EXT_CLAUDE[Claude]
            EXT_CALENDLY[Calendly OAuth]
        end
        
        subgraph DNSServices["DNS and SSL"]
            EXT_ENTRI[Entri]
            EXT_SSLIP[sslip.io]
            EXT_LETSENCRYPT[Lets Encrypt]
        end
        
        subgraph Payments["Payment Processing"]
            EXT_STRIPE[Stripe]
        end
    end

    CLIENTS --> STATE_TIER
    SWR_CACHE --> DASHBOARD_CTX
    DASHBOARD_CTX --> WORKSPACE_CTX
    WORKSPACE_CTX --> PERMS_HOOK
    
    STATE_TIER --> SECURITY_TIER
    CLERK_AUTH --> JWT_VERIFY
    JWT_VERIFY --> RBAC_ENGINE
    RBAC_ENGINE --> WORKSPACE_GUARD
    
    SECURITY_TIER --> API_TIER
    WORKSPACE_GUARD --> CoreAPIs
    WORKSPACE_GUARD --> DataAPIs
    WORKSPACE_GUARD --> FleetAPIs
    WORKSPACE_GUARD --> WalletAPIs
    
    FleetAPIs --> ORCHESTRATION_TIER
    IGNITION_ORCH --> ACCOUNT_SELECTOR
    ACCOUNT_SELECTOR --> DO_TIER
    BULLMQ_BUS --> COMMAND_ROUTER
    
    CoreAPIs --> Performance
    DataAPIs --> DataPlane
    FleetAPIs --> ControlPlane
    WalletAPIs --> FinancialPlane
    AdminAPIs --> SecurityPlane
    
    IGNITION_ORCH --> ActiveDroplets
    HIBERNATE_CTRL --> HibernatedDroplets
    PRE_WARMER --> PreWarmed
    BULLMQ_BUS --> D_A_SIDECAR
    BULLMQ_BUS --> D_B_SIDECAR
    BULLMQ_BUS --> D_N_SIDECAR
    
    AccountPool --> ActiveDroplets
    Regions --> ActiveDroplets
    
    D_A_SIDECAR --> WebhookAPIs
    D_B_SIDECAR --> WebhookAPIs
    D_N_SIDECAR --> WebhookAPIs
    
    D_A_N8N --> ManagedServices
    D_A_N8N --> BYOServices
    D_B_N8N --> ManagedServices
    D_B_N8N --> BYOServices
    
    D_A_CADDY --> DNSServices
    D_B_CADDY --> DNSServices
    D_N_CADDY --> DNSServices
    
    TB_CREDENTIALS --> D_A_SIDECAR
    TB_CREDENTIALS --> D_B_SIDECAR
    TB_CREDENTIALS --> D_N_SIDECAR
    
    Payments --> FinancialPlane
    
    RLS_POLICIES --> DataPlane
    RLS_POLICIES --> ControlPlane
    PG_CRYPTO --> TB_CREDENTIALS
    PG_CRYPTO --> TB_DO_ACCOUNTS
```

---

## 2.2 DATA FLOW ARCHITECTURE

This diagram shows how data flows through the entire system.

```mermaid
flowchart TB
    subgraph INPUT["DATA INGESTION"]
        USER_ACTION[User Action]
        N8N_EVENT[n8n Event]
        WEBHOOK_EXT[External Webhook]
    end

    subgraph PROCESSING["PROCESSING LAYER"]
        subgraph Validation["Validation"]
            AUTH_CHECK{Auth Check}
            RBAC_CHECK{RBAC Check}
            WORKSPACE_CHECK{Workspace Check}
        end
        
        subgraph Business["Business Logic"]
            RATE_LIMIT[Rate Limiter]
            WALLET_CHECK[Wallet Preflight]
            IDEMPOTENCY[Idempotency]
        end
    end

    subgraph ROUTING["ROUTING LAYER"]
        API_ROUTER{API Router}
        BULLMQ_ROUTER{BullMQ Router}
    end

    subgraph STORAGE["STORAGE LAYER"]
        subgraph WriteOps["Write Operations"]
            EVENT_WRITE[Event Write]
            LEDGER_WRITE[Ledger Write]
            AUDIT_WRITE[Audit Write]
        end
        
        subgraph ReadOps["Read Operations"]
            MV_READ[Materialized View]
            CACHE_READ[Redis Cache]
        end
    end

    subgraph DISPATCH["DISPATCH LAYER"]
        SIDECAR_CMD[Sidecar Command]
        WEBHOOK_OUT[Webhook Out]
        UI_UPDATE[UI Update]
    end

    %% Flow
    USER_ACTION --> AUTH_CHECK
    N8N_EVENT --> WORKSPACE_CHECK
    WEBHOOK_EXT --> AUTH_CHECK
    
    AUTH_CHECK -->|Pass| RBAC_CHECK
    AUTH_CHECK -->|Fail| REJECT[403 Forbidden]
    
    RBAC_CHECK -->|Pass| WORKSPACE_CHECK
    RBAC_CHECK -->|Fail| REJECT
    
    WORKSPACE_CHECK -->|Pass| RATE_LIMIT
    WORKSPACE_CHECK -->|Fail| REJECT
    
    RATE_LIMIT -->|Pass| WALLET_CHECK
    RATE_LIMIT -->|Exceeded| THROTTLE[429 Too Many]
    
    WALLET_CHECK -->|Sufficient| IDEMPOTENCY
    WALLET_CHECK -->|Insufficient| HALT[402 Payment Required]
    
    IDEMPOTENCY -->|New| API_ROUTER
    IDEMPOTENCY -->|Duplicate| DEDUPE[Return Cached]
    
    API_ROUTER -->|Data Op| WriteOps
    API_ROUTER -->|Query Op| ReadOps
    API_ROUTER -->|Fleet Op| BULLMQ_ROUTER
    
    WriteOps --> MV_READ
    WriteOps --> AUDIT_WRITE
    
    BULLMQ_ROUTER --> SIDECAR_CMD
    
    ReadOps --> UI_UPDATE
    SIDECAR_CMD --> WEBHOOK_OUT

    style INPUT fill:#1a1a2e,stroke:#00d4ff
    style PROCESSING fill:#2d1b1b,stroke:#ff6b6b
    style ROUTING fill:#1b2d1b,stroke:#4ecdc4
    style STORAGE fill:#1b1b2d,stroke:#6c5ce7
    style DISPATCH fill:#2d2d1b,stroke:#ffd93d
```

---

## 2.3 DROPLET LIFECYCLE FLOW

```mermaid
stateDiagram-v2
    [*] --> PENDING: User clicks "Launch Droplet"
    
    PENDING --> PROVISIONING: Ignition Orchestrator triggered
    PROVISIONING --> BOOTING: DO API returns droplet_id
    BOOTING --> INITIALIZING: Cloud-Init executes
    INITIALIZING --> HANDSHAKE: Sidecar POSTs webhook URL
    HANDSHAKE --> CONFIGURING: Dashboard injects credentials
    CONFIGURING --> DEPLOYING: Workflows deployed to n8n
    DEPLOYING --> ACTIVE_HEALTHY: All health checks pass
    
    ACTIVE_HEALTHY --> ACTIVE_DEGRADED: Heartbeat missed (5min)
    ACTIVE_DEGRADED --> ACTIVE_HEALTHY: Heartbeat restored
    ACTIVE_DEGRADED --> ACTIVE_CRITICAL: 3+ heartbeats missed
    ACTIVE_CRITICAL --> REBOOTING: Watchdog triggers reboot
    REBOOTING --> ACTIVE_HEALTHY: Reboot successful
    REBOOTING --> FAILED: Reboot failed
    
    ACTIVE_HEALTHY --> HIBERNATING: 72h inactivity detected
    HIBERNATING --> HIBERNATED: Snapshot complete, droplet destroyed
    HIBERNATED --> WAKING: User activity detected
    WAKING --> BOOTING: New droplet from snapshot
    
    FAILED --> [*]: Rollback + Alert sent
    
    note right of PROVISIONING
        DO Account selected
        from pool based on
        region + capacity
    end note
    
    note right of HIBERNATED
        Cost: $0.02/GB/mo
        (vs $6/mo active)
    end note
    
    note right of HANDSHAKE
        Atomic Handshake:
        Zero-Trust verification
    end note
```

---

## 2.4 CREDENTIAL INJECTION FLOW

```mermaid
sequenceDiagram
    participant User
    participant Dashboard
    participant Vault
    participant BullMQ
    participant Sidecar
    participant n8n

    User->>Dashboard: 1. Submit API Keys
    Dashboard->>Vault: 2. Encrypt with pgcrypto
    Vault-->>Dashboard: 3. Stored securely
    
    Note over Dashboard,Sidecar: Droplet Provisioning Starts
    
    Dashboard->>BullMQ: 4. Queue INJECT_CREDENTIALS
    BullMQ->>Sidecar: 5. Deliver command with JWT
    Sidecar->>Dashboard: 6. Request credential bundle
    Dashboard->>Vault: 7. Decrypt credentials
    Vault-->>Dashboard: 8. Return plaintext
    Dashboard-->>Sidecar: 9. Send encrypted bundle
    Sidecar->>n8n: 10. Create credentials via API
    n8n-->>Sidecar: 11. Credential UUIDs returned
    Sidecar->>Dashboard: 12. Report UUID mapping
    Dashboard->>Vault: 13. Store UUID mapping
    
    Note over User,n8n: Credentials never touch disk unencrypted
```

---

## 2.5 DUAL-MODE DNS FLOW

```mermaid
sequenceDiagram
    participant Cloud as CloudInit
    participant Caddy
    participant sslip as sslip.io
    participant User
    participant Entri
    participant DNS
    participant LE as LetsEncrypt

    Note over Cloud,Caddy: Phase 1 Bootstrap T+0s to T+60s
    
    Cloud->>Cloud: Detect IP 159.223.45.67
    Cloud->>Caddy: Configure sslip.io domain
    Caddy->>sslip: Request SSL for IP domain
    sslip-->>Caddy: SSL Certificate automatic
    
    Note over Cloud,Caddy: Droplet accessible immediately
    
    Note over User,LE: Phase 2 Production T+5min+
    
    User->>Entri: Click Setup Tracking Domain
    Entri->>DNS: Add CNAME track.acme.com
    DNS-->>Entri: CNAME propagated
    Entri-->>User: DNS setup complete
    
    User->>Caddy: Dashboard sends ADD_TRACKING_DOMAIN
    Caddy->>LE: Request SSL for track.acme.com
    LE-->>Caddy: SSL Certificate valid 90 days
    Caddy->>Caddy: Reload config zero downtime
    
    Note over Cloud,LE: Both domains now active
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# PART III: COMPONENT DEEP DIVES
# ═══════════════════════════════════════════════════════════════════════════════

## 3.1 MULTI-ACCOUNT DIGITALOCEAN POOL

```mermaid
graph TB
    subgraph DASHBOARD["Dashboard Ignition Request"]
        REQ[Provision Request]
    end

    subgraph SELECTOR["Account Selector Algorithm"]
        QUERY[Query do_accounts by region]
        SORT[Sort by current_droplets ASC]
        SELECT[Select Top Account]
    end

    subgraph POOL["DigitalOcean Account Pool"]
        subgraph Active["Active Accounts"]
            ACC1[Account 1 us-east 45/50]
            ACC2[Account 2 us-east 30/50]
            ACC3[Account 3 eu-frankfurt 20/50]
        end
        
        subgraph Standby["Standby Full"]
            ACC_FULL[Account X 50/50 STANDBY]
        end
    end

    subgraph CREATE["Droplet Creation"]
        DECRYPT[Decrypt API Token]
        API_CALL[DO API dropletsCreate]
        INCREMENT[Increment Counter]
        TAG[Apply Tags]
    end

    subgraph RESULT["Result"]
        SUCCESS[Return droplet_id]
        FAILOVER[Failover to Next Account]
    end

    REQ --> QUERY
    QUERY --> SORT
    SORT --> SELECT
    SELECT --> ACC2
    
    ACC2 --> DECRYPT
    DECRYPT --> API_CALL
    API_CALL -->|Success| INCREMENT
    INCREMENT --> TAG
    TAG --> SUCCESS
    
    API_CALL -->|Failure| FAILOVER
    FAILOVER --> ACC1
```

---

## 3.2 BULLMQ EVENT BUS ARCHITECTURE

```mermaid
graph LR
    subgraph PRODUCERS["Command Producers"]
        FLEET_API[Fleet API]
        WATCHDOG[Watchdog]
        SCHEDULER[Scheduler]
    end

    subgraph REDIS["Redis Cluster"]
        subgraph Queues["Command Queues"]
            Q_DEPLOY[deploy-workflow HIGH]
            Q_CREDS[inject-credentials HIGH]
            Q_UPDATE[update-n8n MEDIUM]
            Q_REBOOT[hard-reboot CRITICAL]
            Q_HIBERNATE[hibernate-droplet LOW]
        end
        
        subgraph State["State Storage"]
            JOBS[Job Status]
            RETRIES[Retry Counter]
        end
    end

    subgraph GOVERNOR["Concurrency Governor"]
        LIMITER[Rate Limiter 50 concurrent]
        BACKOFF[Exponential Backoff]
    end

    subgraph CONSUMERS["Sidecar Consumers 15000+"]
        SIDE_A[Sidecar A]
        SIDE_B[Sidecar B]
        SIDE_N[Sidecar N]
    end

    PRODUCERS --> Queues
    Queues --> GOVERNOR
    GOVERNOR --> CONSUMERS
    JOBS --> CONSUMERS
    CONSUMERS --> JOBS
```

---

## 3.3 WALLET & FINANCIAL KILL-SWITCH

```mermaid
flowchart TB
    subgraph TRIGGER["Workflow Execution Trigger"]
        N8N_START[n8n Workflow Starts]
    end

    subgraph PREFLIGHT["Pre-Flight Check"]
        CALC[Calculate Estimated Cost]
        API_CHECK[Call Dashboard API]
    end

    subgraph DASHBOARD["Dashboard Wallet API"]
        REDIS_CHECK[Check Redis Cache]
        DB_CHECK[Query Supabase]
        DECISION{Balance >= Cost}
    end

    subgraph EXECUTION["Workflow Execution"]
        PROCEED[PROCEED - Execute Apify]
        DEDUCT[Deduct from Wallet]
        LOG[Log to Ledger]
    end

    subgraph HALT["Kill Switch"]
        STOP[HALT - Insufficient Funds]
        ALERT[Send Notification]
        AUDIT[Log Kill Event]
    end

    TRIGGER --> CALC
    CALC --> API_CHECK
    API_CHECK --> REDIS_CHECK
    REDIS_CHECK -->|Hit| DECISION
    REDIS_CHECK -->|Miss| DB_CHECK
    DB_CHECK --> DECISION
    
    DECISION -->|Yes| PROCEED
    DECISION -->|No| STOP
    
    PROCEED --> DEDUCT
    DEDUCT --> LOG
    
    STOP --> ALERT
    ALERT --> AUDIT
```

---

## 3.4 HIBERNATION & WAKE CYCLE

```mermaid
flowchart TB
    subgraph DETECT["Inactivity Detection"]
        MONITOR[Monitor last_activity]
        CHECK{72h Since Last Activity}
    end

    subgraph HIBERNATE["Hibernation Process"]
        NOTIFY[Notify User Warning]
        SNAPSHOT[Create DO Snapshot]
        DESTROY[Destroy Droplet]
        UPDATE_DB[Update fleet_status HIBERNATED]
    end

    subgraph STORAGE["Snapshot Storage"]
        SNAP_STORE[(DO Snapshot 5-10GB)]
        META[Metadata Stored]
    end

    subgraph WAKE["Wake Process"]
        USER_ACTION[User Activity Detected]
        RESTORE[Create Droplet FROM Snapshot]
        BOOT[Cloud-Init Minimal]
        HANDSHAKE[Sidecar Handshake]
        ACTIVE[State ACTIVE_HEALTHY 15s]
    end

    MONITOR --> CHECK
    CHECK -->|No| MONITOR
    CHECK -->|Yes| NOTIFY
    NOTIFY -->|24h Grace| SNAPSHOT
    SNAPSHOT --> SNAP_STORE
    SNAPSHOT --> DESTROY
    DESTROY --> UPDATE_DB
    
    USER_ACTION --> RESTORE
    RESTORE --> SNAP_STORE
    RESTORE --> BOOT
    BOOT --> HANDSHAKE
    HANDSHAKE --> ACTIVE
```

---

## 3.5 GOLDEN TEMPLATE & DYNAMIC UUID MAPPER

```mermaid
flowchart LR
    subgraph TEMPLATE["Golden Template Master"]
        TEMPLATE_WF[Workflow JSON with Placeholders]
        TEMPLATE_CREDS[Credential References]
    end

    subgraph DEPLOY["Deployment Process"]
        FETCH[Fetch Template]
        PARSE[Parse JSON Find Placeholders]
        LOOKUP[Lookup Tenant UUIDs]
        REPLACE[String Replace to Actual UUID]
        PUSH[Push to n8n API]
    end

    subgraph TENANT["Tenant n8n Instance"]
        N8N_CREDS[(Credentials)]
        N8N_WF[(Workflows With Real UUIDs)]
    end

    subgraph MAPPING["UUID Mapping Table"]
        MAP_TABLE[(credential_mapping)]
    end

    TEMPLATE --> FETCH
    FETCH --> PARSE
    PARSE --> LOOKUP
    LOOKUP --> MAP_TABLE
    MAP_TABLE --> REPLACE
    REPLACE --> PUSH
    PUSH --> N8N_WF
    N8N_CREDS --> MAP_TABLE
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# PART IV: ASCII DIAGRAMS
# ═══════════════════════════════════════════════════════════════════════════════

## 4.1 SYSTEM LAYER OVERVIEW

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                           GENESIS SINGULARITY V30                                ║
║                        COMPLETE SYSTEM ARCHITECTURE                              ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                  ║
║  ┌────────────────────────────────────────────────────────────────────────────┐  ║
║  │                         LAYER 1: CLIENT TIER                               │  ║
║  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  ║
║  │  │   Desktop    │  │    Mobile    │  │  Admin       │  │  Onboarding  │   │  ║
║  │  │   Dashboard  │  │    PWA       │  │  Console     │  │  Wizard      │   │  ║
║  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │  ║
║  └────────────────────────────────────────────────────────────────────────────┘  ║
║                                      │                                           ║
║                                      ▼                                           ║
║  ┌────────────────────────────────────────────────────────────────────────────┐  ║
║  │                         LAYER 2: STATE TIER                                │  ║
║  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  ║
║  │  │  SWR Cache   │  │  Dashboard   │  │  Workspace   │  │  Permissions │   │  ║
║  │  │  (10s TTL)   │  │  Context     │  │  Context     │  │  Hook        │   │  ║
║  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │  ║
║  └────────────────────────────────────────────────────────────────────────────┘  ║
║                                      │                                           ║
║                                      ▼                                           ║
║  ┌────────────────────────────────────────────────────────────────────────────┐  ║
║  │                       LAYER 3: SECURITY TIER                               │  ║
║  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐ │  ║
║  │  │   Clerk    │ │    RBAC    │ │   Rate     │ │  Sanitize  │ │ AES-256  │ │  ║
║  │  │   Auth     │ │   Engine   │ │  Limiter   │ │  + Clean   │ │   GCM    │ │  ║
║  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └──────────┘ │  ║
║  └────────────────────────────────────────────────────────────────────────────┘  ║
║                                      │                                           ║
║                                      ▼                                           ║
║  ┌────────────────────────────────────────────────────────────────────────────┐  ║
║  │                         LAYER 4: API TIER                                  │  ║
║  │                          (70+ Routes)                                      │  ║
║  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │  ║
║  │  │  Core    │ │  Data    │ │  Fleet   │ │  Wallet  │ │  Admin   │        │  ║
║  │  │  APIs    │ │  APIs    │ │  APIs    │ │  APIs    │ │  APIs    │        │  ║
║  │  │ (metrics)│ │(contacts)│ │(ignition)│ │(balance) │ │ (audit)  │        │  ║
║  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │  ║
║  └────────────────────────────────────────────────────────────────────────────┘  ║
║                                      │                                           ║
║              ┌───────────────────────┴───────────────────────┐                   ║
║              ▼                                               ▼                   ║
║  ┌──────────────────────────────┐            ┌──────────────────────────────┐   ║
║  │   LAYER 5: ORCHESTRATION     │            │   LAYER 6: DATABASE          │   ║
║  │   (V30 NEW)                  │            │   (Supabase)                  │   ║
║  │  ┌────────────┐              │            │  ┌──────────────────────────┐ │   ║
║  │  │ Ignition   │              │            │  │  Control Plane Tables    │ │   ║
║  │  │ Orchestr.  │              │            │  │  • workspaces            │ │   ║
║  │  └────────────┘              │            │  │  • fleet_status          │ │   ║
║  │  ┌────────────┐              │            │  │  • do_accounts           │ │   ║
║  │  │  BullMQ    │              │            │  └──────────────────────────┘ │   ║
║  │  │ Event Bus  │              │            │  ┌──────────────────────────┐ │   ║
║  │  └────────────┘              │            │  │  Data Plane Tables       │ │   ║
║  │  ┌────────────┐              │            │  │  • leads (partitioned)   │ │   ║
║  │  │  Watchdog  │              │            │  │  • email_events          │ │   ║
║  │  │ + Hibernate│              │            │  │  • llm_usage             │ │   ║
║  │  └────────────┘              │            │  └──────────────────────────┘ │   ║
║  └──────────────────────────────┘            │  ┌──────────────────────────┐ │   ║
║              │                               │  │  Security Tables         │ │   ║
║              │                               │  │  • credentials (vault)   │ │   ║
║              │                               │  │  • audit_log             │ │   ║
║              │                               │  │  • RLS Policies          │ │   ║
║              │                               │  └──────────────────────────┘ │   ║
║              │                               └──────────────────────────────────┘   ║
║              │                                                                   ║
║              ▼                                                                   ║
║  ┌────────────────────────────────────────────────────────────────────────────┐  ║
║  │                    LAYER 7: DIGITALOCEAN INFRASTRUCTURE                    │  ║
║  │  ┌──────────────────────────────────────────────────────────────────────┐  │  ║
║  │  │                    ACCOUNT POOL (15+ Accounts)                       │  │  ║
║  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │  │  ║
║  │  │  │ Account1 │ │ Account2 │ │ Account3 │ │ Account4 │ │ AccountN │   │  │  ║
║  │  │  │ US-East  │ │ US-West  │ │ EU-Frank │ │ SG-Asia  │ │ Scalable │   │  │  ║
║  │  │  │ 50 slots │ │ 50 slots │ │ 50 slots │ │ 50 slots │ │ 50 slots │   │  │  ║
║  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │  │  ║
║  │  └──────────────────────────────────────────────────────────────────────┘  │  ║
║  └────────────────────────────────────────────────────────────────────────────┘  ║
║                                      │                                           ║
║                                      ▼                                           ║
║  ┌────────────────────────────────────────────────────────────────────────────┐  ║
║  │                    LAYER 8: TENANT DROPLET FLEET                           │  ║
║  │                         (15,000+ Droplets)                                 │  ║
║  │                                                                            │  ║
║  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │  ║
║  │  │  ACTIVE ($6/mo) │  │  ACTIVE ($6/mo) │  │  ACTIVE ($6/mo) │ ...        │  ║
║  │  │  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │            │  ║
║  │  │  │   n8n     │  │  │  │   n8n     │  │  │  │   n8n     │  │            │  ║
║  │  │  ├───────────┤  │  │  ├───────────┤  │  │  ├───────────┤  │            │  ║
║  │  │  │ Postgres  │  │  │  │ Postgres  │  │  │  │ Postgres  │  │            │  ║
║  │  │  ├───────────┤  │  │  ├───────────┤  │  │  ├───────────┤  │            │  ║
║  │  │  │  Caddy    │  │  │  │  Caddy    │  │  │  │  Caddy    │  │            │  ║
║  │  │  ├───────────┤  │  │  ├───────────┤  │  │  ├───────────┤  │            │  ║
║  │  │  │ Sidecar   │  │  │  │ Sidecar   │  │  │  │ Sidecar   │  │            │  ║
║  │  │  └───────────┘  │  │  └───────────┘  │  │  └───────────┘  │            │  ║
║  │  └─────────────────┘  └─────────────────┘  └─────────────────┘            │  ║
║  │                                                                            │  ║
║  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │  ║
║  │  │ HIBERNATED      │  │ HIBERNATED      │  │ HIBERNATED      │ ...        │  ║
║  │  │ ($0.02/GB/mo)   │  │ ($0.02/GB/mo)   │  │ ($0.02/GB/mo)   │            │  ║
║  │  │ [Snapshot Only] │  │ [Snapshot Only] │  │ [Snapshot Only] │            │  ║
║  │  └─────────────────┘  └─────────────────┘  └─────────────────┘            │  ║
║  └────────────────────────────────────────────────────────────────────────────┘  ║
║                                      │                                           ║
║                                      ▼                                           ║
║  ┌────────────────────────────────────────────────────────────────────────────┐  ║
║  │                       LAYER 9: EXTERNAL SERVICES                           │  ║
║  │  ┌─────────────────────────┐     ┌─────────────────────────┐              │  ║
║  │  │   GENESIS MANAGED       │     │   BRING YOUR OWN        │              │  ║
║  │  │   (Pooled/Resold)       │     │   (Per-Tenant Keys)     │              │  ║
║  │  │  • Apify (Scraping)     │     │  • Gmail (OAuth)        │              │  ║
║  │  │  • Google CSE           │     │  • OpenAI (API Key)     │              │  ║
║  │  │  • Residential Proxy    │     │  • Claude (API Key)     │              │  ║
║  │  │  • Relevance AI         │     │  • Calendly (OAuth)     │              │  ║
║  │  └─────────────────────────┘     └─────────────────────────┘              │  ║
║  └────────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                  ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

---

## 4.2 DROPLET INTERNAL ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                        TENANT DROPLET ($6/month)                                 │
│                        Ubuntu 22.04 LTS | 1 vCPU | 1GB RAM | 25GB SSD           │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────────────────────── HOST OS ─────────────────────────────┐   │
│   │                                                                         │   │
│   │   ┌─────────────────────────── DOCKER ENGINE ────────────────────────┐  │   │
│   │   │                                                                   │  │   │
│   │   │   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐      │  │   │
│   │   │   │    CADDY      │   │     n8n       │   │  POSTGRES 16  │      │  │   │
│   │   │   │   (Alpine)    │   │   (Node.js)   │   │   (Database)  │      │  │   │
│   │   │   ├───────────────┤   ├───────────────┤   ├───────────────┤      │  │   │
│   │   │   │ Port 80, 443  │   │   Port 5678   │   │   Port 5432   │      │  │   │
│   │   │   │ (External)    │   │  (Internal)   │   │  (Internal)   │      │  │   │
│   │   │   ├───────────────┤   ├───────────────┤   ├───────────────┤      │  │   │
│   │   │   │ SSL Termn.    │   │ Workflows     │   │ n8n Data      │      │  │   │
│   │   │   │ Reverse Proxy │   │ Credentials   │   │ Executions    │      │  │   │
│   │   │   │ Let's Encrypt │   │ Webhooks      │   │ Settings      │      │  │   │
│   │   │   │ sslip.io      │   │               │   │               │      │  │   │
│   │   │   │               │   │ RAM: ~400MB   │   │ RAM: ~150MB   │      │  │   │
│   │   │   │ RAM: ~20MB    │   │               │   │               │      │  │   │
│   │   │   └───────────────┘   └───────────────┘   └───────────────┘      │  │   │
│   │   │                              │                    │              │  │   │
│   │   │                              │ DB Connection      │              │  │   │
│   │   │                              └────────────────────┘              │  │   │
│   │   │                                                                   │  │   │
│   │   │   ┌───────────────────────────────────────────────────────────┐  │  │   │
│   │   │   │                      SIDECAR AGENT                        │  │  │   │
│   │   │   │                    genesis/sidecar:v1.0                   │  │  │   │
│   │   │   ├───────────────────────────────────────────────────────────┤  │  │   │
│   │   │   │                                                           │  │  │   │
│   │   │   │   Functions:                                              │  │  │   │
│   │   │   │   • Atomic Handshake (POST webhook URL to Dashboard)     │  │  │   │
│   │   │   │   • Heartbeat (every 60s to Dashboard)                   │  │  │   │
│   │   │   │   • Credential Injection (via n8n API)                   │  │  │   │
│   │   │   │   • Workflow Deployment (via n8n API)                    │  │  │   │
│   │   │   │   • Command Listener (BullMQ consumer)                   │  │  │   │
│   │   │   │   • Health Monitoring (Docker stats)                     │  │  │   │
│   │   │   │   • Blue-Green Container Swap (Docker socket access)     │  │  │   │
│   │   │   │   • Caddy Config Updates (Add tracking domains)          │  │  │   │
│   │   │   │                                                           │  │  │   │
│   │   │   │   RAM: ~50MB                                              │  │  │   │
│   │   │   │                                                           │  │  │   │
│   │   │   └───────────────────────────────────────────────────────────┘  │  │   │
│   │   │                                                                   │  │   │
│   │   └───────────────────────────────────────────────────────────────────┘  │   │
│   │                                                                         │   │
│   │   ┌─────────────────────────── VOLUMES ──────────────────────────────┐  │   │
│   │   │  • caddy_data     → /data (SSL certs)                           │  │   │
│   │   │  • caddy_config   → /config (Caddy settings)                    │  │   │
│   │   │  • n8n_data       → /home/node/.n8n (Workflows, Creds)         │  │   │
│   │   │  • db_storage     → /var/lib/postgresql/data (Postgres)        │  │   │
│   │   └─────────────────────────────────────────────────────────────────┘  │   │
│   │                                                                         │   │
│   │   ┌─────────────────────────── SWAP FILE ────────────────────────────┐  │   │
│   │   │  /swapfile  →  4GB (Prevents OOM crashes)                       │  │   │
│   │   │  When RAM (1GB) is exhausted, overflow to swap                  │  │   │
│   │   └─────────────────────────────────────────────────────────────────┘  │   │
│   │                                                                         │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   ┌──────────────────────────────── FIREWALL (UFW) ─────────────────────────┐   │
│   │  ALLOW: 22/tcp (SSH), 80/tcp (HTTP), 443/tcp (HTTPS)                   │   │
│   │  DENY:  All other inbound traffic                                       │   │
│   │  Note:  Postgres 5432 NOT exposed (internal Docker network only)       │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│                              NETWORK INTERFACES                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  eth0 (Public): 159.223.45.67                                           │    │
│  │  ├── https://159.223.45.67.sslip.io (Bootstrap SSL)                    │    │
│  │  └── https://track.clientdomain.com (Production SSL)                   │    │
│  │                                                                         │    │
│  │  docker0 (Internal): 172.17.0.0/16                                     │    │
│  │  ├── caddy    → 172.17.0.2                                             │    │
│  │  ├── n8n      → 172.17.0.3                                             │    │
│  │  ├── postgres → 172.17.0.4                                             │    │
│  │  └── sidecar  → 172.17.0.5                                             │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4.3 DATA FLOW: WEBHOOK EVENT TO DASHBOARD

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                    DATA FLOW: n8n EVENT → DASHBOARD UPDATE                          │
└─────────────────────────────────────────────────────────────────────────────────────┘

                    TENANT DROPLET                        DASHBOARD (Vercel)
                    ──────────────                        ──────────────────

    ┌───────────────────────┐
    │       n8n             │
    │  ┌─────────────────┐  │
    │  │  Email Workflow │  │
    │  │  ┌───────────┐  │  │
    │  │  │ Send Email│──┼──┼────────────────────────────────────────────────────┐
    │  │  └───────────┘  │  │                                                    │
    │  │       │         │  │                                                    │
    │  │       ▼         │  │                                                    │
    │  │  ┌───────────┐  │  │                                                    │
    │  │  │  HTTP     │──┼──┼─────┐                                              │
    │  │  │  Request  │  │  │     │                                              │
    │  │  │  Node     │  │  │     │   POST /api/events                           │
    │  │  └───────────┘  │  │     │   {                                          │
    │  └─────────────────┘  │     │     "type": "email_sent",                    │
    └───────────────────────┘     │     "lead_id": "abc123",                     │
                                  │     "workspace_id": "ws_789",                │
                                  │     "timestamp": "2026-01-24T10:00:00Z"     │
                                  │   }                                          │
                                  │                                              │
                                  ▼                                              │
                    ┌─────────────────────────────────────────────────────────┐  │
                    │                    API LAYER                            │  │
                    │  ┌─────────────────────────────────────────────────┐   │  │
                    │  │  /api/events/route.ts                           │   │  │
                    │  │                                                  │   │  │
                    │  │  1. Verify webhook token (DASH_WEBHOOK_TOKEN)   │◄──┼──┘
                    │  │  2. Validate workspace_id exists                │   │
                    │  │  3. Check idempotency_key (prevent duplicates) │   │
                    │  │  4. Insert into webhook_queue (async buffer)   │   │
                    │  │  5. Return 202 Accepted                        │   │
                    │  │                                                  │   │
                    │  └────────────────────┬────────────────────────────┘   │
                    └───────────────────────┼─────────────────────────────────┘
                                            │
                                            ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │                   DATABASE LAYER                        │
                    │  ┌─────────────────────────────────────────────────┐   │
                    │  │  webhook_queue (Async Processing)               │   │
                    │  │  ┌─────────────────────────────────────────┐   │   │
                    │  │  │ id │ workspace_id │ payload │ processed │   │   │
                    │  │  │ 1  │ ws_789       │ {...}   │ false     │   │   │
                    │  │  └─────────────────────────────────────────┘   │   │
                    │  └────────────────────┬────────────────────────────┘   │
                    │                       │                                 │
                    │                       │ (Background Job)               │
                    │                       ▼                                 │
                    │  ┌─────────────────────────────────────────────────┐   │
                    │  │  email_events (Partitioned by workspace_id)     │   │
                    │  │  ┌─────────────────────────────────────────┐   │   │
                    │  │  │ workspace_id │ lead_id │ event_type │...│   │   │
                    │  │  │ ws_789       │ abc123  │ email_sent │   │   │   │
                    │  │  └─────────────────────────────────────────┘   │   │
                    │  └────────────────────┬────────────────────────────┘   │
                    │                       │                                 │
                    │                       │ (Trigger: REFRESH MV)          │
                    │                       ▼                                 │
                    │  ┌─────────────────────────────────────────────────┐   │
                    │  │  mv_daily_stats (Materialized View)             │   │
                    │  │  Pre-aggregated metrics for fast queries        │   │
                    │  │  ┌─────────────────────────────────────────┐   │   │
                    │  │  │ workspace_id │ date │ sent │ opened │...│   │   │
                    │  │  │ ws_789       │ 1/24 │ 150  │ 45     │   │   │   │
                    │  │  └─────────────────────────────────────────┘   │   │
                    │  └─────────────────────────────────────────────────┘   │
                    └─────────────────────────────────────────────────────────┘
                                            │
                                            │ SWR revalidation
                                            ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │                    CLIENT LAYER                         │
                    │  ┌─────────────────────────────────────────────────┐   │
                    │  │  Dashboard UI                                    │   │
                    │  │                                                  │   │
                    │  │  ┌─────────────────────────────────────────┐   │   │
                    │  │  │  Metric Card: Emails Sent               │   │   │
                    │  │  │  ┌───────────────────────────────────┐ │   │   │
                    │  │  │  │          150 → 151                │ │   │   │
                    │  │  │  │          ↑ Real-time update       │ │   │   │
                    │  │  │  └───────────────────────────────────┘ │   │   │
                    │  │  └─────────────────────────────────────────┘   │   │
                    │  │                                                  │   │
                    │  └─────────────────────────────────────────────────┘   │
                    └─────────────────────────────────────────────────────────┘
```

---

## 4.4 DROPLET PROVISIONING FLOW

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         DROPLET PROVISIONING SEQUENCE                               │
└─────────────────────────────────────────────────────────────────────────────────────┘

USER                    DASHBOARD                         DIGITALOCEAN
────                    ─────────                         ────────────

  │                          │                                  │
  │  1. Click "Launch"       │                                  │
  │ ─────────────────────────►                                  │
  │                          │                                  │
  │                          │  2. Select DO Account            │
  │                          │     (least loaded in region)     │
  │                          │                                  │
  │                          │  3. Decrypt API Token            │
  │                          │     (pgcrypto)                   │
  │                          │                                  │
  │                          │  4. Generate Cloud-Init Script   │
  │                          │     ┌────────────────────────┐   │
  │                          │     │ #!/bin/bash           │   │
  │                          │     │ # Create swap         │   │
  │                          │     │ # Install Docker      │   │
  │                          │     │ # Configure UFW       │   │
  │                          │     │ # Deploy stack        │   │
  │                          │     │ # Start containers    │   │
  │                          │     └────────────────────────┘   │
  │                          │                                  │
  │                          │  5. POST /v2/droplets            │
  │                          │ ─────────────────────────────────►
  │                          │                                  │
  │                          │                  6. Create Droplet
  │                          │                     (s-1vcpu-1gb)
  │                          │                                  │
  │                          │◄─────────────────────────────────│
  │                          │     { droplet_id, networks }    │
  │                          │                                  │
  │                          │  7. Update fleet_status          │
  │                          │     state = PROVISIONING         │
  │                          │     droplet_id = 123456          │
  │                          │                                  │
  │◄─────────────────────────│                                  │
  │   "Provisioning..."      │                                  │
  │                          │                                  │
  │                          │             ┌────────────────────┤
  │                          │             │  DROPLET BOOTS     │
  │                          │             │  Cloud-Init runs   │
  │                          │             │  ~45 seconds       │
  │                          │             └────────────────────┤
  │                          │                                  │
  │                          │                    SIDECAR       │
  │                          │                    ───────       │
  │                          │                         │        │
  │                          │  8. Atomic Handshake    │        │
  │                          │◄────────────────────────┤        │
  │                          │   POST /api/webhooks/sidecar     │
  │                          │   {                              │
  │                          │     workspace_id,                │
  │                          │     webhook_url: "159.x.sslip.io"│
  │                          │     provisioning_token           │
  │                          │   }                              │
  │                          │                                  │
  │                          │  9. Verify Token                 │
  │                          │     Update fleet_status          │
  │                          │     state = CONFIGURING          │
  │                          │                                  │
  │                          │  10. Send Credentials            │
  │                          │ ────────────────────────►        │
  │                          │   (encrypted bundle)    │        │
  │                          │                         │        │
  │                          │                  11. Inject into n8n
  │                          │                     via n8n API  │
  │                          │                         │        │
  │                          │  12. Send Workflows     │        │
  │                          │ ────────────────────────►        │
  │                          │   (Golden Template)     │        │
  │                          │                         │        │
  │                          │                  13. Deploy & Activate
  │                          │                     Dynamic UUID Mapper
  │                          │                         │        │
  │                          │◄────────────────────────┤        │
  │                          │   "Ready"               │        │
  │                          │                                  │
  │                          │  14. Update fleet_status         │
  │                          │      state = ACTIVE_HEALTHY      │
  │                          │                                  │
  │◄─────────────────────────│                                  │
  │   "Your droplet is       │                                  │
  │    ready! 🚀"            │                                  │
  │                          │                                  │
  │   Total time: ~60s       │                                  │
  │                          │                                  │

```

---

## 4.5 MULTI-ACCOUNT SELECTION ALGORITHM

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                    MULTI-ACCOUNT SELECTION ALGORITHM                                │
└─────────────────────────────────────────────────────────────────────────────────────┘

                              PROVISIONING REQUEST
                              ───────────────────
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │  Input Parameters:                  │
                    │  • workspace_id: "ws_789"           │
                    │  • region: "nyc3" (US East)         │
                    │  • size: "s-1vcpu-1gb" ($6/mo)      │
                    └─────────────────┬───────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: Query Available Accounts                                                   │
│                                                                                     │
│  SELECT * FROM do_accounts                                                          │
│  WHERE region = 'us-east'                                                           │
│    AND status = 'active'                                                            │
│    AND current_droplets < max_droplets                                              │
│  ORDER BY current_droplets ASC;    ◄── Least loaded first                          │
│                                                                                     │
│  ┌───────────────────────────────────────────────────────────────────────────────┐ │
│  │ account_id │ region  │ current │ max │ status │                               │ │
│  │────────────┼─────────┼─────────┼─────┼────────┤                               │ │
│  │ acc_002    │ us-east │   30    │ 50  │ active │  ◄── SELECTED (least loaded) │ │
│  │ acc_001    │ us-east │   45    │ 50  │ active │                               │ │
│  │ acc_005    │ us-east │   50    │ 50  │ full   │  ◄── EXCLUDED (at capacity)  │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: Decrypt API Token                                                          │
│                                                                                     │
│  SELECT decrypt_do_token(api_token_encrypted)                                       │
│  FROM do_accounts                                                                   │
│  WHERE account_id = 'acc_002';                                                      │
│                                                                                     │
│  Uses: pgcrypto extension with INTERNAL_ENCRYPTION_KEY                             │
│  Result: "dop_v1_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"                                 │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: Create Droplet via DO API                                                  │
│                                                                                     │
│  const doClient = new DigitalOcean({ token: decryptedToken });                     │
│                                                                                     │
│  const droplet = await doClient.dropletsCreate({                                   │
│    name: "genesis-ws789-a1b2c3",                                                   │
│    region: "nyc3",                                                                 │
│    size: "s-1vcpu-1gb",                                                            │
│    image: "ubuntu-22-04-x64",                                                      │
│    user_data: cloudInitScript,                                                     │
│    tags: [                                                                         │
│      "genesis:workspace_id:ws_789",                                                │
│      "genesis:account:acc_002",                                                    │
│      "genesis:tier:starter"                                                        │
│    ]                                                                               │
│  });                                                                               │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                            ┌─────────┴─────────┐
                            ▼                   ▼
                     ┌─────────────┐     ┌─────────────┐
                     │  SUCCESS    │     │  FAILURE    │
                     │             │     │             │
                     │ droplet_id  │     │ Error:      │
                     │ returned    │     │ • Rate limit│
                     │             │     │ • API error │
                     └──────┬──────┘     │ • Capacity  │
                            │            └──────┬──────┘
                            │                   │
                            ▼                   ▼
┌─────────────────────────────────────┐  ┌─────────────────────────────────────┐
│  STEP 4a: Atomic Increment          │  │  STEP 4b: Failover to Next Account  │
│                                     │  │                                     │
│  SELECT increment_droplet_count(    │  │  Retry with next account in list:  │
│    'acc_002'                        │  │  acc_001 (45/50 capacity)          │
│  );                                 │  │                                     │
│                                     │  │  If all accounts full:             │
│  current_droplets: 30 → 31          │  │  → Return error to user            │
│                                     │  │  → Alert admin to add accounts     │
└─────────────────────────────────────┘  └─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  STEP 5: Record in fleet_status                                                     │
│                                                                                     │
│  INSERT INTO fleet_status (                                                         │
│    workspace_id,                                                                    │
│    droplet_id,                                                                      │
│    do_account_id,                                                                   │
│    region,                                                                          │
│    state,                                                                           │
│    droplet_ip                                                                       │
│  ) VALUES (                                                                         │
│    'ws_789',                                                                        │
│    123456789,                                                                       │
│    'acc_002',                                                                       │
│    'nyc3',                                                                          │
│    'PROVISIONING',                                                                  │
│    '159.223.45.67'                                                                  │
│  );                                                                                 │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4.6 FINANCIAL KILL-SWITCH FLOW

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         FINANCIAL KILL-SWITCH FLOW                                  │
│                    (Prevents runaway costs on managed services)                     │
└─────────────────────────────────────────────────────────────────────────────────────┘


        n8n WORKFLOW                           DASHBOARD                    
        ────────────                           ─────────                    

    ┌───────────────────┐
    │  Workflow Starts  │
    │  (e.g., Lead      │
    │   Scraping)       │
    └─────────┬─────────┘
              │
              ▼
    ┌───────────────────┐
    │  PRE-FLIGHT NODE  │
    │  (Custom n8n node)│
    │                   │
    │  Detects upcoming │
    │  managed service: │
    │  • Apify ($0.02)  │
    └─────────┬─────────┘
              │
              │  GET /api/wallet/preflight
              │  { workspace_id, amount: 0.02 }
              │
              ▼
              ────────────────────────────────────────────────►
                                                               │
                                                               ▼
                                          ┌─────────────────────────────────┐
                                          │  1. Check Redis Cache           │
                                          │     Key: wallet:ws_789          │
                                          │                                 │
                                          │     ┌─────────────────────┐    │
                                          │     │ balance: $5.00      │    │
                                          │     │ last_sync: 10s ago  │    │
                                          │     └─────────────────────┘    │
                                          │                                 │
                                          │  2. Compare: $5.00 >= $0.02?   │
                                          │                                 │
                                          │     YES ──► APPROVED           │
                                          │                                 │
                                          └──────────────┬──────────────────┘
              ◄────────────────────────────────────────────
              │  { approved: true, balance: 5.00 }
              │
              ▼
    ┌───────────────────┐
    │  ✅ PROCEED       │
    │                   │
    │  Execute Apify    │
    │  Node             │
    └─────────┬─────────┘
              │
              │  POST /api/wallet/deduct
              │  { workspace_id, amount: 0.02, service: "apify" }
              │
              ▼
              ────────────────────────────────────────────────►
                                                               │
                                          ┌─────────────────────────────────┐
                                          │  3. Atomic Deduction            │
                                          │                                 │
                                          │  Redis: DECRBY wallet:ws_789 2  │
                                          │  (2 cents = $0.02)              │
                                          │                                 │
                                          │  4. Log to Ledger (async)       │
                                          │                                 │
                                          │  INSERT INTO wallet_ledger      │
                                          │  (workspace_id, type, amount,   │
                                          │   service, timestamp)           │
                                          │                                 │
                                          └─────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════════════════
                              KILL-SWITCH SCENARIO
═══════════════════════════════════════════════════════════════════════════════════════


    ┌───────────────────┐
    │  PRE-FLIGHT NODE  │
    │                   │
    │  Detects upcoming │
    │  managed service: │
    │  • Apify ($0.02)  │
    └─────────┬─────────┘
              │
              │  GET /api/wallet/preflight
              │  { workspace_id, amount: 0.02 }
              │
              ▼
              ────────────────────────────────────────────────►
                                                               │
                                                               ▼
                                          ┌─────────────────────────────────┐
                                          │  1. Check Redis Cache           │
                                          │     Key: wallet:ws_789          │
                                          │                                 │
                                          │     ┌─────────────────────┐    │
                                          │     │ balance: $0.01      │◄── INSUFFICIENT
                                          │     │ last_sync: 5s ago   │    │
                                          │     └─────────────────────┘    │
                                          │                                 │
                                          │  2. Compare: $0.01 >= $0.02?   │
                                          │                                 │
                                          │     NO ──► DENIED              │
                                          │                                 │
                                          └──────────────┬──────────────────┘
              ◄────────────────────────────────────────────
              │  { approved: false, balance: 0.01 }
              │
              ▼
    ┌───────────────────────────────────────────────────────────────────┐
    │  ❌ KILL SWITCH ACTIVATED                                         │
    │                                                                   │
    │  ┌─────────────────────────────────────────────────────────────┐ │
    │  │  1. Workflow HALTED (do not execute Apify)                  │ │
    │  │  2. Error node triggers notification                        │ │
    │  │  3. User receives: "Insufficient wallet balance"           │ │
    │  │  4. Link to top-up: /settings/billing                       │ │
    │  └─────────────────────────────────────────────────────────────┘ │
    │                                                                   │
    │  COST SAVED: $0.02 (this run)                                    │
    │  PREVENTED: Potential runaway if workflow ran 1000x             │
    │                                                                   │
    └───────────────────────────────────────────────────────────────────┘
```

---

## 4.7 SIDECAR COMMAND PROCESSING

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         SIDECAR COMMAND PROCESSING                                  │
│                    (BullMQ Event Bus → Sidecar Agent)                              │
└─────────────────────────────────────────────────────────────────────────────────────┘


    DASHBOARD                        REDIS (BullMQ)                    SIDECAR
    ─────────                        ─────────────                    ───────

        │                                  │                              │
        │  Fleet API Request:              │                              │
        │  "Update n8n to v1.52"           │                              │
        │                                  │                              │
        ▼                                  │                              │
    ┌───────────────────┐                  │                              │
    │  Command Producer │                  │                              │
    │                   │                  │                              │
    │  Queue: update-n8n│                  │                              │
    │  Priority: MEDIUM │                  │                              │
    │  Target: ws_789   │                  │                              │
    └─────────┬─────────┘                  │                              │
              │                            │                              │
              │  LPUSH queue:update-n8n    │                              │
              │  {                         │                              │
              │    id: "job_123",          │                              │
              │    workspace_id: "ws_789", │                              │
              │    command: "UPDATE_N8N",  │                              │
              │    payload: {              │                              │
              │      version: "1.52"       │                              │
              │    },                       │                              │
              │    jwt: "eyJhbG..."        │  ◄── Signed JWT for auth    │
              │  }                         │                              │
              │                            │                              │
              └─────────────────────────────►                              │
                                           │                              │
                                           │  Job queued                  │
                                           │                              │
                                           │     BRPOP queue:update-n8n   │
                                           │◄─────────────────────────────┤
                                           │                              │
                                           │  Job delivered               │
                                           │─────────────────────────────►│
                                           │                              │
                                           │                              ▼
                                           │              ┌───────────────────────────┐
                                           │              │  1. Verify JWT Signature  │
                                           │              │     (Zero-Trust)          │
                                           │              │                           │
                                           │              │  2. Check workspace_id    │
                                           │              │     matches this droplet  │
                                           │              │                           │
                                           │              │  3. Execute Command:      │
                                           │              │     ┌─────────────────┐   │
                                           │              │     │ docker pull     │   │
                                           │              │     │ n8nio/n8n:1.52 │   │
                                           │              │     │                 │   │
                                           │              │     │ docker stop n8n │   │
                                           │              │     │                 │   │
                                           │              │     │ docker run      │   │
                                           │              │     │ n8nio/n8n:1.52 │   │
                                           │              │     └─────────────────┘   │
                                           │              │                           │
                                           │              │  4. Health Check          │
                                           │              │     curl localhost:5678   │
                                           │              │                           │
                                           │              └─────────────┬─────────────┘
                                           │                            │
                                           │  Job result                │
                                           │◄───────────────────────────┤
                                           │  {                         │
                                           │    status: "completed",    │
                                           │    duration: 45s,          │
                                           │    new_version: "1.52"     │
                                           │  }                         │
                                           │                            │
        ┌──────────────────────────────────┤                            │
        │  Job completion webhook          │                            │
        │◄─────────────────────────────────┤                            │
        │                                  │                            │
        ▼                                  │                            │
    ┌───────────────────┐                  │                            │
    │  Update DB        │                  │                            │
    │                   │                  │                            │
    │  fleet_status     │                  │                            │
    │  n8n_version:1.52│                  │                            │
    │  last_update: now │                  │                            │
    └───────────────────┘                  │                            │


═══════════════════════════════════════════════════════════════════════════════════════
                              SUPPORTED COMMANDS
═══════════════════════════════════════════════════════════════════════════════════════

┌────────────────────┬────────────────────────────────────────────────────────────────┐
│ Command            │ Description                                                    │
├────────────────────┼────────────────────────────────────────────────────────────────┤
│ INJECT_CREDENTIALS │ Decrypt and inject API keys into n8n credential store         │
│ DEPLOY_WORKFLOW    │ Push workflow JSON to n8n, activate with UUID mapping         │
│ UPDATE_N8N         │ Blue-green container swap to new n8n version                  │
│ ADD_TRACKING_DOMAIN│ Update Caddy config for custom tracking domain                │
│ HARD_REBOOT        │ Force restart all containers (recovery from critical state)   │
│ PREPARE_HIBERNATE  │ Graceful shutdown before snapshot                             │
│ HEALTH_CHECK       │ Return detailed health status (RAM, disk, container states)   │
│ ROTATE_SECRETS     │ Replace n8n encryption key (security rotation)                │
└────────────────────┴────────────────────────────────────────────────────────────────┘
```

---

## 4.8 COMPLETE SYSTEM INTERACTION SUMMARY

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                    GENESIS SINGULARITY V30 - INTERACTION MAP                         ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                      ║
║                                    ┌─────────────┐                                   ║
║                                    │    USER     │                                   ║
║                                    └──────┬──────┘                                   ║
║                                           │                                          ║
║                                           ▼                                          ║
║  ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║  │                            DASHBOARD (Vercel)                                 │   ║
║  │                                                                               │   ║
║  │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │   ║
║  │   │   UI    │  │  Auth   │  │  APIs   │  │ Orch.   │  │ Wallet  │           │   ║
║  │   └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘           │   ║
║  │        │            │            │            │            │                  │   ║
║  └────────┼────────────┼────────────┼────────────┼────────────┼──────────────────┘   ║
║           │            │            │            │            │                      ║
║           │            │            │            │            │                      ║
║           ▼            ▼            ▼            ▼            ▼                      ║
║  ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║  │                           SUPABASE (Database)                                 │   ║
║  │                                                                               │   ║
║  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │   ║
║  │   │  workspaces  │  │ fleet_status │  │  credentials │  │wallet_ledger │    │   ║
║  │   │  (tenants)   │  │  (droplets)  │  │   (vault)    │  │  (billing)   │    │   ║
║  │   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │   ║
║  │                                                                               │   ║
║  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │   ║
║  │   │    leads     │  │ email_events │  │  do_accounts │  │  audit_log   │    │   ║
║  │   │ (contacts)   │  │  (timeline)  │  │ (DO tokens)  │  │  (history)   │    │   ║
║  │   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │   ║
║  │                                                                               │   ║
║  └──────────────────────────────────────────────────────────────────────────────┘   ║
║                                           │                                          ║
║                          ┌────────────────┼────────────────┐                        ║
║                          │                │                │                        ║
║                          ▼                ▼                ▼                        ║
║  ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║  │                    DIGITALOCEAN ACCOUNT POOL                                  │   ║
║  │                                                                               │   ║
║  │   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐            │   ║
║  │   │  Account 1 │  │  Account 2 │  │  Account 3 │  │  Account N │            │   ║
║  │   │  US-East   │  │  US-West   │  │  EU-Frank  │  │  Scalable  │            │   ║
║  │   └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘            │   ║
║  │         │               │               │               │                     │   ║
║  └─────────┼───────────────┼───────────────┼───────────────┼─────────────────────┘   ║
║            │               │               │               │                        ║
║            └───────────────┴───────┬───────┴───────────────┘                        ║
║                                    │                                                 ║
║                                    ▼                                                 ║
║  ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║  │                        TENANT DROPLET FLEET                                   │   ║
║  │                                                                               │   ║
║  │   ┌────────────────────────────────────────────────────────────────────────┐ │   ║
║  │   │  DROPLET (per tenant)                                                  │ │   ║
║  │   │                                                                        │ │   ║
║  │   │   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐                      │ │   ║
║  │   │   │  n8n   │  │Postgres│  │ Caddy  │  │Sidecar │                      │ │   ║
║  │   │   │        │  │        │  │        │  │        │                      │ │   ║
║  │   │   │Workflow│  │  n8n   │  │  SSL   │  │Control │                      │ │   ║
║  │   │   │ Engine │◄─┤  Data  │  │ Proxy  │  │ Agent  │                      │ │   ║
║  │   │   │        │  │        │  │        │  │        │                      │ │   ║
║  │   │   └────────┘  └────────┘  └───┬────┘  └───┬────┘                      │ │   ║
║  │   │                               │           │                            │ │   ║
║  │   │                               │           │                            │ │   ║
║  │   │                               ▼           │                            │ │   ║
║  │   │                       ┌───────────────┐   │                            │ │   ║
║  │   │                       │ DUAL DOMAINS  │   │ Heartbeat +               │ │   ║
║  │   │                       │               │   │ Webhooks                   │ │   ║
║  │   │                       │ • sslip.io    │   │     │                      │ │   ║
║  │   │                       │   (bootstrap) │   │     │                      │ │   ║
║  │   │                       │               │   │     │                      │ │   ║
║  │   │                       │ • custom.com  │   │     │                      │ │   ║
║  │   │                       │   (production)│   │     │                      │ │   ║
║  │   │                       └───────────────┘   │     │                      │ │   ║
║  │   │                                           │     │                      │ │   ║
║  │   └───────────────────────────────────────────┼─────┼──────────────────────┘ │   ║
║  │                                               │     │                        │   ║
║  │   × 15,000+ Droplets                          │     │                        │   ║
║  │                                               │     │                        │   ║
║  └───────────────────────────────────────────────┼─────┼────────────────────────┘   ║
║                                                  │     │                            ║
║                          ┌───────────────────────┘     │                            ║
║                          │                             │                            ║
║                          ▼                             ▼                            ║
║  ┌──────────────────────────────┐      ┌──────────────────────────────┐            ║
║  │      EXTERNAL SERVICES       │      │         DASHBOARD            │            ║
║  │                              │      │      (Event Receiver)        │            ║
║  │  ┌────────┐  ┌────────┐     │      │                              │            ║
║  │  │ Gmail  │  │ OpenAI │     │      │  Receives:                   │            ║
║  │  │ (Send) │  │ (AI)   │     │      │  • Heartbeats (health)       │            ║
║  │  └────────┘  └────────┘     │      │  • Event webhooks (metrics)  │            ║
║  │  ┌────────┐  ┌────────┐     │      │  • Handshake (registration)  │            ║
║  │  │ Apify  │  │ Claude │     │      │                              │            ║
║  │  │(Scrape)│  │  (AI)  │     │      │  Sends:                      │            ║
║  │  └────────┘  └────────┘     │      │  • Commands (via BullMQ)     │            ║
║  │                              │      │  • Credentials (encrypted)   │            ║
║  └──────────────────────────────┘      │  • Workflow updates          │            ║
║                                        │                              │            ║
║                                        └──────────────────────────────┘            ║
║                                                                                      ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 4.9 KEY METRICS & TARGETS

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                           GENESIS V30 PERFORMANCE TARGETS                            │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   SCALE TARGETS:                                                                     │
│   ┌────────────────────────────────────────────────────────────────────────────────┐│
│   │  Total Tenants:              15,000+                                           ││
│   │  Total Leads:                100,000,000+                                      ││
│   │  Active Droplets:            ~5,000 (concurrent)                               ││
│   │  Hibernated Droplets:        ~10,000 (snapshots)                               ││
│   │  DO Accounts Required:       15+ (at 50 droplets each)                         ││
│   └────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                      │
│   TIMING TARGETS:                                                                    │
│   ┌────────────────────────────────────────────────────────────────────────────────┐│
│   │  Droplet Provisioning:       < 60 seconds (Cloud-Init to ACTIVE)               ││
│   │  Wake from Hibernation:      < 15 seconds (Snapshot to ACTIVE)                 ││
│   │  VIP Pre-Warm:               < 5 seconds (Hot Spare activation)                ││
│   │  Heartbeat Interval:         60 seconds                                        ││
│   │  Degraded Detection:         5 minutes (missed heartbeats)                     ││
│   │  Critical Detection:         15 minutes (3+ missed)                            ││
│   │  Auto-Reboot Trigger:        After CRITICAL state                              ││
│   │  Hibernation Trigger:        72 hours inactivity                               ││
│   └────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                      │
│   COST MODEL:                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐│
│   │  Active Droplet:             $6/month (s-1vcpu-1gb)                            ││
│   │  Hibernated Snapshot:        ~$0.10-0.20/month (5-10GB at $0.02/GB)            ││
│   │  Genesis Subscription:       $99-399/month (includes managed services)         ││
│   │  Wallet Top-Up:              Pre-paid balance for Apify, CSE, Proxy            ││
│   │  Gross Margin Target:        70-85% per tenant                                 ││
│   └────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                      │
│   RELIABILITY TARGETS:                                                               │
│   ┌────────────────────────────────────────────────────────────────────────────────┐│
│   │  Uptime SLA:                 99.5% (per tenant)                                ││
│   │  Data Isolation:             100% (Zero cross-tenant access)                   ││
│   │  Rollback Success:           99.9% (Atomic Rollback Protocol)                  ││
│   │  Snapshot Retention:         30 days (before garbage collection)               ││
│   │  Encryption:                 AES-256-GCM (at rest), TLS 1.3 (in transit)       ││
│   └────────────────────────────────────────────────────────────────────────────────┘│
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## DOCUMENT SUMMARY

| Part | Content | Purpose |
|------|---------|---------|
| **PART I** | Legacy vs V30 Mermaid Diagrams | Show the evolution from single-tenant to sovereign isolation |
| **PART II** | Complete Pinnacle Architecture | The full 9-tier system with all connections |
| **PART III** | Component Deep Dives | Detailed Mermaid for specific subsystems |
| **PART IV** | ASCII Diagrams | Layer views, data flows, and interaction maps |

---

**END OF DOCUMENT**

---

*Genesis Singularity V30 Architecture Visualization*  
*Generated: January 24, 2026*  
*Document Version: 1.0*
