# Supabase Edge Functions Deployment Instructions

## Fixed Functions That Need Deployment

The following Edge Functions have been fixed to handle YouTube Analytics API impression metrics gracefully:

1. `yt-sync-daily-v2` - Daily sync function
2. `yt-backfill-v2` - Historical data backfill
3. `yt-sync-all-users-daily` - Automated daily sync for all users

## Deployment Methods

### Method 1: Using Supabase CLI (Recommended)

If you have Supabase CLI installed:

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase (if not already logged in)
supabase login

# Link your project
supabase link --project-ref pfrdaarzcxxlxlhlfhoh

# Deploy all functions
supabase functions deploy yt-sync-daily-v2
supabase functions deploy yt-backfill-v2
supabase functions deploy yt-sync-all-users-daily

# Or deploy all functions at once
supabase functions deploy
```

### Method 2: Using Supabase Dashboard (Manual)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/pfrdaarzcxxlxlhlfhoh

2. Navigate to **Edge Functions** in the left sidebar

3. For each function (`yt-sync-daily-v2`, `yt-backfill-v2`, `yt-sync-all-users-daily`):
   - Click on the function name
   - Click **"Deploy new version"** or **"Edit function"**
   - Copy the entire contents from:
     - `supabase/functions/yt-sync-daily-v2/index.ts`
     - `supabase/functions/yt-backfill-v2/index.ts`
     - `supabase/functions/yt-sync-all-users-daily/index.ts`
   - Paste into the editor
   - Click **"Deploy"**

### Method 3: Using GitHub Actions (If configured)

If you have CI/CD set up:

1. Push your changes to the main branch (already done)
2. The deployment should trigger automatically
3. Check your GitHub Actions tab to verify deployment

### Method 4: Pull Latest Code in Lovable

If you're using Lovable platform:

1. Open your project in Lovable
2. Pull the latest changes from the branch: `claude/analyze-codebase-structure-011CUrYgaSFPgdS17fA8SB26`
3. Lovable should automatically deploy the Supabase functions

## Verification

After deployment, verify the functions are updated:

1. Go to Supabase Dashboard → Edge Functions
2. Click on `yt-sync-daily-v2`
3. Check the "Deployments" tab - you should see a recent deployment
4. Try the "Manual Sync Yesterday" button in your app
5. Try running the backfill again

## What Changed

The functions now:
- ✅ Fetch basic metrics first (views, watch time, likes, comments)
- ✅ Try to fetch impression metrics separately
- ✅ Continue with zeros if impressions are unavailable
- ✅ Merge impression data if available
- ✅ Log when impressions are not accessible

## Expected Results After Deployment

- ✅ **Daily Sync** - Should work without errors
- ✅ **Backfill - Channel & Video Daily Metrics** - Should complete successfully
- ✅ **Backfill - Video Metadata** - Should complete successfully
- ✅ Video performance data should appear in dashboard
- ✅ Impressions/CTR will show as 0% (channel doesn't have access to this metric)

## Troubleshooting

If functions still fail after deployment:

1. **Check function logs** in Supabase Dashboard → Edge Functions → Logs
2. **Verify environment variables** are set correctly:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. **Test with curl** (get function URL from Supabase dashboard):
   ```bash
   curl -X POST https://pfrdaarzcxxlxlhlfhoh.supabase.co/functions/v1/yt-sync-daily-v2 \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json"
   ```

## Need Help?

If you encounter issues:
1. Check the Supabase function logs for detailed error messages
2. Verify your YouTube OAuth connection is still valid
3. Ensure the functions are deployed (check deployment timestamp)
4. Contact Supabase support or check their documentation
