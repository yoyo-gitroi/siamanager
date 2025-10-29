-- Fix search_path warning for cleanup_old_oauth_states function
CREATE OR REPLACE FUNCTION public.cleanup_old_oauth_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.oauth_states
  WHERE created_at < now() - interval '1 hour';
END;
$$;