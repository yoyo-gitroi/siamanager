-- YouTube Studio Extension Schema
-- Tables to store data extracted from YouTube Studio DOM

-- Raw archive table (stores all raw JSON data for audit trail)
CREATE TABLE IF NOT EXISTS youtube_studio_raw_archive (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL, -- 'dashboard', 'video_list', 'analytics', 'comments'
  page_type TEXT, -- 'dashboard', 'content', 'analytics', 'comments'
  url TEXT,
  raw_data JSONB NOT NULL,
  extracted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboard snapshots (channel overview metrics)
CREATE TABLE IF NOT EXISTS youtube_studio_dashboard_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_name TEXT,
  metrics JSONB NOT NULL, -- All metrics extracted from dashboard
  snapshot_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video snapshots (individual video data from content page)
CREATE TABLE IF NOT EXISTS youtube_studio_video_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT,
  title TEXT,
  url TEXT,
  visibility TEXT,
  views BIGINT,
  comments_count INTEGER,
  likes_count INTEGER,
  published_date TEXT,
  list_position INTEGER,
  captured_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics snapshots (detailed analytics metrics)
CREATE TABLE IF NOT EXISTS youtube_studio_analytics_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metrics JSONB NOT NULL,
  charts JSONB,
  snapshot_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments data
CREATE TABLE IF NOT EXISTS youtube_studio_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author TEXT,
  text TEXT,
  posted_date TEXT,
  likes_count INTEGER,
  replies_count INTEGER,
  captured_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_yt_studio_raw_user_time
  ON youtube_studio_raw_archive(user_id, extracted_at DESC);

CREATE INDEX IF NOT EXISTS idx_yt_studio_raw_type
  ON youtube_studio_raw_archive(user_id, data_type, extracted_at DESC);

CREATE INDEX IF NOT EXISTS idx_yt_studio_dashboard_user_time
  ON youtube_studio_dashboard_snapshots(user_id, snapshot_at DESC);

CREATE INDEX IF NOT EXISTS idx_yt_studio_videos_user_time
  ON youtube_studio_video_snapshots(user_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_yt_studio_videos_video_id
  ON youtube_studio_video_snapshots(user_id, video_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_yt_studio_analytics_user_time
  ON youtube_studio_analytics_snapshots(user_id, snapshot_at DESC);

CREATE INDEX IF NOT EXISTS idx_yt_studio_comments_user_time
  ON youtube_studio_comments(user_id, captured_at DESC);

-- Enable Row Level Security
ALTER TABLE youtube_studio_raw_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_studio_dashboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_studio_video_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_studio_analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_studio_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can view own raw archive"
  ON youtube_studio_raw_archive FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own dashboard snapshots"
  ON youtube_studio_dashboard_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own video snapshots"
  ON youtube_studio_video_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own analytics snapshots"
  ON youtube_studio_analytics_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own comments"
  ON youtube_studio_comments FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert (used by Edge Function)
CREATE POLICY "Service role can insert raw archive"
  ON youtube_studio_raw_archive FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can insert dashboard snapshots"
  ON youtube_studio_dashboard_snapshots FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can insert video snapshots"
  ON youtube_studio_video_snapshots FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can insert analytics snapshots"
  ON youtube_studio_analytics_snapshots FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can insert comments"
  ON youtube_studio_comments FOR INSERT
  WITH CHECK (true);

-- Create a view for latest video metrics
CREATE OR REPLACE VIEW youtube_studio_latest_videos AS
SELECT DISTINCT ON (user_id, video_id)
  user_id,
  video_id,
  title,
  url,
  visibility,
  views,
  comments_count,
  likes_count,
  published_date,
  captured_at
FROM youtube_studio_video_snapshots
ORDER BY user_id, video_id, captured_at DESC;

-- Grant access to the view
ALTER VIEW youtube_studio_latest_videos OWNER TO postgres;
GRANT SELECT ON youtube_studio_latest_videos TO authenticated;

COMMENT ON TABLE youtube_studio_raw_archive IS 'Raw JSON data archive from YouTube Studio browser extension';
COMMENT ON TABLE youtube_studio_dashboard_snapshots IS 'Dashboard metrics snapshots';
COMMENT ON TABLE youtube_studio_video_snapshots IS 'Video list snapshots from content page';
COMMENT ON TABLE youtube_studio_analytics_snapshots IS 'Analytics page metrics';
COMMENT ON TABLE youtube_studio_comments IS 'Comments data extracted from Studio';
