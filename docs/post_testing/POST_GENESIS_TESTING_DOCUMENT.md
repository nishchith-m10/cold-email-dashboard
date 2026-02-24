# POST GENESIS TESTING DOCUMENT

**Project:** UpShot Cold Email Platform
**Version:** 1.0.0
**Date:** 2026-02-15
**Classification:** Internal QA -- Comprehensive Validation Checklist
**Prepared By:** Engineering Team
**Scope:** Full-stack verification of all 33 Genesis phases (Phase 40-73), core application features, 139 API routes, 129 components, 27 hooks, 11 cron jobs, and all supporting infrastructure.
**Methodology:** RALPH Loop (Review, Analyze, Loop, Patch, Harden) across all layers.

---

## TABLE OF CONTENTS

- Section I: Prerequisites and Environment Setup
- Section II: Core Platform Testing -- Pages
- Section III: Core Platform Testing -- Components (Part 1: Admin, Campaigns, Dashboard)
- Section IV: Core Platform Testing -- Components (Part 2: Genesis, Layout, Mobile, Settings, UI)
- Section V: API Route Testing -- Admin Endpoints
- Section VI: API Route Testing -- Core Endpoints
- Section VII: API Route Testing -- Onboarding, OAuth, Webhook, Workspace Endpoints
- Section VIII: Genesis Phase Testing -- Phase 40 (Forensic Foundation)
- Section IX: Genesis Phase Testing -- Phase 41 (Ignition Orchestrator)
- Section X: Genesis Phase Testing -- Phase 42 (Atomic Handshake Protocol)
- Section XI: Genesis Phase Testing -- Phase 43 (State Reconciliation Watchdog)
- Section XII: Genesis Phase Testing -- Phase 44 (God Mode / Scale Health)
- Section XIII: Genesis Phase Testing -- Phase 45 (Sandbox Engine)
- Section XIV: Genesis Phase Testing -- Phase 46 (Shadow Migration Protocol)
- Section XV: Genesis Phase Testing -- Phase 47 (Hyper-Scale Stress Test)
- Section XVI: Genesis Phase Testing -- Phase 48 (Production Cutover and Revert)
- Section XVII: Genesis Phase Testing -- Phase 52 (BullMQ Event Bus)
- Section XVIII: Genesis Phase Testing -- Phase 53 (Dynamic UUID Mapper)
- Section XIX: Genesis Phase Testing -- Phase 58 (Financial and Billing)
- Section XX: Genesis Phase Testing -- Phase 61b (Campaign and Onboarding)
- Section XXI: Genesis Phase Testing -- Phase 64 (Credential Vault and Onboarding)
- Section XXII: Genesis Phase Testing -- Phase 64b (Email Provider)
- Section XXIII: Genesis Phase Testing -- Phase 66 (GDPR Right to Access / Erasure)
- Section XXIV: Genesis Phase Testing -- Phase 67 (Audit Logger)
- Section XXV: Genesis Phase Testing -- Phase 68 (Tenant Lifecycle)
- Section XXVI: Genesis Phase Testing -- Phase 69 (Webhook Hardening)
- Section XXVII: Genesis Phase Testing -- Phase 70 (Disaster Recovery)
- Section XXVIII: Genesis Phase Testing -- Phase 70b (Infrastructure as Code)
- Section XXIX: Genesis Phase Testing -- Phase 71 (API Health Monitor)
- Section XXX: Genesis Phase Testing -- Phase 72 (Fleet Update System)
- Section XXXI: Genesis Phase Testing -- Phase 73 (Control Plane Deployment)
- Section XXXII: Cron Job Testing
- Section XXXIII: Hook Testing
- Section XXXIV: Integration Testing
- Section XXXV: Security Testing
- Section XXXVI: Performance Testing
- Section XXXVII: Mobile and Responsive Testing
- Section XXXVIII: Accessibility Testing
- Section XXXIX: Disaster Recovery Scenario Testing
- Section XL: Deployment and CI/CD Testing
- Section XLI: Regression Testing Matrix
- Section XLII: Final Sign-Off

---

## SECTION I: PREREQUISITES AND ENVIRONMENT SETUP

### 1.1 Development Environment

- [ ] Node.js version 18 or higher is installed and verified via node --version
- [ ] npm version 9 or higher is installed and verified via npm --version
- [ ] Git is installed and the repository is cloned to the local machine
- [ ] The working directory is set to the project root (cold-email-dashboard-starter)
- [ ] All environment variables are configured in a local .env.local file
- [ ] The .env.local file contains NEXT_PUBLIC_SUPABASE_URL with a valid Supabase project URL
- [ ] The .env.local file contains NEXT_PUBLIC_SUPABASE_ANON_KEY with the correct anonymous key
- [ ] The .env.local file contains SUPABASE_SERVICE_ROLE_KEY with the service role key
- [ ] The .env.local file contains NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY for authentication
- [ ] The .env.local file contains CLERK_SECRET_KEY for server-side authentication
- [ ] The .env.local file contains CLERK_WEBHOOK_SECRET for webhook signature verification
- [ ] The .env.local file contains DIGITALOCEAN_API_TOKEN for droplet provisioning
- [ ] The .env.local file contains REDIS_URL for BullMQ queue connections
- [ ] The .env.local file contains ANTHROPIC_API_KEY for AI features
- [ ] The .env.local file contains OPENAI_API_KEY for AI model access
- [ ] The .env.local file contains RELEVANCE_AI_API_KEY for Relevance AI integration
- [ ] The .env.local file contains APIFY_API_TOKEN for web scraping operations
- [ ] The .env.local file contains GOOGLE_CSE_API_KEY for Google Custom Search
- [ ] The .env.local file contains GOOGLE_CSE_ID for search engine identification
- [ ] The .env.local file contains N8N_BASE_URL for n8n workflow automation
- [ ] The .env.local file contains N8N_API_KEY for n8n API access
- [ ] The .env.local file contains ENCRYPTION_KEY for credential vault encryption
- [ ] The .env.local file contains CRON_SECRET for securing cron job endpoints
- [ ] npm install has been run successfully with no errors
- [ ] npm run build completes without errors
- [ ] npm run dev starts the development server on localhost:3000

### 1.2 Database Setup

- [ ] Supabase project is accessible via the dashboard
- [ ] All database migrations have been applied successfully
- [ ] The email_events table exists with proper columns
- [ ] The idx_email_events_event_ts index exists on the email_events table
- [ ] The workspace_credentials table exists for credential vault storage
- [ ] The audit_log table exists for audit trail entries
- [ ] The workspace_config table exists for per-workspace configuration
- [ ] The onboarding_progress table exists for tracking onboarding state
- [ ] The brand_vault table exists for brand information storage
- [ ] The campaign_templates table exists for template management
- [ ] The webhook_dlq table exists for dead letter queue entries
- [ ] The disaster_recovery_snapshots table exists for snapshot metadata
- [ ] The fleet_update_queue table exists for fleet update tracking
- [ ] The login_audit table exists for login event tracking
- [ ] Row Level Security (RLS) is enabled on all workspace-scoped tables
- [ ] RLS policies enforce workspace isolation for multi-tenant access
- [ ] All required SQL functions (RPC) are deployed and callable
- [ ] The genesis schema exists alongside the public schema
- [ ] Database connection pool limits are configured appropriately
- [ ] Supabase realtime is enabled for tables that require live updates

### 1.3 External Service Dependencies

- [ ] Clerk authentication service is accessible and configured
- [ ] Clerk webhook endpoint is registered in the Clerk dashboard
- [ ] DigitalOcean API is accessible with valid credentials
- [ ] DigitalOcean account has sufficient droplet quota for testing
- [ ] Redis instance is running and accessible via REDIS_URL
- [ ] n8n instance is running and accessible via N8N_BASE_URL
- [ ] Anthropic API key is valid and has available credits
- [ ] OpenAI API key is valid and has available credits
- [ ] Relevance AI API key is valid and the account is active
- [ ] Apify API token is valid and the account is active
- [ ] Google Custom Search credentials are valid
- [ ] SMTP server is accessible for email sending tests (if applicable)
- [ ] Gmail OAuth credentials are configured (if testing Gmail provider)

### 1.4 Testing Tools

- [ ] Jest is installed and configured via jest.config.ts
- [ ] TypeScript compiler (tsc) runs with zero errors excluding auto-generated files
- [ ] Playwright is installed for end-to-end tests (playwright.config.ts)
- [ ] Test coverage tooling generates reports in the coverage directory
- [ ] Terminal access is available for running CLI commands
- [ ] Browser DevTools are available for frontend inspection
- [ ] Network inspector tools are available for API request monitoring
- [ ] A REST client (Postman, Insomnia, or curl) is available for direct API testing

### 1.5 Access Requirements

- [ ] At least one Clerk user account with admin role exists
- [ ] At least one Clerk user account with member role exists
- [ ] At least one workspace has been created in the database
- [ ] The admin user has super_admin privileges in the system
- [ ] A secondary workspace exists for multi-workspace isolation testing
- [ ] Test data has been seeded (contacts, campaigns, sequences) or can be created during testing
- [ ] Access to Supabase dashboard SQL editor for direct database verification

---



## SECTION II: CORE PLATFORM TESTING -- PAGES

### 2.1 Dashboard Page (app/page.tsx)

#### 2.1.1 Page Load and Rendering

- [ ] Dashboard page loads without errors when navigating to the root URL
- [ ] The page renders within 3 seconds on a standard connection
- [ ] No console errors appear in the browser DevTools on initial load
- [ ] The page displays the correct title in the browser tab
- [ ] The layout wrapper component renders with proper structure
- [ ] The sidebar navigation is visible on desktop viewports
- [ ] The top navbar renders with user information from Clerk
- [ ] The main content area has the correct responsive padding and margin
- [ ] The page redirects unauthenticated users to the sign-in page
- [ ] The page handles workspace context correctly from the URL or session

#### 2.1.2 Metric Cards

- [ ] All metric cards render in the responsive grid layout (2 columns mobile, 3 tablet, 5 desktop)
- [ ] Each metric card displays the correct label text
- [ ] Each metric card displays the correct numeric value from the API
- [ ] Metric cards show loading skeleton states while data is being fetched
- [ ] Metric cards handle zero values without breaking the display
- [ ] Metric cards handle null or undefined data gracefully with fallback text
- [ ] The percentage change indicator shows positive changes correctly
- [ ] The percentage change indicator shows negative changes correctly
- [ ] The percentage change indicator shows neutral (zero) changes correctly
- [ ] Metric card tooltips appear on hover with additional context
- [ ] Clicking a metric card navigates to the relevant detail view if applicable
- [ ] Metric cards re-fetch data when the date range is changed
- [ ] Metric cards re-fetch data when the campaign filter is changed

#### 2.1.3 Daily Sends Chart

- [ ] The daily sends chart renders with correct axes and labels
- [ ] The chart displays data points for the selected date range
- [ ] The chart shows a "No sends in selected range" message when data is empty
- [ ] The chart tooltip displays detailed send counts on hover
- [ ] The Total and Avg/Day summary values are calculated correctly
- [ ] The chart responds to date range picker changes
- [ ] The chart responds to campaign selector changes
- [ ] The chart animates smoothly on initial render
- [ ] The chart handles a single data point without errors
- [ ] The chart handles large datasets (90+ days) without performance degradation
- [ ] The chart width adjusts properly when the sidebar is toggled
- [ ] The chart height maintains the 320px minimum height

#### 2.1.4 Step Breakdown (Donut Chart)

- [ ] The step breakdown donut chart renders with correct proportions
- [ ] Each segment uses the correct color for its email step
- [ ] The legend displays all email steps with correct labels
- [ ] The legend displays correct count and percentage for each step
- [ ] Hovering over a segment highlights it and shows details
- [ ] The chart handles a single step without visual errors
- [ ] The chart handles all steps having equal values
- [ ] The chart handles one step having 100 percent of the total
- [ ] The chart shows appropriate fallback when no data exists
- [ ] The center label displays the total count

#### 2.1.5 Campaign Card Stack

- [ ] Campaign cards render in a vertically stacked layout
- [ ] Each campaign card shows the campaign name
- [ ] Each campaign card shows the current status (active, paused, completed)
- [ ] Each campaign card shows key metrics (sent, opened, replied)
- [ ] The campaign toggle switch functions correctly to pause and resume
- [ ] Campaign cards show the correct status badge color
- [ ] Clicking a campaign card navigates to the campaign detail view
- [ ] Campaign cards handle long campaign names with proper text truncation
- [ ] The card stack shows a loading state while campaigns are being fetched
- [ ] The card stack shows an empty state message when no campaigns exist

#### 2.1.6 Date Range Picker

- [ ] The date range picker opens a calendar popover when clicked
- [ ] The preset ranges (Last 7 Days, Last 30 Days, etc.) work correctly
- [ ] Custom date selection allows choosing start and end dates
- [ ] Selected dates are visually highlighted in the calendar
- [ ] The date range updates all charts and metrics on the page
- [ ] The date range picker shows the currently selected range text
- [ ] Invalid date ranges (end before start) are prevented
- [ ] The calendar navigation allows moving between months
- [ ] The mobile date range picker uses the bottom sheet variant
- [ ] The date range persists across page navigation within the session

#### 2.1.7 Campaign Selector

- [ ] The campaign selector dropdown lists all available campaigns
- [ ] Selecting a campaign filters all dashboard data to that campaign
- [ ] The All Campaigns option shows aggregated data
- [ ] The selector shows the currently selected campaign name
- [ ] The selector handles workspaces with no campaigns gracefully
- [ ] The selector handles workspaces with many campaigns (100+) with search

#### 2.1.8 Timezone Selector

- [ ] The timezone selector displays the currently selected timezone
- [ ] Changing the timezone updates all time-based displays
- [ ] The timezone list includes all major timezones
- [ ] The timezone selector supports search and filter functionality
- [ ] The selected timezone persists in user preferences

#### 2.1.9 Dashboard Settings Panel

- [ ] The settings panel opens from the settings icon
- [ ] Widget visibility toggles work for each dashboard widget
- [ ] Widget reordering via drag-and-drop works correctly
- [ ] Settings changes persist across page refreshes
- [ ] The reset to defaults option restores original layout
- [ ] The compact mode toggle changes the layout density

#### 2.1.10 Ask AI Widget

- [ ] The Ask AI input field accepts text input
- [ ] Submitting a query sends a request to the ask API
- [ ] The response renders with proper markdown formatting
- [ ] The widget shows a loading state during response generation
- [ ] Error responses display appropriate error messages
- [ ] The widget handles network timeouts gracefully
- [ ] Previous queries are accessible in the conversation history
- [ ] The API key configuration is validated before queries

#### 2.1.11 Provider Selector

- [ ] The provider selector shows available AI model providers
- [ ] Switching providers updates the model used for Ask AI queries
- [ ] The currently selected provider is visually indicated
- [ ] Provider-specific configuration options are displayed

#### 2.1.12 Workspace Switcher

- [ ] The workspace switcher lists all workspaces for the current user
- [ ] Switching workspaces reloads all dashboard data for the new workspace
- [ ] The currently active workspace is visually indicated
- [ ] The workspace switcher handles users with a single workspace
- [ ] The workspace switcher shows the workspace name and region

### 2.2 Analytics Page (app/analytics/page.tsx)

#### 2.2.1 Page Load

- [ ] Analytics page loads without errors
- [ ] The page requires authentication and redirects if not signed in
- [ ] The page layout matches the analytics page client component structure
- [ ] Breadcrumb navigation shows the correct path
- [ ] The page title displays correctly

#### 2.2.2 Analytics Charts

- [ ] Time series charts render with correct data
- [ ] Efficiency metrics display conversion rates and ratios
- [ ] Sender breakdown shows per-sender performance data
- [ ] The daily cost chart renders expense data correctly
- [ ] All charts respond to date range filter changes
- [ ] Charts handle empty data states with appropriate messages
- [ ] Chart tooltips display accurate information
- [ ] Chart legends are interactive and toggle series visibility on click

### 2.3 Contacts Page (app/contacts/page.tsx)

#### 2.3.1 Contact List

- [ ] The contacts page loads and displays the contact table
- [ ] Contact rows display email address, first name, last name, and status
- [ ] Pagination controls work correctly (next, previous, page numbers)
- [ ] The default page size is appropriate (25 or 50 per page)
- [ ] Sorting by column headers works for each sortable column
- [ ] Search functionality filters contacts by name or email
- [ ] The total contact count is displayed correctly
- [ ] Loading skeletons appear while data is being fetched
- [ ] Empty state message appears when no contacts match the filter

#### 2.3.2 Contact Management

- [ ] Adding a new contact opens the creation form
- [ ] Required fields are validated before submission
- [ ] Duplicate email addresses are detected and reported
- [ ] Editing a contact pre-fills the form with existing data
- [ ] Deleting a contact shows a confirmation dialog
- [ ] Bulk selection allows selecting multiple contacts via checkboxes
- [ ] Bulk delete operates on all selected contacts with confirmation
- [ ] The bulk action toolbar appears when contacts are selected
- [ ] Contact status (subscribed, unsubscribed, bounced) can be updated

### 2.4 Sequences Page (app/sequences/page.tsx)

#### 2.4.1 Sequence List

- [ ] The sequences page loads and displays available sequences
- [ ] Sequence deck cards show the sequence name and step count
- [ ] Each sequence card shows the status (active, draft, completed)
- [ ] Clicking a sequence card expands the sequence detail view
- [ ] The detail view shows all email steps in order
- [ ] Each step displays the subject line and preview text
- [ ] Step metrics (sent, opened, replied, bounced) are displayed
- [ ] Creating a new sequence opens the creation workflow
- [ ] Editing a sequence allows modifying steps and content
- [ ] Deleting a sequence requires confirmation
- [ ] Sequence ordering can be rearranged

### 2.5 Settings Page (app/settings/page.tsx)

#### 2.5.1 General Settings Tab

- [ ] The general settings tab loads as the default tab
- [ ] Workspace name can be edited and saved
- [ ] Workspace description can be edited and saved
- [ ] Settings changes show a success toast notification
- [ ] Invalid input shows validation error messages
- [ ] The save button is disabled when no changes have been made

#### 2.5.2 Security Settings Tab

- [ ] The security tab displays current security configuration
- [ ] Two-factor authentication setup modal opens correctly
- [ ] Two-factor authentication can be enabled and disabled
- [ ] Backup codes are generated and displayed during 2FA setup
- [ ] Active sessions list shows all current sessions
- [ ] Individual sessions can be revoked from the active sessions modal
- [ ] Password change functionality works correctly
- [ ] Security audit log shows recent security events

#### 2.5.3 Config Vault Tab

- [ ] The config vault tab displays stored credentials
- [ ] Credentials are masked by default
- [ ] Clicking reveal shows the credential value temporarily
- [ ] Adding a new credential validates the key and value format
- [ ] Editing a credential updates the stored value
- [ ] Deleting a credential requires confirmation
- [ ] Credential categories are organized by service

#### 2.5.4 Workspace Members Table

- [ ] The members table lists all workspace members
- [ ] Each row shows the member name, email, role, and join date
- [ ] The role selector allows changing member roles (admin, member, viewer)
- [ ] Role changes require appropriate permissions
- [ ] Inviting a new member sends an invitation email
- [ ] Pending invitations are displayed separately
- [ ] Invitations can be revoked before acceptance
- [ ] Removing a member requires confirmation

### 2.6 Admin Page (app/admin/page.tsx)

#### 2.6.1 Access Control

- [ ] The admin page is only accessible to users with super_admin role
- [ ] Non-admin users are redirected to access-denied component
- [ ] The access-denied page displays an appropriate message

#### 2.6.2 Super Admin Panel

- [ ] The super admin panel renders with all admin tabs
- [ ] Tab navigation works correctly between all admin sections
- [ ] The currently active tab is visually highlighted

#### 2.6.3 API Health Tab

- [ ] The API health tab displays the services table with all monitored services
- [ ] Each service row shows the service name, status, response time, and last check
- [ ] Status indicators use correct colors (green healthy, red down, yellow degraded)
- [ ] The run checks button triggers an immediate health check
- [ ] Health check results update the table in real-time
- [ ] Historical health data can be viewed for each service
- [ ] The diagnostics view provides detailed service information

#### 2.6.4 Scale Health Tab

- [ ] The scale health tab shows current system metrics
- [ ] CPU utilization is displayed with threshold indicators
- [ ] Memory usage is displayed with threshold indicators
- [ ] Active alerts are listed with severity levels
- [ ] Alert acknowledgment button works correctly
- [ ] Alert resolution button works correctly
- [ ] Historical metrics can be viewed over time

#### 2.6.5 Audit Log Viewer

- [ ] The audit log viewer displays recent audit events
- [ ] Events can be filtered by action category
- [ ] Events can be filtered by date range
- [ ] Events can be filtered by actor (user or system)
- [ ] Event details expand to show full context
- [ ] Pagination works correctly for large audit trails
- [ ] Export functionality downloads events as a file

#### 2.6.6 Migration Control Tab

- [ ] The migration control tab shows current migration status
- [ ] Migration initialization can be triggered
- [ ] Dual-write mode can be enabled and disabled
- [ ] Backfill progress is displayed with percentage
- [ ] Parity check results are displayed
- [ ] Cutover execution button is available with confirmation
- [ ] Rollback button is available in case of issues

#### 2.6.7 Disaster Recovery Tab

- [ ] The disaster recovery tab shows current DR status
- [ ] Snapshot list displays available snapshots with timestamps
- [ ] Creating a manual snapshot triggers the snapshot process
- [ ] Snapshot details can be viewed (size, duration, type)
- [ ] Failover can be initiated from this tab
- [ ] Recovery statistics are displayed (RPO, RTO)
- [ ] Health status of the DR system is shown

#### 2.6.8 Fleet Updates Tab

- [ ] The fleet updates tab shows current update status
- [ ] Available versions are listed for each component
- [ ] Rollout initiation form allows selecting component and version
- [ ] Rollout strategy selection (canary, staged, immediate) works
- [ ] Active rollout progress is displayed with wave information
- [ ] Emergency rollback button is available with confirmation
- [ ] Update templates can be viewed and applied
- [ ] Rollout history is accessible

### 2.7 Onboarding Page (app/onboarding/page.tsx)

#### 2.7.1 Genesis Onboarding Wizard

- [ ] The onboarding page loads with the genesis wizard
- [ ] The wizard shows the current stage and total stages
- [ ] Progress indicator accurately reflects completion
- [ ] Navigation between stages works (next, back)
- [ ] Stage validation prevents advancing with incomplete data

#### 2.7.2 Region Selection Stage

- [ ] Available regions are displayed with descriptions
- [ ] Only one region can be selected at a time
- [ ] The selected region is visually highlighted
- [ ] Region selection persists when navigating between stages

#### 2.7.3 Brand Info Stage

- [ ] Company name input accepts text and validates
- [ ] Website URL input validates URL format
- [ ] Auto-scrape button fetches brand information from the URL
- [ ] Auto-scraped data pre-fills relevant fields
- [ ] Manual entry allows overriding auto-scraped data

#### 2.7.4 API Key Input Stages

- [ ] OpenAI key stage validates the API key format
- [ ] Anthropic key stage validates the API key format
- [ ] Google CSE key stage validates the key format
- [ ] Relevance AI key stage validates the key format
- [ ] Each key validation makes a test API call to verify
- [ ] Invalid keys show clear error messages
- [ ] Valid keys show success confirmation
- [ ] Keys can be pasted from clipboard

#### 2.7.5 Email Provider Selection Stage

- [ ] Gmail OAuth option is available
- [ ] SMTP configuration option is available
- [ ] Selecting Gmail initiates the OAuth flow
- [ ] Selecting SMTP shows the SMTP configuration form

#### 2.7.6 Gmail OAuth Stage

- [ ] The authorize button opens the Google OAuth consent screen
- [ ] Successful authorization returns to the wizard with confirmation
- [ ] Failed authorization shows an appropriate error
- [ ] The callback URL is correctly configured

#### 2.7.7 SMTP Configuration Stage

- [ ] SMTP host input accepts and validates server addresses
- [ ] SMTP port input accepts and validates port numbers
- [ ] Username and password fields are present
- [ ] TLS and SSL toggle is available
- [ ] Test connection button verifies SMTP settings
- [ ] Successful test shows confirmation
- [ ] Failed test shows detailed error information

#### 2.7.8 DNS Setup Stage

- [ ] Required DNS records are displayed with copy buttons
- [ ] SPF record is shown with the correct value
- [ ] DKIM record is shown with the correct value
- [ ] DMARC record is shown with the correct value
- [ ] Verify button checks DNS propagation
- [ ] Verification results show which records pass and fail
- [ ] Entri DNS integration is available as an automated option

#### 2.7.9 Calendly URL Stage

- [ ] Calendly URL input accepts and validates URLs
- [ ] The URL format is validated for the calendly.com domain
- [ ] Invalid URLs show clear error messages

#### 2.7.10 Apify Selection Stage

- [ ] Available Apify actors are listed
- [ ] Selection persists when navigating between stages

#### 2.7.11 Ignition Stage

- [ ] The ignition stage shows a summary of all configurations
- [ ] The launch button initiates the provisioning process
- [ ] Provisioning progress is displayed in real-time
- [ ] Each provisioning step shows status (pending, in-progress, complete, failed)
- [ ] Error handling displays failures with recovery suggestions
- [ ] Successful provisioning redirects to the dashboard

