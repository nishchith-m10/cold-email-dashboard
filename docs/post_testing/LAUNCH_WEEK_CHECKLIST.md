# 🚀 LAUNCH WEEK — Master Checklist
### Cold Email Platform | End-to-End Testing & First Client
**Timeline:** 7 Days | **Goal:** Live client on the system by Day 7

---

## THE MISSION

You have one objective this week: **prove the system works end-to-end with a real human, then convert that into a paying client.**

Everything on this list serves that one goal. If a task isn't on this list — it doesn't exist this week.

---

## PRE-WEEK: Before Day 1 Starts

These need to happen before you do anything else.

- [ ] **Message Nick today** — tell him you need him to run a local Docker test this week. Confirm he has Docker Desktop installed (or can install it). Set a specific day/time with him (recommend Day 3 or 4).
- [ ] **Create a shared testing doc** — Google Doc or Notion page. Share it with Nick and your other 2-3 testers. This is where they log every bug, confusion, and broken step they find. Title it: `BETA TESTING LOG — [Date]`
- [ ] **Check your DigitalOcean account** — confirm your API token is active and your account has enough credit to spin up at least 1-2 real droplets when the time comes.
- [ ] **Set a billing alert** — go to AWS or DigitalOcean, set an alert at $20 so nothing surprises you.

---

## DAY 1 — Audit & Local Mode

**Theme: Know exactly what's broken before you touch anything**

### Morning: Build the Local Mode Flag

Your provisioning flow currently calls the DigitalOcean API to create a droplet. You need a bypass for local testing.

- [ ] Find the section in your ignition orchestrator (`lib/genesis/ignition-orchestrator.ts`) where it calls the DigitalOcean droplet creation API
- [ ] Add a single environment variable: `LOCAL_MODE=true`
- [ ] When `LOCAL_MODE=true`, skip the DigitalOcean API call and instead accept a manually provided IP address as the "droplet IP"
- [ ] All other provisioning steps (sidecar handshake, credential injection, workflow deployment) run exactly the same

**This is the only code change today. Don't touch anything else.**

### Afternoon: Create the Local Docker Package

Build the package Nick and your testers will run. This contains zero proprietary code — just the stack config.

- [ ] Create a new folder: `local-test-kit/`
- [ ] Inside it, create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=n8npassword
    depends_on:
      - postgres
    volumes:
      - n8n_data:/home/node/.n8n

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=n8n
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=n8npassword
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  n8n_data:
  postgres_data:
```

- [ ] Create `README.txt` inside `local-test-kit/` with these exact instructions:

```
BETA TESTER SETUP — 3 STEPS

1. Install Docker Desktop from docker.com (free)
2. Open Terminal in this folder and run: docker compose up -d
3. Open your browser and go to: http://localhost:5678
4. Message [YOUR NAME] with your local IP address (Google "what is my local IP")
   - Mac: System Preferences → Network
   - Windows: Settings → Network → Properties

