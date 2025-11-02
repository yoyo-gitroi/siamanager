-- Create table for logging shorts generation
CREATE TABLE public.shorts_generation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  video_url TEXT NOT NULL,
  number_of_shorts INTEGER NOT NULL,
  avg_video_time INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.shorts_generation_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own logs
CREATE POLICY "Users can insert their own logs" 
ON public.shorts_generation_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Only Yash Vats can view all logs
CREATE POLICY "Yash Vats can view all logs" 
ON public.shorts_generation_logs 
FOR SELECT 
USING (auth.email() = 'yash.vats@agentic.it');

-- Create index for better query performance
CREATE INDEX idx_shorts_logs_user_id ON public.shorts_generation_logs(user_id);
CREATE INDEX idx_shorts_logs_created_at ON public.shorts_generation_logs(created_at DESC);