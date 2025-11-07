-- Create quota tracking table
CREATE TABLE IF NOT EXISTS public.yt_api_quota_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  units_used integer NOT NULL DEFAULT 0,
  units_available integer NOT NULL DEFAULT 10000,
  last_reset_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.yt_api_quota_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own quota usage"
  ON public.yt_api_quota_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage quota usage"
  ON public.yt_api_quota_usage
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add index for performance
CREATE INDEX idx_quota_user_date ON public.yt_api_quota_usage(user_id, date);

-- Trigger for updated_at
CREATE TRIGGER update_quota_updated_at
  BEFORE UPDATE ON public.yt_api_quota_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();