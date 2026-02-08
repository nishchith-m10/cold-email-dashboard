-- ============================================
-- PHASE 44: GOD MODE - SCALE HEALTH MONITORING
-- ============================================
-- Tables: scale_metrics, scale_alerts, alert_preferences, alert_history
-- Functions: 6 check functions + runner
-- RLS: service_role only (admin routes use supabaseAdmin)
-- ============================================

-- Ensure genesis schema exists
CREATE SCHEMA IF NOT EXISTS genesis;

-- ============================================
-- TABLE 1: Scale Metrics History
-- Stores daily snapshots for trend analysis & runway calculations
-- ============================================
CREATE TABLE IF NOT EXISTS genesis.scale_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Partition metrics
    partition_count INTEGER NOT NULL DEFAULT 0,
    largest_partition_rows BIGINT,
    largest_partition_name TEXT,
    avg_partition_rows BIGINT,
    
    -- Storage metrics
    total_size_gb NUMERIC(10,2),
    index_size_gb NUMERIC(10,2),
    table_size_gb NUMERIC(10,2),
    
    -- Performance metrics
    p95_latency_ms NUMERIC(10,2),
    p99_latency_ms NUMERIC(10,2),
    slow_query_count BIGINT,
    
    -- DO capacity
    total_do_accounts INTEGER,
    total_droplet_capacity INTEGER,
    total_droplets_active INTEGER,
    do_utilization_pct NUMERIC(5,2),
    
    -- Financial
    total_wallet_balance_usd NUMERIC(10,2),
    daily_wallet_burn_usd NUMERIC(10,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(metric_date)
);

CREATE INDEX IF NOT EXISTS idx_scale_metrics_date 
    ON genesis.scale_metrics(metric_date DESC);

-- ============================================
-- TABLE 2: Scale Alerts
-- Stores active alerts triggered by threshold breaches
-- ============================================
CREATE TABLE IF NOT EXISTS genesis.scale_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('YELLOW', 'RED')),
    
    metric_name TEXT NOT NULL,
    current_value TEXT NOT NULL,
    threshold_value TEXT NOT NULL,
    runway_days INTEGER,
    
    workspace_id TEXT,
    partition_name TEXT,
    
    recommendation TEXT NOT NULL,
    remediation_link TEXT,
    
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'ignored')),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by TEXT,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scale_alerts_status 
    ON genesis.scale_alerts(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_scale_alerts_severity 
    ON genesis.scale_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_scale_alerts_type 
    ON genesis.scale_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_scale_alerts_workspace 
    ON genesis.scale_alerts(workspace_id) WHERE workspace_id IS NOT NULL;

-- ============================================
-- TABLE 3: Alert Preferences
-- Admin-configurable notification settings
-- ============================================
CREATE TABLE IF NOT EXISTS genesis.alert_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id TEXT NOT NULL,
    
    enable_email BOOLEAN DEFAULT TRUE,
    enable_telegram BOOLEAN DEFAULT FALSE,
    
    notify_yellow BOOLEAN DEFAULT TRUE,
    notify_red BOOLEAN DEFAULT TRUE,
    
    daily_digest_enabled BOOLEAN DEFAULT TRUE,
    daily_digest_time TIME DEFAULT '09:00:00',
    
    telegram_bot_token TEXT,
    telegram_chat_id TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(admin_user_id)
);

-- ============================================
-- TABLE 4: Alert History (delivery audit trail)
-- ============================================
CREATE TABLE IF NOT EXISTS genesis.alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric TEXT NOT NULL,
    level TEXT NOT NULL,
    message TEXT,
    channels_sent TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_history_created 
    ON genesis.alert_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_metric 
    ON genesis.alert_history(metric);

-- ============================================
-- FUNCTION: Check Partition Count
-- ============================================
CREATE OR REPLACE FUNCTION genesis.check_partition_count()
RETURNS TABLE (
    metric TEXT,
    current_value BIGINT,
    threshold_yellow BIGINT,
    threshold_red BIGINT,
    status TEXT,
    days_until_red INTEGER
) AS $$
DECLARE
    v_count BIGINT;
    v_prev_count BIGINT;
    v_growth_rate NUMERIC;
    v_days_until_red INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'genesis'
      AND c.relkind = 'r'
      AND c.relispartition = TRUE;
    
    SELECT partition_count INTO v_prev_count
    FROM genesis.scale_metrics 
    WHERE metric_date <= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY metric_date DESC
    LIMIT 1;
    
    IF v_prev_count IS NOT NULL AND v_prev_count > 0 THEN
        v_growth_rate := (v_count - v_prev_count) / 7.0;
    ELSE
        v_growth_rate := 0;
    END IF;
    
    IF v_growth_rate > 0 THEN
        v_days_until_red := ((12000 - v_count) / v_growth_rate)::INTEGER;
    ELSE
        v_days_until_red := NULL;
    END IF;
    
    RETURN QUERY SELECT
        'partition_count'::TEXT,
        v_count,
        10000::BIGINT,
        12000::BIGINT,
        CASE 
            WHEN v_count >= 12000 THEN 'RED'
            WHEN v_count >= 10000 THEN 'YELLOW'
            ELSE 'GREEN'
        END::TEXT,
        v_days_until_red;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Check Largest Partition