That's it. Do NOT configure anything in n8n. 
I will handle everything else from my end.
```

- [ ] Zip the `local-test-kit/` folder. This is what you send to testers.
- [ ] **Do NOT include** any API keys, your Supabase credentials, your codebase, or any workflow JSON in this zip.

### Evening: Verify Your Own Onboarding Flow

- [ ] Go to your own dashboard at your Vercel URL
- [ ] Go through the onboarding wizard start to finish as if you're a brand new client
- [ ] Write down every step that either breaks, feels confusing, or requires manual intervention
- [ ] Add all findings to the Beta Testing Log

---

## DAY 2 — Credential Injection Audit

**Theme: The most critical question — does n8n get its credentials automatically?**

This is the needle in the haystack you mentioned. Here's how to find it without reading the whole codebase.

### The Specific Thing to Find

- [ ] Open your sidecar code: `sidecar/` folder
- [ ] Search for any calls to the n8n credentials API. The endpoint looks like:
  ```
  POST /api/v1/credentials
  ```
- [ ] If you find it — your sidecar is creating credentials automatically. ✅
- [ ] If you don't find it — credentials are NOT being created automatically. This is your #1 fix.

### If Credentials Are NOT Being Created Automatically

You need to add this to your sidecar's provisioning sequence. After the sidecar boots and before workflows are deployed, it should call n8n's credential API for each service:

- [ ] Supabase Postgres connection (host, port, database name, username, password)
- [ ] OpenAI API key
- [ ] Anthropic API key
- [ ] Gmail OAuth credentials
- [ ] Relevance AI auth token
- [ ] Apify API key
- [ ] Google Sheets OAuth

The credential data comes from your encrypted vault in Supabase (already built in Phase 58). The sidecar reads the tenant's decrypted credentials from the vault, then POSTs each one to n8n's credential creation endpoint.

- [ ] Check your Dynamic UUID Mapper (`lib/genesis/uuid-mapper.ts`) — confirm it runs AFTER credential creation, not before
- [ ] The order must be: Boot → Create Credentials → Get UUIDs → Replace UUIDs in templates → Deploy workflows

### End of Day 2 Check
- [ ] You know for certain whether credentials auto-inject or not
- [ ] If they don't: you have a plan to fix it (add the credential creation calls to sidecar)

---

## DAY 3 — Fix Critical Gaps + Send Nick the Test Kit

**Theme: Fix only what blocks end-to-end. Send the local test kit.**

### Morning: Fix Whatever Day 2 Found

If credentials don't auto-inject:
- [ ] Add credential creation calls to your sidecar provisioning sequence
- [ ] Test locally: run your provisioning flow against `localhost:5678`, check if credentials appear in n8n Settings → Credentials

If credentials DO auto-inject:
- [ ] Move straight to workflow verification (below)

### Workflow Deployment Verification

- [ ] After provisioning runs against your local n8n instance, open n8n at `localhost:5678`
- [ ] Check: are all 7 workflows deployed? (Email Prep, Email 1, Email 2, Email 3, Reply Tracker, Opt-Out, Research Report)
- [ ] Check: are the scheduled triggers set to the correct times?
- [ ] Check: do the Postgres nodes point to your Supabase URL, not a hardcoded Ohio connection?
- [ ] Check: does the Anthropic node show a valid credential, not a blank?

### Afternoon: Send Test Kit to Nick

- [ ] Send Nick the `local-test-kit.zip`
- [ ] Include your beta testing log link so he can report findings directly
- [ ] Ask him to set it up today or tomorrow and send you his local IP when ready
- [ ] Confirm the testing call time for Day 4 or 5

---

## DAY 4 — Nick's Live Test Session

**Theme: Watch a real human go through your system**

### Before the Session
- [ ] Have your admin dashboard open and visible
- [ ] Have your Supabase dashboard open in another tab (to watch database writes in real time)
- [ ] Have your n8n logs ready (if control plane is deployed) or be ready to SSH into Nick's machine if needed
- [ ] Have the Beta Testing Log open

### During the Session — What Nick Does
Nick goes through your onboarding wizard on your live dashboard from start to finish:

- [ ] Creates account via Clerk
- [ ] Creates a workspace
- [ ] Goes through the 11-step onboarding wizard
- [ ] Enters his local machine IP when prompted for droplet
- [ ] Completes credential entry (you give him test API keys — NOT your real ones)
- [ ] Clicks "Launch" / ignition trigger

### What You Watch For
- [ ] Does the sidecar handshake complete? (Watch your dashboard fleet status)
- [ ] Do credentials appear in his local n8n? (Nick confirms)
- [ ] Are all 7 workflows deployed to his n8n? (Nick confirms)
- [ ] Does his workspace appear correctly in your admin panel?
- [ ] Does the dashboard show his tenant as ONLINE?

### After the Session
- [ ] Nick logs every bug and confusion point in the Beta Testing Log
- [ ] You triage the list: **Critical** (blocks functionality) vs **Minor** (polish/UX)
- [ ] You only fix Critical items this week

---

## DAY 5 — Fix Critical Bugs + Workflow Smoke Test

**Theme: Fix what Day 4 broke. Prove emails actually send.**

### Morning: Fix Critical Bugs from Day 4
- [ ] Work through the Critical items from Nick's testing log
- [ ] Do NOT fix Minor/UX items — that's for your UI friend, not this week
- [ ] For each fix: test it locally before moving on

### Afternoon: Smoke Test the Full Email Pipeline

With Nick's local n8n running and workflows deployed:

- [ ] Upload 3 test leads to the database (use fake but realistic data — real names, real companies, fake emails you control)
- [ ] Manually trigger the Email Preparation workflow
- [ ] Watch: does it call Relevance AI? Does it call Google CSE? Does it call Anthropic?
- [ ] Check Supabase: are the leads updated with research_report, email_1_subject, email_1_body?
- [ ] Manually trigger Email 1 workflow
- [ ] Check: does an email land in your test inbox?
- [ ] Check: does the open pixel fire when you open the email? Does the dashboard register an open event?
- [ ] Click the unsubscribe link — does the Opt-Out workflow fire and update the database?

### End of Day 5 Goal
- [ ] At least one test email successfully sent, tracked, and logged in your dashboard
- [ ] This is your proof of concept. Screenshot everything.

---

## DAY 6 — Nick as First Real Client

**Theme: Stop testing. Start selling.**

Today Nick stops being a tester and becomes your first real client (or your first real referral to a paying client).

### The Conversation to Have with Nick

Sit down with him (call or in person) and say exactly this:

*"The system works. I've proven it end-to-end. I want to run a real campaign for you or for one of your clients. No upfront cost — I take a percentage of every client you close from my campaigns. You bring the target audience, I handle everything else from research to sending to tracking."*

- [ ] Have this conversation today
- [ ] Come out of it with either: (a) Nick as a live client, or (b) a specific person in his network who will be your first client
- [ ] Agree on the target audience (industry, job title, geography)
- [ ] Agree on the commission structure

### Prepare the Real Campaign
- [ ] Get the lead list from Nick (he can pull from his existing sources, or use the manual Apollo/LinkedIn method)
- [ ] Clean and format the list to match your database schema
- [ ] Upload leads to the production database (not test data — real leads)
- [ ] Configure the workflow prompts for Nick's specific niche and offer

---

## DAY 7 — Go Live

**Theme: Real leads. Real emails. Real client.**

- [ ] Confirm all production credentials are configured (real API keys, real Gmail account, real Calendly link)
- [ ] Run Email Preparation workflow on the real lead list
- [ ] Review 5-10 of the generated emails manually — do they read like genuine personalized outreach? Are the pain points accurate? Are the subjects compelling?
- [ ] If yes: activate the sending schedules
- [ ] If any emails look generic or wrong: tweak the analysis/drafting prompts before sending

### Launch Confirmation Checklist
- [ ] ✅ Leads uploaded and prepared
- [ ] ✅ Emails generated and reviewed
- [ ] ✅ Sending schedules active
- [ ] ✅ Reply tracker active and monitoring inbox
- [ ] ✅ Dashboard showing campaign as live
- [ ] ✅ Nick knows to forward any replies immediately

**You are now live. Your first campaign is running.**

---

## WHAT YOU DO NOT TOUCH THIS WEEK

Write this list down and tape it somewhere visible.

| Do NOT Build | Why |
|---|---|
| Stripe integration | No clients yet — collect payment manually |
| Web scraper | Use manual leads or Nick's sources for now |
| Mailbox warming | Not needed for first campaign |
| Control plane on Railway | Vercel holds for now |
| A/B testing | After you have reply data |
| Reply classification AI | After you have replies to classify |
| New UI features | Your UI friend handles this separately |
| Pricing infrastructure | After you see what clients actually pay |
| Email verification (NeverBounce) | Add after first campaign — not a blocker |
| AWS migration | After first 4-5 paying clients |

---

## BUG TRIAGE FRAMEWORK

When bugs come in from testers, categorize immediately:

**🔴 Critical — Fix This Week**
- Provisioning fails to complete
- Credentials don't inject into n8n
- Workflows don't deploy
- Emails don't send
- Dashboard doesn't reflect real data
- Tenant data leaks into another tenant's view

**🟡 Important — Fix After Launch**
- UI confusion or bad UX
- Missing frontend monitoring for sidecar/control plane
- Campaign isolation uncertainty
- Error messages that are unclear

**⚪ Nice to Have — Backlog**
- Everything in the "DO NOT TOUCH" list above
- Mobile UI polish
- Additional workflow features
- Analytics enhancements

---

## PAYMENT COLLECTION (No Stripe Needed)

For your first clients this week, collect payment manually:

- **PayPal** — invoice them directly, instant
- **Bank transfer / Zelle / Venmo** — fine for first clients
- **Wise** — if Nick's contacts are international

Tell clients: *"We're in early access — payment is handled directly for now. Stripe billing coming next month."*

No client in early access will refuse to pay via PayPal. This removes the Stripe blocker entirely.

---

## END OF WEEK SUCCESS CRITERIA

By Day 7, you should be able to check all of these:

- [ ] System provisioned a local test environment successfully
- [ ] All 7 workflows deployed automatically without manual n8n configuration
- [ ] Credentials injected automatically without manual setup
- [ ] At least one real email sent, opened, and tracked in dashboard
- [ ] Nick (or his contact) confirmed as first live client
- [ ] Real campaign running with real leads
- [ ] Payment agreed upon

**If you hit all of these: you launched. Everything else is iteration.**

---

## DAILY CHECK-IN RHYTHM

Every morning this week, answer three questions before you open your code editor:

1. What is the ONE thing I must complete today to stay on track?
2. What is the biggest risk that could derail today?
3. What do I need from Nick or testers today?

Write the answers down. Build only what answers question 1.

---

*Built specifically for the Cold Email Platform — Singularity Architecture V35*
*Week of Launch | Version 1.0*
