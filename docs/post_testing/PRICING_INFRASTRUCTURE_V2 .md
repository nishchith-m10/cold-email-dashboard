# PRICING INFRASTRUCTURE — COLD EMAIL PLATFORM
### Complete Operational Cost Analysis & Client Pricing Model
**Version:** 2.1 | **Status:** Working Draft | **Based On:** Singularity Architecture V35

---

## SECTION 1: OPERATIONAL COST BREAKDOWN PER LEAD

> Every lead that goes through the Email Preparation workflow costs money.
> This table shows the exact cost of each API call per lead processed.
>
> **Why per lead, not per email:** The cost happens entirely at the Email Preparation
> stage — one lead goes in, research runs, and all three emails get drafted in a
> single pipeline run. Actually *sending* Email 1, 2, and 3 is essentially free
> (Gmail API and SMTP have no meaningful per-send cost). You charge per lead prepared,
> not per email sent. This makes billing simple and predictable.

### 1.1 Per-Lead Variable Costs (Cost Per Single Lead Processed)

| Service | What It Does | Model/Plan | Cost Per Lead |
|---|---|---|---|
| Relevance AI | Scrapes LinkedIn profile + recent posts | Pro ($29/mo, 10K credits, ~5 credits/lead) | $0.0145 |
| Google CSE | Company web research (1 query per lead) | $5 per 1,000 queries | $0.005 |
| Apify | Google Maps reviews scrape (1-3 star reviews) | ~$0.0005 base + $0.001/review | $0.002 |
| OpenAI o3-mini | Company summarization (500 in / 300 out tokens) | $1.10/1M in, $4.40/1M out | $0.0019 |
| OpenAI o3-mini | Prospect analysis (2,000 in / 800 out tokens) | $1.10/1M in, $4.40/1M out | $0.0057 |
| Anthropic Claude Sonnet | Draft all 3 emails (3,000 in / 1,500 out tokens) | $3.00/1M in, $15.00/1M out | $0.0315 |
| **Total Per Lead** | | | **~$0.057** |

> **Note:** These are your actual API costs at current pricing. The $0.153/lead
> used in the base model includes a ~2.7x markup to cover infrastructure overhead,
> failed runs, rate limit retries, and margin buffer. That is reasonable.
>
> **Important:** The $0.153/lead covers drafting all 3 emails for that lead in one
> preparation run. There is no additional cost per email sent — only per lead prepared.

---

### 1.2 Fixed Monthly Infrastructure Cost Per Client (Tenant)

> These costs exist regardless of how many leads are processed. Every active tenant incurs these.

| Service | What It Covers | Monthly Cost |
|---|---|---|
| DigitalOcean Droplet | Sovereign n8n VM (1 per tenant) | $6.00 |
| Google Workspace | Email inboxes (3 Gmail accounts for sending) | $18.00 |
| Namecheap Domains | Sending domains (3 domains × $1/mo amortized) | $3.00 |
| Relevance AI (Pro) | LinkedIn scraping platform base fee | $29.00 |
| Upstash Redis | BullMQ queue + caching (per-tenant share) | $3.00 |
| Supabase | Database (shared, per-tenant allocation) | $8.00 |
| Vercel | Dashboard hosting (shared across all tenants) | $5.00 |
| **Total Fixed Per Tenant** | | **$72.00/month** |

> **Hibernation savings:** If a client pauses for a month, droplet hibernates at
> $0.02/GB/month (snapshot). Estimated hibernated cost: ~$0.20/month vs $6.00.
> That's 97% savings on the compute portion while paused.

---

### 1.3 Per-Lead Cost at Volume (Variable Cost Only)

| Lead Volume | Cost Per Lead | Total Variable Cost | Fixed Cost | **Total Op Cost** |
|---|---|---|---|---|
| 1,000 leads/mo | $0.057 | $57.00 | $72.00 | **$129.00** |
| 2,000 leads/mo | $0.057 | $114.00 | $72.00 | **$186.00** |
| 3,000 leads/mo | $0.057 | $171.00 | $72.00 | **$243.00** |
| 5,000 leads/mo | $0.057 | $285.00 | $72.00 | **$357.00** |
| 8,000 leads/mo | $0.057 | $456.00 | $72.00 | **$528.00** |
| 10,000 leads/mo | $0.057 | $570.00 | $72.00 | **$642.00** |

> **Lead Prep Charge to Client:** The screenshot uses $0.153/lead for billing.
> Your true cost is ~$0.057/lead + fixed overhead. At $0.153/lead you run a
> ~2.7x markup on variable costs. After fixed costs are absorbed, your
> effective margin improves significantly at higher volumes.