### 2.8 Sandbox Page (app/sandbox/page.tsx)

#### 2.8.1 Sandbox Panel

- [ ] The sandbox page loads with the test runner interface
- [ ] Configuration section displays current sandbox settings
- [ ] Config status bar shows active configuration state

#### 2.8.2 Test Runner

- [ ] Test campaign creation form is available
- [ ] Test execution can be triggered
- [ ] Execution monitor displays real-time progress
- [ ] Execution results are shown upon completion
- [ ] Execution history lists previous test runs
- [ ] Individual execution details can be viewed
- [ ] Failed executions show error details

### 2.9 Authentication Pages

#### 2.9.1 Sign In Page

- [ ] The sign-in page renders the Clerk sign-in component
- [ ] Email and password authentication works correctly
- [ ] Social authentication providers (if configured) are displayed
- [ ] Invalid credentials show appropriate error messages
- [ ] Successful sign-in redirects to the dashboard
- [ ] The sign-in page is accessible without authentication
- [ ] The forgot password flow works correctly
- [ ] Two-factor authentication challenge appears when enabled

#### 2.9.2 Sign Up Page

- [ ] The sign-up page renders the Clerk sign-up component
- [ ] Account creation with valid information works correctly
- [ ] Email verification is required before access
- [ ] Duplicate email addresses are rejected
- [ ] Password strength requirements are enforced
- [ ] Successful sign-up redirects to onboarding

### 2.10 Join Page (app/join/page.tsx)

- [ ] The join page accepts a workspace invitation token
- [ ] Valid tokens add the user to the workspace
- [ ] Expired tokens display an appropriate message
- [ ] Invalid tokens display an appropriate message
- [ ] The user is redirected to the workspace after joining
- [ ] Already-joined users see an appropriate message

### 2.11 Not Found Page (app/not-found.tsx)

- [ ] Navigating to a non-existent route displays the 404 page
- [ ] The 404 page shows a helpful message
- [ ] A link back to the dashboard is provided
- [ ] The page maintains the application layout

---


## SECTION III: COMPONENT TESTING -- PART 1 (Admin, Campaigns, Dashboard)

### 3.1 Admin Components

#### 3.1.1 Super Admin Panel (components/admin/super-admin-panel.tsx)

- [ ] The panel renders all admin tabs in the correct order
- [ ] Tab switching does not cause data loss in other tabs
- [ ] Each tab lazy-loads its content on first activation
- [ ] The panel is not rendered for non-admin users
- [ ] The panel handles loading states for each tab independently

#### 3.1.2 API Health Services Table (components/admin/api-health-services-table.tsx)

- [ ] The table renders all monitored services in rows
- [ ] Status badges show correct color for healthy state (green)
- [ ] Status badges show correct color for degraded state (yellow)
- [ ] Status badges show correct color for down state (red)
- [ ] Response time column shows millisecond values
- [ ] Last checked column shows relative timestamps
- [ ] Row click expands to show service detail information
- [ ] The table handles services with no check history
- [ ] The table updates when new health check data arrives

#### 3.1.3 API Health Tab (components/admin/api-health-tab.tsx)

- [ ] The tab integrates the services table and health runner controls
- [ ] The run all checks button triggers health checks for every service
- [ ] Individual service check buttons trigger single service checks
- [ ] Check results update the table in real-time after completion
- [ ] The tab displays the last full run timestamp
- [ ] Error states during checks are displayed inline

#### 3.1.4 Alert History Tab (components/admin/alert-history-tab.tsx)

- [ ] Alert history lists all past and current alerts in reverse chronological order
- [ ] Each alert row shows severity (critical, warning, info)
- [ ] Each alert row shows the message text
- [ ] Each alert row shows the timestamp
- [ ] Each alert row shows the current status (active, acknowledged, resolved)
- [ ] Alerts can be filtered by severity level
- [ ] Alerts can be filtered by date range
- [ ] Resolved and unresolved alerts are visually distinguishable
- [ ] The list paginates correctly for large alert histories

#### 3.1.5 Audit Log Viewer (components/admin/audit-log-viewer.tsx)

- [ ] The viewer displays paginated audit events
- [ ] Event rows show timestamp, actor, action, and target columns
- [ ] Expanding a row shows the full event details as formatted data
- [ ] Category filter dropdown lists all available action categories
- [ ] Selecting a category filters the event list
- [ ] The viewer handles large audit trails without performance issues
- [ ] Date range filtering narrows results to the selected period
- [ ] Export button generates a downloadable file of filtered events

#### 3.1.6 Disaster Recovery Tab (components/admin/disaster-recovery-tab.tsx)

- [ ] The tab shows DR system status summary with current state
- [ ] Snapshot creation button is functional and triggers the snapshot process
- [ ] Snapshot list shows all snapshots with size, duration, and type metadata
- [ ] Failover controls are available with safety confirmation dialogs
- [ ] Restoration controls display target snapshot selection
- [ ] RPO and RTO statistics are displayed with current values
- [ ] Health indicators show the overall DR readiness state

#### 3.1.7 Fleet Updates Tab (components/admin/fleet-updates-tab.tsx)

- [ ] The tab shows current fleet component statuses
- [ ] Active rollouts display progress bars with wave indicators
- [ ] Version comparison shows current version vs target version
- [ ] Emergency rollback button is prominent and requires double confirmation
- [ ] Template selection dropdown lists available update templates
- [ ] Rollout initiation form validates inputs before submission
- [ ] Historical rollout records are accessible

#### 3.1.8 Migration Control Tab (components/admin/migration-control-tab.tsx)

- [ ] The tab shows the current migration phase with visual indicators
- [ ] Phase transition buttons are enabled only when the prerequisite phase is complete
- [ ] Progress indicators show percentage for backfill and parity operations
- [ ] Error states are clearly displayed with details
- [ ] Rollback option is available with confirmation dialog
- [ ] Migration status auto-refreshes at a reasonable interval

#### 3.1.9 Scale Health Tab (components/admin/scale-health-tab.tsx)

- [ ] The tab shows real-time CPU and memory utilization metrics
- [ ] Threshold lines are visible on metric charts at configured limits
- [ ] Alert configuration controls allow setting thresholds
- [ ] Historical comparison charts render correctly over time
- [ ] The run checks button triggers an immediate health scan
- [ ] Results update the display without full page reload

### 3.2 Campaign Components

#### 3.2.1 Campaign Wizard (components/campaigns/campaign-wizard.tsx)

- [ ] The wizard opens as a multi-step modal or page
- [ ] Step 1 collects campaign name and description with validation
- [ ] Step 2 configures the email sequence with template selection
- [ ] Step 3 selects contacts or uploads a CSV contact list
- [ ] Step 4 reviews the full campaign configuration before launch
- [ ] Step 5 confirms and creates the campaign via the API
- [ ] Navigation between steps preserves all form data
- [ ] Validation prevents advancing with incomplete required fields
- [ ] The wizard handles back navigation without data loss
- [ ] The cancel button discards all changes with a confirmation prompt
- [ ] The wizard handles network errors during submission gracefully
- [ ] Progress indicators show which step the user is on

#### 3.2.2 New Campaign Modal (components/campaigns/new-campaign-modal.tsx)

- [ ] The modal opens from the create campaign button on the dashboard
- [ ] The modal overlay dims the background content
- [ ] The modal can be closed with the X button
- [ ] The modal can be closed with the Escape key
- [ ] Form submission sends a POST request to the campaigns API
- [ ] Loading state is shown during campaign creation
- [ ] Success closes the modal and refreshes the campaign list
- [ ] Error shows an appropriate message without closing the modal
- [ ] The modal prevents interaction with background elements

#### 3.2.3 Provisioning Progress (components/campaigns/provisioning-progress.tsx)

- [ ] The progress component shows each provisioning step in order
- [ ] Steps transition through pending, active, and complete states visually
- [ ] Failed steps show error details with a red indicator
- [ ] The overall progress bar percentage updates with each completed step
- [ ] The component polls the provision-status API for updates
- [ ] Completion triggers a success state and optional redirect

#### 3.2.4 Template Gallery (components/campaigns/template-gallery.tsx)

- [ ] The gallery displays available email templates in a grid layout
- [ ] Template cards show a preview snippet, name, and category
- [ ] Selecting a template populates the campaign with template content
- [ ] Templates can be filtered by category using dropdown or tabs
- [ ] Templates can be searched by name using a text input
- [ ] The gallery handles zero templates with an empty state message

### 3.3 Dashboard Components

#### 3.3.1 Metric Card (components/dashboard/metric-card.tsx)

- [ ] The metric card renders the label text correctly
- [ ] The metric card renders the primary numeric value
- [ ] The metric card shows the percentage change with an up or down indicator
- [ ] The skeleton loading state renders with proper dimensions matching the card
- [ ] The card handles very large numbers with abbreviated formatting (1.2K, 3.5M)
- [ ] The card handles decimal values with appropriate rounding
- [ ] The card handles negative values with proper sign display
- [ ] The card applies the correct card styling from the UI design system

#### 3.3.2 Daily Sends Chart (components/dashboard/daily-sends-chart.tsx)

- [ ] The chart renders a bar or line visualization of daily send data
- [ ] The x-axis shows dates in the correct locale format
- [ ] The y-axis scales appropriately to the maximum data value
- [ ] The chart container maintains responsive dimensions on window resize
- [ ] The summary footer shows Total sends and Average per Day
- [ ] The chart handles timezone-adjusted data display correctly
- [ ] The chart color scheme follows the active theme (light or dark mode)
- [ ] The caption text updates based on the selected date range

#### 3.3.3 Donut Chart (components/dashboard/donut-chart.tsx)

- [ ] The donut chart renders with correct segment proportions relative to data
- [ ] Colors are assigned consistently to each data segment
- [ ] The inner radius creates the correct donut hole appearance
- [ ] Hover effects highlight the active segment and dim others
- [ ] The chart handles very small percentage segments without visual glitches
- [ ] The chart handles a single segment displaying as a full ring

#### 3.3.4 Step Breakdown (components/dashboard/step-breakdown.tsx)

- [ ] The step breakdown component connects to the donut chart data
- [ ] The legend list renders all email steps with matching colors
- [ ] Each legend item shows the count value and calculated percentage
- [ ] The breakdown handles missing step data without errors
- [ ] Steps with zero counts are included but shown as 0

#### 3.3.5 Time Series Chart (components/dashboard/time-series-chart.tsx)

- [ ] The time series chart renders line data over the selected time period
- [ ] Multiple data series can be displayed simultaneously with different colors
- [ ] The tooltip shows values for all series at the hover position
- [ ] The chart handles gaps in data (missing dates) without connecting across gaps
- [ ] Axis labels are readable and do not overlap on small viewports
- [ ] The chart legend identifies each series by name and color

#### 3.3.6 Campaign Table (components/dashboard/campaign-table.tsx)

- [ ] The campaign table renders all campaign rows with correct data
- [ ] Columns include name, status, sent count, opened count, replied count, and bounced count
- [ ] Table sorting works on each column header click (ascending and descending)
- [ ] The table handles empty data with an empty state message
- [ ] Row click navigates to the campaign detail view or expands the row

#### 3.3.7 Campaign Card Stack (components/dashboard/campaign-card-stack.tsx)

- [ ] Cards stack vertically with consistent spacing between cards
- [ ] Each card shows the campaign name and status badge
- [ ] The card shows quick metrics including sent count and open rate
- [ ] The campaign toggle switch controls campaign active or paused state
- [ ] Cards handle long campaign names with ellipsis truncation

#### 3.3.8 Campaign Management Card Stack (components/dashboard/campaign-management-card-stack.tsx)

- [ ] The management card stack provides extended controls beyond the basic stack
- [ ] Each card includes edit and delete action buttons
- [ ] Bulk operations are accessible from the card stack header
- [ ] The stack handles workspace with many campaigns via scrolling

#### 3.3.9 Campaign Management Table (components/dashboard/campaign-management-table.tsx)

- [ ] The management table shows all campaigns with full operational details
- [ ] Bulk selection checkboxes work correctly for all rows
- [ ] The bulk action toolbar appears when one or more rows are selected
- [ ] Individual row actions (edit, delete, toggle status) work correctly
- [ ] The table supports column resizing or has appropriate fixed widths

#### 3.3.10 Campaign Pulse (components/dashboard/campaign-pulse.tsx)

- [ ] The campaign pulse widget shows real-time campaign activity indicators
- [ ] Pulse animations indicate recent send, open, or reply events
- [ ] The widget updates automatically without full page refresh
- [ ] The widget handles campaigns with no recent activity

#### 3.3.11 Campaign Toggle (components/dashboard/campaign-toggle.tsx)

- [ ] The toggle switch renders in the correct initial state (on for active, off for paused)
- [ ] Clicking the toggle sends a PATCH request to the campaign toggle API
- [ ] The toggle shows a loading or disabled state during the API request
- [ ] Successful toggle updates the visual state to reflect the new status
- [ ] Failed toggle reverts the visual state and shows an error toast notification
- [ ] The toggle is disabled during the API call to prevent double submissions

#### 3.3.12 Campaign Selector (components/dashboard/campaign-selector.tsx)

- [ ] The dropdown lists all campaigns for the current workspace
- [ ] The All Campaigns option is present at the top of the list
- [ ] Selecting a campaign updates the dashboard context to filter data
- [ ] The currently selected campaign shows a visual indicator (check mark)
- [ ] The dropdown handles many campaigns with scrollable overflow

#### 3.3.13 Date Range Picker (components/dashboard/date-range-picker.tsx)

- [ ] The picker button shows the currently selected range as text
- [ ] The popover calendar opens on button click
- [ ] Preset ranges (7 days, 14 days, 30 days, 90 days) apply correctly
- [ ] Custom range selection works by clicking start and end dates
- [ ] The apply button commits the date selection
- [ ] The cancel button discards unapplied changes
- [ ] Clicking outside the popover closes it

#### 3.3.14 Date Range Picker Content (components/dashboard/date-range-picker-content.tsx)

- [ ] The calendar grid renders the correct month layout with proper day alignment
- [ ] Previous and next month navigation arrows work correctly
- [ ] Selected start date is highlighted with a distinct style
- [ ] Selected end date is highlighted with a distinct style
- [ ] The range between start and end dates shows a background highlight
- [ ] Dates after today are handled appropriately
- [ ] Year navigation is available if applicable

#### 3.3.15 Date Range Picker Mobile (components/dashboard/date-range-picker-mobile.tsx)

- [ ] The mobile picker uses a bottom sheet instead of a desktop popover
- [ ] The bottom sheet slides up from the bottom of the screen
- [ ] Touch scrolling works within the date picker content
- [ ] The close gesture (swipe down) dismisses the sheet
- [ ] The picker fits within mobile viewport dimensions

#### 3.3.16 Timezone Selector (components/dashboard/timezone-selector.tsx)

- [ ] The timezone selector shows the current timezone abbreviation or name
- [ ] Clicking opens the timezone selection list
- [ ] Search input filters the timezone list as the user types
- [ ] Selecting a timezone closes the list and updates the dashboard context

#### 3.3.17 Timezone Selector Content (components/dashboard/timezone-selector-content.tsx)

- [ ] The content list displays all supported timezones grouped by region
- [ ] Each timezone entry shows the offset and full name
- [ ] The list handles keyboard navigation for accessibility
- [ ] The currently selected timezone is visually marked

#### 3.3.18 Dashboard Widget (components/dashboard/dashboard-widget.tsx)

- [ ] The widget wrapper provides consistent card styling for all widgets
- [ ] The widget header shows the title text
- [ ] The drag handle is visible when the dashboard is in edit mode
- [ ] The widget respects visibility settings from the dashboard layout context
- [ ] The widget handles content overflow appropriately

#### 3.3.19 Mobile Collapsible Widget (components/dashboard/mobile-collapsible-widget.tsx)

- [ ] On mobile viewports the widget renders in collapsed mode by default
- [ ] Tapping the header expands the widget to show content
- [ ] Tapping again collapses the widget
- [ ] The expand and collapse animation is smooth with no jank
- [ ] The collapsed state shows the widget title and an expand icon

#### 3.3.20 Dashboard Settings Panel (components/dashboard/dashboard-settings-panel.tsx)

- [ ] The panel slides in from the right side of the viewport
- [ ] Toggle switches control visibility for each dashboard widget
- [ ] Drag-and-drop reordering of widgets changes the dashboard layout
- [ ] The close button or clicking outside closes the panel
- [ ] Changes are saved to local storage or user preference storage
- [ ] Reset to defaults restores the original widget order and visibility

#### 3.3.21 Compact Controls (components/dashboard/compact-controls.tsx)

- [ ] The compact mode toggle reduces widget padding and margins
- [ ] The control renders in the dashboard settings area
- [ ] Toggling compact mode updates all widgets immediately

#### 3.3.22 Share Dialog (components/dashboard/share-dialog.tsx)

- [ ] The share dialog opens from the share button on the dashboard
- [ ] The dialog generates a shareable URL
- [ ] The copy link button copies the URL to the system clipboard
- [ ] A success toast confirms the URL was copied
- [ ] The dialog closes on submit or cancel button click

#### 3.3.23 Efficiency Metrics (components/dashboard/efficiency-metrics.tsx)

- [ ] Open rate percentage is calculated correctly from sent and opened counts
- [ ] Reply rate percentage is calculated correctly from sent and replied counts
- [ ] Bounce rate percentage is calculated correctly from sent and bounced counts
- [ ] Overall conversion rate is displayed
- [ ] Metrics handle division by zero gracefully (zero sent count)
- [ ] Percentage values are formatted to appropriate decimal places

#### 3.3.24 Sender Breakdown (components/dashboard/sender-breakdown.tsx)

- [ ] The sender breakdown table lists all sending addresses
- [ ] Each row shows sender email, sent count, and performance metrics
- [ ] Sorting by any column works correctly in ascending and descending order
- [ ] The table handles a workspace with a single sender
- [ ] The table handles a workspace with many senders via pagination or scrolling

#### 3.3.25 Daily Cost Chart (components/dashboard/daily-cost-chart.tsx)

- [ ] The cost chart renders daily expense data as a bar or line chart
- [ ] The y-axis shows currency values formatted according to workspace settings
- [ ] Cost data handles the configured currency (USD, EUR, etc.)
- [ ] The chart shows tooltip with cost breakdown on hover
- [ ] The chart handles days with zero cost correctly

#### 3.3.26 Lazy Charts (components/dashboard/lazy-charts.tsx)

- [ ] Charts wrapped in lazy loading render only when they enter the viewport
- [ ] A loading placeholder is shown before the chart component loads
- [ ] Lazy loading does not cause visible layout shifts when charts appear

#### 3.3.27 Safe Components (components/dashboard/safe-components.tsx)

- [ ] Safe component wrappers catch render errors in child components
- [ ] A chart error does not crash the entire dashboard page
- [ ] The error fallback UI shows a retry button
- [ ] Clicking retry re-renders the failed component

#### 3.3.28 Ask AI (components/dashboard/ask-ai.tsx)

- [ ] The Ask AI input accepts user text queries
- [ ] Pressing Enter or clicking submit sends the query to the API
- [ ] The response area shows a loading indicator while waiting
- [ ] Responses render with proper markdown formatting and styling
- [ ] Error states show user-friendly messages
- [ ] The input is cleared or retained based on UX preference after submission
- [ ] Network timeout is handled with a timeout message

#### 3.3.29 Provider Selector (components/dashboard/provider-selector.tsx)

- [ ] Available AI providers are listed (OpenAI, Anthropic, etc.)
- [ ] Switching providers changes the model used for queries
- [ ] The currently selected provider has a visual indicator
- [ ] Providers without configured API keys are marked as unavailable

#### 3.3.30 Workspace Switcher (components/dashboard/workspace-switcher.tsx)

- [ ] All workspaces the user belongs to are listed
- [ ] Switching workspaces reloads dashboard data for the selected workspace
- [ ] The active workspace has a check mark or highlight
- [ ] Users with a single workspace still see the switcher but it is informational only

---


## SECTION IV: COMPONENT TESTING -- PART 2 (Genesis, Layout, Mobile, Onboarding, Sandbox, Sequences, Settings, UI, Workspace)

### 4.1 Genesis Components

#### 4.1.1 Genesis Onboarding Client (components/genesis/genesis-onboarding-client.tsx)

- [ ] The client component initializes onboarding state from the server
- [ ] The component renders the correct starting stage based on saved progress
- [ ] State transitions between stages are tracked client-side
- [ ] The component communicates with the progress API to save stage completion
- [ ] Error boundaries catch and display stage-level errors

#### 4.1.2 Genesis Onboarding Wizard (components/genesis/genesis-onboarding-wizard.tsx)

- [ ] The wizard renders all stages in the correct sequence
- [ ] The progress bar updates as stages are completed
- [ ] The next button advances to the next stage after validation
- [ ] The back button returns to the previous stage without data loss
- [ ] The wizard disables the next button when the current stage is incomplete
- [ ] The wizard handles the final stage transition to ignition

#### 4.1.3 Region Selection Stage (components/genesis/stages/region-selection-stage.tsx)

- [ ] All available DigitalOcean regions are displayed with labels
- [ ] Each region shows the geographic location description
- [ ] Clicking a region card selects it and deselects others
- [ ] The selected region has a distinct visual highlight
- [ ] The selection is validated before allowing advancement

#### 4.1.4 Brand Info Stage (components/genesis/stages/brand-info-stage.tsx)

- [ ] The company name field validates for minimum length
- [ ] The website URL field validates correct URL format
- [ ] The auto-scrape button triggers brand data fetching
- [ ] Auto-scraped results populate the form fields
- [ ] Manual edits override auto-scraped values
- [ ] Error during scraping shows a user-friendly message

#### 4.1.5 API Key Input Stage (components/genesis/stages/api-key-input-stage.tsx)

- [ ] The input field accepts API key text with proper masking
- [ ] The validate button triggers key verification via API
- [ ] Valid key shows a green success indicator
- [ ] Invalid key shows a red error indicator with explanation
- [ ] The input supports paste from clipboard

#### 4.1.6 OpenAI Key Stage (components/genesis/stages/openai-key-stage.tsx)

- [ ] The stage specifically validates OpenAI API key format (sk-...)
- [ ] Validation makes a lightweight test call to verify the key works
- [ ] The stage stores the validated key via the credentials API

#### 4.1.7 Anthropic Key Stage (components/genesis/stages/anthropic-key-stage.tsx)

- [ ] The stage validates Anthropic API key format
- [ ] Validation makes a test call to the Anthropic API
- [ ] Success or failure is clearly communicated

#### 4.1.8 Google CSE Key Stage (components/genesis/stages/google-cse-key-stage.tsx)

- [ ] The stage collects both the API key and CSE ID
- [ ] Both values are validated against the Google API
- [ ] Missing either value prevents advancement

#### 4.1.9 Relevance Key Stage (components/genesis/stages/relevance-key-stage.tsx)

- [ ] The stage validates the Relevance AI API key
- [ ] Validation confirms the key provides access to required endpoints

#### 4.1.10 Email Provider Selection Stage (components/genesis/stages/email-provider-selection-stage.tsx)

- [ ] Gmail and SMTP options are presented as selectable cards
- [ ] Only one option can be selected at a time
- [ ] Selecting an option stores the provider choice in state

#### 4.1.11 Gmail OAuth Stage (components/genesis/stages/gmail-oauth-stage.tsx)

- [ ] The authorize button opens a new window for Google OAuth consent
- [ ] Successful OAuth callback stores the refresh token
- [ ] The stage shows the connected email address after authorization
- [ ] Re-authorization replaces the previous connection

#### 4.1.12 SMTP Configuration Stage (components/genesis/stages/smtp-configuration-stage.tsx)

- [ ] All SMTP fields (host, port, username, password) accept input
- [ ] The test connection button sends a test email or validates connectivity
- [ ] Success displays a confirmation message
- [ ] Failure displays the specific SMTP error

#### 4.1.13 DNS Setup Stage (components/genesis/stages/dns-setup-stage.tsx)

- [ ] SPF, DKIM, and DMARC records are displayed with correct values
- [ ] Copy buttons copy each record value to the clipboard
- [ ] The verify button checks DNS propagation status
- [ ] Per-record verification results show pass or fail for each record
- [ ] The Entri automated DNS option is available and functional

#### 4.1.14 Calendly URL Stage (components/genesis/stages/calendly-url-stage.tsx)

- [ ] The URL input validates that the value is a valid calendly.com URL
- [ ] Invalid formats show an error message

#### 4.1.15 Apify Selection Stage (components/genesis/stages/apify-selection-stage.tsx)

- [ ] Available Apify actors for LinkedIn scraping are listed
- [ ] The selection persists across stage navigation

#### 4.1.16 Ignition Stage (components/genesis/stages/ignition-stage.tsx)

- [ ] The stage displays a configuration summary of all collected data
- [ ] The launch button initiates the provisioning orchestrator
- [ ] Real-time provisioning progress is displayed with step-by-step updates
- [ ] Individual step failures show error details
- [ ] Overall success redirects to the dashboard
- [ ] Overall failure provides recovery guidance

### 4.2 Layout Components

#### 4.2.1 Client Shell (components/layout/client-shell.tsx)

- [ ] The client shell wraps all page content correctly
- [ ] Theme context is provided to all child components
- [ ] Authentication state is checked and handled
- [ ] Error boundaries catch and display errors gracefully
- [ ] The sidebar context is provided to descendant components
- [ ] Hydration mismatches do not occur between server and client renders

