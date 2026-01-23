-- Ensure oauth_tokens table exists and has correct structure
-- This migration ensures the table is created even if previous migrations failed

-- Create oauth_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_type TEXT NOT NULL CHECK (service_type IN ('google_calendar', 'google_sheets')),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT oauth_tokens_service_type_unique UNIQUE (service_type)
);

-- Create index for faster lookups (IF NOT EXISTS handles duplicates)
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_service_type ON oauth_tokens(service_type);

-- Create trigger to update updated_at (drop and recreate to ensure it exists)
DROP TRIGGER IF EXISTS update_oauth_tokens_updated_at ON oauth_tokens;
CREATE TRIGGER update_oauth_tokens_updated_at
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate with correct syntax)
DROP POLICY IF EXISTS "Authenticated users can view oauth tokens" ON oauth_tokens;
DROP POLICY IF EXISTS "Authenticated users can insert oauth tokens" ON oauth_tokens;
DROP POLICY IF EXISTS "Authenticated users can update oauth tokens" ON oauth_tokens;
DROP POLICY IF EXISTS "Authenticated users can delete oauth tokens" ON oauth_tokens;

-- RLS Policies for oauth_tokens - all authenticated users can read/update (company-wide integration)
-- Using auth.uid() IS NOT NULL is more reliable than auth.role()
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
