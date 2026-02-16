# Environment Variable Verification Checklist
## Phase 71 & Admin Dashboard Requirements

**Generated:** 2026-02-12  
**Purpose:** Verify production environment variables for Phase 71 API Health Monitor and Admin Dashboard

---

## ✅ Required Environment Variables

### **1. SUPER_ADMIN_IDS** (Critical)
- **Purpose:** Controls access to `/admin` dashboard (API Health, Migration tabs)
- **Format:** Comma-separated Clerk User IDs
- **Example:** `user_2abc123xyz,user_2def456uvw`
- **Where to get:** Clerk Dashboard → Users → Click each admin user → Copy User ID
- **Verification:**
  ```bash
  # In Vercel Dashboard → Project → Settings → Environment Variables
  # Check: SUPER_ADMIN_IDS exists and contains valid Clerk user IDs
  ```
- **Status:** ⬜ NOT VERIFIED
- **Action:** Add to Vercel if missing

---

### **2. CRON_SECRET** (Critical)
- **Purpose:** Authenticates Vercel cron jobs for Phase 71 health checks
- **Format:** Random secure token (32+ characters)
- **Example:** `a1b2c3d4e5f6...` (use: `openssl rand -hex 32`)
- **Used by:**
  - `/api/cron/api-health-critical` (every 5 minutes)
  - `/api/cron/api-health-secondary` (hourly)
  - `/api/cron/sync-campaigns` (daily)
  - `/api/cron/rotate-credentials` (daily)
  - `/api/cron/process-exports` (every 2 minutes)
- **Verification:**
  ```bash
  # In Vercel Dashboard → Project → Settings → Environment Variables
  # Check: CRON_SECRET exists
  # Test: curl "https://your-app.vercel.app/api/cron/api-health-critical?secret=YOUR_SECRET"
  # Expected: 200 OK with health check results (not 401/403)
  ```
- **Status:** ⬜ NOT VERIFIED
- **Action:** Add to Vercel if missing, update vercel.json references

---

### **3. NEXT_PUBLIC_OHIO_WORKSPACE_ID** (Optional)
- **Purpose:** Identifies Ohio legacy workspace for firewall checks
- **Format:** UUID of Ohio workspace
- **Example:** `12345678-1234-1234-1234-123456789abc`
- **Used by:** Genesis Plan Section 3 - Ohio Exception Protocol (`assertIsOhio()` firewall)
- **Verification:**
  ```bash
  # In Vercel Dashboard → Project → Settings → Environment Variables
  # Check: NEXT_PUBLIC_OHIO_WORKSPACE_ID exists (if Ohio workspace in use)
  ```
- **Status:** ⬜ NOT VERIFIED
- **Action:** Add if Ohio workspace exists, otherwise skip

---

## 📝 Verification Steps

### **Step 1: Access Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Select your project: `cold-email-dashboard`
3. Navigate to: **Settings** → **Environment Variables**

### **Step 2: Check Variables**
For each variable above:
- ✅ Verify it exists
- ✅ Verify the value format matches expected pattern
- ✅ Mark status as VERIFIED in this document

### **Step 3: Test Cron Endpoints** (if CRON_SECRET exists)
```bash
# Replace YOUR_APP_URL and YOUR_CRON_SECRET
curl "https://your-app.vercel.app/api/cron/api-health-critical?secret=YOUR_CRON_SECRET"

# Expected response:
# {
#   "success": true,
#   "message": "Critical API health check completed",
#   "results": { ... }
# }

# If you get 401/403: CRON_SECRET mismatch or missing
# If you get 500: Check logs for other errors
```

### **Step 4: Test Admin Dashboard Access**
1. Login to production app as admin user
2. Navigate to: `/admin`
3. Verify tabs visible: **Workspaces**, **Audit**, **Scale Health**, **Alert History**, **API Health**, **Migration**
4. Click **API Health** tab
5. Click "Refresh Health Status" button
6. Verify health check results display without errors

**If admin page shows 403/unauthorized:**
- Check: Your Clerk User ID is in `SUPER_ADMIN_IDS`
- Get your ID: Clerk Dashboard → Users → Your user → User ID
- Add to: Vercel env vars → `SUPER_ADMIN_IDS`

---

## ⚠️ Issues Found

### **Missing CRON_SECRET from .env.example**
- **Problem:** CRON_SECRET is used in 5+ cron endpoints but NOT documented in `.env.example`
- **Impact:** Developers may not configure it, causing cron jobs to fail
- **Fix Needed:** Add CRON_SECRET to `.env.example` with generation instructions
- **Recommended addition:**
  ```bash
  # ========================================
  # CRON JOB AUTHENTICATION
  # ========================================
  # Generate with: openssl rand -hex 32
  # Used by Vercel cron jobs for API health checks and background tasks
  CRON_SECRET=your-random-cron-secret-here
  ```

---

## 📊 Summary

| Variable | Required | Status | Priority |
|----------|----------|--------|----------|
| SUPER_ADMIN_IDS | ✅ Yes | ⬜ Not Verified | HIGH |
| CRON_SECRET | ✅ Yes | ⬜ Not Verified | HIGH |
| NEXT_PUBLIC_OHIO_WORKSPACE_ID | ❌ Optional | ⬜ Not Verified | LOW |

---

## 🔧 Recommended Actions

1. **IMMEDIATE:** Add `CRON_SECRET` to Vercel environment variables
2. **IMMEDIATE:** Verify `SUPER_ADMIN_IDS` contains correct Clerk user IDs
3. **RECOMMENDED:** Update `.env.example` to include `CRON_SECRET` documentation
4. **OPTIONAL:** Add `NEXT_PUBLIC_OHIO_WORKSPACE_ID` if Ohio workspace exists

---

## 📖 References

- **Phase 71 Cron Jobs:** `vercel.json` lines 31-38
- **Admin Auth Check:** `app/api/admin/*/route.ts` (SUPER_ADMIN_IDS usage)
- **Environment Template:** `.env.example` lines 1-123
- **Genesis Plan Section 3:** Ohio Exception Protocol