---

### 1.4 Re-Loop Model — Getting More Emails From the Same Lead Prep Investment

> **The core insight:** Lead preparation is the only real cost point. Once a lead
> is prepared and their 3 emails are drafted, sending those emails costs nothing.
> If a lead never replies after the full 3-email sequence, you can re-loop them
> — send the sequence again with fresh timing — without paying for preparation again.
> This means your client gets dramatically more email volume from the same lead budget.

#### How Re-Loops Work

| Scenario | Lead Prep Cost | Emails Generated | Emails Sent (with re-loop) | Cost Per Email Sent |
|---|---|---|---|---|
| Single cycle (no re-loop) | $0.153/lead | 3 emails drafted | 3 emails sent | $0.051/email |
| 2 cycles (1 re-loop, same drafts) | $0.153/lead | 3 emails drafted | 6 emails sent | $0.026/email |
| 3 cycles (2 re-loops, same drafts) | $0.153/lead | 3 emails drafted | 9 emails sent | $0.017/email |
| Fresh re-prep (new research, new drafts) | $0.306/lead total | 6 emails drafted | 6 emails sent | $0.051/email |

#### Re-Loop Policy (How to Bill It)

| Re-Loop Type | Time Since Last Contact | Lead Prep Charge | When to Use |
|---|---|---|---|
| **Same-draft re-loop** | Within 60 days | No additional charge | Lead went cold, resend existing sequence |
| **Fresh re-prep re-loop** | 60+ days | Full $0.153/lead charge | Enough time passed, re-research the prospect |
| **New campaign re-loop** | Any time | Full $0.153/lead charge | Client pivots their offer or ICP |

#### Re-Loop Example: 2,000 Leads Per Month

| Without Re-Loop | With 1 Re-Loop | With 2 Re-Loops |
|---|---|---|
| 2,000 leads prepared | 2,000 leads prepared | 2,000 leads prepared |
| 6,000 emails sent | 12,000 emails sent | 18,000 emails sent |
| Lead prep cost: $306 | Lead prep cost: $306 | Lead prep cost: $306 |
| Cost per email: $0.051 | Cost per email: $0.026 | Cost per email: $0.017 |

> **Client pitch:** *"You pay for the research and personalization once per lead.
> Re-sending the sequence to non-responders costs nothing extra. You get more
> volume and more chances to land a reply from the same investment."*
>
> This is a genuine differentiator — platforms like Instantly charge per email sent
> or per active lead per month regardless of re-sends. Your model rewards volume.

#### Re-Loop Rules to Communicate to Clients

- Re-loops are automatic for non-replied, non-opted-out leads after the full sequence completes
- Opted-out leads are permanently suppressed — never re-looped under any circumstances
- Replied leads exit the sequence immediately — never re-looped
- Re-loop timing: minimum 14-day gap after Email 3 before restarting the sequence
- Maximum re-loops recommended: 2 (after that, the lead is genuinely not interested)

---

## SECTION 2: PRICING TIERS

### 2.1 Tier Definitions

| | **Growth** | **Scale** | **Premium** |
|---|---|---|---|
| **Monthly Lead Volume** | 3,000 leads | 5,000 leads | 8,000 leads |
| **Emails Drafted Per Lead** | 3 (full sequence) | 3 (full sequence) | 3 (full sequence) |
| **Emails Sent — Single Cycle** | 9,000 | 15,000 | 24,000 |
| **Emails Sent — With 1 Re-Loop** | 18,000 | 30,000 | 48,000 |
| **Emails Sent — With 2 Re-Loops** | 27,000 | 45,000 | 72,000 |
| **Daily Send Rate (single cycle)** | ~300/day | ~500/day | ~800/day |
| **Inbox Count Recommended** | 3 Gmail accounts | 5 Gmail accounts | 8 Gmail accounts |
| **Research Depth** | LinkedIn + CSE + Reviews | LinkedIn + CSE + Reviews | LinkedIn + CSE + Reviews + Research Report |
| **Research Report** | ❌ | ❌ | ✅ (for booked meetings) |
| **Re-Loop Policy** | Up to 2 re-loops free | Up to 2 re-loops free | Up to 2 re-loops free |
| **Fresh Re-Prep (60+ days)** | $0.153/lead | $0.153/lead | $0.153/lead |
| **Dedicated Droplet** | ✅ | ✅ | ✅ |
| **Dashboard Access** | ✅ Full | ✅ Full | ✅ Full + Priority |
| **Support** | Email | Email + Chat | Dedicated |
| **Setup Fee** | $3,000 | $3,000 | $3,000 |
| **Monthly Retainer** | $1,499 | $1,999 | $2,999 |

