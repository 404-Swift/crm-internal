-- Create oauth_tokens table to store OAuth tokens (company-wide, shared by all users)
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_type TEXT NOT NULL UNIQUE CHECK (service_type IN ('google_calendar', 'google_sheets')),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_service_type ON oauth_tokens(service_type);

-- Create trigger to update updated_at
CREATE TRIGGER update_oauth_tokens_updated_at
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for oauth_tokens - all authenticated users can read/update (company-wide integration)
CREATE POLICY "Authenticated users can view oauth tokens"
  ON oauth_tokens FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert oauth tokens"
  ON oauth_tokens FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update oauth tokens"
  ON oauth_tokens FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete oauth tokens"
  ON oauth_tokens FOR DELETE
  USING (auth.role() = 'authenticated');
