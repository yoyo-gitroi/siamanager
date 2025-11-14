# Real-Time YouTube Snapshots Cron Job

## Overview
This migration adds automatic scheduling for the `yt-realtime-snapshot` edge function to capture current YouTube analytics data every 30 minutes.

## What it does
- **Frequency**: Runs every 30 minutes (`*/30 * * * *`)
- **Function**: Calls `yt-realtime-snapshot` edge function
- **Data captured**:
  - Current channel statistics (subscriber count, total views, video count)
  - Recent video metrics (views, likes, comments) for videos published in last 48 hours
  - Live stream concurrent viewer counts (if streaming)
- **Storage**: Data saved to `yt_channel_intraday` and `yt_video_intraday` tables

## Why this is needed
- **Problem**: The daily sync (`yt-sync-all-users-daily`) fetches data from 3 days ago due to YouTube Analytics API reporting delays
- **Solution**: Real-time snapshots use YouTube Data API to get current counts, giving users up-to-date metrics
- **Impact**: Users see data updated every 30 minutes instead of 2-3 days old data

## Quota Usage
- **Per run (per user)**: ~2-3 API units
  - 1 unit: Channel statistics
  - 1-2 units: Recent video statistics (1 unit per 50 videos)
- **Daily estimate**: 48 runs × 2.5 units = ~120 units per user per day
- **Safety**: Quota tracking prevents exceeding 8,000 units/day (80% of 10,000 limit)

## Files
- `20241114000000_add_youtube_realtime_snapshots_cron.sql` - Main migration to add cron job
- `20241114000001_rollback_youtube_realtime_snapshots_cron.sql` - Rollback migration to remove cron job

## How to apply

### Using Supabase CLI (local development)
```bash
# Apply the migration
supabase db reset

# Or apply specific migration
supabase migration up
```

### Using Supabase Dashboard (production)
1. Go to Database → Migrations in your Supabase dashboard
2. Run the SQL from `20241114000000_add_youtube_realtime_snapshots_cron.sql`
3. Verify the job is scheduled:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'youtube-realtime-snapshots';
   ```

## Verification

### Check if cron job is scheduled
```sql
SELECT * FROM cron.job WHERE jobname = 'youtube-realtime-snapshots';
```

### View recent snapshots
```sql
-- Channel snapshots
SELECT * FROM yt_channel_intraday
ORDER BY captured_at DESC
LIMIT 10;

-- Video snapshots
SELECT * FROM yt_video_intraday
ORDER BY captured_at DESC
LIMIT 10;
```

### Monitor cron job execution
```sql
-- View cron job run history
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'youtube-realtime-snapshots')
ORDER BY start_time DESC
LIMIT 20;
```

## Rollback
If you need to disable the real-time snapshots:

```sql
-- Option 1: Run the rollback migration
-- Execute: 20241114000001_rollback_youtube_realtime_snapshots_cron.sql

-- Option 2: Manual unschedule
SELECT cron.unschedule('youtube-realtime-snapshots');
```

## Adjusting Frequency
To change the snapshot frequency, update the cron schedule:

```sql
-- Update to run every 15 minutes
SELECT cron.alter_job('youtube-realtime-snapshots', schedule := '*/15 * * * *');

-- Update to run every hour
SELECT cron.alter_job('youtube-realtime-snapshots', schedule := '0 * * * *');

-- Update to run every 2 hours
SELECT cron.alter_job('youtube-realtime-snapshots', schedule := '0 */2 * * *');
```

## Monitoring & Troubleshooting

### Check function logs
```bash
# View edge function logs
supabase functions logs yt-realtime-snapshot
```

### Common issues

1. **Cron job not running**
   - Verify `pg_cron` extension is enabled: `CREATE EXTENSION IF NOT EXISTS pg_cron;`
   - Check if job exists: `SELECT * FROM cron.job;`

2. **No data in intraday tables**
   - Verify users have YouTube connections: `SELECT COUNT(*) FROM youtube_connection;`
   - Check for recent videos: `SELECT COUNT(*) FROM yt_video_metadata WHERE published_at > NOW() - INTERVAL '48 hours';`
   - View function logs for errors

3. **Quota errors**
   - Check quota usage: `SELECT * FROM yt_api_quota_usage WHERE date = CURRENT_DATE;`
   - Reduce frequency if needed (see "Adjusting Frequency" above)

## Related Functions
- `yt-sync-all-users-daily` - Daily comprehensive sync (runs at 2:00 AM UTC)
- `yt-realtime-snapshot` - The edge function this cron job calls
- Frontend hook: `useYouTubeRealtime` - Subscribes to real-time updates
