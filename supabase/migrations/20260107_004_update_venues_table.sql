-- Update venues table for enhanced management
-- Adds metadata, contact info, and administrative fields

-- Add new columns to venues table
ALTER TABLE venues ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/London';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE venues ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE venues ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Create index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_venues_is_active ON venues(is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- RLS Policies for venues
-- Super admins can do everything
CREATE POLICY "Super admins can view all venues" ON venues
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true
    )
  );

CREATE POLICY "Super admins can insert venues" ON venues
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true
    )
  );

CREATE POLICY "Super admins can update venues" ON venues
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true
    )
  );

-- Venue admins can view their own venue
CREATE POLICY "Venue admins can view own venue" ON venues
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'venue_admin'
        AND users.venue_id = venues.id
        AND users.is_active = true
    )
  );

-- Venue admins can update their own venue (limited fields)
CREATE POLICY "Venue admins can update own venue" ON venues
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'venue_admin'
        AND users.venue_id = venues.id
        AND users.is_active = true
    )
  );

-- Public can view active venues (for registration page)
CREATE POLICY "Public can view active venues" ON venues
  FOR SELECT
  USING (is_active = true);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN venues.timezone IS 'IANA timezone identifier (e.g., Europe/London) for handling BST/GMT transitions';
COMMENT ON COLUMN venues.settings IS 'JSON object for venue-specific settings (capacity, parking zones, etc.)';
