# Phase 1 Refactoring: Shared Utilities & Code Cleanup

## Summary
This PR implements Phase 1 of the SiaManager refactoring plan, focusing on:
1. ✅ Scheduling real-time YouTube snapshots (every 30 minutes)
2. ✅ Creating shared utilities library to eliminate code duplication
3. ✅ Refactoring core edge functions to use shared utilities
4. ✅ Deleting redundant functions

## Changes

### 1. Real-Time YouTube Snapshots (Fixes Data Freshness Issue)

**Problem**: Data was 2-3 days old because daily sync only used YouTube Analytics API which has reporting delays.

**Solution**: Scheduled `yt-realtime-snapshot` to run every 30 minutes via pg_cron.

**Files Added**:
- `supabase/migrations/20241114000000_add_youtube_realtime_snapshots_cron.sql`
- `supabase/migrations/20241114000001_rollback_youtube_realtime_snapshots_cron.sql`
- `supabase/migrations/README_realtime_snapshots.md`

**Impact**:
- Users now see data updated every 30 minutes instead of 2-3 days old
- Captures current channel stats (subscribers, views, video count)
- Fetches real-time metrics for recent videos (last 48 hours)
- Quota-safe: ~120 API units per user per day (well within 10,000 limit)

### 2. Shared Utilities Library (Eliminates ~500+ Lines of Duplicate Code)

**Problem**: Token refresh, API queries, and quota tracking were duplicated across 20+ edge functions.

**Solution**: Created centralized shared utilities that all functions can import.

**Files Added**:
- `supabase/functions/_shared/youtube-auth.ts` - Token management (refresh, validation)
- `supabase/functions/_shared/youtube-api.ts` - YouTube API queries with retry logic
- `supabase/functions/_shared/quota.ts` - API quota tracking and management

**Features**:
- **youtube-auth.ts**:
  - `refreshToken()` - Refresh expired OAuth tokens
  - `getValidToken()` - Get valid token with automatic refresh
  - `hasYouTubeConnection()` - Check if user has connected account

- **youtube-api.ts**:
  - `queryYouTubeAnalytics()` - Analytics API with retry logic
  - `queryYouTubeDataAPI()` - Data API with retry logic
  - `getQuarterChunks()` - Split date ranges for large queries
  - `getDaysAgo()` - Date helper utilities

- **quota.ts**:
  - `trackQuotaUsage()` - Track API usage per user
  - `canProceed()` - Check if user can make more API calls
  - `getQuotaStats()` - Get usage statistics
  - Configurable thresholds (80% warning, 90% critical)

### 3. Refactored Edge Functions

**Functions Updated to Use Shared Utilities**:

#### `yt-realtime-snapshot/index.ts`
- **Before**: 333 lines
- **After**: 196 lines
- **Reduction**: 137 lines (41%)
- **Changes**:
  - Removed duplicate `refreshToken()`, `getValidToken()`, `queryYouTubeDataAPI()`, `trackQuotaUsage()`
  - Now imports from shared utilities
  - Better quota checking with `canProceed()`

#### `yt-sync-daily-v2/index.ts`
- **Before**: 339 lines
- **After**: 229 lines
- **Reduction**: 110 lines (32%)
- **Changes**:
  - Removed duplicate token management
  - Removed duplicate `queryYouTubeAnalytics()`
  - Uses `getDaysAgo(3)` helper

#### `yt-sync-all-users-daily/index.ts`
- **Before**: 314 lines
- **After**: 237 lines
- **Reduction**: 77 lines (24%)
- **Changes**:
  - Removed duplicate token refresh logic
  - Cleaner token validation
  - Uses shared API query functions

**Total Code Reduction**: 324 lines eliminated across 3 functions

### 4. Deleted Redundant Functions

**Functions Removed**:
- ❌ `yt-sync-daily` - Superseded by `yt-sync-daily-v2`
- ❌ `yt-backfill` - Superseded by `yt-backfill-v2`
- ❌ `yt-analytics-test` - Testing function no longer needed

