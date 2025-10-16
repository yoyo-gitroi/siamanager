-- Create agents table
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  pillar TEXT NOT NULL,
  description TEXT,
  webhook_url TEXT,
  webhook_method TEXT DEFAULT 'POST',
  webhook_headers JSONB DEFAULT '{}'::jsonb,
  payload_template JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'error', 'paused')),
  last_run_at TIMESTAMP WITH TIME ZONE,
  avg_latency_ms INTEGER DEFAULT 0,
  success_rate NUMERIC(5,2) DEFAULT 100.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agent_runs table
CREATE TABLE IF NOT EXISTS public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'error', 'cancelled')),
  latency_ms INTEGER,
  request_body JSONB,
  response_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content_queue table
CREATE TABLE IF NOT EXISTS public.content_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platforms TEXT[] NOT NULL,
  media_url TEXT,
  title TEXT,
  caption TEXT,
  schedule_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'published', 'failed', 'cancelled')),
  published_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agents (viewable by all authenticated, manageable by admin/editor)
CREATE POLICY "Authenticated users can view agents"
  ON public.agents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage agents"
  ON public.agents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for agent_runs
CREATE POLICY "Authenticated users can view agent runs"
  ON public.agent_runs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create agent runs"
  ON public.agent_runs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for content_queue
CREATE POLICY "Users can view own content"
  ON public.content_queue FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own content"
  ON public.content_queue FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_content_queue_updated_at
  BEFORE UPDATE ON public.content_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert default agents
INSERT INTO public.agents (name, pillar, description) VALUES
  ('Link→Shorts / ReelConverter', 'Content', 'Convert YouTube videos into short-form content for Reels and Shorts'),
  ('Multi-Channel Publisher', 'Publishing', 'Publish content across multiple social media platforms simultaneously'),
  ('Topic Suggestor', 'Strategy', 'AI-powered topic and content idea generator based on trends'),
  ('Scheduling Agent', 'Publishing', 'Optimize posting schedules based on audience engagement patterns'),
  ('Guest Suggestor', 'Strategy', 'Recommend potential guest collaborators based on audience overlap')
ON CONFLICT DO NOTHING;