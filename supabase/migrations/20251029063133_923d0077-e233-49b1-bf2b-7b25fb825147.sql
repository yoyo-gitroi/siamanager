-- Stores Google OAuth tokens for the manager account
CREATE TABLE IF NOT EXISTS google_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'google',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expiry_ts TIMESTAMPTZ NOT NULL,
  scope TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE google_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Only admins can manage tokens
CREATE POLICY "Admins can manage tokens"
  ON google_oauth_tokens
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Channel daily rollup
CREATE TABLE IF NOT EXISTS yt_channel_daily (
  channel_id TEXT NOT NULL,
  day DATE NOT NULL,
  views BIGINT DEFAULT 0,
  watch_time_seconds BIGINT DEFAULT 0,
  subscribers_gained INT DEFAULT 0,
  subscribers_lost INT DEFAULT 0,
  estimated_revenue NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, day)
);

-- Enable RLS
ALTER TABLE yt_channel_daily ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view channel data
CREATE POLICY "Users can view channel data"
  ON yt_channel_daily
  FOR SELECT
  USING (true);

-- System can insert/update channel data
CREATE POLICY "System can manage channel data"
  ON yt_channel_daily
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Per-video daily
CREATE TABLE IF NOT EXISTS yt_video_daily (
  channel_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  day DATE NOT NULL,
  views BIGINT DEFAULT 0,
  watch_time_seconds BIGINT DEFAULT 0,
  avg_view_duration_seconds NUMERIC DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  click_through_rate NUMERIC DEFAULT 0,
  likes BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (video_id, day)
);

-- Enable RLS
ALTER TABLE yt_video_daily ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view video data
CREATE POLICY "Users can view video data"
  ON yt_video_daily
  FOR SELECT
  USING (true);

-- System can insert/update video data
CREATE POLICY "System can manage video data"
  ON yt_video_daily
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better query performance
CREATE INDEX idx_yt_channel_daily_day ON yt_channel_daily(day DESC);
CREATE INDEX idx_yt_video_daily_day ON yt_video_daily(day DESC);
CREATE INDEX idx_yt_video_daily_channel ON yt_video_daily(channel_id, day DESC);

-- Add update trigger for google_oauth_tokens
CREATE TRIGGER update_google_oauth_tokens_updated_at
  BEFORE UPDATE ON google_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();