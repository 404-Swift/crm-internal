-- Final fix for oauth_tokens constraint - ensures it exists and is properly named
-- This migration will work even if previous migrations partially ran

-- First, ensure the table exists
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_type TEXT NOT NULL CHECK (service_type IN ('google_calendar', 'google_sheets')),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drop ALL possible constraint names that might exist
DO $$ 
DECLARE
  constraint_name text;
BEGIN
  -- Get all unique constraints on service_type
  FOR constraint_name IN 
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'oauth_tokens'::regclass 
    AND contype = 'u'
    AND array_length(conkey, 1) = 1
    AND (SELECT attname FROM pg_attribute WHERE attrelid = 'oauth_tokens'::regclass AND attnum = conkey[1]) = 'service_type'
  LOOP
    EXECUTE format('ALTER TABLE oauth_tokens DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

-- Now add the properly named constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'oauth_tokens_service_type_unique' 
    AND conrelid = 'oauth_tokens'::regclass
  ) THEN
    ALTER TABLE oauth_tokens 
      ADD CONSTRAINT oauth_tokens_service_type_unique UNIQUE (service_type);
  END IF;
END $$;

-- Verify the constraint exists (this will error if it doesn't, helping debug)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'oauth_tokens_service_type_unique' 
    AND conrelid = 'oauth_tokens'::regclass
  ) THEN
    RAISE EXCEPTION 'Failed to create oauth_tokens_service_type_unique constraint';
  END IF;
END $$;
