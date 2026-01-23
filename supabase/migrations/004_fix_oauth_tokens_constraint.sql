-- Fix oauth_tokens unique constraint to work with ON CONFLICT
-- First, drop the existing unique constraint if it exists (from inline UNIQUE)
DO $$ 
BEGIN
  -- Try to drop the constraint if it exists (PostgreSQL auto-names inline UNIQUE constraints)
  ALTER TABLE oauth_tokens DROP CONSTRAINT IF EXISTS oauth_tokens_service_type_key;
  ALTER TABLE oauth_tokens DROP CONSTRAINT IF EXISTS oauth_tokens_service_type_unique;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add the named unique constraint
ALTER TABLE oauth_tokens 
  ADD CONSTRAINT oauth_tokens_service_type_unique UNIQUE (service_type);
