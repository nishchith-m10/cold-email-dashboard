# Sandbox + Config Vault Integration Design

## 1. Visual Design Mockup

### Desktop Layout (1920x1080)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  SANDBOX                                            [Terminal Icon]       │
│  Test campaigns with live configuration                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Campaign Configuration                          [Collapse/Expand]  │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │                                                                      │  │
│  │  Max Emails/Day: 100        Reply Delay: 30min                     │  │
│  │  [━━━━━━━━━●──────] (47/100 sent today)  [━━━━●────────]          │  │
│  │                                                                      │  │
│  │  Office Hours: 09:00 to 17:00    [✓] Enable Weekend Sends         │  │
│  │  ⚠️ Currently 2:30 PM - Within office hours                        │  │
│  │                                                                      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Test Campaign Run                                                   │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │                                                                      │  │
│  │  Campaign:  [Welcome Email Sequence         ▼]                     │  │
│  │  Test Email: [you@example.com                ]                     │  │
│  │                                                                      │  │
│  │  💡 This campaign will use the configuration above                 │  │
│  │                                                                      │  │
│  │  [Run Test Campaign]                                               │  │
│  │                                                                      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Real-Time Execution                    ✓ Complete (12.3s total)   │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │                                                                      │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │ ✓ OpenAI: Generate Email (2.1s)                              │  │  │
│  │  │   Output: "Hey John, I noticed you're working on..."          │  │  │
│  │  │   [View Full Output ▼]                                        │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  │                                                                      │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │ ⏱️  Waiting for Reply Delay (30min) [Skip for Test]          │  │  │
│  │  │   ℹ️  In production, system waits 30min (Reply Delay config)  │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  │                                                                      │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │ ✓ Gmail: Send Email (1.8s)                                   │  │  │
│  │  │   To: you@example.com                                         │  │  │
│  │  │   Subject: "Quick question about..."                          │  │  │
│  │  │   ✓ Sent within office hours (2:30 PM)                       │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  │                                                                      │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │ ℹ️  Email Count Check                                         │  │  │
│  │  │   Daily limit: 48/100 emails sent (52 remaining)             │  │  │
│  │  │   ✓ Within limit                                              │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  │                                                                      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Test Run History                                                    │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │                                                                      │  │
│  │  • you@example.com - 2 min ago - 12.3s - ✓ Success (3 nodes)     │  │
│  │  • test@example.com - 1 hour ago - 8.1s - ✓ Success (3 nodes)    │  │
│  │                                                                      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└──────────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (375x812)

```
┌─────────────────────────────┐
│  SANDBOX           [≡]      │
├─────────────────────────────┤
│                             │
│  Campaign Config   [▼]      │
│  ┌───────────────────────┐  │
│  │ 47/100 emails today   │  │
│  │ ⏰ Office Hrs: Active  │  │
│  │ 💬 Reply: 30min       │  │
│  └───────────────────────┘  │
│  [Tap to expand settings]   │
│                             │
│  Test Run                   │
│  ┌───────────────────────┐  │
│  │ Campaign:             │  │
│  │ [Welcome Sequence ▼]  │  │
│  │                       │  │
│  │ Test Email:           │  │
│  │ [you@example.com]     │  │
│  │                       │  │
│  │ [Run Test]            │  │
│  └───────────────────────┘  │
│                             │
│  Execution Monitor          │
│  ┌───────────────────────┐  │
│  │ ✓ Complete (12.3s)    │  │
│  │                       │  │
│  │ [3 nodes executed]    │  │
│  │ [Tap to view details] │  │
│  └───────────────────────┘  │
│                             │
└─────────────────────────────┘
```

---

## 2. Component Architecture

### Component Tree
```
SandboxPage (app/sandbox/page.tsx)
└─ SandboxPanel (components/sandbox/sandbox-panel.tsx)
   ├─ ConfigurationSection (NEW - components/sandbox/configuration-section.tsx)
   │  ├─ useWorkspaceConfig() hook
   │  ├─ Real-time status indicators
   │  └─ Collapsible settings panel
   │
   ├─ TestRunner (components/sandbox/test-runner.tsx)
   │  ├─ useCampaigns() hook
   │  ├─ useWorkspaceConfig() hook (read-only, for validation)
   │  └─ Campaign selector + test email input
   │
   ├─ ExecutionMonitor (components/sandbox/execution-monitor.tsx)
   │  ├─ SSE connection for real-time updates
   │  ├─ useWorkspaceConfig() hook (to show config context)
   │  └─ Enhanced node displays with config awareness
   │
   └─ TestHistory (existing in sandbox-panel.tsx)
      └─ useSandboxHistory() hook
```

