-- Create yt_demographics table
CREATE TABLE public.yt_demographics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  channel_id TEXT NOT NULL,
  day DATE NOT NULL,
  age_group TEXT,
  gender TEXT,
  viewer_percentage NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, channel_id, day, age_group, gender)
);

ALTER TABLE public.yt_demographics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own demographics"
  ON public.yt_demographics
  FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_yt_demographics_user_day ON public.yt_demographics(user_id, day);

-- Create yt_geography table
CREATE TABLE public.yt_geography (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  channel_id TEXT NOT NULL,
  day DATE NOT NULL,
  country TEXT,
  province TEXT,
  views BIGINT DEFAULT 0,
  watch_time_seconds BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, channel_id, day, country, province)
);

ALTER TABLE public.yt_geography ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own geography"
  ON public.yt_geography
  FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_yt_geography_user_day ON public.yt_geography(user_id, day);

-- Create yt_traffic_sources table
CREATE TABLE public.yt_traffic_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  channel_id TEXT NOT NULL,
  day DATE NOT NULL,
  source_type TEXT,
  source_detail TEXT,
  views BIGINT DEFAULT 0,
  watch_time_seconds BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, channel_id, day, source_type, source_detail)
);

ALTER TABLE public.yt_traffic_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own traffic sources"
  ON public.yt_traffic_sources
  FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_yt_traffic_user_day ON public.yt_traffic_sources(user_id, day);

-- Create yt_device_stats table
CREATE TABLE public.yt_device_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  channel_id TEXT NOT NULL,
  day DATE NOT NULL,
  device_type TEXT,
  operating_system TEXT,
  views BIGINT DEFAULT 0,
  watch_time_seconds BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, channel_id, day, device_type, operating_system)
);

ALTER TABLE public.yt_device_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own device stats"
  ON public.yt_device_stats
  FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_yt_device_user_day ON public.yt_device_stats(user_id, day);

-- Create yt_audience_retention table
CREATE TABLE public.yt_audience_retention (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  channel_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  day DATE NOT NULL,
  subscribed_status TEXT,
  elapsed_video_time_ratio NUMERIC,
  audience_watch_ratio NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, channel_id, video_id, day, subscribed_status, elapsed_video_time_ratio)
);

ALTER TABLE public.yt_audience_retention ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own retention"
  ON public.yt_audience_retention
  FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_yt_retention_user_video ON public.yt_audience_retention(user_id, video_id, day);

-- Create yt_revenue_daily table
CREATE TABLE public.yt_revenue_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  channel_id TEXT NOT NULL,
  day DATE NOT NULL,
  estimated_revenue NUMERIC DEFAULT 0,
  ad_impressions BIGINT DEFAULT 0,
  cpm NUMERIC DEFAULT 0,
  playback_based_cpm NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, channel_id, day)
);

ALTER TABLE public.yt_revenue_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own revenue"
  ON public.yt_revenue_daily
  FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_yt_revenue_user_day ON public.yt_revenue_daily(user_id, day);

-- Create yt_playlist_analytics table
CREATE TABLE public.yt_playlist_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  channel_id TEXT NOT NULL,
  day DATE NOT NULL,
  playlist_id TEXT,
  views BIGINT DEFAULT 0,
  watch_time_seconds BIGINT DEFAULT 0,
  avg_time_in_playlist_seconds NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, channel_id, day, playlist_id)
);

ALTER TABLE public.yt_playlist_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own playlist analytics"
  ON public.yt_playlist_analytics
  FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_yt_playlist_user_day ON public.yt_playlist_analytics(user_id, day);

-- Create yt_search_terms table
CREATE TABLE public.yt_search_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  channel_id TEXT NOT NULL,
  day DATE NOT NULL,
  search_term TEXT,
  views BIGINT DEFAULT 0,
  watch_time_seconds BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, channel_id, day, search_term)
);

ALTER TABLE public.yt_search_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own search terms"
  ON public.yt_search_terms
  FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_yt_search_user_day ON public.yt_search_terms(user_id, day);

-- Create yt_video_metadata table
CREATE TABLE public.yt_video_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  channel_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT,
  description TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  tags TEXT[],
  category_id TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, video_id)
);

ALTER TABLE public.yt_video_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own video metadata"
  ON public.yt_video_metadata
  FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_yt_video_metadata_user_video ON public.yt_video_metadata(user_id, video_id);