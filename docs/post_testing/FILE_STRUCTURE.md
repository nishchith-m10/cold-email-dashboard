# FILE STRUCTURE

**Generated:** 2/21/2026, 9:59:58 PM
**Root Path:** `/Users/nishchith.g.m/Desktop/UpShot_project/cold-email-dashboard-starter`

```
├── .github
│   ├── agents
│   │   └── Plan.agent.md
│   └── copilot-instructions.md
├── __mocks__
│   └── styleMock.js
├── __tests__
│   ├── genesis
│   │   ├── genesis-phase59
│   │   │   └── README.md
│   │   ├── phase41
│   │   │   ├── credential-vault-edge-cases.test.ts
│   │   │   ├── edge-cases.test.ts
│   │   │   ├── ignition-integration.test.ts
│   │   │   ├── orchestrator-comprehensive.test.ts
│   │   │   └── simple.test.ts
│   │   ├── phase42
│   │   │   ├── handshake-service.test.ts
│   │   │   └── token-manager.test.ts
│   │   ├── phase43
│   │   │   ├── watchdog-drift-detection.test.ts
│   │   │   ├── watchdog-healing.test.ts
│   │   │   └── watchdog-run.test.ts
│   │   ├── phase44
│   │   │   ├── alert-routing.test.ts
│   │   │   ├── bulk-update.test.ts
│   │   │   ├── metric-aggregator.test.ts
│   │   │   ├── scale-health-service.test.ts
│   │   │   └── types.test.ts
│   │   ├── phase45
│   │   │   ├── execution-event-service.test.ts
│   │   │   ├── mock-n8n.test.ts
│   │   │   ├── pii-sanitizer.test.ts
│   │   │   ├── sandbox-rate-limiter.test.ts
│   │   │   ├── types.test.ts
│   │   │   └── workflow-trigger.test.ts
│   │   ├── phase46
│   │   │   ├── backfill-engine.test.ts
│   │   │   ├── cutover-manager.test.ts
│   │   │   ├── dual-write-service.test.ts
│   │   │   ├── migration-orchestrator.test.ts
│   │   │   ├── migration-state-manager.test.ts
│   │   │   ├── mock-migration-db.test.ts
│   │   │   ├── parity-checker.test.ts
│   │   │   └── types.test.ts
│   │   ├── phase47
│   │   │   ├── chaos-engine.test.ts
│   │   │   ├── load-test-config.test.ts
│   │   │   ├── mock-test-environment.test.ts
│   │   │   ├── performance-benchmarks.test.ts
│   │   │   ├── security-test-runner.test.ts
│   │   │   ├── stress-test-orchestrator.test.ts
│   │   │   └── types.test.ts
│   │   ├── phase48
│   │   │   ├── cutover-orchestrator.test.ts
│   │   │   ├── deployment-controller.test.ts
│   │   │   ├── instant-revert.test.ts
│   │   │   ├── launch-readiness.test.ts
│   │   │   ├── mock-deployment-env.test.ts
│   │   │   └── types.test.ts
│   │   ├── phase53
│   │   │   ├── phase53-integration.test.ts
│   │   │   └── uuid-mapper.test.ts
│   │   ├── phase57
│   │   │   ├── cost-allocation.test.ts
│   │   │   └── service-matrix.test.ts
│   │   ├── phase58
│   │   │   ├── auto-topup.test.ts
│   │   │   ├── budget-analytics.test.ts
│   │   │   ├── hardening-concurrency.test.ts
│   │   │   ├── hardening-edge-cases.test.ts
│   │   │   ├── hardening-error-paths.test.ts
│   │   │   ├── hardening-security.test.ts
│   │   │   ├── hardening-timeouts.test.ts
│   │   │   ├── integration.test.ts
│   │   │   ├── invoicing-payments.test.ts
│   │   │   ├── kill-switch.test.ts
│   │   │   ├── transaction-manager.test.ts
│   │   │   └── wallet-core.test.ts
│   │   ├── phase59
│   │   │   ├── cost-ledger.test.ts
│   │   │   ├── margin-analyzer.test.ts
│   │   │   └── rate-limit-manager.test.ts
│   │   ├── phase60
│   │   │   ├── onboarding-state-machine.test.ts
│   │   │   ├── routing-manager.test.ts
│   │   │   └── setup-state-manager.test.ts
│   │   ├── phase60a
│   │   │   ├── risk-scoring-engine.test.ts
│   │   │   ├── risk-types.test.ts
│   │   │   └── signal-providers.test.ts
│   │   ├── phase60b
│   │   │   ├── onboarding-flow-manager.test.ts
│   │   │   └── stage-validators.test.ts
│   │   ├── phase60c
│   │   │   ├── notification-channels.test.ts
│   │   │   ├── notification-dispatcher.test.ts
│   │   │   └── notification-templates.test.ts
│   │   ├── phase60d
│   │   │   ├── credential-generator.test.ts
│   │   │   ├── n8n-admin-access.test.ts
│   │   │   └── n8n-config-generator.test.ts
│   │   ├── phase61
│   │   │   ├── campaign-manager.test.ts
│   │   │   └── campaign-status-machine.test.ts
│   │   ├── phase61a
│   │   │   └── campaign-creation-wizard.test.ts
│   │   ├── phase61b
│   │   │   ├── campaign-creation-wizard.test.ts
│   │   │   ├── campaign-manager.test.ts
│   │   │   ├── campaign-status-machine.test.ts
│   │   │   ├── credential-generator.test.ts
│   │   │   ├── csv-importer.test.ts
│   │   │   ├── csv-parser.test.ts
│   │   │   ├── csv-validator.test.ts
│   │   │   ├── n8n-admin-access.test.ts
│   │   │   ├── n8n-config-generator.test.ts
│   │   │   ├── notification-channels.test.ts
│   │   │   ├── notification-dispatcher.test.ts
│   │   │   ├── notification-templates.test.ts
│   │   │   ├── onboarding-flow-manager.test.ts
│   │   │   ├── onboarding-state-machine.test.ts
│   │   │   ├── risk-scoring-engine.test.ts
│   │   │   ├── risk-types.test.ts
│   │   │   ├── routing-manager.test.ts
│   │   │   ├── setup-state-manager.test.ts
│   │   │   ├── signal-providers.test.ts
│   │   │   └── stage-validators.test.ts
│   │   ├── phase61c
│   │   │   ├── workflow-cloner.test.ts
│   │   │   ├── workflow-namer.test.ts
│   │   │   └── workflow-query-generator.test.ts
│   │   ├── phase62a
│   │   │   ├── cost-breakdown-calculator.test.ts
│   │   │   └── wallet-balance-checker.test.ts
│   │   ├── phase62b
│   │   │   ├── cost-breakdown-calculator.test.ts
│   │   │   ├── rate-limit-checker.test.ts
│   │   │   ├── rate-limit-key-generator.test.ts
│   │   │   └── wallet-balance-checker.test.ts
│   │   ├── phase63
│   │   │   ├── checklist-definitions.test.ts
│   │   │   ├── checklist-manager.test.ts
│   │   │   └── checklist-progress-tracker.test.ts
│   │   ├── phase64
│   │   │   ├── brand-vault-service.test.ts
│   │   │   ├── credential-validation-service.test.ts
│   │   │   ├── credential-vault-service.test.ts
│   │   │   ├── droplet-configuration-service.test.ts
│   │   │   ├── gmail-oauth-service.test.ts
│   │   │   └── onboarding-progress-service.test.ts
│   │   ├── phase64b
│   │   │   ├── email-provider-errors.test.ts
│   │   │   ├── email-provider-integration.test.ts
│   │   │   ├── email-provider-service.test.ts
│   │   │   └── email-provider-validator.test.ts
│   │   ├── phase66
│   │   │   └── gdpr-service.test.ts
│   │   ├── phase66-67
│   │   │   ├── README.md
│   │   │   ├── jest.config.js
│   │   │   ├── security-edge-cases.test.ts
│   │   │   ├── setup.ts
│   │   │   └── sql-functions.test.ts
│   │   ├── phase67
│   │   │   └── audit-logger.test.ts
│   │   ├── phase67b
│   │   │   ├── api-integration.test.ts
│   │   │   ├── jest.config.js
│   │   │   ├── login-audit.test.ts
│   │   │   └── setup.ts
│   │   ├── phase68
│   │   │   ├── api-integration.test.ts
│   │   │   ├── core.test.ts
│   │   │   ├── data-export.test.ts
│   │   │   ├── jest.config.js
│   │   │   ├── setup.ts
│   │   │   └── tenant-lifecycle.test.ts
│   │   ├── phase69
│   │   │   ├── oauth-refresh-handler.test.ts
│   │   │   ├── types.test.ts
│   │   │   ├── webhook-secret-rotation.test.ts
│   │   │   └── webhook-signature-service.test.ts
│   │   ├── phase70
│   │   │   ├── disaster-recovery-controller.test.ts
│   │   │   ├── failover-detector.test.ts
│   │   │   ├── mock-do-environment.test.ts
│   │   │   ├── restoration-orchestrator.test.ts
│   │   │   ├── snapshot-manager.test.ts
│   │   │   └── types.test.ts
│   │   ├── phase70b
│   │   │   ├── deployment-tracker.test.ts
│   │   │   ├── infrastructure-validator.test.ts
│   │   │   └── terraform-state-manager.test.ts
│   │   ├── phase71
│   │   │   ├── alert-manager.test.ts
│   │   │   ├── check-registry.test.ts
│   │   │   ├── diagnostic-engine.test.ts
│   │   │   ├── health-runner.test.ts
│   │   │   └── health-scheduler.test.ts
│   │   ├── phase72
│   │   │   └── fleet-update-system.test.ts
│   │   ├── phase73
│   │   │   └── control-plane-deployment.test.ts
│   │   ├── babel.config.js
│   │   ├── bullmq-event-bus.test.ts
│   │   ├── credential-vault-edge-cases.test.ts
│   │   ├── droplet-provisioning.test.ts
│   │   ├── edge-cases.test.ts
│   │   ├── ignition-integration.test.ts
│   │   ├── jest.config.js
│   │   ├── mock-genesis-rpc.ts
│   │   ├── ohio-firewall.test.ts
│   │   ├── orchestrator-comprehensive.test.ts
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   ├── partition-creation.test.ts
│   │   ├── rls-isolation.test.ts
│   │   ├── setup.test.ts
│   │   ├── sidecar-agent.test.ts
│   │   ├── simple.test.ts
│   │   ├── token-manager.test.ts
│   │   └── uuid-mapper.test.ts
│   └── unit
│       ├── components
│       │   └── daily-sends-chart.test.tsx
│       ├── hooks
│       │   └── use-dashboard-data.test.tsx
│       ├── lib
│       │   ├── constants.test.ts
│       │   ├── html-sanitizer.test.ts
│       │   └── utils.test.ts
│       ├── search-pages.test.ts
│       └── setup.ts
├── app
│   ├── admin
│   │   └── page.tsx
│   ├── analytics
│   │   └── page.tsx
│   ├── api
│   │   ├── admin
│   │   │   ├── all-workspaces
│   │   │   │   └── route.ts
│   │   │   ├── api-health
│   │   │   │   ├── check
│   │   │   │   │   └── [id]
│   │   │   │   │       └── route.ts
│   │   │   │   ├── diagnostics
│   │   │   │   │   └── [serviceId]
│   │   │   │   │       └── route.ts
│   │   │   │   ├── history
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── audit-log
│   │   │   │   └── route.ts
│   │   │   ├── control-plane-health
│   │   │   │   └── route.ts
│   │   │   ├── disaster-recovery
│   │   │   │   ├── failover
│   │   │   │   │   └── route.ts
│   │   │   │   ├── health
│   │   │   │   │   └── route.ts
│   │   │   │   ├── restore
│   │   │   │   │   └── route.ts
│   │   │   │   ├── snapshots
│   │   │   │   │   ├── [id]
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   └── stats
│   │   │   │       └── route.ts
│   │   │   ├── fleet-updates
│   │   │   │   ├── emergency-rollback
│   │   │   │   │   └── route.ts
│   │   │   │   ├── rollouts
│   │   │   │   │   └── route.ts
│   │   │   │   ├── templates
│   │   │   │   │   └── route.ts
│   │   │   │   ├── versions
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── freeze-workspace
│   │   │   │   └── route.ts
│   │   │   ├── llm-usage
│   │   │   │   └── route.ts
│   │   │   ├── migration
│   │   │   │   ├── backfill
│   │   │   │   │   └── start
│   │   │   │   │       └── route.ts
│   │   │   │   ├── cutover
│   │   │   │   │   └── execute
│   │   │   │   │       └── route.ts
│   │   │   │   ├── dual-write
│   │   │   │   │   └── enable
│   │   │   │   │       └── route.ts
│   │   │   │   ├── init
│   │   │   │   │   └── route.ts
│   │   │   │   ├── parity
│   │   │   │   │   └── check
│   │   │   │   │       └── route.ts
│   │   │   │   ├── rollback
│   │   │   │   │   └── route.ts
│   │   │   │   └── status
│   │   │   │       └── route.ts
│   │   │   ├── refresh-views
│   │   │   │   └── route.ts
│   │   │   ├── scale-health
│   │   │   │   ├── alerts
│   │   │   │   │   ├── [id]
│   │   │   │   │   │   ├── acknowledge
│   │   │   │   │   │   │   └── route.ts
│   │   │   │   │   │   └── resolve
│   │   │   │   │   │       └── route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   ├── history
│   │   │   │   │   └── route.ts
│   │   │   │   ├── run-checks
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── unified-audit
│   │   │   │   └── route.ts
│   │   │   └── webhook-dlq
│   │   │       └── route.ts
│   │   ├── ask
│   │   │   ├── key
│   │   │   │   └── route.ts
│   │   │   ├── models
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── ask-key
│   │   │   └── route.ts
│   │   ├── ask-models
│   │   │   └── route.ts
│   │   ├── audit
│   │   │   ├── active-sessions
│   │   │   │   └── route.ts
│   │   │   └── login-history
│   │   │       └── route.ts
│   │   ├── audit-logs
│   │   │   └── route.ts
│   │   ├── billing
│   │   │   ├── history
│   │   │   │   └── route.ts
│   │   │   └── usage
│   │   │       └── route.ts
│   │   ├── campaigns
│   │   │   ├── [id]
│   │   │   │   ├── import
│   │   │   │   │   └── route.ts
│   │   │   │   ├── provision-status
│   │   │   │   │   └── route.ts
│   │   │   │   ├── toggle
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── provision
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── contacts
│   │   │   ├── [id]
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── cost-events
│   │   │   └── route.ts
│   │   ├── cron
│   │   │   ├── api-health-critical
│   │   │   │   └── route.ts
│   │   │   ├── api-health-secondary
│   │   │   │   └── route.ts
│   │   │   ├── clean-webhook-request-ids
│   │   │   │   └── route.ts
│   │   │   ├── disaster-recovery-garbage
│   │   │   │   └── route.ts
│   │   │   ├── disaster-recovery-health
│   │   │   │   └── route.ts
│   │   │   ├── disaster-recovery-snapshots
│   │   │   │   └── route.ts
│   │   │   ├── fleet-update-processor
│   │   │   │   └── route.ts
│   │   │   ├── process-exports
│   │   │   │   └── route.ts
│   │   │   ├── process-webhook-dlq
│   │   │   │   └── route.ts
│   │   │   ├── rotate-credentials
│   │   │   │   └── route.ts
│   │   │   └── sync-campaigns
│   │   │       └── route.ts
│   │   ├── dashboard
│   │   │   └── aggregate
│   │   │       └── route.ts
│   │   ├── events
│   │   │   └── route.ts
│   │   ├── gdpr
│   │   │   ├── compliance-report
│   │   │   │   └── route.ts
│   │   │   ├── delete
│   │   │   │   └── route.ts
│   │   │   └── export
│   │   │       └── route.ts
│   │   ├── health
│   │   │   ├── n8n
│   │   │   │   └── route.ts
│   │   │   ├── status
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── knowledge
│   │   │   └── query
│   │   │       └── route.ts
│   │   ├── llm-usage
│   │   │   └── route.ts
│   │   ├── metrics
│   │   │   ├── by-campaign
│   │   │   │   └── route.ts
│   │   │   ├── by-sender
│   │   │   │   └── route.ts
│   │   │   ├── cost-breakdown
│   │   │   │   └── route.ts
│   │   │   ├── step-breakdown
│   │   │   │   └── route.ts
│   │   │   ├── summary
│   │   │   │   └── route.ts
│   │   │   └── timeseries
│   │   │       └── route.ts
│   │   ├── n8n
│   │   │   └── execution-event
│   │   │       └── route.ts
│   │   ├── notifications
│   │   │   └── route.ts
│   │   ├── oauth
│   │   │   └── gmail
│   │   │       ├── authorize
│   │   │       │   └── route.ts
│   │   │       └── callback
│   │   │           └── route.ts
│   │   ├── onboarding
│   │   │   ├── apify
│   │   │   │   └── route.ts
│   │   │   ├── brand
│   │   │   │   ├── auto-scrape
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── credentials
│   │   │   │   └── route.ts
│   │   │   ├── dns
│   │   │   │   ├── entri
│   │   │   │   │   ├── session
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── verify
│   │   │   │   │       └── route.ts
│   │   │   │   ├── generate
│   │   │   │   │   └── route.ts
│   │   │   │   └── verify
│   │   │   │       └── route.ts
│   │   │   ├── infrastructure
│   │   │   │   └── route.ts
│   │   │   ├── progress
│   │   │   │   └── route.ts
│   │   │   ├── relevance-tool-download
│   │   │   │   └── route.ts
│   │   │   ├── tracking
│   │   │   │   ├── setup
│   │   │   │   │   └── route.ts
│   │   │   │   └── verify
│   │   │   │       └── route.ts
│   │   │   ├── validate-calendly
│   │   │   │   └── route.ts
│   │   │   └── validate-credential
│   │   │       └── route.ts
│   │   ├── research
│   │   │   └── log
│   │   │       └── route.ts
│   │   ├── sandbox
│   │   │   ├── execution
│   │   │   │   └── [executionId]
│   │   │   │       └── route.ts
│   │   │   ├── execution-stream
│   │   │   │   └── [executionId]
│   │   │   │       └── route.ts
│   │   │   ├── history
│   │   │   │   └── route.ts
│   │   │   └── test-campaign
│   │   │       └── route.ts
│   │   ├── search
│   │   │   └── route.ts
│   │   ├── sequences
│   │   │   ├── [id]
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── sheets
│   │   │   └── route.ts
│   │   ├── sync
│   │   │   └── trigger
│   │   │       └── route.ts
│   │   ├── templates
│   │   │   └── route.ts
│   │   ├── track
│   │   │   ├── click
│   │   │   │   └── route.ts
│   │   │   └── open
│   │   │       └── route.ts
│   │   ├── user
│   │   │   ├── settings
│   │   │   │   └── route.ts
│   │   │   └── sync
│   │   │       └── route.ts
│   │   ├── webhooks
│   │   │   ├── [webhookId]
│   │   │   │   └── route.ts
│   │   │   ├── clerk
│   │   │   │   ├── audit
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── n8n
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── workspace
│   │   │   ├── delete
│   │   │   │   ├── confirm
│   │   │   │   │   └── route.ts
│   │   │   │   ├── initiate
│   │   │   │   │   └── route.ts
│   │   │   │   ├── restore
│   │   │   │   │   └── route.ts
│   │   │   │   └── validate
│   │   │   │       └── route.ts
│   │   │   ├── email-config
│   │   │   │   ├── test
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   └── export
│   │   │       ├── cancel
│   │   │       │   └── [jobId]
│   │   │       │       └── route.ts
│   │   │       ├── history
│   │   │       │   └── [workspaceId]
│   │   │       │       └── route.ts
│   │   │       ├── initiate
│   │   │       │   └── route.ts
│   │   │       └── progress
│   │   │           └── [jobId]
│   │   │               └── route.ts
│   │   └── workspaces
│   │       ├── [workspaceId]
│   │       │   ├── access
│   │       │   │   └── route.ts
│   │       │   ├── invites
│   │       │   │   └── route.ts
│   │       │   ├── members
│   │       │   │   └── route.ts
│   │       │   └── route.ts
│   │       ├── config
│   │       │   └── route.ts
│   │       ├── join
│   │       │   └── route.ts
│   │       ├── settings
│   │       │   └── route.ts
│   │       └── route.ts
│   ├── contacts
│   │   └── page.tsx
│   ├── join
│   │   └── page.tsx
│   ├── onboarding
│   │   └── page.tsx
│   ├── sandbox
│   │   └── page.tsx
│   ├── sequences
│   │   └── page.tsx
│   ├── settings
│   │   └── page.tsx
│   ├── sign-in
│   │   └── [[...sign-in]]
│   │       └── page.tsx
│   ├── sign-up
│   │   └── [[...sign-up]]
│   │       └── page.tsx
│   ├── globals.css
│   ├── icon.png
│   ├── layout.tsx
│   ├── not-found.tsx
│   └── page.tsx
├── base-cold-email
│   ├── Email 1-SMTP.json
│   ├── Email 1.json
│   ├── Email 2-SMTP.json
│   ├── Email 2.json
│   ├── Email 3-SMTP.json
│   ├── Email 3.json
│   ├── Email Preparation.json
│   ├── Opt-Out.json
│   ├── Reply Tracker.json
│   └── Research Report.json
├── components
│   ├── admin
│   │   ├── alert-history-tab.tsx
│   │   ├── api-health-services-table.tsx
│   │   ├── api-health-tab.tsx
│   │   ├── audit-log-viewer.tsx
│   │   ├── disaster-recovery-tab.tsx
│   │   ├── fleet-updates-tab.tsx
│   │   ├── migration-control-tab.tsx
│   │   ├── scale-health-tab.tsx
│   │   └── super-admin-panel.tsx
│   ├── campaigns
│   │   ├── campaign-wizard.tsx
│   │   ├── csv-import-dialog.tsx
│   │   ├── new-campaign-modal.tsx
│   │   ├── provisioning-progress.tsx
│   │   └── template-gallery.tsx
│   ├── dashboard
│   │   ├── ask-ai.tsx
│   │   ├── campaign-card-stack.tsx
│   │   ├── campaign-management-card-stack.tsx
│   │   ├── campaign-management-table.tsx
│   │   ├── campaign-pulse.tsx
│   │   ├── campaign-selector.tsx
│   │   ├── campaign-table.tsx
│   │   ├── campaign-toggle.tsx
│   │   ├── compact-controls.tsx
│   │   ├── daily-cost-chart.tsx
│   │   ├── daily-sends-chart.tsx
│   │   ├── dashboard-settings-panel.tsx
│   │   ├── dashboard-widget.tsx
│   │   ├── date-range-picker-content.tsx
│   │   ├── date-range-picker-mobile.tsx
│   │   ├── date-range-picker.tsx
│   │   ├── donut-chart.tsx
│   │   ├── efficiency-metrics.tsx
│   │   ├── lazy-charts.tsx
│   │   ├── metric-card.tsx
│   │   ├── mobile-collapsible-widget.tsx
│   │   ├── provider-selector.tsx
│   │   ├── safe-components.tsx
│   │   ├── sender-breakdown.tsx
│   │   ├── share-dialog-old.tsx
│   │   ├── share-dialog.tsx
│   │   ├── step-breakdown.tsx
│   │   ├── time-series-chart.tsx
│   │   ├── timezone-selector-content.tsx
│   │   ├── timezone-selector.tsx
│   │   └── workspace-switcher.tsx
│   ├── genesis
│   │   ├── stages
│   │   │   ├── anthropic-key-stage.tsx
│   │   │   ├── api-key-input-stage.tsx
│   │   │   ├── apify-selection-stage.tsx
│   │   │   ├── brand-info-stage.tsx
│   │   │   ├── calendly-url-stage.tsx
│   │   │   ├── dns-setup-stage.tsx
│   │   │   ├── email-provider-selection-stage.tsx
│   │   │   ├── gmail-oauth-stage.tsx
│   │   │   ├── google-cse-key-stage.tsx
│   │   │   ├── ignition-stage.tsx
│   │   │   ├── openai-key-stage.tsx
│   │   │   ├── region-selection-stage.tsx
│   │   │   ├── relevance-key-stage.tsx
│   │   │   └── smtp-configuration-stage.tsx
│   │   ├── genesis-onboarding-client.tsx
│   │   └── genesis-onboarding-wizard.tsx
│   ├── layout
│   │   ├── client-shell.tsx
│   │   ├── command-palette.tsx
│   │   ├── header.tsx
│   │   ├── layout-wrapper.tsx
│   │   ├── sidebar.tsx
│   │   └── top-navbar.tsx
│   ├── mobile
│   │   ├── bottom-nav.tsx
│   │   ├── bottom-sheet.tsx
│   │   ├── collapsible-section.tsx
│   │   ├── floating-action-button.tsx
│   │   ├── index.ts
│   │   ├── mobile-drawer.tsx
│   │   └── mobile-header.tsx
│   ├── onboarding
│   │   └── onboarding-tour.tsx
│   ├── pages
│   │   ├── analytics-page-client.tsx
│   │   ├── dashboard-page-client.tsx
│   │   ├── join-page-client.tsx
│   │   └── not-found-client.tsx
│   ├── providers
│   │   ├── clerk-theme-provider.tsx
│   │   └── user-sync-provider.tsx
│   ├── sandbox
│   │   ├── config-status-bar.tsx
│   │   ├── configuration-section.tsx
│   │   ├── execution-monitor.tsx
│   │   ├── sandbox-panel.tsx
│   │   └── test-runner.tsx
│   ├── sequences
│   │   ├── sequence-deck-card.tsx
│   │   ├── sequence-detail.tsx
│   │   └── sequence-list.tsx
│   ├── settings
│   │   ├── active-sessions-modal.tsx
│   │   ├── backup-codes-display.tsx
│   │   ├── config-vault-tab.tsx
│   │   ├── general-settings-tab.tsx
│   │   ├── role-selector.tsx
│   │   ├── security-settings-tab.tsx
│   │   ├── two-factor-modal.tsx
│   │   └── workspace-members-table.tsx
│   ├── ui
│   │   ├── alert.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── bulk-action-toolbar.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── checkbox.tsx
│   │   ├── command-palette.tsx
│   │   ├── context-menu.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── editable-text.tsx
│   │   ├── error-boundary.tsx
│   │   ├── error-fallback-test.tsx
│   │   ├── error-fallbacks.tsx
│   │   ├── floating-action-button.tsx
│   │   ├── form-field.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── loading-states.tsx
│   │   ├── permission-gate.tsx
│   │   ├── role-badge.tsx
│   │   ├── select.tsx
│   │   ├── sign-out-transition.tsx
│   │   ├── skeleton.tsx
│   │   ├── slider.tsx
│   │   ├── switch.tsx
│   │   ├── sync-legend.tsx
│   │   ├── system-health-bar.tsx
│   │   ├── table.tsx
│   │   ├── textarea.tsx
│   │   ├── toast.tsx
│   │   ├── toaster.tsx
│   │   └── tooltip.tsx
│   ├── workspace
│   │   └── access-denied.tsx
│   └── index.ts
├── control-plane
│   ├── docs
│   │   ├── DEPLOYMENT.md
│   │   └── MIGRATION_CHECKLIST.md
│   ├── src
│   │   ├── services
│   │   │   ├── heartbeat-processor.ts
│   │   │   ├── scale-alerts.ts
│   │   │   └── watchdog.ts
│   │   ├── workers
│   │   │   ├── credential-inject.ts
│   │   │   ├── sidecar-update.ts
│   │   │   ├── wake-droplet.ts
│   │   │   ├── worker-manager.ts
│   │   │   └── workflow-update.ts
│   │   ├── config.ts
│   │   └── index.ts
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   ├── railway.toml
│   └── tsconfig.json
├── docs
│   ├── audits
│   │   └── RALPH_LOOP_AUDIT_PHASE_70B_71.md
│   └── main documents
│       ├── GENESIS_SINGULARITY_PLAN_V35.md
│       ├── POST_GENESIS_TESTING_DOCUMENT.md
│       ├── THE_SOVEREIGN_CODEX.md
│       └── master-architecture-diagram.html
├── e2e
│   ├── fixtures
│   │   ├── .auth
│   │   │   ├── .gitignore
│   │   │   └── user.json
│   │   ├── auth.ts
│   │   └── test.ts
│   ├── helpers
│   │   └── test-utils.ts
│   ├── tests
│   │   ├── setup-check.spec.ts
│   │   ├── simple-load.spec.ts
│   │   └── smoke.spec.ts
│   └── .gitignore
├── hooks
│   ├── index.ts
│   ├── use-api-health.ts
│   ├── use-billing.ts
│   ├── use-campaigns.ts
│   ├── use-control-plane-health.ts
│   ├── use-dashboard-data.ts
│   ├── use-dashboard-layout.ts
│   ├── use-disaster-recovery.ts
│   ├── use-fleet-updates.ts
│   ├── use-format-currency.ts
│   ├── use-format-date.ts
│   ├── use-invites.ts
│   ├── use-members.ts
│   ├── use-metrics.ts
│   ├── use-migration-status.ts
│   ├── use-notifications.ts
│   ├── use-sandbox.ts
│   ├── use-scale-health.ts
│   ├── use-selection.ts
│   ├── use-theme.ts
│   ├── use-toast.ts
│   ├── use-workspace-config.ts
│   ├── use-workspace-settings.ts
│   └── use-workspaces.ts
├── lib
│   ├── genesis
│   │   ├── phase43
│   │   │   ├── index.ts
│   │   │   ├── watchdog-mocks.ts
│   │   │   ├── watchdog-service.ts
│   │   │   └── watchdog-types.ts
│   │   ├── phase44
│   │   │   ├── alert-routing.ts
│   │   │   ├── bulk-update.ts
│   │   │   ├── index.ts
│   │   │   ├── metric-aggregator.ts
│   │   │   ├── scale-health-service.ts
│   │   │   └── types.ts
│   │   ├── phase45
│   │   │   ├── execution-event-service.ts
│   │   │   ├── index.ts
│   │   │   ├── mock-n8n.ts
│   │   │   ├── pii-sanitizer.ts
│   │   │   ├── sandbox-rate-limiter.ts
│   │   │   ├── types.ts
│   │   │   └── workflow-trigger.ts
│   │   ├── phase46
│   │   │   ├── backfill-engine.ts
│   │   │   ├── cutover-manager.ts
│   │   │   ├── dual-write-service.ts
│   │   │   ├── index.ts
│   │   │   ├── migration-orchestrator.ts
│   │   │   ├── migration-state-manager.ts
│   │   │   ├── mock-migration-db.ts
│   │   │   ├── parity-checker.ts
│   │   │   ├── supabase-migration-db.ts
│   │   │   └── types.ts
│   │   ├── phase47
│   │   │   ├── chaos-engine.ts
│   │   │   ├── index.ts
│   │   │   ├── load-test-config.ts
│   │   │   ├── mock-test-environment.ts
│   │   │   ├── performance-benchmarks.ts
│   │   │   ├── security-test-runner.ts
│   │   │   ├── stress-test-orchestrator.ts
│   │   │   └── types.ts
│   │   ├── phase48
│   │   │   ├── cutover-orchestrator.ts
│   │   │   ├── deployment-controller.ts
│   │   │   ├── index.ts
│   │   │   ├── instant-revert.ts
│   │   │   ├── launch-readiness.ts
│   │   │   ├── mock-deployment-env.ts
│   │   │   └── types.ts
│   │   ├── phase54
│   │   │   ├── heartbeat-mocks.ts
│   │   │   ├── heartbeat-service.ts
│   │   │   ├── heartbeat-types.ts
│   │   │   └── index.ts
│   │   ├── phase55
│   │   │   ├── hibernation-mocks.ts
│   │   │   ├── hibernation-service.ts
│   │   │   ├── hibernation-types.ts
│   │   │   └── index.ts
│   │   ├── phase56
│   │   │   ├── index.ts
│   │   │   ├── template-mocks.ts
│   │   │   ├── template-service.ts
│   │   │   └── template-types.ts
│   │   ├── phase57
│   │   │   ├── cost-allocation.ts
│   │   │   ├── service-matrix.ts
│   │   │   └── types.ts
│   │   ├── phase58
│   │   │   ├── analytics.ts
│   │   │   ├── audit-logger.ts
│   │   │   ├── auto-topup.ts
│   │   │   ├── budget-manager.ts
│   │   │   ├── index.ts
│   │   │   ├── invoice-generator.ts
│   │   │   ├── kill-switch.ts
│   │   │   ├── mocks.ts
│   │   │   ├── payment-manager.ts
│   │   │   ├── transaction-manager.ts
│   │   │   ├── types.ts
│   │   │   ├── validators.ts
│   │   │   └── wallet-core.ts
│   │   ├── phase59
│   │   │   ├── cost-ledger.ts
│   │   │   ├── index.ts
│   │   │   ├── margin-analyzer.ts
│   │   │   ├── mocks.ts
│   │   │   ├── rate-limit-manager.ts
│   │   │   └── types.ts
│   │   ├── phase60
│   │   │   ├── index.ts
│   │   │   ├── onboarding-state-machine.ts
│   │   │   ├── routing-manager.ts
│   │   │   ├── setup-state-manager.ts
│   │   │   └── types.ts
│   │   ├── phase60a
│   │   │   ├── index.ts
│   │   │   ├── risk-scoring-engine.ts
│   │   │   ├── risk-types.ts
│   │   │   └── signal-providers.ts
│   │   ├── phase60b
│   │   │   ├── index.ts
│   │   │   ├── onboarding-flow-manager.ts
│   │   │   ├── onboarding-types.ts
│   │   │   └── stage-validators.ts
│   │   ├── phase60c
│   │   │   ├── index.ts
│   │   │   ├── notification-channels.ts
│   │   │   ├── notification-dispatcher.ts
│   │   │   ├── notification-templates.ts
│   │   │   └── notification-types.ts
│   │   ├── phase60d
│   │   │   ├── credential-generator.ts
│   │   │   ├── index.ts
│   │   │   ├── n8n-admin-access.ts
│   │   │   ├── n8n-config-generator.ts
│   │   │   └── n8n-types.ts
│   │   ├── phase61
│   │   │   ├── campaign-manager.ts
│   │   │   ├── campaign-status-machine.ts
│   │   │   ├── campaign-types.ts
│   │   │   └── index.ts
│   │   ├── phase61a
│   │   │   ├── campaign-creation-types.ts
│   │   │   ├── campaign-creation-wizard.ts
│   │   │   └── index.ts
│   │   ├── phase61b
│   │   │   ├── campaign-creation-types.ts
│   │   │   ├── campaign-creation-wizard.ts
│   │   │   ├── campaign-manager.ts
│   │   │   ├── campaign-status-machine.ts
│   │   │   ├── campaign-types.ts
│   │   │   ├── credential-generator.ts
│   │   │   ├── csv-import-types.ts
│   │   │   ├── csv-importer.ts
│   │   │   ├── csv-parser.ts
│   │   │   ├── csv-validator.ts
│   │   │   ├── html-email-templates.ts
│   │   │   ├── index.ts
│   │   │   ├── n8n-admin-access.ts
│   │   │   ├── n8n-config-generator.ts
│   │   │   ├── n8n-types.ts
│   │   │   ├── notification-channels.ts
│   │   │   ├── notification-dispatcher.ts
│   │   │   ├── notification-templates.ts
│   │   │   ├── notification-types.ts
│   │   │   ├── onboarding-flow-manager.ts
│   │   │   ├── onboarding-state-machine.ts
│   │   │   ├── onboarding-types.ts
│   │   │   ├── risk-scoring-engine.ts
│   │   │   ├── risk-types.ts
│   │   │   ├── routing-manager.ts
│   │   │   ├── setup-state-manager.ts
│   │   │   ├── signal-providers.ts
│   │   │   ├── stage-validators.ts
│   │   │   └── types.ts
│   │   ├── phase61c
│   │   │   ├── index.ts
│   │   │   ├── workflow-cloner.ts
│   │   │   ├── workflow-namer.ts
│   │   │   ├── workflow-query-generator.ts
│   │   │   └── workflow-types.ts
│   │   ├── phase62a
│   │   │   ├── cost-breakdown-calculator.ts
│   │   │   ├── index.ts
│   │   │   ├── payment-types.ts
│   │   │   └── wallet-balance-checker.ts
│   │   ├── phase62b
│   │   │   ├── cost-breakdown-calculator.ts
│   │   │   ├── index.ts
│   │   │   ├── payment-types.ts
│   │   │   ├── rate-limit-checker.ts
│   │   │   ├── rate-limit-key-generator.ts
│   │   │   ├── rate-limit-types.ts
│   │   │   └── wallet-balance-checker.ts
│   │   ├── phase63
│   │   │   ├── checklist-definitions.ts
│   │   │   ├── checklist-manager.ts
│   │   │   ├── checklist-progress-tracker.ts
│   │   │   ├── checklist-types.ts
│   │   │   └── index.ts
│   │   ├── phase64
│   │   │   ├── brand-vault-service.ts
│   │   │   ├── credential-validation-service.ts
│   │   │   ├── credential-vault-service.ts
│   │   │   ├── credential-vault-types.ts
│   │   │   ├── droplet-configuration-service.ts
│   │   │   ├── gmail-oauth-service.ts
│   │   │   ├── index.ts
│   │   │   └── onboarding-progress-service.ts
│   │   ├── phase64b
│   │   │   ├── email-provider-service.ts
│   │   │   ├── email-provider-types.ts
│   │   │   ├── email-provider-validator.ts
│   │   │   └── index.ts
│   │   ├── phase65
│   │   │   ├── brand-metadata-scraper.ts
│   │   │   ├── calendly-validator.ts
│   │   │   └── index.ts
│   │   ├── phase65-2
│   │   │   ├── dns-record-generator.ts
│   │   │   ├── dns-verifier.ts
│   │   │   ├── entri-integration.ts
│   │   │   ├── index.ts
│   │   │   ├── tracking-domain-manager.ts
│   │   │   └── tracking-domain-verifier.ts
│   │   ├── phase69
│   │   │   ├── credential-rotation-service.ts
│   │   │   ├── index.ts
│   │   │   ├── oauth-refresh-handler.ts
│   │   │   ├── request-id-deduplicator.ts
│   │   │   ├── types.ts
│   │   │   ├── webhook-dlq-service.ts
│   │   │   ├── webhook-secret-rotation-service.ts
│   │   │   └── webhook-signature-service.ts
│   │   ├── phase70
│   │   │   ├── db-service.ts
│   │   │   ├── disaster-recovery-controller.ts
│   │   │   ├── do-client.ts
│   │   │   ├── failover-detector.ts
│   │   │   ├── index.ts
│   │   │   ├── mock-do-environment.ts
│   │   │   ├── restoration-orchestrator.ts
│   │   │   ├── snapshot-manager.ts
│   │   │   └── types.ts
│   │   ├── phase70b
│   │   │   ├── deployment-tracker.ts
│   │   │   ├── index.ts
│   │   │   ├── infrastructure-validator.ts
│   │   │   ├── terraform-state-manager.ts
│   │   │   └── types.ts
│   │   ├── phase71
│   │   │   ├── checks
│   │   │   │   ├── anthropic.ts
│   │   │   │   ├── apify.ts
│   │   │   │   ├── digitalocean.ts
│   │   │   │   ├── gmail.ts
│   │   │   │   ├── google-cse.ts
│   │   │   │   ├── openai.ts
│   │   │   │   ├── redis.ts
│   │   │   │   ├── relevance-ai.ts
│   │   │   │   └── supabase.ts
│   │   │   ├── alert-manager.ts
│   │   │   ├── check-registry.ts
│   │   │   ├── diagnostic-engine.ts
│   │   │   ├── health-runner.ts
│   │   │   ├── health-scheduler.ts
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── phase72
│   │   │   ├── db-service.ts
│   │   │   ├── emergency-rollback.ts
│   │   │   ├── index.ts
│   │   │   ├── rollout-engine.ts
│   │   │   ├── sidecar-update-protocol.ts
│   │   │   ├── template-manager.ts
│   │   │   ├── types.ts
│   │   │   ├── update-monitor.ts
│   │   │   ├── update-queue.ts
│   │   │   └── version-registry.ts
│   │   ├── phase73-control-plane
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── sql-phase41
│   │   │   └── schema.sql
│   │   ├── sql-phase42
│   │   │   └── schema.sql
│   │   ├── sql-phase53
│   │   │   └── schema.sql
│   │   ├── audit-logger.ts
│   │   ├── bullmq-types.ts
│   │   ├── concurrency-governor.ts
│   │   ├── credential-vault.ts
│   │   ├── data-export.ts
│   │   ├── dead-letter-queue.ts
│   │   ├── do-client.ts
│   │   ├── droplet-factory.ts
│   │   ├── gdpr-service.ts
│   │   ├── genesis-db-config.ts
│   │   ├── handshake-db-mock.ts
│   │   ├── handshake-service.ts
│   │   ├── handshake-types.ts
│   │   ├── ignition-orchestrator.ts
│   │   ├── ignition-types.ts
│   │   ├── index.ts
│   │   ├── login-audit.ts
│   │   ├── mapper-types.ts
│   │   ├── ohio-firewall.ts
│   │   ├── partition-manager.ts
│   │   ├── phase41-integration.ts
│   │   ├── queue-manager.ts
│   │   ├── redis-connection.ts
│   │   ├── schema-check.ts
│   │   ├── sidecar-client.ts
│   │   ├── sidecar-commands.ts
│   │   ├── template-manager.ts
│   │   ├── tenant-lifecycle.ts
│   │   ├── token-manager.ts
│   │   ├── uuid-mapper.ts
│   │   ├── variable-mapper.ts
│   │   ├── worker-base.ts
│   │   └── workflow-validator.ts
│   ├── hooks
│   │   ├── use-campaign-pulse.ts
│   │   ├── use-connection-health.ts
│   │   ├── use-keyboard-shortcuts.ts
│   │   ├── use-onboarding-tour.ts
│   │   └── use-permissions.ts
│   ├── types
│   │   ├── health-types.ts
│   │   └── rbac-types.ts
│   ├── api-utils.ts
│   ├── api-workspace-guard.ts
│   ├── ask-key-store.ts
│   ├── auth.ts
│   ├── budget-alerts.ts
│   ├── cache.ts
│   ├── constants.ts
│   ├── create-campaign-notification.ts
│   ├── currency-context.tsx
│   ├── dashboard-context.tsx
│   ├── dashboard-types.ts
│   ├── database.types.ts
│   ├── date-range-context.tsx
│   ├── db-queries.ts
│   ├── encryption.ts
│   ├── fetcher.ts
│   ├── google-sheets.ts
│   ├── html-sanitizer.ts
│   ├── n8n-client.ts
│   ├── n8n-sync.ts
│   ├── notification-utils.ts
│   ├── rag-context.ts
│   ├── rate-limit.ts
│   ├── react-polyfills.ts
│   ├── realtime-health.ts
│   ├── response-sanitizer.ts
│   ├── sanitize.ts
│   ├── search-pages.ts
│   ├── sidebar-context.tsx
│   ├── supabase-browser.ts
│   ├── supabase.ts
│   ├── swr-config.tsx
│   ├── timezone-context.tsx
│   ├── utils.ts
│   ├── validation.ts
│   ├── webhook-delivery.ts
│   ├── workspace-access.ts
│   ├── workspace-context.tsx
│   └── workspace-db-config.ts
├── packages
│   └── shared
│       ├── constants.ts
│       └── types.ts
├── public
│   └── logo.png
├── ralph-loop
│   ├── CLAUDE-ralph.md
│   ├── prd-old.json
│   ├── prd.json
│   ├── progress.txt
│   ├── prompt.md
│   └── ralph.sh
├── scripts
│   ├── README.md
│   ├── apply-genesis-migrations.ts
│   ├── apply-phase-31-migration.ts
│   ├── apply-phase33-migrations.ts
│   ├── apply-user-settings-migration.ts
│   ├── backfill-clerk-users.ts
│   ├── check-database-schema.js
│   ├── check-supabase-config.ts
│   ├── clean-smtp-workflows.ts
│   ├── convert-database-types.py
│   ├── create-phase64b-email1.js
│   ├── duplicate-workflows-to-n8n.js
│   ├── export-and-prepare.sh
│   ├── fix-database-types.py
│   ├── fix-supabase-types.ts
│   ├── generate-types.ts
│   ├── install-antigravity.sh
│   ├── manual-install.csv
│   ├── phase64b-transformer.ts
│   ├── phase64b-workflow-deployer.ts
│   ├── strip_code_blocks.py
│   ├── test-campaign-dropdown.js
│   ├── test-click-tracking.sh
│   ├── test-phase-10.sh
│   ├── test-workspace-setup.sql
│   ├── validate-phase64b.js
│   ├── validate-phase71-46-db.js
│   ├── verify-access-gate.ts
│   ├── verify-anti-leak-mesh.ts
│   ├── verify-crypto.ts
│   ├── verify-database-data.js
│   ├── verify-ephemeral-runtime.ts
│   ├── verify-phase-10-migration.sh
│   ├── verify-phase-8-complete.sh
│   ├── verify-phase-8-step-1-2.sh
│   ├── verify-phase-8-step-3-4.sh
│   ├── verify-phase-9-batch-1.sh
│   ├── verify-phase-9-batch-2.sh
│   ├── verify-phase-9-batch-3.sh
│   ├── verify-phase-9-step-1-2.sh
│   └── verify-vault-schema.ts
├── sidecar
│   ├── .env.example
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── docker-manager.ts
│   ├── jest.config.js
│   ├── jwt-verifier.ts
│   ├── mailparser.d.ts
│   ├── n8n-manager.ts
│   ├── package-lock.json
│   ├── package.json
│   ├── sidecar-agent.ts
│   ├── smtp-service.ts
│   ├── test-smtp.ts
│   ├── tsconfig.json
│   └── workflow-deployer.ts
├── supabase
│   ├── migrations
│   │   ├── skipped
│   │   │   ├── 20251207_add_performance_indexes.sql
│   │   │   ├── 20251207_materialized_views.sql
│   │   │   ├── 20251207_webhook_queue_idempotency.sql
│   │   │   ├── 20251208_core_features.sql
│   │   │   ├── 20251213_create_safe_views.sql
│   │   │   ├── 20251213_create_vault_audit.sql
│   │   │   ├── 20251213_create_workspace_keys.sql
│   │   │   ├── 20251213_enable_rls_policies.sql
│   │   │   ├── 20251213_enforce_one_owner.sql
│   │   │   ├── 20251213_sync_leads_ohio_schema.sql
│   │   │   ├── 20251219_add_provisioning_columns.sql
│   │   │   ├── 20251219_create_provisioning_status.sql
│   │   │   ├── 20251219_create_role_audit_log.sql
│   │   │   ├── 20251219_create_sync_status.sql
│   │   │   ├── 20251219_create_workflow_templates.sql
│   │   │   ├── 20251220_add_workspace_status.sql
│   │   │   ├── 20251220_create_workspace_config.sql
│   │   │   └── 20251220_fix_notifications_and_research.sql
│   │   ├── 20251205_add_event_ts_index.sql
│   │   ├── 20251206000001_add_workspace_invites.sql
│   │   ├── 20251206000002_create_workspace_tables.sql
│   │   ├── 20251207000001_add_performance_indexes.sql
│   │   ├── 20251207000002_materialized_views.sql
│   │   ├── 20251207000003_add_email_number_column.sql
│   │   ├── 20251207000004_fix_materialized_view_columns.sql
│   │   ├── 20251207000005_fix_mv_use_step_column.sql
│   │   ├── 20251208_add_workspace_to_leads_ohio.sql
│   │   ├── 20251209_clerk_sync_rls.sql
│   │   ├── 20251210_add_campaigns_and_views.sql
│   │   ├── 20251211_add_ask_api_keys.sql
│   │   ├── 20251212_add_contact_status.sql
│   │   ├── 20251218_add_n8n_integration.sql
│   │   ├── 20260101_create_knowledge_base.sql
│   │   ├── 20260126_001_create_genesis_schema.sql
│   │   ├── 20260126_002_create_leads_parent_table.sql
│   │   ├── 20260126_003_create_partition_functions.sql
│   │   ├── 20260126_004_create_rls_policies.sql
│   │   ├── 20260126_005_create_partition_registry.sql
│   │   ├── 20260126_006_create_droplet_infrastructure.sql
│   │   ├── 20260126_007_create_sidecar_infrastructure.sql
│   │   ├── 20260126_create_user_settings.sql
│   │   ├── 20260126_create_webhook_system.sql
│   │   ├── 20260126_genesis_part2_complete.sql
│   │   ├── 20260127_001_genesis_part3_complete.sql
│   │   ├── 20260130_001_part_vi_onboarding_state.sql
│   │   ├── 20260130_002_phase64_genesis_gateway.sql
│   │   ├── 20260130_003_remove_tone_column.sql
│   │   ├── 20260131_001_phase64b_email_provider_config.sql
│   │   ├── 20260201_create_notifications_table.sql
│   │   ├── 20260207120001_phase67_audit_logging.sql
│   │   ├── 20260207120002_phase66_gdpr_functions.sql
│   │   ├── 20260207140001_phase68_tenant_lifecycle.sql
│   │   ├── 20260208120001_phase44_god_mode_scale_health.sql
│   │   ├── 20260208130001_phase45_sandbox_engine.sql
│   │   ├── 20260209120001_phase69_credential_rotation_webhook_security.sql
│   │   ├── 20260212181306_phase71_api_health.sql
│   │   ├── 20260212183000_phase46_migration_schema.sql
│   │   ├── 20260213000000_phase70_disaster_recovery.sql
│   │   ├── 20260213100000_phase72_fleet_update_protocol.sql
│   │   ├── 20260216000000_add_missing_workflow_columns.sql
│   │   └── add_event_ts_index.sql
│   ├── scripts
│   │   ├── README.md
│   │   ├── apply_fixed_trigger.sql
│   │   ├── check_schema.sql
│   │   ├── debug_materialized_view.sql
│   │   ├── fix_trigger.sql
│   │   ├── link_campaigns_to_n8n.sql
│   │   ├── verify_genesis_schema.sql
│   │   └── verify_genesis_summary.sql
│   └── schema.sql
├── templates
│   ├── cloud-init.yaml.template
│   └── docker-compose.yaml.template
├── terraform
│   ├── environments
│   │   └── production
│   │       ├── main.tf
│   │       ├── outputs.tf
│   │       └── variables.tf
│   ├── modules
│   │   ├── dashboard_droplet
│   │   │   ├── cloud-init
│   │   │   │   └── dashboard.yml
│   │   │   ├── main.tf
│   │   │   ├── outputs.tf
│   │   │   └── variables.tf
│   │   ├── dns
│   │   │   ├── main.tf
│   │   │   ├── outputs.tf
│   │   │   └── variables.tf
│   │   ├── loadbalancer
│   │   │   ├── main.tf
│   │   │   ├── outputs.tf
│   │   │   └── variables.tf
│   │   └── redis_cluster
│   │       ├── main.tf
│   │       ├── outputs.tf
│   │       └── variables.tf
│   └── README.md
├── tests
│   └── load
│       ├── # Code Citations.md
│       ├── README.md
│       └── load-test.yml
├── types
│   ├── archiver.d.ts
│   ├── express.d.ts
│   ├── json2csv.d.ts
│   ├── pino.d.ts
│   └── shims-aliases.d.ts
├── .env.example
├── .eslintrc.json
├── .gitattributes
├── .gitignore
├── .npmrc
├── .watchmanconfig
├── CONTRIBUTING.md
├── README.md
├── jest.config.ts
├── next-env.d.ts
├── next.config.js
├── package-lock.json
├── package.json
├── playwright.config.setup.ts
├── playwright.config.ts
├── postcss.config.js
├── proxy.ts
├── tailwind.config.js
├── tsconfig.json
└── vercel.json
```

---
*Generated by FileTree Pro Extension*