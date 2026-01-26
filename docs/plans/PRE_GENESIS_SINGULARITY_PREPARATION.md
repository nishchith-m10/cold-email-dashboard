# Pre-Genesis Singularity Preparation Plan

> **Document Version:** 1.0  
> **Created:** January 26, 2026  
> **Status:** AWAITING APPROVAL  
> **Purpose:** Foundational fixes and enhancements required before implementing Genesis Singularity V30

---

## Executive Summary

This document outlines the preparatory work required to ensure the Cold Email Dashboard is stable, feature-complete, and architecturally ready for the Genesis Singularity V30 transformation. These changes are **prerequisites** that will:

1. Fix placeholder functionality
2. Implement missing features
3. Refactor UI for scalability
4. Establish patterns that Genesis will extend

---

## Table of Contents

1. [Currency Context Implementation](#1-currency-context-implementation)
2. [Webhook System Implementation](#2-webhook-system-implementation)
3. [Two-Factor Authentication Integration](#3-two-factor-authentication-integration)
4. [Active Sessions Management](#4-active-sessions-management)
5. [Configuration Vault → Playground Mode Migration](#5-configuration-vault-playground-mode-migration)
6. [Schedule Settings → Playground Mode Migration](#6-schedule-settings-playground-mode-migration)
7. [Notification System Event Sources](#7-notification-system-event-sources)
8. [Vertical Sidebar Navigation Refactor](#8-vertical-sidebar-navigation-refactor)
9. [System Health Bar Optimization](#9-system-health-bar-optimization)
10. [Logo & Favicon Finalization](#10-logo-favicon-finalization)

---

## 1. Currency Context Implementation

### Current State
- ⚠️ **PLACEHOLDER** — Currency dropdown saves to database but is not consumed by UI components
- Cost displays throughout dashboard use hardcoded USD formatting

### Target State
- ✅ Currency selection reflects throughout entire dashboard
- ✅ All cost displays use selected currency with proper formatting
- ✅ Locale-aware number formatting (e.g., €1.234,56 for EUR in Germany)

### Implementation Plan

#### 1.1 Create Currency Context
```
lib/currency-context.tsx
├── CurrencyProvider
├── useCurrency() hook
├── formatCurrency(amount, currency) utility
└── getCurrencySymbol(currency) utility
```

#### 1.2 Supported Currencies
| Currency | Symbol | Locale Example |
|----------|--------|----------------|
| USD | $ | $1,234.56 |
| EUR | € | €1.234,56 |
| GBP | £ | £1,234.56 |
| JPY | ¥ | ¥1,235 |

#### 1.3 Components to Update
- [ ] `components/dashboard/metric-card.tsx` — Cost metrics
- [ ] `components/pages/dashboard-page-client.tsx` — Cost per send, monthly projection
- [ ] `components/pages/analytics-page-client.tsx` — All cost displays
- [ ] `components/dashboard/daily-cost-chart.tsx` — Y-axis labels, tooltips
- [ ] `components/dashboard/donut-chart.tsx` — Cost breakdown tooltips

#### 1.4 Estimated Effort
- **Files to create:** 1
- **Files to modify:** 5-8
- **Complexity:** Low-Medium

---

## 2. Webhook System Implementation

### Current State
- 🚫 **PURE PLACEHOLDER** — UI exists but no backend logic
- Event type checkboxes are disabled
- "Test" button is disabled

### Target State
- ✅ Functional webhook URL configuration
- ✅ Event type filtering
- ✅ Webhook delivery with retry logic
- ✅ Delivery logs for debugging
- ✅ Test endpoint functionality

### Implementation Plan

#### 2.1 Database Schema
```sql
-- Webhook configurations per workspace
CREATE TABLE workspace_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  url TEXT NOT NULL,
  secret TEXT, -- For HMAC signature verification
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook delivery logs
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES workspace_webhooks(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  attempts INTEGER DEFAULT 0,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2.2 API Endpoints
```
POST   /api/webhooks           — Create webhook
GET    /api/webhooks           — List webhooks
PATCH  /api/webhooks/:id       — Update webhook
DELETE /api/webhooks/:id       — Delete webhook
POST   /api/webhooks/:id/test  — Test webhook
GET    /api/webhooks/:id/logs  — Delivery logs
```

#### 2.3 Event Types
| Event | Trigger | Payload |
|-------|---------|---------|
| `campaign.created` | New campaign provisioned | Campaign details |
| `email.sent` | Email dispatched | Email metadata |
| `reply.received` | Reply detected | Reply content, sentiment |
| `opt_out.received` | Unsubscribe detected | Contact info |

#### 2.4 Webhook Delivery Flow
```
Event Occurs
    ↓
Check workspace webhooks
    ↓
Filter by event type
    ↓
Sign payload with HMAC-SHA256
    ↓
HTTP POST to webhook URL
    ↓
Log delivery result
    ↓
Retry on failure (exponential backoff: 1min, 5min, 30min)
```

#### 2.5 Estimated Effort
- **Files to create:** 3-4 (API routes, webhook service)
- **Files to modify:** 2 (security settings tab, events route)
- **Database migrations:** 1
- **Complexity:** Medium-High

---

## 3. Two-Factor Authentication Integration

### Current State
- 🚫 **PURE PLACEHOLDER** — "Enable" button is disabled
- Clerk supports 2FA natively but not configured

### Target State
- ✅ Users can enable/disable 2FA from Settings
- ✅ Supports authenticator apps (TOTP)
- ✅ Backup codes provided
- ✅ 2FA status visible in UI

### Implementation Plan

#### 3.1 Clerk 2FA Configuration
Clerk provides built-in 2FA support. We need to:
1. Enable 2FA in Clerk Dashboard
2. Use Clerk's `<UserProfile />` component or build custom UI
3. Add 2FA status indicator to security settings

#### 3.2 Custom UI Approach
```tsx
// Using Clerk's useUser hook
const { user } = useUser();
const hasTwoFactor = user?.twoFactorEnabled;

// Enable 2FA flow
await user.createTOTP();
// Returns QR code + secret for authenticator app

// Verify 2FA
await user.verifyTOTP({ code: userInputCode });
```

#### 3.3 UI Components
- [ ] Enable 2FA button → Opens modal with QR code
- [ ] Verify code input
- [ ] Backup codes display (one-time view)
- [ ] Disable 2FA (requires current code)

#### 3.4 Estimated Effort
- **Files to create:** 1-2 (2FA modal, backup codes component)
- **Files to modify:** 1 (security settings tab)
- **Clerk configuration:** Yes
- **Complexity:** Medium

---

## 4. Active Sessions Management

### Current State
- 🚫 **PURE PLACEHOLDER** — "Manage" button is disabled
- No visibility into active sessions

### Target State
- ✅ List all active sessions with device info
- ✅ Revoke individual sessions
- ✅ "Sign out all devices" option
- ✅ Current session indicator

### Implementation Plan

#### 4.1 Clerk Sessions API
```tsx
// Get all sessions
const sessions = await user.getSessions();

// Each session has:
// - id
// - status ('active', 'ended', 'expired')
// - lastActiveAt
// - expireAt
// - abandonAt
// - device info (browser, OS, location)

// Revoke a session
await session.revoke();
```

#### 4.2 UI Design
```
┌─────────────────────────────────────────────────────────┐
│ Active Sessions                                          │
├─────────────────────────────────────────────────────────┤
│ 🖥️  Chrome on macOS • San Francisco, US                  │
│     Last active: Just now                    [Current]   │
├─────────────────────────────────────────────────────────┤
│ 📱  Safari on iOS • New York, US                         │
│     Last active: 2 hours ago                [Revoke]     │
├─────────────────────────────────────────────────────────┤
│ 💻  Firefox on Windows • London, UK                      │
│     Last active: 1 day ago                  [Revoke]     │
└─────────────────────────────────────────────────────────┘
│                [Sign out of all devices]                 │
└─────────────────────────────────────────────────────────┘
```

#### 4.3 Estimated Effort
- **Files to create:** 1 (sessions list component)
- **Files to modify:** 1 (security settings tab)
- **Complexity:** Low-Medium

---

## 5. Configuration Vault → Playground Mode Migration

### Current State
- ⚠️ **PARTIAL** — Values save to database
- Unknown if n8n reads these values
- Changes apply immediately (no preview)

### Target State
- ✅ Config editing moved to Playground/Sandbox mode
- ✅ Preview impact before applying
- ✅ Simulation of workflow behavior
- ✅ Explicit "Apply to Production" action
- ✅ Rollback capability

### Implementation Plan

#### 5.1 Playground Mode Architecture
```
┌─────────────────────────────────────────────────────────┐
│                   PLAYGROUND MODE                        │
│  "Test configurations safely before going live"         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ CONFIGURATION PANEL                                  │ │
│  │                                                       │ │
│  │ Email Settings                                        │ │
│  │ ├── Max Emails/Day: [===|=====] 150                  │ │
│  │ └── Reply Delay: [==|========] 30 min                │ │
│  │                                                       │ │
│  │ Schedule Settings                                     │ │
│  │ ├── Office Hours: 09:00 - 17:00                      │ │
│  │ └── Weekend Sends: [ ] Disabled                       │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ SIMULATION PREVIEW                                   │ │
│  │                                                       │ │
│  │ With current settings, tomorrow would look like:     │ │
│  │                                                       │ │
│  │ 📧 Emails queued: 150 (max limit)                    │ │
│  │ ⏰ Send window: 09:00 - 17:00 (8 hours)              │ │
│  │ 📊 Send rate: ~19 emails/hour                        │ │
│  │ 📅 Weekend: Paused                                   │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ [Cancel] [Save as Draft] [▶ Apply to Production]    │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### 5.2 Genesis Singularity Integration Points
- **Phase 60 (Genesis Gateway)**: Playground becomes the onboarding config wizard
- **Phase 61 (Friction-Reduction)**: Preview eliminates "fear of breaking things"
- **Phase 64 (Tenant Lifecycle)**: Config snapshots tied to tenant state

#### 5.3 Database Schema Addition
```sql
-- Draft configurations (not yet applied)
CREATE TABLE workspace_config_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, config_key)
);
```

#### 5.4 Estimated Effort
- **Files to create:** 3-5 (Playground page, simulation engine, draft API)
- **Files to modify:** 2-3 (navigation, config vault tab)
- **Complexity:** High (new feature)

---

## 6. Schedule Settings → Playground Mode Migration

### Current State
- ⚠️ **PARTIAL** — Single global schedule for entire workspace
- No per-workflow customization (Email 1, 2, 3)
- Unknown if n8n reads these values

### Target State
- ✅ Schedule settings integrated into Playground mode
- ✅ Per-workflow schedule override option
- ✅ Visual timeline preview
- ✅ Timezone-aware scheduling

### Implementation Plan

#### 6.1 Enhanced Schedule Configuration
```
┌─────────────────────────────────────────────────────────┐
│ SCHEDULE SETTINGS (in Playground)                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Default Schedule (applies to all workflows)              │
│ ├── Office Hours: [09:00] to [17:00]                    │
│ ├── Timezone: [America/Los_Angeles ▼]                   │
│ └── Weekend Sends: [x] Enabled                          │
│                                                          │
│ ─────────────────────────────────────────────────────── │
│                                                          │
│ Per-Workflow Overrides (optional)                        │
│                                                          │
│ [+] Email 1 (Initial Outreach)                          │
│     └── Uses default schedule                           │
│                                                          │
│ [+] Email 2 (Follow-up)                                 │
│     └── Custom: 10:00 - 14:00 (lunch hours avoided)     │
│                                                          │
│ [+] Email 3 (Final Follow-up)                           │
│     └── Uses default schedule                           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### 6.2 Visual Timeline Preview
```
┌─────────────────────────────────────────────────────────┐
│ WEEKLY SEND TIMELINE                                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Mon  ████████████████░░░░░░░░  (09:00-17:00)            │
│ Tue  ████████████████░░░░░░░░  (09:00-17:00)            │
│ Wed  ████████████████░░░░░░░░  (09:00-17:00)            │
│ Thu  ████████████████░░░░░░░░  (09:00-17:00)            │
│ Fri  ████████████████░░░░░░░░  (09:00-17:00)            │
│ Sat  ░░░░░░░░░░░░░░░░░░░░░░░░  (Disabled)               │
│ Sun  ░░░░░░░░░░░░░░░░░░░░░░░░  (Disabled)               │
│                                                          │
│ ████ = Active send window                               │
└─────────────────────────────────────────────────────────┘
```

#### 6.3 Estimated Effort
- **Included in Playground Mode implementation**
- **Additional complexity:** Medium (per-workflow logic)

---

## 7. Notification System Event Sources

### Current State
- ✅ API infrastructure is complete
- ⚠️ No systems creating notifications
- Result: Empty notification panel

### Target State
- ✅ n8n workflows create notifications
- ✅ System events create notifications
- ✅ Budget alerts auto-generated
- ✅ Campaign completion notifications

### Implementation Plan

#### 7.1 Notification Sources

| Source | Event | Notification |
|--------|-------|--------------|
| n8n Reply Tracker | Reply received | "New reply from {name}" |
| n8n Opt-Out | Opt-out received | "{name} has opted out" |
| Dashboard | Budget threshold (80%) | "Budget alert: 80% consumed" |
| Dashboard | Campaign complete | "Campaign '{name}' completed" |
| System | Scheduled maintenance | "System maintenance: {date}" |
| Genesis | Droplet status change | "Your instance is now {status}" |

#### 7.2 n8n → Dashboard Notification Flow
```
n8n Workflow (Reply Tracker)
         ↓
POST /api/events (type: 'reply_received')
         ↓
Events API processes event
         ↓
INSERT INTO notifications (...)
         ↓
User sees notification in dashboard
```

#### 7.3 Implementation Steps
1. [ ] Add notification creation to `/api/events` handler
2. [ ] Add notification creation to relevant API endpoints
3. [ ] Create background job for budget monitoring
4. [ ] Test notification flow end-to-end

#### 7.4 Estimated Effort
- **Files to modify:** 3-5 (events route, budget checker, campaign completion)
- **Complexity:** Medium

---

## 8. Vertical Sidebar Navigation Refactor ✅ COMPLETED

### Current State
- ✅ Hybrid navigation implemented with compact top navbar + vertical left sidebar
- ✅ Sidebar collapse/expand functionality working with three modes
- ✅ Smooth transitions and hover behavior implemented

### Target State
- ✅ **Hybrid approach**: Compact top navbar + vertical left sidebar
- ✅ Top navbar: Logo, branding, search, actions (share, notifications, profile)
- ✅ Vertical sidebar: Navigation items (Overview, Analytics, Contacts, Sequences, Settings, Admin)
- ✅ Sidebar collapsible (icons only ↔ icons + labels) with Supabase-style behavior
- ✅ Smooth Framer Motion animation
- ✅ Expand on hover when collapsed
- ✅ Persisted preference in localStorage
- ✅ Compact sizing similar to Supabase's UI
- ✅ Mobile drawer remains unchanged

### Implementation Plan

#### 8.1 Hybrid Layout Structure

**Top Navbar (Horizontal, Compact)**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ┌────┐ Cold Email Analytics [Workspace Switcher]         [🔍]  [📤] [🔔] [👤] │
│ │LOGO│                                                                      │
│ └────┘                                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
Height: ~48px (compact, similar to Supabase)
```

**Vertical Sidebar (Left, Collapsible)**

**EXPANDED STATE (~200px width, Supabase-style compact):**
```
┌──────────────┐
│              │
│ NAVIGATION   │
│              │
│ 📊 Overview  │
│ 📈 Analytics │
│ 👥 Contacts  │
│ 📧 Sequences │
│ ⚙️  Settings │
│              │
│ ──────────── │
│              │
│ 🔐 Admin     │  (only if super_admin)
│              │
│ ──────────── │
│              │
│ ● Live       │  (System Health - minimized)
│              │
│ ──────────── │
│              │
│ [◀ Collapse] │
└──────────────┘
```

**COLLAPSED STATE (~48px width, icons only):**
```
┌────┐
│    │
│ 📊 │  (hover → shows "Overview" tooltip + expands sidebar)
│ 📈 │
│ 👥 │
│ 📧 │
│ ⚙️  │
│    │
│ ── │
│    │
│ 🔐 │  (if super_admin)
│    │
│ ── │
│    │
│ ●  │  (System Health dot)
│    │
│ ── │
│    │
│ ▶  │  (Expand button)
└────┘
```

**HOVER EXPANSION (when collapsed):**
- On hover over sidebar area → Temporarily expands to show labels
- Mouse leaves → Collapses back to icons
- Click collapse button → Permanently collapses (stored in localStorage)
- Click expand button → Permanently expands (stored in localStorage)

#### 8.2 Component Positioning & Sizing

**Top Navbar Components (Left to Right):**
```
┌────────────────────────────────────────────────────────────────────┐
│ [Logo 32x32] [Brand Text] [Search Bar] [Share] [Bell] [Avatar]   │
│                                                                     │
│ Spacing: 12px between items                                        │
│ Height: 48px (compact)                                             │
│ Padding: 0 16px                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Vertical Sidebar Components (Top to Bottom):**
```
┌─────────────────────────────────────┐
│ NAVIGATION SECTION                  │
│ ├── Overview (icon + label)          │
│ ├── Analytics (icon + label)         │
│ ├── Contacts (icon + label)         │
│ ├── Sequences (icon + label)        │
│ └── Settings (icon + label)         │
│                                     │
│ DIVIDER                             │
│                                     │
│ ADMIN SECTION (conditional)         │
│ └── Admin (icon + label)            │
│                                     │
│ DIVIDER                             │
│                                     │
│ FOOTER SECTION                      │
│ ├── System Health (● Live)          │
│ └── Collapse/Expand Button          │
└─────────────────────────────────────┘

Expanded Width: 200px (12.5rem)
Collapsed Width: 48px (3rem)
Item Height: 40px (compact)
Icon Size: 20x20px
Font Size: 14px (labels)
```

#### 8.3 Supabase-Style Collapse Behavior

**Permanent States:**
- **Expanded**: Sidebar shows icons + labels, width 200px
- **Collapsed**: Sidebar shows icons only, width 48px

**Hover Behavior (when collapsed):**
- Mouse enters sidebar → Smoothly expands to 200px, shows labels
- Mouse leaves sidebar → Smoothly collapses back to 48px
- Hover expansion does NOT persist (temporary)
- Only click on collapse/expand button persists state

**Animation Specs:**
```tsx
// Framer Motion config (Supabase-style)
const sidebarVariants = {
  expanded: { 
    width: 200, // 12.5rem (compact like Supabase)
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } // Supabase easing
  },
  collapsed: { 
    width: 48, // 3rem
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
  },
  hoverExpanded: {
    width: 200,
    transition: { duration: 0.15, ease: [0.4, 0, 0.2, 1] }
  }
};

const labelVariants = {
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.15, delay: 0.05 }
  },
  hidden: { 
    opacity: 0, 
    x: -8,
    transition: { duration: 0.1 }
  }
};
```

#### 8.4 Top Navbar Component Details

**Left Section:**
- Logo (32x32px, clickable → navigates to dashboard)
- Brand text: "Cold Email Analytics" (14px font, medium weight)
- Spacing: 12px between logo and text

**Center Section:**
- Search bar (Command palette trigger)
  - Width: ~300px (flexible, max-width)
  - Height: 36px
  - Placeholder: "Search or press Cmd+K"
  - Icon: Search icon on left

**Right Section (Actions):**
- Share button (icon only, 36x36px)
- Notifications bell (icon + badge, 36x36px)
- Profile avatar (32x32px, dropdown menu)
- Spacing: 8px between action items

#### 8.5 Vertical Sidebar Component Details

**Navigation Items:**
- Each item: 40px height, 12px horizontal padding
- Icon: 20x20px, left-aligned
- Label: 14px font, left-aligned (12px from icon)
- Active state: Background highlight + accent color
- Hover state: Subtle background change

**Admin Section:**
- Only visible if user has `super_admin` role
- Same styling as navigation items
- Positioned after divider, before footer

**System Health (Moved from Top Bar):**
- Minimized to dot + "Live" text
- Positioned in sidebar footer
- Click to expand → Shows detailed health panel modal

**Collapse/Expand Button:**
- Positioned at bottom of sidebar
- Icon: ◀ when expanded, ▶ when collapsed
- 40px height, full width
- Hover: Background highlight

#### 8.6 Responsive Behavior

**Desktop (>1024px):**
- Hybrid layout (top navbar + vertical sidebar)
- Sidebar: Collapsible with hover expansion

**Tablet (768px - 1024px):**
- Sidebar: Default collapsed, expand on click
- Top navbar: Slightly reduced spacing

**Mobile (<768px):**
- Sidebar: Hidden (use existing mobile drawer)
- Top navbar: Logo + essential actions only
- Search: Icon trigger, opens modal

#### 8.7 Component Structure
```
components/layout/
├── top-navbar.tsx          (new - compact horizontal bar)
├── sidebar.tsx             (new - vertical navigation)
├── sidebar-nav-item.tsx    (new - individual nav items)
├── sidebar-context.tsx     (new - collapse state management)
├── sidebar-footer.tsx      (new - health + collapse button)
├── header.tsx              (refactored - simplified)
├── client-shell.tsx        (updated - hybrid layout)
└── mobile-drawer.tsx       (unchanged)
```

#### 8.8 Layout CSS Structure
```css
/* Main layout */
.layout-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.top-navbar {
  height: 48px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
}

.main-content-wrapper {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 200px; /* expanded */
  width: 48px;  /* collapsed */
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}
```

#### 8.8 Component Structure
```
components/layout/
├── top-navbar.tsx          (new - compact horizontal bar)
├── sidebar.tsx             (new - vertical navigation)
├── sidebar-nav-item.tsx    (new - individual nav items)
├── sidebar-context.tsx     (new - collapse state management)
├── sidebar-footer.tsx      (new - health + collapse button)
├── header.tsx              (refactored - simplified)
├── client-shell.tsx        (updated - hybrid layout)
└── mobile-drawer.tsx       (unchanged)
```

#### 8.9 Estimated Effort
- **Files to create:** 5-6 (top-navbar, sidebar, sidebar-nav-item, sidebar-context, sidebar-footer)
- **Files to modify:** 3-4 (header.tsx refactor, client-shell.tsx layout update, mobile drawer integration)
- **Complexity:** High (hybrid layout refactor with Supabase-style interactions)
- **Design reference:** Supabase dashboard UI patterns

---

## 9. System Health Bar Optimization ✅ COMPLETED

### Current State
- ✅ Integrated into sidebar footer in compact format
- ✅ Shows status dot + icon + label when expanded
- ✅ Shows only icon when sidebar collapsed

### Target State
- ✅ Minimized to compact format (dot + "Live" text)
- ✅ Positioned in vertical sidebar footer (moved from top navbar)
- ✅ Expand on hover to show full status
- ✅ Click to see detailed health panel modal
- ✅ Takes minimal space (~40px height in sidebar)

### Implementation Plan

#### 9.1 Sidebar Footer Integration
The System Health component is integrated into the vertical sidebar footer (see Section 8.5).

**In Sidebar Footer:**
```
┌─────────────────────────────────────┐
│ ─────────────────────────────────── │
│                                     │
│ ● Live                             │  ← Compact format
│                                     │
│ [◀ Collapse]                        │
└─────────────────────────────────────┘
```

#### 9.2 Minimized State (Default)
- **Display**: Dot + "Live" text (or just dot when sidebar collapsed)
- **Height**: 40px (matches sidebar nav item height)
- **Format**: `● Live` (compact, single line)

#### 9.3 Hover State (When Expanded)
- **Display**: Full status with last sync time
- **Format**: `● Live — Last sync: 2s ago`
- **Tooltip**: Shows on hover if space is limited

#### 9.4 Click → Health Panel Modal
Clicking the health indicator opens a detailed modal:
```
┌─────────────────────────────────────┐
│ System Health                       │
├─────────────────────────────────────┤
│ API Status:      ● Operational      │
│ Database:        ● Connected        │
│ n8n Connection:  ● Active           │
│ Last Event:      2 seconds ago      │
│ Events Today:    1,234              │
│                                     │
│ [Refresh] [Close]                   │
└─────────────────────────────────────┘
```

#### 9.5 Component Integration
- **Component**: `components/layout/sidebar-footer.tsx`
- **Includes**: System Health + Collapse/Expand button
- **Position**: Bottom of vertical sidebar
- **Styling**: Matches sidebar nav items (40px height, same padding)

#### 9.6 Estimated Effort
- **Files to modify:** 2-3 (sidebar-footer.tsx, system-health-bar.tsx, remove from header.tsx)
- **Files to create:** 1 (health-panel-modal.tsx for detailed view)
- **Complexity:** Low-Medium (integration with sidebar refactor)

---

## 10. Logo & Favicon Finalization ✅ COMPLETED

### Current State
- ✅ Logo finalized in `public/logo.png` (873x890, transparent)
- ✅ Logo icon updated in `app/icon.png`
- ✅ Theme-aware text gradient implemented for visibility
- ✅ Used consistently across all components

### Target State
- ✅ Logo consistent across all locations
- ✅ Favicon matches logo
- ✅ Cache-busted for immediate visibility

### Implementation Plan

#### 10.1 Verification Checklist
- [ ] `public/logo.png` — 873x890, transparent
- [ ] `app/icon.png` — Same logo, works as favicon
- [ ] Browser tab shows correct icon
- [ ] All components render new logo

#### 10.2 Cache Busting
```tsx
// Add version query param if needed
<Image src={`/logo.png?v=${Date.now()}`} ... />
```

#### 10.3 Estimated Effort
- **Files to verify:** 2
- **Complexity:** Low (already mostly done)

---

## Implementation Priority Order

### Phase 1: Quick Wins (Low Complexity)
1. **Logo & Favicon Finalization** — Verify and cache-bust
2. **System Health Bar Optimization** — Minimize space usage
3. **Currency Context Implementation** — Follow timezone pattern

### Phase 2: Security Features (Medium Complexity)
4. **Two-Factor Authentication** — Clerk integration
5. **Active Sessions Management** — Clerk integration

### Phase 3: Major UI Refactor (High Complexity)
6. **Vertical Sidebar Navigation** — Significant change, do carefully

### Phase 4: Webhook System (Medium-High Complexity)
7. **Webhook Implementation** — New infrastructure

### Phase 5: Playground Mode (High Complexity)
8. **Playground/Sandbox Mode** — New feature
9. **Configuration Vault Migration** — Move to Playground
10. **Schedule Settings Migration** — Move to Playground

### Phase 6: Notification Sources (Medium Complexity)
11. **Notification Event Sources** — Wire up events

---

## Dependencies & Blockers

| Task | Depends On | Blocks |
|------|------------|--------|
| Currency Context | None | Analytics display |
| 2FA | Clerk config | None |
| Sessions | Clerk config | None |
| Sidebar Refactor | None | Health bar move |
| Webhook System | None | Notification sources |
| Playground Mode | Sidebar refactor (optional) | Config/Schedule migration |
| Notification Sources | Webhook system (partial) | None |

---

## Estimated Total Effort

| Category | Files | Complexity |
|----------|-------|------------|
| New files to create | 15-20 | - |
| Existing files to modify | 20-30 | - |
| Database migrations | 2-3 | - |
| **Overall Complexity** | - | **High** |

---

## Success Criteria

Before proceeding to Genesis Singularity V30, the following must be verified:

- [ ] Currency displays correctly in all cost components
- [ ] Webhooks can be configured and tested
- [ ] 2FA can be enabled/disabled
- [ ] Active sessions can be viewed and revoked
- [ ] Sidebar navigation is functional and collapsible
- [ ] System health bar is minimized by default
- [ ] Playground mode is accessible
- [ ] Config changes can be previewed before applying
- [ ] Notifications are being created from events
- [ ] Logo/favicon are correct across the application

---

## Approval Required

**This document requires approval before implementation begins.**

Upon approval, implementation will proceed in the priority order specified above, with regular checkpoints after each phase.

---

*Document prepared by: Distinguished Principal System Architect (L10)*  
*Awaiting approval from: Project Owner*
