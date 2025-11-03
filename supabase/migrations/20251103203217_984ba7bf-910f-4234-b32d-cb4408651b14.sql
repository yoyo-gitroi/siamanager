-- Create YouTube connection table for OAuth tokens and channel selection
CREATE TABLE IF NOT EXISTS public.youtube_connection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id VARCHAR(64),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create raw JSON archive table for auditing and reprocessing
CREATE TABLE IF NOT EXISTS public.youtube_raw_archive (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id VARCHAR(64) NOT NULL,
  report_type VARCHAR(64) NOT NULL,
  request_json JSONB NOT NULL,
  response_json JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sync state table to track last successful sync
CREATE TABLE IF NOT EXISTS public.youtube_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id VARCHAR(64) NOT NULL,
  last_sync_date DATE,
  last_sync_at TIMESTAMPTZ,
  status VARCHAR(32),
  last_error TEXT,
  rows_inserted INTEGER,
  rows_updated INTEGER,
  UNIQUE(user_id, channel_id)
);

-- Enable RLS on all tables
ALTER TABLE public.youtube_connection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_raw_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_sync_state ENABLE ROW LEVEL SECURITY;

-- RLS policies for youtube_connection
CREATE POLICY "Users can view their own connection"
  ON public.youtube_connection FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connection"
  ON public.youtube_connection FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connection"
  ON public.youtube_connection FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connection"
  ON public.youtube_connection FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for youtube_raw_archive
CREATE POLICY "Users can view their own archive"
  ON public.youtube_raw_archive FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own archive"
  ON public.youtube_raw_archive FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS policies for youtube_sync_state
CREATE POLICY "Users can view their own sync state"
  ON public.youtube_sync_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync state"
  ON public.youtube_sync_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync state"
  ON public.youtube_sync_state FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_youtube_connection_updated_at
  BEFORE UPDATE ON public.youtube_connection
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();