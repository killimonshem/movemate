-- Create venue_special_events table for one-off event overrides
-- Special events override regular schedules on specific dates

CREATE TABLE IF NOT EXISTS venue_special_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Prevent overlapping events on same day at same venue
  UNIQUE(venue_id, event_date)
);

-- Indexes for performance
CREATE INDEX idx_venue_events_venue ON venue_special_events(venue_id);
CREATE INDEX idx_venue_events_date ON venue_special_events(venue_id, event_date);
CREATE INDEX idx_venue_events_upcoming ON venue_special_events(venue_id, event_date) WHERE event_date >= CURRENT_DATE;
CREATE INDEX idx_venue_events_active ON venue_special_events(venue_id, is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE venue_special_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Super admins can do everything
CREATE POLICY "Super admins can view all special events" ON venue_special_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true
    )
  );

CREATE POLICY "Super admins can insert special events" ON venue_special_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true
    )
  );

CREATE POLICY "Super admins can update special events" ON venue_special_events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true
    )
  );

CREATE POLICY "Super admins can delete special events" ON venue_special_events
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true
    )
  );

-- Venue admins can manage their own venue's special events
CREATE POLICY "Venue admins can view own special events" ON venue_special_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'venue_admin'
        AND users.venue_id = venue_special_events.venue_id
        AND users.is_active = true
    )
  );

CREATE POLICY "Venue admins can insert own special events" ON venue_special_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'venue_admin'
        AND users.venue_id = venue_special_events.venue_id
        AND users.is_active = true
    )
  );

CREATE POLICY "Venue admins can update own special events" ON venue_special_events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'venue_admin'
        AND users.venue_id = venue_special_events.venue_id
        AND users.is_active = true
    )
  );

CREATE POLICY "Venue admins can delete own special events" ON venue_special_events
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'venue_admin'
        AND users.venue_id = venue_special_events.venue_id
        AND users.is_active = true
    )
  );

-- Public can view active special events (for registration page)
CREATE POLICY "Public can view active special events" ON venue_special_events
  FOR SELECT
  USING (is_active = true AND event_date >= CURRENT_DATE);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_venue_special_events_updated_at
  BEFORE UPDATE ON venue_special_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Updated helper function to check if venue is active (with special events support)
CREATE OR REPLACE FUNCTION is_venue_active_now(p_venue_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_active BOOLEAN;
  v_current_day INTEGER;
  v_current_time TIME;
  v_current_date DATE;
  v_venue_timezone TEXT;
BEGIN
  -- Get venue timezone
  SELECT timezone INTO v_venue_timezone
  FROM venues
  WHERE id = p_venue_id;

  -- Default to Europe/London if not set
  v_venue_timezone := COALESCE(v_venue_timezone, 'Europe/London');

  -- Get current date, day and time in venue's timezone
  v_current_date := (NOW() AT TIME ZONE v_venue_timezone)::DATE;
  v_current_day := EXTRACT(DOW FROM (NOW() AT TIME ZONE v_venue_timezone));
  v_current_time := (NOW() AT TIME ZONE v_venue_timezone)::TIME;

  -- First check for special event on this date (takes priority)
  SELECT EXISTS (
    SELECT 1 FROM venue_special_events
    WHERE venue_id = p_venue_id
      AND event_date = v_current_date
      AND is_active = true
      AND v_current_time >= start_time
      AND v_current_time <= end_time
  ) INTO v_is_active;

  -- If special event found, return that result
  IF v_is_active THEN
    RETURN true;
  END IF;

  -- Otherwise, check regular schedule
  SELECT EXISTS (
    SELECT 1 FROM venue_schedules
    WHERE venue_id = p_venue_id
      AND day_of_week = v_current_day
      AND is_active = true
      AND v_current_time >= start_time
      AND v_current_time <= end_time
  ) INTO v_is_active;

  RETURN v_is_active;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to auto-archive old special events
CREATE OR REPLACE FUNCTION archive_old_special_events()
RETURNS INTEGER AS $$
DECLARE
  v_archived_count INTEGER;
BEGIN
  -- Mark events older than 30 days as inactive (soft delete)
  UPDATE venue_special_events
  SET is_active = false
  WHERE event_date < CURRENT_DATE - INTERVAL '30 days'
    AND is_active = true;

  GET DIAGNOSTICS v_archived_count = ROW_COUNT;

  RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE venue_special_events IS 'One-off special events that override regular schedules. Events are unique per venue per date.';
COMMENT ON FUNCTION archive_old_special_events IS 'Auto-archive special events older than 30 days';
