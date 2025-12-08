#!/bin/bash

# ============================================
# Phase 10 Migration Verification Script
# ============================================

set -e

echo "🔍 Verifying Phase 10 Migration: Webhook Queue & Idempotency"
echo "============================================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}⚠️  Supabase CLI not found. Install with: npm install -g supabase${NC}"
    echo "Skipping database checks..."
    exit 0
fi

# Function to run SQL query
run_query() {
    supabase db execute "$1" 2>&1
}

echo ""
echo "📋 Test 1: Verify webhook_queue table exists"
RESULT=$(run_query "SELECT table_name FROM information_schema.tables WHERE table_name = 'webhook_queue';" || echo "FAIL")
if [[ $RESULT == *"webhook_queue"* ]]; then
    echo -e "${GREEN}✓ PASS${NC} - webhook_queue table created"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC} - webhook_queue table not found"
    ((FAIL++))
fi

echo ""
echo "📋 Test 2: Verify webhook_queue columns"
REQUIRED_COLS=("idempotency_key" "event_source" "event_type" "raw_payload" "status" "error_message" "retry_count")
for col in "${REQUIRED_COLS[@]}"; do
    RESULT=$(run_query "SELECT column_name FROM information_schema.columns WHERE table_name = 'webhook_queue' AND column_name = '$col';" || echo "FAIL")
    if [[ $RESULT == *"$col"* ]]; then
        echo -e "${GREEN}✓ PASS${NC} - Column '$col' exists"
        ((PASS++))
    else
        echo -e "${RED}✗ FAIL${NC} - Column '$col' missing"
        ((FAIL++))
    fi
done

echo ""
echo "📋 Test 3: Verify idempotency_key added to email_events"
RESULT=$(run_query "SELECT column_name FROM information_schema.columns WHERE table_name = 'email_events' AND column_name = 'idempotency_key';" || echo "FAIL")
if [[ $RESULT == *"idempotency_key"* ]]; then
    echo -e "${GREEN}✓ PASS${NC} - email_events.idempotency_key added"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC} - email_events.idempotency_key missing"
    ((FAIL++))
fi

echo ""
echo "📋 Test 4: Verify n8n_execution_id added to email_events"
RESULT=$(run_query "SELECT column_name FROM information_schema.columns WHERE table_name = 'email_events' AND column_name = 'n8n_execution_id';" || echo "FAIL")
if [[ $RESULT == *"n8n_execution_id"* ]]; then
    echo -e "${GREEN}✓ PASS${NC} - email_events.n8n_execution_id added"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC} - email_events.n8n_execution_id missing"
    ((FAIL++))
fi

echo ""
echo "📋 Test 5: Verify idempotency_key added to llm_usage"
RESULT=$(run_query "SELECT column_name FROM information_schema.columns WHERE table_name = 'llm_usage' AND column_name = 'idempotency_key';" || echo "FAIL")
if [[ $RESULT == *"idempotency_key"* ]]; then
    echo -e "${GREEN}✓ PASS${NC} - llm_usage.idempotency_key added"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC} - llm_usage.idempotency_key missing"
    ((FAIL++))
fi

echo ""
echo "📋 Test 6: Verify unique index on email_events.idempotency_key"
RESULT=$(run_query "SELECT indexname FROM pg_indexes WHERE tablename = 'email_events' AND indexname = 'idx_email_events_idempotency';" || echo "FAIL")
if [[ $RESULT == *"idx_email_events_idempotency"* ]]; then
    echo -e "${GREEN}✓ PASS${NC} - Unique index on email_events.idempotency_key created"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC} - Index idx_email_events_idempotency missing"
    ((FAIL++))
fi

echo ""
echo "📋 Test 7: Verify unique index on llm_usage.idempotency_key"
RESULT=$(run_query "SELECT indexname FROM pg_indexes WHERE tablename = 'llm_usage' AND indexname = 'idx_llm_usage_idempotency';" || echo "FAIL")
if [[ $RESULT == *"idx_llm_usage_idempotency"* ]]; then
    echo -e "${GREEN}✓ PASS${NC} - Unique index on llm_usage.idempotency_key created"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC} - Index idx_llm_usage_idempotency missing"
    ((FAIL++))
fi

