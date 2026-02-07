# Build Errors - Must Fix Before Phase 66

**Date:** 2026-02-01  
**Status:** 🚨 **3 BLOCKING ERRORS**  
**Impact:** Prevents Vercel deployment

---

## ⚠️ CRITICAL BUILD ERRORS

These errors appeared during Vercel deployment and must be fixed before continuing with Phase 66.

---

### **Error 1: CSS Parsing Error** ❌

**File:** `app/globals.css:3293`

**Error:**
```
Parsing CSS source code failed
> 3293 | html.light [data-radix-popper-content-wrapper] .hover\\:bg-surface-elevated:hover {
       |                                                         ^
'bg-surface-elevated' is not recognized as a valid pseudo-class
```

**Root Cause:** Invalid CSS syntax - escaped colon in class name  

**Fix Needed:**
```css
/* BEFORE (line 3293): */
html.light [data-radix-popper-content-wrapper] .hover\\:bg-surface-elevated:hover {
  background-color: #E2E8F0 !important;
}

/* AFTER: */
html.light [data-radix-popper-content-wrapper] [class*="hover:bg-surface-elevated"]:hover {
  background-color: #E2E8F0 !important;
}

/* OR use Tailwind's arbitrary variant: */
html.light [data-radix-popper-content-wrapper] .hover\:bg-surface-elevated:hover {
  background-color: #E2E8F0 !important;
}
```

---

### **Error 2: Next.js 16 Breaking Change - `ssr: false` Not Allowed** ❌

**Affected Files (5 files):**
1. `app/page.tsx` (line 7-12)
2. `app/analytics/page.tsx` (line 7-12)
3. `app/join/page.tsx` (line 7-12)
4. `app/not-found.tsx` (line 8-10)
5. `app/onboarding/page.tsx` (line 15-25)

**Error:**
```
`ssr: false` is not allowed with `next/dynamic` in Server Components.
Please move it into a Client Component.
```

**Root Cause:** Next.js 16 no longer allows `ssr: false` in Server Components

**Fix Option 1 (Recommended): Convert to Client Components**
```typescript
// Add at top of file:
'use client';

// Then remove ssr: false:
const DashboardPageClient = NextDynamic(
  () => import('@/components/pages/dashboard-page-client'),
  {
    loading: () => (
      <div className="p-6 text-sm text-text-secondary">Loading dashboard…</div>
    ),
  }
);
```

**Fix Option 2: Remove Dynamic Import**
```typescript
// Just import directly:
import DashboardPageClient from '@/components/pages/dashboard-page-client';
```

**Apply to ALL 5 files listed above.**

---

### **Error 3: Missing Module** ❌

**File:** `app/api/knowledge/query/route.ts:14`

**Error:**
```
Module not found: Can't resolve '@/search-engine/knowledge-api/ConflictResolver'
Import trace:
> 14 | import { ConflictResolver, ResolvedContext, Citation, Warning } from '@/search-engine/knowledge-api/ConflictResolver';
```

**Root Cause:** File `search-engine/knowledge-api/ConflictResolver.ts` was deleted but import still exists

**Fix Option 1: Remove the Import**
```typescript
// Remove line 14 and any usage of ConflictResolver in the file
```

**Fix Option 2: Comment Out the Route**
```typescript
// If this API endpoint isn't being used, comment out the entire route file
```

**Fix Option 3: Restore the File**
```typescript
// If you need this functionality, check git history to restore it:
git log --all --full-history -- search-engine/knowledge-api/ConflictResolver.ts
```

---

## 🔧 FIX WORKFLOW

### **Step 1: Fix CSS Error**
```bash
# Edit app/globals.css line 3293
# Replace the invalid syntax
```

### **Step 2: Fix Server Component Errors**
```bash
# Option A: Add 'use client' to all 5 files
# Option B: Remove ssr: false from all 5 files
# Option C: Remove dynamic imports entirely
```

### **Step 3: Fix Missing Module**
```bash
# Edit app/api/knowledge/query/route.ts
# Remove or comment out the ConflictResolver import
```

### **Step 4: Test Build**
```bash
npm run build
# Expected: ✅ Build succeeds
```

### **Step 5: Deploy to Vercel**
```bash
vercel --prod
# Expected: ✅ Deployment succeeds
```

---

## 📋 VERIFICATION CHECKLIST

After fixes:
- [ ] CSS parses without errors
- [ ] No `ssr: false` in Server Components
- [ ] No missing module imports
- [ ] `npm run build` succeeds
- [ ] Vercel deployment succeeds
- [ ] No TypeScript errors
- [ ] No linter errors

---

## 🎯 NEXT STEPS

### **Immediate (Today):**
1. Fix these 3 build errors
2. Test build locally
3. Deploy to Vercel
4. Commit fixes to GitHub

### **After Fixes (Fresh Context):**
1. Start Phase 66: Data Residency & GDPR
2. Continue systematic implementation
3. Maintain quality standards (tests, coverage, docs)

---

## 📊 IMPACT ANALYSIS

**Severity:** 🔴 **CRITICAL** (blocks deployment)  
**Effort:** 🟡 **LOW** (~15-30 minutes)  
**Risk:** 🟢 **LOW** (straightforward fixes)  

**These are quick fixes that shouldn't introduce new issues.**

---

## 💡 ADDITIONAL NOTES

### **Next.js 16 Migration:**
The `ssr: false` errors are due to Next.js 16's stricter Server Component rules. This is a good thing - it enforces better architecture.

**Recommendation:** Convert to Client Components by adding `'use client'` at the top of each file.

### **CSS Error:**
The escaped class name syntax might have worked in an older Next.js version but is now rejected by Turbopack.

**Recommendation:** Use attribute selector `[class*="..."]` or fix the escape syntax.

---

**Fix these 3 errors, then you're ready for Phase 66!** 🚀
