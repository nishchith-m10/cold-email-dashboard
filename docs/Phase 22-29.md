---
name: ask-ai-ui-refinement-b
overview: Add auto-scroll on configure toggle and reorganize the expanded Ask AI layout into a two-column (left provider, right model+preferences) minimal grid.
todos:
  - id: pref-relocate
    content: ""
    status: in_progress
---

### Phase 22 – Access & Tracking Safety (done and successful.)

- Tighten `middleware.ts` public routes (remove `/`, `/api/workspaces`, `/api/admin/(.*)` from public).

- Make tracking endpoints (`open`, `click`) require and honor `workspace_id` (no DEFAULT pollution).

- Validation: tracking requests show correct workspace in `email_events`; unauthenticated root/dashboard is blocked.

### Phase 23 – Notifications in Prod (done and successful.)

- Ensure `notifications` + triggers migration is applied on Supabase prod (PGRST205 resolved).

- Verify `/api/notifications` works; bell icon shows live data; no 500s in Vercel logs.

### Phase 24 – Schema/Type Alignment (done and successful.)

- Align `lib/supabase.ts` types with DB (`campaign_name`/`email_number` vs `campaign_id`/`step`), or add missing columns consistently.

- Validation: TypeScript clean build; dashboard aggregate/by-campaign/step-breakdown unaffected.

### Phase 25 – Ask AI Hardening (done and successful.)

- Add rate limiting (20 req/hour/user) to `/api/ask`.

- Optional: add streaming responses if desired.

- Validation: limit enforced; happy-path still returns answers.

###Phase 25E:
@Plan Mode Architect the solution for **Phase 25E: Dashboard UX Restructure & "Daily Spending" Metric**.

**Context:**

I am refining the dashboard to fix layout redundancy and improve metric relevance.

1.  **Layout Swap:**

    - **Overview (`app/page.tsx`):** Must focus on "Health Signals" (Reply Rate & Opt-Out Rate). Remove Financial/Efficiency cards.

    - **Analytics (`app/analytics/page.tsx`):** Must focus on "Financial Efficiency" (Costs). Remove redundant Health charts.

2.  **Metric Upgrade:**

    - **Remove:** "Cost Per Reply" (It is confusing/irrelevant).

    - **Add:** **"Daily Spending"** (Financial velocity).

    - **Smart Labeling:** The label must dynamically switch between **"Daily Cost"** (if 1 day selected) and **"Avg. Daily Cost"** (if date range selected).

**Objectives:**

### **1. Logic Update (`hooks/use-dashboard-data.ts`)**

- **Calculate:** `dailySpending`.

    - *Formula:* `total_cost / (days_in_range || 1)`.

- **Flag:** Return an `isSingleDay` boolean based on `startDate === endDate`.

- **Cleanup:** Remove `costPerReply` calculation if unused.

### **2. Component Update (`efficiency-metrics.tsx`)**

- **Replace:** The "Cost Per Reply" card with the new "Daily Spending" card.

- **Dynamic Props:**

    - `title`: Use logic: `isSingleDay ? "Daily Cost" : "Avg. Daily Cost"`.

    - `value`: Display the calculated `dailySpending`.

    - `icon`: Use a financial icon (e.g., `Wallet` or `Activity`).

- **Animation:** Ensure the title transition is smooth (use `framer-motion` layout prop or React keys).

### **3. Page Architecture Refactor**

- **Overview (`app/page.tsx`):**

    - **Remove:** `<EfficiencyMetrics />`.

    - **Add:** `<SafeTimeSeriesChart metric="opt_out_rate" />` (Move from Analytics).

    - **Keep:** `<ReplyRateChart />`.

- **Analytics (`app/analytics/page.tsx`):**

    - **Remove:** `<ReplyRateChart />` and `<OptOutRateChart />` (Redundant).

    - **Add:** `<SafeEfficiencyMetrics />` to the top section (Move from Overview).

**Output:**

Provide the strict **Execution Plan** (Atomic Batches) to apply these logic changes and move the components safely.

### Phase 26 – Role-Based Visibility

- Implement `ROLE_VISIBILITY` rules (cost/exports/per-sender/per-campaign) in data hooks + UI.

- Validation: different roles see the correct scoped metrics; costs hidden for members/viewers.
- A "HubSpot-lite" interface (`/contacts`) to view, manage, and manually add leads.

### Phase 27 Golden 10 (Core Metrics)

- Wire lead scoring into Email Preparation; add `lead_score` column/propagation.

- Add reply sentiment classification into Reply Tracker; add `sentiment` field.

- Add Hunter verify + Clearbit enrich before send; write enriched fields to DB.

- Validation: records in DB with lead_score/sentiment/enrichment; dashboard surfaces new fields if applicable.

### Phase 28 – Signals & Meetings

- Add Twitter mention monitoring → write signals to DB → surface in dashboard or workflow trigger.

- Add Calendly meeting sync → add `meeting_booked`/conversion tracking.

- Validation: signal/meeting events appear per workspace and do not leak across tenants.

### Phase 29 – Roadmap Polishes

- Phase 11 analytics extras (trend lines, dual-campaign compare, weekday heatmap), Phase 12 budget alerts, or revisit paused Phase 15 SaaS hardening.

Tell me which phase to start with. I’ll only deliver that phase, wait for your confirmation/tests, then proceed.