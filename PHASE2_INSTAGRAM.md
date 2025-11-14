# Phase 2: Instagram Integration - Backend Complete ✅

## 🎯 Summary
Phase 2 implements the complete Instagram backend infrastructure, including OAuth, data syncing, and real-time tracking. This follows the same successful pattern from Phase 1 (YouTube integration).

---

## ✨ What's Been Implemented

### 1. Database Schema 📊
**File**: `supabase/migrations/20241114100000_instagram_integration_schema.sql`

Created 7 comprehensive tables:

#### Core Tables:
- **`instagram_connection`** - OAuth tokens & account info
  - Stores access tokens, Instagram user ID, username, account type
  - RLS policies for user data protection
  - Token expiry tracking

- **`instagram_account_daily`** - Daily account-level analytics
  - Followers, following, media counts
  - Impressions, reach, profile views
  - Engagement metrics (likes, comments, saves, shares)
  - Website/email/phone click tracking

- **`instagram_media`** - Media metadata (posts, reels, stories)
  - Media type, URL, thumbnail, permalink
  - Caption, timestamp
  - Story expiry tracking

- **`instagram_media_daily`** - Daily per-media insights
  - Engagement: likes, comments, saves, shares
  - Reach: impressions, reach
  - Video views, story interactions

#### Real-Time Tables:
- **`instagram_account_intraday`** - Account snapshots (every 30 mins)
- **`instagram_media_intraday`** - Media snapshots (recent posts)
- **`instagram_sync_state`** - Sync status & error tracking

**Features**:
- Full RLS (Row Level Security) policies
- Optimized indexes for query performance
- Unique constraints to prevent duplicates
- Automatic timestamp management

---

### 2. Shared Utilities 📦
**File**: `supabase/functions/_shared/instagram-api.ts`

Centralized Instagram Graph API utilities:

**Functions**:
- `getInstagramConnection()` - Get user's Instagram connection with token validation
- `queryInstagramAPI()` - Query Instagram Graph API with retry logic (3 attempts)
- `getAccountInsights()` - Fetch account-level insights
- `getMediaInsights()` - Fetch per-media insights
- `getMediaList()` - Get list of posts/reels/stories
- `getAccountInfo()` - Get current account stats

**Constants**:
- `ACCOUNT_METRICS.DAILY` - Available account metrics
- `MEDIA_METRICS.POST/VIDEO/STORY` - Available media metrics

---

### 3. OAuth Flow 🔐

#### `instagram-oauth-start` ✅
**File**: `supabase/functions/instagram-oauth-start/index.ts`

**What it does**:
- Initiates Facebook/Instagram OAuth flow
- Generates authorization URL with required permissions
- Includes CSRF protection (state parameter)

**Required Permissions**:
- `instagram_basic` - Basic account info
- `instagram_manage_insights` - Read insights
- `pages_read_engagement` - Read page data
- `pages_show_list` - List connected pages
- `business_management` - Business account access

**Environment Variables Needed**:
```
FACEBOOK_APP_ID=your_facebook_app_id
INSTAGRAM_REDIRECT_URI=https://your-domain.com/instagram/callback
```

#### `instagram-oauth-callback` ✅
**File**: `supabase/functions/instagram-oauth-callback/index.ts`

**What it does**:
1. Exchanges authorization code for access token
2. Exchanges short-lived token for long-lived token (60 days)
3. Fetches user's Facebook Pages
4. Identifies Instagram Business Account connected to page
5. Fetches Instagram account details
6. Stores connection in database

**Important Notes**:
- Only works with Instagram **Business** or **Creator** accounts
- Instagram account must be connected to a Facebook Page
- Tokens expire after 60 days (refresh mechanism TODO)

---

### 4. Data Sync Functions 🔄

#### `instagram-sync-daily` ✅
**File**: `supabase/functions/instagram-sync-daily/index.ts`

**What it does**:
- Fetches account-level insights for yesterday
- Stores daily metrics in `instagram_account_daily`
- Updates sync state

**Metrics Collected**:
- Impressions, reach, profile views
- Website/email/phone clicks
- Direction button clicks

**Usage**:
- Manual: User triggers via UI
- Automated: Can be scheduled via cron (TODO: create wrapper for all users)

#### `instagram-realtime-snapshot` ✅
**File**: `supabase/functions/instagram-realtime-snapshot/index.ts`

**What it does**:
- Captures current follower/following/media counts
- Fetches recent media engagement (last 10 posts)
- Stores snapshots in `*_intraday` tables
- Runs automatically every 30 minutes via cron

**Scheduled**: Every 30 minutes (see migration below)

#### `instagram-fetch-media` ✅
**File**: `supabase/functions/instagram-fetch-media/index.ts`

**What it does**:
- Fetches media metadata (posts, reels, stories)
- Fetches per-media insights (engagement, reach, saves)
- Stores in `instagram_media` and `instagram_media_daily`
- Rate-limited: 100ms between media items

