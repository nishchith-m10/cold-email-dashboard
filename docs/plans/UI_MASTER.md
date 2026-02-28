# UI_MASTER.md — UpShot Cold Email Platform

## Frontend UI/UX Sprint — Source of Truth

| Field | Value |
|---|---|
| **Version** | 1.0.0 |
| **Date** | 2026-02-27 |
| **Status** | ACTIVE — Sprint In Progress |
| **Repository** | `nishchith-m10/cold-email-dashboard` |
| **Framework** | Next.js 16 + React 18 + Tailwind CSS 3.4 |
| **Dark Mode** | Class-based (`darkMode: 'class'` in tailwind.config.js) |
| **Auth** | Clerk (`@clerk/nextjs`) |
| **State** | SWR 2.2.5 + React Context |
| **UI Components** | Radix UI + Lucide Icons + Framer Motion |
| **Charting** | Recharts 3.7 |
| **Total Sessions** | 4 (parallel, autonomous) |
| **Merge Authority** | Main repo owner ONLY |

---

## 1. PURPOSE AND PHILOSOPHY

### 1.1 Why This Document Exists

This document is the **sole source of truth** for all frontend UI/UX work on the UpShot Cold Email Platform during this sprint. It replaces all verbal instructions, Slack messages, GitHub issue descriptions, and any other form of communication between agents.

Every parallel Copilot agent session reads **ONLY this file** to know:
- What it must build
- What branch it must work on
- What files it owns exclusively
- What files it must never touch
- What definition of done looks like
- What order to tackle tasks in

No other document, conversation, or instruction supersedes this file. If there is a conflict between this document and any other source, this document wins.

### 1.2 The Lateral Communication Principle

**Agents do not talk to each other.** There is no inter-agent messaging, no shared chat, no coordination channel. All coordination is handled exclusively by reading and writing to this file.

The communication model is:

```
  Agent 1 ──reads/writes──▶ UI_MASTER.md ◀──reads/writes── Agent 2
  Agent 3 ──reads/writes──▶ UI_MASTER.md ◀──reads/writes── Agent 4
```

Every agent writes its progress (STATUS markers) to this file. Every agent reads other agents' progress from this file. That is the only form of inter-agent awareness that exists.

If Agent 2 needs to know whether Agent 1 has finished a dependency, it opens this file and checks the STATUS marker. It does not ask Agent 1. It does not wait for a signal. It reads the file.

### 1.3 How to Read This Document as an Agent

1. **Read the entire document first.** Do not skip to your session section. The execution philosophy, hard rules, and shared files policy apply to ALL sessions.
2. **Locate your session section.** Your session number is determined by the trigger phrase the human gave you (e.g., "Begin session 2" means you are Session 2).
3. **Read your file ownership list.** These are the ONLY files you may modify.
4. **Read your forbidden files list.** You may NEVER touch these files, even if you see a bug in them.
5. **Read every task in your session.** Understand priorities (HIGH → MEDIUM → LOW). Work in that order.
6. **Check STATUS markers.** Skip any task marked ✅ DONE. Resume any task marked 🔄 IN PROGRESS.
7. **Execute.** Follow the session lifecycle in Section 2.1 exactly.

### 1.4 What to Do When Something Is Not Covered

If you encounter a situation not explicitly addressed in this document:

1. **Do NOT improvise.** Do not invent new tasks, files, or approaches.
2. **Do NOT create additional documentation files.** No `notes.md`, no `progress.md`, no `summary.md`.
3. **Leave a TODO comment in your code** at the exact location of the issue, formatted as:
   ```
   // TODO(session-N): [description of uncovered situation] — needs UI_MASTER.md update
   ```
4. **Flag it in your PR description.** The main repo owner will address it.
5. **Continue with the next task.** Do not block your entire session on one uncovered edge case.

### 1.5 The 4-Session Parallel Model

All 4 sessions run simultaneously. Each is fully autonomous. Each treats this document as the only authority.

| Session | Scope | Branch |
|---|---|---|
| **Session 1** | Sidebar, Navigation, Panel UX, Syncing Indicator | `ui/sidebar-navigation-panel` |
| **Session 2** | Campaigns, Onboarding Chatbot, Form Alignment | `ui/campaigns-onboarding-forms` |
| **Session 3** | Settings Pages, Sign-out, Sign-in, Light Mode Transitions | `ui/settings-auth-lightmode` |
| **Session 4** | Sandbox, Icons, KPI Cards, Stats Layout | `ui/sandbox-icons-kpi-stats` |

No session waits for another. No session depends on another's output (file ownership ensures this). The merge order (Section 2.1, Step 8) handles integration — that is the repo owner's responsibility, not the agent's.

---

## 2. EXECUTION PHILOSOPHY

### 2.1 Session Lifecycle — Every Session Follows This Exact Order

#### STEP 1 — PULL LATEST

Before touching a single file, every session must:

```bash
git checkout main
git pull origin main
git checkout -b [session-branch-name]
```

This ensures every session starts from the same clean baseline.

Branch names are fixed and non-negotiable:
- Session 1: `ui/sidebar-navigation-panel`
- Session 2: `ui/campaigns-onboarding-forms`
- Session 3: `ui/settings-auth-lightmode`
- Session 4: `ui/sandbox-icons-kpi-stats`

If this step fails for any reason (network error, merge conflict on main, authentication failure), **halt and do not proceed.** State the exact error and wait. Do not attempt workarounds.

#### STEP 2 — READ THIS DOCUMENT FIRST

Every session reads `docs/plan/UI_MASTER.md` in full before writing a single line of code.

Specifically, every session must confirm it has read:
- [ ] Section 2 (Execution Philosophy) — all subsections
- [ ] Section 3 (Agent Coordination Rules)
- [ ] Section 4 (Global File Ownership Map) — verify your assigned files exist
- [ ] Section 5 (Shared Files Policy)
- [ ] Section 7 (Design System Reference)
- [ ] Its own Session section (Sections 8-11) — all tasks, priorities, definitions of done

Do not start coding until both the ownership list and forbidden files list are fully understood for this session.

#### STEP 3 — EXECUTE IN PRIORITY ORDER

Work through tasks in this strict order without deviation:

1. **HIGH priority tasks** → commit each individually when done
2. **MEDIUM priority tasks** → commit each individually when done
3. **LOW priority tasks** → commit each individually when done

Rules:
- Never skip ahead to a lower priority task while a higher priority is incomplete.
- Never bundle multiple tasks into one commit. **One task = one commit.**
- Commit message format: `feat(ui): [task-name] — [1-line description]`
- Example: `feat(ui): sidebar-transitions — smooth expand/collapse with 200ms ease-in-out`

#### STEP 4 — VERCEL SKILLS ACTIVATION

Before modifying any component, activate Vercel Skills by reading the relevant skill files:

1. **Read `c:\Users\mayan\.agents\skills\vercel-react-best-practices\SKILL.md`** — Apply React/Next.js performance patterns before any component change.
2. **Read `c:\Users\mayan\.agents\skills\vercel-composition-patterns\SKILL.md`** — Use composition patterns when refactoring components.
3. **Read `c:\Users\mayan\.agents\skills\web-design-guidelines\SKILL.md`** — Validate UI changes against web design best practices.

Specific Vercel Skills checks before every component edit:
- Inspect the DOM structure of the target component before writing any changes
- Understand how the component renders in both light and dark mode before touching it
- Validate that proposed Tailwind classes exist in the project's `tailwind.config.js` before applying them
- Check responsive breakpoints — any fix must not break mobile (xs: 320px, sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px)
- Verify that the component uses `cn()` from `lib/utils.ts` for class merging (not raw string concatenation)
- Confirm animations use the existing keyframes defined in `tailwind.config.js` (`fade-in`, `slide-up`, `slide-down`, `scale-in`, `shimmer`) or Framer Motion — no new CSS animation definitions

Vercel Skills give the agent a deep understanding of the component tree, DOM relationships, and rendering context that prevents blind edits.

#### STEP 5 — RALPH LOOP ON EVERY SINGLE TASK

Apply the RALPH Loop before writing code for **each task**:

**R — Review:**
Read the actual component file. Understand what it currently does. Read imports, props, state, JSX structure. Do not rely on memory or assumptions about what the file contains. If the file is longer than 100 lines, read it in full before making any change.

**A — Analyze:**
Identify the exact lines causing the problem. Name the CSS class, the inline style, the hardcoded value, or the missing transition. Be specific. Write down:
- The exact line number(s)
- The exact class or style causing the issue
- What it produces visually
- What it should produce instead

**L — Loop:**
Check if fixing this task affects any other component. If it does, loop back and check whether that component is in your ownership list. 
- If it IS in your ownership list → you may fix both
- If it is NOT → **stop.** Leave a TODO comment. Do not touch it.
This is the conflict detector — it prevents cross-session file contamination.

**P — Patch:**
Write the fix. Apply it. It must be surgical — minimum lines changed to achieve the required result. No refactoring unrelated code. No "while I'm here" improvements. No reformatting. Only the specific change described in the task spec.

**H — Harden:**
After the fix, verify all of the following:
- [ ] Dark mode still works (check with `html.dark` or default dark class)
- [ ] Light mode works (check with `html.light` class applied via `:root.light`)
- [ ] Mobile layout is intact (no overflow, no clipping at 375px viewport)
- [ ] No console errors introduced (no missing imports, no undefined references)
- [ ] The `cn()` utility is used for all conditional class merging
Only after all checks pass: **commit.**

#### STEP 6 — VERIFIER AGENT (Run After ALL Tasks in Session Are Complete)

After all HIGH, MEDIUM, and LOW tasks are committed, the Verifier Agent runs.

The Verifier Agent is a separate automated process using **Playwright** (already in devDependencies as `@playwright/test`). It does not write code. It only takes screenshots and compares against definitions of done specified in each task spec.

**Verifier Agent setup:**
Playwright is already installed (`@playwright/test` in `package.json` devDependencies). No new dependencies needed.

**Verifier Agent script location:** `scripts/verify-ui.ts`

For each completed task, the Verifier Agent must:

1. Launch a headless browser using Playwright
2. Navigate to the relevant page/component (URL specified in each task)
3. Take a screenshot in **dark mode** (default — `html` element has class `dark`)
4. Take a screenshot in **light mode** (toggle — `html` element gets class `light`, remove `dark`)
5. Take a screenshot at **mobile viewport** (375 × 812px — iPhone viewport)
6. Take a screenshot at **desktop viewport** (1440 × 900px — standard laptop)
7. Save screenshots to: `screenshots/session-[N]/[task-name]-[mode]-[viewport].png`
   - Example: `screenshots/session-1/sidebar-transitions-dark-desktop.png`
   - Example: `screenshots/session-1/sidebar-transitions-light-mobile.png`
8. Compare against the definition of done written in this document
9. Output a **PASS** or **FAIL** for each task
10. If **FAIL**: describe exactly what does not match the definition of done

**If any task returns FAIL:**
- The agent returns to that task only
- Applies RALPH loop again (re-read the file, re-analyze, re-patch)
- Re-runs the Verifier Agent on that specific task
- Does not proceed to PR until **all tasks return PASS**

**Runtime requirements:**
- The Verifier Agent runs on `localhost:3000` — `npm run dev` must be running
- Screenshots are committed to the branch alongside the code changes
- Screenshot commit message: `test(ui): add verification screenshots for session [N]`

#### STEP 7 — RAISE PR (Only After Verifier Agent Returns All PASS)

When all tasks pass verification:

```bash
git add -A
git commit -m "feat(ui): [session scope] — all tasks verified"
git push origin [session-branch-name]
```

PR creation (if `gh` CLI is authenticated):
```bash
gh pr create \
  --title "[UI Session N] [scope] — verified and ready for review" \
  --body "All tasks completed and verified by automated Verifier Agent.
Screenshots attached in screenshots/session-[N]/.
Definition of done met for all tasks.
Merge after review — do not squash commits (each commit = one task)." \
  --base main \
  --head [session-branch-name]
```

If `gh` CLI is not authenticated, output the PR link:
```
https://github.com/nishchith-m10/cold-email-dashboard/compare/main...[session-branch-name]
```

**The main repo owner reviews the PR, checks the screenshots, and merges to main. No session merges its own PR.**

#### STEP 8 — MERGE ORDER PROTOCOL

Sessions raise PRs as they complete — they do not wait for each other.

Main owner merges in this strict order regardless of completion time:

| Order | Session | Branch | Reason |
|---|---|---|---|
| 1st | Session 1 | `ui/sidebar-navigation-panel` | Owns shared layout files — merges first |
| 2nd | Session 2 | `ui/campaigns-onboarding-forms` | Depends on stable layout |
| 3rd | Session 3 | `ui/settings-auth-lightmode` | Depends on stable layout + stable styles |
| 4th | Session 4 | `ui/sandbox-icons-kpi-stats` | Last to merge — least dependencies |

Before each merge (except Session 1), the main owner runs:
```bash
git checkout [session-branch]
git fetch origin
git rebase origin/main
git push origin [session-branch] --force-with-lease
```

**Conflict protocol:** If a rebase produces a conflict, do NOT auto-resolve. Push the conflict markers and flag in the PR for the main owner to resolve manually. No agent resolves merge conflicts.

---

### 2.2 RALPH Loop — Detailed Rules

The RALPH Loop is not optional. It is applied before **every single task**, no exceptions.

| Step | Action | Failure Mode It Prevents |
|---|---|---|
| **R — Review** | Read the actual component file in full | Prevents patching based on stale assumptions |
| **A — Analyze** | Identify exact lines, classes, styles causing the issue | Prevents shotgun debugging / random class changes |
| **L — Loop** | Check cross-component impact; verify ownership | Prevents cross-session file contamination |
| **P — Patch** | Minimal surgical fix — only lines needed for this task | Prevents scope creep and unrelated refactoring |
| **H — Harden** | Verify dark/light/mobile/console after every patch | Prevents regression in other visual modes |

Additional RALPH rules:
- If **Review** reveals the file has changed since the task was written (e.g., another session updated UI_MASTER.md marking a dependency as done), re-read and re-analyze before patching. Do not apply a patch to a stale understanding.
- The **Loop** step is the conflict detector — it is what prevents two sessions from editing the same file. Take it seriously. If you find a cross-dependency, leave a TODO and move on.
- **Harden** always includes these four checks, in this order:
  1. Dark mode visual check (default state — `html` has class `dark`)
  2. Light mode visual check (`html` has class `light`)
  3. Mobile layout check (375px viewport — no horizontal overflow, no clipping)
  4. Console error check (no new errors introduced by the change)

---

### 2.3 Vercel Skills — Usage Rules

Vercel Skills are activated at the **start of each task**, not just the start of each session. The relevant skill files are:

| Skill | File Path | When to Use |
|---|---|---|
| React Best Practices | `c:\Users\mayan\.agents\skills\vercel-react-best-practices\SKILL.md` | Every component modification |
| Composition Patterns | `c:\Users\mayan\.agents\skills\vercel-composition-patterns\SKILL.md` | When restructuring JSX or extracting sub-components |
| Web Design Guidelines | `c:\Users\mayan\.agents\skills\web-design-guidelines\SKILL.md` | When modifying visual layout, spacing, colors |

Specific usage rules:
- Use Vercel Skills to inspect actual rendered output before writing changes
- Use Vercel Skills to validate Tailwind class names against the project's `tailwind.config.js`
- Use Vercel Skills to understand component hierarchy and which parent is causing a child issue
- Use Vercel Skills to check z-index stacking context before any z-index change
- **Never change a z-index without first mapping the full stacking context** — this project uses layered UI (sidebar, header, modals, toasts, popovers) and a blind z-index change will break other layers

