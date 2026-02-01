/**
 * PHASE 64: Remove tone column from brand_vault
 * 
 * Removes the email tone field as it's no longer needed in the brand info.
 */

-- Drop the tone column if it exists
ALTER TABLE genesis.brand_vault 
DROP COLUMN IF EXISTS tone;