**Usage**:
- Manual: User triggers to refresh media library
- Query params: `?limit=50` (default: 50, max: varies by API)

---

### 5. Cron Jobs ⏰
**File**: `supabase/migrations/20241114110000_instagram_cron_jobs.sql`

**Scheduled Jobs**:
- ✅ **Real-time snapshots**: Every 30 minutes
  - Captures current followers, engagement
  - Similar to YouTube real-time tracking

**TODO** (Future Enhancement):
- Daily sync for all users (like `yt-sync-all-users-daily`)
- Would need a wrapper function to iterate through all Instagram connections

---

### 6. Configuration ⚙️
**File**: `supabase/config.toml`

Added Instagram function configurations:
```toml
[functions.instagram-oauth-start]
verify_jwt = true

[functions.instagram-oauth-callback]
verify_jwt = true

[functions.instagram-sync-daily]
verify_jwt = true

[functions.instagram-realtime-snapshot]
verify_jwt = false  # Cron job

[functions.instagram-fetch-media]
verify_jwt = true
```

---

## 📋 Environment Variables Required

Add these to your Supabase project settings:

```env
# Facebook/Instagram OAuth
FACEBOOK_APP_ID=your_facebook_app_id_here
FACEBOOK_APP_SECRET=your_facebook_app_secret_here
INSTAGRAM_REDIRECT_URI=https://your-domain.com/instagram/callback

# Note: Existing Supabase env vars are reused
# SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

---

## 🚀 Deployment Instructions

### 1. Apply Database Migrations
```bash
# Local development
supabase db reset

# Or apply specific migrations
supabase migration up

# Production (via Supabase Dashboard)
# Database → Migrations → Run migrations
```

### 2. Deploy Edge Functions
```bash
# Deploy all Instagram functions
supabase functions deploy instagram-oauth-start
supabase functions deploy instagram-oauth-callback
supabase functions deploy instagram-sync-daily
supabase functions deploy instagram-realtime-snapshot
supabase functions deploy instagram-fetch-media

# Deploy shared utilities (auto-deployed with functions)
```

### 3. Set Environment Variables
```bash
# Via Supabase Dashboard
# Settings → Edge Functions → Environment variables

# Or via CLI
supabase secrets set FACEBOOK_APP_ID=your_app_id
supabase secrets set FACEBOOK_APP_SECRET=your_secret
supabase secrets set INSTAGRAM_REDIRECT_URI=your_redirect_uri
```

### 4. Verify Cron Jobs
```sql
-- Check if cron job is scheduled
SELECT * FROM cron.job WHERE jobname = 'instagram-realtime-snapshots';

-- View recent cron runs
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'instagram-realtime-snapshots')
ORDER BY start_time DESC
LIMIT 10;
```

---

## 🧪 Testing

### Test OAuth Flow
1. Call `instagram-oauth-start` with user JWT
2. Open returned `authUrl` in browser
3. Authorize Facebook/Instagram permissions
4. Callback will store connection in database

### Test Data Sync
```bash
# Test daily sync (with user JWT)
curl -X POST https://your-project.supabase.co/functions/v1/instagram-sync-daily \
  -H "Authorization: Bearer YOUR_USER_JWT"

# Test media fetch
curl -X POST https://your-project.supabase.co/functions/v1/instagram-fetch-media \
  -H "Authorization: Bearer YOUR_USER_JWT"

# Test realtime snapshot (no auth needed - cron job)
supabase functions invoke instagram-realtime-snapshot
```

### Verify Data
```sql
-- Check connections
SELECT * FROM instagram_connection;

-- Check daily insights
SELECT * FROM instagram_account_daily ORDER BY day DESC LIMIT 10;

-- Check realtime snapshots
SELECT * FROM instagram_account_intraday ORDER BY captured_at DESC LIMIT 10;