#### 4.2.2 Sidebar (components/layout/sidebar.tsx)

- [ ] The sidebar renders all navigation links in the correct order
- [ ] Each navigation link points to the correct application route
- [ ] The active route is visually highlighted with a distinct style
- [ ] The sidebar collapses to icon-only mode on viewports below 768px
- [ ] The expand and collapse toggle button works on desktop
- [ ] The collapsed sidebar shows only icon representations for each link
- [ ] Navigation links show tooltips on hover in collapsed mode
- [ ] The sidebar width transition animates smoothly without jank
- [ ] The sidebar respects the sidebar context state for open or closed
- [ ] The admin link is visible only to users with admin role

#### 4.2.3 Header (components/layout/header.tsx)

- [ ] The header renders at the top of every page
- [ ] The header displays the current page title based on the route
- [ ] The header height is consistent across all pages
- [ ] The header is sticky and remains visible during vertical scroll

#### 4.2.4 Top Navbar (components/layout/top-navbar.tsx)

- [ ] The top navbar displays the user avatar from Clerk authentication
- [ ] The user menu opens on avatar click
- [ ] The sign out option is available and functional in the user menu
- [ ] The sign out transition animation plays correctly on logout
- [ ] The navbar displays notification indicators when notifications exist
- [ ] The notification dropdown shows recent notification entries
- [ ] The system health bar is visible in the navbar with color status
- [ ] Theme toggle switches between light and dark mode instantly

#### 4.2.5 Command Palette (components/layout/command-palette.tsx)

- [ ] The command palette opens with the Cmd+K (macOS) or Ctrl+K keyboard shortcut
- [ ] The search input accepts text and filters available commands
- [ ] Page navigation commands appear in the results list
- [ ] Action commands (create campaign, add contact) appear in results
- [ ] Selecting a command navigates to the target or executes the action
- [ ] The palette closes when a command is selected
- [ ] The palette closes on Escape key press
- [ ] The palette closes when clicking outside the modal
- [ ] Recent commands are tracked and shown at the top of results
- [ ] An empty results state shows a helpful no matches message

#### 4.2.6 Layout Wrapper (components/layout/layout-wrapper.tsx)

- [ ] The layout wrapper provides consistent page structure for all routes
- [ ] The wrapper handles responsive padding for mobile, tablet, and desktop
- [ ] The wrapper integrates sidebar and navbar components correctly

### 4.3 Mobile Components

#### 4.3.1 Bottom Navigation (components/mobile/bottom-nav.tsx)

- [ ] The bottom navigation bar renders on mobile viewports only
- [ ] All primary navigation links are present (Dashboard, Contacts, Sequences, Settings)
- [ ] The active tab is highlighted with a distinct style
- [ ] Tapping a tab navigates to the correct page
- [ ] The bar is fixed to the bottom of the viewport

#### 4.3.2 Bottom Sheet (components/mobile/bottom-sheet.tsx)

- [ ] The bottom sheet slides up from the bottom of the screen
- [ ] The sheet can be dismissed by swiping down
- [ ] The sheet can be dismissed by tapping the overlay
- [ ] The sheet content is scrollable within its bounds
- [ ] The sheet height is configurable (half, full, auto)

#### 4.3.3 Collapsible Section (components/mobile/collapsible-section.tsx)

- [ ] The section renders with a header and collapsed body
- [ ] Tapping the header toggles the body visibility
- [ ] The expand and collapse indicator rotates appropriately
- [ ] Animation between states is smooth

#### 4.3.4 Floating Action Button (components/mobile/floating-action-button.tsx)

- [ ] The FAB renders in the bottom-right corner on mobile viewports
- [ ] Tapping the FAB opens a quick action menu
- [ ] Quick actions include creating campaigns, adding contacts, etc.
- [ ] The FAB does not overlap with the bottom navigation bar

#### 4.3.5 Mobile Drawer (components/mobile/mobile-drawer.tsx)

- [ ] The drawer slides in from the left side
- [ ] The drawer includes all sidebar navigation links
- [ ] Tapping a link navigates and closes the drawer
- [ ] The overlay behind the drawer dims the background
- [ ] Swiping left closes the drawer

#### 4.3.6 Mobile Header (components/mobile/mobile-header.tsx)

- [ ] The mobile header shows the page title
- [ ] The hamburger menu icon opens the mobile drawer
- [ ] The header is compact to preserve vertical space on small screens

### 4.4 Onboarding Components

#### 4.4.1 Onboarding Tour (components/onboarding/onboarding-tour.tsx)

- [ ] The onboarding tour activates for first-time users
- [ ] Tour steps highlight specific UI elements with tooltips
- [ ] The next button advances to the next tour step
- [ ] The skip button ends the tour early
- [ ] Tour completion is recorded so it does not repeat
- [ ] The tour overlay prevents interaction with non-highlighted elements

### 4.5 Sandbox Components

#### 4.5.1 Sandbox Panel (components/sandbox/sandbox-panel.tsx)

- [ ] The panel renders the test campaign creation interface
- [ ] The panel shows execution history below the creation form
- [ ] Loading states are displayed while fetching history data

#### 4.5.2 Configuration Section (components/sandbox/configuration-section.tsx)

- [ ] The configuration section displays sandbox-specific settings
- [ ] Settings can be modified for the current test run
- [ ] Default configuration values are pre-filled

#### 4.5.3 Config Status Bar (components/sandbox/config-status-bar.tsx)

- [ ] The status bar shows whether the sandbox configuration is valid
- [ ] Invalid configuration shows specific error details
- [ ] The status bar updates when configuration changes

#### 4.5.4 Execution Monitor (components/sandbox/execution-monitor.tsx)

- [ ] The monitor displays real-time execution progress
- [ ] Step-by-step completion is shown visually
- [ ] Errors during execution are highlighted with red indicators
- [ ] The monitor auto-scrolls to show the latest step

#### 4.5.5 Test Runner (components/sandbox/test-runner.tsx)

- [ ] The test runner form collects test campaign parameters
- [ ] The run button triggers execution via the sandbox API
- [ ] The runner disables the form during execution
- [ ] Results are displayed after execution completes

### 4.6 Sequence Components

#### 4.6.1 Sequence Deck Card (components/sequences/sequence-deck-card.tsx)

- [ ] The card displays the sequence name prominently
- [ ] The card shows the number of email steps
- [ ] The card shows the sequence status with an appropriate badge
- [ ] Clicking the card expands to show the sequence detail

#### 4.6.2 Sequence Detail (components/sequences/sequence-detail.tsx)

- [ ] The detail view shows all email steps in sequential order
- [ ] Each step shows subject line, body preview, and timing
- [ ] Step performance metrics are displayed if the sequence has been run
- [ ] Edit controls are available for each step
- [ ] Steps can be reordered within the detail view
- [ ] New steps can be added to the sequence

#### 4.6.3 Sequence List (components/sequences/sequence-list.tsx)

- [ ] The list renders all sequences for the current workspace
- [ ] Sequences are sorted by creation date or name
- [ ] The list handles zero sequences with an empty state
- [ ] The list supports infinite scroll or pagination for many sequences

### 4.7 Settings Components

#### 4.7.1 General Settings Tab (components/settings/general-settings-tab.tsx)

- [ ] The tab renders form fields for workspace configuration
- [ ] The save button sends updated settings to the API
- [ ] Success shows a toast notification
- [ ] Validation errors are shown inline next to the relevant field

#### 4.7.2 Security Settings Tab (components/settings/security-settings-tab.tsx)

- [ ] The tab displays 2FA status and controls
- [ ] The tab displays active session information
- [ ] The tab displays recent login history summary

#### 4.7.3 Two Factor Modal (components/settings/two-factor-modal.tsx)

- [ ] The modal displays a QR code for authenticator app setup
- [ ] The modal accepts the verification code input
- [ ] Correct code enables 2FA and shows backup codes
- [ ] Incorrect code shows an error without closing the modal

#### 4.7.4 Backup Codes Display (components/settings/backup-codes-display.tsx)

- [ ] Backup codes are displayed in a grid format
- [ ] A copy all button copies codes to the clipboard
- [ ] A download button saves codes as a text file
- [ ] A warning message advises storing codes securely

#### 4.7.5 Active Sessions Modal (components/settings/active-sessions-modal.tsx)

- [ ] The modal lists all active sessions with device and location info
- [ ] The current session is marked distinctly
- [ ] Each session has a revoke button
- [ ] Revoking a session sends a revocation request
- [ ] The current session cannot be revoked from this modal

#### 4.7.6 Config Vault Tab (components/settings/config-vault-tab.tsx)

- [ ] Credentials are listed by category (AI keys, email, infrastructure)
- [ ] Each credential row shows the key name and masked value
- [ ] The reveal button temporarily shows the decrypted value
- [ ] Add, edit, and delete operations work correctly
- [ ] Validation prevents empty key names or values

#### 4.7.7 Role Selector (components/settings/role-selector.tsx)

- [ ] The selector dropdown lists available roles (admin, member, viewer)
- [ ] Selecting a role immediately updates or requires confirmation
- [ ] The current role is pre-selected in the dropdown
- [ ] The selector is disabled if the current user lacks permission to change roles

#### 4.7.8 Workspace Members Table (components/settings/workspace-members-table.tsx)

- [ ] All members are listed with name, email, role, and join date
- [ ] The invite member button opens the invite flow
- [ ] Membership removal shows a confirmation dialog
- [ ] The table updates after membership changes

### 4.8 UI Components (Shared Design System)

#### 4.8.1 Button (components/ui/button.tsx)

- [ ] The button renders in all variants (default, outline, ghost, destructive)
- [ ] The button renders in all sizes (sm, md, lg)
- [ ] The disabled state prevents click interaction and changes appearance
- [ ] The loading state shows a spinner and prevents click

#### 4.8.2 Card (components/ui/card.tsx)

- [ ] The card component renders with proper border and shadow
- [ ] Card header, content, and footer slots render correctly
- [ ] The card adapts to dark mode styling

#### 4.8.3 Dialog (components/ui/dialog.tsx)

- [ ] The dialog opens with the correct overlay
- [ ] The dialog can be closed with the X button
- [ ] The dialog can be closed with the Escape key
- [ ] The dialog traps focus within its bounds for accessibility

#### 4.8.4 Input (components/ui/input.tsx)

- [ ] The input renders with correct placeholder text
- [ ] The input handles controlled value changes
- [ ] Error state styling is applied when validation fails
- [ ] Disabled state prevents input interaction

#### 4.8.5 Select (components/ui/select.tsx)

- [ ] The select dropdown opens on click
- [ ] Options are displayed in the dropdown list
- [ ] Selecting an option closes the dropdown and updates the value
- [ ] The placeholder is shown when no value is selected

#### 4.8.6 Table (components/ui/table.tsx)

- [ ] The table renders with proper header, body, and row structure
- [ ] Column alignment is correct (left, center, right as specified)
- [ ] The table is scrollable horizontally on small viewports
- [ ] Zebra striping or hover styles are applied to rows

#### 4.8.7 Toast and Toaster (components/ui/toast.tsx, toaster.tsx)

- [ ] Toast notifications appear in the correct corner of the viewport
- [ ] Each toast type (success, error, warning, info) has correct styling
- [ ] Toasts auto-dismiss after the configured duration
- [ ] Toasts can be manually dismissed by clicking the close button
- [ ] Multiple toasts stack correctly without overlapping

#### 4.8.8 Tooltip (components/ui/tooltip.tsx)

- [ ] Tooltips appear on hover after a brief delay
- [ ] Tooltip text is readable with proper contrast
- [ ] Tooltips are positioned correctly relative to the trigger element
- [ ] Tooltips disappear when the cursor leaves the trigger

#### 4.8.9 Skeleton (components/ui/skeleton.tsx)

- [ ] Skeleton loaders render with correct dimensions matching target content
- [ ] The pulse animation runs smoothly
- [ ] Skeletons are used consistently across all loading states

#### 4.8.10 Badge (components/ui/badge.tsx)

- [ ] Badges render in all variants (default, success, warning, destructive)
- [ ] Badge text is readable and sized appropriately
- [ ] Badges are used consistently for status indicators

#### 4.8.11 Error Boundary (components/ui/error-boundary.tsx)

- [ ] The error boundary catches rendering errors in child components
- [ ] The fallback UI is displayed when an error occurs
- [ ] The retry button re-renders the failed component
- [ ] Error details are logged for debugging purposes

#### 4.8.12 Error Fallbacks (components/ui/error-fallbacks.tsx)

- [ ] Error fallback components display user-friendly messages
- [ ] Each fallback variant is appropriate for its context
- [ ] Fallbacks do not expose sensitive error details to users

#### 4.8.13 Loading States (components/ui/loading-states.tsx)

- [ ] Full page loading state renders a centered spinner
- [ ] Inline loading state renders appropriately within content
- [ ] Loading states are accessible with proper ARIA labels

#### 4.8.14 Permission Gate (components/ui/permission-gate.tsx)

- [ ] The permission gate hides content from unauthorized users
- [ ] Admin-only content is not rendered for regular members
- [ ] The gate does not flash content before hiding it

#### 4.8.15 Additional UI Components

- [ ] Alert component renders with correct severity styling
- [ ] Avatar component displays user images or initials
- [ ] Checkbox component toggles correctly on click
- [ ] Context menu opens on right-click with correct options
- [ ] Dropdown menu opens on click with correct options
- [ ] Editable text component switches between display and edit modes
- [ ] Form field component provides label, input, and error message layout
- [ ] Label component associates correctly with form inputs
- [ ] Slider component dragging updates the value smoothly
- [ ] Switch component toggles between on and off states
- [ ] Sync legend component displays synchronization status indicators
- [ ] System health bar component shows overall system status color
- [ ] Bulk action toolbar appears when items are selected
- [ ] Role badge displays the correct role with appropriate color
- [ ] Sign out transition plays the exit animation on logout

### 4.9 Workspace Components

#### 4.9.1 Access Denied (components/workspace/access-denied.tsx)

- [ ] The access denied page displays when a user lacks permission
- [ ] The message clearly states why access is denied
- [ ] A link to the dashboard or contact admin is provided
- [ ] The component does not expose the restricted resource details

---


## SECTION V: API ROUTE TESTING -- ADMIN ENDPOINTS

### 5.1 All Workspaces (app/api/admin/all-workspaces/route.ts)

- [ ] GET request returns a list of all workspaces in the system
- [ ] The response includes workspace ID, name, region, and creation date for each workspace
- [ ] Only super_admin users receive a successful response
- [ ] Non-admin users receive a 403 Forbidden response
- [ ] Unauthenticated requests receive a 401 Unauthorized response
- [ ] The response format is valid JSON with the expected schema
- [ ] Response time is under 2 seconds for systems with fewer than 1000 workspaces

### 5.2 API Health Endpoints

#### 5.2.1 API Health Main (app/api/admin/api-health/route.ts)

- [ ] GET request returns health status for all monitored services
- [ ] Each service entry includes name, status, response_time, and last_checked fields
- [ ] Only admin users receive a successful response
- [ ] The response handles services that have never been checked
- [ ] Services are returned in a consistent order

#### 5.2.2 API Health Check by ID (app/api/admin/api-health/check/[id]/route.ts)

- [ ] POST request triggers a health check for the specified service ID
- [ ] A valid service ID returns the check result with status and response time
- [ ] An invalid or non-existent service ID returns a 404 response
- [ ] The check result is stored in the database for history
- [ ] Admin authentication is required

#### 5.2.3 API Health Diagnostics (app/api/admin/api-health/diagnostics/[serviceId]/route.ts)

- [ ] GET request returns detailed diagnostics for the specified service
- [ ] Diagnostics include recent response times, error rates, and configuration details
- [ ] A valid service ID returns the full diagnostic report
- [ ] An invalid service ID returns a 404 response
- [ ] Admin authentication is required

#### 5.2.4 API Health History (app/api/admin/api-health/history/route.ts)

- [ ] GET request returns historical health check results
- [ ] Results can be filtered by service name via query parameters
- [ ] Results can be filtered by date range via query parameters
- [ ] Results are returned in reverse chronological order
- [ ] Pagination parameters (page, limit) work correctly
- [ ] Admin authentication is required

### 5.3 Audit Log (app/api/admin/audit-log/route.ts)

- [ ] GET request returns paginated audit log entries
- [ ] Entries include timestamp, actor, action, action_category, target, and details
- [ ] Results can be filtered by action_category via query parameter
- [ ] Results can be filtered by date range via query parameters
- [ ] Pagination works correctly with page and limit parameters
- [ ] Only admin users receive a successful response
- [ ] The response format matches the expected audit event schema

### 5.4 Control Plane Health (app/api/admin/control-plane-health/route.ts)

- [ ] GET request returns the control plane status
- [ ] The response includes worker statuses, uptime, and error counts
- [ ] A healthy control plane returns an overall status of healthy
- [ ] Degraded workers are reflected in the response status
- [ ] Admin authentication is required

### 5.5 Disaster Recovery Endpoints

#### 5.5.1 DR Failover (app/api/admin/disaster-recovery/failover/route.ts)

- [ ] POST request initiates a failover procedure
- [ ] The request requires a confirmation body parameter
- [ ] Successful failover returns initiation details
- [ ] The endpoint validates that a failover is not already in progress
- [ ] Admin authentication is required
- [ ] The operation is logged in the audit trail

#### 5.5.2 DR Health (app/api/admin/disaster-recovery/health/route.ts)

- [ ] GET request returns DR system health status
- [ ] The response includes primary and standby region statuses
- [ ] RPO and RTO current values are included
- [ ] The last successful snapshot timestamp is included

#### 5.5.3 DR Restore (app/api/admin/disaster-recovery/restore/route.ts)

- [ ] POST request initiates a restoration from a snapshot
- [ ] The request body includes the target snapshot ID
- [ ] Invalid snapshot IDs return a 404 response
- [ ] The restoration progress can be tracked
- [ ] Admin authentication is required

#### 5.5.4 DR Snapshots (app/api/admin/disaster-recovery/snapshots/route.ts)

- [ ] GET request returns a list of all available snapshots
- [ ] Each snapshot includes ID, timestamp, size, duration, and type
- [ ] POST request creates a new manual snapshot
- [ ] The snapshot list is sorted by timestamp descending
- [ ] Admin authentication is required

#### 5.5.5 DR Snapshot by ID (app/api/admin/disaster-recovery/snapshots/[id]/route.ts)

- [ ] GET request returns details for a specific snapshot
- [ ] Invalid snapshot IDs return a 404 response
- [ ] DELETE request removes the snapshot if applicable
- [ ] Admin authentication is required

#### 5.5.6 DR Stats (app/api/admin/disaster-recovery/stats/route.ts)

- [ ] GET request returns DR operational statistics
- [ ] Statistics include total snapshots, average snapshot duration, and storage usage
- [ ] Admin authentication is required

### 5.6 Fleet Update Endpoints

#### 5.6.1 Fleet Updates Main (app/api/admin/fleet-updates/route.ts)

- [ ] GET request returns current fleet status for all components
- [ ] Each component shows current version, target version, and update status
- [ ] Admin authentication is required

#### 5.6.2 Fleet Emergency Rollback (app/api/admin/fleet-updates/emergency-rollback/route.ts)

- [ ] POST request initiates an emergency rollback for the specified component
- [ ] The request body includes the component name and optional target version
- [ ] The rollback bypasses normal wave progression
- [ ] A confirmation parameter is required to prevent accidental rollbacks
- [ ] Admin authentication is required
- [ ] The rollback is logged in the audit trail

#### 5.6.3 Fleet Rollouts (app/api/admin/fleet-updates/rollouts/route.ts)

- [ ] GET request returns all active and historical rollouts
- [ ] POST request initiates a new rollout for a component
- [ ] The POST body includes component, target version, and strategy
- [ ] Validation prevents duplicate rollouts for the same component
- [ ] Admin authentication is required

#### 5.6.4 Fleet Templates (app/api/admin/fleet-updates/templates/route.ts)

- [ ] GET request returns available update templates
- [ ] Each template includes name, description, and configuration
- [ ] Admin authentication is required

#### 5.6.5 Fleet Versions (app/api/admin/fleet-updates/versions/route.ts)

- [ ] GET request returns registered versions for each component
- [ ] Version entries include version string, release date, and changelog
- [ ] Admin authentication is required

### 5.7 Freeze Workspace (app/api/admin/freeze-workspace/route.ts)

- [ ] POST request freezes a specified workspace
- [ ] The request body includes the workspace ID and optional reason
- [ ] A frozen workspace cannot perform write operations
- [ ] The freeze status is reflected in the workspace metadata
- [ ] Unfreezing is also supported via the same endpoint or a dedicated one
- [ ] Admin authentication is required
- [ ] The operation is logged in the audit trail

### 5.8 LLM Usage (app/api/admin/llm-usage/route.ts)

- [ ] GET request returns LLM token usage statistics
- [ ] Statistics include total tokens, cost estimates, and per-model breakdown
- [ ] Results can be filtered by date range
- [ ] Results can be filtered by workspace
- [ ] Admin authentication is required

### 5.9 Migration Endpoints

#### 5.9.1 Migration Init (app/api/admin/migration/init/route.ts)

- [ ] POST request initializes a new migration session
- [ ] The response includes the migration session ID and initial state
- [ ] Only one migration session can be active at a time
- [ ] Admin authentication is required

#### 5.9.2 Migration Dual Write Enable (app/api/admin/migration/dual-write/enable/route.ts)

- [ ] POST request enables dual-write mode
- [ ] The prerequisite migration init state must be complete
- [ ] The response confirms dual-write activation
- [ ] Admin authentication is required

#### 5.9.3 Migration Backfill Start (app/api/admin/migration/backfill/start/route.ts)

- [ ] POST request starts the backfill process
- [ ] The prerequisite dual-write state must be active
- [ ] The response includes estimated backfill duration
- [ ] Admin authentication is required

#### 5.9.4 Migration Parity Check (app/api/admin/migration/parity/check/route.ts)

- [ ] POST request triggers a data parity check between old and new systems
- [ ] The response includes match percentage and discrepancy details
- [ ] Admin authentication is required

#### 5.9.5 Migration Cutover Execute (app/api/admin/migration/cutover/execute/route.ts)

- [ ] POST request executes the production cutover
- [ ] The prerequisite parity check must pass with sufficient accuracy
- [ ] A confirmation parameter is required
- [ ] The operation is irreversible without rollback
- [ ] Admin authentication is required
- [ ] The operation is logged in the audit trail

#### 5.9.6 Migration Rollback (app/api/admin/migration/rollback/route.ts)

- [ ] POST request initiates a migration rollback
- [ ] The rollback restores the previous state
- [ ] The response includes rollback progress
- [ ] Admin authentication is required

#### 5.9.7 Migration Status (app/api/admin/migration/status/route.ts)

- [ ] GET request returns the current migration state and progress
- [ ] The response includes phase, progress percentage, and error details
- [ ] Admin authentication is required

### 5.10 Refresh Views (app/api/admin/refresh-views/route.ts)

- [ ] POST request triggers materialized view refresh in the database
- [ ] The response confirms the refresh was initiated
- [ ] Admin authentication is required

### 5.11 Scale Health Endpoints

#### 5.11.1 Scale Health Main (app/api/admin/scale-health/route.ts)

- [ ] GET request returns current system health metrics
- [ ] Metrics include CPU, memory, disk utilization, and active connection count
- [ ] Threshold warnings are included when metrics exceed configured limits
- [ ] Admin authentication is required

#### 5.11.2 Scale Health Alerts (app/api/admin/scale-health/alerts/route.ts)

- [ ] GET request returns all active alerts
- [ ] Each alert includes severity, message, metric, threshold, and current value
- [ ] Admin authentication is required

#### 5.11.3 Scale Health Alert Acknowledge (app/api/admin/scale-health/alerts/[id]/acknowledge/route.ts)

- [ ] POST request acknowledges the specified alert
- [ ] The alert status changes to acknowledged
- [ ] An invalid alert ID returns a 404 response
- [ ] Admin authentication is required

#### 5.11.4 Scale Health Alert Resolve (app/api/admin/scale-health/alerts/[id]/resolve/route.ts)

- [ ] POST request resolves the specified alert
- [ ] The alert status changes to resolved
- [ ] An invalid alert ID returns a 404 response
- [ ] Admin authentication is required

#### 5.11.5 Scale Health History (app/api/admin/scale-health/history/route.ts)

- [ ] GET request returns historical metrics data
- [ ] Data can be filtered by metric type and date range
- [ ] Admin authentication is required

#### 5.11.6 Scale Health Run Checks (app/api/admin/scale-health/run-checks/route.ts)

- [ ] POST request triggers an immediate health check cycle
- [ ] The response includes the check results
- [ ] Admin authentication is required

### 5.12 Unified Audit (app/api/admin/unified-audit/route.ts)

- [ ] GET request returns unified audit trail across all subsystems
- [ ] Results combine Genesis audit events, login events, and system events
- [ ] The unified format is consistent across event sources
- [ ] Admin authentication is required

### 5.13 Webhook DLQ (app/api/admin/webhook-dlq/route.ts)

- [ ] GET request returns current dead letter queue entries
- [ ] Each entry includes the original payload, error reason, and retry count
- [ ] POST request can trigger reprocessing of specific entries
- [ ] Admin authentication is required

---


## SECTION VI: API ROUTE TESTING -- CORE ENDPOINTS

### 6.1 Ask (app/api/ask/route.ts)

