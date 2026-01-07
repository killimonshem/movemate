-- Update registrations table for user tracking and archiving
-- Adds audit trail and archiving support

-- Add new columns to registrations table
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS registered_by UUID REFERENCES users(id);
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(id);
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_registrations_venue_created ON registrations(venue_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registrations_archived ON registrations(is_archived, venue_id) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_registrations_phone ON registrations(phone);
CREATE INDEX IF NOT EXISTS idx_registrations_reg ON registrations(reg);

-- Enable Row Level Security
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for registrations

-- Super admins can view all registrations
CREATE POLICY "Super admins can view all registrations" ON registrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true
    )
  );

-- Venue admins can view registrations for their venue
CREATE POLICY "Venue admins can view own venue registrations" ON registrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'venue_admin'
        AND users.venue_id = registrations.venue_id
        AND users.is_active = true
    )
  );

-- Public can insert registrations (for self-registration)
CREATE POLICY "Public can insert registrations" ON registrations
  FOR INSERT
  WITH CHECK (true);

-- Super admins can update all registrations
CREATE POLICY "Super admins can update all registrations" ON registrations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true
    )
  );

-- Venue admins can update their venue registrations
CREATE POLICY "Venue admins can update own venue registrations" ON registrations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'venue_admin'
        AND users.venue_id = registrations.venue_id
        AND users.is_active = true
    )
  );

-- Super admins can delete all registrations
CREATE POLICY "Super admins can delete all registrations" ON registrations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true
    )
  );

-- Venue admins can delete their venue registrations
CREATE POLICY "Venue admins can delete own venue registrations" ON registrations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'venue_admin'
        AND users.venue_id = registrations.venue_id
        AND users.is_active = true
    )
  );

-- Trigger to auto-update updated_at
CREATE TRIGGER update_registrations_updated_at
  BEFORE UPDATE ON registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to set archived_at when is_archived changes to true
CREATE OR REPLACE FUNCTION set_archived_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_archived = true AND OLD.is_archived = false THEN
    NEW.archived_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_registrations_archived_timestamp
  BEFORE UPDATE ON registrations
  FOR EACH ROW
  WHEN (NEW.is_archived IS DISTINCT FROM OLD.is_archived)
  EXECUTE FUNCTION set_archived_timestamp();

COMMENT ON COLUMN registrations.registered_by IS 'User who created this registration (NULL for public self-registrations)';
COMMENT ON COLUMN registrations.is_archived IS 'Soft delete flag for archiving old registrations';