Current z-index layers in the project (reference before any z-index change):
| Layer | z-index | Component |
|---|---|---|
| Base content | 0 | Page content, cards, widgets |
| Sidebar | 10-20 | `components/layout/sidebar.tsx` |
| Header / Top Nav | 30-50 | `components/layout/header.tsx`, `components/layout/top-navbar.tsx` |
| Dropdowns / Popovers | 50+ | Radix UI managed (auto) |
| Modals / Dialogs | 50+ | Radix UI managed (auto) |
| Toast notifications | 9999 | `components/ui/toaster.tsx` |
| Sign-out transition | Needs audit | `components/ui/sign-out-transition.tsx` |

---

### 2.4 Task Status Tracking — In-Document Checkoff Protocol

This document is the **only** record of what has been done. No agent creates a separate summary file, a separate log file, or any other markdown file.

All status tracking happens inside `UI_MASTER.md` only.

Every task in this document is written with a status marker at the top:

```
STATUS: ⬜ PENDING
```

When an agent completes a task and the Verifier Agent returns PASS for it, the agent must update that task's status marker in `UI_MASTER.md` directly:

```
STATUS: ✅ DONE — Session [N] — [date] — [commit hash]
```

Format exactly:
```
✅ DONE — Session 2 — 2026-02-27 — a3f92c1
```

When an agent is actively working on a task (in progress, not yet verified):
```
STATUS: 🔄 IN PROGRESS — Session N
```

If a task was attempted but the Verifier Agent returned FAIL and it needs a second pass:
```
STATUS: ❌ FAILED VERIFICATION — Session N — [what failed]
```

**Rules for the checkoff protocol:**

1. An agent updates the status marker **immediately** after the Verifier Agent returns PASS for that specific task — not at the end of the session, not in the PR.
2. The status update to `UI_MASTER.md` is its own separate commit:
   ```
   git commit -m "docs(ui-master): mark [task name] as DONE — verified"
   ```
3. No agent may mark a task DONE that belongs to another session's ownership list.
4. No agent may change a DONE status back to PENDING or IN PROGRESS.
5. If an agent opens `UI_MASTER.md` and sees a task marked ✅ DONE, it skips that task entirely — no re-doing, no re-verifying, no touching those files again.
6. If an agent opens `UI_MASTER.md` and sees 🔄 IN PROGRESS on a task from its own session, it means a previous run was interrupted — resume from that task.
7. If an agent opens `UI_MASTER.md` and sees 🔄 IN PROGRESS on a task from a DIFFERENT session, it ignores it completely — not its concern.

This protocol means: **at any point in time, any agent can open UI_MASTER.md and know the exact state of the entire sprint without asking anyone.**

No agent ever creates: `summary.md`, `progress.md`, `done.md`, `notes.md`, or any other file. The only file that gets written to for documentation is `UI_MASTER.md`.

---

### 2.5 Commit Message Convention

Every commit must follow this exact format:

| Type | Format | Example |
|---|---|---|
| Task completion | `feat(ui): [task-name] — [description]` | `feat(ui): sidebar-transitions — smooth expand/collapse with 200ms ease-in-out` |
| Status update | `docs(ui-master): mark [task name] as DONE — verified` | `docs(ui-master): mark sidebar-transitions as DONE — verified` |
| Screenshots | `test(ui): add verification screenshots for session [N]` | `test(ui): add verification screenshots for session 1` |
| Final push | `feat(ui): session [N] [scope] — all tasks verified` | `feat(ui): session 1 sidebar-navigation-panel — all tasks verified` |

One commit per task. No bundling. No squashing. The PR reviewer needs to see each task as a separate commit for granular review.

---

### 2.6 Session Launch Commands — The Only Instruction Needed

This document is designed so that an agent needs **zero additional instruction** beyond a single trigger phrase and a reference to this file.

When a human says any of the following phrases and references `docs/plan/UI_MASTER.md`, the agent must immediately begin the full execution lifecycle for that session with no further prompting required:

| Trigger Phrase | Action |
|---|---|
| "Begin session 1" / "Start session 1" | Execute full Session 1 lifecycle |
| "Begin session 2" / "Start session 2" | Execute full Session 2 lifecycle |
| "Begin session 3" / "Start session 3" | Execute full Session 3 lifecycle |
| "Begin session 4" / "Start session 4" | Execute full Session 4 lifecycle |

Upon receiving a trigger phrase, the agent must:

**STEP 1** — Confirm which session it is running by reading the trigger phrase.
**STEP 2** — Open `docs/plan/UI_MASTER.md` immediately. Read the entire document.
**STEP 3** — Locate its session section. Read the branch name, file ownership list, forbidden files list, and all tasks with their current STATUS markers.
**STEP 4** — Skip any task marked ✅ DONE. Pick up from the first ⬜ PENDING task, or resume any 🔄 IN PROGRESS task if one exists.
**STEP 5** — Execute the full session lifecycle from Section 2.1 without any further instruction from the human.
**STEP 6** — The human's only other interaction is:
  - Reviewing and merging the final PR

The agent must **never** ask "what should I do next?" or "should I continue?" It reads the document, it knows what to do, it does it.

If something is genuinely blocked (merge conflict, missing file, broken build), it halts and states **exactly** what it is blocked on — one clear sentence — then waits. It does not ask open-ended questions.

The trigger phrase also implicitly means:
- Pull latest from main first
- Create the correct feature branch for this session
- Read `UI_MASTER.md` as the only source of truth
- Follow every rule in Section 2 without exception
- Update STATUS markers in `UI_MASTER.md` as tasks complete
- Raise the PR when Verifier Agent returns all PASS

Nothing else needs to be said. The document handles everything.

---

### 2.7 Hard Rules — Never Violate

These rules are absolute. Violating any single one invalidates the entire session's work.

| # | Rule | Reason |
|---|---|---|
| 1 | **NEVER modify logic, API calls, state management, hooks, or backend files** | This is a UI/UX sprint. Logic changes are out of scope. |
| 2 | **NEVER introduce new npm dependencies** | The dependency tree is locked. Use only what exists in `package.json`. |
| 3 | **NEVER write inline styles (`style={{...}}`)** — Tailwind only | Inline styles break the design system and are unmaintainable. |
| 4 | **NEVER create new CSS files** | All styles go through `tailwind.config.js` or `globals.css` (Session 1 owns `globals.css`). |
| 5 | **NEVER one-shot an entire session** — one task at a time, one commit at a time | Granular commits enable granular review and rollback. |
| 6 | **NEVER raise a PR before the Verifier Agent returns all PASS** | Unverified code does not get reviewed. |
| 7 | **NEVER merge your own PR** — main owner merges only | Merge order matters; the owner controls integration. |
| 8 | **NEVER guess at a file path** — read the file tree, confirm it exists first | Wrong file paths waste time and create phantom bugs. |
| 9 | **NEVER create any new markdown or documentation file** — `UI_MASTER.md` is the only doc | One source of truth means one file. |
| 10 | **NEVER mark a task DONE without Verifier Agent PASS confirmation** | DONE means verified. No exceptions. |
| 11 | **NEVER take initiative on tasks not listed in this document** — if it's not here, don't do it | Scope creep kills parallel workflows. |
| 12 | **NEVER modify a file not in your session's ownership list** | File ownership is absolute. Cross-session edits cause merge conflicts. |
| 13 | **NEVER reformat, restructure, or "clean up" code that is not part of your task** | Cosmetic changes create diff noise and merge conflicts. |
| 14 | **NEVER change z-index values without first auditing the full stacking context** | See Section 2.3 z-index layer table. Blind changes break overlays. |
| 15 | **NEVER remove existing Tailwind classes that you don't understand** | When in doubt, add classes; do not remove existing ones without analysis. |

---

## 3. AGENT COORDINATION RULES

### 3.1 Branch Isolation

- **One session per branch.** Never two sessions on the same branch.
- **One branch per session.** A session never creates additional branches.
- All work happens on the session's designated branch from Section 1.5.
- No session ever checks out another session's branch.

### 3.2 File Ownership — Absolute

File ownership is **absolute**. If a file is not in your ownership list (Section 4), you cannot touch it under any circumstance, even if you can see a bug in it.

What to do if you see a bug in a file you don't own:
1. Leave a TODO comment in **your own code** (not in the other file):
   ```tsx
   // TODO(session-N): Found bug in [other-file-path] — [description].
   // This file is owned by Session [M]. Flagged for their review.
   ```
2. Note it in your PR description under a section called "Cross-Session Observations."
3. Continue with your own tasks. Do not wait for the bug to be fixed.

### 3.3 Shared Files Protocol

Some files are potentially needed by multiple sessions. These files have a **single designated owner** (see Section 5).

If your task requires a change to a shared file and you are NOT the owner:
1. Write the change you need as a TODO comment in your own code
2. Format it clearly:
   ```tsx
   // SHARED-FILE-REQUEST(session-N): In globals.css, add:
   //   html.light .my-component { background-color: #FFFFFF; }
   // Reason: [why this is needed for your task]
   ```
3. Flag it in your PR description under "Shared File Requests"
4. Session 1 owns all shared files and will apply the change during their session or in a follow-up

### 3.4 PR Protocol

- PR naming convention: `[UI Session N] [scope] — verified`
  - Example: `[UI Session 1] Sidebar + Navigation + Panel — verified`
- Each PR must include:
  - All task commits (one per task)
  - All status update commits
  - All screenshots in `screenshots/session-[N]/`
  - PR body listing all completed tasks with their commit hashes
  - Any cross-session observations or shared file requests

### 3.5 Merge Order Enforcement

| Order | Session | Merged By | Prerequisite |
|---|---|---|---|
| 1st | Session 1 | Main owner | None — merges directly |
| 2nd | Session 2 | Main owner | Rebase on main after Session 1 merge |
| 3rd | Session 3 | Main owner | Rebase on main after Session 2 merge |
| 4th | Session 4 | Main owner | Rebase on main after Session 3 merge |

The main owner performs the rebase, not the agent:
```bash
git checkout [session-branch]
git fetch origin
git rebase origin/main
git push origin [session-branch] --force-with-lease
```

### 3.6 Conflict Resolution

- If a rebase produces a conflict, the main owner resolves it manually.
- No agent attempts to resolve merge conflicts.
- If an agent encounters a conflict during its own work (e.g., stale branch), it halts and states the exact error.

### 3.7 Verifier Agent Sharing

The Verifier Agent (`scripts/verify-ui.ts`) is shared tooling:
- All 4 sessions use the same script
- Each session writes to its own screenshot directory: `screenshots/session-[N]/`
- No session reads or modifies another session's screenshots
- The Verifier Agent is run locally on the agent's branch — it does not test other branches

### 3.8 Communication Hierarchy

```
┌─────────────────────────────────────────────────┐
│              UI_MASTER.md                        │
│  (Source of Truth — All Status Lives Here)       │
├─────────────────────────────────────────────────┤
│                                                  │
│   Session 1 ←reads/writes→  STATUS markers      │
│   Session 2 ←reads/writes→  STATUS markers      │
│   Session 3 ←reads/writes→  STATUS markers      │
│   Session 4 ←reads/writes→  STATUS markers      │
│                                                  │
├─────────────────────────────────────────────────┤
│              Main Repo Owner                     │
│  (Merges PRs, Resolves Conflicts, Reviews)       │
│  (The ONLY entity that talks to all sessions)    │
└─────────────────────────────────────────────────┘
```

No agent communicates with another agent. The repo owner is the only entity that interacts with all sessions. The repo owner's interaction is limited to: reviewing PRs, merging PRs, and resolving conflicts.

---
---

## 4. GLOBAL FILE OWNERSHIP MAP

Every `.tsx` and `.ts` file in `app/` and `components/` is assigned to exactly one session below.
**No file is unassigned. No file appears in two sessions.**

### 4.1 Session 1 — Sidebar, Navigation, Panel, Syncing

| File Path | Description |
|---|---|
| `components/layout/sidebar.tsx` | Vertical sidebar navigation |
| `components/layout/top-navbar.tsx` | Top horizontal navbar |
| `components/layout/header.tsx` | Legacy header (desktop, hidden on hybrid nav) |
| `components/layout/client-shell.tsx` | Client shell wrapper with sidebar + main content |
| `components/layout/layout-wrapper.tsx` | Route-conditional layout wrapper |
| `components/layout/command-palette.tsx` | Command palette (Cmd+K) |
| `components/ui/system-health-bar.tsx` | System health / sync status indicator |
| `components/ui/sync-legend.tsx` | Sync status color legend |
| `components/dashboard/dashboard-settings-panel.tsx` | Dashboard settings slide-out panel |
| `components/dashboard/dashboard-widget.tsx` | Draggable widget wrapper |
| `components/dashboard/compact-controls.tsx` | Top compact controls bar |
| `components/dashboard/workspace-switcher.tsx` | Workspace dropdown switcher |
| `lib/sidebar-context.tsx` | Sidebar mode context provider |
| `app/globals.css` | Global styles (SHARED — Session 1 is sole owner) |
| `tailwind.config.js` | Tailwind configuration (SHARED — Session 1 is sole owner) |
| `app/layout.tsx` | Root layout (SHARED — Session 1 is sole owner) |

### 4.2 Session 2 — Campaigns, Onboarding, Forms

| File Path | Description |
|---|---|
| `components/campaigns/campaign-wizard.tsx` | Multi-step campaign creation wizard |
| `components/campaigns/new-campaign-modal.tsx` | Modal wrapper for campaign wizard |
| `components/campaigns/csv-import-dialog.tsx` | CSV import dialog |
| `components/campaigns/template-gallery.tsx` | Template selection gallery |
| `components/campaigns/provisioning-progress.tsx` | Campaign provisioning progress UI |
| `components/onboarding/onboarding-tour.tsx` | Guided onboarding tour overlay |
| `components/genesis/genesis-onboarding-client.tsx` | Genesis onboarding client page |
| `components/genesis/genesis-onboarding-wizard.tsx` | Genesis onboarding wizard (multi-stage) |
| `components/genesis/stages/anthropic-key-stage.tsx` | Anthropic key onboarding stage |
| `components/genesis/stages/api-key-input-stage.tsx` | API key input stage |
| `components/genesis/stages/apify-selection-stage.tsx` | Apify selection stage |
| `components/genesis/stages/brand-info-stage.tsx` | Brand info stage |
| `components/genesis/stages/calendly-url-stage.tsx` | Calendly URL stage |
| `components/genesis/stages/dns-setup-stage.tsx` | DNS setup stage |
| `components/genesis/stages/email-provider-selection-stage.tsx` | Email provider selection |
| `components/genesis/stages/gmail-oauth-stage.tsx` | Gmail OAuth stage |
| `components/genesis/stages/google-cse-key-stage.tsx` | Google CSE key stage |
| `components/genesis/stages/ignition-stage.tsx` | Ignition (launch) stage |
| `components/genesis/stages/openai-key-stage.tsx` | OpenAI key stage |
| `components/genesis/stages/region-selection-stage.tsx` | Region selection stage |
| `components/genesis/stages/relevance-key-stage.tsx` | Relevance AI key stage |
| `components/genesis/stages/smtp-configuration-stage.tsx` | SMTP configuration stage |
| `components/dashboard/campaign-table.tsx` | Campaign stats table (read-only) |
| `components/dashboard/campaign-card-stack.tsx` | Mobile campaign card stack |
| `components/dashboard/campaign-management-table.tsx` | Campaign management table with actions |
| `components/dashboard/campaign-management-card-stack.tsx` | Mobile campaign management cards |
| `components/dashboard/campaign-toggle.tsx` | Campaign active/inactive toggle |
| `components/dashboard/campaign-pulse.tsx` | Campaign pulse indicator |
| `components/ui/editable-text.tsx` | Inline editable text component |
| `components/ui/bulk-action-toolbar.tsx` | Bulk action toolbar |
| `components/ui/context-menu.tsx` | Context menu (right-click) |
| `app/onboarding/page.tsx` | Onboarding page route |
| `app/contacts/page.tsx` | Contacts page route |

### 4.3 Session 3 — Settings, Sign-out, Sign-in, Light Mode

