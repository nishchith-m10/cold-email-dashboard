# Future Implementation Registry

> **Document Purpose**
>
> This document serves as a comprehensive record of all planned features that have been intentionally
> deferred. None of these features are currently implemented in the codebase. This registry exists to
> ensure clarity on what remains to be built when the time is right.

---

## Table of Contents

1. [Critical Security and Integrity Features](#1-critical-security-and-integrity-features)

   - [1.1 Email Verification System](#11-email-verification-system)
   - [1.2 Domain Health Monitor](#12-domain-health-monitor)
   - [1.3 Watchdog Auto-Pause System](#13-watchdog-auto-pause-system)

2. [Infrastructure and Performance Features](#2-infrastructure-and-performance-features)

   - [2.1 Redis Caching Layer](#21-redis-caching-layer)

3. [Campaign Intelligence Features](#3-campaign-intelligence-features)

   - [3.1 A/B Testing System](#31-ab-testing-system)
   - [3.2 ML Send Time Optimization](#32-ml-send-time-optimization)

4. [Data Acquisition Features](#4-data-acquisition-features)

   - [4.1 Sovereign Scraper System](#41-sovereign-scraper-system)

5. [Analytics and Reporting Features](#5-analytics-and-reporting-features)

   - [5.1 Advanced Analytics Dashboard](#51-advanced-analytics-dashboard)
   - [5.2 Cohort Analysis Module](#52-cohort-analysis-module)
   - [5.3 Predictive Analytics Engine](#53-predictive-analytics-engine)
   - [5.4 Export Reports System](#54-export-reports-system)

6. [Financial and Billing Features](#6-financial-and-billing-features)

   - [6.1 Cost Forecasting and Alerts](#61-cost-forecasting-and-alerts)
   - [6.2 Prepaid Economic Engine](#62-prepaid-economic-engine)

7. [AI Quality Assurance Features](#7-ai-quality-assurance-features)

   - [7.1 AI Evaluation Matrix](#71-ai-evaluation-matrix)

8. [Observability Features](#8-observability-features)

   - [8.1 Centralized Forensic Logging](#81-centralized-forensic-logging)

9. [Security Mesh Features](#9-security-mesh-features)

   - [9.1 Sentinel Guardrails System](#91-sentinel-guardrails-system)

10. [Data Enrichment Features](#10-data-enrichment-features)

    - [10.1 Golden 10 Core Metrics](#101-golden-10-core-metrics)

11. [Roadmap Consolidation](#11-roadmap-consolidation)

---

---

---

## 1. Critical Security and Integrity Features

These features address fundamental risks to email deliverability and domain reputation.
Without them, scaling outbound campaigns carries significant risk.

---

### 1.1 Email Verification System

**Original Phase:** Phase 1

**Status:** Not Implemented

**Priority Level:** Critical

**Risk Category:** Domain Burnout

---

#### Overview

The Email Verification System is designed to validate email addresses before any
outbound communication is attempted. This prevents sending to invalid, inactive,
or spam-trap addresses that can permanently damage sender reputation.

---

#### Business Justification

Sending emails to invalid addresses results in hard bounces. Industry best practice
dictates that bounce rates must remain below three percent. Exceeding this threshold
triggers spam filters and can result in domain blacklisting.

Without verification, every new lead imported into the system carries unknown risk.
The system currently has no mechanism to distinguish between a valid corporate email
and a defunct address that will immediately bounce.

---

#### Intended Functionality

The verification system would intercept leads at the point of entry, before they
are committed to the database. Each email address would be validated through a
third-party verification API.

Addresses that fail verification would be rejected or flagged, preventing them
from entering the active lead pool. Only verified addresses would proceed through
the email preparation workflow.

---

#### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         EMAIL VERIFICATION FLOW                         │
└─────────────────────────────────────────────────────────────────────────┘

     ┌──────────┐
     │ New Lead │
     │  Import  │
     └────┬─────┘
          │
          ▼
     ┌──────────────────┐
     │  Verification    │
     │      API         │
     │  MillionVerifier │
     │   or ZeroBounce  │
     └────────┬─────────┘
              │
              ▼
     ┌────────────────────────┐
     │    Validation Result   │
     └────────┬───────────────┘
              │
      ┌───────┴───────┐
      │               │
      ▼               ▼
┌──────────┐    ┌──────────┐
│  VALID   │    │ INVALID  │
│          │    │          │
│ Continue │    │  Reject  │
│ to Queue │    │  / Flag  │
└──────────┘    └──────────┘
```

---

#### Dependencies

This feature requires integration with a third-party email verification service.
The two primary candidates are MillionVerifier and ZeroBounce, both offering
real-time validation endpoints.

The n8n workflow for email preparation would need modification to include a
verification node before the database insert operation.

---

#### Future Considerations

Batch verification may be necessary for bulk imports. Rate limiting and cost
management for verification API calls will need to be addressed during
implementation.

---

---

---

### 1.2 Domain Health Monitor

**Original Phase:** Phase 1

**Status:** Not Implemented

**Priority Level:** Critical

**Risk Category:** Deliverability Failure

---

#### Overview

The Domain Health Monitor provides automated surveillance of email authentication
records. It ensures that DKIM, SPF, and DMARC configurations remain valid and
properly configured.

---

#### Business Justification

Email authentication records are foundational to deliverability. If a DKIM key
expires, an SPF record is misconfigured, or DMARC fails validation, emails will
be rejected or sent to spam folders.

Currently, there is no automated detection for these failures. The only indication
of a problem is a sudden drop in open rates, which may not be noticed until
significant damage has occurred.

---

#### Intended Functionality

The monitor would execute on a scheduled basis, checking DNS records for all
configured sending domains. Any deviation from expected values would trigger an
immediate alert.

The system would validate:

- DKIM public key presence and validity
- SPF record syntax and include statements
- DMARC policy existence and configuration
- MX record health

---

#### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      DOMAIN HEALTH MONITOR FLOW                         │
└─────────────────────────────────────────────────────────────────────────┘

          ┌──────────────┐
          │ Scheduled    │
          │ Cron Trigger │
          │  (Weekly)    │
          └──────┬───────┘
                 │
                 ▼
          ┌──────────────┐
          │   Domain     │
          │   Health     │
          │   Monitor    │
          └──────┬───────┘
                 │
     ┌───────────┼───────────┐
     │           │           │
     ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│  DKIM   │ │   SPF   │ │  DMARC  │
│  Check  │ │  Check  │ │  Check  │
└────┬────┘ └────┬────┘ └────┬────┘
     │           │           │
     └───────────┴───────────┘
                 │
                 ▼
          ┌──────────────┐
          │   Results    │
          │  Aggregator  │
          └──────┬───────┘
                 │
         ┌───────┴───────┐
         │               │
         ▼               ▼
    ┌─────────┐     ┌─────────┐
    │ HEALTHY │     │  ALERT  │
    │         │     │ TRIGGER │
    │  Log    │     │  Notify │
    └─────────┘     └─────────┘
```

---

#### Dependencies

This feature requires DNS lookup capabilities and access to sending domain
configurations. Alert delivery would utilize the existing notification
infrastructure.

---

#### Future Considerations

Historical tracking of DNS changes may be valuable for compliance and audit
purposes. Integration with domain registrars for automated record management
could be explored.

---

---

---

### 1.3 Watchdog Auto-Pause System

**Original Phase:** Phase 2

**Status:** Not Implemented

**Priority Level:** Critical

**Risk Category:** Sender Destruction

---

#### Overview

The Watchdog is an automated circuit breaker that monitors email events in real
time and pauses problematic senders before they cause irreversible damage.

---

#### Business Justification

When a sender account begins experiencing high bounce rates, continued sending
compounds the damage. Each additional bounce contributes to reputation degradation.

Currently, the system has no mechanism to detect and respond to this scenario.
A sender could accumulate dozens of bounces before any human intervention occurs,
potentially burning the sender permanently.

---

#### Intended Functionality

The Watchdog monitors the email events stream, tracking bounce occurrences per
sender. When a sender exceeds a configurable threshold within a defined window,
the system automatically sets their active status to false.

Simultaneously, an alert is dispatched to administrators, providing full context
on the paused sender and the events that triggered the pause.

---

#### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      WATCHDOG AUTO-PAUSE FLOW                           │
└─────────────────────────────────────────────────────────────────────────┘

     ┌───────────────┐
     │ Email Events  │
     │    Stream     │
     └───────┬───────┘
             │
             ▼
     ┌───────────────┐
     │    Bounce     │
     │   Counter     │
     │  (Per Sender) │
     └───────┬───────┘
             │
             ▼
     ┌───────────────────┐
     │    Threshold      │
     │    Evaluation     │
     │                   │
     │  Example:         │
     │  5 bounces in     │
     │  24 hours         │
     └─────────┬─────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
  ┌─────────┐     ┌─────────────┐
  │  UNDER  │     │  EXCEEDED   │
  │ LIMIT   │     │             │
  │         │     │ ┌─────────┐ │
  │Continue │     │ │ PAUSE   │ │
  │Sending  │     │ │ SENDER  │ │
  └─────────┘     │ └────┬────┘ │
                  │      │      │
                  │      ▼      │
                  │ ┌─────────┐ │
                  │ │  ALERT  │ │
                  │ │  ADMIN  │ │
                  │ └─────────┘ │
                  └─────────────┘
```

---

#### Dependencies

This feature requires access to the email events table and the ability to update
sender status. The n8n workflow engine would host the monitoring logic.

---

#### Future Considerations

Configurable thresholds per sender or per domain would provide flexibility.
Automatic sender rehabilitation after a cooldown period could be implemented.

---

---

---

## 2. Infrastructure and Performance Features

These features address scalability and performance requirements for production
traffic levels.

---

### 2.1 Redis Caching Layer

**Original Phase:** Phase 2

**Status:** Not Implemented

**Priority Level:** High

**Risk Category:** Performance Degradation

---

#### Overview

The Redis Caching Layer introduces a high-performance in-memory cache between
the application and the PostgreSQL database, reducing query latency and database
load.

---

#### Business Justification

The current implementation queries PostgreSQL directly for all dashboard data.
While acceptable for low concurrency, this architecture will not scale. Under
load, database connection pools will exhaust, queries will queue, and the
dashboard will become unresponsive.

An in-memory cache dramatically reduces database pressure by serving repeated
queries from memory. Redis specifically offers persistence options, pub/sub
capabilities, and is battle-tested for this use case.

---

#### Intended Functionality

The caching layer would intercept dashboard queries and check Redis before
hitting PostgreSQL. Cache hits return immediately. Cache misses fetch from the
database and populate the cache for subsequent requests.

Intelligent cache invalidation would ensure data freshness. Event-driven
invalidation based on database changes would provide near-real-time accuracy.

---

#### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        REDIS CACHING LAYER FLOW                         │
└─────────────────────────────────────────────────────────────────────────┘

     ┌─────────────┐
     │   Client    │
     │  Requests   │
     └──────┬──────┘
            │
            ▼
     ┌─────────────┐
     │   Check     │
     │   Redis     │
     │   Cache     │
     └──────┬──────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
┌─────────┐    ┌──────────┐
│  HIT    │    │   MISS   │
│         │    │          │
│ Return  │    │  Query   │
│ Cached  │    │ Postgres │
│ Data    │    │          │
└─────────┘    └────┬─────┘
                    │
                    ▼
               ┌──────────┐
               │ Populate │
               │  Cache   │
               └────┬─────┘
                    │
                    ▼
               ┌──────────┐
               │  Return  │
               │   Data   │
               └──────────┘
```

---

#### Current State

A local in-memory cache exists in the codebase at the library level. However,
this is a simple JavaScript Map object that does not persist across server
restarts, does not share state across multiple instances, and lacks the
robustness of a dedicated caching solution.

---

#### Dependencies

Implementation would require an Upstash Redis instance or self-hosted Redis
deployment. The cache library would need to be replaced with a Redis client.

---

#### Future Considerations

Cache warming strategies for cold starts should be evaluated. Cache analytics
to monitor hit rates and optimize TTL values would be valuable.

---

---

---

## 3. Campaign Intelligence Features

These features enhance campaign effectiveness through data-driven optimization.

---

### 3.1 A/B Testing System

**Original Phase:** Phase 2

**Status:** Not Implemented

**Priority Level:** Medium

**Risk Category:** Optimization Gap

---

#### Overview

The A/B Testing System enables scientific comparison of email variants, allowing
data-driven decisions on subject lines, content, and sending strategies.

---

#### Business Justification

Without A/B testing, campaign optimization relies on intuition rather than data.
There is no mechanism to definitively determine whether Subject Line A performs
better than Subject Line B.

Implementing systematic testing provides a framework for continuous improvement.
Small gains in open rates compound over time, significantly impacting overall
campaign performance.

---

#### Intended Functionality

The system would split campaign traffic among defined variants. Each recipient
would be assigned to a variant, and that assignment would persist throughout
their engagement lifecycle.

Variant performance metrics would be tracked independently, enabling comparison
across key indicators. Statistical significance calculations would determine
when a winner can be declared.

---

#### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        A/B TESTING SYSTEM FLOW                          │
└─────────────────────────────────────────────────────────────────────────┘

          ┌──────────────┐
          │   Campaign   │
          │    Start     │
          └──────┬───────┘
                 │
                 ▼
          ┌──────────────┐
          │   Traffic    │
          │   Splitter   │
          └──────┬───────┘
                 │
         ┌───────┴───────┐
         │               │
         ▼               ▼
    ┌─────────┐     ┌─────────┐
    │ Variant │     │ Variant │
    │    A    │     │    B    │
    │  (50%)  │     │  (50%)  │
    └────┬────┘     └────┬────┘
         │               │
         ▼               ▼
    ┌─────────┐     ┌─────────┐
    │  Send   │     │  Send   │
    │  Email  │     │  Email  │
    │ Version │     │ Version │
    │    A    │     │    B    │
    └────┬────┘     └────┬────┘
         │               │
         └───────┬───────┘
                 │
                 ▼
          ┌──────────────┐
          │  Analytics   │
          │  Comparison  │
          └──────┬───────┘
                 │
                 ▼
          ┌──────────────┐
          │   Winner     │
          │  Selection   │
          └──────────────┘
```

---

#### Dependencies

Database schema modifications are required to track variant assignments. The
n8n workflow needs logic to implement traffic splitting. Dashboard components
would display comparison results.

---

#### Future Considerations

Multi-variant testing beyond simple A/B could be explored. Automated winner
selection with rollout to remaining recipients would enhance efficiency.

---

---

---

### 3.2 ML Send Time Optimization

**Original Phase:** Phase 3

**Status:** Not Implemented

**Priority Level:** Low

**Risk Category:** Engagement Gap

---

#### Overview

ML Send Time Optimization uses machine learning to determine the optimal time to
send emails to each individual recipient, maximizing the probability of engagement.

---

#### Business Justification

Emails sent at the wrong time are buried under newer messages by the time the
recipient checks their inbox. Currently, emails are sent chronologically based
on queue position, with no consideration for recipient behavior patterns.

Machine learning can analyze historical engagement data to predict when each lead
is most likely to read and respond to emails. This personalized timing improves
open and reply rates without changing the content.

---

#### Intended Functionality

The system would build engagement profiles based on historical open and reply
timestamps. These profiles would inform a scheduling algorithm that delays email
dispatch until the optimal window for each recipient.

Time zone awareness would be incorporated, ensuring emails arrive during business
hours in the recipient's local time.

---

#### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ML SEND TIME OPTIMIZATION FLOW                       │
└─────────────────────────────────────────────────────────────────────────┘

     ┌───────────────────┐
     │    Historical     │
     │   Engagement      │
     │      Data         │
     └─────────┬─────────┘
               │
               ▼
     ┌───────────────────┐
     │   ML Training     │
     │     Model         │
     │                   │
     │  Learns patterns  │
     │  per recipient    │
     └─────────┬─────────┘
               │
               ▼
     ┌───────────────────┐
     │    Prediction     │
     │     Engine        │
     │                   │
     │  Optimal time     │
     │  per lead         │
     └─────────┬─────────┘
               │
               ▼
     ┌───────────────────┐
     │   Smart Queue     │
     │    Scheduler      │
     │                   │
     │  Delays until     │
     │  optimal window   │
     └─────────┬─────────┘
               │
               ▼
     ┌───────────────────┐
     │     Email         │
     │    Dispatch       │
     └───────────────────┘
```

---

#### Dependencies

Significant historical engagement data is required for model training. ML
infrastructure and expertise would be needed for implementation. This is
considered a future AI enhancement.

---

#### Future Considerations

Real-time model updating based on new engagement signals could improve accuracy
over time. Integration with external signals such as calendar data or industry
benchmarks could enhance predictions.

---

---

---

## 4. Data Acquisition Features

These features address lead sourcing and enrichment through proprietary data
collection systems.

---

### 4.1 Sovereign Scraper System

**Original Phase:** Phase X (Future)

**Status:** Not Implemented

**Priority Level:** Strategic

**Risk Category:** Lead Dependency

---

#### Overview

The Sovereign Scraper is an internal lead generation system designed to eliminate
dependency on expensive third-party data providers. It leverages Google Maps and
public website data to construct verified lead profiles.

---

#### Business Justification

Current lead acquisition relies on purchased lists or services like Apollo and
ZoomInfo, which carry significant costs and data quality concerns. The target
market exists primarily on Google Maps rather than LinkedIn, creating an
opportunity for alternative sourcing.

Building an internal scraper provides fresh data directly from the source at a
fraction of the cost. It also eliminates the risk of spam traps that frequently
contaminate purchased lists.

---

#### Intended Functionality

The system operates as a four-stage waterfall:

**Stage One: Google Maps Grid**
The scraper systematically searches Google Maps for businesses matching target
criteria within defined geographic grids. It extracts company names, addresses,
phone numbers, and website URLs.

**Stage Two: Website Forensics**
Collected website URLs are visited by a headless browser. The system scans for
leadership pages, team directories, and contact information to extract individual
names and roles.

**Stage Three: Email Permutation**
Using extracted names and company domains, the system generates likely email
address patterns based on common conventions.

**Stage Four: Verification**
Generated email addresses are validated through SMTP handshake or verification
API to confirm deliverability.

---

#### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     SOVEREIGN SCRAPER WATERFALL                         │
└─────────────────────────────────────────────────────────────────────────┘

     ┌───────────────────────────────────────────────────────────────┐
     │                      STAGE 1                                  │
     │                  GOOGLE MAPS GRID                             │
     │                                                               │
     │   Search Query ──► Grid Coordinates ──► Business Listings    │
     │                                                               │
     │   Output: Company Name, Address, Phone, Website URL          │
     └───────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼
     ┌───────────────────────────────────────────────────────────────┐
     │                      STAGE 2                                  │
     │                 WEBSITE FORENSICS                             │
     │                                                               │
     │   Visit URL ──► Scan Pages ──► Extract Names and Roles       │
     │                                                               │
     │   Output: First Name, Last Name, Title, Domain               │
     └───────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼
     ┌───────────────────────────────────────────────────────────────┐
     │                      STAGE 3                                  │
     │                 EMAIL PERMUTATION                             │
     │                                                               │
     │   Name + Domain ──► Generate Patterns ──► Candidate Emails   │
     │                                                               │
     │   Patterns:                                                   │
     │   - first@domain.com                                          │
     │   - first.last@domain.com                                     │
     │   - flast@domain.com                                          │
     │   - f.last@domain.com                                         │
     └───────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼
     ┌───────────────────────────────────────────────────────────────┐
     │                      STAGE 4                                  │
     │                    VERIFICATION                               │
     │                                                               │
     │   Candidate Email ──► SMTP Check ──► Validity Confirmation   │
     │                                                               │
     │   Output: Verified Email + Confidence Score                  │
     └───────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼
                        ┌────────────────┐
                        │  LEADS TABLE   │
                        │                │
                        │ Verified and   │
                        │ Ready to Send  │
                        └────────────────┘
```

---

#### Dependencies

This feature requires Docker infrastructure for running scraper workers, proxy
services for anti-detection, and SMTP verification capabilities or API access.

---

#### Future Considerations

The scraper could be extended to additional data sources beyond Google Maps.
Quality scoring based on data freshness could prioritize newer leads.

---

---

---

## 5. Analytics and Reporting Features

These features provide deeper insights into campaign performance and enable
data export functionality.

---

### 5.1 Advanced Analytics Dashboard

**Original Phase:** Phase 11

**Status:** Not Implemented

**Priority Level:** Medium

**Risk Category:** Insight Gap

---

#### Overview

The Advanced Analytics Dashboard extends the current analytics capabilities with
trend analysis, campaign comparison, and temporal pattern visualization.

---

#### Business Justification

Current analytics provide point-in-time metrics without historical context. There
is no ability to compare performance across campaigns or identify patterns based
on send timing.

Advanced analytics enable strategic decision-making by revealing trends, optimal
timing windows, and relative campaign performance.

---

#### Intended Functionality

**Trend Lines**
Time series charts would include comparison lines showing previous period
performance, enabling quick identification of improvement or regression.

**Campaign Comparison**
Side-by-side visualization of two campaigns would allow direct comparison of
performance metrics throughout their lifecycles.

**Weekday Heatmap**
A heatmap visualization would show reply rates by day of week and time of day,
revealing optimal sending windows.

---

#### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ADVANCED ANALYTICS DASHBOARD                         │
└─────────────────────────────────────────────────────────────────────────┘

                         ┌──────────────┐
                         │   Raw Data   │
                         │   Storage    │
                         └──────┬───────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Analytics Engine    │
                    └───────────┬───────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
          ▼                     ▼                     ▼
    ┌───────────┐        ┌───────────┐        ┌───────────┐
    │  Trend    │        │ Campaign  │        │  Weekday  │
    │  Lines    │        │ Compare   │        │ Heatmap   │
    │           │        │           │        │           │
    │ Current   │        │ Side by   │        │ Day/Hour  │
    │ vs Prior  │        │   Side    │        │  Matrix   │
    └───────────┘        └───────────┘        └───────────┘
```

---

#### Dependencies

Expanded data retention policies may be required. Frontend charting library
enhancements would be needed for new visualization types.

---

---

---

### 5.2 Cohort Analysis Module

**Original Phase:** Phase 7

**Status:** Not Implemented

**Priority Level:** Medium

**Risk Category:** Insight Gap

---

#### Overview

Cohort Analysis groups leads by shared characteristics or acquisition timing,
enabling comparison of outcomes across these groups.

---

#### Business Justification

Understanding how different groups of leads perform over time reveals patterns
invisible in aggregate metrics. Cohort analysis answers questions about lead
quality trends and campaign effectiveness evolution.

---

#### Intended Functionality

Leads would be grouped by configurable cohort dimensions such as acquisition
date, source, or campaign. Performance metrics would be tracked independently
per cohort, visualized in a grid format showing progression over time.

---

#### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       COHORT ANALYSIS MODULE                            │
└─────────────────────────────────────────────────────────────────────────┘

     ┌───────────────────────────────────────────────────────────────┐
     │                       LEAD POOL                               │
     └───────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼
     ┌───────────────────────────────────────────────────────────────┐
     │                    COHORT ASSIGNMENT                          │
     │                                                               │
     │   Dimension: Acquisition Week                                 │
     └───────────────────────────┬───────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
    ┌──────────┐           ┌──────────┐           ┌──────────┐
    │ Cohort   │           │ Cohort   │           │ Cohort   │
    │ Week 1   │           │ Week 2   │           │ Week 3   │
    └────┬─────┘           └────┬─────┘           └────┬─────┘
         │                      │                      │
         ▼                      ▼                      ▼
    ┌──────────┐           ┌──────────┐           ┌──────────┐
    │ Track    │           │ Track    │           │ Track    │
    │ Metrics  │           │ Metrics  │           │ Metrics  │
    │ Over     │           │ Over     │           │ Over     │
    │ Time     │           │ Time     │           │ Time     │
    └──────────┘           └──────────┘           └──────────┘
```

---

---

---

### 5.3 Predictive Analytics Engine

**Original Phase:** Phase 7

**Status:** Not Implemented

**Priority Level:** Low

**Risk Category:** Strategic

---

#### Overview

The Predictive Analytics Engine uses historical data to forecast future campaign
performance and lead behavior.

---

#### Business Justification

Reactive analytics tell you what happened. Predictive analytics suggest what will
happen, enabling proactive adjustments before problems materialize.

---

#### Intended Functionality

The engine would analyze historical patterns to generate predictions for metrics
such as expected reply rate, optimal send volume, and campaign completion timeline.
Confidence intervals would accompany predictions to convey uncertainty.

---

---

---

### 5.4 Export Reports System

**Original Phase:** Phase 7

**Status:** Not Implemented

**Priority Level:** Medium

**Risk Category:** Accessibility Gap

---

#### Overview

The Export Reports System enables generation of downloadable reports in standard
formats for sharing, archival, and external analysis.

---

#### Business Justification

Dashboard analytics are valuable for day-to-day operations but cannot be easily
shared with stakeholders or imported into other tools. Export functionality
addresses this gap.

---

#### Intended Functionality

Users would be able to generate and download reports in CSV and PDF formats.
Reports would include configurable date ranges, metric selections, and visualization
exports.

---

#### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       EXPORT REPORTS SYSTEM                             │
└─────────────────────────────────────────────────────────────────────────┘

     ┌────────────────┐
     │ User Selects   │
     │ Report Type    │
     │ and Parameters │
     └───────┬────────┘
             │
             ▼
     ┌────────────────┐
     │ Data Query     │
     │ and Aggregation│
     └───────┬────────┘
             │
             ▼
     ┌────────────────┐
     │ Format         │
     │ Selection      │
     └───────┬────────┘
             │
     ┌───────┴───────┐
     │               │
     ▼               ▼
┌─────────┐    ┌─────────┐
│   CSV   │    │   PDF   │
│         │    │         │
│ Tabular │    │ Styled  │
│  Data   │    │ Report  │
└────┬────┘    └────┬────┘
     │              │
     └──────┬───────┘
            │
            ▼
     ┌────────────────┐
     │   Download     │
     │   Initiated    │
     └────────────────┘
```

---

---

---

## 6. Financial and Billing Features

These features introduce cost management, budgeting, and prepaid billing
capabilities.

---

### 6.1 Cost Forecasting and Alerts

**Original Phase:** Phase 12

**Status:** Not Implemented

**Priority Level:** Medium

**Risk Category:** Budget Overrun

---

#### Overview

Cost Forecasting and Alerts provides budget tracking and proactive notification
when spending approaches defined limits.

---

#### Business Justification

AI-powered operations consume variable amounts of resources based on content
generation volume. Without visibility into spending, costs can escalate
unexpectedly.

Proactive alerts at threshold crossings enable intervention before budgets are
exceeded.

---

#### Intended Functionality

Users would define monthly budgets in the system settings. A monitoring process
would track cumulative spending against these budgets. When spending reaches
configurable thresholds, alert emails would be dispatched.

---

#### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     COST FORECASTING AND ALERTS                         │
└─────────────────────────────────────────────────────────────────────────┘

     ┌────────────────┐
     │ Monthly Budget │
     │ Configuration  │
     └───────┬────────┘
             │
             ▼
     ┌────────────────┐
     │   Spending     │
     │   Tracker      │
     │                │
     │ Current: $40   │
     │ Budget: $50    │
     │ Usage: 80%     │
     └───────┬────────┘
             │
             ▼
     ┌────────────────────┐
     │ Threshold Check    │
     │                    │
     │ Is Usage >= 80% ?  │
     └─────────┬──────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
  ┌─────────┐    ┌──────────────┐
  │  UNDER  │    │  THRESHOLD   │
  │ BUDGET  │    │   EXCEEDED   │
  │         │    │              │
  │Continue │    │ Send Alert   │
  │Tracking │    │    Email     │
  └─────────┘    └──────────────┘
```

---

---

---

### 6.2 Prepaid Economic Engine

**Original Phase:** Future

**Status:** Not Implemented

**Priority Level:** Strategic

**Risk Category:** Financial Control

---

#### Overview

The Prepaid Economic Engine transitions the system from open-loop operation to
a prepaid wallet model, requiring positive credit balance before AI operations
execute.

---

#### Business Justification

Prepaid models provide predictable revenue and prevent unexpected billing
scenarios. They also enable real-time cost visibility and automatic operation
suspension when credits are exhausted.

---

#### Intended Functionality

**Wallet Ledger**
A credits table would track each tenant's balance. All AI operations would
deduct from this balance in real time.

**Balance Gate**
Middleware would check balance before any AI request. Insufficient balance
would freeze the campaign rather than proceeding and accumulating debt.

**Top-Up Flow**
Integration with payment processors would allow users to add credits on demand.

**Live Burn Rate**
Real-time visualization of credit consumption during campaign execution.

---

#### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      PREPAID ECONOMIC ENGINE                            │
└─────────────────────────────────────────────────────────────────────────┘

     ┌────────────────┐
     │ User Deposits  │
     │ Credits        │
     │                │
     │ Payment        │
     │ Processor      │
     └───────┬────────┘
             │
             ▼
     ┌────────────────┐
     │ Wallet Ledger  │
     │                │
     │ Balance: $25   │
     └───────┬────────┘
             │
             ▼
     ┌────────────────────┐
     │ AI Operation       │
     │ Requested          │
     │                    │
     │ Estimated Cost: $2 │
     └─────────┬──────────┘
               │
               ▼
     ┌────────────────────┐
     │ Balance Check      │
     │                    │
     │ Balance >= Cost ?  │
     └─────────┬──────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
  ┌─────────┐    ┌──────────────┐
  │ PROCEED │    │ INSUFFICIENT │
  │         │    │              │
  │ Deduct  │    │  Freeze      │
  │ Credits │    │  Campaign    │
  │         │    │              │
  │Continue │    │ Notify User  │
  └─────────┘    └──────────────┘
```

---

---

---

## 7. AI Quality Assurance Features

These features introduce automated quality control for AI-generated content.

---

### 7.1 AI Evaluation Matrix

**Original Phase:** Future

**Status:** Not Implemented

**Priority Level:** Medium

**Risk Category:** Quality Control

---

#### Overview

The AI Evaluation Matrix introduces an automated quality gate for AI-generated
emails, scoring content against defined criteria before approving for send.

---

#### Business Justification

AI-generated content is not uniformly high quality. Some outputs may have unclear
calls to action, inappropriate tone, or fabricated information. Currently, there
is no systematic quality check before sending.

An automated judge evaluates each draft, flagging low-quality outputs for human
review instead of automatic dispatch.

---

#### Intended Functionality

A secondary AI model would evaluate generated drafts against criteria including
call-to-action clarity, tone appropriateness, factual accuracy, and length
compliance.

Drafts scoring above threshold proceed automatically. Drafts below threshold
enter a manual review queue.

---

#### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       AI EVALUATION MATRIX                              │
└─────────────────────────────────────────────────────────────────────────┘

     ┌────────────────┐
     │ Generated      │
     │ Email Draft    │
     └───────┬────────┘
             │
             ▼
     ┌────────────────────┐
     │ AI Judge           │
     │                    │
     │ Evaluates:         │
     │ - CTA Clarity      │
     │ - Tone             │
     │ - Factual Accuracy │
     │ - Length           │
     └─────────┬──────────┘
               │
               ▼
     ┌────────────────────┐
     │ Quality Score      │
     │                    │
     │ Score: 0 - 100     │
     └─────────┬──────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
  ┌─────────┐    ┌──────────────┐
  │ >= 80   │    │    < 80      │
  │         │    │              │
  │ APPROVE │    │  MANUAL      │
  │         │    │  REVIEW      │
  │ Auto    │    │  QUEUE       │
  │ Send    │    │              │
  └─────────┘    └──────────────┘
```

---

---

---

## 8. Observability Features

These features introduce comprehensive logging and error tracking across the
system.

---

### 8.1 Centralized Forensic Logging

**Original Phase:** Future

**Status:** Not Implemented

**Priority Level:** High

**Risk Category:** Debugging Difficulty

---

#### Overview

Centralized Forensic Logging consolidates error tracking from all system
components into a single, queryable log store with visual traceability.

---

#### Business Justification

Errors currently may occur in the Next.js dashboard, n8n workflows, or API
routes without unified visibility. Diagnosing issues requires checking multiple
places and correlating timestamps manually.

A centralized logging system captures all errors with full context, enabling
rapid diagnosis and pattern identification.

---

#### Intended Functionality

**Structured Log Table**
A dedicated Supabase table would store all system errors with structured fields
including timestamp, source, severity, message, and input payload.

**Global Error Capture**
All n8n workflows would include error trigger nodes that capture failures and
push to the log table. API routes would use standardized error handling.

**Visual Traceability**
The dashboard would include a side drawer interface for viewing error details,
including the exact input that caused each failure.

---

#### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CENTRALIZED FORENSIC LOGGING                         │
└─────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
  │   Next.js    │   │     n8n      │   │     API      │
  │  Dashboard   │   │  Workflows   │   │    Routes    │
  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
         │                  │                  │
         │    Error         │    Error         │    Error
         │    Event         │    Event         │    Event
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │
                            ▼
                   ┌────────────────┐
                   │ Error Logging  │
                   │      Hub       │
                   └───────┬────────┘
                           │
                           ▼
                   ┌────────────────┐
                   │ System Error   │
                   │ Logs Table     │
                   │                │
                   │ - Timestamp    │
                   │ - Source       │
                   │ - Severity     │
                   │ - Message      │
                   │ - Input Data   │
                   └───────┬────────┘
                           │
                           ▼
                   ┌────────────────┐
                   │ Dashboard      │
                   │ Side Drawer    │
                   │                │
                   │ Error Details  │
                   │ + Stack Trace  │
                   └────────────────┘
```

---

---

---

## 9. Security Mesh Features

These features introduce proactive security measures to prevent abuse and data
leakage.

---

### 9.1 Sentinel Guardrails System

**Original Phase:** Future

**Status:** Not Implemented

**Priority Level:** High

**Risk Category:** Security Vulnerability

---

#### Overview

The Sentinel Guardrails System is a multi-layered security mesh protecting AI
operations from budget drains, data leakage, and prompt manipulation attacks.

---

#### Business Justification

AI systems face unique security risks. Infinite loops can drain budgets rapidly.
User inputs may inadvertently contain sensitive information. Malicious actors
can attempt to hijack AI behavior through prompt injection.

A defense-in-depth approach layers multiple protections to catch threats at
different levels.

---

#### Intended Functionality

**Velocity Limiter**
Hard spend caps enforced in code prevent runaway costs. If spending exceeds a
per-hour threshold, operations automatically suspend.

**PII Redaction Valve**
A filter scans all inputs destined for AI APIs, redacting patterns matching
credit card numbers, social security numbers, and other sensitive data.

**Prompt Injection Shield**
Heuristic detection identifies and blocks inputs containing known injection
patterns such as instructions to ignore previous guidance.

---

#### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     SENTINEL GUARDRAILS SYSTEM                          │
└─────────────────────────────────────────────────────────────────────────┘

     ┌────────────────┐
     │ Incoming       │
     │ User Request   │
     └───────┬────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         LAYER 1: VELOCITY LIMITER                       │
│                                                                         │
│                   Check: Spend Rate < $5/hour ?                         │
│                                                                         │
│                   BLOCK if exceeded                                     │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ PASS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         LAYER 2: PII REDACTION                          │
│                                                                         │
│                   Scan for: Credit Cards, SSN, etc.                     │
│                                                                         │
│                   REDACT if found                                       │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ CLEAN
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      LAYER 3: PROMPT INJECTION SHIELD                   │
│                                                                         │
│                   Detect: "Ignore previous instructions"                │
│                                                                         │
│                   BLOCK if detected                                     │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ SAFE
                                    ▼
                         ┌────────────────────┐
                         │ Protected AI       │
                         │ System             │
                         │                    │
                         │ Request Proceeds   │
                         └────────────────────┘
```

---

---

---

## 10. Data Enrichment Features

These features enhance lead records with additional intelligence and scoring.

---

### 10.1 Golden 10 Core Metrics

**Original Phase:** Phase 27

**Status:** Not Implemented

**Priority Level:** Medium

**Risk Category:** Data Gap

---

#### Overview

The Golden 10 Core Metrics initiative enriches lead records with scoring,
sentiment, and third-party enrichment data to improve targeting and analysis.

---

#### Business Justification

Raw lead data provides limited insight into lead quality or engagement sentiment.
Enrichment adds layers of intelligence that improve prioritization and reporting.

---

#### Intended Functionality

**Lead Scoring**
Each lead would receive a quality score based on engagement signals and profile
completeness, enabling prioritization of high-value prospects.

**Sentiment Classification**
Replies would be analyzed to classify sentiment as positive, negative, or neutral,
providing immediate insight into response quality.

**Third-Party Enrichment**
Integration with services like Hunter and Clearbit would append additional data
such as company size, industry, and social profiles.

---

#### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       GOLDEN 10 CORE METRICS                            │
└─────────────────────────────────────────────────────────────────────────┘

                    ┌───────────────────┐
                    │   Data Pipeline   │
                    │   (Incoming       │
                    │    Leads)         │
                    └─────────┬─────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
    ┌───────────┐       ┌───────────┐       ┌───────────┐
    │   Lead    │       │ Sentiment │       │Enrichment │
    │  Scoring  │       │ Classify  │       │   Hub     │
    │           │       │           │       │           │
    │ Quality   │       │ Positive  │       │ Hunter    │
    │ Score     │       │ Neutral   │       │ Clearbit  │
    │ 0 - 100   │       │ Negative  │       │           │
    └─────┬─────┘       └─────┬─────┘       └─────┬─────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                              ▼
                   ┌────────────────────┐
                   │   Leads Database   │
                   │                    │
                   │ + lead_score       │
                   │ + sentiment        │
                   │ + company_size     │
                   │ + industry         │
                   └────────────────────┘
                              │
                              ▼
                   ┌────────────────────┐
                   │    Dashboard       │
                   │                    │
                   │ Visualize New      │
                   │ Metrics            │
                   └────────────────────┘
```

---

---

---

## 11. Roadmap Consolidation

This section summarizes deferred roadmap items that span multiple categories.

---

### Phase 11 Analytics Extras

The following Phase 11 items remain unimplemented:

- Trend lines with previous period comparison
- Dual-campaign comparison visualization
- Weekday heatmap for optimal send timing

---

### Phase 12 Budget Alerts

The complete Phase 12 budget alert system remains unimplemented, including
monthly budget configuration and threshold-based alerting.

---

### Phase 15 SaaS Hardening

SaaS hardening features for production multi-tenancy remain paused, including
additional isolation measures and compliance features.

---

### Phase 29 Roadmap Polishes

Final polish items including completion of analytics extras, budget alert
finalization, and SaaS hardening revisit remain on the future roadmap.



### Future Implementation Plan: Credential Sovereignty Layer
Goal: Remove all sensitive credentials (Gmail App Passwords, API Keys, Database URLs) from the n8n database/nodes and manage them in an encrypted vault that is programmatically accessed at runtime.

# Pillar 1: The Vault Architecture
Centralized Storage: Every workspace created in your dashboard will correspond to a unique Collection (or Folder) in Bitwarden.

Standardized Naming: Secrets inside each collection will follow a strict schema:

CLIENT_GMAIL_USER

CLIENT_GMAIL_APP_PASS

CLIENT_OPENAI_KEY

CLIENT_SUPABASE_URL

The Bridge: The Super Admin Dashboard will use a specialized API route (/api/admin/vault/provision) to push credentials into the vault during the "Ignition" phase.

# Pillar 2: The n8n "Secret Fetcher" Template
The Header Node: Every one of your 7 Golden Workflows will begin with a Bitwarden Node.

Dynamic Scoping: This node will be configured to search for the collection matching the incoming workspace_id.

Expression-Based Authentication:

Instead of selecting a hardcoded credential in the Gmail node, you will use the "Expression" toggle.

The node will pull the username/password directly from the Bitwarden Node's output: {{ $node["Fetch Secrets"].json["password"] }}.

# Pillar 3: The Client-Facing "Trust Factor"
Zero-Knowledge UI: Build a specialized "Credential Onboarding" modal. When a client enters their Gmail password, the dashboard sends it immediately to the vault and never saves it to your primary database.

Security Branding: The UI should explicitly state: "Your credentials are encrypted using AES-256 and stored in a dedicated Bitwarden vault. Our system only accesses them in-memory during active email orchestration."

# Pillar 4: Automated Rotation & Revocation
The Kill Switch: If a client churns, deleting the Bitwarden Collection instantly kills all 7 workflows' ability to execute, even if the workflows are still "Active" in n8n.

Key Rotation: Implement an admin utility to rotate API keys across all 7 workflows simultaneously by updating the master vault item once.

🛠️ Strategic Tasks (for the Future Doc)
Vault Setup: Host a self-hosted Bitwarden instance (Vaultwarden) or use the Bitwarden Public API to ensure you have a dedicated API key for orchestration.

Schema Update: Add a vault_collection_id column to your workspaces table in Supabase.

Template Refactor: Replace all hardcoded credential fields in the 7 base JSON files with n8n Expressions mapped to the Bitwarden output.

Admin UI: Create a "Vault Status" indicator in your Super Admin panel to show which workspaces have "Active" vs "Missing" credentials.

---

---

---

## Document Maintenance

This document should be updated whenever:

- A feature listed here is implemented and should be removed
- A new feature is deferred and should be added
- Priority levels change based on strategic direction
- Dependencies evolve due to architecture changes

Last reviewed: January 2026

---

End of Document
