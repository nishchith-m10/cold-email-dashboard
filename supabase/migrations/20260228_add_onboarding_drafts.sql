/**
 * Add drafts JSONB column to genesis.onboarding_progress table.
 * Stores partial form data keyed by stage name so users can resume
 * mid-step without losing input.
 *
 * Example value: { "brand_info": { "companyName": "Acme", "website": "https://acme.com" } }
 */

BEGIN;

ALTER TABLE genesis.onboarding_progress
ADD COLUMN IF NOT EXISTS drafts JSONB NOT NULL DEFAULT '{}'::JSONB;

COMMENT ON COLUMN genesis.onboarding_progress.drafts IS
  'JSONB object keyed by stage name containing partial form data for auto-save / resume';

COMMIT;
