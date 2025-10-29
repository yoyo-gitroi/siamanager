-- Fix 1: Add user_id to google_oauth_tokens and update RLS
ALTER TABLE public.google_oauth_tokens 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing admin-only policy
DROP POLICY IF EXISTS "Admins can manage tokens" ON public.google_oauth_tokens;

-- Create user-scoped policy
CREATE POLICY "Users manage own tokens"
ON public.google_oauth_tokens
FOR ALL
USING (auth.uid() = user_id);

-- Fix 2: Create oauth_states table for CSRF protection
CREATE TABLE public.oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on oauth_states
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- Policy for oauth_states (system-managed, users don't directly access)
CREATE POLICY "System can manage oauth states"
ON public.oauth_states
FOR ALL
USING (true);

-- Add index for performance
CREATE INDEX idx_oauth_states_state ON public.oauth_states(state);
CREATE INDEX idx_oauth_states_created_at ON public.oauth_states(created_at);

-- Clean up old states (older than 1 hour) - can be called periodically
CREATE OR REPLACE FUNCTION public.cleanup_old_oauth_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.oauth_states
  WHERE created_at < now() - interval '1 hour';
END;
$$;