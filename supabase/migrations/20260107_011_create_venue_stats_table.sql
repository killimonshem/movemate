-- Create venue_stats table for pre-computed daily statistics
-- Improves dashboard performance by caching aggregate data

CREATE TABLE IF NOT EXISTS venue_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  total_registrations INTEGER DEFAULT 0,
  unique_vehicles INTEGER DEFAULT 0,
  new_vehicles INTEGER DEFAULT 0,
  returning_vehicles INTEGER DEFAULT 0,
  total_notifications_sent INTEGER DEFAULT 0,
  notifications_delivered INTEGER DEFAULT 0,
  notifications_failed INTEGER DEFAULT 0,
  avg_response_time_seconds INTEGER,
  peak_hour INTEGER,
  peak_hour_registrations INTEGER DEFAULT 0,
  total_blocked_notifications INTEGER DEFAULT 0,
  total_archived INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(venue_id, stat_date)
);

-- Indexes for performance
CREATE INDEX idx_venue_stats_venue_date ON venue_stats(venue_id, stat_date DESC);
CREATE INDEX idx_venue_stats_date ON venue_stats(stat_date DESC);

-- Enable Row Level Security
ALTER TABLE venue_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Super admins can view all stats
CREATE POLICY "Super admins can view all venue stats" ON venue_stats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true
    )
  );

-- Venue admins can view their venue's stats
CREATE POLICY "Venue admins can view own venue stats" ON venue_stats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'venue_admin'
        AND users.venue_id = venue_stats.venue_id
        AND users.is_active = true
    )
  );

-- System can manage stats (via service role)
CREATE POLICY "System can manage venue stats" ON venue_stats
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_venue_stats_updated_at
  BEFORE UPDATE ON venue_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to compute stats for a specific date and venue