---

### 2.2 Full Monthly Cost & Profit Per Tier (Single Client)

| Item | Growth | Scale | Premium |
|---|---|---|---|
| **Monthly Revenue** | $1,499 | $1,999 | $2,999 |
| | | | |
| *Variable: Lead Prep* | $171 ($0.057 × 3K) | $285 ($0.057 × 5K) | $456 ($0.057 × 8K) |
| *Fixed: Infrastructure* | $72 | $72 | $72 |
| *Fixed: Extra Inboxes* | $0 (3 included) | $12 (2 extra) | $30 (5 extra) |
| *Buffer (10% for retries/errors)* | $24 | $36 | $53 |
| **Total Operational Cost** | **$267** | **$405** | **$611** |
| | | | |
| **Monthly Profit** | **$1,232** | **$1,594** | **$2,388** |
| **Profit Margin** | 82% | 80% | 80% |

> **Note:** Screenshot used $459 and $765 lead prep costs. Those include a
> 2.7x markup on raw API costs as a billing buffer. The table above separates
> your actual cost from your billing model. Both approaches are valid —
> just keep them in the same framework.

---

### 2.3 Setup Fee Breakdown (One-Time $3,000)

> What the $3,000 setup actually covers. Important to be able to explain this.

| Item | Description | Value |
|---|---|---|
| Infrastructure provisioning | Sovereign droplet setup, sidecar config, credential vault | $500 |
| n8n workflow deployment | 7 workflows deployed and configured per client | $300 |
| DNS + deliverability setup | SPF, DKIM, DMARC, tracking domain, warmup planning | $400 |
| Lead list sourcing (first batch) | Manual sourcing or client-provided + cleaning | $300 |
| Onboarding & configuration | Calendly setup, pitch customization, ICP definition | $500 |
| 30-day guarantee period | First month of active management + fixes | $1,000 |
| **Total Setup Value** | | **$3,000** |

---

## SECTION 3: CLIENT SCENARIO MODELS

### 3.1 Single Client — Monthly & Annual View

| View | Revenue | Operational Cost | Profit |
|---|---|---|---|
| **Growth — Monthly** | $1,499 | $267 | **$1,232** |
| **Scale — Monthly** | $1,999 | $405 | **$1,594** |
| **Premium — Monthly** | $2,999 | $611 | **$2,388** |
| | | | |
| **Growth — Year 1** (setup + 12mo) | $20,988 | $3,204 | **$17,784** |
| **Scale — Year 1** (setup + 12mo) | $26,988 | $4,860 | **$22,128** |
| **Premium — Year 1** (setup + 12mo) | $38,988 | $7,332 | **$31,656** |

> Year 1 revenue = $3,000 setup + (monthly × 12)
> Year 1 cost = setup costs (~$500 infra time) + (monthly op cost × 12)

---

### 3.2 Multi-Client Monthly Profit Scenarios

| Clients | Tier | Monthly Revenue | Monthly Op Cost | **Monthly Profit** |
|---|---|---|---|---|
| 1 | Growth | $1,499 | $267 | **$1,232** |
| 1 | Scale | $1,999 | $405 | **$1,594** |
| 1 | Premium | $2,999 | $611 | **$2,388** |
| 3 | Growth | $4,497 | $801 | **$3,696** |
| 3 | Scale | $5,997 | $1,215 | **$4,782** |
| 3 | Premium | $8,997 | $1,833 | **$7,164** |
| 5 | Growth | $7,495 | $1,335 | **$6,160** |
| 5 | Scale | $9,995 | $2,025 | **$7,970** |
| 5 | Premium | $14,995 | $3,055 | **$11,940** |
| 10 | Growth | $14,990 | $2,670 | **$12,320** |
| 10 | Scale | $19,990 | $4,050 | **$15,940** |
| 10 | Mixed (avg) | ~$17,500 | ~$3,500 | **~$14,000** |

---

### 3.3 Annual View — 3 to 10 Clients (Year 1 Includes Setup Fees)

