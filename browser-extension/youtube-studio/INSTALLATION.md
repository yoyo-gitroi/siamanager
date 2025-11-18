# YouTube Studio Extension - Installation Guide

## Quick Start (5 minutes)

### Step 1: Backend Setup (2 minutes)

1. **Run the database migration:**
   ```bash
   cd /home/user/siamanager
   supabase db push
   ```

2. **Deploy the Edge Functions:**
   ```bash
   supabase functions deploy youtube-studio-ingest
   supabase functions deploy youtube-studio-analyze
   ```

3. **Verify deployment:**
   ```bash
   supabase functions list
   ```
   You should see `youtube-studio-ingest` and `youtube-studio-analyze` in the list.

### Step 2: Install Browser Extension (2 minutes)

1. **Open Chrome Extensions page:**
   - Type `chrome://extensions/` in address bar, or
   - Menu → More Tools → Extensions

2. **Enable Developer Mode:**
   - Toggle the switch in the top right corner

3. **Load the extension:**
   - Click "Load unpacked"
   - Navigate to and select: `/home/user/siamanager/browser-extension/youtube-studio`
   - Click "Select Folder"

4. **Verify installation:**
   - You should see "YouTube Studio Analytics for Sia" in your extensions list
   - Pin it to your toolbar for easy access (click the puzzle icon → pin)

### Step 3: Configure Extension (1 minute)

1. **Click the extension icon** in Chrome toolbar

2. **Enter your configuration:**
   - **Sia API URL**:
     - Find this in your Supabase dashboard
     - Format: `https://xxxxx.supabase.co`
     - Example: `https://abc123.supabase.co`

   - **User ID**:
     - Go to Sia Manager → Settings
     - Copy your User ID
     - Or check your browser console: `supabase.auth.getUser()`

   - **API Key** (optional):
     - Go to Supabase dashboard → Settings → API
     - Copy the `anon` key (public)
     - This is recommended for secure access

3. **Save configuration**

4. **Enable options:**
   - ✅ Auto-extract data on page load (recommended)
   - ✅ Batch data before sending (reduces API calls)

5. **Click "Save Options"**

### Step 4: Test It! (1 minute)

1. **Navigate to YouTube Studio:**
   - Go to [studio.youtube.com](https://studio.youtube.com)
   - Log in if needed

2. **Verify extension is working:**
   - Look for extension logs in browser console (F12 → Console)
   - Should see: 🎬 Sia YouTube Studio Extension: Content script loaded
   - Should see: ✅ Sia credentials found

3. **Check the extension popup:**
   - Click the extension icon
   - Statistics should start updating
   - "Total Extractions" should increase

4. **View insights in Sia:**
   - Go to Sia Manager
   - Navigate to `/youtube-studio`
   - After a few minutes of browsing Studio, you'll see insights!

---

## Detailed Setup

### Finding Your Supabase URL

1. Go to [supabase.com](https://supabase.com)
2. Log into your project
3. Go to Settings → API
4. Copy the "Project URL"

### Finding Your User ID

**Method 1 - From Sia Settings:**
1. Log into Sia Manager
2. Go to Settings page
3. Your User ID is displayed in the account section

**Method 2 - From Browser Console:**
1. Open Sia Manager
2. Open browser console (F12)
3. Type:
   ```javascript
   (await supabase.auth.getUser()).data.user.id
   ```
4. Copy the returned UUID

### Finding Your Supabase API Key

1. Go to Supabase dashboard
2. Settings → API
3. Copy the `anon` `public` key (NOT the service_role key)
4. This is safe to use in the browser extension

---

## Verifying Installation

### Backend Verification

```bash
# Check if migrations are applied
supabase db diff --schema public

# Check if tables exist
supabase db execute -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'youtube_studio%';"

# Check if functions are deployed
supabase functions list

# Test the ingest function
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/youtube-studio-ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "data": {
      "type": "test",
      "timestamp": "2025-11-18T12:00:00Z"
    },
    "source": "test",
    "version": "1.0.0"
  }'
```

Expected response:
```json
{
  "success": true,
  "result": {
    "type": "test",
    "stored": "raw_only"
  }
}
```

### Extension Verification

1. **Check extension status:**
   - Go to `chrome://extensions/`
   - Find "YouTube Studio Analytics for Sia"
   - Should show "Enabled" with no errors

2. **Check logs:**
   - Open YouTube Studio
   - Open DevTools (F12)
   - Go to Console tab
   - Look for messages with 🎬 emoji

3. **Check background worker:**
   - Go to `chrome://extensions/`
   - Find extension → Details
   - Click "Inspect service worker"
   - Check console for background logs

### Database Verification

```sql
-- Check if data is being stored
SELECT * FROM youtube_studio_raw_archive
ORDER BY created_at DESC
LIMIT 5;

-- Check video snapshots
SELECT * FROM youtube_studio_video_snapshots
ORDER BY captured_at DESC
LIMIT 5;

-- Check latest videos view
SELECT * FROM youtube_studio_latest_videos
LIMIT 5;
```

---

## Troubleshooting

### "Configuration missing" error

**Solution:**
- Click extension icon
- Re-enter all configuration fields
- Make sure User ID is a valid UUID
- Make sure API URL starts with `https://`

### Extension not extracting data

**Solution:**
1. Ensure you're on `studio.youtube.com`
2. Check "Auto-extract" is enabled
3. Refresh the YouTube Studio page
4. Check browser console for errors

### "Failed to send data" error

**Solution:**
1. Verify Edge Functions are deployed:
   ```bash
   supabase functions list
   ```

2. Check function logs:
   ```bash
   supabase functions logs youtube-studio-ingest
   ```

3. Verify API URL is correct

4. Check CORS configuration in function

### No insights showing in dashboard

**Solution:**
1. Wait a few minutes for data to accumulate
2. Check database has data:
   ```sql
   SELECT COUNT(*) FROM youtube_studio_raw_archive;
   ```
3. Try different time ranges (24h, 7d, 30d)
4. Check analytics function logs:
   ```bash
   supabase functions logs youtube-studio-analyze
   ```

### High CPU usage

**Solution:**
1. Reduce extraction frequency in `content.js`:
   ```javascript
   EXTRACT_INTERVAL: 60000  // Change from 30s to 60s
   ```
2. Enable batching
3. Close YouTube Studio when not needed

---

## Next Steps

1. **Explore the dashboard:**
   - Go to `/youtube-studio` in Sia Manager
   - Check video trends
   - Review recommendations

2. **Customize extraction:**
   - Edit `content.js` to add custom selectors
   - Extract additional metrics

3. **Set up automation:**
   - Let it run for a week
   - Review weekly trends
   - Get insights on best posting times

4. **Share feedback:**
   - Report any issues on GitHub
   - Suggest new features

---

## Support

- 📚 Full documentation: `docs/YOUTUBE_STUDIO_PLUGIN.md`
- 🐛 Report issues: GitHub Issues
- 💡 Feature requests: GitHub Discussions
- 📧 Email: support@siamanager.com

**Happy analyzing! 🎉**
