-- Set up automatic daily YouTube sync for all users using pg_cron

-- Schedule the all-users sync function to run daily at 02:00 UTC
SELECT cron.schedule(
  'youtube-daily-sync-all-users',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pfrdaarzcxxlxlhlfhoh.supabase.co/functions/v1/yt-sync-all-users-daily',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcmRhYXJ6Y3h4bHhsaGxmaG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTA1NzksImV4cCI6MjA3NjEyNjU3OX0.PaaV3Z7a4XEalLq7Y7Dx-2bAEESP5sqgBEn8zQYwuaA"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);