| Clients | Tier | Setup Revenue | Annual Retainer | Annual Op Cost | **Year 1 Profit** |
|---|---|---|---|---|---|
| 3 | Growth | $9,000 | $53,964 | $9,612 | **$53,352** |
| 3 | Scale | $9,000 | $71,964 | $14,580 | **$66,384** |
| 3 | Premium | $9,000 | $107,964 | $21,996 | **$94,968** |
| 5 | Growth | $15,000 | $89,940 | $16,020 | **$88,920** |
| 5 | Scale | $15,000 | $119,940 | $24,300 | **$110,640** |
| 5 | Premium | $15,000 | $179,940 | $36,660 | **$158,280** |
| 10 | Growth | $30,000 | $179,880 | $32,040 | **$177,840** |
| 10 | Mixed | $30,000 | $215,880 | $42,000 | **$203,880** |

---

## SECTION 4: CASH FLOW MODEL

### 4.1 Month-by-Month Cash Flow (3 Clients at Scale Tier)

| Month | Event | Revenue | Op Cost | Net | Cumulative |
|---|---|---|---|---|---|
| Month 1 | 3 setups + first month | $15,000 + $5,997 = $20,997 | $2,715 | $18,282 | $18,282 |
| Month 2 | 3 retainers | $5,997 | $1,215 | $4,782 | $23,064 |
| Month 3 | 3 retainers | $5,997 | $1,215 | $4,782 | $27,846 |
| Month 4 | 3 retainers | $5,997 | $1,215 | $4,782 | $32,628 |
| Month 5 | 3 retainers + 1 new client setup | $5,997 + $3,000 = $8,997 | $1,620 | $7,377 | $40,005 |
| Month 6 | 4 retainers | $7,996 | $1,620 | $6,376 | $46,381 |
| Month 12 | 5 retainers (target) | $9,995 | $2,025 | $7,970 | ~$90,000+ |

---

### 4.2 Break-Even Analysis Per Client

| Tier | Setup Fee | Monthly Op Cost | Months to Recover Setup | Break-Even Month |
|---|---|---|---|---|
| Growth | $3,000 | $267 | 2.5 months of retainer profit | **Month 3** |
| Scale | $3,000 | $405 | 1.9 months of retainer profit | **Month 2** |
| Premium | $3,000 | $611 | 1.3 months of retainer profit | **Month 2** |

> Break-even calculated as: $3,000 setup cost ÷ monthly profit per tier
> You recover setup investment within 2-3 months. Every month after is pure margin.

---

## SECTION 5: COMMISSION-BASED MODEL (FOR EARLY CLIENTS)

> Use this model for first 2-3 clients before your retainer pricing is established.
> It removes pricing objections entirely and aligns incentives.

### 5.1 Commission Structure

| Metric | Rate | Notes |
|---|---|---|
| Per meeting booked | $50-100/meeting | Pay only when system books a meeting |
| Per client closed | 5-15% of deal value | Percentage of what they close |
| Hybrid (retainer + commission) | $500/mo + 5% of closes | Covers your costs, upside on results |

### 5.2 Commission Model Math (Example)

Assume client closes 3 deals/month from your campaigns, average deal = $5,000:

| Model | Your Monthly Revenue | Their Monthly Cost | Their ROI |
|---|---|---|---|
| Pure commission (10%) | $1,500 | $1,500 | 20x on $5K avg deal |
| Retainer only (Growth) | $1,499 | $1,499 | 20x on $5K avg deal |
| Hybrid ($500 + 10%) | $2,000 | $2,000 | Pays for itself in 1 close |

> **Recommendation:** Start with hybrid for first clients. Pure commission
> is hard to track cleanly. Retainer-only is better once you have proof.

---

## SECTION 6: PRICING SWEET SPOT ANALYSIS

### 6.1 Most Profitable Scenarios

| Scenario | Monthly Profit | Annual Profit | Difficulty to Achieve |
|---|---|---|---|
| 3 clients @ Premium | $7,164 | $94,968 | Hard (premium clients take longer to close) |
| 5 clients @ Scale | $7,970 | $110,640 | Medium (scale tier is most sellable) |
| 3 clients @ Scale | $4,782 | $66,384 | **Easy (first realistic target)** |
| 5 clients @ Growth | $6,160 | $88,920 | Medium (more clients to manage) |
| 1 client @ Premium | $2,388 | $31,656 | Low hanging fruit if mentor has contact |

### 6.2 Recommended Targets by Phase

| Phase | Target | Monthly Revenue | Monthly Profit |
|---|---|---|---|
| **Now (Launch)** | 1 client, any tier | $1,499–$2,999 | $1,232–$2,388 |
| **Month 2-3** | 3 clients @ Scale | $5,997 | $4,782 |
| **Month 4-6** | 5 clients @ Scale | $9,995 | $7,970 |
| **Month 6-12** | 10 clients mixed | ~$17,500 | ~$14,000 |
| **Year 2** | 20+ clients | $35,000+ | $28,000+ |

