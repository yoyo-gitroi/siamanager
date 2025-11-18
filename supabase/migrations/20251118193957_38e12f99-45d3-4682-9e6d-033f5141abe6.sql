-- Create table for AI-processed YouTube insights
CREATE TABLE IF NOT EXISTS yt_processed_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel_id text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  insights_data jsonb NOT NULL,
  processed_at timestamptz DEFAULT now(),
  version integer DEFAULT 1,
  CONSTRAINT fk_insights_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE yt_processed_insights ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users manage own insights"
  ON yt_processed_insights
  FOR ALL
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_insights_user_date ON yt_processed_insights(user_id, period_end DESC);