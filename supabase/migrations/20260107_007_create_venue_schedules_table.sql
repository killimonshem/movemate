-- Create venue_schedules table for recurring weekly schedules
-- Defines when each venue is active (sends notifications, accepts registrations)

CREATE TABLE IF NOT EXISTS venue_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Ensure only one schedule per venue per day
  UNIQUE(venue_id, day_of_week)
);

-- Indexes for performance
CREATE INDEX idx_venue_schedules_venue ON venue_schedules(venue_id);
CREATE INDEX idx_venue_schedules_day ON venue_schedules(venue_id, day_of_week);
CREATE INDEX idx_venue_schedules_active ON venue_schedules(venue_id, is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE venue_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Super admins can do everything
CREATE POLICY "Super admins can view all schedules" ON venue_schedules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true
    )
  );

CREATE POLICY "Super admins can insert schedules" ON venue_schedules
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true
    )
  );

CREATE POLICY "Super admins can update schedules" ON venue_schedules
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true
    )
  );

CREATE POLICY "Super admins can delete schedules" ON venue_schedules
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true
    )
  );

-- Venue admins can manage their own venue's schedules
CREATE POLICY "Venue admins can view own schedules" ON venue_schedules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'venue_admin'
        AND users.venue_id = venue_schedules.venue_id
        AND users.is_active = true
    )
  );

CREATE POLICY "Venue admins can insert own schedules" ON venue_schedules
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'venue_admin'
        AND users.venue_id = venue_schedules.venue_id
        AND users.is_active = true
    )
  );

CREATE POLICY "Venue admins can update own schedules" ON venue_schedules
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'venue_admin'
        AND users.venue_id = venue_schedules.venue_id
        AND users.is_active = true
    )
  );

CREATE POLICY "Venue admins can delete own schedules" ON venue_schedules
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'venue_admin'
        AND users.venue_id = venue_schedules.venue_id
        AND users.is_active = true
    )
  );

-- Public can view active schedules (for registration page to show hours)
CREATE POLICY "Public can view active schedules" ON venue_schedules
  FOR SELECT
  USING (is_active = true);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_venue_schedules_updated_at
  BEFORE UPDATE ON venue_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper function to check if venue is currently active
CREATE OR REPLACE FUNCTION is_venue_active_now(p_venue_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_active BOOLEAN;
  v_current_day INTEGER;
  v_current_time TIME;
  v_venue_timezone TEXT;
BEGIN
  -- Get venue timezone
  SELECT timezone INTO v_venue_timezone
  FROM venues
  WHERE id = p_venue_id;

  -- Default to Europe/London if not set
  v_venue_timezone := COALESCE(v_venue_timezone, 'Europe/London');

  -- Get current day and time in venue's timezone
  v_current_day := EXTRACT(DOW FROM (NOW() AT TIME ZONE v_venue_timezone));
  v_current_time := (NOW() AT TIME ZONE v_venue_timezone)::TIME;

  -- Check if there's an active schedule for this day and time
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

-- Helper function to get next active time for a venue
CREATE OR REPLACE FUNCTION get_next_active_time(p_venue_id UUID)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_venue_timezone TEXT;
  v_current_ts TIMESTAMPTZ;
  v_next_active TIMESTAMPTZ;
  v_schedule RECORD;
  v_days_ahead INTEGER;
BEGIN
  -- Get venue timezone
  SELECT timezone INTO v_venue_timezone
  FROM venues
  WHERE id = p_venue_id;

  v_venue_timezone := COALESCE(v_venue_timezone, 'Europe/London');
  v_current_ts := NOW() AT TIME ZONE v_venue_timezone;

  -- Find the next active schedule
  FOR v_schedule IN
    SELECT day_of_week, start_time
    FROM venue_schedules
    WHERE venue_id = p_venue_id AND is_active = true
    ORDER BY day_of_week, start_time
  LOOP
    -- Calculate days ahead
    v_days_ahead := (v_schedule.day_of_week - EXTRACT(DOW FROM v_current_ts)::INTEGER + 7) % 7;

    v_next_active := (DATE(v_current_ts) + v_days_ahead * INTERVAL '1 day' + v_schedule.start_time) AT TIME ZONE v_venue_timezone;

    -- If this time is in the future, return it
    IF v_next_active > v_current_ts THEN
      RETURN v_next_active;
    END IF;
  END LOOP;

  -- If no future time found in current week, check next week
  FOR v_schedule IN
    SELECT day_of_week, start_time
    FROM venue_schedules
    WHERE venue_id = p_venue_id AND is_active = true
    ORDER BY day_of_week, start_time
    LIMIT 1
  LOOP
    v_days_ahead := (v_schedule.day_of_week - EXTRACT(DOW FROM v_current_ts)::INTEGER + 14) % 7;
    IF v_days_ahead = 0 THEN
      v_days_ahead := 7;
    END IF;

    v_next_active := (DATE(v_current_ts) + v_days_ahead * INTERVAL '1 day' + v_schedule.start_time) AT TIME ZONE v_venue_timezone;
    RETURN v_next_active;
  END LOOP;

  RETURN NULL; -- No active schedule configured
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE venue_schedules IS 'Recurring weekly schedules for venue active hours. Day 0=Sunday, 6=Saturday.';
COMMENT ON FUNCTION is_venue_active_now IS 'Check if a venue is currently within active hours';
COMMENT ON FUNCTION get_next_active_time IS 'Get the next scheduled active time for a venue';