---

## SECTION 7: WHAT'S INCLUDED VS ADD-ON

### 7.1 Managed Services (Your Cost, Pooled Across Clients)

> These are services YOU pay for and manage. Client doesn't see these bills.

| Service | Who Pays | Cost Model | Notes |
|---|---|---|---|
| Relevance AI | You (per account) | $29/mo Pro plan | 1 account per tenant droplet |
| Apify | You (per account) | Usage-based ~$0.001/lead | Pooled or per-tenant |
| Google CSE | You | $0.005/query | Pooled across all clients |
| OpenAI | You | Per token, exact | Per-client tracked in dashboard |
| Anthropic | You | Per token, exact | Per-client tracked in dashboard |
| DigitalOcean | You | $6/mo per droplet | 1 droplet per client |

### 7.2 BYO Services (Client Brings Their Own)

> These the client provides. You configure them, they pay the bill directly.

| Service | Who Pays | Notes |
|---|---|---|
| Gmail / Google Workspace | Client | 3-8 accounts needed |
| Sending domains | Client | 3-8 domains (Namecheap ~$1/mo each) |
| Calendly | Client | Pro plan recommended |
| Lead list (if providing own) | Client | Or you source via scraper (future) |

### 7.3 Future Add-On Services (Price Separately)

> Not built yet. Don't offer these until they're ready.

| Add-On | Recommended Price | When to Offer |
|---|---|---|
| Lead scraping (your custom scraper) | $200-500 for first 5,000 leads | After scraper is built |
| Email verification (NeverBounce) | $50/mo add-on | After integration is built |
| Mailbox warmup | $100/mo add-on | After warmup infra is built |
| Research report (per booked meeting) | $25-50/report | Already partially built |
| Additional inbox setup | $100 one-time per inbox | Available now |

---

## SECTION 8: PRICING OBJECTION RESPONSES

> For when clients push back on price.

| Objection | Your Response |
|---|---|
| "That's expensive" | "Our system researches every prospect individually before sending. Most agencies send templates. We send personalized outreach at scale. The reply rates justify the cost." |
| "We can hire someone cheaper" | "A full-time SDR costs $4,000-6,000/month plus management overhead. We run 24/7 at a fraction of that cost with better personalization." |
| "What if it doesn't work?" | "We offer a commission-based hybrid option so you only pay a base to cover infrastructure costs. The rest comes from results." |
| "Can we do month-to-month?" | "Yes. No annual contract required. We want you to stay because it's working, not because you're locked in." |
| "Why the $3,000 setup?" | "Setup covers your dedicated server infrastructure, DNS configuration, inbox setup, workflow customization, and your first 30 days of active management. It's a one-time investment." |

---

## SECTION 9: BILLING & PAYMENT STRUCTURE

### 9.1 Current State (No Stripe Yet)

> Collect payment manually for first clients. No client in early access
> will refuse to pay via PayPal, bank transfer, or Wise.

| Payment Method | Best For | Notes |
|---|---|---|
| PayPal Invoice | US clients | Fast, professional, no fees on invoiced |
| Bank transfer / Zelle | Known contacts | Nick's network |
| Wise | International clients | Best FX rates |
| Stripe (future) | All clients at scale | Build this after first 3-5 clients |

### 9.2 Invoice Structure

| Item | Timing | Amount |
|---|---|---|
| Setup fee | Upfront before work begins | $3,000 |
| Month 1 retainer | With setup or Net-7 | $1,499/$1,999/$2,999 |
| Ongoing retainers | 1st of each month, Net-7 | Same as tier |
| Commission (if applicable) | End of month, based on reported closes | % agreed upfront |

---

## NOTES & ASSUMPTIONS

- All costs in USD
- API pricing current as of Q1 2026 — verify quarterly as models reprice
- Operational costs assume Managed service model (you pay API costs, recover via markup)
- Lead prep cost billed to client at $0.153/lead (2.7x markup on $0.057 true cost)
- Fixed infrastructure at $72/tenant/month (absorbed into retainer, not billed separately)
- Volume discounts not modeled yet — consider 10-15% discount for annual prepay
- Tax not included — consult accountant on structure as revenue grows
- This model does not yet account for your own salary/time — factor in as revenue grows

---

*Pricing Infrastructure v2.0 — Cold Email Platform*
*Next revision: After first 3 clients — update with real cost data from dashboard*
