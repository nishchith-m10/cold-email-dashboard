# SANDBOX REDESIGN VISION

**Author:** Nishchith (verbatim requirements captured 2026-02-26)
**Status:** PENDING — To be addressed AFTER Domain 8 is complete
**Priority:** CRITICAL — Do not lose any detail from this document

---

## User's Exact Requirements (Verbatim)

> No, I don't want to address these issues into domain eight scope. I need to reformulate and kind of redesign the sandbox. My main vision of the sandbox is not what it is right now, or at least not what I wanted it to look like, because there are a lot of things to consider. Especially when you're trying to horizontally scale and not vertically scale. That's exactly how it works, because my entire infrastructure, all the trade-offs that I ended up making, is more so thinking about horizontal scale rather than vertical, rather than increasing the number of volume into one instance. I just try to diversify it into multiple instances and divide them by increasing the load or dividing the load per instance.
>
> For example, another thing to consider that I haven't yet considered in the base templates is to also have some sort of architecture. If, let's say, one campaign has to have a lot of email sent out per day, right now, at max, the number of emails that my campaign can be sent out is only going to be like a hundred, because I only have it for one inbox. For example, under my pricing, I had a proper pricing; it's not there yet, but what it's supposed to be is that they could essentially have, per campaign, as many emails as they want to send per day. That means that you also increase the number of inboxes that you'll be sending the emails from, so my base template itself doesn't have that infrastructure just yet. I do know how to make that; it's just kind of split them and basically duplicate them for email one to email three, and have it spin up all of those and then have some sort of switch note or some shit. That's not my point; that's not something I want to address. That's just something I do; I want you to consider it as well.
>
> Like one of my designs of how the sandbox should work is more like a playground mode where they can actually interact with n8n itself, with the workflows (all seven workflows) and that too per campaign, like not interacting with all of the nodes but more so being able to interact with at least the majority of the nodes that they want. Those having role hierarchies as well, like only the owner can edit the nodes as well if they want to from here, which would get fired up back into that specific n8n that it's connected to, to that specific workspace and that to that specific campaign. That was kind of my vision to have some sort of flowchart-like flow thing, just like how n8n diagrams work, like the nodes and the floats and the branches and connections, like how it actually looks like a visualization of how it looks. Without even having to tell that it's n8n being in the backend, more so having our own wrapper or our own design wrapper on top of it to make it look like it's some sort of crazy powerful engine that's going on in the background.
>
> Like the sandbox is to have for testing as well, but to also be able to visualize what's actually going on in the backend as well during production of these n8n workflows. That was kind of the design that I wanted to have, and I didn't address that early on because I had so many other things to tackle. I do really feel like that's something that's going to be powerful. Another main note: the clients or the tenants should never even know that it's n8n in the background. They should not know, because it's way too technical for them. They should not even know it's n8n, and they don't care either, as long as it looks nice, the design is clear, and they can visualize it, like the nodes, all of that stuff. That's that too completely live and not lagging either. It's going to be hard, but that was kind of the design that I wanted to have, like a complete sandbox/playground mode. I hope this really makes sense in that way, for example, that the customization part right now, even if everything is automated, there is still some stuff that I would have to go to that specific and then go and edit, especially the prompts. There are certain, maybe, the way it looks, more like personalized things, like connections and stuff and all of that stuff, if you really look at it and make sense.
>
> And that's when the campaign configuration comes in. It's pretty much like a useless thing: the maximum emails per day, the reply delay per minute, and the office hours. All of that shit doesn't make sense to have it there. It really doesn't make any sense. It's not campaign-specific, it's not workspace-specific, and it's not sequence-specific either. It's a fundamental design flaw for the sandbox right now.

---

## Key Design Principles Extracted

### 1. Horizontal Scale Architecture
- Infrastructure is designed for horizontal scaling, NOT vertical
- Load is divided across multiple instances rather than increasing volume on one instance
- All sandbox redesign must respect this architectural decision

### 2. Multi-Inbox Per Campaign (Future Consideration)
- Currently limited to ~100 emails/day per campaign because only one inbox
- Future pricing model allows tenants to send as many emails as they want per campaign per day
- This means scaling the number of inboxes (sending addresses) per campaign
- Base n8n templates need to be duplicated/split for Email 1 through Email 3 with switch nodes to distribute across inboxes
- **Not to be addressed now** — but must be considered in sandbox design so it's compatible

### 3. Playground Mode (Core Vision)
- Sandbox should be a **playground** where tenants can interact with the n8n workflows
- Interaction with all 7 workflows, per campaign
- Not interacting with ALL nodes — but the majority of important ones
- Role-based access: only owners can edit nodes from the sandbox UI
- Edits made in the sandbox UI fire back to the specific n8n instance connected to that specific workspace and campaign

### 4. Flowchart Visualization (Core UX)
- Visual representation like n8n's node diagram: nodes, flows, branches, connections
- Must look like a proprietary engine — **never reveal it's n8n underneath**
- Custom design wrapper on top of n8n's workflow structure
- Should appear as "some crazy powerful engine in the background"

### 5. Live Production Visualization
- Sandbox right now is for testing AND for visualizing what's happening in testing and production
- Live, real-time visualization of n8n workflow execution during production
- Must be completely live and not lagging

### 6. White-Label / No n8n Branding
- **Clients/tenants must NEVER know it's n8n in the backend**
- Too technical for them, they don't care
- As long as design is clear, nice-looking, and they can visualize it

### 7. Node Customization from Dashboard
- Even though workflows are automated, some things still need manual editing
- Especially: prompts (AI node prompts)
- Personalization: connections, campaign-specific settings
- Users should be able to edit these from the dashboard without accessing n8n directly
- Refer to the base-cold-email-template for examples of what needs to be editable from the dashboard and what sidecar already supports in terms of write-back to n8n

### 8. Current Campaign Configuration is Fundamentally Flawed
- MAX_EMAILS_PER_DAY, REPLY_DELAY_MINUTES, Office Hours — all useless in their current form
- Not campaign-specific, not workspace-specific, not sequence-specific
- Fundamental design flaw — needs complete rethink in the redesign

---

## What the Redesigned Sandbox Should Accomplish

1. **Per-campaign workflow visualization** — flowchart-style view of all 7 workflows for each campaign
2. **Interactive nodes** — tenants can click on nodes to view/edit configurable parameters (prompts, personalization, etc.)
3. **Role-gated editing** — only workspace owners can edit nodes; other roles can view only
4. **Live execution monitoring** — real-time node-by-node execution visualization during both testing and production
5. **Test/playground mode** — trigger test runs and watch them execute through the flowchart
6. **Write-back to n8n** — edits made in the UI are synced back to the actual n8n workflow on the sidecar
7. **No n8n exposure** — completely custom UI wrapper, no n8n branding or terminology visible to tenants
8. **Horizontal-scale compatible** — design must work with multi-instance architecture
9. **Multi-inbox compatible** — design must anticipate campaigns spanning multiple sending inboxes

---

## Timeline

- **Domain 8:** Complete FIRST (last item in Post-Genesis Execution Plan)
- **Sandbox Redesign:** Immediately AFTER Domain 8