**Functions Kept**:
- ✅ `yt-sync-daily-v2` - Manual single-user sync
- ✅ `yt-sync-all-users-daily` - Automated daily sync for all users
- ✅ `yt-backfill-v2` - Comprehensive backfill
- ✅ `yt-backfill-comprehensive` - Wrapper to orchestrate all backfills
- ✅ `yt-realtime-snapshot` - Real-time data capture

## Impact & Benefits

### Immediate Benefits
1. **Data Freshness**: Users see current data (30-min delay) instead of 2-3 days old
2. **Code Maintainability**: Single source of truth for auth, API calls, and quota management
3. **Reduced Duplication**: ~324 lines removed with more to come
4. **Easier Debugging**: Bugs fixed once in shared utilities apply everywhere
5. **Better Quota Management**: Improved tracking and warnings

### Future Benefits
- Easy to add new edge functions (just import shared utilities)
- Consistent error handling across all functions
- Simple to add new platforms (Instagram, LinkedIn) using same pattern
- Easier onboarding for new developers

## Testing Checklist

### Local Testing (Supabase CLI)
```bash
# Apply migrations
supabase db reset

# Verify cron job is scheduled
supabase db psql -c "SELECT * FROM cron.job WHERE jobname = 'youtube-realtime-snapshots';"

# Test refactored functions
supabase functions invoke yt-realtime-snapshot
supabase functions invoke yt-sync-daily-v2 --header "Authorization: Bearer YOUR_JWT"

# Check data
supabase db psql -c "SELECT * FROM yt_channel_intraday ORDER BY captured_at DESC LIMIT 5;"
supabase db psql -c "SELECT * FROM yt_video_intraday ORDER BY captured_at DESC LIMIT 5;"
```

### Production Deployment
1. **Deploy functions first**:
   ```bash
   supabase functions deploy yt-realtime-snapshot
   supabase functions deploy yt-sync-daily-v2
   supabase functions deploy yt-sync-all-users-daily
   ```

2. **Apply migration** (via Supabase Dashboard):
   - Go to Database → Migrations
   - Run `20241114000000_add_youtube_realtime_snapshots_cron.sql`
   - Verify: `SELECT * FROM cron.job WHERE jobname = 'youtube-realtime-snapshots';`

3. **Monitor**:
   - Check function logs: `supabase functions logs yt-realtime-snapshot`
   - Check cron runs: `SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'youtube-realtime-snapshots') ORDER BY start_time DESC LIMIT 10;`

## Next Steps (Phase 2)

### Remaining Functions to Refactor
These functions still have duplicate code and should be refactored in follow-up PRs:
- `yt-backfill-v2`
- `yt-fetch-video-metadata`
- `yt-fetch-revenue`
- `yt-fetch-demographics`
- `yt-fetch-geography`
- `yt-fetch-traffic`
- `yt-fetch-devices`
- `yt-fetch-retention`
- `yt-fetch-playlists`
- `yt-fetch-search-terms`
- `yt-validate-channel`
- `yt-update-channel`
- `yt-list-channels`

**Estimated impact**: Additional ~200-300 lines of code reduction

### Instagram Integration (Phase 2)
After code cleanup, we'll implement full Instagram analytics:
1. OAuth setup
2. Data fetching edge functions
3. Frontend components
4. Real-time snapshots (same pattern as YouTube)

## Breaking Changes
None - all changes are backward compatible.

## Rollback Plan
If issues arise with real-time snapshots:
```sql
-- Disable cron job
SELECT cron.unschedule('youtube-realtime-snapshots');

-- Or run rollback migration
-- Execute: 20241114000001_rollback_youtube_realtime_snapshots_cron.sql
```

## Performance Considerations
- Real-time snapshots: ~120 API units per user per day
- Quota tracking prevents exceeding limits (80% warning, 90% critical)
- Rate limiting: 500ms delay between users in batch syncs
- All API calls have retry logic (3 attempts with exponential backoff)

## Documentation
- Added comprehensive README for real-time snapshots migration
- Inline comments in all shared utility functions
- JSDoc comments for all exported functions

---

**Reviewed by**: [Pending Review]
**Deployed to Production**: [Pending]
**Related Issues**: Fixes data freshness issue, addresses technical debt