| File Path | Description |
|---|---|
| `components/settings/general-settings-tab.tsx` | General workspace settings panel |
| `components/settings/security-settings-tab.tsx` | Security settings panel |
| `components/settings/workspace-members-table.tsx` | Members management table |
| `components/settings/role-selector.tsx` | Role selection dropdown |
| `components/settings/config-vault-tab.tsx` | Config vault management |
| `components/settings/two-factor-modal.tsx` | 2FA setup/manage modal |
| `components/settings/active-sessions-modal.tsx` | Active sessions management |
| `components/settings/backup-codes-display.tsx` | Backup codes display |
| `components/ui/sign-out-transition.tsx` | Sign-out overlay transition |
| `components/providers/clerk-theme-provider.tsx` | Clerk theme provider |
| `components/providers/user-sync-provider.tsx` | User sync provider |
| `app/settings/page.tsx` | Settings page route |
| `app/sign-in/[[...sign-in]]/page.tsx` | Sign-in page route |
| `app/sign-up/[[...sign-up]]/page.tsx` | Sign-up page route |

### 4.4 Session 4 — Sandbox, Icons, KPI Cards, Stats

| File Path | Description |
|---|---|
| `components/sandbox/sandbox-panel.tsx` | Main sandbox panel |
| `components/sandbox/test-runner.tsx` | Test campaign runner |
| `components/sandbox/execution-monitor.tsx` | Execution monitor |
| `components/sandbox/configuration-section.tsx` | Campaign config sliders |
| `components/sandbox/config-status-bar.tsx` | Config status bar |
| `components/dashboard/metric-card.tsx` | KPI metric card |
| `components/dashboard/efficiency-metrics.tsx` | Efficiency metrics panel |
| `components/dashboard/step-breakdown.tsx` | Sequence step breakdown |
| `components/dashboard/daily-sends-chart.tsx` | Daily sends chart |
| `components/dashboard/daily-cost-chart.tsx` | Daily cost chart |
| `components/dashboard/time-series-chart.tsx` | Time series line/area chart |
| `components/dashboard/donut-chart.tsx` | Donut chart |
| `components/dashboard/sender-breakdown.tsx` | Sender breakdown panel |
| `components/dashboard/date-range-picker.tsx` | Date range picker |
| `components/dashboard/date-range-picker-content.tsx` | Date range picker content |
| `components/dashboard/date-range-picker-mobile.tsx` | Mobile date range picker |
| `components/dashboard/timezone-selector.tsx` | Timezone selector |
| `components/dashboard/timezone-selector-content.tsx` | Timezone selector content |
| `components/dashboard/provider-selector.tsx` | Provider selector |
| `components/dashboard/ask-ai.tsx` | Ask AI chat component |
| `components/dashboard/share-dialog.tsx` | Share dialog |
| `components/dashboard/share-dialog-old.tsx` | Legacy share dialog |
| `components/dashboard/lazy-charts.tsx` | Lazy-loaded chart wrappers |
| `components/dashboard/safe-components.tsx` | Safe component wrappers |
| `components/dashboard/mobile-collapsible-widget.tsx` | Mobile collapsible widget |
| `components/pages/dashboard-page-client.tsx` | Main dashboard page client |
| `components/pages/analytics-page-client.tsx` | Analytics page client |
| `components/pages/join-page-client.tsx` | Join page client |
| `components/pages/not-found-client.tsx` | 404 page client |
| `app/sandbox/page.tsx` | Sandbox page route |
| `app/analytics/page.tsx` | Analytics page route |
| `app/page.tsx` | Home/dashboard page route |

### 4.5 Shared Ownership — Components Used By Multiple Sessions But Not Modified

These files are used (imported) by multiple sessions but are NOT being modified in this sprint. No session may edit them:

| File Path | Description |
|---|---|
| `components/ui/button.tsx` | Button component |
| `components/ui/card.tsx` | Card component |
| `components/ui/input.tsx` | Input component |
| `components/ui/badge.tsx` | Badge component |
| `components/ui/skeleton.tsx` | Skeleton loading component |
| `components/ui/dialog.tsx` | Dialog component |
| `components/ui/dropdown-menu.tsx` | Dropdown menu |
| `components/ui/tooltip.tsx` | Tooltip component |
| `components/ui/select.tsx` | Select component |
| `components/ui/switch.tsx` | Switch component |
| `components/ui/slider.tsx` | Slider component |
| `components/ui/label.tsx` | Label component |
| `components/ui/textarea.tsx` | Textarea component |
| `components/ui/checkbox.tsx` | Checkbox component |
| `components/ui/toast.tsx` | Toast component |
| `components/ui/toaster.tsx` | Toaster component |
| `components/ui/alert.tsx` | Alert component |
| `components/ui/avatar.tsx` | Avatar component |
| `components/ui/table.tsx` | Table component |
| `components/ui/error-boundary.tsx` | Error boundary |
| `components/ui/error-fallbacks.tsx` | Error fallback components |
| `components/ui/error-fallback-test.tsx` | Error fallback test |
| `components/ui/loading-states.tsx` | Loading state components |
| `components/ui/permission-gate.tsx` | Permission gate |
| `components/ui/role-badge.tsx` | Role badge |
| `components/ui/form-field.tsx` | Form field wrapper |
| `components/ui/floating-action-button.tsx` | Floating action button |
| `lib/utils.ts` | Utility functions (`cn()`, formatters) |
| `lib/workspace-context.tsx` | Workspace context provider |
| `lib/timezone-context.tsx` | Timezone context provider |
| `lib/currency-context.tsx` | Currency context provider |

### 4.6 Explicitly Excluded — Backend / API / Logic Files

**No session may touch any of these files or directories:**

- `app/api/**` — All API routes
- `lib/db-queries.ts` — Database queries
- `lib/supabase.ts` / `lib/supabase-browser.ts` — Supabase clients
- `lib/auth.ts` — Auth utilities
- `lib/encryption.ts` — Encryption utilities
- `lib/webhook-*.ts` — Webhook logic
- `lib/n8n-*.ts` — n8n integration
- `lib/google-sheets.ts` — Google Sheets integration
- `hooks/use-dashboard-data.ts` — Data fetching hook
- `hooks/use-campaigns.ts` — Campaign data hook
- `hooks/use-metrics.ts` — Metrics data hook
- `hooks/use-notifications.ts` — Notifications hook
- `hooks/use-billing.ts` — Billing hook
- `control-plane/**` — Control plane service
- `sidecar/**` — Sidecar service
- `supabase/**` — Database schema/migrations
- `terraform/**` — Infrastructure as code
- `scripts/**` — Utility scripts (except `scripts/verify-ui.ts` which is created by Session 1)
- `__tests__/**` — Test files
- `e2e/**` — E2E test files

---

## 5. SHARED FILES POLICY

These files may be needed by multiple sessions but have a **single designated owner**.

| Shared File | Owner | Other Sessions Protocol |
|---|---|---|
| `app/globals.css` | **Session 1** | Leave a SHARED-FILE-REQUEST comment in your own code |
| `tailwind.config.js` | **Session 1** | Leave a SHARED-FILE-REQUEST comment in your own code |
| `app/layout.tsx` | **Session 1** | Leave a SHARED-FILE-REQUEST comment in your own code |
| `lib/sidebar-context.tsx` | **Session 1** | Do not modify — use the context as-is |
| `components/ui/command-palette.tsx` | **Session 1** | Do not modify — import and use as-is |
| `lib/utils.ts` | **None (frozen)** | No session modifies this file — use `cn()` as-is |
| `lib/workspace-context.tsx` | **None (frozen)** | No session modifies — import and use as-is |

**Protocol for requesting shared file changes:**

If Session 2, 3, or 4 needs a change to `globals.css`, `tailwind.config.js`, or `app/layout.tsx`:

1. Add a comment in your own component at the exact location where you need the change:
```tsx
// SHARED-FILE-REQUEST(session-3): In globals.css, add:
//   html.light .sign-out-overlay { background: linear-gradient(to-br, #f8fafc, #e2e8f0); }
// Reason: Sign-out transition needs light mode gradient background
```
2. Document the request in your PR description under a "Shared File Requests" heading.
3. Session 1 (or the main owner in a follow-up) applies the change.

---

## 6. BRANCH REGISTRY

| Session | Branch Name | Scope | Status |
|---|---|---|---|
| **Session 1** | `ui/sidebar-navigation-panel` | Sidebar, navigation, panel flow, syncing | ⬜ NOT STARTED |
| **Session 2** | `ui/campaigns-onboarding-forms` | Campaigns, onboarding chatbot, form alignment | ⬜ NOT STARTED |
| **Session 3** | `ui/settings-auth-lightmode` | Settings pages, sign-out, sign-in, light mode | ⬜ NOT STARTED |
| **Session 4** | `ui/sandbox-icons-kpi-stats` | Sandbox, icons, KPI cards, stats layout | ⬜ NOT STARTED |

**Branch creation command (run by each session at start):**
```bash
git checkout main
git pull origin main
git checkout -b [branch-name]
```

**Branch protection:** No session force-pushes to its own branch. Only the main owner force-pushes during rebase operations before merge.

---

## 7. DESIGN SYSTEM REFERENCE

All values below are read directly from `tailwind.config.js` and `app/globals.css`. Every session must use these exact values — no arbitrary numbers, no hardcoded hex codes outside this palette.

### 7.1 Color Palette

#### Dark Mode (Default — `:root`)

| Token | CSS Variable | Hex Value | Usage |
|---|---|---|---|
| `background` | `--background` | `#0a0a0b` | Page background |
| `foreground` | `--foreground` | `#fafafa` | Default text |
| `card` / `surface` | `--card` / `--surface` | `#141416` | Card backgrounds, sidebar |
| `surface-elevated` | `--surface-elevated` | `#1c1c1f` | Elevated surfaces, hover states |
| `border` | `--border` | `#27272a` | Borders, dividers |
| `text-primary` | `--text-primary` | `#fafafa` | Primary text |
| `text-secondary` | `--text-secondary` | `#a1a1aa` | Secondary/muted text |
| `accent-primary` | `--accent-primary` | `#3b82f6` | Primary accent (blue) |
| `accent-success` | `--accent-success` | `#22c55e` | Success (green) |
| `accent-warning` | `--accent-warning` | `#f59e0b` | Warning (amber) |
| `accent-danger` | `--accent-danger` | `#ef4444` | Danger (red) |
| `accent-purple` | `--accent-purple` | `#8b5cf6` | Purple accent |
| `accent-magenta` | `--accent-magenta` | `#d946ef` | Magenta accent |

#### Light Mode (`:root.light`)

| Token | CSS Variable | Hex Value | Usage |
|---|---|---|---|
| `background` | `--background` | `#F8FAFC` | Page background |
| `foreground` | `--foreground` | `#0F172A` | Default text |
| `card` / `surface` | `--card` / `--surface` | `#FFFFFF` | Card backgrounds |
| `surface-elevated` | `--surface-elevated` | `#F1F5F9` | Elevated surfaces |
| `border` | `--border` | `#CBD5E1` | Borders |
| `text-primary` | `--text-primary` | `#0F172A` | Primary text |
| `text-secondary` | `--text-secondary` | `#475569` | Secondary text |
| `accent-primary` | `--accent-primary` | `#2563EB` | Primary accent (darker blue) |
| `accent-success` | `--accent-success` | `#16A34A` | Success |
| `accent-warning` | `--accent-warning` | `#D97706` | Warning |
| `accent-danger` | `--accent-danger` | `#DC2626` | Danger |
| `accent-purple` | `--accent-purple` | `#7C3AED` | Purple |
| `accent-magenta` | `--accent-magenta` | `#c026d3` | Magenta |

### 7.2 Typography

| Property | Value | Tailwind Class |
|---|---|---|
| Font family (body) | Inter, system-ui, sans-serif | `font-sans` |
| Font family (code) | JetBrains Mono, monospace | `font-mono` |
| Font weight regular | 400 | `font-normal` |
| Font weight medium | 500 | `font-medium` |
| Font weight semibold | 600 | `font-semibold` |
| Font weight bold | 700 | `font-bold` |

### 7.3 Spacing Scale

Use Tailwind's default spacing scale. Key values used in this project:

| Tailwind Class | Value | Common Usage |
|---|---|---|
| `gap-1` / `p-1` | 4px | Tight padding (icon spacing) |
| `gap-1.5` / `p-1.5` | 6px | Badge padding |
| `gap-2` / `p-2` | 8px | Button padding, small gaps |
| `gap-3` / `p-3` | 12px | Card inner padding, nav item gaps |
| `gap-4` / `p-4` | 16px | Standard section padding |
| `gap-6` / `p-6` | 24px | Large section padding |
| `gap-8` / `p-8` | 32px | Page-level spacing |
| `space-y-1` | 4px | Tight vertical list spacing |
| `space-y-2` | 8px | Default vertical list spacing |
| `space-y-4` | 16px | Section vertical spacing |
| `space-y-6` | 24px | Widget vertical spacing |

### 7.4 Border Radius

| Tailwind Class | Value | Usage |
|---|---|---|
| `rounded` | 4px | Small elements, badges |
| `rounded-md` | 6px | Buttons, inputs |
| `rounded-lg` | 8px | Cards, panels, nav items |
| `rounded-xl` | 12px | Large cards, modals, dropdowns |
| `rounded-full` | 9999px | Avatars, pills, dots |

### 7.5 Shadows

| Tailwind Class | Usage |
|---|---|
| `shadow-sm` | Subtle elevation (buttons) |
| `shadow-lg` | Logo, images |
| `shadow-2xl` | Dropdowns, modals, popovers |

### 7.6 Animations & Transitions

Already defined in `tailwind.config.js`:

| Animation Name | Tailwind Class | Duration | Usage |
|---|---|---|---|
| `fadeIn` | `animate-fade-in` | 500ms ease-out | Page transitions |
| `slideUp` | `animate-slide-up` | 500ms ease-out | Widget entrance |
| `slideDown` | `animate-slide-down` | 300ms ease-out | Dropdown appearance |
| `scaleIn` | `animate-scale-in` | 200ms ease-out | Modal entrance |
| `shimmer` | `animate-shimmer` | 2s infinite linear | Loading skeleton |

**Framer Motion is the primary animation library.** For component-level animations:
- Use `motion.div` with `initial`, `animate`, `exit` props
- Use `AnimatePresence` for mount/unmount animations
- Standard easing curve: `[0.32, 0.72, 0, 1]` (used throughout sidebar + navigation)
- Standard spring: `{ type: "spring", stiffness: 400, damping: 17 }` (used for button taps)

**CSS transition classes for simple hover/state changes:**
- `transition-colors` — 150ms color transitions (hover states)
- `transition-all` — 150ms all-property transitions
- `transition-opacity` — 150ms opacity (fade in/out)
- `duration-200` — Override to 200ms
- `duration-300` — Override to 300ms

### 7.7 Breakpoints

| Name | Min Width | Tailwind Prefix | Usage |
|---|---|---|---|
| `xs` | 320px | `xs:` | Small phones |
| `sm` | 640px | `sm:` | Standard phones |
| `md` | 768px | `md:` | Tablets, show sidebar |
| `lg` | 1024px | `lg:` | Desktop, full layout |
| `xl` | 1280px | `xl:` | Large desktop |
| `2xl` | 1536px | `2xl:` | Ultra-wide |

**Critical breakpoint:** `md: 768px` — This is where the sidebar shows/hides. Below `md`, mobile layout is used (bottom nav, mobile header, drawer). Above `md`, desktop layout (sidebar + top navbar).

### 7.8 Sidebar Dimensions

| State | Width | Constant |
|---|---|---|
| Expanded | 200px | `EXPANDED_WIDTH` in `lib/sidebar-context.tsx` |
| Collapsed | 48px | `COLLAPSED_WIDTH` in `lib/sidebar-context.tsx` |
| Hover trigger | Collapse → Expand on hover (100ms delay) | `mode === 'hover'` |

---
---

