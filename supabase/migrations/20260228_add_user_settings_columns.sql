-- Add missing columns to user_settings table
-- currency was referenced by currency-context but never added to the schema

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD'
    CHECK (currency IN ('USD', 'EUR', 'GBP', 'JPY'));

COMMENT ON COLUMN user_settings.currency IS 'Preferred display currency: USD, EUR, GBP, or JPY';