-- Check media
SELECT * FROM instagram_media ORDER BY timestamp DESC LIMIT 10;
```

---

## 📱 Frontend Integration (TODO)

### Prerequisites
The backend is complete. Now you need to build the frontend:

### 1. Create Instagram Hooks
**Location**: `src/hooks/useInstagram.ts` (or similar)

**Recommended Hooks**:
```typescript
// useInstagramConnection - Check if user has Instagram connected
// useInstagramOAuth - Handle OAuth flow
// useInstagramDailyData - Fetch daily account insights
// useInstagramRealtimeData - Subscribe to realtime snapshots
// useInstagramMedia - Fetch media list
// useInstagramSyncStatus - Check sync state
```

**Example Hook Structure** (based on YouTube hooks):
```typescript
export const useInstagramConnection = () => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['instagram-connection'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instagram_connection')
        .select('*')
        .eq('user_id', session?.user?.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });
};
```

### 2. Create Instagram Pages

#### Setup/Connect Page
**Location**: `src/pages/InstagramSetup.tsx`

**Features**:
- Button to initiate OAuth flow
- Display current connection status
- Show Instagram username, profile picture
- Disconnect button

**Flow**:
1. User clicks "Connect Instagram"
2. Call `instagram-oauth-start` function
3. Redirect to returned `authUrl`
4. Handle callback (you might need a route for this)
5. Show success message

#### Analytics Dashboard
**Location**: `src/pages/InstagramAnalytics.tsx`

**Sections**:
- **Overview**: Followers, following, media count (real-time)
- **Daily Metrics**: Impressions, reach, profile views (charts)
- **Recent Posts**: Media grid with engagement stats
- **Sync Status**: Last sync time, next sync time, errors

### 3. Create Instagram Components

**Recommended Components**:
```
src/components/instagram/
├── InstagramMetricCard.tsx      - Display individual metrics
├── InstagramMediaGrid.tsx       - Grid of posts/reels
├── InstagramMediaCard.tsx       - Individual media item
├── InstagramEngagementChart.tsx - Engagement trends
├── InstagramSyncStatus.tsx      - Sync state indicator
└── InstagramConnectButton.tsx   - OAuth trigger button
```

### 4. Add to Navigation
Update your main navigation to include:
- Instagram setup/connect page
- Instagram analytics page
- Badge/indicator if not connected

### 5. Unified Analytics (Optional)
**Location**: `src/pages/UnifiedAnalytics.tsx`

Combine YouTube + Instagram metrics:
- Total followers across platforms
- Combined engagement rates
- Cross-platform performance comparison

---

## 🎨 UI/UX Recommendations

Based on your existing YouTube implementation:

### Color Scheme
- Instagram purple/pink gradient: `bg-gradient-to-r from-purple-500 to-pink-500`
- Use Instagram's brand colors for consistency

### Components to Mirror from YouTube
- Metric cards (similar to YouTube channel stats)
- Sync status indicator (similar to YouTube)
- Date range picker for analytics
- Real-time update badges ("Live" indicator)

### Charts & Visualizations
- Follower growth over time (line chart)
- Engagement rate (line chart)
- Top performing posts (bar chart or grid)
- Story reach vs posts reach (comparison)

---

## 🔐 Instagram API Limitations

### Rate Limits
- **Account Insights**: 200 calls/hour per user
- **Media Insights**: 200 calls/hour per user
- Our implementation includes retry logic and rate limiting

### Data Availability
- **Insights**: Available for last 2 years
- **Real-time data**: Current counts (followers, engagement)
- **Stories**: Only available for 24 hours after posting

### Account Requirements
- ✅ Instagram Business or Creator account
- ✅ Connected to a Facebook Page
- ✅ Facebook App approved for Instagram permissions
- ❌ Personal accounts NOT supported

---

## 🐛 Troubleshooting

### "No Instagram Business Account found"
- Ensure Instagram account is set to Business or Creator
- Connect Instagram to a Facebook Page
- Verify page permissions

### "Token expired"
- Tokens expire after 60 days
- User needs to reconnect (TODO: implement token refresh)

### "Missing permissions"
- Verify Facebook App has required permissions
- Check App Review status for Instagram permissions

### Cron job not running
```sql
-- Check cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check job schedule
SELECT * FROM cron.job WHERE jobname LIKE 'instagram%';

-- Check for errors
SELECT * FROM cron.job_run_details
WHERE status = 'failed'
ORDER BY start_time DESC;
```

---

## 📊 What's Next?

### Immediate Next Steps
1. ✅ Build frontend hooks
2. ✅ Create Instagram setup page
3. ✅ Create Instagram analytics dashboard
4. ✅ Add Instagram to navigation
5. ✅ Test end-to-end flow

### Future Enhancements
- **Token Refresh**: Auto-refresh tokens before expiry
- **All Users Daily Sync**: Create wrapper function (like YouTube)
- **Audience Insights**: Demographics, age, gender, location
- **Hashtag Analysis**: Track hashtag performance
- **Competitor Tracking**: Compare with other accounts
- **Instagram Stories Analytics**: Separate stories dashboard
- **Export Data**: Download Instagram data as CSV/PDF

---

## 🎯 Success Metrics

After frontend implementation, you should be able to:
- ✅ Connect Instagram Business accounts via OAuth
- ✅ View real-time follower counts (updated every 30 mins)
- ✅ See daily insights (impressions, reach, profile views)
- ✅ Track post/reel performance (engagement, saves, shares)
- ✅ Compare Instagram vs YouTube performance
- ✅ Monitor sync status and handle errors gracefully

---

## 📚 Related Documentation

- [Instagram Graph API Docs](https://developers.facebook.com/docs/instagram-api)
- [Instagram Insights API](https://developers.facebook.com/docs/instagram-api/reference/ig-user/insights)
- [Facebook App Setup](https://developers.facebook.com/docs/development/create-an-app)
- Phase 1 Refactoring: See `REFACTORING.md`

---

**Phase 2 Backend Status**: ✅ **COMPLETE**
**Phase 2 Frontend Status**: ⏳ **TODO**

Once frontend is built, Instagram integration will be fully functional! 🎉