- [ ] POST request accepts a prompt and returns an AI-generated response
- [ ] The request body includes the prompt text and optional context parameters
- [ ] The response includes the generated text and token usage statistics
- [ ] An empty or missing prompt returns a 400 Bad Request response
- [ ] Rate limiting is enforced per user
- [ ] Authenticated users only can access the endpoint
- [ ] The response streams correctly when streaming mode is enabled

### 6.2 Billing Endpoints

#### 6.2.1 Billing Main (app/api/billing/route.ts)

- [ ] GET request returns current billing summary for the workspace
- [ ] The response includes current plan, usage totals, and billing period
- [ ] Workspace membership is required

#### 6.2.2 Billing Events (app/api/billing/events/route.ts)

- [ ] GET request returns a list of billing events
- [ ] Events are sorted by timestamp descending
- [ ] Results can be filtered by date range

#### 6.2.3 Billing Invoices (app/api/billing/invoices/route.ts)

- [ ] GET request returns invoice history
- [ ] Each invoice includes date, amount, status, and download link

#### 6.2.4 Billing Plans (app/api/billing/plans/route.ts)

- [ ] GET request returns available subscription plans
- [ ] Each plan includes name, price, features, and limits

#### 6.2.5 Billing Portal (app/api/billing/portal/route.ts)

- [ ] POST request returns a Stripe billing portal session URL
- [ ] The redirect URL is valid and functional
- [ ] Workspace admin permission is required

#### 6.2.6 Billing Subscribe (app/api/billing/subscribe/route.ts)

- [ ] POST request creates a new subscription
- [ ] The request body includes the plan ID
- [ ] Workspace admin permission is required
- [ ] Duplicate active subscriptions are prevented

#### 6.2.7 Billing Usage (app/api/billing/usage/route.ts)

- [ ] GET request returns detailed usage metrics for the billing period
- [ ] Metrics include emails sent, contacts stored, and API calls

### 6.3 Cache (app/api/cache/route.ts)

- [ ] POST request invalidates specified cache keys
- [ ] The request body includes the cache key pattern or specific keys
- [ ] Successful invalidation returns a 200 response with cleared count
- [ ] Authentication is required

### 6.4 Campaign Endpoints

#### 6.4.1 Campaigns Main (app/api/campaigns/route.ts)

- [ ] GET request returns all campaigns for the workspace
- [ ] POST request creates a new campaign
- [ ] Each campaign includes name, status, created date, and email count
- [ ] Workspace membership is required

#### 6.4.2 Campaign by ID (app/api/campaigns/[id]/route.ts)

- [ ] GET request returns details for a specific campaign
- [ ] PUT request updates campaign properties
- [ ] DELETE request removes the campaign
- [ ] Invalid campaign ID returns a 404 response
- [ ] Cross-workspace access is prevented

#### 6.4.3 Campaign Notifications (app/api/campaigns/[id]/notifications/route.ts)

- [ ] GET request returns notifications for the campaign
- [ ] POST request creates a new notification rule

#### 6.4.4 Campaign Sequences (app/api/campaigns/[id]/sequences/route.ts)

- [ ] GET request returns sequences associated with the campaign
- [ ] POST request associates a sequence with the campaign

### 6.5 Contact Endpoints

#### 6.5.1 Contacts Main (app/api/contacts/route.ts)

- [ ] GET request returns paginated contacts for the workspace
- [ ] POST request creates a new contact
- [ ] Contacts include email, first name, last name, company, and status
- [ ] Pagination with page and limit parameters works correctly
- [ ] Search query parameter filters contacts by email or name

#### 6.5.2 Contact by ID (app/api/contacts/[id]/route.ts)

- [ ] GET request returns full details for a specific contact
- [ ] PUT request updates contact fields
- [ ] DELETE request removes the contact
- [ ] Invalid contact ID returns a 404 response
- [ ] Cross-workspace access is prevented

#### 6.5.3 Contacts Batch (app/api/contacts/batch/route.ts)

- [ ] POST request creates or updates multiple contacts in a single call
- [ ] The request body includes an array of contact objects
- [ ] The response includes success and failure counts
- [ ] Duplicate email addresses within the batch are handled gracefully

#### 6.5.4 Contacts Import (app/api/contacts/import/route.ts)

- [ ] POST request accepts a CSV file upload for contact import
- [ ] Column mapping is validated against required fields
- [ ] The response includes import results with row-level success or failure
- [ ] Duplicate contacts are handled according to the specified strategy

#### 6.5.5 Contacts Opt-Out (app/api/contacts/opt-out/route.ts)

- [ ] POST request marks a contact as opted out
- [ ] The opted-out contact no longer receives emails
- [ ] The operation is idempotent for already opted-out contacts

### 6.6 Cost Events (app/api/cost-events/route.ts)

- [ ] GET request returns cost event records
- [ ] Each event includes service, amount, currency, and timestamp
- [ ] Results can be filtered by date range and service
- [ ] POST request creates a new cost event

### 6.7 Cron Endpoints

#### 6.7.1 Campaign Health (app/api/cron/campaign-health/route.ts)

- [ ] GET or POST request triggers the campaign health check
- [ ] The job identifies campaigns with anomalous metrics
- [ ] Results are stored in the database
- [ ] The cron secret header is validated

#### 6.7.2 Cleanup Expired (app/api/cron/cleanup-expired/route.ts)

- [ ] The job removes expired sessions, tokens, or temporary data
- [ ] The response reports the number of cleaned items
- [ ] The cron secret header is validated

#### 6.7.3 Daily Summary (app/api/cron/daily-summary/route.ts)

- [ ] The job generates and stores a daily summary report
- [ ] The summary includes sends, opens, replies, and bounces
- [ ] The cron secret header is validated

#### 6.7.4 Fleet Monitor (app/api/cron/fleet-monitor/route.ts)

- [ ] The job monitors fleet update progress across all components
- [ ] Stalled rollouts are detected and flagged
- [ ] The cron secret header is validated

#### 6.7.5 Ledger Roll (app/api/cron/ledger-roll/route.ts)

- [ ] The job rolls the ledger to a new period
- [ ] Previous period totals are finalized
- [ ] The cron secret header is validated

#### 6.7.6 Metrics Aggregate (app/api/cron/metrics-aggregate/route.ts)

- [ ] The job aggregates raw metric events into summary records
- [ ] Aggregation covers the configured time window
- [ ] The cron secret header is validated

#### 6.7.7 Metrics Rollup (app/api/cron/metrics-rollup/route.ts)

- [ ] The job performs rollup operations on aggregated metrics
- [ ] Hourly data is rolled into daily and weekly summaries
- [ ] The cron secret header is validated

#### 6.7.8 Refresh Views (app/api/cron/refresh-views/route.ts)

- [ ] The job refreshes materialized views in the database
- [ ] The response reports the number of views refreshed
- [ ] The cron secret header is validated

#### 6.7.9 Scale Health (app/api/cron/scale-health/route.ts)

- [ ] The job collects scale health metrics on a recurring schedule
- [ ] Metrics include connection pool usage, query performance, and storage
- [ ] Alerts are generated when thresholds are exceeded
- [ ] The cron secret header is validated

#### 6.7.10 Snapshot (app/api/cron/snapshot/route.ts)

- [ ] The job creates a scheduled snapshot of the system state
- [ ] The snapshot is stored with metadata including timestamp and size
- [ ] The cron secret header is validated

#### 6.7.11 Sync Metrics (app/api/cron/sync-metrics/route.ts)

- [ ] The job synchronizes metrics from external sources
- [ ] The response reports the number of metrics synced
- [ ] The cron secret header is validated

### 6.8 Metrics Endpoints

#### 6.8.1 Metrics Main (app/api/metrics/route.ts)

- [ ] GET request returns dashboard metrics for the workspace
- [ ] Metrics include sends, opens, replies, bounces, and opt-outs
- [ ] Date range filtering is supported
- [ ] Workspace membership is required

#### 6.8.2 Metrics Export (app/api/metrics/export/route.ts)

- [ ] GET request returns metrics data in CSV or JSON format
- [ ] The export format is specified via query parameter
- [ ] Date range filtering is supported

#### 6.8.3 Metrics Sequence (app/api/metrics/sequence/route.ts)

- [ ] GET request returns metrics broken down by sequence
- [ ] Each sequence entry includes its own metric totals

### 6.9 Notifications (app/api/notifications/route.ts)

- [ ] GET request returns notifications for the authenticated user
- [ ] Notifications include type, message, read status, and timestamp
- [ ] PUT request marks notifications as read
- [ ] Unread count is available via query parameter

### 6.10 Search (app/api/search/route.ts)

- [ ] GET request performs a full-text search across contacts and campaigns
- [ ] The query parameter specifies the search term
- [ ] Results are grouped by entity type
- [ ] Results include relevance scoring

### 6.11 Sequence Endpoints

#### 6.11.1 Sequences Main (app/api/sequences/route.ts)

- [ ] GET request returns all sequences for the workspace
- [ ] POST request creates a new sequence
- [ ] Each sequence includes name, step count, and status

#### 6.11.2 Sequence by ID (app/api/sequences/[id]/route.ts)

- [ ] GET request returns full details for a specific sequence
- [ ] PUT request updates sequence properties
- [ ] DELETE request removes the sequence
- [ ] Invalid sequence ID returns a 404 response

#### 6.11.3 Sequence Steps (app/api/sequences/[id]/steps/route.ts)

- [ ] GET request returns all steps within the sequence
- [ ] POST request adds a new step to the sequence
- [ ] Steps include order, template, delay, and conditions

#### 6.11.4 Sequence Contacts (app/api/sequences/[id]/contacts/route.ts)

- [ ] GET request returns contacts enrolled in the sequence
- [ ] POST request enrolls contacts in the sequence
- [ ] Each contact entry includes enrollment status and current step

### 6.12 Sheets Integration (app/api/sheets/route.ts)

- [ ] GET request returns connected Google Sheets
- [ ] POST request initiates a new sheets connection
- [ ] The OAuth flow is handled correctly

### 6.13 Sync (app/api/sync/route.ts)

- [ ] POST request triggers a data synchronization cycle
- [ ] The response includes the sync status and records processed
- [ ] Authentication is required

### 6.14 Templates Endpoints

#### 6.14.1 Templates Main (app/api/templates/route.ts)

- [ ] GET request returns email templates for the workspace
- [ ] POST request creates a new template
- [ ] Each template includes subject, body, and variable placeholders

#### 6.14.2 Template by ID (app/api/templates/[id]/route.ts)

- [ ] GET request returns full details for a specific template
- [ ] PUT request updates the template
- [ ] DELETE request removes the template

### 6.15 Track (app/api/track/route.ts)

- [ ] GET request records an email open event via tracking pixel
- [ ] The tracking pixel returns a valid 1x1 transparent image
- [ ] The event is stored with contact ID, email ID, and timestamp
- [ ] Invalid or expired tracking tokens are handled gracefully

### 6.16 User (app/api/user/route.ts)

- [ ] GET request returns the authenticated user profile
- [ ] PUT request updates user profile fields
- [ ] The response includes user ID, email, name, and role

---


## SECTION VII: API ROUTE TESTING -- ONBOARDING, WEBHOOKS, AND WORKSPACE

### 7.1 OAuth Gmail (app/api/oauth/gmail/route.ts)

- [ ] GET request initiates the Gmail OAuth flow
- [ ] The redirect URL points to the correct Google authorization endpoint
- [ ] The required scopes include Gmail send and read permissions
- [ ] The state parameter prevents CSRF attacks
- [ ] POST request handles the OAuth callback with the authorization code
- [ ] A valid authorization code results in token storage
- [ ] An invalid authorization code returns an appropriate error
- [ ] Token refresh is handled automatically when the access token expires
- [ ] Revoking access removes stored tokens

### 7.2 Onboarding Endpoints

#### 7.2.1 Onboarding Status (app/api/onboarding/status/route.ts)

- [ ] GET request returns the current onboarding status for the user
- [ ] The response includes completed steps and the next required step
- [ ] A fully onboarded user shows all steps as complete
- [ ] A new user shows the first step as the current step

#### 7.2.2 Onboarding Complete Step (app/api/onboarding/complete-step/route.ts)

- [ ] POST request marks a specific step as complete
- [ ] The request body includes the step identifier
- [ ] Steps cannot be completed out of order if sequential ordering is enforced
- [ ] Completing the final step marks onboarding as finished
- [ ] Attempting to complete an already completed step is idempotent

#### 7.2.3 Onboarding Setup Workspace (app/api/onboarding/setup-workspace/route.ts)

- [ ] POST request creates the initial workspace during onboarding
- [ ] The request body includes workspace name and optional configuration
- [ ] The response includes the new workspace ID
- [ ] The user is automatically assigned as the workspace owner

#### 7.2.4 Onboarding Connect Email (app/api/onboarding/connect-email/route.ts)

- [ ] POST request connects the user email account for sending
- [ ] The request body includes the email provider and credentials or OAuth token
- [ ] The connection is validated by sending a test email
- [ ] Connection failures return descriptive error messages

### 7.3 Research (app/api/research/route.ts)

- [ ] POST request initiates a research task for a contact or company
- [ ] The request body includes the target entity and research parameters
- [ ] The response includes research results or a job ID for async processing
- [ ] Rate limiting is applied to prevent excessive external API calls
- [ ] Authentication is required

### 7.4 Sandbox Endpoints

#### 7.4.1 Sandbox Config (app/api/sandbox/config/route.ts)

- [ ] GET request returns the current sandbox configuration
- [ ] PUT request updates sandbox configuration settings
- [ ] Configuration includes feature flags, rate limits, and mock behavior

#### 7.4.2 Sandbox Data (app/api/sandbox/data/route.ts)

- [ ] GET request returns sandbox data sets
- [ ] POST request generates or imports sandbox data
- [ ] The response includes record counts by entity type

#### 7.4.3 Sandbox Execute (app/api/sandbox/execute/route.ts)

- [ ] POST request executes a sandbox operation
- [ ] The request body includes the operation type and parameters
- [ ] The operation runs in an isolated environment
- [ ] Results do not affect production data

#### 7.4.4 Sandbox Reset (app/api/sandbox/reset/route.ts)

- [ ] POST request resets the sandbox to its initial state
- [ ] All sandbox data is cleared
- [ ] Default sample data is regenerated
- [ ] The operation is irreversible within the sandbox

#### 7.4.5 Sandbox Status (app/api/sandbox/status/route.ts)

- [ ] GET request returns the current sandbox status
- [ ] Status includes active state, data counts, and last reset timestamp

### 7.5 Webhook Endpoints

#### 7.5.1 Webhooks N8N (app/api/webhooks/n8n/route.ts)

- [ ] POST request receives webhook payloads from n8n workflows
- [ ] The payload is validated against the expected schema
- [ ] Valid payloads trigger the appropriate handler
- [ ] Invalid payloads return a 400 response
- [ ] The webhook secret is validated in the headers

#### 7.5.2 Webhooks SendGrid (app/api/webhooks/sendgrid/route.ts)

- [ ] POST request receives SendGrid event webhooks
- [ ] Supported events include delivered, opened, clicked, bounced, and spam_report
- [ ] Each event is mapped to the correct contact and email record
- [ ] Batch events are processed correctly
- [ ] The webhook signature is validated
- [ ] Duplicate events are handled idempotently

#### 7.5.3 Webhooks Stripe (app/api/webhooks/stripe/route.ts)

- [ ] POST request receives Stripe webhook events
- [ ] Supported events include payment_succeeded, subscription_updated, and invoice_paid
- [ ] The Stripe webhook signature is verified
- [ ] Each event updates the corresponding billing records
- [ ] Duplicate event delivery is handled idempotently

#### 7.5.4 Webhooks Universal (app/api/webhooks/universal/route.ts)

- [ ] POST request receives generic webhook payloads
- [ ] The payload is routed based on the source header or body field
- [ ] Unknown sources are logged but not rejected
- [ ] The response confirms receipt

### 7.6 Workspace Endpoints

#### 7.6.1 Workspace Main (app/api/workspace/route.ts)

- [ ] GET request returns the current workspace details
- [ ] PUT request updates workspace settings
- [ ] The response includes workspace ID, name, plan, and member count
- [ ] Workspace membership is required

#### 7.6.2 Workspace Create (app/api/workspace/create/route.ts)

- [ ] POST request creates a new workspace
- [ ] The request body includes workspace name and optional settings
- [ ] The creator is automatically assigned as owner
- [ ] Workspace limits per user are enforced

#### 7.6.3 Workspace Invite (app/api/workspace/invite/route.ts)

- [ ] POST request sends an invitation to join the workspace
- [ ] The request body includes the invitee email and role
- [ ] Duplicate invitations to the same email are prevented
- [ ] The invitation includes a secure token with an expiration
- [ ] Workspace admin permission is required

#### 7.6.4 Workspace Join (app/api/workspace/join/route.ts)

- [ ] POST request accepts a workspace invitation
- [ ] The request includes the invitation token
- [ ] An expired token returns a 410 Gone response
- [ ] An invalid token returns a 400 response
- [ ] The user is added to the workspace with the specified role

#### 7.6.5 Workspace Leave (app/api/workspace/leave/route.ts)

- [ ] POST request removes the current user from the workspace
- [ ] The last remaining owner cannot leave the workspace
- [ ] The user is removed from all workspace-specific data

#### 7.6.6 Workspace Members (app/api/workspace/members/route.ts)

- [ ] GET request returns all members of the workspace
- [ ] Each member includes user ID, email, name, role, and joined date
- [ ] PUT request updates a member role
- [ ] DELETE request removes a member from the workspace
- [ ] Only admins can modify member roles

#### 7.6.7 Workspace Config (app/api/workspace/config/route.ts)

- [ ] GET request returns workspace configuration settings
- [ ] PUT request updates configuration settings
- [ ] Settings include sending limits, notification preferences, and integrations
- [ ] Workspace admin permission is required

#### 7.6.8 Workspace Switch (app/api/workspace/switch/route.ts)

- [ ] POST request switches the active workspace for the user session
- [ ] The request includes the target workspace ID
- [ ] Invalid workspace IDs return a 404 response
- [ ] Non-member workspace IDs return a 403 response

---


## SECTION VIII: GENESIS PHASE TESTING -- PHASES 40-48

### 8.1 Phase 40: Genesis Foundation

- [ ] The Genesis foundation module initializes without errors
- [ ] Core configuration is loaded from environment variables
- [ ] Default configuration values are applied when environment variables are missing
- [ ] The initialization sequence logs each step for audit purposes
- [ ] Error recovery handles missing or malformed configuration gracefully
- [ ] The foundation module exports all required interfaces for downstream phases
- [ ] Database connection pool is established within the configured timeout
- [ ] The module is idempotent when initialized multiple times

### 8.2 Phase 41: Ignition Orchestrator

- [ ] The Ignition Orchestrator starts all services in the correct dependency order
- [ ] Service dependencies are validated before orchestration begins
- [ ] Circular dependencies are detected and reported as errors
- [ ] A failed service startup halts dependent services
- [ ] The orchestrator emits status events for each service lifecycle stage
- [ ] Service concurrency limits are respected during parallel startup
- [ ] The shutdown sequence reverses the startup order
- [ ] Graceful shutdown waits for in-flight operations to complete
- [ ] The orchestrator retries transient failures with exponential backoff
- [ ] The timeout for each service startup is configurable
- [ ] Integration with Phase 41 integration module works end to end
- [ ] The droplet factory creates instances with correct specifications
- [ ] The sidecar client connects to the expected endpoint
- [ ] Template manager resolves all variable references

### 8.3 Phase 42: Atomic Handshake Protocol

- [ ] The handshake service initiates a connection with the target system
- [ ] The handshake payload includes protocol version and capabilities
- [ ] The handshake completes within the configured timeout
- [ ] An incompatible protocol version returns a descriptive error
- [ ] The handshake authenticates both parties using shared secrets
- [ ] Connection state transitions follow the defined state machine
- [ ] A failed handshake triggers automatic retry with backoff
- [ ] The handshake service emits events for monitoring
- [ ] The database mock correctly simulates handshake operations during testing
- [ ] Connection stability is maintained after the handshake completes
- [ ] The handshake protocol handles network interruptions gracefully
- [ ] The token manager issues and validates session tokens after handshake
- [ ] The credential vault securely stores handshake credentials
- [ ] The schema check validates the remote schema compatibility

### 8.4 Phase 43: State Reconciliation Watchdog

- [ ] The watchdog detects state drift between expected and actual states
- [ ] State drift events are logged with before and after values
- [ ] Automatic reconciliation is triggered when drift exceeds the threshold
- [ ] Manual reconciliation can be triggered via the API
- [ ] The reconciliation process is idempotent
- [ ] Conflicting state changes are resolved according to the configured strategy
- [ ] The watchdog runs on a configurable schedule
- [ ] The watchdog handles concurrent state changes without corruption
- [ ] State snapshots are taken before reconciliation for rollback
- [ ] The watchdog reports reconciliation results via the event bus
- [ ] The partition manager distributes reconciliation work across workers
- [ ] State reconciliation handles missing records in either source
- [ ] The reconciliation history is retained for the configured duration

### 8.5 Phase 44: "God Mode" Command and Control

- [ ] The command and control interface authenticates super admin users only
- [ ] Non-super-admin users receive a 403 Forbidden response
- [ ] System-wide commands execute across all active workspaces
- [ ] The kill switch disables specified features immediately
- [ ] The kill switch state persists across service restarts
- [ ] Feature flags can be toggled at the workspace level
- [ ] Feature flags can be toggled at the global level
- [ ] Alert channels are configured for critical system events
- [ ] Alert messages include actionable details and severity
- [ ] Command execution is logged in the unified audit trail
- [ ] Rate limiting prevents command flooding
- [ ] The system health overview aggregates data from all subsystems
- [ ] Emergency shutdown halts all non-essential services
- [ ] The recovery procedure restores services from emergency shutdown

### 8.6 Phase 45: Sandbox and Simulation Engine

- [ ] The sandbox environment is isolated from production data
- [ ] Sandbox operations do not affect production databases
- [ ] Simulated email sends record events without external delivery
- [ ] The simulation engine generates realistic contact and campaign data
- [ ] Workflow validation runs end-to-end in sandbox mode
- [ ] The sandbox can be reset to its initial state
- [ ] Performance characteristics in sandbox approximate production behavior
- [ ] The sandbox supports concurrent user sessions
- [ ] The mock sidecar client simulates external service responses
- [ ] Sandbox configuration is stored per workspace
- [ ] The simulation engine supports custom scenarios
- [ ] Resource limits in sandbox prevent excessive usage
- [ ] The sandbox status endpoint reports current state and data counts

### 8.7 Phase 46: Shadow Migration and Parity Testing

- [ ] Shadow migration routes production traffic to both old and new systems
- [ ] Shadow results are compared for data parity
- [ ] Parity discrepancies are logged with full context
- [ ] The parity check reports match percentage across all entity types
- [ ] Shadow mode does not affect production response times significantly
- [ ] Shadow migration can be enabled and disabled at runtime
- [ ] The dual-write system writes to both datastores simultaneously
- [ ] Write failures to the shadow system do not affect the primary system
- [ ] Backfill operations synchronize historical data to the new system
- [ ] The backfill process is resumable after interruption
- [ ] Parity statistics are available via the admin API
- [ ] The migration state machine tracks progress through defined stages
- [ ] Rollback from shadow mode restores the previous configuration

### 8.8 Phase 47: Hyper-Scale Stress Test and Red-Teaming

- [ ] The stress test framework generates configurable load patterns
- [ ] Load patterns include ramp-up, sustained, and spike profiles
- [ ] The system maintains response times under sustained load
- [ ] Error rates remain below the configured threshold under load
- [ ] Resource utilization metrics are collected during stress tests
- [ ] The red-team module tests authentication bypass attempts
- [ ] The red-team module tests SQL injection vectors
- [ ] The red-team module tests cross-site scripting vectors
- [ ] The red-team module tests rate limit bypass attempts
- [ ] Stress test results are stored for historical comparison
- [ ] The concurrency governor limits parallel operations appropriately
- [ ] Circuit breakers activate when error thresholds are exceeded
- [ ] Circuit breakers recover after the configured cool-down period
- [ ] The test suite reports performance regression when detected

### 8.9 Phase 48: Production Cutover and Revert Protocol

- [ ] The cutover checklist validates all prerequisites before proceeding
- [ ] The cutover process migrates traffic from old to new system
- [ ] Traffic migration is gradual using configurable percentages
- [ ] The revert protocol restores the previous system within the target time
- [ ] Health checks validate system stability after each cutover stage
- [ ] The cutover coordinator communicates status to all team members
- [ ] Database schema changes are applied in the correct order
- [ ] Database schema rollback scripts are validated before cutover
- [ ] The cutover process logs each step for audit and debugging
- [ ] External service integrations are verified after cutover
- [ ] DNS propagation is monitored during cutover
- [ ] The cutover acceptance criteria are validated automatically
- [ ] Post-cutover monitoring runs for the configured observation period

---


## SECTION IX: GENESIS PHASE TESTING -- PHASES 52-57

### 9.1 Phase 52: BullMQ Event Bus

