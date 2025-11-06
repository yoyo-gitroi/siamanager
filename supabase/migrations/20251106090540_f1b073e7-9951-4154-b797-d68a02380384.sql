-- ================================================
-- YouTube Analytics Optimization and Auto-Sync Setup
-- ================================================

-- Phase 1: Add Performance Indexes
-- ================================================

-- Index for yt_video_daily lookups by user and date
CREATE INDEX IF NOT EXISTS idx_yt_video_daily_user_day 
ON yt_video_daily(user_id, day DESC);

-- Index for yt_channel_daily lookups by user and date
CREATE INDEX IF NOT EXISTS idx_yt_channel_daily_user_day 
ON yt_channel_daily(user_id, day DESC);

-- Index for demographics lookups
CREATE INDEX IF NOT EXISTS idx_yt_demographics_user_day 
ON yt_demographics(user_id, day DESC);

-- Index for geography lookups
CREATE INDEX IF NOT EXISTS idx_yt_geography_user_day 
ON yt_geography(user_id, day DESC);

-- Index for traffic sources
CREATE INDEX IF NOT EXISTS idx_yt_traffic_sources_user_day 
ON yt_traffic_sources(user_id, day DESC);

-- Index for device stats
CREATE INDEX IF NOT EXISTS idx_yt_device_stats_user_day 
ON yt_device_stats(user_id, day DESC);

-- Index for video metadata
CREATE INDEX IF NOT EXISTS idx_yt_video_metadata_user_published 
ON yt_video_metadata(user_id, published_at DESC);

-- Index for revenue data
CREATE INDEX IF NOT EXISTS idx_yt_revenue_daily_user_day 
ON yt_revenue_daily(user_id, day DESC);


-- Phase 2: Enable pg_cron Extension
-- ================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;


-- Phase 3: Enable pg_net Extension for HTTP requests
-- ================================================

CREATE EXTENSION IF NOT EXISTS pg_net;