-- ============================================
CREATE OR REPLACE FUNCTION genesis.check_largest_partition()
RETURNS TABLE (
    metric TEXT,
    partition_name TEXT,
    row_count BIGINT,
    size_gb NUMERIC,
    threshold_yellow BIGINT,
    threshold_red BIGINT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH partition_sizes AS (
        SELECT 
            c.relname::TEXT AS part_name,
            c.reltuples::BIGINT AS estimated_rows,
            (pg_total_relation_size(c.oid)::NUMERIC / (1024*1024*1024)) AS size_gigabytes
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'genesis'
          AND c.relkind = 'r'
          AND c.relispartition = TRUE
        ORDER BY c.reltuples DESC
        LIMIT 1
    )
    SELECT
        'largest_partition'::TEXT,
        COALESCE(ps.part_name, 'none'),
        COALESCE(ps.estimated_rows, 0::BIGINT),
        COALESCE(ps.size_gigabytes, 0::NUMERIC),
        500000::BIGINT,
        1000000::BIGINT,
        CASE 
            WHEN COALESCE(ps.estimated_rows, 0) >= 1000000 THEN 'RED'
            WHEN COALESCE(ps.estimated_rows, 0) >= 500000 THEN 'YELLOW'
            ELSE 'GREEN'
        END::TEXT
    FROM (SELECT 1) AS dummy
    LEFT JOIN partition_sizes ps ON TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Check Query Latency
-- Falls back gracefully if pg_stat_statements is not enabled
-- ============================================
CREATE OR REPLACE FUNCTION genesis.check_query_latency()
RETURNS TABLE (
    metric TEXT,
    p95_latency_ms NUMERIC,
    p99_latency_ms NUMERIC,
    threshold_yellow NUMERIC,
    threshold_red NUMERIC,
    status TEXT,
    slow_query_count BIGINT
) AS $$
DECLARE
    v_has_extension BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
    ) INTO v_has_extension;
    
    IF NOT v_has_extension THEN
        RETURN QUERY SELECT
            'query_p95_latency'::TEXT,
            NULL::NUMERIC, NULL::NUMERIC,
            100.0::NUMERIC, 200.0::NUMERIC,
            'unavailable'::TEXT, NULL::BIGINT;
        RETURN;
    END IF;
    
    RETURN QUERY
    WITH latency_stats AS (
        SELECT 
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY mean_exec_time) AS v_p95,
            PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY mean_exec_time) AS v_p99,
            COUNT(*) FILTER (WHERE mean_exec_time > 200) AS v_slow
        FROM pg_stat_statements
        WHERE query LIKE '%genesis%'
          AND calls > 10
    )
    SELECT
        'query_p95_latency'::TEXT,
        COALESCE(ls.v_p95, 0)::NUMERIC,
        COALESCE(ls.v_p99, 0)::NUMERIC,
        100.0::NUMERIC,
        200.0::NUMERIC,
        CASE 
            WHEN COALESCE(ls.v_p95, 0) >= 200 THEN 'RED'
            WHEN COALESCE(ls.v_p95, 0) >= 100 THEN 'YELLOW'
            ELSE 'GREEN'
        END::TEXT,
        COALESCE(ls.v_slow, 0)::BIGINT
    FROM latency_stats ls;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Check Storage Growth
-- ============================================
CREATE OR REPLACE FUNCTION genesis.check_storage_growth()
RETURNS TABLE (
    metric TEXT,
    current_size_gb NUMERIC,
    growth_rate_gb_per_day NUMERIC,
    days_until_1tb INTEGER,
    threshold_yellow NUMERIC,
    threshold_red NUMERIC,
    status TEXT
) AS $$
DECLARE
    v_current_size NUMERIC;
    v_prev_size NUMERIC;
    v_growth_rate NUMERIC;
    v_days_until_red INTEGER;
BEGIN
    SELECT COALESCE(SUM(pg_total_relation_size(c.oid))::NUMERIC / (1024*1024*1024), 0)
    INTO v_current_size
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'genesis';
    
    SELECT total_size_gb INTO v_prev_size
    FROM genesis.scale_metrics
    WHERE metric_date <= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY metric_date DESC
    LIMIT 1;
    
    IF v_prev_size IS NOT NULL AND v_prev_size > 0 THEN
        v_growth_rate := (v_current_size - v_prev_size) / 7.0;
    ELSE
        v_growth_rate := 0;
    END IF;
    
    IF v_growth_rate > 0 THEN
        v_days_until_red := ((1000 - v_current_size) / v_growth_rate)::INTEGER;
    ELSE
        v_days_until_red := NULL;
    END IF;
    
    RETURN QUERY SELECT
        'storage_growth'::TEXT,
        v_current_size,
        v_growth_rate,
        v_days_until_red,
        500.0::NUMERIC,
        1000.0::NUMERIC,
        CASE 
            WHEN v_current_size >= 1000 THEN 'RED'
            WHEN v_current_size >= 500 THEN 'YELLOW'
            ELSE 'GREEN'
        END::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Check Oversized Partitions
