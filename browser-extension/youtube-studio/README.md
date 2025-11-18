# YouTube Studio Analytics Extension for Sia

A Chrome browser extension that extracts real-time data from YouTube Studio's DOM and sends it to your Sia Manager backend for advanced analytics and insights.

## Features

- **Real-time Data Extraction**: Automatically captures metrics from YouTube Studio pages
- **Multi-Page Support**: Works across Dashboard, Videos, Analytics, and Comments pages
- **Smart Batching**: Queues data and sends in batches to reduce API calls
- **Privacy-First**: All data stays between your browser and your Sia backend
- **Automatic Detection**: Detects page changes and extracts relevant data
- **Comprehensive Metrics**: Captures views, engagement, comments, revenue, and more

## What Data is Captured?

### Dashboard Page
- Channel name
- Overview metrics (subscribers, views, watch time, etc.)
- Key performance indicators

### Videos/Content Page
- Video list with metadata
- Views, likes, comments count
- Visibility status
- Publication dates

### Analytics Page
- Detailed performance metrics
- Revenue data (if available)
- Impressions and CTR
- Watch time statistics

### Comments Page
- Recent comments
- Author information
- Likes and replies count
- Comment text

## Installation

### 1. Load Extension in Chrome

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `browser-extension/youtube-studio` directory

### 2. Configure Extension

1. Click the extension icon in Chrome toolbar
2. Enter your configuration:
   - **Sia API URL**: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - **User ID**: Your Sia user ID (found in Sia settings)
   - **API Key**: Your Supabase anon key (optional but recommended)
3. Click "Save Configuration"

### 3. Deploy Backend

The extension requires backend support. Deploy the Edge Functions:

```bash
# Deploy the ingest function
supabase functions deploy youtube-studio-ingest

# Deploy the analytics function
supabase functions deploy youtube-studio-analyze

# Run the database migration
supabase db push
```

### 4. Start Using

1. Navigate to [YouTube Studio](https://studio.youtube.com)
2. The extension will automatically start capturing data
3. View insights in your Sia Manager dashboard

## Usage

### Automatic Mode (Recommended)

By default, the extension automatically extracts data every 30 seconds when you're on YouTube Studio pages.

### Manual Mode

1. Click the extension icon
2. Click "Extract Data Now" to capture current page data
3. Click "Send Queued Data" to immediately send batched data

### Configuration Options

- **Auto-extract**: Enable/disable automatic data extraction
- **Batch data**: Queue data and send in batches (reduces API calls)

## Architecture

```
┌─────────────────┐
│ YouTube Studio  │
│   (Browser)     │
└────────┬────────┘
         │ DOM Extraction
         ▼
┌─────────────────┐
│ Content Script  │
│  (content.js)   │
└────────┬────────┘
         │ Message Passing
         ▼
┌─────────────────┐
│ Background      │
│ Service Worker  │
│ (background.js) │
└────────┬────────┘
         │ HTTP POST
         ▼
┌─────────────────┐
│ Supabase Edge   │
│   Functions     │
│  (ingest API)   │
└────────┬────────┘
         │ Database Insert
         ▼
┌─────────────────┐
│  PostgreSQL     │
│   Database      │
└────────┬────────┘
         │ Query & Analyze
         ▼
┌─────────────────┐
│  Sia Manager    │
│   Dashboard     │
└─────────────────┘
```

## Data Flow

1. **Extraction**: Content script monitors YouTube Studio pages and extracts data using DOM selectors
2. **Processing**: Background worker receives data and queues it
3. **Batching**: Data is batched (default: 10 items or 60 seconds)
4. **Transmission**: Batched data sent to Supabase Edge Function
5. **Storage**: Edge Function stores raw data and processes it into structured tables
6. **Analysis**: Analytics function generates insights and trends
7. **Visualization**: Sia dashboard displays insights and recommendations

## Database Schema

The extension uses the following tables:

- `youtube_studio_raw_archive`: Raw JSON archive of all extracted data
- `youtube_studio_dashboard_snapshots`: Dashboard metrics over time
- `youtube_studio_video_snapshots`: Video performance snapshots
- `youtube_studio_analytics_snapshots`: Analytics page data
- `youtube_studio_comments`: Comments data

## API Endpoints

### Ingest Data
```
POST /functions/v1/youtube-studio-ingest
```

Request body:
```json
{
  "user_id": "uuid",
  "data": {
    "type": "video_list",
    "timestamp": "2025-11-18T12:00:00Z",
    "videos": [...]
  },
  "source": "youtube_studio_extension",
  "version": "1.0.0"
}
```

### Get Insights
```
POST /functions/v1/youtube-studio-analyze
```

Request body:
```json
{
  "user_id": "uuid",
  "time_range": "7d"
}
```

## Development

### File Structure

```
browser-extension/youtube-studio/
├── manifest.json           # Extension configuration
├── popup.html              # Extension popup UI
├── scripts/
│   ├── content.js         # DOM extraction logic
│   ├── background.js      # Background worker
│   └── popup.js           # Popup interactions
├── styles/
│   └── content.css        # Extension styles
└── assets/
    └── icon*.png          # Extension icons
```

### Testing

1. Load the extension in Chrome
2. Open YouTube Studio
3. Open Chrome DevTools Console
4. Look for extension logs (prefixed with 🎬, 📤, ✅)
5. Check extension popup for statistics

### Debugging

- **Check Console**: Look for extension logs in browser console
- **Inspect Background Worker**: Go to `chrome://extensions/` → Details → Inspect service worker
- **View Storage**: DevTools → Application → Storage → Extension storage
- **Monitor Network**: DevTools → Network → Filter by your Supabase domain

## Privacy & Security

- ✅ Extension only runs on `studio.youtube.com`
- ✅ Data sent only to your configured Supabase backend
- ✅ No third-party tracking or analytics
- ✅ All credentials stored locally in Chrome sync storage
- ✅ API key is optional (uses RLS policies)

## Troubleshooting

### Extension not capturing data
- Ensure you're on `studio.youtube.com`
- Check that auto-extract is enabled in settings
- Look for console errors in DevTools

### Data not appearing in Sia
- Verify API URL and User ID in extension settings
- Check that backend Edge Functions are deployed
- Verify database migration has been run
- Check Supabase function logs for errors

### High API usage
- Enable batching in extension settings
- Increase batch interval (modify `BATCH_INTERVAL` in `background.js`)
- Reduce extraction frequency (modify `EXTRACT_INTERVAL` in `content.js`)

## Roadmap

- [ ] Firefox support
- [ ] Safari support
- [ ] Advanced sentiment analysis for comments
- [ ] Real-time notifications for milestone achievements
- [ ] Export data to CSV/JSON
- [ ] Custom extraction rules
- [ ] Screenshot capture for thumbnails

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:
- Create an issue on GitHub
- Check the Sia Manager documentation
- Contact support@siamanager.com

---

**Made with ❤️ for content creators**
