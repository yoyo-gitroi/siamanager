-- Rollback migration: Remove the real-time YouTube snapshots cron job
-- Use this migration if you need to disable the real-time snapshot scheduling

SELECT cron.unschedule('youtube-realtime-snapshots');