CREATE OR REPLACE FUNCTION compute_venue_stats(
  p_venue_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID AS $$
DECLARE
  v_stat_id UUID;
  v_total_regs INTEGER;
  v_unique_vehicles INTEGER;
  v_new_vehicles INTEGER;
  v_returning_vehicles INTEGER;
  v_total_notifs INTEGER;
  v_notifs_delivered INTEGER;
  v_notifs_failed INTEGER;
  v_avg_response INTEGER;
  v_peak_hour INTEGER;
  v_peak_hour_count INTEGER;
  v_blocked_notifs INTEGER;
  v_archived INTEGER;
BEGIN
  -- Total registrations for the date
  SELECT COUNT(*)
  INTO v_total_regs
  FROM registrations
  WHERE venue_id = p_venue_id
    AND DATE(created_at) = p_date;

  -- Unique vehicles
  SELECT COUNT(DISTINCT reg)
  INTO v_unique_vehicles
  FROM registrations
  WHERE venue_id = p_venue_id
    AND DATE(created_at) = p_date;

  -- New vs returning vehicles (simple heuristic: new = first registration)
  SELECT
    COUNT(*) FILTER (WHERE is_new),
    COUNT(*) FILTER (WHERE NOT is_new)
  INTO v_new_vehicles, v_returning_vehicles
  FROM (
    SELECT
      reg,
      MIN(created_at) FILTER (WHERE DATE(created_at) = p_date) = MIN(created_at) AS is_new
    FROM registrations
    WHERE venue_id = p_venue_id
      AND DATE(created_at) <= p_date
    GROUP BY reg
    HAVING MIN(created_at) FILTER (WHERE DATE(created_at) = p_date) IS NOT NULL
  ) AS vehicle_analysis;

  -- Notification stats
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'delivered'),
    COUNT(*) FILTER (WHERE status = 'failed')
  INTO v_total_notifs, v_notifs_delivered, v_notifs_failed
  FROM notification_logs
  WHERE venue_id = p_venue_id
    AND DATE(created_at) = p_date;

  -- Average response time (in seconds)
  SELECT AVG(response_time_seconds)::INTEGER
  INTO v_avg_response
  FROM notification_logs
  WHERE venue_id = p_venue_id
    AND DATE(created_at) = p_date
    AND response_time_seconds IS NOT NULL;

  -- Peak hour
  SELECT hour, count
  INTO v_peak_hour, v_peak_hour_count
  FROM (
    SELECT
      EXTRACT(HOUR FROM created_at) AS hour,
      COUNT(*) AS count
    FROM registrations
    WHERE venue_id = p_venue_id
      AND DATE(created_at) = p_date
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY count DESC
    LIMIT 1
  ) AS peak_analysis;

  -- Blocked notifications (move_request type)
  SELECT COUNT(*)
  INTO v_blocked_notifs
  FROM notification_logs
  WHERE venue_id = p_venue_id
    AND DATE(created_at) = p_date
    AND notification_type = 'blocked';

  -- Archived count
  SELECT COUNT(*)
  INTO v_archived
  FROM registrations
  WHERE venue_id = p_venue_id
    AND DATE(created_at) = p_date
    AND is_archived = true;

  -- Upsert stats
  INSERT INTO venue_stats (
    venue_id,
    stat_date,
    total_registrations,
    unique_vehicles,
    new_vehicles,
    returning_vehicles,
    total_notifications_sent,
    notifications_delivered,
    notifications_failed,
    avg_response_time_seconds,
    peak_hour,
    peak_hour_registrations,
    total_blocked_notifications,
    total_archived
  ) VALUES (
    p_venue_id,
    p_date,
    COALESCE(v_total_regs, 0),
    COALESCE(v_unique_vehicles, 0),
    COALESCE(v_new_vehicles, 0),
    COALESCE(v_returning_vehicles, 0),
    COALESCE(v_total_notifs, 0),
    COALESCE(v_notifs_delivered, 0),
    COALESCE(v_notifs_failed, 0),
    v_avg_response,
    v_peak_hour,
    COALESCE(v_peak_hour_count, 0),
    COALESCE(v_blocked_notifs, 0),
    COALESCE(v_archived, 0)
  )
  ON CONFLICT (venue_id, stat_date)
  DO UPDATE SET
    total_registrations = EXCLUDED.total_registrations,
    unique_vehicles = EXCLUDED.unique_vehicles,
    new_vehicles = EXCLUDED.new_vehicles,
    returning_vehicles = EXCLUDED.returning_vehicles,
    total_notifications_sent = EXCLUDED.total_notifications_sent,
    notifications_delivered = EXCLUDED.notifications_delivered,
    notifications_failed = EXCLUDED.notifications_failed,
    avg_response_time_seconds = EXCLUDED.avg_response_time_seconds,
    peak_hour = EXCLUDED.peak_hour,
    peak_hour_registrations = EXCLUDED.peak_hour_registrations,
    total_blocked_notifications = EXCLUDED.total_blocked_notifications,
    total_archived = EXCLUDED.total_archived,
    updated_at = NOW()
  RETURNING id INTO v_stat_id;

  RETURN v_stat_id;
END;
$$ LANGUAGE plpgsql;

-- Function to compute stats for all venues for a date
CREATE OR REPLACE FUNCTION compute_all_venue_stats(p_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
  v_venue RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_venue IN
    SELECT id FROM venues WHERE is_active = true
  LOOP
    PERFORM compute_venue_stats(v_venue.id, p_date);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get stats summary for date range
CREATE OR REPLACE FUNCTION get_venue_stats_summary(
  p_venue_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_registrations BIGINT,
  avg_registrations_per_day NUMERIC,
  total_notifications BIGINT,
  notification_success_rate NUMERIC,
  avg_response_time_seconds INTEGER,
  total_unique_vehicles BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(vs.total_registrations)::BIGINT,
    AVG(vs.total_registrations)::NUMERIC,
    SUM(vs.total_notifications_sent)::BIGINT,
    CASE
      WHEN SUM(vs.total_notifications_sent) > 0
      THEN (SUM(vs.notifications_delivered)::NUMERIC / SUM(vs.total_notifications_sent)::NUMERIC * 100)
      ELSE 0
    END,
    AVG(vs.avg_response_time_seconds)::INTEGER,
    SUM(vs.unique_vehicles)::BIGINT
  FROM venue_stats vs
  WHERE vs.venue_id = p_venue_id
    AND vs.stat_date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE venue_stats IS 'Pre-computed daily statistics for venue analytics dashboard';
COMMENT ON FUNCTION compute_venue_stats IS 'Compute and cache statistics for a venue on a specific date';
COMMENT ON FUNCTION compute_all_venue_stats IS 'Compute stats for all active venues (scheduled job)';
COMMENT ON FUNCTION get_venue_stats_summary IS 'Get aggregate summary for a date range';
