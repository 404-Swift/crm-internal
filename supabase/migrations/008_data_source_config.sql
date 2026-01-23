-- Create data_source_config table to store company-wide source of truth preference
-- Similar to oauth_tokens, this is a single-row configuration table
-- Uses a singleton column with UNIQUE constraint to enforce single row

-- Step 1: Create table with singleton column
CREATE TABLE IF NOT EXISTS data_source_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  singleton BOOLEAN NOT NULL DEFAULT true,
  source_type TEXT NOT NULL CHECK (source_type IN ('supabase', 'google_sheets')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT data_source_config_single_row UNIQUE (singleton)
);

-- Step 2: If table exists without singleton column, add it
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'data_source_config'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'data_source_config' AND column_name = 'singleton'
  ) THEN
    -- Add singleton column
    ALTER TABLE data_source_config 
      ADD COLUMN singleton BOOLEAN NOT NULL DEFAULT true;
    
    -- Add unique constraint
    CREATE UNIQUE INDEX IF NOT EXISTS data_source_config_single_row_idx 
      ON data_source_config ((singleton));
    
    -- Delete any extra rows (keep only one)
    DELETE FROM data_source_config 
    WHERE id NOT IN (
      SELECT id FROM data_source_config LIMIT 1
    );
  END IF;
END $$;

-- Step 3: Create index
CREATE INDEX IF NOT EXISTS idx_data_source_config_source_type ON data_source_config(source_type);

-- Step 4: Create trigger for updated_at
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_data_source_config_updated_at' 
    AND tgrelid = 'data_source_config'::regclass
  ) THEN
    CREATE TRIGGER update_data_source_config_updated_at
      BEFORE UPDATE ON data_source_config
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Step 5: Enable RLS
ALTER TABLE data_source_config ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies (all authenticated users can read/update)
DROP POLICY IF EXISTS "Authenticated users can view data source config" ON data_source_config;
DROP POLICY IF EXISTS "Authenticated users can insert data source config" ON data_source_config;
DROP POLICY IF EXISTS "Authenticated users can update data source config" ON data_source_config;
DROP POLICY IF EXISTS "Authenticated users can delete data source config" ON data_source_config;

CREATE POLICY "Authenticated users can view data source config"
  ON data_source_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert data source config"
  ON data_source_config FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update data source config"
  ON data_source_config FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete data source config"
  ON data_source_config FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Step 7: Insert default value if table is empty
INSERT INTO data_source_config (singleton, source_type)
SELECT true, 'supabase'
WHERE NOT EXISTS (SELECT 1 FROM data_source_config);
