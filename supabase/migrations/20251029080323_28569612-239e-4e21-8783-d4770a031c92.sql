-- Phase 1: Fix google_oauth_tokens schema
-- Add unique constraint to prevent duplicate rows per user
ALTER TABLE google_oauth_tokens 
  ADD CONSTRAINT google_oauth_tokens_provider_user_id_key 
  UNIQUE (provider, user_id);

-- Clean up existing NULL user_id rows (they're orphaned)
DELETE FROM google_oauth_tokens WHERE user_id IS NULL;

-- Phase 5: Add user_id to YouTube data tables
ALTER TABLE yt_channel_daily ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE yt_video_daily ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Update RLS policies for yt_channel_daily
DROP POLICY IF EXISTS "System can manage channel data" ON yt_channel_daily;
DROP POLICY IF EXISTS "Users can view channel data" ON yt_channel_daily;

CREATE POLICY "Users manage own channel data"
ON yt_channel_daily FOR ALL
USING (auth.uid() = user_id);

-- Update RLS policies for yt_video_daily
DROP POLICY IF EXISTS "System can manage video data" ON yt_video_daily;
DROP POLICY IF EXISTS "Users can view video data" ON yt_video_daily;

CREATE POLICY "Users manage own video data"
ON yt_video_daily FOR ALL
USING (auth.uid() = user_id);