- [ ] The event bus initializes with the configured Redis connection
- [ ] Queue creation succeeds for all registered event types
- [ ] Events are published to the correct queue based on event type
- [ ] Event consumers receive published events in order
- [ ] Failed event processing moves the event to the dead letter queue
- [ ] Event retry follows the configured backoff strategy
- [ ] The maximum retry count is respected before dead-lettering
- [ ] Event processing is idempotent for duplicate deliveries
- [ ] Queue health metrics are exposed via the monitoring endpoint
- [ ] The event bus handles Redis disconnections gracefully
- [ ] Reconnection to Redis is automatic after transient failures
- [ ] The queue manager reports active, waiting, and failed job counts
- [ ] Worker concurrency limits are enforced per queue
- [ ] The worker base class provides consistent error handling
- [ ] Event payloads are serialized and deserialized correctly
- [ ] Large event payloads are handled within configured size limits
- [ ] The bus supports priority-based event processing
- [ ] Queue cleanup removes completed events after the retention period

### 9.2 Phase 53: Dynamic UUID Mapper

- [ ] The UUID mapper generates deterministic UUIDs from input keys
- [ ] The same input key always produces the same UUID
- [ ] Different input keys produce different UUIDs
- [ ] The mapper supports namespace-scoped UUID generation
- [ ] UUID-to-key reverse lookup returns the original key
- [ ] The mapper handles concurrent lookups without corruption
- [ ] The mapping cache improves performance for repeated lookups
- [ ] Cache invalidation removes stale mappings
- [ ] The mapper supports batch UUID generation
- [ ] The variable mapper resolves template variables to UUIDs
- [ ] Mapper types enforce correct type constraints at compile time
- [ ] The mapper handles special characters in input keys
- [ ] The mapper validates UUID format on output

### 9.3 Phase 54: Heartbeat State Machine

- [ ] The heartbeat emits at the configured interval
- [ ] The heartbeat payload includes timestamp, component name, and status
- [ ] A missed heartbeat triggers an alert after the configured threshold
- [ ] The state machine transitions through defined states correctly
- [ ] Invalid state transitions are rejected with an error
- [ ] The state machine persists its current state to the database
- [ ] State recovery loads the saved state on startup
- [ ] Concurrent heartbeat updates are serialized
- [ ] The heartbeat interval is adjustable at runtime
- [ ] The state machine resets to the initial state on demand
- [ ] State transition history is retained for debugging
- [ ] The heartbeat system detects stale components

### 9.4 Phase 55: Hibernation and Wake Physics

- [ ] Idle workspaces are detected based on the configured inactivity threshold
- [ ] Idle workspaces transition to hibernation state
- [ ] Hibernated workspaces release allocated resources
- [ ] An incoming request for a hibernated workspace triggers the wake sequence
- [ ] The wake sequence restores all services within the target time
- [ ] The wake sequence validates service health before serving requests
- [ ] Requests received during the wake sequence are queued
- [ ] Queued requests are served after the wake sequence completes
- [ ] The hibernation schedule can be configured per workspace
- [ ] Workspaces with active campaigns are not hibernated
- [ ] The do-client manages droplet power states correctly
- [ ] The hibernation state is reflected in the admin dashboard
- [ ] Resource savings from hibernation are tracked for reporting

### 9.5 Phase 56: Fleet-Wide Template Reconciliation

- [ ] Template changes are propagated to all active workspaces
- [ ] The reconciliation detects template version mismatches
- [ ] Out-of-date templates are updated to the latest version
- [ ] Templates with workspace-specific overrides are not overwritten
- [ ] The reconciliation runs on a configurable schedule
- [ ] Manual reconciliation can be triggered via the admin API
- [ ] The reconciliation report lists updated, skipped, and failed templates
- [ ] Reconciliation handles concurrent template edits gracefully
- [ ] The template manager resolves template inheritance chains
- [ ] Template validation ensures syntax correctness before deployment
- [ ] Rollback reverts templates to their previous version
- [ ] The reconciliation history is available in the audit log

### 9.6 Phase 57: Managed vs. BYO Service Matrix

- [ ] The service matrix categorizes each service as managed or BYO
- [ ] Managed services use platform-provided credentials
- [ ] BYO services accept user-provided credentials
- [ ] The service matrix validates BYO credentials on configuration
- [ ] Invalid BYO credentials return a descriptive error message
- [ ] Switching from managed to BYO updates all dependent configurations
- [ ] Switching from BYO to managed reverts to platform credentials
- [ ] The service matrix supports mixed mode (some managed, some BYO)
- [ ] Each service configuration is validated against its schema
- [ ] The Ohio firewall enforces network policies for BYO services
- [ ] Service health checks adapt to the configured mode
- [ ] The service matrix is auditable via the admin interface

---


## SECTION X: GENESIS PHASE TESTING -- PHASES 58-59

### 10.1 Phase 58: Comprehensive Financial Control System

#### 10.1.1 Wallet Core

- [ ] Wallet creation assigns a unique wallet ID and zero initial balance
- [ ] Wallet lookup by workspace ID returns the correct wallet
- [ ] Balance inquiry returns the current balance and currency
- [ ] Wallet state transitions follow the defined lifecycle
- [ ] Inactive wallets cannot process transactions
- [ ] Wallet metadata is stored with creation timestamp and owner

#### 10.1.2 Transaction Manager

- [ ] Credit transactions increase the wallet balance by the correct amount
- [ ] Debit transactions decrease the wallet balance by the correct amount
- [ ] Insufficient balance prevents debit transactions
- [ ] Transaction records include amount, type, timestamp, and description
- [ ] Transaction history is sortable by date
- [ ] Transaction pagination works correctly
- [ ] Concurrent transactions are serialized to prevent race conditions
- [ ] Transaction rollback restores the previous balance
- [ ] Each transaction receives a unique transaction ID

#### 10.1.3 Budget Manager

- [ ] Budget limits can be set per workspace
- [ ] Budget limits can be set per campaign
- [ ] Budget consumption is tracked against the configured limit
- [ ] Exceeding the budget limit triggers an alert
- [ ] Exceeding the budget limit blocks further spending if hard limit is enabled
- [ ] Budget periods reset based on the configured cycle
- [ ] Budget utilization percentage is calculated correctly
- [ ] Budget history is available for trend analysis

#### 10.1.4 Payment Manager

- [ ] Payment processing integrates with the configured payment provider
- [ ] Successful payments credit the wallet
- [ ] Failed payments log the error and do not credit the wallet
- [ ] Payment receipts are generated for successful transactions
- [ ] Refund processing deducts the refunded amount from the wallet
- [ ] Payment reconciliation matches provider records with internal records

#### 10.1.5 Invoice Generator

- [ ] Invoices are generated at the end of each billing cycle
- [ ] Invoice line items reflect actual usage
- [ ] Invoice totals match the sum of line items
- [ ] Invoice PDFs are rendered correctly
- [ ] Invoice delivery via email is triggered
- [ ] Invoice history is accessible via the billing API

#### 10.1.6 Auto Top-Up

- [ ] Auto top-up triggers when the balance falls below the configured threshold
- [ ] The top-up amount matches the configured replenishment amount
- [ ] Auto top-up requires a valid payment method on file
- [ ] Failed auto top-up sends an alert to the workspace admin
- [ ] Auto top-up frequency limits prevent excessive charges
- [ ] Auto top-up can be enabled and disabled per workspace

#### 10.1.7 Kill Switch

- [ ] The kill switch disables all spending when activated
- [ ] Active campaigns are paused when the kill switch is activated
- [ ] The kill switch state persists across service restarts
- [ ] Deactivating the kill switch resumes paused campaigns
- [ ] The kill switch activation is logged in the audit trail

#### 10.1.8 Financial Analytics

- [ ] Spending analytics show daily, weekly, and monthly totals
- [ ] Cost per email is calculated from total spend and email volume
- [ ] Cost per reply is calculated from total spend and reply count
- [ ] Cost trends are available for the trailing 30, 60, and 90 days
- [ ] Financial reports are exportable in CSV format

#### 10.1.9 Financial Audit Logger

- [ ] All financial operations are logged with actor and timestamp
- [ ] Audit entries include the operation type and affected wallet
- [ ] Audit logs are tamper-evident with checksums
- [ ] Audit log retention follows the configured policy

### 10.2 Phase 59: Cost Model and Rate Limit Orchestration

- [ ] The cost model assigns a cost to each billable operation
- [ ] Cost values are configurable per operation type
- [ ] Cost calculations use the correct decimal precision
- [ ] Rate limits are enforced per workspace per operation type
- [ ] Rate limit windows are configurable in seconds, minutes, or hours
- [ ] Exceeding a rate limit returns a 429 response with retry-after header
- [ ] Rate limit state is shared across all API instances
- [ ] Rate limit counters reset after the window expires
- [ ] Rate limit exceptions can be configured for specific workspaces
- [ ] The cost model integrates with the wallet system for real-time deductions
- [ ] Cost projections estimate future spend based on current usage patterns
- [ ] Rate limit alerts notify workspace admins before limits are reached
- [ ] The rate limit dashboard displays current utilization per workspace

---

## SECTION XI: GENESIS PHASE TESTING -- PHASES 60-60D

### 11.1 Phase 60: Application Layer Architecture

- [ ] The application layer routes requests to the correct handler
- [ ] Middleware executes in the correct order for each request
- [ ] Authentication middleware validates user sessions
- [ ] Authorization middleware validates role-based permissions
- [ ] Request validation middleware rejects malformed payloads
- [ ] Error handling middleware returns consistent error responses
- [ ] The application layer supports versioned API endpoints
- [ ] Cross-origin resource sharing headers are configured correctly

### 11.2 Phase 60A: Risk-Based Warning System

- [ ] Risk scores are calculated for each workspace based on behavior patterns
- [ ] High-risk workspaces receive warnings before action is taken
- [ ] Warning escalation follows the configured severity ladder
- [ ] Risk factors include bounce rate, complaint rate, and send volume
- [ ] The risk dashboard displays current risk scores for all workspaces
- [ ] Risk thresholds are configurable by the admin
- [ ] Warning notifications include specific risk factors and remediation steps
- [ ] Risk history is retained for trend analysis
- [ ] Automatic enforcement actions are triggered at critical risk levels
- [ ] Risk score recalculation occurs on the configured schedule

### 11.3 Phase 60B: Genesis Gateway Streamlined Onboarding

- [ ] The onboarding wizard guides new users through setup steps
- [ ] Each onboarding step validates completion before allowing the next step
- [ ] Skippable steps are clearly marked
- [ ] The onboarding state is persisted across browser sessions
- [ ] Progress indicators show the current step and total steps
- [ ] Help text and tooltips are displayed for each step
- [ ] The onboarding flow adapts based on selected options
- [ ] Completion of onboarding triggers the welcome notification
- [ ] Partially completed onboarding is resumable

### 11.4 Phase 60C: Admin Notification System

- [ ] Admin notifications are generated for critical system events
- [ ] Notification channels include in-app, email, and webhook
- [ ] Notification preferences are configurable per admin user
- [ ] Notification deduplication prevents repeated alerts for the same event
- [ ] Notification severity levels are displayed with appropriate styling
- [ ] Read and unread notification states are tracked per user
- [ ] Notification history is accessible via the admin dashboard
- [ ] Batch notification digest is sent at the configured interval

### 11.5 Phase 60D: N8N Authentication and Access Control

- [ ] N8N API requests are authenticated using API keys
- [ ] Invalid API keys return a 401 response
- [ ] API key rotation is supported without service interruption
- [ ] Access control limits N8N operations to the authorized workspace
- [ ] Webhook payloads from N8N are validated against the expected schema
- [ ] The authentication middleware logs all N8N access attempts
- [ ] Token expiration is enforced for time-limited API keys

---

## SECTION XII: GENESIS PHASE TESTING -- PHASES 61-63

### 12.1 Phase 61: Campaign Architecture and Operations

- [ ] Campaign creation stores the campaign in the database
- [ ] Campaign metadata includes name, status, workspace, and creation date
- [ ] Campaign status transitions follow the defined lifecycle
- [ ] Active campaigns are included in the sending queue
- [ ] Paused campaigns are excluded from the sending queue
- [ ] Completed campaigns are archived
- [ ] Campaign deletion removes all associated data
- [ ] Campaign metrics are aggregated from individual email events

### 12.2 Phase 61A: Campaign Creation Flow

- [ ] The campaign creation form validates all required fields
- [ ] Template selection shows available templates for the workspace
- [ ] Contact list selection shows available lists for the workspace
- [ ] Scheduling options include immediate, delayed, and recurring
- [ ] Preview mode shows a sample email with resolved variables
- [ ] The creation flow saves drafts before final submission
- [ ] Submission creates the campaign and enqueues initial sends
- [ ] Validation errors are displayed inline on the form

### 12.3 Phase 61B: CSV Lead Import System

- [ ] CSV file upload accepts standard CSV format
- [ ] Column mapping allows the user to assign CSV columns to contact fields
- [ ] The parser handles quoted fields, escaped characters, and multiline values
- [ ] Duplicate contacts are detected based on email address
- [ ] Duplicate handling supports skip, update, or create-new strategies
- [ ] Import progress is reported with processed and remaining row counts
- [ ] Invalid rows are logged with the specific validation failure
- [ ] Large files (over 100,000 rows) are processed in batches
- [ ] Import results are available for download as a summary report
- [ ] Column auto-detection suggests mappings based on header names

### 12.4 Phase 61C: N8N Workflow Campaign Integration

- [ ] N8N workflows can trigger campaign actions via webhook
- [ ] Supported actions include start, pause, resume, and stop
- [ ] The webhook payload validates the campaign ID and action
- [ ] Campaign status changes from N8N are reflected in the dashboard
- [ ] N8N workflow execution status is reported back to the campaign
- [ ] Error handling in the integration logs failures without crashing
- [ ] The integration supports custom N8N workflow configurations

### 12.5 Phase 62A: Payment-First Model

- [ ] New workspaces require payment before sending emails
- [ ] The payment gate blocks send operations until payment is confirmed
- [ ] Payment confirmation unlocks sending capabilities immediately
- [ ] Trial workspaces have a limited send quota without payment
- [ ] Upgrading from trial to paid increases the send quota
- [ ] Payment failure notifications include retry instructions
- [ ] The payment-first model is logged for compliance audit
- [ ] Workspace tier determines the available features and limits

### 12.6 Phase 62B: Onboarding Rate Limiting

- [ ] New workspace provisioning is rate-limited to prevent abuse
- [ ] The rate limit is configurable per IP address and per user account
- [ ] Exceeding the rate limit returns a 429 response with retry-after header
- [ ] Rate limit state is persisted across service instances
- [ ] Rate limit exceptions can be configured for internal testing
- [ ] The rate limit does not affect existing workspaces

### 12.7 Phase 63: Admin Onboarding Queue and Tracking

- [ ] New workspace creation requests are added to the onboarding queue
- [ ] Queue entries include workspace details, requestor, and timestamp
- [ ] Admin users can view all pending onboarding requests
- [ ] Admin users can approve onboarding requests
- [ ] Admin users can reject onboarding requests with a reason
- [ ] Approved requests trigger workspace provisioning
- [ ] Rejected requests notify the requestor with the rejection reason
- [ ] Queue position is communicated to the requestor
- [ ] The queue supports priority ordering for expedited requests
- [ ] Queue metrics are available for capacity planning
- [ ] The onboarding tracking system records each status change

---


## SECTION XIII: GENESIS PHASE TESTING -- PHASES 64-65

### 13.1 Phase 64: Genesis Gateway OAuth Proxy

- [ ] The OAuth proxy initiates the authorization flow for supported providers
- [ ] The authorization URL includes the correct client ID, scope, and redirect URI
- [ ] The callback handler exchanges the authorization code for tokens
- [ ] Access tokens are encrypted before storage
- [ ] Refresh tokens are used to obtain new access tokens before expiry
- [ ] Token refresh failures trigger a notification to reconnect the account
- [ ] The proxy supports multiple concurrent provider connections per workspace
- [ ] Revoking access removes all stored tokens for the provider
- [ ] The OAuth state parameter prevents cross-site request forgery
- [ ] Provider-specific scopes are requested based on the integration type
- [ ] The proxy logs all token operations for audit

### 13.2 Phase 64B: Email Provider Abstraction

- [ ] The email provider abstraction supports SendGrid as a provider
- [ ] The email provider abstraction supports Gmail SMTP as a provider
- [ ] The email provider abstraction supports custom SMTP as a provider
- [ ] Provider selection is configurable per workspace
- [ ] Sending an email through the abstraction layer is provider-agnostic
- [ ] Provider credentials are validated on configuration
- [ ] Provider health checks verify connectivity and authentication
- [ ] Provider failover switches to a backup provider on failure
- [ ] Send metrics are tracked per provider
- [ ] Rate limits are enforced per provider according to provider policies
- [ ] The abstraction layer normalizes error responses across providers

### 13.3 Phase 65: Friction-Reduction Protocols

#### 13.3.1 Brand Metadata Scraper (Phase 65.1)

- [ ] The scraper extracts brand name, logo, and colors from a domain
- [ ] The extracted metadata is stored in the workspace configuration
- [ ] The scraper handles domains with no metadata gracefully
- [ ] The scraper respects robots.txt and rate limits
- [ ] Cached metadata is returned for previously scraped domains
- [ ] The scraper handles redirects and HTTPS certificates correctly
- [ ] Extraction results include confidence scores

#### 13.3.2 Calendly Validator (Phase 65.3)

- [ ] The validator checks if a Calendly link is valid and active
- [ ] Valid links return the event type name and availability status
- [ ] Invalid links return a descriptive error message
- [ ] The validator handles Calendly API rate limits
- [ ] Validation results are cached for the configured duration

### 13.4 Phase 65-2: DNS Automation and Tracking Domains

#### 13.4.1 DNS Record Generation (Phase 65.2)

- [ ] DNS records are generated for SPF configuration
- [ ] DNS records are generated for DKIM configuration
- [ ] DNS records are generated for DMARC configuration
- [ ] DNS records are generated for custom tracking domains
- [ ] Generated records include the record type, name, and value
- [ ] The output format is human-readable for manual configuration
- [ ] The Entri integration generates records in the provider-compatible format

#### 13.4.2 DNS Verification

- [ ] DNS record verification checks all required records
- [ ] Verification reports which records are present and which are missing
- [ ] Propagation status is checked across multiple DNS resolvers
- [ ] Verification results are cached to avoid excessive DNS queries
- [ ] The verification schedule runs at the configured interval

#### 13.4.3 Tracking Domain Configuration (Phase 65.4)

- [ ] Custom tracking domains can be registered per workspace
- [ ] Tracking domain SSL certificates are provisioned automatically
- [ ] Tracking domain health checks verify certificate and DNS status
- [ ] Fallback to the default tracking domain occurs on failure
- [ ] Tracking domain changes are propagated to active campaigns

---

## SECTION XIV: GENESIS PHASE TESTING -- PHASE 69

### 14.1 Phase 69: Credential Rotation and Webhook Security

#### 14.1.1 Credential Rotation Service

- [ ] Credentials are stored encrypted at rest
- [ ] Credential rotation generates new credentials and retires old ones
- [ ] The rotation schedule is configurable per credential type
- [ ] Active sessions using old credentials continue until they expire
- [ ] Rotation failure alerts are sent to the admin
- [ ] The rotation history log records each rotation event
- [ ] Emergency rotation can be triggered manually
- [ ] Rotated credentials are tested before becoming active
- [ ] Multi-region credential distribution is supported
- [ ] The credential vault enforces access control per service

#### 14.1.2 Webhook Signature Service

- [ ] Outgoing webhooks include a signature header
- [ ] The signature is computed using HMAC-SHA256 with the shared secret
- [ ] Incoming webhook signature verification rejects invalid signatures
- [ ] The signature computation includes the timestamp to prevent replay attacks
- [ ] The signature service supports multiple active signing keys for rotation
- [ ] Invalid signatures return a 401 response with a descriptive message

#### 14.1.3 Webhook Secret Rotation Service

- [ ] Webhook secrets are rotated on the configured schedule
- [ ] Both old and new secrets are accepted during the transition window
- [ ] The transition window duration is configurable
- [ ] After the transition window, only the new secret is accepted
- [ ] Secret rotation events are logged for audit
- [ ] Downstream systems are notified of pending secret rotations

#### 14.1.4 OAuth Refresh Handler

- [ ] Expired OAuth tokens are refreshed automatically
- [ ] Refresh attempts use the stored refresh token
- [ ] Failed refresh attempts trigger a re-authorization notification
- [ ] The refresh handler supports concurrent refresh requests without duplication
- [ ] Token refresh events are logged for audit

#### 14.1.5 Webhook Dead Letter Queue Service

- [ ] Failed webhook deliveries are queued in the DLQ
- [ ] DLQ entries include the payload, error reason, and attempt count
- [ ] Manual replay of DLQ entries is supported via the admin API
- [ ] Automatic retry of DLQ entries follows the configured schedule
- [ ] Successfully replayed entries are removed from the DLQ
- [ ] DLQ size alerting triggers when the queue exceeds the threshold
- [ ] DLQ entries expire after the configured retention period

---


## SECTION XV: GENESIS PHASE TESTING -- PHASES 70-70B

### 15.1 Phase 70: Disaster Recovery and Regional Failover

#### 15.1.1 Snapshot Management

- [ ] Automated snapshots are created on the configured schedule
- [ ] Manual snapshots can be triggered via the admin API
- [ ] Each snapshot includes full database state and configuration
- [ ] Snapshot metadata records timestamp, size, type, and duration
- [ ] Snapshot storage location is configurable per region
- [ ] Old snapshots are pruned based on the retention policy
- [ ] Snapshot integrity is validated using checksums
- [ ] Cross-region snapshot replication completes within the RPO target

#### 15.1.2 Failover Process

- [ ] Primary region failure is detected within the monitoring interval
- [ ] Automatic failover is initiated after the configured detection threshold
- [ ] Manual failover can be triggered via the admin API
- [ ] The failover process promotes the standby region to primary
- [ ] DNS records are updated to point to the new primary region
- [ ] Application connections are re-established to the new primary
- [ ] The failover completes within the RTO target
- [ ] In-flight transactions are handled gracefully during failover
- [ ] Post-failover health checks validate system stability

#### 15.1.3 Restoration Process

- [ ] Restoration from a snapshot can be initiated via the admin API
- [ ] The restoration target can be a new or existing environment
- [ ] Restoration progress is reported with percentage completion
- [ ] Post-restoration validation checks data integrity
- [ ] Restoration can be cancelled while in progress
- [ ] The restoration log records each step for debugging

#### 15.1.4 DR Health Monitoring

- [ ] DR health endpoint reports primary and standby region status
- [ ] RPO compliance is calculated from the latest snapshot timestamp
- [ ] RTO estimate is based on the most recent failover test
- [ ] DR health alerts are generated when compliance degrades
- [ ] The DR dashboard displays real-time replication lag

### 15.2 Phase 70B: Infrastructure as Code

- [ ] Terraform state is managed consistently across environments
- [ ] Infrastructure definitions include all required resources
- [ ] Plan output shows expected changes before apply
- [ ] Apply creates resources matching the defined state
- [ ] Destroy removes all managed resources cleanly
- [ ] State locking prevents concurrent modifications
- [ ] State file is stored securely in the configured backend
- [ ] Resource tagging follows the organizational standard
- [ ] Infrastructure validation checks pass before deployment
- [ ] Drift detection identifies resources modified outside Terraform
- [ ] Module composition allows reusable infrastructure patterns
- [ ] Environment-specific configurations use variable files

---

## SECTION XVI: GENESIS PHASE TESTING -- PHASES 71-73

### 16.1 Phase 71: API Health Monitor and Sanity Check

#### 16.1.1 Health Check System

- [ ] All monitored endpoints are checked on the configured schedule
- [ ] Health check results include status, response time, and timestamp
- [ ] Healthy endpoints return a passing status
- [ ] Unhealthy endpoints return a failing status with the error details
- [ ] Timeout handling marks unresponsive endpoints as unhealthy
- [ ] Health check history is stored for trend analysis

#### 16.1.2 Diagnostics

- [ ] Service diagnostics include recent response time statistics
- [ ] Diagnostics include error rate over the trailing window
- [ ] Diagnostics include service configuration details
- [ ] The diagnostic report identifies performance degradation patterns

#### 16.1.3 Alerting

- [ ] Alerts are generated when a service transitions from healthy to unhealthy
- [ ] Alert severity is based on the service tier and error type
- [ ] Alert deduplication prevents repeated notifications for the same issue
- [ ] Alert resolution is triggered when the service recovers
- [ ] Alert history is retained for post-incident review

#### 16.1.4 Sanity Checks

- [ ] The sanity check validates database connectivity
- [ ] The sanity check validates Redis connectivity
- [ ] The sanity check validates external API connectivity
- [ ] The sanity check validates file storage access
- [ ] Failed sanity checks are reported in the health dashboard
- [ ] Sanity checks run on application startup

### 16.2 Phase 72: Zero-Downtime Fleet Update Protocol

#### 16.2.1 Version Management

- [ ] Component versions are registered with metadata
- [ ] Version comparison determines upgrade or downgrade status
- [ ] Version compatibility is validated before rollout
- [ ] Version history is retained for each component

#### 16.2.2 Rollout Orchestration

- [ ] Rollouts progress through wave stages sequentially
- [ ] Each wave updates a configured percentage of instances
- [ ] Wave advancement requires health check validation
- [ ] Failed health checks halt the rollout at the current wave
- [ ] Rollout progress is reported via the admin API
- [ ] Concurrent rollouts for the same component are prevented

#### 16.2.3 Canary Deployment