### New Component: ConfigurationSection

**File:** `components/sandbox/configuration-section.tsx`

**Props:**
```typescript
interface ConfigurationSectionProps {
  workspaceId: string;
  isCollapsed?: boolean; // Controlled collapse state
  onToggle?: () => void;
}
```

**Features:**
- Collapsible panel (default: collapsed after first config)
- Real-time status badges at the top (always visible)
- Live validation feedback
- Save button (same UX as current config vault)

**Status Indicators (Always Visible):**
```typescript
{
  dailyEmailCount: number;     // e.g., "47/100"
  dailyEmailLimit: number;
  officeHoursStatus: 'active' | 'outside' | 'weekend';
  replyDelay: number;          // in minutes
  weekendSendsEnabled: boolean;
}
```

---

## 3. Data Flow Architecture

### State Management

```
┌─────────────────────────────────────────────────────────┐
│  Workspace Config (Supabase: workspace_config)          │
│  - max_emails_per_day                                   │
│  - reply_delay_minutes                                  │
│  - office_hours_start                                   │
│  - office_hours_end                                     │
│  - enable_weekend_sends                                 │
└─────────────────────────────────────────────────────────┘
              ↓ (useWorkspaceConfig hook)
┌─────────────────────────────────────────────────────────┐
│  ConfigurationSection Component                         │
│  - Reads config                                         │
│  - Shows sliders/toggles                                │
│  - Updates config (POST /api/workspace/config)          │
│  - Calculates real-time status                          │
└─────────────────────────────────────────────────────────┘
              ↓ (shared via hook)
┌─────────────────────────────────────────────────────────┐
│  TestRunner Component                                   │
│  - Reads config (validation only)                       │
│  - Shows warnings if outside office hours               │
│  - Blocks test if email limit exceeded                  │
└─────────────────────────────────────────────────────────┘
              ↓ (triggers test)
┌─────────────────────────────────────────────────────────┐
│  ExecutionMonitor Component                             │
│  - Reads config (for contextual display)                │
│  - Shows "Reply Delay: 30min" annotations               │
│  - Shows "✓ Within office hours" validations            │
│  - Shows email count after send nodes                   │
└─────────────────────────────────────────────────────────┘
```

### API Routes (No changes needed)

**Existing:**
- `GET/POST /api/workspace/config` - Already exists from Phase 36.1
- Uses `useWorkspaceConfig()` hook - Already exists
- `POST /api/sandbox/test-campaign` - Triggers test (no config changes needed)

**Enhancement (optional):**
- Add config validation to test trigger endpoint
- Return 429 if email limit exceeded
- Return warning if outside office hours (but still allow test)

---

## 4. User Interactions & Flows

### Flow 1: First-Time User (No Config)

1. User navigates to `/sandbox`
2. **ConfigurationSection** expanded by default
3. Shows default values (grayed out):
   - Max Emails: 100/day
   - Reply Delay: 30min
   - Office Hours: 9 AM - 5 PM
   - Weekend Sends: Disabled
4. Banner: "💡 Configure your campaign parameters below"
5. User adjusts sliders → clicks "Save Changes"
6. Section auto-collapses, shows compact status bar at top
7. TestRunner becomes enabled

### Flow 2: Returning User (Config Exists)

1. User navigates to `/sandbox`
2. **ConfigurationSection** collapsed by default
3. Status bar shows: "47/100 emails | ⏰ Active | 💬 30min"
4. User can proceed directly to test
5. Click status bar to expand/edit config

### Flow 3: Testing with Config Validation

1. User selects campaign, enters test email
2. **TestRunner** checks config:
   - ✓ Email limit: 47/100 (OK)
   - ⚠️ Office hours: 8:30 PM (outside hours, but test allowed)
3. Shows inline warning: "⚠️ Outside office hours. Production emails will queue until 9 AM."
4. User clicks "Run Test" anyway (test mode ignores limits)
5. **ExecutionMonitor** shows real-time execution
6. After email send node: Shows "✓ Email count: 48/100 (test mode)"

