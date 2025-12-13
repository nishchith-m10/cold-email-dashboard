Architect the solution using the  for **Phase 27: Schema Sync & "Sequences" (Draft Viewer)**.

**Context:**
We are implementing the visual sequence preview feature, officially named **"Sequences"** (path: `/sequences`).
* **Database Source:** The live `leads_ohio` table.
* **Confirmed Draft Columns:** `email_1_subject`, `email_1_body`, `email_2_body`, `email_3_subject`, `email_3_body`.
* **Goal:** Build a high-performance Sequences Monitor that safely renders the raw HTML body.

**Objectives:**

### **1. Schema Sync & Sanitization Utility**
* **Migration:** Create `supabase/migrations/20251213_sync_leads_ohio_schema.sql`. Ensure `leads_ohio` includes the 5 draft columns.
* **Security Utility:** Create a new file: `lib/html-sanitizer.ts`.
    * **Task:** Implement a safe function (e.g., using `dompurify` if in `package.json`, or a basic utility using regex/DOMParser) that cleans HTML content before it can be rendered using `dangerouslySetInnerHTML`. This is a **NON-NEGOTIABLE SECURITY REQUIREMENT**.

### **2. API Integration (Split for Performance)**

* **Endpoint A (List):** `app/api/sequences/route.ts` (GET)
    * **Logic:** Fetch paginated lead list (Limit 10).
    * **Selection:** Select only light columns: `id`, `full_name`, `email_address`, `status`, `email_1_sent`, etc. **DO NOT SELECT BODY COLUMNS HERE.**
* **Endpoint B (Detail):** `app/api/sequences/[id]/route.ts` (GET)
    * **Logic:** Fetch the sequence body for a single selected lead.
    * **Selection:** Select the heavy columns: `email_1_subject`, `email_1_body`, `email_2_body`, etc.
    * **Benefit:** This prevents a slow initial load time for the list.

### **3. The "Sequences" UI (`app/sequences/page.tsx`)**
* **Layout:** Two-column structure. Left column loads via **Endpoint A**. Main Stage loads detail via **Endpoint B**.
* **New Component:** Create `<SequenceDeckCard>` component.
    * **Body Rendering:** Use the function from `lib/html-sanitizer.ts` before rendering.
* **Quality Check Logic (Critical):** In the card rendering, implement the data quality check: If the body text contains the literal string **"Hey ,"** (with a comma and space), display a red warning badge: **"Missing Name Variable"**.
* **Status Indicators:** Use the `email_x_sent` boolean to show Green "Sent" vs. Grey "Queued" badges above each draft.

### **4. Navigation**
* Update `components/layout/header.tsx` to change the feature name and link to **"Sequences"** (`/sequences`).

**Output:**
Provide the strict **Execution Plan** (Schema SQL, Dual API Logic, and Atomic Batches) to build the Sequences Monitor.