- [ ] Canary instances receive the new version first
- [ ] Canary health is monitored for the configured observation period
- [ ] Canary success criteria include error rate and latency thresholds
- [ ] Failed canary deployment triggers automatic rollback
- [ ] Canary percentage is configurable per rollout

#### 16.2.4 Emergency Rollback

- [ ] Emergency rollback reverts all instances to the previous version
- [ ] The rollback bypasses normal wave progression
- [ ] The rollback completes within the target time
- [ ] Rollback confirmation prevents accidental triggers
- [ ] Post-rollback health checks validate system stability

#### 16.2.5 Fleet Monitor

- [ ] The fleet monitor tracks update status across all components
- [ ] Stalled rollouts are detected after the configured timeout
- [ ] Monitor metrics include progress percentage, duration, and error count
- [ ] Monitor duration is calculated correctly for each wave including zero duration for completed waves

### 16.3 Phase 73: Control Plane Health

#### 16.3.1 Health Index Aggregation

- [ ] The health index aggregates status from all subsystems
- [ ] Each subsystem contributes a weighted score to the overall index
- [ ] The overall status is computed as healthy, degraded, or critical
- [ ] Status transitions are logged for trend analysis

#### 16.3.2 Worker Health

- [ ] Individual worker health is tracked for each Genesis component
- [ ] Worker uptime is calculated from the last restart timestamp
- [ ] Worker error counts are tracked per error category
- [ ] Worker resource utilization (CPU, memory) is monitored

#### 16.3.3 Deployment Validation

- [ ] Deployment validation runs after each control plane update
- [ ] Validation checks include connectivity, authentication, and data integrity
- [ ] Validation failures trigger an alert and potential rollback
- [ ] The validation report is stored for audit

#### 16.3.4 Control Plane Dashboard Integration

- [ ] The control plane health is displayed in the admin dashboard
- [ ] Real-time updates reflect health changes immediately
- [ ] Historical health data is available for the trailing period
- [ ] Drill-down into subsystem health is supported

---


## SECTION XVII: HOOKS TESTING

### 17.1 use-billing (hooks/use-billing.ts)

- [ ] The hook fetches billing data for the current workspace
- [ ] Loading state is true while billing data is being fetched
- [ ] Error state is set when the billing API call fails
- [ ] The billing summary includes current plan, usage, and next billing date
- [ ] Plan upgrade triggers a re-fetch of billing data
- [ ] The hook handles workspace switching gracefully

### 17.2 use-campaigns (hooks/use-campaigns.ts)

- [ ] The hook fetches all campaigns for the current workspace
- [ ] Campaign data includes name, status, and metrics
- [ ] Loading state is true while campaigns are being fetched
- [ ] Error state is set when the campaigns API call fails
- [ ] The hook supports filtering campaigns by status
- [ ] New campaign creation triggers a list refresh
- [ ] Campaign deletion triggers a list refresh

### 17.3 use-dashboard-data (hooks/use-dashboard-data.ts)

- [ ] The hook fetches dashboard metrics for the selected date range
- [ ] Metrics include sends, opens, replies, bounces, and opt-outs
- [ ] Loading state is true while data is being fetched
- [ ] Error state is set when the metrics API call fails
- [ ] Changing the date range triggers a new data fetch
- [ ] The hook returns cached data while a new fetch is in progress
- [ ] The hook handles missing or partial data gracefully

### 17.4 use-dashboard-layout (hooks/use-dashboard-layout.ts)

- [ ] The hook provides widget layout configuration
- [ ] Widget positions are persisted across page refreshes
- [ ] Widget visibility toggling updates the layout
- [ ] Drag-and-drop reordering updates the layout state
- [ ] The default layout is applied for new users
- [ ] Layout reset restores the default widget arrangement

### 17.5 use-format-currency (hooks/use-format-currency.ts)

- [ ] The hook formats numeric values as currency strings
- [ ] The format respects the workspace currency setting
- [ ] Zero values are formatted correctly
- [ ] Negative values include the appropriate sign
- [ ] Large values use the correct thousands separator
- [ ] Decimal precision matches the currency standard

### 17.6 use-format-date (hooks/use-format-date.ts)

- [ ] The hook formats dates according to the workspace locale
- [ ] Relative date formatting shows time ago for recent dates
- [ ] Absolute date formatting shows the full date string
- [ ] Invalid date inputs are handled gracefully
- [ ] Date ranges are formatted with consistent separators

### 17.7 use-invites (hooks/use-invites.ts)

- [ ] The hook fetches pending invitations for the current workspace
- [ ] Each invitation includes the invitee email, role, and status
- [ ] Sending a new invitation adds it to the list
- [ ] Revoking an invitation removes it from the list
- [ ] Loading state is true while invitations are being fetched

### 17.8 use-members (hooks/use-members.ts)

- [ ] The hook fetches workspace members
- [ ] Each member includes user ID, name, email, and role
- [ ] Role changes are reflected immediately after update
- [ ] Member removal triggers a list refresh
- [ ] Loading state is managed correctly

### 17.9 use-metrics (hooks/use-metrics.ts)

- [ ] The hook fetches metric data for the current workspace
- [ ] Metrics are aggregated by the configured time period
- [ ] The hook supports metric type selection
- [ ] Loading and error states are managed correctly
- [ ] The hook refetches when the time period changes

### 17.10 use-notifications (hooks/use-notifications.ts)

- [ ] The hook fetches notifications for the current user
- [ ] Unread notification count is available
- [ ] Marking a notification as read updates the unread count
- [ ] New notifications are added to the list in real time
- [ ] Loading state is managed correctly

### 17.11 use-sandbox (hooks/use-sandbox.ts)

- [ ] The hook reports the current sandbox status
- [ ] Sandbox mode can be toggled via the hook
- [ ] Sandbox data counts are available
- [ ] The hook handles sandbox reset operations
- [ ] Loading state is managed correctly

### 17.12 use-scale-health (hooks/use-scale-health.ts)

- [ ] The hook fetches scale health metrics
- [ ] Metrics include CPU, memory, disk, and connection utilization
- [ ] Threshold warnings are included in the response
- [ ] The hook refetches at the configured polling interval
- [ ] Loading and error states are managed correctly

### 17.13 use-selection (hooks/use-selection.ts)

- [ ] The hook manages item selection state
- [ ] Selecting an item adds it to the selection set
- [ ] Deselecting an item removes it from the selection set
- [ ] Select-all selects all available items
- [ ] Clear-all removes all selections
- [ ] The selection count is accurate

### 17.14 use-theme (hooks/use-theme.ts)

- [ ] The hook returns the current theme setting
- [ ] Theme can be set to light, dark, or system
- [ ] System theme follows the operating system preference
- [ ] Theme changes are applied immediately
- [ ] The theme preference persists across sessions

### 17.15 use-toast (hooks/use-toast.ts)

- [ ] The hook displays toast notifications
- [ ] Toast types include success, error, warning, and info
- [ ] Toasts auto-dismiss after the configured duration
- [ ] Multiple toasts stack correctly
- [ ] Toasts can be dismissed manually

### 17.16 use-workspace-config (hooks/use-workspace-config.ts)

- [ ] The hook fetches workspace configuration settings
- [ ] Configuration updates trigger a re-fetch
- [ ] The hook provides default values for missing configuration
- [ ] Loading and error states are managed correctly

### 17.17 use-workspace-settings (hooks/use-workspace-settings.ts)

- [ ] The hook fetches workspace settings
- [ ] Settings updates are persisted via the API
- [ ] The hook validates setting values before submission
- [ ] Loading and error states are managed correctly

### 17.18 use-workspaces (hooks/use-workspaces.ts)

- [ ] The hook fetches all workspaces for the current user
- [ ] Each workspace includes ID, name, role, and plan
- [ ] Workspace switching updates the active workspace
- [ ] Creating a new workspace adds it to the list
- [ ] Loading and error states are managed correctly

---


## SECTION XVIII: INTEGRATION TESTING

### 18.1 End-to-End User Flows

#### 18.1.1 New User Registration to First Campaign

- [ ] User signs up with email and password
- [ ] Email verification is sent and received
- [ ] Email verification link activates the account
- [ ] Onboarding wizard starts after first login
- [ ] Workspace creation completes during onboarding
- [ ] Email provider connection is configured successfully
- [ ] DNS records are generated and guidance is displayed
- [ ] First contact is imported manually
- [ ] First template is created with variable placeholders
- [ ] First sequence is created with the template
- [ ] First campaign is created with the sequence and contacts
- [ ] Campaign is started and first email is sent
- [ ] Email open event is tracked correctly
- [ ] Email reply event is tracked correctly
- [ ] Campaign metrics reflect the tracked events

#### 18.1.2 Team Collaboration Flow

- [ ] Workspace owner invites a team member
- [ ] The invitation email is delivered
- [ ] Team member accepts the invitation
- [ ] Team member has the correct role permissions
- [ ] Team member can view campaigns created by others
- [ ] Team member can create their own campaigns
- [ ] Role changes are reflected immediately
- [ ] Removing a team member revokes their access

#### 18.1.3 Billing and Subscription Flow

- [ ] Free trial starts with the correct quota
- [ ] Approaching quota limit triggers a warning notification
- [ ] Exceeding the quota blocks further sends
- [ ] Subscribing to a paid plan increases the quota
- [ ] Payment is processed successfully via Stripe
- [ ] Invoice is generated after payment
- [ ] Plan downgrade reduces the quota at the next billing cycle
- [ ] Cancellation stops the subscription at the period end

#### 18.1.4 Contact Import to Campaign Execution

- [ ] CSV file with contacts is uploaded
- [ ] Column mapping is completed correctly
- [ ] Contacts are imported into the workspace
- [ ] Imported contacts appear in the contact list
- [ ] A sequence is created targeting the imported contacts
- [ ] The campaign sends emails to all imported contacts
- [ ] Opt-out links in emails function correctly
- [ ] Opted-out contacts are excluded from future sends

### 18.2 Cross-System Integration

#### 18.2.1 N8N Integration

- [ ] N8N workflow triggers are received by the webhook endpoint
- [ ] Email preparation workflow produces the expected output
- [ ] Email sending workflow dispatches emails via the configured provider
- [ ] Reply tracking workflow processes incoming replies
- [ ] Opt-out workflow handles unsubscribe requests
- [ ] Research report workflow generates contact enrichment data
- [ ] Workflow failures are reported in the dashboard
- [ ] Workflow retry mechanisms work as expected

#### 18.2.2 SendGrid Integration

- [ ] Outbound emails are sent via the SendGrid API
- [ ] SendGrid webhooks deliver open, click, bounce, and complaint events
- [ ] Events are processed and stored correctly
- [ ] SendGrid rate limits are respected
- [ ] Sending domain verification status is accurate
- [ ] Email templates render correctly with SendGrid

#### 18.2.3 Stripe Integration

- [ ] Payment intents are created for subscription purchases
- [ ] Successful payments update the workspace plan
- [ ] Failed payments trigger retry and notification
- [ ] Subscription changes are reflected in the billing page
- [ ] Webhook events from Stripe update billing records
- [ ] Billing portal access provides correct session

#### 18.2.4 Supabase Integration

- [ ] Database queries return correct results
- [ ] Row-level security policies enforce workspace isolation
- [ ] Database triggers fire on expected events
- [ ] Materialized view refresh produces accurate aggregations
- [ ] Connection pooling handles concurrent requests
- [ ] Database migrations apply without errors

#### 18.2.5 Google Sheets Integration

- [ ] OAuth connection to Google Sheets is established
- [ ] Sheet data is imported as contacts
- [ ] Column mapping resolves correctly
- [ ] Sheet sync updates contacts with changes
- [ ] Disconnecting Google Sheets removes stored tokens

### 18.3 Genesis Phase Integration

#### 18.3.1 Phase Dependency Chain

- [ ] Phase 41 (Ignition Orchestrator) starts all dependent phases in order
- [ ] Phase 42 (Handshake) completes before Phase 43 (Watchdog) starts monitoring
- [ ] Phase 52 (Event Bus) is available before any phase publishes events
- [ ] Phase 54 (Heartbeat) monitors all running phases
- [ ] Phase 58 (Financial) integrates with Phase 59 (Cost Model)
- [ ] Phase 60 (App Layer) integrates with Phase 61 (Campaigns)
- [ ] Phase 64 (OAuth) provides tokens used by Phase 64B (Email Provider)
- [ ] Phase 69 (Credentials) secures all credential operations across phases
- [ ] Phase 70 (DR) snapshots include all phase state data
- [ ] Phase 71 (Health Monitor) checks all phase service endpoints
- [ ] Phase 72 (Fleet Updates) manages version upgrades across all phases
- [ ] Phase 73 (Control Plane) aggregates health from all phases

#### 18.3.2 Cross-Phase Data Flow

- [ ] Events from Phase 61 (Campaigns) trigger cost entries in Phase 58 (Financial)
- [ ] Rate limits from Phase 59 (Cost Model) enforce quotas on Phase 61 (Campaigns)
- [ ] Alerts from Phase 44 (God Mode) propagate through Phase 60C (Admin Notifications)
- [ ] Sandbox operations in Phase 45 connect through Phase 57 (Service Matrix)
- [ ] Template changes in Phase 56 propagate to Phase 61A (Campaign Creation)
- [ ] Credential rotations in Phase 69 update Phase 64 (OAuth) tokens
- [ ] Health events from Phase 71 are aggregated by Phase 73 (Control Plane)

### 18.4 Database Integration

#### 18.4.1 Schema Validation

- [ ] All database tables match the TypeScript type definitions
- [ ] Foreign key relationships are correctly defined
- [ ] Indexes exist on frequently queried columns
- [ ] The event_ts index on email_events is present and functional
- [ ] Materialized views return aggregated data correctly
- [ ] Database enums match application-level enums
- [ ] Row-level security policies are applied to all user-facing tables

#### 18.4.2 Data Consistency

- [ ] Creating a contact in the API results in a database row
- [ ] Deleting a campaign cascades to associated records
- [ ] Workspace deletion cascades to all workspace-scoped data
- [ ] Concurrent writes to the same record are serialized correctly
- [ ] Transaction boundaries prevent partial data writes

---


## SECTION XIX: SECURITY TESTING

### 19.1 Authentication Security

#### 19.1.1 Session Management

- [ ] Sessions are created with a secure, random session token
- [ ] Session tokens are transmitted only via secure cookies
- [ ] Session cookies have the HttpOnly flag set
- [ ] Session cookies have the Secure flag set
- [ ] Session cookies have the SameSite attribute set to Lax or Strict
- [ ] Sessions expire after the configured inactivity timeout
- [ ] Session invalidation occurs on logout
- [ ] Concurrent sessions per user are limited to the configured maximum
- [ ] Session fixation attacks are prevented by regenerating the session ID on login
- [ ] Expired sessions return a 401 response and redirect to sign-in

#### 19.1.2 Password Security

- [ ] Passwords are hashed using a strong algorithm (bcrypt or argon2)
- [ ] Password hashes are salted with unique per-user salts
- [ ] Minimum password length is enforced
- [ ] Password complexity requirements are enforced if configured
- [ ] Password reset tokens are single-use and time-limited
- [ ] Password reset tokens are invalidated after successful reset
- [ ] Old passwords cannot be reused within the configured history window
- [ ] Brute-force login attempts are rate-limited

#### 19.1.3 Multi-Factor Authentication

- [ ] MFA enrollment generates a valid TOTP secret
- [ ] The TOTP QR code displays correctly
- [ ] Valid TOTP codes are accepted during login
- [ ] Invalid TOTP codes are rejected
- [ ] Recovery codes are generated during MFA enrollment
- [ ] Recovery codes can be used to bypass MFA
- [ ] Each recovery code is single-use
- [ ] MFA can be disabled by the account owner with re-authentication

### 19.2 Authorization Security

#### 19.2.1 Role-Based Access Control

- [ ] The owner role has full access to workspace operations
- [ ] The admin role has access to management operations
- [ ] The member role has access to standard operations only
- [ ] The viewer role has read-only access
- [ ] Attempting an operation above the user role returns 403 Forbidden
- [ ] Role escalation through direct API manipulation is prevented
- [ ] Role changes take effect immediately without requiring re-login
- [ ] Super admin access is restricted to designated accounts only

#### 19.2.2 Workspace Isolation

- [ ] API requests can only access data within the user workspace
- [ ] Direct database query with another workspace ID is blocked by RLS
- [ ] Cross-workspace object references return a 404 or 403 response
- [ ] Workspace ID spoofing in request headers is detected and rejected
- [ ] Admin endpoints validate workspace membership before data access
- [ ] Workspace switching only allows workspaces the user belongs to

### 19.3 Input Validation and Injection Prevention

#### 19.3.1 SQL Injection Prevention

- [ ] All database queries use parameterized statements
- [ ] Direct string concatenation in queries is absent from the codebase
- [ ] User input containing SQL keywords is handled safely
- [ ] Error messages do not expose database structure or query details

#### 19.3.2 Cross-Site Scripting (XSS) Prevention

- [ ] All user-generated content is escaped before rendering in HTML
- [ ] React JSX rendering prevents script injection by default
- [ ] Content-Security-Policy headers restrict inline script execution
- [ ] Rich text inputs are sanitized before storage
- [ ] URL parameters are validated before use in page rendering
- [ ] Template variables are escaped in email previews

#### 19.3.3 Cross-Site Request Forgery (CSRF) Prevention

- [ ] State-changing API requests require CSRF tokens
- [ ] CSRF tokens are validated for POST, PUT, PATCH, and DELETE methods
- [ ] SameSite cookie attributes provide secondary CSRF protection
- [ ] OAuth state parameters prevent CSRF in authorization flows

#### 19.3.4 Request Validation

- [ ] All API endpoints validate request body schema
- [ ] Unexpected fields in request bodies are rejected or ignored
- [ ] Query parameter types are validated (string, number, boolean)
- [ ] File upload size limits are enforced
- [ ] File upload type restrictions are enforced
- [ ] Path parameters are validated against expected patterns

### 19.4 Data Protection

#### 19.4.1 Encryption

- [ ] Data at rest is encrypted in the database
- [ ] Data in transit uses TLS 1.2 or higher
- [ ] API keys are stored encrypted and never exposed in responses
- [ ] OAuth tokens are encrypted before database storage
- [ ] Webhook secrets are encrypted before database storage
- [ ] Encryption keys are rotated on the configured schedule

#### 19.4.2 Data Privacy (GDPR Compliance)

- [ ] Personal data export is available for each user
- [ ] Personal data deletion request removes all user data
- [ ] Data retention policies are enforced automatically
- [ ] Consent records are stored for each data processing activity
- [ ] The GDPR service handles data subject access requests
- [ ] Audit logs do not contain personal data in the clear
- [ ] Data processing records are maintained for compliance

#### 19.4.3 Secrets Management

- [ ] Environment variables are not exposed in client-side bundles
- [ ] API error responses do not leak internal secrets
- [ ] Log output does not contain passwords, tokens, or keys
- [ ] The credential vault enforces least-privilege access
- [ ] Secret rotation does not cause service interruption

### 19.5 API Security

#### 19.5.1 Rate Limiting

- [ ] All public endpoints enforce rate limits
- [ ] Rate limit headers (X-RateLimit-Remaining, X-RateLimit-Reset) are returned
- [ ] Exceeding rate limits returns a 429 response
- [ ] Rate limits are enforced per user and per IP
- [ ] Rate limit bypass via header manipulation is prevented

#### 19.5.2 Webhook Security

- [ ] Inbound webhooks validate the signature header
- [ ] Invalid webhook signatures return a 401 response
- [ ] Webhook payload replay attacks are prevented by timestamp validation
- [ ] Outbound webhooks include a signature for the receiver to verify
- [ ] Webhook secret rotation uses a transition window

#### 19.5.3 CORS Configuration

- [ ] CORS headers allow only configured origins
- [ ] Wildcard CORS origins are not used in production
- [ ] Pre-flight OPTIONS requests return correct CORS headers
- [ ] Credentials mode is restricted to trusted origins

### 19.6 Audit and Logging Security

- [ ] All authentication events are logged with timestamp and IP
- [ ] All authorization failures are logged with user and resource details
- [ ] Sensitive operations (delete, role change, payment) are logged
- [ ] Log entries include a correlation ID for request tracing
- [ ] Log retention follows the configured policy
- [ ] Log access is restricted to authorized personnel
- [ ] Login audit system records successful and failed login attempts
- [ ] The unified audit trail combines events from all subsystems

---


## SECTION XX: PERFORMANCE TESTING

### 20.1 Page Load Performance

#### 20.1.1 Dashboard Page

- [ ] Initial page load completes in under 3 seconds on broadband
- [ ] The largest contentful paint (LCP) is under 2.5 seconds
- [ ] First input delay (FID) is under 100 milliseconds
- [ ] Cumulative layout shift (CLS) is under 0.1
- [ ] Time to interactive (TTI) is under 3.5 seconds
- [ ] JavaScript bundle size for the dashboard is under the target threshold
- [ ] Server-side rendering produces the initial HTML within 500 milliseconds
- [ ] Subsequent navigation to the dashboard uses cached data

#### 20.1.2 Analytics Page

- [ ] The analytics page loads charts within 2 seconds
- [ ] Chart data queries complete within 1 second
- [ ] Large date ranges (90+ days) load within 3 seconds
- [ ] Chart re-rendering after filter changes completes within 500 milliseconds

#### 20.1.3 Contacts Page

- [ ] The contacts list renders the first 50 contacts within 1 second
- [ ] Scrolling to load additional contacts is smooth
- [ ] Search results appear within 500 milliseconds
- [ ] Contact detail modal opens within 200 milliseconds

#### 20.1.4 Sequences Page

- [ ] The sequences list loads within 1 second
- [ ] Sequence detail with steps loads within 1.5 seconds
- [ ] Sequence creation form renders without jank

### 20.2 API Response Times

#### 20.2.1 Read Operations

- [ ] GET requests to list endpoints return within 500 milliseconds for typical payloads
- [ ] GET requests to detail endpoints return within 200 milliseconds
- [ ] Metrics aggregation queries return within 1 second
- [ ] Search queries return within 500 milliseconds
- [ ] Admin health endpoints return within 300 milliseconds

#### 20.2.2 Write Operations

- [ ] POST requests to create endpoints complete within 500 milliseconds
- [ ] PUT requests to update endpoints complete within 300 milliseconds
- [ ] DELETE requests complete within 300 milliseconds
- [ ] Batch operations complete within 5 seconds for up to 1000 items
- [ ] File upload processing completes within 10 seconds for files under 10MB

#### 20.2.3 Webhook Processing

- [ ] Inbound webhook processing completes within 200 milliseconds
- [ ] Webhook batch events (up to 100 events) process within 2 seconds
- [ ] Webhook signature validation adds less than 10 milliseconds overhead

### 20.3 Database Performance

#### 20.3.1 Query Performance

- [ ] All frequently-used queries have execution plans that use indexes
- [ ] The email_events event_ts index reduces query time for time-range filters
- [ ] Full table scans are absent from production query patterns
- [ ] Complex join queries complete within 500 milliseconds
- [ ] Aggregation queries on large tables (over 1 million rows) complete within 2 seconds
- [ ] Materialized view refresh completes within 30 seconds

#### 20.3.2 Connection Management

- [ ] The connection pool size is adequate for peak concurrent API requests
- [ ] Connection pool exhaustion is detected and reported
- [ ] Idle connections are returned to the pool within the configured timeout
- [ ] Connection leak detection identifies unreleased connections

#### 20.3.3 Data Volume Handling

- [ ] The system handles workspaces with over 100,000 contacts without degradation
- [ ] Campaign event tables with over 10 million rows query efficiently
- [ ] Pagination performs consistently regardless of page number
- [ ] Large CSV imports (over 100,000 rows) complete within 5 minutes

### 20.4 Caching Performance

- [ ] Cached responses are served within 50 milliseconds
- [ ] Cache hit ratio exceeds 80% for read-heavy workloads
- [ ] Cache invalidation occurs within 1 second of data changes
- [ ] Cache memory usage stays within the configured limit
- [ ] Redis connection latency is under 5 milliseconds

### 20.5 Event Bus Performance

- [ ] Event publishing latency is under 50 milliseconds
- [ ] Event processing throughput exceeds 100 events per second
- [ ] Queue depth does not grow unbounded under normal load
- [ ] Dead letter queue remains empty under normal operation
- [ ] Worker concurrency is tuned for optimal throughput
- [ ] Redis memory usage for queues stays within limits

### 20.6 Resource Utilization

- [ ] CPU utilization stays under 70% during peak operations
- [ ] Memory utilization stays under 80% during peak operations
- [ ] Disk I/O does not bottleneck during report generation
- [ ] Network bandwidth usage is within the allocated capacity
- [ ] Garbage collection pauses are under 100 milliseconds

### 20.7 Scalability Testing

- [ ] The system supports 100 concurrent authenticated users
- [ ] The system supports 10 concurrent workspace operations
- [ ] The system supports 50 concurrent API requests per second
- [ ] Horizontal scaling adds capacity proportionally
- [ ] Database read replicas reduce load on the primary
- [ ] Event bus consumers scale with queue depth

---


## SECTION XXI: MOBILE RESPONSIVENESS TESTING

### 21.1 Viewport Breakpoints

#### 21.1.1 Mobile (320px - 639px)

