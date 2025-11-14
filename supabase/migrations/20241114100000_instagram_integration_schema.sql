-- Instagram Integration Database Schema
-- This migration creates tables for Instagram OAuth, analytics, and media tracking

-- ============================================================================
-- 1. Instagram Connection (OAuth & Account Info)
-- ============================================================================
CREATE TABLE IF NOT EXISTS instagram_connection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  account_type TEXT, -- 'BUSINESS', 'CREATOR', 'PERSONAL'
  profile_picture_url TEXT,

  -- OAuth tokens
  access_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ,

  -- Metadata
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, instagram_user_id),
  UNIQUE(user_id) -- One Instagram account per user for now
);

-- Enable RLS
ALTER TABLE instagram_connection ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own Instagram connections"
  ON instagram_connection FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Instagram connections"
  ON instagram_connection FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Instagram connections"
  ON instagram_connection FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Instagram connections"
  ON instagram_connection FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_instagram_connection_user_id ON instagram_connection(user_id);
CREATE INDEX idx_instagram_connection_instagram_user_id ON instagram_connection(instagram_user_id);

-- ============================================================================
-- 2. Instagram Account Daily Analytics
-- ============================================================================
CREATE TABLE IF NOT EXISTS instagram_account_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL,
  day DATE NOT NULL,

  -- Account metrics
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  media_count INTEGER DEFAULT 0,

  -- Daily insights (last 24h)
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  profile_views INTEGER DEFAULT 0,
  website_clicks INTEGER DEFAULT 0,
  email_contacts INTEGER DEFAULT 0,
  phone_call_clicks INTEGER DEFAULT 0,
  text_message_clicks INTEGER DEFAULT 0,
  get_directions_clicks INTEGER DEFAULT 0,

  -- Engagement
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, instagram_user_id, day)
);

-- Enable RLS
ALTER TABLE instagram_account_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own Instagram account daily data"
  ON instagram_account_daily FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert Instagram account daily data"
  ON instagram_account_daily FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update Instagram account daily data"
  ON instagram_account_daily FOR UPDATE
  USING (true);

-- Indexes
CREATE INDEX idx_instagram_account_daily_user_day ON instagram_account_daily(user_id, day DESC);
CREATE INDEX idx_instagram_account_daily_instagram_user ON instagram_account_daily(instagram_user_id, day DESC);

-- ============================================================================
-- 3. Instagram Media Metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS instagram_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL,
  media_id TEXT NOT NULL UNIQUE,

  -- Media info
  media_type TEXT NOT NULL, -- 'IMAGE', 'VIDEO', 'CAROUSEL_ALBUM', 'STORY'
  media_url TEXT,
  thumbnail_url TEXT,
  permalink TEXT,
  caption TEXT,

  -- Timestamps
  timestamp TIMESTAMPTZ NOT NULL, -- When the media was published

  -- Metadata
  is_story BOOLEAN DEFAULT FALSE,
  story_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, media_id)
);

-- Enable RLS
ALTER TABLE instagram_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own Instagram media"
  ON instagram_media FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert Instagram media"
  ON instagram_media FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update Instagram media"
  ON instagram_media FOR UPDATE
  USING (true);

-- Indexes
CREATE INDEX idx_instagram_media_user_id ON instagram_media(user_id, timestamp DESC);
CREATE INDEX idx_instagram_media_media_id ON instagram_media(media_id);
CREATE INDEX idx_instagram_media_type ON instagram_media(user_id, media_type, timestamp DESC);

-- ============================================================================
-- 4. Instagram Media Daily Insights
-- ============================================================================
CREATE TABLE IF NOT EXISTS instagram_media_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL,
  media_id TEXT NOT NULL,
  day DATE NOT NULL,

  -- Engagement metrics
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  saved INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,

  -- Reach metrics
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,

  -- Video metrics (if applicable)
  video_views INTEGER DEFAULT 0,

  -- Story metrics (if applicable)
  exits INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  taps_forward INTEGER DEFAULT 0,
  taps_back INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, media_id, day)
);

-- Enable RLS
ALTER TABLE instagram_media_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own Instagram media daily data"
  ON instagram_media_daily FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert Instagram media daily data"
  ON instagram_media_daily FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update Instagram media daily data"
  ON instagram_media_daily FOR UPDATE
  USING (true);

-- Indexes
CREATE INDEX idx_instagram_media_daily_user_day ON instagram_media_daily(user_id, day DESC);
CREATE INDEX idx_instagram_media_daily_media_day ON instagram_media_daily(media_id, day DESC);

-- ============================================================================
-- 5. Instagram Real-Time Snapshots (Intraday)
-- ============================================================================
CREATE TABLE IF NOT EXISTS instagram_account_intraday (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Current counts
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  media_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE instagram_account_intraday ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own Instagram intraday data"
  ON instagram_account_intraday FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert Instagram intraday data"
  ON instagram_account_intraday FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_instagram_account_intraday_user_captured ON instagram_account_intraday(user_id, captured_at DESC);

-- ============================================================================
-- 6. Instagram Media Real-Time Snapshots
-- ============================================================================
CREATE TABLE IF NOT EXISTS instagram_media_intraday (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL,
  media_id TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Current engagement counts
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,

  -- Video views (if applicable)
  video_views INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE instagram_media_intraday ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own Instagram media intraday data"
  ON instagram_media_intraday FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert Instagram media intraday data"
  ON instagram_media_intraday FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_instagram_media_intraday_user_captured ON instagram_media_intraday(user_id, captured_at DESC);
CREATE INDEX idx_instagram_media_intraday_media_captured ON instagram_media_intraday(media_id, captured_at DESC);

-- ============================================================================
-- 7. Instagram Sync State (Track sync status)
-- ============================================================================
CREATE TABLE IF NOT EXISTS instagram_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instagram_user_id TEXT NOT NULL,

  -- Sync tracking
  last_sync_date DATE,
  last_sync_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- 'pending', 'syncing', 'completed', 'failed'
  rows_inserted INTEGER DEFAULT 0,
  last_error TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, instagram_user_id)
);

-- Enable RLS
ALTER TABLE instagram_sync_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own Instagram sync state"
  ON instagram_sync_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage Instagram sync state"
  ON instagram_sync_state FOR ALL
  USING (true);

-- Indexes
CREATE INDEX idx_instagram_sync_state_user ON instagram_sync_state(user_id);

-- ============================================================================
-- 8. Drop old instagram_analytics table if exists (replaced by new schema)
-- ============================================================================
-- NOTE: Only uncomment this if you want to remove the old table
-- DROP TABLE IF EXISTS instagram_analytics CASCADE;

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE instagram_connection IS 'Stores Instagram OAuth tokens and account info';
COMMENT ON TABLE instagram_account_daily IS 'Daily account-level Instagram insights';
COMMENT ON TABLE instagram_media IS 'Instagram media (posts, reels, stories) metadata';
COMMENT ON TABLE instagram_media_daily IS 'Daily insights per Instagram media item';
COMMENT ON TABLE instagram_account_intraday IS 'Real-time account snapshots captured every 30 minutes';
COMMENT ON TABLE instagram_media_intraday IS 'Real-time media snapshots for recent posts';
COMMENT ON TABLE instagram_sync_state IS 'Tracks sync status and errors for Instagram accounts';
