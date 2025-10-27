-- Extend youtube_analytics with subscribers, watch_hours, and content_type
ALTER TABLE youtube_analytics 
ADD COLUMN IF NOT EXISTS subscribers integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS watch_hours numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'other' CHECK (content_type IN ('short', 'long', 'other'));

-- Create index for content_type filtering
CREATE INDEX IF NOT EXISTS idx_youtube_content_type ON youtube_analytics(user_id, content_type, publish_date);

-- Create instagram_analytics table
CREATE TABLE IF NOT EXISTS instagram_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  posts_count integer DEFAULT 0,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  views_impressions integer DEFAULT 0,
  engagement integer DEFAULT 0,
  followers integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS on instagram_analytics
ALTER TABLE instagram_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for instagram_analytics
CREATE POLICY "Users can manage own instagram data"
  ON instagram_analytics
  FOR ALL
  USING (auth.uid() = user_id);

-- Create index for instagram analytics
CREATE INDEX IF NOT EXISTS idx_instagram_user_date ON instagram_analytics(user_id, date DESC);

-- Create content_correlations table
CREATE TABLE IF NOT EXISTS content_correlations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_bucket date NOT NULL,
  platform_a text NOT NULL,
  metric_a text NOT NULL,
  platform_b text NOT NULL,
  metric_b text NOT NULL,
  correlation_coeff numeric NOT NULL,
  p_value numeric,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on content_correlations
ALTER TABLE content_correlations ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_correlations
CREATE POLICY "Users can view own correlations"
  ON content_correlations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert correlations"
  ON content_correlations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for correlations
CREATE INDEX IF NOT EXISTS idx_correlations_user_date ON content_correlations(user_id, date_bucket DESC);

-- Create yt_thumbnail_tests table
CREATE TABLE IF NOT EXISTS yt_thumbnail_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  variant_label text NOT NULL,
  ctr numeric DEFAULT 0,
  impressions integer DEFAULT 0,
  winner boolean DEFAULT false,
  window_start timestamp with time zone NOT NULL,
  window_end timestamp with time zone NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on yt_thumbnail_tests
ALTER TABLE yt_thumbnail_tests ENABLE ROW LEVEL SECURITY;

-- RLS policies for yt_thumbnail_tests
CREATE POLICY "Users can manage own thumbnail tests"
  ON yt_thumbnail_tests
  FOR ALL
  USING (auth.uid() = user_id);

-- Create index for thumbnail tests
CREATE INDEX IF NOT EXISTS idx_thumbnail_tests_user_video ON yt_thumbnail_tests(user_id, video_id);

-- Create social_accounts table for multi-account publishing
CREATE TABLE IF NOT EXISTS social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('youtube', 'linkedin', 'instagram', 'tiktok', 'twitter')),
  handle text NOT NULL,
  oauth_token text,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, platform, handle)
);

-- Enable RLS on social_accounts
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for social_accounts
CREATE POLICY "Users can manage own social accounts"
  ON social_accounts
  FOR ALL
  USING (auth.uid() = user_id);

-- Create guest_candidates table
CREATE TABLE IF NOT EXISTS guest_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  platform text NOT NULL,
  handle text NOT NULL,
  followers integer DEFAULT 0,
  source_url text,
  audience_overlap_estimate numeric,
  notes text,
  status text DEFAULT 'prospect' CHECK (status IN ('prospect', 'contacted', 'confirmed', 'declined')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on guest_candidates
ALTER TABLE guest_candidates ENABLE ROW LEVEL SECURITY;

-- RLS policies for guest_candidates
CREATE POLICY "Users can manage own guest candidates"
  ON guest_candidates
  FOR ALL
  USING (auth.uid() = user_id);

-- Create index for guest candidates
CREATE INDEX IF NOT EXISTS idx_guest_candidates_user_status ON guest_candidates(user_id, status);

-- Create youtube_external_signals table for third-party data
CREATE TABLE IF NOT EXISTS youtube_external_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  metric text NOT NULL,
  value numeric NOT NULL,
  source text NOT NULL,
  observed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on youtube_external_signals
ALTER TABLE youtube_external_signals ENABLE ROW LEVEL SECURITY;

-- RLS policies for youtube_external_signals
CREATE POLICY "Users can manage own external signals"
  ON youtube_external_signals
  FOR ALL
  USING (auth.uid() = user_id);

-- Create index for external signals
CREATE INDEX IF NOT EXISTS idx_external_signals_user_video ON youtube_external_signals(user_id, video_id, observed_at DESC);

-- Create trigger for updated_at on new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_instagram_analytics_updated_at BEFORE UPDATE ON instagram_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_correlations_updated_at BEFORE UPDATE ON content_correlations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_yt_thumbnail_tests_updated_at BEFORE UPDATE ON yt_thumbnail_tests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_social_accounts_updated_at BEFORE UPDATE ON social_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_guest_candidates_updated_at BEFORE UPDATE ON guest_candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();