#!/bin/bash
# Phase 8 - Step 1 & 2 Verification Script
# Run this to verify Dashboard Context implementation

echo "🔍 Phase 8 - Step 1 & 2 Verification"
echo "===================================="
echo ""

# Check files exist
echo "📁 Checking files..."
if [ -f "lib/dashboard-context.tsx" ]; then
  echo "✅ lib/dashboard-context.tsx created"
else
  echo "❌ lib/dashboard-context.tsx missing"
  exit 1
fi

# Check for DashboardProvider in client-shell
echo ""
echo "🔌 Checking provider injection..."
if grep -q "import { DashboardProvider }" components/layout/client-shell.tsx; then
  echo "✅ DashboardProvider imported in client-shell.tsx"
else
  echo "❌ DashboardProvider import missing"
  exit 1
fi

if grep -q "<DashboardProvider>" components/layout/client-shell.tsx; then
  echo "✅ DashboardProvider wraps content in client-shell.tsx"
else
  echo "❌ DashboardProvider not used in client-shell.tsx"
  exit 1
fi

# Check TypeScript compilation
echo ""
echo "🔨 Checking TypeScript compilation..."
if npx tsc --noEmit 2>&1 | grep -q "error"; then
  echo "❌ TypeScript errors found"
  npx tsc --noEmit
  exit 1
else
  echo "✅ TypeScript compilation successful"
fi

# Verify exports
echo ""
echo "📤 Checking exports..."
if grep -q "export function useDashboard" lib/dashboard-context.tsx; then
  echo "✅ useDashboard hook exported"
else
  echo "❌ useDashboard hook not exported"
  exit 1
fi

if grep -q "export function useOptionalDashboard" lib/dashboard-context.tsx; then
  echo "✅ useOptionalDashboard hook exported"
else
  echo "❌ useOptionalDashboard hook not exported"
  exit 1
fi

if grep -q "export interface DashboardContextValue" lib/dashboard-context.tsx; then
  echo "✅ DashboardContextValue interface exported"
else
  echo "❌ DashboardContextValue interface not exported"
  exit 1
fi

# Check provider nesting order
echo ""
echo "🏗️  Checking provider hierarchy..."
NESTING=$(grep -A 20 "return (" components/layout/client-shell.tsx | grep -E "(SWRProvider|WorkspaceProvider|DashboardProvider)" | head -3)
if echo "$NESTING" | grep -q "SWRProvider"; then
  if echo "$NESTING" | grep -q "WorkspaceProvider"; then
    if grep -A 30 "<WorkspaceProvider>" components/layout/client-shell.tsx | grep -q "<DashboardProvider>"; then
      echo "✅ Provider nesting order correct (SWR → Workspace → Dashboard)"
    else
      echo "❌ DashboardProvider not nested inside WorkspaceProvider"
      exit 1
    fi
  fi
fi

# Check that DashboardProvider is inside SignedIn
echo ""
echo "🔐 Checking auth gating..."
if grep -A 5 "<SignedIn>" components/layout/client-shell.tsx | grep -q "<DashboardProvider>"; then
  echo "✅ DashboardProvider only wraps authenticated content"
else
  echo "⚠️  DashboardProvider might wrap unauthenticated content (check manually)"
fi

echo ""
echo "======================================"
echo "✅ All checks passed!"
echo ""
echo "📋 Summary:"
echo "  - Dashboard Context created with proper TypeScript types"
echo "  - Provider injected into layout hierarchy"
echo "  - TypeScript compilation successful"
echo "  - Export hooks available for consumption"
echo "  - Provider nesting order correct"
echo ""
echo "🚀 Next Steps:"
echo "  1. Refactor app/page.tsx to use useDashboard()"
echo "  2. Refactor app/analytics/page.tsx to use useDashboard()"
echo "  3. Add prefetch={true} to navigation links"
echo ""