- [ ] The sidebar collapses to a hamburger menu
- [ ] The hamburger menu opens and closes correctly
- [ ] Navigation items in the mobile menu are tappable with adequate spacing
- [ ] Dashboard metrics stack vertically in a single column
- [ ] Charts resize to fit the viewport without horizontal scrolling
- [ ] Tables switch to a card or stacked layout
- [ ] Modal dialogs are full-screen on mobile
- [ ] Form inputs are large enough for touch interaction
- [ ] Text remains readable without zooming
- [ ] The sign-in and sign-up pages are fully functional on mobile

#### 21.1.2 Tablet (640px - 1023px)

- [ ] The sidebar is collapsible and expands on demand
- [ ] Dashboard metrics use a 2-3 column responsive grid
- [ ] Charts display at a usable size
- [ ] Tables show essential columns with horizontal scroll for additional columns
- [ ] The admin panel is navigable on tablet-sized screens
- [ ] Settings pages display controls at an adequate size

#### 21.1.3 Desktop (1024px and above)

- [ ] The sidebar is expanded by default
- [ ] Dashboard metrics use the full 3-5 column grid
- [ ] Charts display at their maximum configured size
- [ ] Tables show all columns without truncation where possible
- [ ] Multi-panel layouts display side by side
- [ ] Drag-and-drop widget reordering works correctly

### 21.2 Touch Interaction

- [ ] Tap targets are at least 44x44 pixels
- [ ] Swipe gestures work on mobile for navigation where applicable
- [ ] Long press does not trigger unintended actions
- [ ] Scroll behavior is smooth and does not interfere with interactive elements
- [ ] Pinch-to-zoom is disabled on form pages to prevent layout issues
- [ ] Pull-to-refresh triggers data reload on supported pages

### 21.3 Mobile-Specific Components

- [ ] Mobile bottom navigation bar (if present) displays on small screens
- [ ] Mobile collapsible widgets toggle correctly
- [ ] Mobile date picker is functional and dismissable
- [ ] Mobile filters use a slide-in panel instead of inline controls
- [ ] Mobile notification badges are visible and sized correctly

### 21.4 Cross-Browser Mobile Testing

- [ ] The application renders correctly on Safari (iOS)
- [ ] The application renders correctly on Chrome (Android)
- [ ] The application renders correctly on Firefox (Android)
- [ ] Form auto-fill works on mobile browsers
- [ ] Keyboard display does not obscure focused input fields

---

## SECTION XXII: ACCESSIBILITY TESTING

### 22.1 WCAG 2.1 Level AA Compliance

#### 22.1.1 Perceivable

- [ ] All images have alt text or are marked as decorative
- [ ] Color contrast ratios meet the 4.5:1 minimum for normal text
- [ ] Color contrast ratios meet the 3:1 minimum for large text
- [ ] Information is not conveyed using color alone
- [ ] Text can be resized to 200% without loss of content
- [ ] Content is readable and functional at multiple zoom levels
- [ ] Audio and video content have captions or transcripts where applicable
- [ ] Page content is presented in a meaningful order in the DOM

#### 22.1.2 Operable

- [ ] All interactive elements are reachable via keyboard (Tab key)
- [ ] The focus order follows a logical sequence
- [ ] Focus indicators are visible on all focusable elements
- [ ] No keyboard traps exist (users can always tab away)
- [ ] Skip-to-content link is available on pages with navigation
- [ ] Time limits for session expiry provide adequate warning
- [ ] Animations can be paused or disabled
- [ ] Drag-and-drop operations have keyboard-accessible alternatives

#### 22.1.3 Understandable

- [ ] The page language is declared in the HTML lang attribute
- [ ] Form error messages are descriptive and specific
- [ ] Form labels are explicitly associated with their inputs
- [ ] Required fields are indicated both visually and programmatically
- [ ] Navigation is consistent across pages
- [ ] Help text is available for complex form fields
- [ ] Error prevention is provided for irreversible actions (confirmation dialogs)

#### 22.1.4 Robust

- [ ] HTML is valid and well-formed
- [ ] ARIA roles are used correctly on custom components
- [ ] ARIA labels are provided for elements that lack visible text
- [ ] ARIA live regions announce dynamic content changes
- [ ] Custom dropdown menus use appropriate ARIA patterns
- [ ] Modal dialogs trap focus and use role="dialog"
- [ ] Data tables use proper th and td markup with scope attributes

### 22.2 Screen Reader Compatibility

- [ ] The application is navigable with VoiceOver (macOS/iOS)
- [ ] The application is navigable with NVDA (Windows)
- [ ] Dynamic content updates are announced by screen readers
- [ ] Toast notifications are announced by screen readers
- [ ] Loading states are announced by screen readers
- [ ] Charts provide text alternatives for screen readers
- [ ] Form validation errors are announced when they appear

### 22.3 Keyboard Navigation

- [ ] The main menu can be navigated entirely by keyboard
- [ ] Modal dialogs can be closed with the Escape key
- [ ] Dropdown menus can be navigated with arrow keys
- [ ] Table rows can be selected with keyboard controls
- [ ] Copy-to-clipboard actions work via keyboard shortcuts
- [ ] Keyboard shortcuts do not conflict with screen reader shortcuts

### 22.4 Automated Accessibility Tools

- [ ] Axe-core scan reports zero critical violations
- [ ] Axe-core scan reports zero serious violations
- [ ] Lighthouse accessibility score is above 90
- [ ] All interactive elements pass the accessible name requirement

---


## SECTION XXIII: DISASTER RECOVERY TESTING

### 23.1 Backup Verification

- [ ] Automated backup runs on the configured schedule
- [ ] Manual backup can be triggered via the admin API
- [ ] Backup files are stored in the configured storage location
- [ ] Backup files are replicated to a secondary region
- [ ] Backup integrity is verified using checksums
- [ ] Backup restoration creates a functional copy of the database
- [ ] Restored data matches the original data at the snapshot time
- [ ] Backup retention policy prunes old backups correctly
- [ ] Backup size is monitored and alerts trigger when growth is abnormal
- [ ] Point-in-time recovery restores data to a specific timestamp

### 23.2 Failover Testing

- [ ] Primary region outage triggers automatic failover
- [ ] Manual failover can be initiated via the admin API
- [ ] Failover completes within the RTO target
- [ ] Data loss during failover is within the RPO target
- [ ] Application endpoints respond from the secondary region after failover
- [ ] Database connections are re-established to the standby after failover
- [ ] In-flight requests are retried or returned with an appropriate error
- [ ] Failback to the primary region is supported
- [ ] Failback restores the original primary-secondary configuration
- [ ] Failover drills can be scheduled without production impact

### 23.3 Recovery Point and Recovery Time Validation

- [ ] RPO is measured from the last successful replication timestamp
- [ ] RPO compliance is tracked and reported in the health dashboard
- [ ] RTO is measured from failover initiation to service restoration
- [ ] RTO compliance is tracked and reported in the health dashboard
- [ ] RPO and RTO breaches trigger immediate alerts

### 23.4 Data Integrity After Recovery

- [ ] All user accounts are accessible after recovery
- [ ] All workspace data is consistent after recovery
- [ ] Campaign status is preserved after recovery
- [ ] Financial balances match pre-failure values
- [ ] Audit log integrity is maintained after recovery
- [ ] Pending queue items are reprocessed after recovery

---

## SECTION XXIV: DEPLOYMENT TESTING

### 24.1 Build and Compilation

- [ ] TypeScript compilation completes with zero errors (npx tsc --noEmit)
- [ ] Next.js build completes successfully (npm run build)
- [ ] No ESLint errors in production code
- [ ] No circular dependency warnings
- [ ] Build output size is within the target threshold
- [ ] Source maps are generated for production builds
- [ ] Environment-specific configurations are applied correctly

### 24.2 Environment Configuration

- [ ] All required environment variables are documented
- [ ] Missing required environment variables cause a startup failure with a descriptive message
- [ ] Development environment uses development-specific configuration
- [ ] Staging environment mirrors production configuration
- [ ] Production environment uses production-specific configuration
- [ ] Secrets are not committed to the repository
- [ ] Environment variable validation runs before the application starts

### 24.3 Continuous Integration Pipeline

- [ ] The CI pipeline runs on every pull request
- [ ] TypeScript compilation check passes in CI
- [ ] Unit tests pass in CI
- [ ] Integration tests pass in CI
- [ ] Code coverage meets the minimum threshold
- [ ] Linting checks pass in CI
- [ ] The CI pipeline completes within the target duration
- [ ] CI failures block the pull request from merging

### 24.4 Continuous Deployment Pipeline

- [ ] Deployment to staging is automated after CI passes on the main branch
- [ ] Deployment to production requires manual approval
- [ ] Zero-downtime deployment is achieved using rolling updates
- [ ] Health checks validate the deployment before traffic is routed
- [ ] Failed deployments are rolled back automatically
- [ ] Deployment notifications are sent to the team
- [ ] Deployment logs are retained for debugging

### 24.5 Vercel Deployment

- [ ] The Vercel project is configured with the correct build settings
- [ ] Environment variables are set in the Vercel dashboard
- [ ] Preview deployments are created for pull requests
- [ ] Production deployments use the main branch
- [ ] Custom domain is configured and verified
- [ ] SSL certificate is provisioned and valid
- [ ] Serverless function cold start time is within acceptable limits
- [ ] Edge functions are deployed to the correct regions
- [ ] Vercel cron jobs are configured with the correct schedule
- [ ] Build cache improves subsequent deployment times

### 24.6 Database Migration Deployment

- [ ] Migration files are applied in the correct order
- [ ] Migrations are idempotent and can be re-run safely
- [ ] Migration rollback scripts are available for each migration
- [ ] Schema changes are backward-compatible with the running application
- [ ] Data migrations handle null values and edge cases
- [ ] Migration execution time is within the deployment window

---

## SECTION XXV: REGRESSION TESTING

### 25.1 Critical Path Regression

#### 25.1.1 Authentication Regression

- [ ] User sign-up works after deployment
- [ ] User sign-in works after deployment
- [ ] Password reset works after deployment
- [ ] Session management works after deployment
- [ ] OAuth sign-in works after deployment

#### 25.1.2 Dashboard Regression

- [ ] Dashboard loads without errors after deployment
- [ ] Metrics are displayed correctly after deployment
- [ ] Date range filtering works after deployment
- [ ] Widget layout is preserved after deployment
- [ ] Chart rendering is functional after deployment

#### 25.1.3 Campaign Regression

- [ ] Campaign list loads after deployment
- [ ] Campaign creation works after deployment
- [ ] Campaign editing works after deployment
- [ ] Campaign deletion works after deployment
- [ ] Email sending works after deployment
- [ ] Event tracking works after deployment

#### 25.1.4 Contact Regression

- [ ] Contact list loads after deployment
- [ ] Contact creation works after deployment
- [ ] Contact import works after deployment
- [ ] Contact search works after deployment
- [ ] Contact opt-out works after deployment

#### 25.1.5 Billing Regression

- [ ] Billing page loads after deployment
- [ ] Usage metrics are accurate after deployment
- [ ] Plan subscription works after deployment
- [ ] Payment processing works after deployment

### 25.2 Genesis Phase Regression

- [ ] Phase 41 (Ignition Orchestrator) initializes correctly after deployment
- [ ] Phase 42 (Handshake) connects successfully after deployment
- [ ] Phase 43 (Watchdog) detects state drift after deployment
- [ ] Phase 44 (God Mode) command execution works after deployment
- [ ] Phase 45 (Sandbox) isolation is maintained after deployment
- [ ] Phase 52 (Event Bus) publishes and consumes events after deployment
- [ ] Phase 54 (Heartbeat) emits on schedule after deployment
- [ ] Phase 55 (Hibernation) wake sequence works after deployment
- [ ] Phase 58 (Financial) transactions process correctly after deployment
- [ ] Phase 59 (Cost Model) rate limits enforce after deployment
- [ ] Phase 60 (App Layer) middleware chain works after deployment
- [ ] Phase 61 (Campaigns) create and send after deployment
- [ ] Phase 64 (OAuth) token management works after deployment
- [ ] Phase 69 (Credentials) rotation works after deployment
- [ ] Phase 70 (DR) snapshots create after deployment
- [ ] Phase 71 (Health Monitor) checks run after deployment
- [ ] Phase 72 (Fleet Updates) rollouts progress after deployment
- [ ] Phase 73 (Control Plane) aggregation reports correctly after deployment

### 25.3 API Regression

- [ ] All API endpoints return the expected HTTP status codes
- [ ] Response payloads match the documented schema
- [ ] Error responses include descriptive error messages
- [ ] Pagination works correctly on all list endpoints
- [ ] Filtering and sorting work correctly on all list endpoints
- [ ] Authentication is enforced on all protected endpoints
- [ ] Rate limiting is enforced on all public endpoints

### 25.4 Automated Regression Suite

- [ ] The Jest unit test suite passes with zero failures
- [ ] The Playwright end-to-end test suite passes with zero failures
- [ ] Test execution time does not increase significantly between deployments
- [ ] Code coverage does not decrease between deployments
- [ ] No new deprecation warnings are introduced

---


## SECTION XXVI: ERROR HANDLING AND EDGE CASES

### 26.1 Network Error Handling

- [ ] The application displays a connection error when the API is unreachable
- [ ] Retry attempts are made automatically for failed API requests
- [ ] The retry backoff strategy increases wait time between attempts
- [ ] The maximum number of retries is respected
- [ ] After all retries fail, a user-friendly error message is displayed
- [ ] Network errors during form submission preserve the user input
- [ ] Offline detection displays an appropriate banner
- [ ] Reconnection restores functionality without requiring a page refresh
- [ ] Partial network failures (some endpoints down) are handled gracefully
- [ ] Long-running requests display a timeout message after the configured limit

### 26.2 Database Error Handling

- [ ] Database connection failures are caught and reported
- [ ] Connection pool exhaustion is handled with a queued retry
- [ ] Transaction deadlocks are retried automatically
- [ ] Unique constraint violations return a descriptive error
- [ ] Foreign key violations return a descriptive error
- [ ] Schema validation errors are caught before query execution
- [ ] Database timeout errors are reported with context

### 26.3 External Service Error Handling

- [ ] SendGrid API failures are caught and logged
- [ ] SendGrid rate limit responses trigger backoff
- [ ] Stripe API failures are caught and logged
- [ ] Stripe idempotency keys prevent duplicate charges
- [ ] Google OAuth failures display a re-authorization prompt
- [ ] N8N webhook delivery failures are queued for retry
- [ ] Redis connection failures trigger fallback behavior
- [ ] External service circuit breakers prevent cascading failures

### 26.4 User Input Edge Cases

- [ ] Empty form submissions are rejected with validation errors
- [ ] Forms with maximum length input values are handled correctly
- [ ] Unicode characters in names, subjects, and body text are preserved
- [ ] RTL (right-to-left) text is displayed correctly in email previews
- [ ] HTML entities in user input are escaped before rendering
- [ ] CSV files with inconsistent column counts are handled with error messages
- [ ] CSV files with BOM (byte order mark) characters are parsed correctly
- [ ] Email addresses with plus signs and dots are handled correctly
- [ ] Very long email addresses (up to 320 characters) are accepted
- [ ] Domain names with international characters (IDN) are handled

### 26.5 Concurrent Operation Edge Cases

- [ ] Two users editing the same campaign simultaneously do not corrupt data
- [ ] Two users deleting the same contact simultaneously do not cause errors
- [ ] Simultaneous campaign start and stop operations are serialized
- [ ] Concurrent CSV imports to the same workspace do not intersect
- [ ] Concurrent webhook deliveries for the same event are deduplicated
- [ ] Race conditions in counter increments are handled atomically
- [ ] Concurrent workspace deletion and data access are handled safely

### 26.6 State Transition Edge Cases

- [ ] A campaign cannot transition from completed to active
- [ ] A paused campaign can be resumed or stopped but not started again from scratch
- [ ] A workspace in frozen state rejects all write operations
- [ ] An expired invitation cannot be accepted
- [ ] A deleted contact cannot receive new emails
- [ ] A cancelled subscription cannot be reactivated after the grace period
- [ ] A rollback during an in-progress deployment is handled gracefully

### 26.7 Data Volume Edge Cases

- [ ] Workspaces with zero contacts display appropriate empty states
- [ ] Workspaces with zero campaigns display appropriate empty states
- [ ] Metrics calculations handle division by zero (zero sends with aggregation)
- [ ] Reports with no data for the selected period display a no-data message
- [ ] Pagination with zero results returns an empty list instead of an error
- [ ] A campaign with zero enrolled contacts handles start gracefully
- [ ] Financial calculations handle zero balance operations

### 26.8 Timezone and Locale Edge Cases

- [ ] Date displays adjust to the user timezone setting
- [ ] Cron job schedules execute at the correct UTC time
- [ ] Date range filters handle timezone boundary correctly
- [ ] Created-at timestamps are stored in UTC
- [ ] Users in different timezones see consistent data
- [ ] Daylight saving time transitions do not skip or duplicate scheduled operations
- [ ] Currency formatting respects the workspace locale

---

## SECTION XXVII: LIBRARY MODULES TESTING (lib/)

### 27.1 api-utils (lib/api-utils.ts)

- [ ] API response helpers create correctly formatted success responses
- [ ] API response helpers create correctly formatted error responses
- [ ] Status code helpers return the correct HTTP status
- [ ] Request body parsing handles valid JSON
- [ ] Request body parsing handles invalid JSON with a 400 error
- [ ] Query parameter extraction handles missing parameters with defaults

### 27.2 api-workspace-guard (lib/api-workspace-guard.ts)

- [ ] The workspace guard validates the workspace ID from the request
- [ ] Requests without a workspace ID are rejected
- [ ] Requests with an invalid workspace ID are rejected
- [ ] The guard confirms the user has membership in the workspace
- [ ] Non-member access is rejected with a 403 response

### 27.3 auth (lib/auth.ts)

- [ ] Session token generation produces a cryptographically secure token
- [ ] Session validation confirms the token matches the stored session
- [ ] Expired sessions are rejected
- [ ] User lookup by session returns the correct user profile
- [ ] Password hashing and comparison functions work correctly

### 27.4 budget-alerts (lib/budget-alerts.ts)

- [ ] Budget alerts are triggered when spending exceeds the configured threshold
- [ ] Alert severity is based on the percentage of budget consumed
- [ ] Alert delivery uses the configured notification channel
- [ ] Alert deduplication prevents repeated alerts for the same threshold
- [ ] Alert resolution occurs when spending drops below the threshold

### 27.5 cache (lib/cache.ts)

- [ ] Cache set stores values with the configured TTL
- [ ] Cache get retrieves stored values
- [ ] Cache get returns null for expired or missing keys
- [ ] Cache invalidation removes the specified key
- [ ] Cache pattern invalidation removes all matching keys
- [ ] Cache operations handle Redis unavailability gracefully

### 27.6 constants (lib/constants.ts)

- [ ] All application constants are defined with the correct values
- [ ] Constants are exported and accessible to importing modules
- [ ] Role constants include all defined roles
- [ ] Status constants include all defined statuses
- [ ] Configuration defaults are reasonable

### 27.7 dashboard-context (lib/dashboard-context.tsx)

- [ ] The dashboard context provider wraps child components
- [ ] Context values are accessible by consuming hooks
- [ ] Context updates trigger re-renders in consuming components
- [ ] Default context values are provided when no provider is present

### 27.8 currency-context (lib/currency-context.tsx)

- [ ] The currency context provides the workspace currency setting
- [ ] Currency format functions are available via context
- [ ] Currency changes propagate to all consuming components

### 27.9 dashboard-types (lib/dashboard-types.ts)

- [ ] All dashboard type definitions compile without errors
- [ ] Type definitions match the API response schemas
- [ ] Optional fields are correctly typed

### 27.10 database.types (lib/database.types.ts)

- [ ] The database type definitions match the Supabase schema
- [ ] Table types include Row, Insert, and Update variants
- [ ] Enum types match the database enum values
- [ ] Relationship types are defined correctly
- [ ] The type file compiles without TypeScript errors

### 27.11 genesis-db-config (lib/genesis/genesis-db-config.ts)

- [ ] Database configuration loads connection parameters from environment
- [ ] Connection pool size matches the configured value
- [ ] SSL configuration is applied for production environments
- [ ] Connection timeout is set to the configured value

### 27.12 supabase (lib/supabase.ts and lib/supabase-server.ts)

- [ ] The Supabase client initializes with the correct URL and anon key
- [ ] Server-side Supabase client uses the service role key
- [ ] The client connects to the correct database instance
- [ ] Row-level security policies are applied by the anon key client

### 27.13 tenant-lifecycle (lib/genesis/tenant-lifecycle.ts)

- [ ] Tenant creation provisions all required resources
- [ ] Tenant deactivation disables access without deleting data
- [ ] Tenant deletion removes all associated data
- [ ] Tenant activation restores access to deactivated tenants
- [ ] Lifecycle transitions are logged in the audit trail

### 27.14 data-export (lib/genesis/data-export.ts)

- [ ] Data export generates a complete archive of user data
- [ ] The export format is machine-readable (JSON or CSV)
- [ ] Export includes contacts, campaigns, sequences, and settings
- [ ] Personal data is included for GDPR compliance
- [ ] Export files are delivered securely

### 27.15 gdpr-service (lib/genesis/gdpr-service.ts)

- [ ] Data subject access requests return all stored personal data
- [ ] Data deletion requests remove all personal data
- [ ] Consent records are tracked per data processing purpose
- [ ] Data processing inventory is maintained and exportable
- [ ] Right to portability returns data in a standard format

---

## SECTION XXVIII: CONFIGURATION AND ENVIRONMENT TESTING

### 28.1 Next.js Configuration (next.config.js)

- [ ] Image optimization is configured correctly
- [ ] Rewrites and redirects function as expected
- [ ] Webpack custom configuration does not break the build
- [ ] Environment variable exposure to the client is limited to NEXT_PUBLIC_ prefixed variables
- [ ] Trailing slash behavior matches the deployment configuration

### 28.2 Tailwind Configuration (tailwind.config.js)

- [ ] Custom colors are defined and available in class names
- [ ] Custom spacing values are defined and available
- [ ] Dark mode variant is configured correctly
- [ ] Content paths include all component directories
- [ ] Custom plugins (if any) are loaded without errors

### 28.3 PostCSS Configuration (postcss.config.js)

- [ ] PostCSS plugins are loaded in the correct order
- [ ] Tailwind CSS plugin is included
- [ ] Autoprefixer plugin is included
- [ ] Custom PostCSS plugins (if any) function correctly

### 28.4 TypeScript Configuration (tsconfig.json)

- [ ] Strict mode is enabled
- [ ] Path aliases resolve correctly
- [ ] The target and module settings match the deployment environment
- [ ] Include and exclude patterns cover the correct files
- [ ] JSX configuration is set for React

### 28.5 Jest Configuration (jest.config.ts)

- [ ] Module name mappings resolve correctly
- [ ] Transform patterns handle TypeScript and JSX files
- [ ] Test file patterns match the test directory structure
- [ ] Setup files are loaded before tests
- [ ] Coverage thresholds are configured
- [ ] Mock file resolution works for stylesheets and assets

### 28.6 Playwright Configuration (playwright.config.ts)

- [ ] Browser projects are configured for the target browsers
- [ ] Test directory patterns match the E2E test structure
- [ ] Base URL is configured for the test environment
- [ ] Timeouts are set for navigation and test execution
- [ ] Screenshots and traces are configured for failure debugging

### 28.7 Vercel Configuration (vercel.json)

- [ ] Build command is specified correctly
- [ ] Output directory is specified correctly
- [ ] Rewrites and headers are configured
- [ ] Function regions are specified for optimal performance
- [ ] Cron schedules are defined for recurring jobs

---


## SECTION XXIX: END-TO-END TEST SUITE VERIFICATION

### 29.1 Playwright Test Infrastructure

- [ ] Playwright configuration loads without errors
- [ ] All configured browser projects (Chromium, Firefox, WebKit) launch successfully
- [ ] Test fixtures initialize correctly
- [ ] Test helpers authenticate test users
- [ ] Base URL resolves to the correct test environment
- [ ] Screenshot capture works on test failure
- [ ] Trace capture works for debugging
- [ ] Test report is generated after the suite completes
- [ ] Parallel test execution does not cause data conflicts
- [ ] Test cleanup removes test data after each run

### 29.2 Authentication E2E Tests

- [ ] Sign-up page loads and renders the registration form
- [ ] Registration with valid credentials creates a new account
- [ ] Registration with an existing email displays an error
- [ ] Sign-in page loads and renders the login form
- [ ] Login with valid credentials redirects to the dashboard
- [ ] Login with invalid credentials displays an error
- [ ] Logout redirects to the sign-in page
- [ ] Session persistence survives page refresh
- [ ] Session expiry redirects to the sign-in page

### 29.3 Dashboard E2E Tests

- [ ] The dashboard page loads with all widgets visible
- [ ] Metrics widgets display numeric values
- [ ] Chart widgets render without errors
- [ ] Date range selector changes the displayed data
- [ ] Widget collapsing and expanding works correctly
- [ ] Widget drag-and-drop reordering persists across page loads
- [ ] The page is navigable via keyboard
- [ ] Responsive layout adapts to different viewport sizes

### 29.4 Contacts E2E Tests

- [ ] The contacts page loads with a list of contacts
- [ ] Searching for a contact filters the list
- [ ] Creating a new contact adds it to the list
- [ ] Editing a contact updates the displayed information
- [ ] Deleting a contact removes it from the list
- [ ] CSV import workflow completes successfully
- [ ] Opt-out link in emails correctly marks the contact

