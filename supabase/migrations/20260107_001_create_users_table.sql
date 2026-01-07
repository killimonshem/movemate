-- Create users table for authentication system
-- Supports three roles: user, venue_admin, super_admin

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('user', 'venue_admin', 'super_admin')),
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  email_verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Constraints
  CONSTRAINT venue_admin_needs_venue CHECK (
    (role = 'venue_admin' AND venue_id IS NOT NULL) OR
    (role != 'venue_admin')
  )
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_venue_id ON users(venue_id) WHERE venue_id IS NOT NULL;
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Super admins can see all users
CREATE POLICY "Super admins can view all users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.role = 'super_admin' AND u.is_active = true
    )
  );

-- Venue admins can see users in their venue
CREATE POLICY "Venue admins can view their venue users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid()
        AND u.role = 'venue_admin'
        AND u.venue_id = users.venue_id
        AND u.is_active = true
    )
  );

-- Users can view their own record
CREATE POLICY "Users can view own record" ON users
  FOR SELECT
  USING (id = auth.uid());

-- Only super admins can insert users
CREATE POLICY "Super admins can insert users" ON users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.role = 'super_admin' AND u.is_active = true
    )
  );

-- Only super admins can update users
CREATE POLICY "Super admins can update users" ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.role = 'super_admin' AND u.is_active = true
    )
  );

-- Users can update their own non-critical fields
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Prevent role/venue_id changes by regular users
    AND role = (SELECT role FROM users WHERE id = auth.uid())
    AND (venue_id = (SELECT venue_id FROM users WHERE id = auth.uid()) OR venue_id IS NULL)
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE users IS 'User authentication and authorization table. Supports three roles: user (regular), venue_admin (venue-specific admin), super_admin (system-wide admin)';
