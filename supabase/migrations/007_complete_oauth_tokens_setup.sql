-- Complete setup for oauth_tokens table
-- This migration ensures everything is properly configured

-- Step 1: Create table if it doesn't exist (without constraint first)
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_type TEXT NOT NULL CHECK (service_type IN ('google_calendar', 'google_sheets')),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Drop any existing unique constraints on service_type
DO $$ 
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN 
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'oauth_tokens'::regclass 
    AND contype = 'u'
  LOOP
    -- Check if this constraint is on service_type
    IF EXISTS (
      SELECT 1 
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      WHERE c.conname = constraint_record.conname
      AND c.conrelid = 'oauth_tokens'::regclass
      AND a.attname = 'service_type'
    ) THEN
      EXECUTE format('ALTER TABLE oauth_tokens DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
    END IF;
  END LOOP;
END $$;

-- Step 3: Add the named unique constraint
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

-- Step 4: Create index
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_service_type ON oauth_tokens(service_type);

-- Step 5: Create trigger
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_oauth_tokens_updated_at' 
    AND tgrelid = 'oauth_tokens'::regclass
  ) THEN
    CREATE TRIGGER update_oauth_tokens_updated_at
      BEFORE UPDATE ON oauth_tokens
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Step 6: Enable RLS
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Step 7: Drop and recreate policies with correct syntax
DROP POLICY IF EXISTS "Authenticated users can view oauth tokens" ON oauth_tokens;
DROP POLICY IF EXISTS "Authenticated users can insert oauth tokens" ON oauth_tokens;
DROP POLICY IF EXISTS "Authenticated users can update oauth tokens" ON oauth_tokens;
DROP POLICY IF EXISTS "Authenticated users can delete oauth tokens" ON oauth_tokens;

CREATE POLICY "Authenticated users can view oauth tokens"
  ON oauth_tokens FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert oauth tokens"
  ON oauth_tokens FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update oauth tokens"
  ON oauth_tokens FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete oauth tokens"
  ON oauth_tokens FOR DELETE
  USING (auth.uid() IS NOT NULL);
