-- Fix critical security issue: Restrict agent_runs SELECT to users' own data
-- Current policy allows any authenticated user to view ALL agent runs

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view agent runs" ON public.agent_runs;

-- Create restrictive policy that only allows users to see their own runs
CREATE POLICY "Users view own agent runs"
ON public.agent_runs 
FOR SELECT
USING (auth.uid() = user_id);

-- Also ensure user_id is not nullable to prevent security bypass
ALTER TABLE public.agent_runs 
  ALTER COLUMN user_id SET NOT NULL;