### Flow 4: Config Affects Production (Future)

When user activates campaign:
- System enforces max_emails_per_day (real limit)
- System queues emails outside office hours
- System respects reply_delay_minutes
- Sandbox tests are excluded from daily count

---

## 5. Technical Implementation Plan

### Phase 1: UI Integration (1-2 hours)

**Files to Create:**
- `components/sandbox/configuration-section.tsx`
- `components/sandbox/config-status-bar.tsx` (compact view)

**Files to Modify:**
- `components/sandbox/sandbox-panel.tsx` - Add ConfigurationSection at top
- `components/sandbox/test-runner.tsx` - Add config validation
- `components/sandbox/execution-monitor.tsx` - Add config context annotations

**Files to Remove:**
- `components/settings/config-vault-tab.tsx` - Move logic to sandbox
- `app/settings/page.tsx` - Remove "configuration" tab

### Phase 2: Enhanced Validation (30 min)

**Add to TestRunner:**
```typescript
// Pre-flight checks
const validation = {
  emailLimitOk: dailyCount < maxEmails,
  withinOfficeHours: isWithinHours(now, startHour, endHour),
  weekendOk: !isWeekend() || weekendSendsEnabled,
};

// Show warnings (non-blocking for tests)
if (!validation.withinOfficeHours) {
  showWarning("Outside office hours. Production will queue.");
}
```

### Phase 3: Contextual Execution Display (30 min)

**Add to ExecutionMonitor:**
- After "Send Email" node: Show email count
- After "OpenAI" node: Show token usage (if available)
- Add synthetic "Config Check" events in monitor

### Phase 4: Persistence & UX Polish (30 min)

- Remember collapsed/expanded state (localStorage)
- Add tooltips explaining each setting
- Add "Reset to Defaults" button
- Add "Test Connection" for each config setting

---

## 6. Visual Design Tokens

### Colors (Dark Mode)
```css
--config-section-bg: rgb(24, 24, 27);      /* zinc-900 */
--config-border: rgb(39, 39, 42);          /* zinc-800 */
--status-active: rgb(34, 197, 94);         /* green-500 */
--status-warning: rgb(234, 179, 8);        /* yellow-500 */
--status-error: rgb(239, 68, 68);          /* red-500 */
```

### Spacing
- Section gap: `24px` (6 in Tailwind)
- Internal padding: `16px` (4)
- Status bar height: `48px` (12)
- Collapsed header height: `56px` (14)

### Typography
- Section title: `text-sm font-semibold`
- Status indicators: `text-xs font-medium`
- Warning text: `text-xs text-amber-600`

---

## 7. Edge Cases & Validations

### Config Validations
- Max emails: 10-500 (step: 10)
- Reply delay: 5-120 minutes (step: 5)
- Office hours: Must be valid 24h format
- Office end must be after start

### Test Execution Edge Cases
1. **User changes config during test**
   - Config locked while test is running
   - Or: Config changes don't affect in-flight test

2. **Email limit reached mid-test**
   - Test mode exempt from limit
   - Show warning: "⚠️ Daily limit reached. Test mode only."

3. **Weekend + Disabled weekend sends**
   - Test still runs (test mode exempt)
   - Warning: "📅 Weekend. Production queued until Monday."

4. **Outside office hours**
   - Test still runs
   - Warning shown inline

---

## 8. Benefits Summary

### For Users
✅ Single page for all testing needs
✅ Config + Test + Monitor = unified workflow
✅ Real-time feedback on config impact
✅ Clear production vs test mode distinctions
✅ No more hunting through Settings

### For Developers
✅ Reuses existing hooks (`useWorkspaceConfig`)
✅ No API changes needed
✅ Cleaner Settings page (one less tab)
✅ Better separation of concerns (testing vs workspace settings)

### For Product
✅ Lower cognitive load for users
✅ Better onboarding (everything in one place)
✅ More intuitive workflow
✅ Easier to add future testing features

---

## 9. Future Enhancements (Out of Scope)

- **A/B Testing**: Test multiple config variations side-by-side
- **Time Travel**: "Run this test as if it's 2 PM on Monday"
- **Cost Estimation**: "This config will cost ~$X/month at 10k leads"
- **Smart Defaults**: AI-suggested config based on industry
- **Config Templates**: Save/load config presets
