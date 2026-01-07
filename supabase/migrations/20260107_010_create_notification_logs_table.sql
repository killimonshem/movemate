-- Create notification_logs table for tracking all SMS notifications
-- Provides detailed analytics on notification performance

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('blocked', 'move_request', 'confirmation', 'bulk', 'reminder')),
  recipient_phone TEXT NOT NULL,
  message_body TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'delivered')) DEFAULT 'pending',
  sent_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  response_time_seconds INTEGER,
  twilio_sid TEXT,
  cost_units INTEGER DEFAULT 1
);

-- Indexes for performance
CREATE INDEX idx_notif_logs_venue_created ON notification_logs(venue_id, created_at DESC);
CREATE INDEX idx_notif_logs_registration ON notification_logs(registration_id) WHERE registration_id IS NOT NULL;
CREATE INDEX idx_notif_logs_status ON notification_logs(status, venue_id);
CREATE INDEX idx_notif_logs_type ON notification_logs(notification_type, venue_id);
CREATE INDEX idx_notif_logs_date ON notification_logs(DATE(created_at), venue_id);

-- Enable Row Level Security
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Super admins can view all notification logs
CREATE POLICY "Super admins can view all notification logs" ON notification_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin' AND users.is_active = true
    )
  );

-- Venue admins can view their venue's logs
CREATE POLICY "Venue admins can view own venue notification logs" ON notification_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'venue_admin'
        AND users.venue_id = notification_logs.venue_id
        AND users.is_active = true
    )
  );

-- System can insert notification logs (via service role)
CREATE POLICY "System can insert notification logs" ON notification_logs
  FOR INSERT
  WITH CHECK (true);

-- System can update notification logs (status changes)
CREATE POLICY "System can update notification logs" ON notification_logs
  FOR UPDATE
  USING (true);

-- Helper function to log a notification
CREATE OR REPLACE FUNCTION log_notification(
  p_venue_id UUID,
  p_registration_id UUID,
  p_notification_type TEXT,
  p_recipient_phone TEXT,
  p_message_body TEXT,
  p_sent_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO notification_logs (
    venue_id,
    registration_id,
    notification_type,
    recipient_phone,
    message_body,
    sent_by,
    status
  ) VALUES (
    p_venue_id,
    p_registration_id,
    p_notification_type,
    p_recipient_phone,
    p_message_body,
    p_sent_by,
    'pending'
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to update notification status
CREATE OR REPLACE FUNCTION update_notification_status(
  p_log_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL,
  p_twilio_sid TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE notification_logs
  SET
    status = p_status,
    sent_at = CASE WHEN p_status = 'sent' THEN NOW() ELSE sent_at END,
    delivered_at = CASE WHEN p_status = 'delivered' THEN NOW() ELSE delivered_at END,
    failed_at = CASE WHEN p_status = 'failed' THEN NOW() ELSE failed_at END,
    error_message = p_error_message,
    twilio_sid = COALESCE(p_twilio_sid, twilio_sid)
  WHERE id = p_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to calculate response time
CREATE OR REPLACE FUNCTION calculate_notification_response_time(
  p_log_id UUID,
  p_action_timestamp TIMESTAMPTZ
)
RETURNS VOID AS $$
BEGIN
  UPDATE notification_logs
  SET response_time_seconds = EXTRACT(EPOCH FROM (p_action_timestamp - sent_at))::INTEGER
  WHERE id = p_log_id
    AND sent_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE notification_logs IS 'Comprehensive log of all SMS notifications sent through the system';
COMMENT ON COLUMN notification_logs.response_time_seconds IS 'Time in seconds from notification sent to user action (vehicle moved/deleted)';
COMMENT ON COLUMN notification_logs.cost_units IS 'SMS cost in units (1 unit = 1 SMS segment)';
COMMENT ON FUNCTION log_notification IS 'Create a new notification log entry';
COMMENT ON FUNCTION update_notification_status IS 'Update notification status and timestamps';
COMMENT ON FUNCTION calculate_notification_response_time IS 'Calculate response time when user takes action';
