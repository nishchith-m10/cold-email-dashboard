/**
 * GENESIS PART VI: ONBOARDING ARCHITECTURE & CAMPAIGN OPERATIONS
 * Migration: Add onboarding state tracking to workspaces table
 * 
 * Phase 60: Application Layer Architecture
 * Phase 60.B: Genesis Gateway Streamlined Onboarding
 * 
 * @see docs/plans/GENESIS_SINGULARITY_PLAN_V35.md - Part VI
 */

BEGIN;

-- ============================================
-- ADD ONBOARDING STATE COLUMNS TO WORKSPACES
-- ============================================

-- Track which onboarding stage the workspace is at
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS onboarding_stage TEXT DEFAULT 'account' 
CHECK (onboarding_stage IN (
  'account',              -- Just created
  'brand',                -- Entered brand info
  'email',                -- Connected Gmail
  'ai_keys',              -- Provided API keys
  'region',               -- Selected region/tier
  'pending_ignition',     -- Clicked ignite, awaiting risk check
  'pending_review',       -- High risk, waiting for admin
  'igniting',             -- Droplet provisioning
  'complete'              -- Fully onboarded
));

-- Track onboarding completion timestamp
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Store brand information from onboarding
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS brand_name TEXT;

ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS brand_website TEXT;

-- Track region selection
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS preferred_region TEXT DEFAULT 'nyc1';

ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS droplet_tier TEXT DEFAULT 'basic-2vcpu-4gb';

-- ============================================
-- ADD COMMENTS
-- ============================================

COMMENT ON COLUMN public.workspaces.onboarding_stage IS 
'Current onboarding stage: tracks user progress through Genesis Gateway 6-stage flow';

COMMENT ON COLUMN public.workspaces.onboarding_completed_at IS 
'Timestamp when workspace completed onboarding and became active';

COMMENT ON COLUMN public.workspaces.brand_name IS 
'Company/brand name entered during onboarding (Phase 60.B Stage 2)';

COMMENT ON COLUMN public.workspaces.brand_website IS 
'Company website URL entered during onboarding (Phase 60.B Stage 2)';

COMMENT ON COLUMN public.workspaces.preferred_region IS 
'DigitalOcean region selected during onboarding (Phase 60.B Stage 5)';

COMMENT ON COLUMN public.workspaces.droplet_tier IS 
'Droplet size slug selected during onboarding (Phase 60.B Stage 5)';

-- ============================================
-- CREATE INDEX FOR ONBOARDING QUERIES
-- ============================================

-- Index for finding workspaces pending admin review
CREATE INDEX IF NOT EXISTS idx_workspaces_onboarding_pending_review 
ON public.workspaces(onboarding_stage) 
WHERE onboarding_stage = 'pending_review';

-- Index for finding workspaces currently igniting
CREATE INDEX IF NOT EXISTS idx_workspaces_onboarding_igniting 
ON public.workspaces(onboarding_stage) 
WHERE onboarding_stage = 'igniting';

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
    -- Verify onboarding_stage column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workspaces' 
        AND column_name = 'onboarding_stage'
    ) THEN
        RAISE EXCEPTION 'Column workspaces.onboarding_stage was not created';
    END IF;
    
    -- Verify brand_name column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workspaces' 
        AND column_name = 'brand_name'
    ) THEN
        RAISE EXCEPTION 'Column workspaces.brand_name was not created';
    END IF;
    
    -- Verify index exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'workspaces' 
        AND indexname = 'idx_workspaces_onboarding_pending_review'
    ) THEN
        RAISE EXCEPTION 'Index idx_workspaces_onboarding_pending_review was not created';
    END IF;
    
    RAISE NOTICE '✓ Part VI onboarding columns added successfully to workspaces table';
END $$;