## 8. SESSION 1 — Sidebar, Navigation, Panel, Syncing

### Branch: `ui/sidebar-navigation-panel`

### Files This Session Owns

```
components/layout/sidebar.tsx
components/layout/top-navbar.tsx
components/layout/header.tsx
components/layout/client-shell.tsx
components/layout/layout-wrapper.tsx
components/layout/command-palette.tsx
components/ui/system-health-bar.tsx
components/ui/sync-legend.tsx
components/dashboard/dashboard-settings-panel.tsx
components/dashboard/dashboard-widget.tsx
components/dashboard/compact-controls.tsx
components/dashboard/workspace-switcher.tsx
lib/sidebar-context.tsx
app/globals.css              (SHARED — Session 1 sole owner)
tailwind.config.js           (SHARED — Session 1 sole owner)
app/layout.tsx               (SHARED — Session 1 sole owner)
```

### Files This Session Must Never Touch

Every file NOT in the list above. Specifically, all files in Sessions 2, 3, 4 ownership lists, all backend files, all hook files, all API routes, all lib logic files.

---

### TASK 1.1 — PRIORITY: HIGH — Sidebar Transition Smoothing

**STATUS: ⬜ PENDING**

**Component:** `components/layout/sidebar.tsx`
**Verification URL:** `http://localhost:3000/` (dashboard — sidebar visible on left)

**Current Behavior:**
The sidebar uses `motion.aside` with `animate={{ width: effectiveWidth }}` and a 300ms tween transition with custom easing `[0.32, 0.72, 0, 1]`. When toggling between expanded (200px) and collapsed (48px) states, the expand/collapse feels clunky because:
1. The nav item labels use `AnimatePresence` with their own 300ms transition — this creates a visual stacking/overlap during the width transition
2. The `will-change-[width]` hint on the aside causes GPU layer promotion but the child text animations are not synchronized with the parent width change
3. On hover mode, the 100ms `setTimeout` delay in `handleMouseLeave` creates a perceptible jitter when rapidly hovering in/out

**Problem:** Overview dashboard and Analytics pages feel crowded when the sidebar is expanding — the nav text labels animate independently from the sidebar width, causing visual dissonance.

**Root Cause:**
- Line ~145: `transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1], type: 'tween' }}` on the `motion.aside`
- Lines ~168-175: Each `motion.span` label has its own `initial/animate/exit` with `opacity: 0, width: 0` → `opacity: 1, width: 'auto'` at the same 300ms — these two animations fight each other
- The label width animation (`width: 'auto'`) can't be GPU-accelerated, causing layout thrashing during sidebar expansion

**Required Fix:**
1. Replace the label `width` animation with a pure `opacity` + `transform: translateX` animation. This avoids layout recalculation:
   ```tsx
   // BEFORE:
   initial={{ opacity: 0, width: 0 }}
   animate={{ opacity: 1, width: 'auto' }}
   exit={{ opacity: 0, width: 0 }}
   
   // AFTER: 
   initial={{ opacity: 0, x: -8 }}
   animate={{ opacity: 1, x: 0 }}
   exit={{ opacity: 0, x: -8 }}
   ```
2. Add `overflow-hidden` to the nav Link items when collapsed to prevent text bleed
3. Make the label transition slightly faster (200ms) than the sidebar width transition (300ms) so labels settle before the sidebar finishes expanding
4. Add `whitespace-nowrap` to all `motion.span` labels (already present — verify it stays)

**Tailwind Classes to Use:** `overflow-hidden`, `whitespace-nowrap`, `will-change-transform`
**Tailwind Classes to Avoid:** `will-change-auto` (defeats purpose), `transition-all` on the aside (use Framer Motion only)

