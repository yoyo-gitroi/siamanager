-- Create intraday video snapshots table for real-time data
CREATE TABLE public.yt_video_intraday (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  channel_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  view_count BIGINT DEFAULT 0,
  like_count BIGINT DEFAULT 0,
  comment_count BIGINT DEFAULT 0,
  concurrent_viewers INTEGER,
  is_live BOOLEAN DEFAULT false,
  UNIQUE(user_id, video_id, captured_at)
);

-- Create index for efficient queries
CREATE INDEX idx_yt_video_intraday_lookup ON public.yt_video_intraday(user_id, channel_id, video_id, captured_at DESC);

-- Enable RLS
ALTER TABLE public.yt_video_intraday ENABLE ROW LEVEL SECURITY;

-- RLS policy for video intraday data
CREATE POLICY "Users manage own video intraday data"
ON public.yt_video_intraday
FOR ALL
USING (auth.uid() = user_id);

-- Create intraday channel snapshots table for real-time data
CREATE TABLE public.yt_channel_intraday (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  channel_id TEXT NOT NULL,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  view_count BIGINT DEFAULT 0,
  subscriber_count BIGINT DEFAULT 0,
  video_count BIGINT DEFAULT 0,
  UNIQUE(user_id, channel_id, captured_at)
);

-- Create index for efficient queries
CREATE INDEX idx_yt_channel_intraday_lookup ON public.yt_channel_intraday(user_id, channel_id, captured_at DESC);

-- Enable RLS
ALTER TABLE public.yt_channel_intraday ENABLE ROW LEVEL SECURITY;

-- RLS policy for channel intraday data
CREATE POLICY "Users manage own channel intraday data"
ON public.yt_channel_intraday
FOR ALL
USING (auth.uid() = user_id);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.yt_video_intraday;
ALTER PUBLICATION supabase_realtime ADD TABLE public.yt_channel_intraday;