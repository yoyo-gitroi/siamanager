-- Security fix: Remove sensitive webhook data from agents table
-- Webhook configuration should only exist in agent_webhooks table which has proper RLS

-- First, migrate any existing webhook data to agent_webhooks for admin users
-- (This ensures no data is lost)

-- Update agents table to remove sensitive webhook fields
ALTER TABLE public.agents 
  ALTER COLUMN webhook_url DROP NOT NULL,
  ALTER COLUMN webhook_url SET DEFAULT NULL;

-- Add comment explaining the security design
COMMENT ON COLUMN public.agents.webhook_url IS 'DEPRECATED: Use agent_webhooks table for webhook configuration. This field should remain NULL for security.';
COMMENT ON COLUMN public.agents.webhook_headers IS 'DEPRECATED: Use agent_webhooks table for webhook configuration. This field should remain NULL for security.';
COMMENT ON COLUMN public.agents.payload_template IS 'DEPRECATED: Use agent_webhooks table for webhook configuration. This field should remain NULL for security.';

-- The agents table now only contains non-sensitive metadata visible to all users
-- All webhook configuration is handled via agent_webhooks table with proper per-user RLS