**Dark Mode Check:** Sidebar background remains `bg-surface` (#141416). Border `border-border` (#27272a) stays visible. Active nav item shows `bg-accent-primary/10` correctly.
**Light Mode Check:** Sidebar background should render as white (#FFFFFF) per `globals.css` light mode overrides. Border should be `#CBD5E1`. Active item blue tint visible.

**Definition of Done:**
- Sidebar expands/collapses without any visible text overlap or layout jump
- Labels fade in smoothly without widening/narrowing the parent container
- Hover mode enter/exit feels responsive with no jitter
- Mobile: sidebar is hidden (class `hidden md:flex`) — no regression

**Do Not Touch:** Navigation items array (`NAV_ITEMS`), `useSidebar` hook logic, URL param preservation logic, workspace context usage, admin section conditional rendering.

**Estimated Opus Requests:** 2

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 1 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark sidebar-transitions as DONE`

---

### TASK 1.2 — PRIORITY: HIGH — Sign-Out Transition Z-Index Fix

**STATUS: ⬜ PENDING**

**Component:** `components/ui/sign-out-transition.tsx`
**Verification URL:** `http://localhost:3000/` (trigger sign-out from user menu)

**Current Behavior:**
The `SignOutTransition` component renders a fixed overlay with `z-[100]` and `fixed inset-0`. When triggered from the TopNavbar user dropdown, the sign-out overlay renders **behind** or overlaps incorrectly with the top navbar (`z-50`), creating a visual conflict where the navbar is visible through/above the overlay.

**Problem:** Sign-out transition overlay doesn't fully cover the top nav bar — the nav bar is visible during the transition animation, breaking the cinematic sign-out experience.

**Root Cause:**
- The `SignOutTransition` is rendered inside the `TopNavbar` component (line ~300+ in `top-navbar.tsx`) as `<SignOutTransition isVisible={isSigningOut} />`
- The TopNavbar header has `z-50` on its root element
- The SignOutTransition has `z-[100]` which should be above, but because it's rendered as a **child** of the navbar, its stacking context may be limited by the parent's `z-50` context
- Additionally, in `client-shell.tsx`, the TopNavbar is rendered before the main content — the SignOutTransition is buried in a component subtree

**Required Fix:**
1. In `components/layout/top-navbar.tsx`, move the `<SignOutTransition>` render to AFTER the header's closing tag, outside the `<header>` element, so it's a sibling — not a child — of the z-50 container
2. Verify the `z-[100]` on the SignOutTransition is sufficient to cover all layers (sidebar z-40, header z-50, modals z-50+)
3. Ensure the transition overlay covers the **entire viewport** including mobile header area

**Tailwind Classes to Use:** `z-[100]`, `fixed`, `inset-0`
**Tailwind Classes to Avoid:** Do not lower z-index; do not add `z-[9999]` (reserved for toasts)

**Dark Mode Check:** Overlay gradient `from-slate-950 via-slate-900 to-slate-950` renders correctly. Logo and spinner visible.
**Light Mode Check:** The sign-out transition should still use dark gradient (it's a cinematic overlay regardless of theme). Verify no light mode text-color bleed.

**Definition of Done:**
- Sign-out overlay completely covers all UI elements (header, sidebar, main content)
- No z-index bleed-through from nav or sidebar
- Smooth fade-in animation plays (Framer Motion `initial/animate`)
- Works at both mobile and desktop viewports

**Do Not Touch:** The `handleSignOut` function logic, Clerk `signOut()` call, redirect URL, spinner animation.

**Estimated Opus Requests:** 1

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 1 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark signout-z-index as DONE`

---

### TASK 1.3 — PRIORITY: MEDIUM — Panel UX Improvement (Navigation & Skipping)

**STATUS: ⬜ PENDING**

**Component:** `components/dashboard/dashboard-settings-panel.tsx`
**Verification URL:** `http://localhost:3000/` (click gear icon in compact controls → opens panel)

**Current Behavior:**
The dashboard settings panel is a slide-out panel opened by the gear icon in the compact controls bar. Currently the panel lists widget visibility toggles. The panel UX is functional but restrictive — there's no way to jump to a specific widget section or skip between settings quickly.

**Problem:** The panel flow is linear and restrictive. Users must scroll through all toggles to find what they need. No section headers or quick navigation.

**Required Fix:**
1. Read the actual `dashboard-settings-panel.tsx` file to understand current structure
2. Add section headers to group widget toggles logically (e.g., "Metrics", "Charts", "Tables")
3. Add a "Reset to Default" button at the bottom with `text-accent-danger` color and confirmation
4. Ensure the panel slide-in animation is smooth (use existing Framer Motion patterns)
5. Add keyboard navigation: `Escape` closes the panel (may already exist — verify)

**Tailwind Classes to Use:** `text-text-primary`, `text-text-secondary`, `border-border`, `bg-surface`, `bg-surface-elevated`, `rounded-lg`
**Tailwind Classes to Avoid:** None specific

**Dark Mode Check:** Panel background, text colors, toggle states all use design tokens.
**Light Mode Check:** Panel background should be white. Toggles should have visible borders. Section headers readable.

**Definition of Done:**
- Panel has grouped sections with clear headers
- Reset button exists and uses danger color
- Keyboard Escape closes panel
- Smooth slide-in/out animation
- No visual regression in dark or light mode

**Do Not Touch:** Widget toggle logic, `useDashboardLayout` hook, drag-and-drop functionality, widget rendering logic.

**Estimated Opus Requests:** 2

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 1 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark panel-ux as DONE`

---

### TASK 1.4 — PRIORITY: MEDIUM — Instant Light-to-Dark Transition

**STATUS: ⬜ PENDING**

**Component:** `app/globals.css` + `components/layout/top-navbar.tsx`
**Verification URL:** `http://localhost:3000/` (toggle theme from user menu)

**Current Behavior:**
Theme toggling in `top-navbar.tsx` works by adding/removing the `light` class on `document.documentElement`. The toggle is instant — there is **no animation** between dark and light modes. The switch is jarring, especially on large screens where large areas of color change abruptly.

**Problem:** Light-to-dark and dark-to-light transitions have no animation. The mode switch feels abrupt and unpolished.

**Root Cause:**
- `toggleTheme()` in `top-navbar.tsx` (line ~73) simply sets `classList.toggle('light')` — no transition class is added
- `globals.css` has many `!important` overrides for light mode but no `transition` property on any of the root color variables

**Required Fix:**
1. In `app/globals.css`, add a global transition rule for theme switching on the `body` element:
   ```css
   body {
     transition: background-color 200ms ease-in-out, color 200ms ease-in-out;
   }
   ```
2. Add transition to the key structural elements that change color:
   ```css
   header, aside, nav, main, .bg-surface, .bg-background, .bg-surface-elevated {
     transition: background-color 200ms ease-in-out, border-color 200ms ease-in-out;
   }
   ```
3. Keep the transition subtle (200ms) — it should be perceptible but not slow
4. Do NOT add transitions to text colors globally (causes performance issues with many elements)

**Tailwind Classes to Use:** None — this is a `globals.css` change
**Tailwind Classes to Avoid:** `transition-all` on root elements (too broad)

**Dark Mode Check:** After transition, all dark mode colors display correctly. No flash of white.
**Light Mode Check:** After transition, all light mode colors display correctly. No flash of dark.

**Definition of Done:**
- Toggling between dark and light mode shows a smooth 200ms background color transition
- No jarring flash when switching
- Text remains readable during transition (no temporary invisible text)
- Performance: no visible jank or frame drops during transition

**Do Not Touch:** Theme toggle logic, localStorage persistence, theme state management.

**Estimated Opus Requests:** 1

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 1 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark theme-transition as DONE`

---

### TASK 1.5 — PRIORITY: MEDIUM — Hover Inconsistency (Bell, Search, UserPlus Icons)

**STATUS: ⬜ PENDING**

**Component:** `components/layout/top-navbar.tsx`
**Verification URL:** `http://localhost:3000/` (hover over top-right icons)

**Current Behavior:**
The top navbar has three icon buttons on the right side: Search, UserPlus (Share/Invite), and Bell (Notifications). Their hover behavior is inconsistent:
- Search icon: `text-text-secondary hover:text-text-primary` — changes to primary text on hover ✓
- UserPlus icon: `text-text-secondary hover:text-accent-primary` — changes to blue on hover (inconsistent!)
- Bell icon: `text-text-secondary` — NO hover color change at all ✗

**Problem:** The three action icons in the top navbar should all have the same hover behavior. Currently they're all different.

**Root Cause:**
- Search (line ~127): `<Search className="h-5 w-5 text-text-secondary hover:text-text-primary transition-colors" />`
- UserPlus (line ~136): `<UserPlus className="h-5 w-5 text-text-secondary hover:text-accent-primary transition-colors" />`
- Bell (line ~148): `<Bell className="h-5 w-5 text-text-secondary" />` — missing hover class entirely

**Required Fix:**
1. Standardize all three icons to use `text-text-secondary hover:text-text-primary transition-colors`
2. This means:
   - Search: keep as-is (`hover:text-text-primary`) ✓
   - UserPlus: change `hover:text-accent-primary` → `hover:text-text-primary`
   - Bell: add `hover:text-text-primary transition-colors`
3. The hover should turn icons **white** (text-primary = #fafafa in dark mode, #0F172A in light mode) — not blue

**Tailwind Classes to Use:** `text-text-secondary`, `hover:text-text-primary`, `transition-colors`
**Tailwind Classes to Avoid:** `hover:text-accent-primary` (too visually aggressive for nav icons), `hover:text-white` (hardcoded — doesn't adapt to light mode)

**Dark Mode Check:** Icons are `#a1a1aa` at rest, `#fafafa` on hover.
**Light Mode Check:** Icons are `#475569` at rest, `#0F172A` on hover.

**Definition of Done:**
- All three top-right icons (Search, UserPlus, Bell) have identical hover behavior
- Hover transitions smoothly (150ms from `transition-colors`)
- Icons are visible in both dark and light mode at rest and on hover

**Do Not Touch:** Button onClick handlers, notification dropdown logic, command palette trigger, share dialog trigger.

**Estimated Opus Requests:** 1

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 1 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark hover-consistency as DONE`

---

### TASK 1.6 — PRIORITY: MEDIUM — Container Highlight Fill Box (Sidebar Light Mode)

**STATUS: ⬜ PENDING**

**Component:** `components/layout/sidebar.tsx` + `app/globals.css`
**Verification URL:** `http://localhost:3000/` (switch to light mode, look at sidebar)

**Current Behavior:**
In dark mode, the active nav item correctly shows `bg-accent-primary/10` (subtle blue tint). In light mode, the sidebar active item highlighting is barely visible because `bg-accent-primary/10` on a white background has very low contrast — the blue-500 at 10% opacity on white is nearly invisible.

**Problem:** In light mode, the active sidebar item's background highlight is too faint — users can't easily see which page they're on.

**Root Cause:**
- Line ~165 in `sidebar.tsx`: `isActive ? 'bg-accent-primary/10 text-accent-primary' : ...`
- In dark mode: `bg-accent-primary/10` = `rgba(59, 130, 246, 0.1)` on `#141416` = visible blue tint
- In light mode: `bg-accent-primary/10` = `rgba(37, 99, 235, 0.1)` on `#FFFFFF` = nearly invisible

**Required Fix:**
1. In `app/globals.css`, add light mode override for the sidebar active state. Add a rule:
   ```css
   html.light aside [class*="bg-accent-primary/10"] {
     background-color: rgba(37, 99, 235, 0.15) !important;
   }
   ```
   OR, better approach — change the class in `sidebar.tsx`:
   ```tsx
   isActive ? 'bg-accent-primary/10 dark:bg-accent-primary/10 light:bg-accent-primary/15 text-accent-primary' : ...
   ```
   Since Tailwind doesn't have a `light:` variant natively, use the `globals.css` approach.
2. Alternatively, add a dedicated CSS class `sidebar-active-bg` and apply it, with separate dark/light definitions in `globals.css`

**Tailwind Classes to Use:** `bg-accent-primary/10` (dark mode), `bg-accent-primary/15` (light mode — via globals.css override)
**Tailwind Classes to Avoid:** Hardcoded hex backgrounds, `!important` in component classes

**Dark Mode Check:** Active item shows subtle blue tint on dark surface. Unchanged from current.
**Light Mode Check:** Active item shows clearly visible blue tint on white surface. Not too aggressive — subtle but discernible.

**Definition of Done:**
- In light mode, the active sidebar nav item has a clearly visible blue highlight background
- In dark mode, the active sidebar nav item highlight is unchanged
- The contrast ratio between active and inactive items is perceptible at a glance

**Do Not Touch:** Nav item click behavior, URL param logic, sidebar mode selector.

**Estimated Opus Requests:** 1

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 1 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark sidebar-light-highlight as DONE`

---

### TASK 1.7 — PRIORITY: LOW — Remove Grey Container Over Syncing Indicator

**STATUS: ⬜ PENDING**

**Component:** `components/ui/system-health-bar.tsx`
**Verification URL:** `http://localhost:3000/` (look at bottom of sidebar)

**Current Behavior:**
The `SystemHealthBar` renders at the bottom of the sidebar (in `sidebar.tsx` footer section). It displays the sync status (Live/Syncing/Stale/Error) with an icon and optional label. In compact mode (`compact={!isExpanded}`), it shows only the icon. The component is wrapped in its own container but the parent `div` in `sidebar.tsx` gives it a `border-t border-border` wrapper that creates a grey container visual.

**Problem:** There's a grey container/background wrapping the syncing indicator that should be removed for a cleaner look.

**Root Cause:**
- In `sidebar.tsx` lines ~250-253: The footer section has `className="border-t border-border px-2 py-3 space-y-2 flex-shrink-0"` — this creates a bordered container
- The `SystemHealthBar` itself has `className="flex items-center"` with no background of its own

**Required Fix:**
1. Remove the `border-t border-border` from the footer container in `sidebar.tsx` to eliminate the grey container visual
2. Keep `px-2 py-3 flex-shrink-0` for spacing
3. Alternatively, if the border is needed for visual separation, make it more subtle: `border-t border-border/50`

**Tailwind Classes to Use:** `px-2`, `py-3`, `flex-shrink-0`
**Tailwind Classes to Avoid:** `bg-surface-elevated` on the footer (would add incorrect background)

**Dark Mode Check:** Footer area blends with sidebar — no harsh divider line.
**Light Mode Check:** Footer area blends with white sidebar — clean separation or very subtle line.

**Definition of Done:**
- Syncing indicator at sidebar bottom has no grey container or harsh border above it
- Clean integration with sidebar body
- Status icon and label still visible and correctly styled

**Do Not Touch:** `SystemHealthBar` logic, health status detection, `useRealtimeHealth` hook usage.

**Estimated Opus Requests:** 1

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 1 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark syncing-container as DONE`

---

### TASK 1.8 — PRIORITY: LOW — Resize Collapsed-to-Expand Icon + White Syncing Text

**STATUS: ⬜ PENDING**

**Component:** `components/ui/system-health-bar.tsx` + `components/layout/sidebar.tsx`
**Verification URL:** `http://localhost:3000/` (look at sidebar footer, toggle modes)

**Current Behavior:**
When the sidebar is collapsed, the `SystemHealthBar` shows in compact mode — only an icon (`Activity`, `RefreshCw`, or `WifiOff`) at `h-5 w-5`. When expanded, it shows the icon at `h-4 w-4` plus a text label. The collapsed icon feels slightly large relative to the 48px collapsed sidebar width.

Additionally, when the sidebar is expanded and the status is "Syncing", the label text uses `text-xs font-medium` but doesn't explicitly set the text color — it inherits from the parent, which may not be white in all states.

**Problem:** The collapsed icon is oversized for the narrow sidebar. The "Syncing" text should always be white (in dark mode) for readability.

**Required Fix:**
1. In `system-health-bar.tsx`, reduce collapsed icon size from `h-5 w-5` to `h-4 w-4` to match other collapsed sidebar icons
2. Add explicit text color to the label span:
   ```tsx
   <span className="text-xs font-medium text-text-primary">{config.label}</span>
   ```
   (Currently has no explicit color class — line ~93)

**Tailwind Classes to Use:** `h-4 w-4` (compact icon), `text-text-primary` (label text)
**Tailwind Classes to Avoid:** `text-white` (hardcoded — doesn't adapt to light mode)

**Dark Mode Check:** Icon is `h-4 w-4` in compact mode. Label text is `#fafafa`.
**Light Mode Check:** Icon is `h-4 w-4` in compact mode. Label text is `#0F172A`.

**Definition of Done:**
- Collapsed sidebar health icon matches size of other collapsed nav icons (`h-4 w-4`)
- Expanded sidebar "Syncing" / "Live" text is always the correct primary text color
- Visual consistency with other sidebar elements

**Do Not Touch:** Health status logic, icon color logic (green/red based on status), error message display.

**Estimated Opus Requests:** 1

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 1 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark syncing-icon-text as DONE`

---

### SESSION 1 COPILOT LAUNCH PROMPT

```
Begin session 1.

Read docs/plan/UI_MASTER.md in full. You are Session 1 — Sidebar, Navigation, Panel, Syncing.

Your branch: ui/sidebar-navigation-panel
Your owned files: listed in Section 4.1 and Section 8.
Your forbidden files: everything not in Section 4.1.

Execute the full lifecycle from Section 2.1:
1. Pull latest from main, create branch ui/sidebar-navigation-panel
2. Read this document fully
3. Execute tasks 1.1 through 1.8 in priority order (HIGH → MEDIUM → LOW)
4. Apply RALPH loop on every task
5. One commit per task
6. Run Verifier Agent after all tasks
7. Update STATUS markers in UI_MASTER.md as each task passes
8. Raise PR when all tasks pass

You own globals.css and tailwind.config.js. Process any SHARED-FILE-REQUEST
comments from other sessions if they exist in their PRs.

Do not ask questions. Read the document. Execute.
```

---
---

## 9. SESSION 2 — Campaigns, Onboarding, Forms

### Branch: `ui/campaigns-onboarding-forms`

### Files This Session Owns

```
components/campaigns/campaign-wizard.tsx
components/campaigns/new-campaign-modal.tsx
components/campaigns/csv-import-dialog.tsx
components/campaigns/template-gallery.tsx
components/campaigns/provisioning-progress.tsx
components/onboarding/onboarding-tour.tsx
components/genesis/genesis-onboarding-client.tsx
components/genesis/genesis-onboarding-wizard.tsx
components/genesis/stages/*.tsx  (all 14 stage files)
components/dashboard/campaign-table.tsx
components/dashboard/campaign-card-stack.tsx
components/dashboard/campaign-management-table.tsx
components/dashboard/campaign-management-card-stack.tsx
components/dashboard/campaign-toggle.tsx
components/dashboard/campaign-pulse.tsx
components/ui/editable-text.tsx
components/ui/bulk-action-toolbar.tsx
components/ui/context-menu.tsx
app/onboarding/page.tsx
app/contacts/page.tsx
```

### Files This Session Must Never Touch

All files in Sessions 1, 3, 4 ownership lists. All backend files, API routes, hooks, and lib logic files. Specifically: `app/globals.css`, `tailwind.config.js`, `app/layout.tsx`, all `components/layout/*`, all `components/settings/*`, all `components/sandbox/*`, all `components/dashboard/metric-card.tsx`, all chart components.

---

### TASK 2.1 — PRIORITY: HIGH — Campaign/Chatbot Content Cutoff Fix

**STATUS: ⬜ PENDING**

**Component:** `components/campaigns/campaign-wizard.tsx` + `components/campaigns/new-campaign-modal.tsx`
**Verification URL:** `http://localhost:3000/` (open "Create New Campaign" modal from dashboard)

**Current Behavior:**
The `NewCampaignModal` renders a modal with `max-h-[90vh] overflow-y-auto` containing the `CampaignWizard`. The wizard has three steps: Template Selection → Details → Provisioning. At the Template step, `TemplateGallery` renders template cards. Content within the modal gets randomly cut off — template descriptions and the step indicator can be clipped at the bottom of the modal.

**Problem:** Campaign creation modal content is being clipped/cut off. Template gallery and wizard steps are not fully visible in the scrollable area.

**Root Cause:**
- In `new-campaign-modal.tsx`: The modal has `max-h-[90vh] overflow-y-auto` on the outer container, but the inner structure has:
  - Header: `p-6 border-b` (fixed)
  - Content: `p-6` containing the wizard
  - The wizard's `min-h-[300px]` on the step content area can push content beyond the visible `90vh`
- The step indicator at the top of the wizard (`flex items-center justify-center gap-2`) is inside the scrollable area, so users must scroll past it when the template gallery is long

**Required Fix:**
1. In `new-campaign-modal.tsx`, restructure the modal layout:
   - Keep header (title + close) as sticky/non-scrollable
   - Make only the wizard content area scrollable
   - Change `<div className="p-6">` wrapping the wizard to `<div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">` where 80px accounts for the header height
2. In `campaign-wizard.tsx`:
   - Ensure the step indicator stays visible (not scrolled away)
   - Remove `min-h-[300px]` on the step content div — let it size naturally
3. Verify the "Next" / "Create" buttons at the bottom are always visible (not pushed below fold)

**Tailwind Classes to Use:** `overflow-y-auto`, `max-h-[calc(90vh-80px)]`, `sticky`, `top-0`, `z-10`
**Tailwind Classes to Avoid:** `overflow-hidden` on the modal (causes clipping)

**Dark Mode Check:** Modal background `bg-surface-elevated` renders correctly. Border `border-border` visible. Step indicator colors correct.
**Light Mode Check:** Modal background is white. Step indicator text readable. Template cards visible.

**Definition of Done:**
- Campaign creation modal shows all content without clipping at any step
- Scrolling works smoothly to reveal all template options
- Step indicator (1-2-3) is always visible
- Action buttons at bottom are always accessible
- Modal closes with Escape key (existing behavior — verify not broken)

**Do Not Touch:** API call to `/api/campaigns/provision`, template fetching logic, provisioning progress component, workspace context usage.

**Estimated Opus Requests:** 2

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 2 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark campaign-cutoff as DONE`

---

### TASK 2.2 — PRIORITY: HIGH — Onboarding Chatbot as Floating Bubble

**STATUS: ⬜ PENDING**

**Component:** `components/genesis/genesis-onboarding-wizard.tsx`
**Verification URL:** `http://localhost:3000/onboarding` (onboarding page)

**Current Behavior:**
The Genesis Onboarding Wizard is a full-page multi-stage wizard with a vertical step indicator on the left and content on the right. It covers the entire viewport. The user requested repositioning/redesigning it as a floating bubble interface — a collapsed state that shows as a small circular button, expanding on click to a floating panel.

**Problem:** The onboarding chatbot is full-page and imposing. It should be a floating bubble that the user can interact with optionally, without blocking the entire viewport.

**Root Cause:**
- `genesis-onboarding-wizard.tsx` renders the entire wizard as a full-page component
- The parent `app/onboarding/page.tsx` wraps this in a full-height page layout
- There is no collapsed/bubble state — the wizard is either fully visible or not rendered at all

**Required Fix:**
1. Add a `mode` state to the wizard: `'bubble' | 'expanded'`
2. In bubble mode, render a floating circular button in the bottom-right corner:
   ```tsx
   <motion.button
     className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-accent-primary shadow-2xl flex items-center justify-center"
     whileHover={{ scale: 1.05 }}
     whileTap={{ scale: 0.95 }}
     onClick={() => setMode('expanded')}
   >
     <Rocket className="h-6 w-6 text-white" />
   </motion.button>
   ```
3. In expanded mode, render the wizard as a floating panel (not full-page):
   ```tsx
   <motion.div
     className="fixed bottom-24 right-6 z-50 w-[420px] max-h-[70vh] rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden"
     initial={{ opacity: 0, y: 20, scale: 0.95 }}
     animate={{ opacity: 1, y: 0, scale: 1 }}
     exit={{ opacity: 0, y: 20, scale: 0.95 }}
   >
   ```
4. Add a minimize button (X or chevron-down) in the expanded panel to return to bubble mode
5. Store the mode in localStorage so it persists across page navigations
6. The vertical step indicator should be simplified in floating mode — show as a horizontal progress bar instead

**Tailwind Classes to Use:** `fixed`, `bottom-6`, `right-6`, `z-50`, `rounded-full`, `rounded-2xl`, `shadow-2xl`, `bg-accent-primary`, `bg-surface`, `border-border`, `overflow-hidden`, `overflow-y-auto`
**Tailwind Classes to Avoid:** `inset-0` (that's full-page), `w-screen`, `h-screen`

**Dark Mode Check:** Bubble button has `bg-accent-primary` (blue). Expanded panel has `bg-surface` dark background. Step progress visible.
**Light Mode Check:** Bubble button remains blue. Expanded panel has white background. Text readable.

**Definition of Done:**
- Onboarding wizard renders as a floating bubble (circle) in the bottom-right by default
- Clicking the bubble expands to a floating panel (not full-page)
- Clicking minimize collapses back to bubble
- All 13 stages still work within the floating panel
- Progress persists via localStorage
- Responsive: on mobile (< md), the panel should be full-width with some margin

**Do Not Touch:** Stage component logic (all `*-stage.tsx` files internals), API calls inside stages, credential vault logic, onComplete callback, router navigation.

**Estimated Opus Requests:** 3

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 2 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark onboarding-bubble as DONE`

---

### TASK 2.3 — PRIORITY: MEDIUM — Create New Campaign — Ending Box Alignment

**STATUS: ⬜ PENDING**

**Component:** `components/campaigns/campaign-wizard.tsx`
**Verification URL:** `http://localhost:3000/` (open campaign modal → go to step 2 "Details")

**Current Behavior:**
In the campaign wizard's second step ("Details"), the form fields (Campaign Name input, Description textarea, selected template preview box) are stacked vertically with `space-y-4`. The action buttons (Back, Create Campaign) are at the bottom. The ending box (action buttons area) is left-aligned by default.

**Problem:** The action buttons and bottom area of the campaign wizard step 2 are not right-aligned with the main content boundary, creating visual misalignment.

**Root Cause:**
- In `campaign-wizard.tsx` lines ~200-240: The bottom action area uses `<div className="flex items-center justify-between pt-4 border-t border-border">` which is inside the `space-y-6` parent
- The "Create Campaign" button is in the `justify-between` flex — but the right side button alignment depends on the parent container width
- The issue is that the bottom action bar doesn't extend to the full width of the modal content area

**Required Fix:**
1. Ensure the bottom action bar spans the full width of the wizard content area
2. Use `flex justify-end gap-3` for the buttons to right-align them
3. Keep the Back button on the left using `mr-auto` or separate flex groups:
   ```tsx
   <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
     <Button variant="ghost" onClick={handleBack}>
       <ChevronLeft className="h-4 w-4 mr-1" />
       Back
     </Button>
     <Button onClick={handleCreate} disabled={!campaignName.trim() || isCreating}>
       {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
       Create Campaign
     </Button>
   </div>
   ```

**Tailwind Classes to Use:** `flex`, `items-center`, `justify-between`, `pt-4`, `border-t`, `border-border`, `mt-4`, `gap-3`
**Tailwind Classes to Avoid:** `float-right` (non-flexbox), `text-right` (wrong approach for buttons)

**Dark Mode Check:** Border `border-border` visible. Button colors correct.
**Light Mode Check:** Border visible on white background. Button text readable.

**Definition of Done:**
- Action buttons at the bottom of wizard step 2 are properly aligned
- Back button on left, Create button on right
- Border separator visible above buttons
- Full-width alignment matches the form fields above

**Do Not Touch:** `handleCreate` API logic, validation logic, error state handling, provisioning step.

**Estimated Opus Requests:** 1

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 2 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark campaign-alignment as DONE`

---

### TASK 2.4 — PRIORITY: MEDIUM — Remove Container on Campaign Name (Editable Text)

**STATUS: ⬜ PENDING**

**Component:** `components/dashboard/campaign-management-table.tsx`
**Verification URL:** `http://localhost:3000/` (scroll to Campaign Management table, look at campaign names)

**Current Behavior:**
Campaign names in the management table use `EditableText` component for inline renaming. The `EditableText` likely renders with a visible container/border around the campaign name even when NOT in edit mode, creating a visual "box" around each name.

**Problem:** Campaign names in the table have a visible container/border that should be removed for a cleaner, inline-text appearance.

**Root Cause:**
- The `EditableText` component (session 2 owns `components/ui/editable-text.tsx`) likely has a default border or background in its non-editing state
- Need to read `editable-text.tsx` to confirm the exact classes causing the container

**Required Fix:**
1. Read `components/ui/editable-text.tsx` to identify the container styling
2. In the non-editing state, the text should render as plain text with no visible border or background
3. On hover, show a subtle `border-border/50` or `underline` to indicate editability
4. In editing state, show the input with proper border and focus ring

**Tailwind Classes to Use:** `border-transparent` (non-edit), `hover:border-border/50` (hover hint), `border-border` (editing), `focus:ring-accent-primary`
**Tailwind Classes to Avoid:** `border-border` in non-edit state (causes the visible container)

**Dark Mode Check:** Campaign name text is `text-text-primary`. No visible box around it.
**Light Mode Check:** Campaign name text is dark. No visible box. Hover shows subtle indicator.

**Definition of Done:**
- Campaign names in the management table appear as plain text (no box)
- Hover reveals that the name is editable (subtle underline or border hint)
- Click enters edit mode with a proper input field
- Save/cancel works as before

**Do Not Touch:** Rename API logic, campaign data fetching, context menu functionality, bulk actions.

**Estimated Opus Requests:** 1

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 2 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark campaign-name-container as DONE`

---

### TASK 2.5 — PRIORITY: LOW — Right-Click Functionality Enhancement

**STATUS: ⬜ PENDING**

**Component:** `components/dashboard/campaign-management-table.tsx`
**Verification URL:** `http://localhost:3000/` (right-click on a campaign row)

**Current Behavior:**
Campaign rows have a `ContextMenu` from Radix UI with options like Rename, Pause/Resume, Delete, and View Stats. The context menu works but has limited options.

**Problem:** Need more useful right-click functionality that is not redundant with existing UI elements.

**Root Cause:**
- The context menu in `campaign-management-table.tsx` has basic operations
- Missing: Copy campaign ID, Duplicate campaign, Export data, Open in new tab

**Required Fix:**
1. Read the existing `ContextMenu` implementation in the campaign management table
2. Add these non-redundant context menu items:
   - **Copy Campaign ID** — copies the campaign UUID to clipboard
   - **Duplicate** — disabled state with "Coming Soon" label
   - **View Statistics** — scrolls to the campaign stats section or navigates to analytics page
3. Add proper icons from `lucide-react` for each new menu item
4. Add keyboard shortcuts display where applicable (e.g., `Ctrl+C` for copy)
5. Add `ContextMenuSeparator` between action groups

**Tailwind Classes to Use:** Use existing context menu styles — they come from Radix UI + the project's `components/ui/context-menu.tsx`
**Tailwind Classes to Avoid:** Custom styling that overrides Radix defaults

**Dark Mode Check:** Context menu renders on dark surface. Text readable. Icons visible.
**Light Mode Check:** Context menu renders on white surface. Borders visible.

**Definition of Done:**
- Right-click on campaign row shows enhanced context menu
- "Copy Campaign ID" works and shows a brief toast confirmation
- New items are logically grouped with separators
- No redundancy with existing toggle/rename actions

**Do Not Touch:** Existing context menu items (Rename, Pause/Resume, Delete), toggle logic, delete confirmation logic.

**Estimated Opus Requests:** 2

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 2 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark context-menu-enhance as DONE`

---

### TASK 2.6 — PRIORITY: LOW — Sequences Pagination Selection

**STATUS: ⬜ PENDING**

**Component:** `components/sequences/sequence-list.tsx` (+ parent `app/sequences/page.tsx`)
**Verification URL:** `http://localhost:3000/sequences`

**Current Behavior:**
The sequences page (`app/sequences/page.tsx`) uses a `LIMIT_OPTIONS` array `[50, 100, 500, 1000, 'all']` and renders limit selection buttons. The `SequenceList` component renders items but has no built-in pagination UI — it relies on the parent to control the limit.

**Problem:** Pagination controls and limit selection could be more prominent and user-friendly.

**Required Fix:**
1. Read the current limit/pagination UI in `app/sequences/page.tsx`
2. Style the active limit button to clearly show which option is selected (use `bg-accent-primary text-white` for active)
3. Add proper spacing and visual treatment to the limit selector
4. Ensure the limit selector is accessible (keyboard navigation, aria labels)

**Tailwind Classes to Use:** `bg-accent-primary`, `text-white`, `rounded-md`, `px-3`, `py-1`, `text-sm`, `font-medium`
**Tailwind Classes to Avoid:** None specific

**Dark Mode Check:** Active limit button shows blue. Inactive buttons are subtle.
**Light Mode Check:** Same — active shows darker blue, inactive shows light gray.

**Definition of Done:**
- Pagination/limit controls are visually clear
- Active selection is highlighted
- Keyboard accessible
- Works at mobile width

**Do Not Touch:** SWR data fetching, sequence detail loading, date range logic.

**Estimated Opus Requests:** 1

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 2 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark sequences-pagination as DONE`

---

### SESSION 2 COPILOT LAUNCH PROMPT

```
Begin session 2.

Read docs/plan/UI_MASTER.md in full. You are Session 2 — Campaigns, Onboarding, Forms.

Your branch: ui/campaigns-onboarding-forms
Your owned files: listed in Section 4.2 and Section 9.
Your forbidden files: everything not in Section 4.2. Especially: globals.css, 
tailwind.config.js, app/layout.tsx, all components/layout/*, all components/settings/*, 
all components/sandbox/*, all chart/metric components.

Execute the full lifecycle from Section 2.1:
1. Pull latest from main, create branch ui/campaigns-onboarding-forms
2. Read this document fully
3. Execute tasks 2.1 through 2.6 in priority order (HIGH → MEDIUM → LOW)
4. Apply RALPH loop on every task
5. One commit per task
6. Run Verifier Agent after all tasks
7. Update STATUS markers in UI_MASTER.md as each task passes
8. Raise PR when all tasks pass

If you need changes to globals.css or tailwind.config.js, leave a 
SHARED-FILE-REQUEST comment in your code and flag in PR description.

Do not ask questions. Read the document. Execute.
```

---
---

## 10. SESSION 3 — Settings, Sign-out, Sign-in, Light Mode

### Branch: `ui/settings-auth-lightmode`

### Files This Session Owns

```
components/settings/general-settings-tab.tsx
components/settings/security-settings-tab.tsx
components/settings/workspace-members-table.tsx
components/settings/role-selector.tsx
components/settings/config-vault-tab.tsx
components/settings/two-factor-modal.tsx
components/settings/active-sessions-modal.tsx
components/settings/backup-codes-display.tsx
components/ui/sign-out-transition.tsx
components/providers/clerk-theme-provider.tsx
components/providers/user-sync-provider.tsx
app/settings/page.tsx
app/sign-in/[[...sign-in]]/page.tsx
app/sign-up/[[...sign-up]]/page.tsx
```

### Files This Session Must Never Touch

All files in Sessions 1, 2, 4 ownership lists. All backend files, API routes, hooks, lib logic. Specifically: `app/globals.css`, `tailwind.config.js`, `app/layout.tsx`, all `components/layout/*`, all `components/campaigns/*`, all `components/sandbox/*`, all chart/metric components.

**NOTE:** `components/ui/sign-out-transition.tsx` is owned by Session 3 for the sign-out visual design, but Session 1 owns `top-navbar.tsx` where the `<SignOutTransition>` is rendered. If Session 3 needs changes to where the component is rendered (DOM position), it must leave a SHARED-FILE-REQUEST for Session 1. Session 3 can only modify the component file itself (`sign-out-transition.tsx`).

---

### TASK 3.1 — PRIORITY: HIGH — Settings General Page Full UI Design Pass

**STATUS: ⬜ PENDING**

**Component:** `components/settings/general-settings-tab.tsx`
**Verification URL:** `http://localhost:3000/settings` (click "General" tab)

**Current Behavior:**
The general settings tab uses a two-column layout (45%/55%) with a vertical divider. Left column has Workspace Name and Slug inputs. Right column has Timezone selector, Date Format popover, and Currency popover. The bottom has a Save button. The layout uses inline styles (`style={{ width: '45%' }}`) and hardcoded colors (`rgba(255, 255, 255, 0.08)` for the divider).

**Problem:** The general settings page needs a full UI design pass — the layout uses inline styles instead of Tailwind, the divider uses a hardcoded color, and the overall polish doesn't match the dashboard's design language.

**Root Cause:**
- Line ~106: `style={{ width: '45%' }}` — inline style instead of Tailwind
- Line ~122: Divider uses `style={{ width: '1px', height: '80%', backgroundColor: 'rgba(255, 255, 255, 0.08)' }}` — hardcoded color, inline style
- Line ~131: `style={{ width: '55%' }}` — inline style
- Popover content uses mixed Tailwind dark classes (`dark:border-slate-700 dark:bg-[#141416]`) alongside light-mode classes, not using CSS variables

**Required Fix:**
1. Replace all inline `style={{ width }}` with Tailwind grid or flex classes:
   ```tsx
   // Replace the two-column flex layout with CSS grid
   <div className="grid grid-cols-1 md:grid-cols-[5fr_1px_6fr] gap-6">
   ```
2. Replace the inline-style divider with Tailwind:
   ```tsx
   <div className="hidden md:block w-px bg-border self-stretch" />
   ```
3. Replace hardcoded Popover colors with CSS variable classes:
   - `dark:bg-[#141416]` → `bg-[var(--surface)]` or `bg-surface`
   - `dark:border-slate-700` → `border-border`
   - `border-slate-200` → `border-border`
4. Ensure the Save button section has no grey container (current `flex items-center justify-end gap-4` is fine but verify)
5. Add consistent card padding and radius matching other settings tabs

**Tailwind Classes to Use:** `grid`, `grid-cols-1`, `md:grid-cols-[5fr_1px_6fr]`, `gap-6`, `w-px`, `bg-border`, `self-stretch`, `bg-surface`, `border-border`, `rounded-lg`, `p-6`
**Tailwind Classes to Avoid:** All inline `style={{}}` — replace with Tailwind equivalents

**Dark Mode Check:** Card has `bg-surface` (#141416). Divider uses `bg-border` (#27272a). Inputs and popovers match design system.
**Light Mode Check:** Card has white background. Divider is `#CBD5E1`. Inputs have visible borders. Popovers have light styling.

**Definition of Done:**
- No inline `style={{}}` attributes in the component
- Two-column layout uses Tailwind grid
- Divider uses Tailwind classes (no hardcoded rgba)
- Popover dropdowns use CSS variable classes (not hardcoded hex)
- Mobile: single column layout (grid-cols-1)
- Save button area has no unnecessary container/background
- Visual quality matches the rest of the dashboard

**Do Not Touch:** `handleSave` logic, `useWorkspaceSettings` hook, `usePermission` check, timezone selector logic, form validation, rename workspace API call.

**Estimated Opus Requests:** 2

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 3 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark settings-general-design as DONE`

---

### TASK 3.2 — PRIORITY: HIGH — Sign-In Page Light Mode

**STATUS: ⬜ PENDING**

**Component:** `app/sign-in/[[...sign-in]]/page.tsx`
**Verification URL:** `http://localhost:3000/sign-in`

**Current Behavior:**
The sign-in page is hardcoded to dark mode styling: `bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950` background, `text-white` text, `border-slate-800` borders. Regardless of the user's theme preference, the sign-in page always renders in dark mode. When a user signs out and lands on the sign-in page, it should respect the theme (or always show light mode as specified).

**Problem:** Sign-in page should always render in light mode on sign-out, but currently it's hardcoded dark.

**Root Cause:**
- Line 7: `<div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">` — hardcoded dark gradient
- All text uses `text-white`, `text-slate-400`, `text-slate-300` — hardcoded dark theme text
- The Clerk `<SignIn>` component uses `appearance={{ elements: {...} }}` with dark-themed classes
- The page does not read or set the theme — it's always dark

**Required Fix:**
1. Replace hardcoded dark gradient with theme-aware classes:
   ```tsx
   <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
   ```
2. Replace all hardcoded text colors with theme-aware variants:
   - `text-white` → `text-slate-900 dark:text-white`
   - `text-slate-400` → `text-slate-500 dark:text-slate-400`
   - `text-slate-300` → `text-slate-600 dark:text-slate-300`
   - `border-slate-800` → `border-slate-200 dark:border-slate-800`
3. Update the Clerk `<SignIn>` appearance elements to use CSS variable-based classes instead of hardcoded dark classes
4. Add a script/effect at the top of the page that forces light mode on load:
   ```tsx
   // In a client wrapper or useEffect:
   useEffect(() => {
     document.documentElement.classList.remove('dark');
     document.documentElement.classList.add('light');
   }, []);
   ```
   **NOTE:** This is a server component currently. If theme forcing is needed, wrap in a client component or handle in `clerk-theme-provider.tsx` (Session 3 owns `clerk-theme-provider.tsx`)

**Tailwind Classes to Use:** `from-slate-50`, `via-white`, `to-slate-100`, `dark:from-slate-950`, `dark:via-slate-900`, `dark:to-slate-950`, `text-slate-900`, `dark:text-white`, `border-slate-200`, `dark:border-slate-800`
**Tailwind Classes to Avoid:** Hardcoded dark-only classes (`text-white`, `from-slate-950` without `dark:` prefix)

**Dark Mode Check:** If user has dark mode preference, sign-in should still look good with dark gradient.
**Light Mode Check:** Sign-in renders with light gradient, dark text, visible borders, professional appearance.

**Definition of Done:**
- Sign-in page renders correctly in light mode (default post-sign-out)
- All text is readable against light background
- Clerk SignIn component renders with correct theme
- If dark mode is active, page still looks correct with dark styling
- Mobile layout unchanged — logo centered, form full-width

**Do Not Touch:** Clerk `<SignIn>` component props (routing, path, signUpUrl), feature list content, logo path/image.

**Estimated Opus Requests:** 2

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 3 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark signin-lightmode as DONE`

---

### TASK 3.3 — PRIORITY: MEDIUM — General Settings UI Under Workspace Settings

**STATUS: ⬜ PENDING**

**Component:** `app/settings/page.tsx`  
**Verification URL:** `http://localhost:3000/settings`

**Current Behavior:**
The settings page has a header with "Workspace Settings" title, a mobile tab picker (bottom sheet), and desktop horizontal tabs for General, Members, Security. The desktop tabs use `cn()` classes for styling. The tab bar is functional but the overall page header could use polish — the header and tab bar don't have strong visual separation.

**Problem:** The workspace settings page header area needs design refinement — clearer separation between header, tabs, and content.

**Root Cause:**
- The header uses basic `text-xl md:text-3xl font-bold` with `text-muted-foreground` subtitle
- Desktop tabs are plain buttons in a row with active state styling
- There's no visual card or elevation for the header area

**Required Fix:**
1. Add a subtle background or card treatment to the header area:
   ```tsx
   <div className="bg-surface rounded-lg border border-border p-6 mb-6">
     <h1 className="text-xl md:text-2xl font-bold text-text-primary">Workspace Settings</h1>
     <p className="text-sm text-text-secondary mt-1">Manage {workspace.name} configuration</p>
   </div>
   ```
2. Style the desktop tabs to look more like a proper tab bar:
   - Active tab: `bg-surface text-text-primary border-b-2 border-accent-primary`
   - Inactive tab: `text-text-secondary hover:text-text-primary`
3. Add a subtle divider between the tab bar and the content area
4. Ensure consistent padding with the rest of the app

**Tailwind Classes to Use:** `bg-surface`, `rounded-lg`, `border`, `border-border`, `border-b-2`, `border-accent-primary`, `text-text-primary`, `text-text-secondary`
**Tailwind Classes to Avoid:** `text-muted-foreground` (not in design system — use `text-text-secondary`)

**Dark Mode Check:** Header card on dark background. Tabs show accent blue for active.
**Light Mode Check:** Header card on white. Active tab clearly distinguished. Text readable.

**Definition of Done:**
- Settings page header has polished visual treatment
- Desktop tab bar has clear active/inactive states
- Visual consistency with dashboard pages
- Mobile tab picker unchanged (already good)

**Do Not Touch:** Tab switching logic, workspace loading, mobile BottomSheet component, tab content rendering.

**Estimated Opus Requests:** 1

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 3 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark settings-workspace-ui as DONE`

---

### TASK 3.4 — PRIORITY: MEDIUM — Security Settings UI Design

**STATUS: ⬜ PENDING**

**Component:** `components/settings/security-settings-tab.tsx`
**Verification URL:** `http://localhost:3000/settings` (click "Security" tab)

**Current Behavior:**
The security settings tab has three cards: API Keys, Webhooks, and Security Options. Each uses `rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6`. The cards are well-structured but could benefit from visual polish — icon treatments, better card grouping, more consistent with the general settings tab's design.

**Problem:** Security settings needs a design pass to match the visual quality of the general settings tab post-redesign.

**Root Cause:**
- Cards use CSS variable syntax `border-[var(--border)]` instead of Tailwind token classes `border-border`
- Icon treatments in card headers are basic — just inline with text
- The "Coming Soon" / "Note" banners use inconsistent yellow/blue tints

**Required Fix:**
1. Replace all `border-[var(--border)]` with `border-border`
2. Replace all `bg-[var(--surface)]` with `bg-surface`
3. Replace `text-[var(--text-primary)]` with `text-text-primary`
4. Replace `text-[var(--text-secondary)]` with `text-text-secondary`
5. Add icon backgrounds to card headers:
   ```tsx
   <div className="flex items-center gap-3 mb-4">
     <div className="h-10 w-10 rounded-lg bg-accent-primary/10 flex items-center justify-center">
       <Key className="h-5 w-5 text-accent-primary" />
     </div>
     <div>
       <h3 className="text-lg font-semibold text-text-primary">API Keys</h3>
       <p className="text-sm text-text-secondary">Manage API keys for programmatic access</p>
     </div>
   </div>
   ```
6. Standardize the info/warning banners to use `bg-accent-warning/10 border-accent-warning/20` and `bg-accent-primary/10 border-accent-primary/20`

**Tailwind Classes to Use:** `border-border`, `bg-surface`, `text-text-primary`, `text-text-secondary`, `bg-accent-primary/10`, `bg-accent-warning/10`, `rounded-lg`
**Tailwind Classes to Avoid:** `border-[var(--border)]`, `bg-[var(--surface)]`, `text-[var(--text-primary)]` (use Tailwind tokens instead)

**Dark Mode Check:** Cards on `bg-surface` (#141416). Icons have colored backgrounds. Text readable.
**Light Mode Check:** Cards on white. Borders visible. Colored icon backgrounds visible.

**Definition of Done:**
- All CSS variable bracket syntax replaced with Tailwind token classes
- Card headers have icon backgrounds matching dashboard style
- Info/warning banners use consistent design token colors
- Visual consistency with the redesigned general settings tab

**Do Not Touch:** 2FA logic, session management logic, API key copy/delete logic, Clerk hook usage, modal trigger logic.

**Estimated Opus Requests:** 2

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 3 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark security-settings-design as DONE`

---

### SESSION 3 COPILOT LAUNCH PROMPT

```
Begin session 3.

Read docs/plan/UI_MASTER.md in full. You are Session 3 — Settings, Auth, Light Mode.

Your branch: ui/settings-auth-lightmode
Your owned files: listed in Section 4.3 and Section 10.
Your forbidden files: everything not in Section 4.3. Especially: globals.css, 
tailwind.config.js, app/layout.tsx, all components/layout/*, all components/campaigns/*, 
all components/sandbox/*, all chart/metric/dashboard components.

IMPORTANT: You own sign-out-transition.tsx (the component) but NOT top-navbar.tsx 
(where it's rendered). If you need the component's DOM position changed, leave 
a SHARED-FILE-REQUEST for Session 1.

Execute the full lifecycle from Section 2.1:
1. Pull latest from main, create branch ui/settings-auth-lightmode
2. Read this document fully
3. Execute tasks 3.1 through 3.4 in priority order (HIGH → MEDIUM → LOW)
4. Apply RALPH loop on every task
5. One commit per task
6. Run Verifier Agent after all tasks
7. Update STATUS markers in UI_MASTER.md as each task passes
8. Raise PR when all tasks pass

If you need changes to globals.css or tailwind.config.js, leave a 
SHARED-FILE-REQUEST comment in your code and flag in PR description.

Do not ask questions. Read the document. Execute.
```

---
---

## 11. SESSION 4 — Sandbox, Icons, KPI Cards, Stats

### Branch: `ui/sandbox-icons-kpi-stats`

### Files This Session Owns

```
components/sandbox/sandbox-panel.tsx
components/sandbox/test-runner.tsx
components/sandbox/execution-monitor.tsx
components/sandbox/configuration-section.tsx
components/sandbox/config-status-bar.tsx
components/dashboard/metric-card.tsx
components/dashboard/efficiency-metrics.tsx
components/dashboard/step-breakdown.tsx
components/dashboard/daily-sends-chart.tsx
components/dashboard/daily-cost-chart.tsx
components/dashboard/time-series-chart.tsx
components/dashboard/donut-chart.tsx
components/dashboard/sender-breakdown.tsx
components/dashboard/date-range-picker.tsx
components/dashboard/date-range-picker-content.tsx
components/dashboard/date-range-picker-mobile.tsx
components/dashboard/timezone-selector.tsx
components/dashboard/timezone-selector-content.tsx
components/dashboard/provider-selector.tsx
components/dashboard/ask-ai.tsx
components/dashboard/share-dialog.tsx
components/dashboard/share-dialog-old.tsx
components/dashboard/lazy-charts.tsx
components/dashboard/safe-components.tsx
components/dashboard/mobile-collapsible-widget.tsx
components/pages/dashboard-page-client.tsx
components/pages/analytics-page-client.tsx
components/pages/join-page-client.tsx
components/pages/not-found-client.tsx
app/sandbox/page.tsx
app/analytics/page.tsx
app/page.tsx
```

### Files This Session Must Never Touch

All files in Sessions 1, 2, 3 ownership lists. All backend files, API routes, hooks, lib logic. Specifically: `app/globals.css`, `tailwind.config.js`, `app/layout.tsx`, all `components/layout/*`, all `components/settings/*`, all `components/campaigns/*`, all `components/genesis/*`, all `components/onboarding/*`.

---

### TASK 4.1 — PRIORITY: HIGH — Sandbox Page Light Mode Contrast

**STATUS: ⬜ PENDING**

**Component:** `app/sandbox/page.tsx` + `components/sandbox/sandbox-panel.tsx` + `components/sandbox/test-runner.tsx` + `components/sandbox/configuration-section.tsx`
**Verification URL:** `http://localhost:3000/sandbox` (switch to light mode)

**Current Behavior:**
The sandbox page uses a mix of design-system classes and shadcn/ui defaults:
- `app/sandbox/page.tsx`: Uses `bg-surface-base` (not a design token — likely resolves to default)
- `sandbox-panel.tsx`: Uses `text-muted-foreground` (shadcn default, not project design tokens)
- `test-runner.tsx`: Uses `bg-background`, `border`, `text-muted-foreground`, `bg-primary text-primary-foreground` — these are shadcn defaults, not the project's design token system
- `configuration-section.tsx`: Uses `text-muted-foreground`, `bg-background`, `border` — same issue

In light mode, these shadcn defaults create contrast issues because the project's light mode is defined via CSS variables in `globals.css` (`:root.light`), not via shadcn's default theme. The result: backgrounds may be invisible against the page, borders may be too subtle, and text may have poor contrast.

**Problem:** Sandbox page in light mode (especially white mode) has severe contrast issues — backgrounds blend into background, borders disappear, text is hard to read.

**Root Cause:**
- Shadcn class names (`text-muted-foreground`, `bg-primary`, `bg-background`, `border`) are not mapped to the project's CSS variables
- The project uses `text-text-primary`, `text-text-secondary`, `bg-surface`, `bg-surface-elevated`, `border-border` — different naming convention
- Sandbox components were written using shadcn defaults and never migrated to the project's design token system

**Required Fix:**
1. In ALL sandbox components, replace shadcn class names with project design tokens:
   - `text-muted-foreground` → `text-text-secondary`
   - `bg-background` → `bg-surface`
   - `bg-muted/50` → `bg-surface-elevated/50`
   - `bg-primary text-primary-foreground` → `bg-accent-primary text-white`
   - `text-foreground` → `text-text-primary`
   - `border` (standalone) → `border border-border`
   - `bg-muted` → `bg-surface-elevated`
   - `text-destructive` → `text-accent-danger`
   - `hover:bg-muted/50` → `hover:bg-surface-elevated/50`
   - `hover:bg-primary/90` → `hover:bg-accent-primary/90`
   - `focus:ring-ring` → `focus:ring-accent-primary`
2. In `app/sandbox/page.tsx`, replace `bg-surface-base` and `border-border-primary` with verified project tokens:
   - `bg-surface-base` → `bg-background` (the project's actual `--background` variable)
   - `border-border-primary` → `border-border`
3. Verify each sandbox component renders correctly in both light and dark mode after changes

**Tailwind Classes to Use:** `text-text-primary`, `text-text-secondary`, `bg-surface`, `bg-surface-elevated`, `bg-background`, `border-border`, `bg-accent-primary`, `text-white`, `text-accent-danger`
**Tailwind Classes to Avoid:** `text-muted-foreground`, `bg-muted`, `bg-primary`, `text-primary-foreground`, `text-destructive`, `bg-background` (only if it's a shadcn default without CSS var)

**Dark Mode Check:** All sandbox elements render with correct dark design tokens. Cards on `bg-surface`, text is `text-text-primary`.
**Light Mode Check:** All sandbox elements have proper contrast. Borders visible (`border-border` = `#CBD5E1`). Text dark on light background. Buttons clearly visible.

**Definition of Done:**
- Zero shadcn default class names remain in sandbox components
- All classes use the project's design token system
- Light mode: all elements have adequate contrast (WCAG AA minimum)
- Dark mode: no visual regression from current appearance
- Test Runner form fields are clearly visible in both modes
- Config sliders and toggles are clearly visible in both modes

**Do Not Touch:** Hook logic (`useSandboxHistory`, `useWorkspaceConfig`), API calls (`triggerTestCampaign`), campaign selector SWR fetching, localStorage config persistence.

**Estimated Opus Requests:** 3

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 4 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark sandbox-lightmode as DONE`

---

### TASK 4.2 — PRIORITY: HIGH — Sandbox Start/End Calendars Light Mode

**STATUS: ⬜ PENDING**

**Component:** `components/dashboard/date-range-picker.tsx` + `components/dashboard/date-range-picker-content.tsx`
**Verification URL:** `http://localhost:3000/` or `http://localhost:3000/sandbox` (open date range picker in light mode)

**Current Behavior:**
The date range picker uses `react-day-picker` and Radix `Popover`. In `globals.css`, there are light mode overrides for `[data-radix-popper-content-wrapper]` that fix popper content text colors. However, the calendar day cells, selected range highlight, and navigation arrows may have contrast issues in light mode because the inner calendar styling still uses dark-mode-first colors.

**Problem:** Start/End date calendars in the sandbox (and dashboard) have broken light mode — selected dates, day text, and navigation arrows have poor contrast against the light background.

**Root Cause:**
- The `date-range-picker-content.tsx` component styles day cells, selected ranges, and navigation
- In dark mode, these work because the default background is dark
- In light mode, `globals.css` has partial fixes (`html.light [data-radix-popper-content-wrapper]`) but the inner `react-day-picker` classes may not be covered
- The calendar likely uses `bg-surface` or `bg-surface-elevated` for day cells, which resolves correctly, but hover and selected states may use colors optimized for dark mode

**Required Fix:**
1. Read `components/dashboard/date-range-picker-content.tsx` to identify all styling
2. Ensure selected day uses `bg-accent-primary text-white` (works in both themes)
3. Ensure hover day uses `bg-surface-elevated` (resolves differently per theme)
4. Ensure today indicator uses `border-accent-primary` or `text-accent-primary`
5. Ensure navigation arrows use `text-text-secondary hover:text-text-primary`
6. If calendar uses custom CSS classes, verify they adapt to light mode via CSS variables

**Tailwind Classes to Use:** `bg-accent-primary`, `text-white` (selected), `bg-surface-elevated` (hover), `text-text-primary` (day text), `text-text-secondary` (muted days), `border-accent-primary` (today)
**Tailwind Classes to Avoid:** Hardcoded dark-only colors (`text-white` for day text, `bg-slate-800` for cells)

**Dark Mode Check:** Calendar renders on dark surface. Selected dates blue. Text white. Navigation arrows visible.
**Light Mode Check:** Calendar renders on white/light surface. Day text is dark. Selected dates blue with white text. Navigation arrows dark. Today clearly marked.

**Definition of Done:**
- Date range picker calendar is fully usable in light mode
- All day numbers are readable
- Selected range is clearly highlighted in blue
- Navigation (prev/next month) arrows visible and functional
- Today's date visually distinguished
- No contrast issues at any point in the calendar

**Do Not Touch:** Date range logic, SWR data fetching, URL param persistence, `onDateChange` callbacks.

**Estimated Opus Requests:** 2

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 4 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark calendar-lightmode as DONE`

---

### TASK 4.3 — PRIORITY: MEDIUM — KPI Cards Minimal Redesign

**STATUS: ⬜ PENDING**

**Component:** `components/dashboard/metric-card.tsx`
**Verification URL:** `http://localhost:3000/` (dashboard — top metrics row)

**Current Behavior:**
The `MetricCard` component renders cards in a grid with: title (text-secondary), large metric value (text-primary), change indicator (trend arrow + percentage), and an icon in a colored circle. The cards have:
- Gradient glow on hover (`bg-gradient-to-br from-blue-500/5 to-blue-700/5 opacity-0 group-hover/card:opacity-100`)
- Icon in a `h-10 w-10 sm:h-12 sm:w-12` circle
- Value in `text-2xl sm:text-3xl font-bold`
- Card border hover effect (`hover:border-accent-primary/30`)

**Problem:** KPI cards should be more minimal — the gradient glow, large icon circles, and bold values create a busy visual. The cards should feel lighter and more data-focused.

**Required Fix:**
1. Remove the gradient glow overlay entirely:
   ```tsx
   // REMOVE this div:
   <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-700/5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
   ```
2. Reduce icon circle size: `h-10 w-10 sm:h-12 sm:w-12` → `h-8 w-8 sm:h-10 sm:w-10`
3. Reduce icon size inside: `h-5 w-5 sm:h-6 sm:w-6` → `h-4 w-4 sm:h-5 sm:w-5`
4. Keep value size but reduce weight: `text-2xl sm:text-3xl font-bold` → `text-xl sm:text-2xl font-semibold`
5. Simplify hover: remove `hover:border-accent-primary/30` — use `hover:bg-surface-elevated/30` instead for a subtle background shift
6. Keep the trend indicator (TrendingUp/Down) as-is — it's already minimal

**Tailwind Classes to Use:** `h-8 w-8`, `sm:h-10 sm:w-10`, `h-4 w-4`, `sm:h-5 sm:w-5`, `text-xl`, `sm:text-2xl`, `font-semibold`, `hover:bg-surface-elevated/30`
**Tailwind Classes to Avoid:** `bg-gradient-to-br from-blue-500/5 to-blue-700/5` (removing), `text-3xl` (too bold for minimal), `hover:border-accent-primary/30` (removing)

**Dark Mode Check:** Cards on dark surface. Metrics readable. Trends visible.
**Light Mode Check:** Cards on white/light surface. Metrics readable. Icons subtle.

**Definition of Done:**
- KPI cards have a cleaner, more minimal appearance
- No gradient glow overlay
- Smaller icon circles
- Smaller but still readable metric values
- Subtle hover effect instead of blue border glow
- Loading skeletons still work correctly

**Do Not Touch:** Value formatting logic (`formatNumber`, `formatCurrency`), trend calculation, icon mapping, loading state, `isRefetching` state.

**Estimated Opus Requests:** 1

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 4 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark kpi-minimal as DONE`

---

### TASK 4.4 — PRIORITY: MEDIUM — Efficiency Unit Hover Blue Tint Visibility

**STATUS: ⬜ PENDING**

**Component:** `components/dashboard/efficiency-metrics.tsx`
**Verification URL:** `http://localhost:3000/` (dashboard — Efficiency Metrics panel, hover over CPL/CPM toggle)

**Current Behavior:**
The efficiency metrics panel has four metric rows (Daily Cost, Monthly Projection, Cost Per Lead/CPM, Contacts Reached). The CPL/CPM toggle button has the class `hover:border-accent-primary/60 hover:text-accent-primary` which turns the toggle border and text blue on hover. However, the blue tint from `hover:border-accent-primary/60` is barely visible because:
1. The toggle button has `border border-border` as base — the transition from `border-border` (#27272a) to `border-accent-primary/60` (blue at 60% opacity) is too subtle in dark mode
2. The toggle button is very small (`text-[10px] px-2 py-1`) — the border change at this size is nearly imperceptible

**Problem:** The efficiency unit toggle (CPL ↔ CPM) hover blue tint is not visible enough.

**Root Cause:**
- Line in `efficiency-metrics.tsx` (toggle button): `hover:border-accent-primary/60` — opacity too low
- Small button size makes border changes hard to see

**Required Fix:**
1. Increase hover border opacity: `hover:border-accent-primary/60` → `hover:border-accent-primary`
2. Add a subtle background change on hover:
   ```tsx
   className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border border-border hover:border-accent-primary hover:bg-accent-primary/10 hover:text-accent-primary transition-colors"
   ```
3. The `bg-accent-primary/10` gives a clear blue tint background on hover, making the toggle much more visible

**Tailwind Classes to Use:** `hover:border-accent-primary`, `hover:bg-accent-primary/10`, `hover:text-accent-primary`, `transition-colors`
**Tailwind Classes to Avoid:** `hover:border-accent-primary/60` (too subtle)

**Dark Mode Check:** Toggle button shows clear blue tint on hover (border + background).
**Light Mode Check:** Toggle button shows blue tint on hover with good contrast.

**Definition of Done:**
- CPL/CPM toggle has a clearly visible blue hover state
- The blue appears on both the border and as a subtle background tint
- The toggle text also turns blue on hover
- Transition is smooth (150ms from `transition-colors`)

**Do Not Touch:** `efficiencyMode` state logic, useMemo calculations, metric value formatting.

**Estimated Opus Requests:** 1

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 4 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark efficiency-hover as DONE`

---

### TASK 4.5 — PRIORITY: MEDIUM — Sandbox Light Mode Contrast (Remaining Issues)

**STATUS: ⬜ PENDING**

**Component:** `components/sandbox/config-status-bar.tsx` + `components/sandbox/execution-monitor.tsx`
**Verification URL:** `http://localhost:3000/sandbox` (switch to light mode)

**Current Behavior:**
After Task 4.1 fixes the main sandbox panel and test runner, the config status bar and execution monitor may still have contrast issues in light mode. These components likely use the same shadcn default classes that need to be migrated.

**Problem:** Config status bar and execution monitor need the same design token migration as the other sandbox components.

**Root Cause:**
- Same as Task 4.1 — shadcn defaults not mapped to project tokens

**Required Fix:**
1. Read both `config-status-bar.tsx` and `execution-monitor.tsx`
2. Apply the same class name replacements as Task 4.1:
   - `text-muted-foreground` → `text-text-secondary`
   - `bg-background` → `bg-surface`
   - `border` → `border border-border`
   - `bg-muted` → `bg-surface-elevated`
   - etc. (full mapping in Task 4.1)
3. Verify amber/blue/green/red status colors work in both modes

**Tailwind Classes to Use:** Same as Task 4.1 — project design tokens
**Tailwind Classes to Avoid:** Same as Task 4.1 — shadcn defaults

**Dark Mode Check:** Status bar and monitor render correctly with dark tokens.
**Light Mode Check:** Status bar and monitor have adequate contrast on light background.

**Definition of Done:**
- Config status bar fully uses project design tokens
- Execution monitor fully uses project design tokens
- Both components readable in light mode
- Status color badges (green/amber/red/blue) clearly visible in both modes

**Do Not Touch:** Config update logic, WebSocket/polling logic, execution status tracking.

**Estimated Opus Requests:** 2

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 4 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark sandbox-contrast-remaining as DONE`

---

### TASK 4.6 — PRIORITY: LOW — Individual Movement of Stats Boxes

**STATUS: ⬜ PENDING**

**Component:** `components/pages/dashboard-page-client.tsx`
**Verification URL:** `http://localhost:3000/` (dashboard — drag widgets)

**Current Behavior:**
The dashboard uses `@dnd-kit` for drag-and-drop widget reordering via `DndContext` and `SortableContext`. The widgets are reordered as a full block (entire grid row), but individual chart boxes within a widget (e.g., the two charts in "Sends & Opt-Out Trends") cannot be individually repositioned.

**Problem:** Users want to individually move stats boxes within the 4 graph widgets (sends-optout, click-reply sections each have 2 charts side-by-side).

**Required Fix:**
1. This is a UI task — make the drag handle more visible on each widget:
   - Currently `DashboardWidget` has a grab handle icon `GripVertical` that appears on hover
   - Make the handle always visible (not just on hover) with reduced opacity: `opacity-30 group-hover:opacity-100`
2. For the paired chart widgets (sends-optout, click-reply), add a visual indicator that the entire section moves together:
   - Add a subtle label like "Drag to reorder" near the drag handle
3. Consider individual drag for sub-charts in a future sprint — for now, document that individual chart movement within a grid pair is a Phase 2 enhancement

**Tailwind Classes to Use:** `opacity-30`, `group-hover:opacity-100`, `transition-opacity`, `text-text-secondary`, `text-xs`
**Tailwind Classes to Avoid:** None specific

**Dark Mode Check:** Drag handle visible with correct opacity on dark surface.
**Light Mode Check:** Drag handle visible on light surface.

**Definition of Done:**
- Drag handles are visible (low opacity) even without hovering
- Drag handles become fully visible on hover
- No regression in drag-and-drop functionality
- Clear visual affordance that widgets are draggable

**Do Not Touch:** `DndContext` configuration, `useSortable` hook logic, widget reorder persistence, `useDashboardLayout` hook.

**Estimated Opus Requests:** 1

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 4 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark stats-movement as DONE`

---

### TASK 4.7 — PRIORITY: LOW — Change Sizes of Boxes (Chart Container Heights)

**STATUS: ⬜ PENDING**

**Component:** `components/dashboard/time-series-chart.tsx` + `components/dashboard/step-breakdown.tsx` + `components/dashboard/daily-sends-chart.tsx`
**Verification URL:** `http://localhost:3000/` (dashboard — all chart sections)

**Current Behavior:**
Chart containers use `h-full` for height and `height={300}` as a prop on the Recharts `ResponsiveContainer`. The chart grid pairs (e.g., `grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch`) stretch to match each other's height. Some stats boxes feel too tall or too short relative to their content.

**Problem:** Chart box sizes need adjustment — some feel too large for their content density.

**Required Fix:**
1. Standardize chart heights across the dashboard:
   - Time series charts: `height={280}` (currently `height={300}` — reduce slightly)
   - Step breakdown: allow natural height based on content (currently growing to match paired chart)
   - Daily sends chart: `height={280}` to match time series
2. In the paired grid layouts (`grid-cols-2`), use `items-start` instead of `items-stretch` so charts don't unnecessarily stretch to match their pair
3. Set a `min-h-[280px]` on chart cards to prevent collapse when loading

**Tailwind Classes to Use:** `items-start` (grid alignment), `min-h-[280px]` (chart card minimum)
**Tailwind Classes to Avoid:** `items-stretch` (causes mismatched height stretching)

**Dark Mode Check:** Charts render at correct height. No overflow or clipping.
**Light Mode Check:** Same — consistent heights in light theme.

**Definition of Done:**
- All chart containers have consistent, appropriate heights
- Paired charts don't stretch unnecessarily to match each other
- Loading skeletons match the new heights
- No visual regression in chart rendering

**Do Not Touch:** Recharts data, chart type configurations, data formatters, SWR fetching logic.

**Estimated Opus Requests:** 1

> When Verifier Agent returns PASS for this task, update STATUS to:
> **STATUS: ✅ DONE — Session 4 — [date] — [commit hash]**
> Commit: `docs(ui-master): mark chart-sizes as DONE`

---

### SESSION 4 COPILOT LAUNCH PROMPT

```
Begin session 4.

Read docs/plan/UI_MASTER.md in full. You are Session 4 — Sandbox, Icons, KPI, Stats.

Your branch: ui/sandbox-icons-kpi-stats
Your owned files: listed in Section 4.4 and Section 11.
Your forbidden files: everything not in Section 4.4. Especially: globals.css, 
tailwind.config.js, app/layout.tsx, all components/layout/*, all components/settings/*, 
all components/campaigns/*, all components/genesis/*, all components/onboarding/*.

Execute the full lifecycle from Section 2.1:
1. Pull latest from main, create branch ui/sandbox-icons-kpi-stats
2. Read this document fully
3. Execute tasks 4.1 through 4.7 in priority order (HIGH → MEDIUM → LOW)
4. Apply RALPH loop on every task
5. One commit per task
6. Run Verifier Agent after all tasks
7. Update STATUS markers in UI_MASTER.md as each task passes
8. Raise PR when all tasks pass

If you need changes to globals.css or tailwind.config.js, leave a 
SHARED-FILE-REQUEST comment in your code and flag in PR description.

Do not ask questions. Read the document. Execute.
```

---
---

## APPENDIX A: TASK SUMMARY TABLE

| Task ID | Session | Priority | Task Name | Status |
|---|---|---|---|---|
| 1.1 | 1 | HIGH | Sidebar Transition Smoothing | ⬜ PENDING |
| 1.2 | 1 | HIGH | Sign-Out Transition Z-Index Fix | ⬜ PENDING |
| 1.3 | 1 | MEDIUM | Panel UX Improvement | ⬜ PENDING |
| 1.4 | 1 | MEDIUM | Instant Light-to-Dark Transition | ⬜ PENDING |
| 1.5 | 1 | MEDIUM | Hover Inconsistency (Icons) | ⬜ PENDING |
| 1.6 | 1 | MEDIUM | Container Highlight Fill Box (Sidebar Light) | ⬜ PENDING |
| 1.7 | 1 | LOW | Remove Grey Container Over Syncing | ⬜ PENDING |
| 1.8 | 1 | LOW | Resize Collapsed Icon + White Syncing Text | ⬜ PENDING |
| 2.1 | 2 | HIGH | Campaign/Chatbot Content Cutoff | ⬜ PENDING |
| 2.2 | 2 | HIGH | Onboarding Chatbot as Floating Bubble | ⬜ PENDING |
| 2.3 | 2 | MEDIUM | Campaign Ending Box Alignment | ⬜ PENDING |
| 2.4 | 2 | MEDIUM | Remove Container on Campaign Name | ⬜ PENDING |
| 2.5 | 2 | LOW | Right-Click Functionality Enhancement | ⬜ PENDING |
| 2.6 | 2 | LOW | Sequences Pagination Selection | ⬜ PENDING |
| 3.1 | 3 | HIGH | Settings General Page Full UI Design | ⬜ PENDING |
| 3.2 | 3 | HIGH | Sign-In Page Light Mode | ⬜ PENDING |
| 3.3 | 3 | MEDIUM | Workspace Settings Page UI | ⬜ PENDING |
| 3.4 | 3 | MEDIUM | Security Settings UI Design | ⬜ PENDING |
| 4.1 | 4 | HIGH | Sandbox Page Light Mode Contrast | ⬜ PENDING |
| 4.2 | 4 | HIGH | Sandbox Calendars Light Mode | ⬜ PENDING |
| 4.3 | 4 | MEDIUM | KPI Cards Minimal Redesign | ⬜ PENDING |
| 4.4 | 4 | MEDIUM | Efficiency Unit Hover Blue Tint | ⬜ PENDING |
| 4.5 | 4 | MEDIUM | Sandbox Light Mode Remaining | ⬜ PENDING |
| 4.6 | 4 | LOW | Individual Movement of Stats Boxes | ⬜ PENDING |
| 4.7 | 4 | LOW | Change Sizes of Boxes (Charts) | ⬜ PENDING |

**Total Tasks:** 25
**HIGH:** 8 | **MEDIUM:** 11 | **LOW:** 6

---

## APPENDIX B: VERIFICATION CHECKLIST TEMPLATE

Use this checklist for the Verifier Agent on every task:

```
TASK: [task-id] — [task-name]
SESSION: [N]
URL: [verification-url]

SCREENSHOTS CAPTURED:
[ ] [task-name]-dark-desktop.png (1440×900)
[ ] [task-name]-dark-mobile.png (375×812)
[ ] [task-name]-light-desktop.png (1440×900)
[ ] [task-name]-light-mobile.png (375×812)

CHECKS:
[ ] Dark mode visual — matches definition of done
[ ] Light mode visual — matches definition of done
[ ] Mobile layout — no overflow, no clipping
[ ] Desktop layout — correct alignment and spacing
[ ] Console errors — none introduced
[ ] Existing functionality — not broken

RESULT: PASS / FAIL
FAIL REASON: [if applicable]
```

---

## APPENDIX C: PR DESCRIPTION TEMPLATE

```markdown
## [UI Session N] [Scope] — verified and ready for review

### Tasks Completed

| Task | Commit | Status |
|---|---|---|
| [task-name] | [hash] | ✅ PASS |
| [task-name] | [hash] | ✅ PASS |
...

### Screenshots
See `screenshots/session-[N]/` directory.

### Cross-Session Observations
- [Any bugs found in files owned by other sessions]

### Shared File Requests
- [Any changes needed in globals.css, tailwind.config.js, or app/layout.tsx]

### Notes
- Total commits: [N task commits + N status commits + 1 screenshot commit]
- All tasks verified by Verifier Agent
- Do NOT squash commits — each commit = one verifiable task
```

---

## APPENDIX D: QUICK REFERENCE — LAUNCH ALL SESSIONS

To launch the entire sprint, give each of the 4 Copilot agents exactly one of these instructions:

**Agent 1:** `Begin session 1. Read docs/plan/UI_MASTER.md.`
**Agent 2:** `Begin session 2. Read docs/plan/UI_MASTER.md.`
**Agent 3:** `Begin session 3. Read docs/plan/UI_MASTER.md.`
**Agent 4:** `Begin session 4. Read docs/plan/UI_MASTER.md.`

Each agent will:
1. Read the entire document
2. Pull latest, create its branch
3. Execute all tasks in priority order
4. Apply RALPH loop on every task
5. Run Verifier Agent
6. Update STATUS markers
7. Raise PR

The main owner then merges in order: Session 1 → 2 → 3 → 4 (with rebases between each).

---

**END OF DOCUMENT**

*UI_MASTER.md — Version 1.0.0 — Generated 2026-02-27*
*This is the sole source of truth. No other document supersedes this file.*