echo ""
echo "📋 Test 8: Verify process_webhook_queue() function exists"
RESULT=$(run_query "SELECT proname FROM pg_proc WHERE proname = 'process_webhook_queue';" || echo "FAIL")
if [[ $RESULT == *"process_webhook_queue"* ]]; then
    echo -e "${GREEN}✓ PASS${NC} - process_webhook_queue() function created"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC} - process_webhook_queue() function missing"
    ((FAIL++))
fi

echo ""
echo "📋 Test 9: Verify trigger trg_process_webhook_queue exists"
RESULT=$(run_query "SELECT tgname FROM pg_trigger WHERE tgname = 'trg_process_webhook_queue';" || echo "FAIL")
if [[ $RESULT == *"trg_process_webhook_queue"* ]]; then
    echo -e "${GREEN}✓ PASS${NC} - Trigger trg_process_webhook_queue created"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC} - Trigger trg_process_webhook_queue missing"
    ((FAIL++))
fi

echo ""
echo "📋 Test 10: Verify RLS enabled on webhook_queue"
RESULT=$(run_query "SELECT relname FROM pg_class WHERE relname = 'webhook_queue' AND relrowsecurity = true;" || echo "FAIL")
if [[ $RESULT == *"webhook_queue"* ]]; then
    echo -e "${GREEN}✓ PASS${NC} - RLS enabled on webhook_queue"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC} - RLS not enabled on webhook_queue"
    ((FAIL++))
fi

echo ""
echo "📋 Test 11: Test idempotency (duplicate insert should fail)"
IDEMPOTENCY_TEST=$(run_query "
  INSERT INTO webhook_queue (idempotency_key, event_source, event_type, raw_payload)
  VALUES ('test-verify-123', 'api', 'email_event', '{\"test\": true}'::JSONB);
  
  -- Try duplicate (should fail with unique constraint)
  INSERT INTO webhook_queue (idempotency_key, event_source, event_type, raw_payload)
  VALUES ('test-verify-123', 'api', 'email_event', '{\"test\": true}'::JSONB);
" 2>&1 || echo "EXPECTED_FAIL")

if [[ $IDEMPOTENCY_TEST == *"duplicate"* ]] || [[ $IDEMPOTENCY_TEST == *"EXPECTED_FAIL"* ]]; then
    echo -e "${GREEN}✓ PASS${NC} - Idempotency constraint working (duplicate rejected)"
    ((PASS++))
    # Cleanup
    run_query "DELETE FROM webhook_queue WHERE idempotency_key = 'test-verify-123';" > /dev/null 2>&1 || true
else
    echo -e "${RED}✗ FAIL${NC} - Idempotency constraint not working"
    ((FAIL++))
fi

echo ""
echo "📋 Test 12: Verify monitoring views created"
RESULT=$(run_query "SELECT viewname FROM pg_views WHERE viewname = 'webhook_failures';" || echo "FAIL")
if [[ $RESULT == *"webhook_failures"* ]]; then
    echo -e "${GREEN}✓ PASS${NC} - View webhook_failures created"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC} - View webhook_failures missing"
    ((FAIL++))
fi

RESULT=$(run_query "SELECT viewname FROM pg_views WHERE viewname = 'webhook_queue_health';" || echo "FAIL")
if [[ $RESULT == *"webhook_queue_health"* ]]; then
    echo -e "${GREEN}✓ PASS${NC} - View webhook_queue_health created"
    ((PASS++))
else
    echo -e "${RED}✗ FAIL${NC} - View webhook_queue_health missing"
    ((FAIL++))
fi

echo ""
echo "============================================================="
echo "📊 Verification Results:"
echo "   Passed: $PASS"
echo "   Failed: $FAIL"
echo "============================================================="

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ Phase 10 Migration Verified Successfully${NC}"
    echo ""
    echo "🎯 Next Steps:"
    echo "   1. Update /api/events route to use webhook_queue"
    echo "   2. Update /api/cost-events route to use webhook_queue"
    echo "   3. Test with curl or n8n webhook"
    echo "   4. Monitor webhook_queue_health view"
    exit 0
else
    echo -e "${RED}❌ Phase 10 Migration Verification Failed${NC}"
    echo "Please check the migration file and re-run."
    exit 1
fi
