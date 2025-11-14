-- Set up automatic real-time YouTube snapshots using pg_cron
-- This captures current channel stats and recent video metrics every 30 minutes

-- Schedule the real-time snapshot function to run every 30 minutes
SELECT cron.schedule(
  'youtube-realtime-snapshots',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://pfrdaarzcxxlxlhlfhoh.supabase.co/functions/v1/yt-realtime-snapshot',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcmRhYXJ6Y3h4bHhsaGxmaG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTA1NzksImV4cCI6MjA3NjEyNjU3OX0.PaaV3Z7a4XEalLq7Y7Dx-2bAEESP5sqgBEn8zQYwuaA"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
