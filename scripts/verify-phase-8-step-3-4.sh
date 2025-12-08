#!/bin/bash
# Phase 8 - Step 3 & 4 Verification Script
# Verifies both pages are using useDashboard() context

echo "🔍 Phase 8 - Step 3 & 4 Verification"
echo "===================================="
echo ""

# Check page.tsx uses useDashboard
echo "📄 Checking app/page.tsx..."
if grep -q "import { useDashboard }" app/page.tsx; then
  echo "✅ page.tsx imports useDashboard"
else
  echo "❌ page.tsx does not import useDashboard"
  exit 1
fi

if grep -q "const { data, params, setDateRange, setCampaign } = useDashboard" app/page.tsx; then
  echo "✅ page.tsx uses useDashboard() hook"
else
  echo "❌ page.tsx does not use useDashboard() hook"
  exit 1
fi

if ! grep -q "useDashboardData" app/page.tsx; then
  echo "✅ page.tsx no longer calls useDashboardData directly"
else
  echo "❌ page.tsx still has useDashboardData import/call"
  exit 1
fi

if ! grep -q "useSearchParams" app/page.tsx; then
  echo "✅ page.tsx no longer uses useSearchParams"
else
  echo "❌ page.tsx still uses useSearchParams"
  exit 1
fi

# Check analytics/page.tsx uses useDashboard
echo ""
echo "📊 Checking app/analytics/page.tsx..."
if grep -q "import { useDashboard }" app/analytics/page.tsx; then
  echo "✅ analytics/page.tsx imports useDashboard"
else
  echo "❌ analytics/page.tsx does not import useDashboard"
  exit 1
fi

if grep -q "const { data, params, setDateRange, setCampaign, setProvider } = useDashboard" app/analytics/page.tsx; then
  echo "✅ analytics/page.tsx uses useDashboard() hook with setProvider"
else
  echo "❌ analytics/page.tsx does not use useDashboard() hook correctly"
  exit 1
fi

if ! grep -q "useDashboardData" app/analytics/page.tsx; then
  echo "✅ analytics/page.tsx no longer calls useDashboardData directly"
else
  echo "❌ analytics/page.tsx still has useDashboardData import/call"
  exit 1
fi

if ! grep -q "useSearchParams" app/analytics/page.tsx; then
  echo "✅ analytics/page.tsx no longer uses useSearchParams"
else
  echo "❌ analytics/page.tsx still uses useSearchParams"
  exit 1
fi

# Check build compiles
echo ""
echo "🔨 Checking TypeScript compilation..."
if npm run build > /dev/null 2>&1; then
  echo "✅ Build succeeds"
else
  echo "❌ Build failed"
  exit 1
fi

echo ""
echo "======================================"
echo "✅ All verification checks passed!"
echo ""
echo "📋 Summary:"
echo "  - Both pages use useDashboard() context hook"
echo "  - No direct useDashboardData() calls in pages"
echo "  - No manual URL param reading (useSearchParams removed)"
echo "  - TypeScript compilation successful"
echo ""
echo "🎯 Expected Runtime Behavior:"
echo "  1. Navigate Overview → Analytics (should be instant, <50ms)"
echo "  2. No new API call within 60s (SWR dedupe)"
echo "  3. Filter changes show old data while loading (smooth)"
echo "  4. Browser back/forward buttons work correctly"
echo ""
echo "🚀 Next Step:"
echo "  - Add prefetch={true} to navigation links in header.tsx"
echo "  - Run 'npm run dev' and test navigation speed"
echo ""
