-- Create archive system for automatic cleanup of old registrations
-- Helps keep database clean while maintaining historical data

-- Archive configuration per venue
CREATE TABLE IF NOT EXISTS venue_archive_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE UNIQUE,
  auto_archive_enabled BOOLEAN DEFAULT true,
  archive_after_hours INTEGER DEFAULT 24 CHECK (archive_after_hours > 0),
  last_archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_archive_settings_venue ON venue_archive_settings(venue_id);
CREATE INDEX idx_archive_settings_enabled ON venue_archive_settings(auto_archive_enabled) WHERE auto_archive_enabled = true;

-- Enable Row Level Security
ALTER TABLE venue_archive_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Super admins can do everything
CREATE POLICY "Super admins can view all archive settings" ON venue_archive_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true
    )
  );

CREATE POLICY "Super admins can manage archive settings" ON venue_archive_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true
    )
  );

-- Venue admins can manage their own settings
CREATE POLICY "Venue admins can view own archive settings" ON venue_archive_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'venue_admin'
        AND users.venue_id = venue_archive_settings.venue_id
        AND users.is_active = true
    )
  );

CREATE POLICY "Venue admins can manage own archive settings" ON venue_archive_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'venue_admin'
        AND users.venue_id = venue_archive_settings.venue_id
        AND users.is_active = true
    )
  );

-- Trigger to auto-update updated_at
CREATE TRIGGER update_archive_settings_updated_at
  BEFORE UPDATE ON venue_archive_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-archive old registrations for a venue
CREATE OR REPLACE FUNCTION archive_venue_registrations(p_venue_id UUID)
RETURNS TABLE(archived_count INTEGER, details JSONB) AS $$
DECLARE
  v_settings RECORD;
  v_cutoff_time TIMESTAMPTZ;
  v_archived_count INTEGER;
  v_venue_name TEXT;
BEGIN
  -- Get archive settings for this venue
  SELECT * INTO v_settings
  FROM venue_archive_settings
  WHERE venue_id = p_venue_id AND auto_archive_enabled = true;

  -- If no settings or disabled, return 0
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, jsonb_build_object('message', 'Auto-archive not enabled');
    RETURN;
  END IF;

  -- Calculate cutoff time
  v_cutoff_time := NOW() - (v_settings.archive_after_hours || ' hours')::INTERVAL;

  -- Archive registrations older than cutoff
  UPDATE registrations
  SET
    is_archived = true,
    archived_at = NOW()
  WHERE venue_id = p_venue_id
    AND is_archived = false
    AND created_at < v_cutoff_time;

  GET DIAGNOSTICS v_archived_count = ROW_COUNT;

  -- Update last archived timestamp
  UPDATE venue_archive_settings
  SET last_archived_at = NOW()
  WHERE venue_id = p_venue_id;

  -- Get venue name
  SELECT name INTO v_venue_name FROM venues WHERE id = p_venue_id;

  -- Return results
  RETURN QUERY SELECT
    v_archived_count,
    jsonb_build_object(
      'venue_id', p_venue_id,
      'venue_name', v_venue_name,
      'cutoff_time', v_cutoff_time,
      'archived_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Function to run auto-archive for all venues
CREATE OR REPLACE FUNCTION auto_archive_all_venues()
RETURNS TABLE(venue_id UUID, archived_count INTEGER, details JSONB) AS $$
DECLARE
  v_venue RECORD;
  v_result RECORD;
BEGIN
  -- Loop through all venues with auto-archive enabled
  FOR v_venue IN
    SELECT vas.venue_id
    FROM venue_archive_settings vas
    WHERE vas.auto_archive_enabled = true
  LOOP
    -- Archive for this venue
    FOR v_result IN
      SELECT * FROM archive_venue_registrations(v_venue.venue_id)
    LOOP
      RETURN QUERY SELECT v_venue.venue_id, v_result.archived_count, v_result.details;
    END LOOP;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to manually unarchive registrations (if needed)
CREATE OR REPLACE FUNCTION unarchive_registrations(p_venue_id UUID, p_reg_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
  v_unarchived_count INTEGER;
BEGIN
  UPDATE registrations
  SET
    is_archived = false,
    archived_at = NULL
  WHERE venue_id = p_venue_id
    AND id = ANY(p_reg_ids)
    AND is_archived = true;

  GET DIAGNOSTICS v_unarchived_count = ROW_COUNT;

  RETURN v_unarchived_count;
END;
$$ LANGUAGE plpgsql;

-- Create default archive settings for existing venues
INSERT INTO venue_archive_settings (venue_id, auto_archive_enabled, archive_after_hours)
SELECT id, true, 24
FROM venues
ON CONFLICT (venue_id) DO NOTHING;

COMMENT ON TABLE venue_archive_settings IS 'Configuration for automatic archiving of old registrations per venue';
COMMENT ON FUNCTION archive_venue_registrations IS 'Archive old registrations for a specific venue based on settings';
COMMENT ON FUNCTION auto_archive_all_venues IS 'Run auto-archive for all venues with auto-archive enabled (scheduled job)';
COMMENT ON FUNCTION unarchive_registrations IS 'Manually restore archived registrations';
