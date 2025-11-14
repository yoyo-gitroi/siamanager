-- Instagram Cron Jobs
-- Schedule automated Instagram syncs

-- ============================================================================
-- 1. Instagram Real-Time Snapshots (every 30 minutes)
-- ============================================================================
SELECT cron.schedule(
  'instagram-realtime-snapshots',
  '*/30 * * * *',  -- Every 30 minutes
  $$
  SELECT net.http_post(
    url := 'https://pfrdaarzcxxlxlhlfhoh.supabase.co/functions/v1/instagram-realtime-snapshot',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcmRhYXJ6Y3h4bHhsaGxmaG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTA1NzksImV4cCI6MjA3NjEyNjU3OX0.PaaV3Z7a4XEalLq7Y7Dx-2bAEESP5sqgBEn8zQYwuaA"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- ============================================================================
-- 2. Instagram Daily Sync (runs at 3:00 AM UTC)
-- ============================================================================
-- Note: This would need to be a wrapper function that calls instagram-sync-daily
-- for all users, similar to yt-sync-all-users-daily
-- For now, users can manually trigger daily syncs or we can add this in a follow-up

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON EXTENSION cron IS 'Instagram cron jobs for automated data collection';