-- ============================================
CREATE OR REPLACE FUNCTION genesis.check_oversized_partitions()
RETURNS TABLE (
    partition_name TEXT,
    workspace_id TEXT,
    row_count BIGINT,
    size_gb NUMERIC,
    status TEXT,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.relname::TEXT,
        REGEXP_REPLACE(c.relname::TEXT, 'leads_p_', ''),
        c.reltuples::BIGINT,
        (pg_total_relation_size(c.oid)::NUMERIC / (1024*1024*1024)),
        CASE 
            WHEN c.reltuples >= 1000000 THEN 'RED'
            WHEN c.reltuples >= 500000 THEN 'YELLOW'
            ELSE 'GREEN'
        END::TEXT,
        CASE 
            WHEN c.reltuples >= 1000000 THEN 'URGENT: Archive data or implement sub-partitioning'
            WHEN c.reltuples >= 500000 THEN 'WARNING: Monitor query performance, plan archival'
            ELSE 'OK: Within normal operating range'
        END::TEXT
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'genesis'
      AND c.relkind = 'r'
      AND c.relispartition = TRUE
      AND c.reltuples >= 500000
    ORDER BY c.reltuples DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Run All Scale Health Checks
-- Upserts daily snapshot, returns summary
-- ============================================
CREATE OR REPLACE FUNCTION genesis.run_scale_health_checks()
RETURNS TABLE (
    check_name TEXT,
    check_status TEXT,
    alerts_created INTEGER,
    duration_ms INTEGER
) AS $$
DECLARE
    v_start TIMESTAMPTZ := clock_timestamp();
    v_pc RECORD;
    v_lp RECORD;
    v_ql RECORD;
    v_sg RECORD;
BEGIN
    SELECT * INTO v_pc FROM genesis.check_partition_count();
    SELECT * INTO v_lp FROM genesis.check_largest_partition();
    SELECT * INTO v_ql FROM genesis.check_query_latency();
    SELECT * INTO v_sg FROM genesis.check_storage_growth();
    
    INSERT INTO genesis.scale_metrics (
        metric_date, partition_count,
        largest_partition_rows, largest_partition_name,
        total_size_gb, p95_latency_ms, p99_latency_ms, slow_query_count
    ) VALUES (
        CURRENT_DATE,
        COALESCE(v_pc.current_value, 0),
        COALESCE(v_lp.row_count, 0),
        v_lp.partition_name,
        v_sg.current_size_gb,
        v_ql.p95_latency_ms,
        v_ql.p99_latency_ms,
        v_ql.slow_query_count
    )
    ON CONFLICT (metric_date) DO UPDATE SET
        partition_count = EXCLUDED.partition_count,
        largest_partition_rows = EXCLUDED.largest_partition_rows,
        largest_partition_name = EXCLUDED.largest_partition_name,
        total_size_gb = EXCLUDED.total_size_gb,
        p95_latency_ms = EXCLUDED.p95_latency_ms,
        p99_latency_ms = EXCLUDED.p99_latency_ms,
        slow_query_count = EXCLUDED.slow_query_count;
    
    RETURN QUERY SELECT
        'scale_health_checks'::TEXT,
        'completed'::TEXT,
        0::INTEGER,
        EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start)::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RLS: Enable on all tables, service_role full access
-- (These tables are only accessed via supabaseAdmin in API routes)
-- ============================================
ALTER TABLE genesis.scale_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.scale_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis.alert_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_scale_metrics') THEN
        CREATE POLICY service_role_scale_metrics ON genesis.scale_metrics
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_scale_alerts') THEN
        CREATE POLICY service_role_scale_alerts ON genesis.scale_alerts
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_alert_preferences') THEN
        CREATE POLICY service_role_alert_preferences ON genesis.alert_preferences
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_alert_history') THEN
        CREATE POLICY service_role_alert_history ON genesis.alert_history
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- pg_cron: Schedule health checks every 6 hours
-- Wrapped in exception block for environments without pg_cron
-- ============================================
DO $outer$ BEGIN
    PERFORM cron.schedule(
        'phase44-scale-health-checks',
        '0 */6 * * *',
        'SELECT genesis.run_scale_health_checks();'
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not available. Schedule health checks via Vercel Cron or external scheduler: POST /api/admin/scale-health/run-checks';
END $outer$;