### 29.5 Sequences E2E Tests

- [ ] The sequences page loads with a list of sequences
- [ ] Creating a new sequence navigates to the editor
- [ ] Adding steps to a sequence works correctly
- [ ] Editing a step updates the step content
- [ ] Deleting a step removes it from the sequence
- [ ] Sequence preview shows the email content

### 29.6 Settings E2E Tests

- [ ] The settings page loads with all configuration sections
- [ ] General settings can be updated and saved
- [ ] Workspace name changes are reflected in the sidebar
- [ ] Team member management (invite, remove, role change) works
- [ ] Billing section displays current plan information
- [ ] Notification preferences can be toggled

### 29.7 Admin E2E Tests

- [ ] The admin panel loads for admin users
- [ ] Non-admin users cannot access the admin panel
- [ ] Health dashboard displays system metrics
- [ ] Audit log displays recent events
- [ ] Scale health metrics update at the polling interval
- [ ] Fleet update status is displayed correctly
- [ ] Disaster recovery status is displayed correctly

### 29.8 Onboarding E2E Tests

- [ ] New user sees the onboarding wizard after first login
- [ ] Each onboarding step validates before allowing progression
- [ ] Workspace creation step creates the workspace
- [ ] Email connection step configures the email provider
- [ ] Completion of onboarding navigates to the dashboard
- [ ] Returning user does not see the onboarding wizard

---

## SECTION XXX: MONITORING AND OBSERVABILITY TESTING

### 30.1 Logging

#### 30.1.1 Application Logging

- [ ] All API requests are logged with method, path, status, and duration
- [ ] Error responses include stack traces in development mode
- [ ] Error responses exclude stack traces in production mode
- [ ] Log levels (debug, info, warn, error) are configured per environment
- [ ] Structured log format (JSON) is used for machine parsing
- [ ] Log output includes a correlation ID for request tracing
- [ ] Sensitive data (passwords, tokens) is redacted from log output

#### 30.1.2 Audit Logging

- [ ] All administrative actions are logged with actor and timestamp
- [ ] All financial operations are logged with the transaction details
- [ ] All security events are logged with source IP and user agent
- [ ] Audit log entries are immutable after creation
- [ ] Audit log queries support filtering by event type, actor, and date range

#### 30.1.3 Log Aggregation

- [ ] Logs from all instances are aggregated in a central location
- [ ] Log retention follows the configured policy
- [ ] Log search functionality returns results within the expected time
- [ ] Log alerts trigger on configured error patterns

### 30.2 Metrics Collection

#### 30.2.1 Application Metrics

- [ ] Request count per endpoint is tracked
- [ ] Request latency (p50, p95, p99) is tracked per endpoint
- [ ] Error rate is tracked per endpoint
- [ ] Active user count is tracked over time
- [ ] Active workspace count is tracked over time

#### 30.2.2 Business Metrics

- [ ] Emails sent per day is tracked
- [ ] Email open rate is calculated correctly
- [ ] Email reply rate is calculated correctly
- [ ] Bounce rate is calculated correctly
- [ ] Opt-out rate is calculated correctly
- [ ] Campaign success rate is tracked
- [ ] Revenue per workspace is tracked

#### 30.2.3 Infrastructure Metrics

- [ ] CPU utilization is collected at the configured interval
- [ ] Memory utilization is collected at the configured interval
- [ ] Disk usage is collected at the configured interval
- [ ] Network I/O is collected at the configured interval
- [ ] Database connection pool utilization is collected
- [ ] Redis memory usage is collected
- [ ] Queue depth for each BullMQ queue is collected

### 30.3 Alerting

#### 30.3.1 Alert Configuration

- [ ] Alert rules are defined for each critical metric
- [ ] Alert thresholds are configurable
- [ ] Alert severity levels are assigned correctly
- [ ] Alert notification channels (email, webhook, in-app) are configured
- [ ] Alert escalation policies are defined for unacknowledged alerts

#### 30.3.2 Alert Response

- [ ] Alerts fire when thresholds are exceeded
- [ ] Alert notifications are delivered to the configured channel
- [ ] Alert acknowledgment updates the alert status
- [ ] Alert resolution is triggered when the metric returns to normal
- [ ] Alert history is retained for post-incident review

### 30.4 Dashboards

#### 30.4.1 Operational Dashboard

- [ ] The operational dashboard displays real-time system health
- [ ] Key metrics are refreshed at the configured interval
- [ ] Historical trends are visible for the trailing period
- [ ] Drill-down from high-level metrics to detailed views works
- [ ] The dashboard loads within 3 seconds

#### 30.4.2 Business Dashboard

- [ ] The business dashboard displays daily email volumes
- [ ] The business dashboard displays campaign performance
- [ ] The business dashboard displays revenue metrics
- [ ] The business dashboard displays user growth
- [ ] Filtering by workspace and date range works

---

## SECTION XXXI: DATA INTEGRITY AND CONSISTENCY TESTING

### 31.1 Referential Integrity

- [ ] Foreign key constraints are enforced in the database
- [ ] Deleting a parent record cascades or restricts as designed
- [ ] Orphaned records do not exist in any table
- [ ] Cross-table references point to valid records
- [ ] Workspace-scoped queries never return data from other workspaces

### 31.2 Eventual Consistency

- [ ] Materialized views are refreshed within the configured window
- [ ] Metric aggregations are accurate within the eventual consistency window
- [ ] Cache invalidation propagates within 1 second
- [ ] Event bus consumers process events in the order received
- [ ] State reconciliation detects and resolves drift within the configured period

### 31.3 Data Migration Integrity

- [ ] Migration files apply in the correct sequence
- [ ] Data transformations preserve all source data
- [ ] Null values are handled correctly during migration
- [ ] Migration rollback restores the original data state
- [ ] Post-migration validation confirms data completeness

### 31.4 Financial Data Integrity

- [ ] Wallet balances match the sum of all transactions
- [ ] Debit and credit transactions balance to zero for closed periods
- [ ] Invoice line items match the actual usage records
- [ ] Currency conversion applies the correct exchange rate
- [ ] Rounding follows the configured precision rules
- [ ] Financial audit trail is complete and sequential

### 31.5 Audit Trail Integrity

- [ ] Audit log entries have sequential timestamps
- [ ] No gaps exist in the audit sequence
- [ ] Audit entries cannot be modified after creation
- [ ] Audit entries cannot be deleted except by retention policy
- [ ] Cross-referencing audit entries with system state shows consistency

---

## SECTION XXXII: INTERNATIONALIZATION AND LOCALIZATION

### 32.1 Text and Labels

- [ ] All user-facing text is externalized in translation files or constants
- [ ] No hardcoded English text exists in component render functions
- [ ] Date format strings adapt to the user locale
- [ ] Number format strings adapt to the user locale
- [ ] Plural forms are handled correctly for different quantities

### 32.2 Email Template Localization

- [ ] Email templates support locale-specific subject lines
- [ ] Email templates support locale-specific body content
- [ ] Variable placeholders resolve correctly in all locales
- [ ] RTL text direction is supported in email templates
- [ ] Character encoding (UTF-8) is preserved in sent emails

### 32.3 Currency Handling

- [ ] The workspace currency setting determines display format
- [ ] Currency symbols are displayed correctly for all supported currencies
- [ ] Currency amounts use the correct number of decimal places
- [ ] Financial reports display amounts in the workspace currency

---

## SECTION XXXIII: DOCUMENTATION VERIFICATION

### 33.1 API Documentation

- [ ] All API endpoints are documented with method, path, and description
- [ ] Request body schemas are documented for POST and PUT endpoints
- [ ] Response schemas are documented for all endpoints
- [ ] Authentication requirements are documented per endpoint
- [ ] Error response codes and messages are documented
- [ ] Rate limit policies are documented per endpoint

### 33.2 Developer Documentation

- [ ] README.md includes project setup instructions
- [ ] CONTRIBUTING.md includes contribution guidelines
- [ ] Environment variable descriptions are up to date
- [ ] Architecture diagrams reflect the current system design
- [ ] Genesis phase documentation covers all 33 phases
- [ ] Database schema documentation matches the current schema

### 33.3 User Documentation

- [ ] Onboarding guide covers all setup steps
- [ ] Campaign creation guide covers the complete workflow
- [ ] Contact import guide covers CSV format requirements
- [ ] Troubleshooting guide covers common issues
- [ ] Billing FAQ covers plan features and pricing

---

## SECTION XXXIV: SIGN-OFF AND APPROVAL

### 34.1 Testing Summary

- [ ] All sections in this document have been reviewed
- [ ] All checklist items have been tested
- [ ] All critical defects have been resolved
- [ ] All high-severity defects have been resolved or accepted with justification
- [ ] All medium-severity defects have been documented with remediation plans
- [ ] Low-severity defects have been logged for future resolution

### 34.2 Test Coverage Summary

- [ ] Unit test coverage meets the minimum threshold (target: 80%+)
- [ ] Integration test coverage covers all critical paths
- [ ] End-to-end test coverage covers all user-facing workflows
- [ ] Genesis phase test coverage covers all 33 phases (40-73)
- [ ] API route test coverage covers all endpoints
- [ ] Security test coverage covers OWASP Top 10

### 34.3 Performance Benchmarks

- [ ] Page load times meet the defined targets
- [ ] API response times meet the defined SLAs
- [ ] Database query times meet the defined thresholds
- [ ] System handles the target concurrent user load
- [ ] No memory leaks detected during extended testing

### 34.4 Compliance Verification

- [ ] GDPR compliance requirements are met
- [ ] Data encryption requirements are met
- [ ] Audit logging requirements are met
- [ ] Access control requirements are met
- [ ] Data retention policies are implemented

### 34.5 Stakeholder Approvals

- [ ] QA Lead has reviewed and approved the test results
- [ ] Engineering Lead has reviewed and approved the technical quality
- [ ] Product Owner has reviewed and approved the feature completeness
- [ ] Security Officer has reviewed and approved the security posture
- [ ] Operations Lead has reviewed and approved the deployment readiness

### 34.6 Release Readiness

- [ ] All CI/CD pipelines pass
- [ ] All environments (development, staging, production) are aligned
- [ ] Rollback procedure has been tested
- [ ] Monitoring and alerting are configured
- [ ] On-call rotation is established
- [ ] Release notes are prepared
- [ ] Customer communication plan is finalized

### 34.7 Final Certification

- [ ] This Post Genesis Testing Document has been completed in its entirety
- [ ] All sections have been executed by qualified testers
- [ ] Defect reports are linked to the corresponding checklist items
- [ ] The system is certified for production release
- [ ] Date of certification: ____________________
- [ ] Certified by: ____________________

---

---

## SECTION XXXV: SIDECAR AND INFRASTRUCTURE TESTING

### 35.1 Sidecar Client (lib/genesis/sidecar-client.ts)

- [ ] The sidecar client connects to the configured endpoint
- [ ] Connection timeout is enforced
- [ ] Authentication with the sidecar service succeeds with valid credentials
- [ ] Authentication with the sidecar service fails with invalid credentials
- [ ] Health check requests return the sidecar status
- [ ] Command execution sends the correct payload
- [ ] Command response is parsed correctly
- [ ] Connection reconnection occurs after a disconnection
- [ ] The client handles sidecar unavailability gracefully
- [ ] Connection pooling limits are respected

### 35.2 Sidecar Commands (lib/genesis/sidecar-commands.ts)

- [ ] Deploy command sends the deployment payload
- [ ] Scale command adjusts the target instance count
- [ ] Restart command triggers a service restart
- [ ] Status command returns the current service state
- [ ] Logs command returns recent service log entries
- [ ] Config command updates the service configuration
- [ ] Each command validates its parameters before execution
- [ ] Command responses include status and execution time

### 35.3 Droplet Factory (lib/genesis/droplet-factory.ts)

- [ ] Droplet creation requests include the correct specifications
- [ ] Droplet specifications include region, size, and image
- [ ] Created droplets are assigned a unique identifier
- [ ] Droplet listing returns all managed instances
- [ ] Droplet deletion removes the specified instance
- [ ] Droplet power operations (on, off, cycle) work correctly
- [ ] Resource allocation matches the requested specifications
- [ ] Error handling covers API rate limits and quota exhaustion

### 35.4 DigitalOcean Client (lib/genesis/do-client.ts)

- [ ] API authentication uses the configured token
- [ ] Droplet CRUD operations function correctly
- [ ] API rate limit handling includes backoff and retry
- [ ] Error responses are parsed and returned with context
- [ ] Connection timeout is enforced for all API calls

### 35.5 Redis Connection (lib/genesis/redis-connection.ts)

- [ ] Redis connection initializes with the configured URL
- [ ] TLS is used when configured
- [ ] Connection retry logic handles transient failures
- [ ] Connection pool size is limited to the configured maximum
- [ ] Health check verifies the connection is alive
- [ ] Graceful shutdown closes all connections

### 35.6 Proxy Configuration (proxy.ts)

- [ ] The proxy forwards requests to the configured target
- [ ] Request headers are passed through correctly
- [ ] Response headers are returned to the client
- [ ] The proxy handles large request bodies
- [ ] The proxy handles streaming responses
- [ ] Error handling returns a 502 response on target unavailability

---

## SECTION XXXVI: WORKFLOW AND AUTOMATION TESTING

### 36.1 N8N Workflow Validation

#### 36.1.1 Email Preparation Workflow

- [ ] The workflow accepts a contact payload as input
- [ ] Contact research is performed against configured data sources
- [ ] The research report is generated with company and contact details
- [ ] Template personalization replaces all variable placeholders
- [ ] The prepared email includes subject, body, and recipient
- [ ] Error handling catches failures in the research step
- [ ] The workflow output matches the expected schema

#### 36.1.2 Email Sending Workflow (Email 1, 2, 3)

- [ ] Each email step sends via the configured provider
- [ ] The send operation includes tracking pixel insertion
- [ ] The send operation includes opt-out link insertion
- [ ] Delivery status is reported back to the platform
- [ ] Failed sends are retried according to the configured policy
- [ ] Delay between emails in the sequence is respected
- [ ] Conditional logic skips subsequent emails for opted-out contacts

#### 36.1.3 Reply Tracker Workflow

- [ ] Incoming replies are detected within the monitoring interval
- [ ] Reply content is parsed and stored
- [ ] The contact status is updated to "replied"
- [ ] The campaign sequence for the contact is paused or stopped
- [ ] Reply notifications are sent to the campaign owner

#### 36.1.4 Opt-Out Workflow

- [ ] Opt-out requests are processed within the configured interval
- [ ] The contact status is updated to "opted-out"
- [ ] The contact is removed from all active sequences
- [ ] Future emails to the contact are blocked
- [ ] The opt-out is logged for compliance

#### 36.1.5 Research Report Workflow

- [ ] The research workflow accepts a domain or company name
- [ ] Company information is retrieved from configured sources
- [ ] The report includes company size, industry, and key contacts
- [ ] The report is stored and associated with the target contact
- [ ] Research failure is handled gracefully with a partial report

### 36.2 Workflow Validator (lib/genesis/workflow-validator.ts)

- [ ] Valid workflow definitions pass validation
- [ ] Invalid workflow definitions return specific error messages
- [ ] Missing required fields are detected
- [ ] Invalid node connections are detected
- [ ] Circular dependencies in workflow steps are detected
- [ ] Validation supports all registered node types

### 36.3 Template Manager (lib/genesis/template-manager.ts)

- [ ] Template registration stores the template with metadata
- [ ] Template retrieval returns the correct template by ID
- [ ] Template variable listing returns all defined variables
- [ ] Template rendering replaces variables with provided values
- [ ] Missing variable values use the configured fallback
- [ ] Template versioning tracks changes over time
- [ ] Template deletion removes the template and its versions

---

## SECTION XXXVII: NOTIFICATION AND COMMUNICATION TESTING

### 37.1 In-App Notifications

- [ ] Notification creation stores the notification in the database
- [ ] Notification listing returns notifications for the authenticated user
- [ ] Notification filtering by type works correctly
- [ ] Marking a notification as read updates its status
- [ ] Marking all notifications as read updates all unread notifications
- [ ] Notification badge count reflects unread notifications accurately
- [ ] Real-time notification delivery updates the UI without refresh
- [ ] Notification preferences respect the user settings

### 37.2 Email Notifications

- [ ] System email notifications are sent for critical events
- [ ] Invitation emails include the correct join link
- [ ] Password reset emails include the correct reset link
- [ ] Budget alert emails include the current usage metrics
- [ ] Email notification templates render correctly
- [ ] Email delivery failures are logged and retried
- [ ] Email notification preferences can be configured per event type
- [ ] Unsubscribe links in notification emails function correctly

### 37.3 Webhook Notifications

- [ ] Outbound webhook payloads include the event type and data
- [ ] Webhook delivery retries on failure with exponential backoff
- [ ] Webhook delivery timeout is enforced
- [ ] Webhook delivery success is logged
- [ ] Webhook delivery failure is logged with error details
- [ ] Dead letter queue captures permanently failed deliveries
- [ ] Webhook endpoint URL is validated before registration
- [ ] Webhook signature is included for receiver verification

---

## SECTION XXXVIII: TESTING INFRASTRUCTURE AND TOOLING

### 38.1 Unit Test Framework (Jest)

- [ ] Jest configuration resolves all module paths correctly
- [ ] Mock files for styles and assets are loaded
- [ ] TypeScript compilation for test files works without errors
- [ ] Test isolation ensures no state leaks between tests
- [ ] Snapshot testing captures component output correctly
- [ ] Snapshot updates are reviewed before committing
- [ ] Custom matchers (if defined) work correctly
- [ ] Test timeout is configured for long-running tests
- [ ] Coverage collection includes all source files
- [ ] Coverage exclusion patterns omit test and configuration files

### 38.2 E2E Test Framework (Playwright)

- [ ] Browser installation completes without errors
- [ ] Test authentication fixtures provide valid sessions
- [ ] Page object models encapsulate page interactions
- [ ] Test data setup creates required fixtures
- [ ] Test data cleanup removes all created fixtures
- [ ] Parallel execution does not cause test interference
- [ ] Retry configuration handles flaky tests appropriately
- [ ] Video recording captures test execution for debugging
- [ ] Test tagging allows selective test execution

### 38.3 Continuous Integration

- [ ] GitHub Actions workflow files are valid
- [ ] CI triggers on pull request and push to main
- [ ] CI installs dependencies with the correct package manager
- [ ] CI runs linting before tests
- [ ] CI runs type checking before tests
- [ ] CI runs unit tests with coverage
- [ ] CI runs E2E tests against a test environment
- [ ] CI artifacts (coverage reports, test results) are stored
- [ ] CI notification sends results to the team channel
- [ ] CI cache reduces build time for subsequent runs

### 38.4 Test Data Management

- [ ] Test fixtures provide consistent, reproducible data
- [ ] Factory functions generate test data with configurable overrides
- [ ] Database seeding populates the test database with required data
- [ ] Test data isolation prevents cross-test contamination
- [ ] Large dataset generation supports performance testing
- [ ] Test data cleanup runs after each test execution

---


## SECTION XXXIX: COMPLIANCE AND GOVERNANCE TESTING

### 39.1 Email Compliance

#### 39.1.1 CAN-SPAM Compliance

- [ ] All outbound emails include the sender physical address
- [ ] All outbound emails include a visible unsubscribe link
- [ ] The unsubscribe link processes opt-outs within 10 business days
- [ ] The subject line accurately reflects the email content
- [ ] The email identifies itself as an advertisement where required
- [ ] The sender email address is valid and monitored
- [ ] Suppression list management prevents emails to opted-out contacts

#### 39.1.2 GDPR Email Compliance

- [ ] Consent is recorded before sending marketing emails
- [ ] The consent record includes timestamp, method, and scope
- [ ] Recipients can withdraw consent at any time
- [ ] Consent withdrawal is processed within the configured timeframe
- [ ] Data processing records are maintained for email operations
- [ ] Personal data in email logs is subject to retention policies
- [ ] Data export includes all email interaction history for the contact

#### 39.1.3 CASL Compliance (Canadian Anti-Spam Legislation)

- [ ] Express consent is obtained before sending commercial emails
- [ ] Implied consent is tracked with expiration dates
- [ ] The unsubscribe mechanism is accessible and functional
- [ ] Sender identification includes full contact information
- [ ] Consent records are maintained for the required retention period

### 39.2 Data Governance

#### 39.2.1 Data Classification

- [ ] Personal data fields are identified and classified
- [ ] Sensitive data fields are identified and classified with higher protection
- [ ] Financial data is classified and encrypted at rest
- [ ] Classification labels are applied to database columns
- [ ] Data access is restricted based on classification level

#### 39.2.2 Data Retention

- [ ] Retention policies are defined for each data category
- [ ] Expired data is automatically archived or deleted
- [ ] Retention policy enforcement runs on the configured schedule
- [ ] Manual data deletion requests override automatic retention
- [ ] Retention policy exceptions are documented and justified

#### 39.2.3 Data Access Controls

- [ ] Role-based access limits data visibility by user role
- [ ] Row-level security enforces workspace isolation at the database level
- [ ] API endpoints enforce access controls for each operation
- [ ] Admin data access is logged in the audit trail
- [ ] Bulk data export requires elevated permissions

### 39.3 Operational Governance

- [ ] Change management procedures are followed for all deployments
- [ ] Deployment approvals are recorded in the audit trail
- [ ] Incident response procedures are documented and tested
- [ ] Service level objectives (SLOs) are defined for key metrics
- [ ] SLO compliance is tracked and reported
- [ ] Capacity planning projections are reviewed quarterly

---

## SECTION XL: BROWSER COMPATIBILITY TESTING

### 40.1 Desktop Browsers

- [ ] Chrome (latest 2 versions) renders all pages correctly
- [ ] Firefox (latest 2 versions) renders all pages correctly
- [ ] Safari (latest 2 versions) renders all pages correctly
- [ ] Edge (latest 2 versions) renders all pages correctly
- [ ] JavaScript functionality works consistently across browsers
- [ ] CSS animations render smoothly across browsers
- [ ] Form input behavior is consistent across browsers
- [ ] File upload works across browsers
- [ ] Copy to clipboard works across browsers
- [ ] LocalStorage and SessionStorage work across browsers

### 40.2 Mobile Browsers

- [ ] Safari on iOS (latest 2 versions) renders correctly
- [ ] Chrome on Android (latest 2 versions) renders correctly
- [ ] Samsung Internet Browser renders correctly
- [ ] Touch interactions work correctly on all mobile browsers
- [ ] Viewport meta tag prevents unexpected zooming
- [ ] Keyboard interaction on mobile does not obscure focused elements

### 40.3 Progressive Enhancement

- [ ] Core functionality works without JavaScript (server-rendered pages)
- [ ] Forms degrade gracefully when JavaScript is disabled
- [ ] Non-critical features are loaded progressively
- [ ] CSS fallbacks are provided for unsupported properties
- [ ] Image formats include fallbacks for unsupported browsers

---

## SECTION XLI: LOAD AND STRESS TESTING SCENARIOS

### 41.1 Normal Load Scenarios

- [ ] The system handles 50 concurrent active users without degradation
- [ ] The system handles 100 API requests per second without degradation
- [ ] Dashboard page serves 20 concurrent users within 3 seconds
- [ ] Contact list pagination handles 50 concurrent page requests
- [ ] Campaign start/stop operations handle 10 concurrent requests

### 41.2 Peak Load Scenarios

- [ ] The system handles 200 concurrent active users with acceptable degradation
- [ ] The system handles 500 API requests per second with graceful degradation
- [ ] Database connection pool handles peak concurrent queries
- [ ] Redis handles peak concurrent cache operations
- [ ] Event bus handles peak event throughput without message loss

### 41.3 Stress Scenarios

- [ ] The system maintains data integrity under overload conditions
- [ ] Rate limiting activates under stress to protect system stability
- [ ] Circuit breakers trip under sustained failure conditions
- [ ] Memory usage does not grow unbounded under sustained load
- [ ] The system recovers gracefully after stress conditions subside
- [ ] Error messages returned under stress are meaningful

### 41.4 Endurance Testing

- [ ] The system operates continuously for 24 hours without memory leaks
- [ ] Database connection pool remains stable over 24 hours
- [ ] Redis memory usage remains stable over 24 hours
- [ ] Event bus queues do not accumulate uncollected items over 24 hours
- [ ] Scheduled jobs execute correctly over multiple cycles
- [ ] Log file rotation prevents disk exhaustion

### 41.5 Spike Testing

- [ ] A sudden 10x traffic spike is handled by the auto-scaling configuration
- [ ] Spike traffic does not corrupt shared state
- [ ] Recovery from a spike restores normal performance within 5 minutes
- [ ] Alert notifications are sent during a spike event

---

## APPENDIX A: CHECKLIST SUMMARY STATISTICS

- [ ] Total checklist items in this document: count upon final review
- [ ] Items per section: tally by section header
- [ ] Minimum items per section: verify no section has fewer than 5 items
- [ ] All items are actionable and testable
- [ ] No duplicate items exist across sections
- [ ] All items use the standard checklist format (- [ ])

## APPENDIX B: REVISION HISTORY

- [ ] Initial draft created with comprehensive coverage of all system areas
- [ ] Review pass for completeness against the codebase inventory
- [ ] Review pass for clarity and specificity of checklist items
- [ ] Final approval and baseline

---

END OF POST GENESIS TESTING DOCUMENT
