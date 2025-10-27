-- Extend youtube_analytics with new columns (skip if exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='youtube_analytics' AND column_name='subscribers') THEN
    ALTER TABLE youtube_analytics ADD COLUMN subscribers integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='youtube_analytics' AND column_name='watch_hours') THEN
    ALTER TABLE youtube_analytics ADD COLUMN watch_hours numeric DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='youtube_analytics' AND column_name='content_type') THEN
    ALTER TABLE youtube_analytics ADD COLUMN content_type text DEFAULT 'other' CHECK (content_type IN ('short', 'long', 'other'));
  END IF;
END $$;

-- Create index for content_type filtering
CREATE INDEX IF NOT EXISTS idx_youtube_content_type ON youtube_analytics(user_id, content_type, publish_date);

-- Extend linkedin_analytics with followers column
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='linkedin_analytics' AND column_name='followers') THEN
    ALTER TABLE linkedin_analytics ADD COLUMN followers integer DEFAULT 0;
  END IF;
END $$;

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

ALTER TABLE content_correlations ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='content_correlations' AND policyname='Users can view own correlations') THEN
    CREATE POLICY "Users can view own correlations" ON content_correlations FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='content_correlations' AND policyname='System can insert correlations') THEN
    CREATE POLICY "System can insert correlations" ON content_correlations FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

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

ALTER TABLE yt_thumbnail_tests ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='yt_thumbnail_tests' AND policyname='Users can manage own thumbnail tests') THEN
    CREATE POLICY "Users can manage own thumbnail tests" ON yt_thumbnail_tests FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_thumbnail_tests_user_video ON yt_thumbnail_tests(user_id, video_id);

-- Create social_accounts table
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

ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='social_accounts' AND policyname='Users can manage own social accounts') THEN
    CREATE POLICY "Users can manage own social accounts" ON social_accounts FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

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

ALTER TABLE guest_candidates ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='guest_candidates' AND policyname='Users can manage own guest candidates') THEN
    CREATE POLICY "Users can manage own guest candidates" ON guest_candidates FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_guest_candidates_user_status ON guest_candidates(user_id, status);

-- Create youtube_external_signals table
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

ALTER TABLE youtube_external_signals ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='youtube_external_signals' AND policyname='Users can manage own external signals') THEN
    CREATE POLICY "Users can manage own external signals" ON youtube_external_signals FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_external_signals_user_video ON youtube_external_signals(user_id, video_id, observed_at DESC);

-- Create triggers for updated_at
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_content_correlations_updated_at') THEN
    CREATE TRIGGER update_content_correlations_updated_at BEFORE UPDATE ON content_correlations FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_yt_thumbnail_tests_updated_at') THEN
    CREATE TRIGGER update_yt_thumbnail_tests_updated_at BEFORE UPDATE ON yt_thumbnail_tests FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_social_accounts_updated_at') THEN
    CREATE TRIGGER update_social_accounts_updated_at BEFORE UPDATE ON social_accounts FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_guest_candidates_updated_at') THEN
    CREATE TRIGGER update_guest_candidates_updated_at BEFORE UPDATE ON guest_candidates FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;
END $$;