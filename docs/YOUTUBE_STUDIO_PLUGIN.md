# YouTube Studio Plugin Documentation

## Overview

The YouTube Studio Plugin is a browser extension that captures real-time data directly from the YouTube Studio interface and sends it to the Sia Manager backend for advanced analytics and insights.

## Why a Browser Extension?

While Sia Manager already integrates with the YouTube Data API, the browser extension provides:

1. **Real-time UI Data**: Captures metrics visible in Studio before they're available in the API
2. **Additional Metrics**: Access to Studio-specific views and metrics not in the public API
3. **User Experience Data**: Capture how you interact with your content
4. **Faster Updates**: Immediate data capture vs. API polling delays

## Components

### 1. Browser Extension

**Location**: `/browser-extension/youtube-studio/`

The extension consists of:

- **Content Script** (`content.js`): Runs on YouTube Studio pages, extracts DOM data
- **Background Worker** (`background.js`): Processes and batches data, sends to backend
- **Popup** (`popup.html`): User interface for configuration and statistics

### 2. Backend Edge Functions

**Location**: `/supabase/functions/`

- **youtube-studio-ingest**: Receives data from extension and stores in database
- **youtube-studio-analyze**: Processes stored data and generates insights

### 3. Database Schema

**Location**: `/supabase/migrations/20251118000000_youtube_studio_extension.sql`

Tables:
- `youtube_studio_raw_archive`: Raw data archive
- `youtube_studio_dashboard_snapshots`: Dashboard metrics
- `youtube_studio_video_snapshots`: Video performance
- `youtube_studio_analytics_snapshots`: Analytics data
- `youtube_studio_comments`: Comments data

### 4. Frontend Dashboard

**Location**: `/src/pages/YouTubeStudioAnalytics.tsx`

React component that displays:
- Performance overview
- Video trends
- Comment analysis
- AI-powered recommendations

## Setup Guide

### Backend Setup

1. **Run Database Migration**

```bash
supabase db push
```

This creates all necessary tables and policies.

2. **Deploy Edge Functions**

```bash
# Deploy ingest function
supabase functions deploy youtube-studio-ingest

# Deploy analytics function
supabase functions deploy youtube-studio-analyze
```

3. **Verify Deployment**

```bash
# Test ingest endpoint
curl -X POST https://your-project.supabase.co/functions/v1/youtube-studio-ingest \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","data":{"type":"test"},"source":"test","version":"1.0"}'
```

### Extension Setup

1. **Build Extension** (if applicable)

Currently, the extension is pure JavaScript and doesn't require a build step.

2. **Load in Chrome**

- Open `chrome://extensions/`
- Enable Developer Mode
- Click "Load unpacked"
- Select `/browser-extension/youtube-studio/`

3. **Configure Extension**

- Click extension icon
- Enter Supabase URL
- Enter User ID (from Sia settings)
- Enter API Key (Supabase anon key)
- Save configuration

### Frontend Setup

1. **Add Route to Router**

Edit `/src/App.tsx` (or your router configuration):

```typescript
import YouTubeStudioAnalytics from '@/pages/YouTubeStudioAnalytics';

// Add to routes
<Route path="/youtube-studio" element={<YouTubeStudioAnalytics />} />
```

2. **Add Navigation Link**

Edit navigation component to add link to `/youtube-studio`.

## How It Works

### Data Extraction Process

1. **Page Detection**: Content script detects which YouTube Studio page is active
2. **DOM Parsing**: Extracts relevant data using CSS selectors
3. **Data Formatting**: Structures data into JSON format
4. **Background Messaging**: Sends data to background worker
5. **Batching**: Background worker queues data (optional)
6. **API Transmission**: Sends to Supabase Edge Function
7. **Database Storage**: Edge Function stores in appropriate tables
8. **Analytics Processing**: Analytics function generates insights

### Data Types Captured

#### Dashboard Data
```typescript
{
  type: 'dashboard',
  channelName: string,
  metrics: {
    [key: string]: string  // e.g., "Views": "1.2K"
  },
  timestamp: string
}
```

#### Video List Data
```typescript
{
  type: 'video_list',
  videos: [{
    video_id: string,
    title: string,
    views: number,
    likes_count: number,
    comments_count: number,
    visibility: string,
    published_date: string
  }],
  timestamp: string
}
```

#### Analytics Data
```typescript
{
  type: 'analytics',
  metrics: {
    [key: string]: string
  },
  charts: any[],
  timestamp: string
}
```

#### Comments Data
```typescript
{
  type: 'comments',
  comments: [{
    author: string,
    text: string,
    likes_count: number,
    replies_count: number,
    posted_date: string
  }],
  timestamp: string
}
```

## Configuration Options

### Extension Settings

Stored in Chrome sync storage:

```javascript
{
  siaApiUrl: string,        // Supabase project URL
  siaUserId: string,        // User's ID in Sia
  siaApiKey: string,        // Supabase anon key (optional)
  autoExtract: boolean,     // Auto-extract on page load
  enableBatching: boolean   // Batch data before sending
}
```

### Extraction Configuration

In `content.js`:

```javascript
const CONFIG = {
  EXTRACT_INTERVAL: 30000,  // Extract every 30 seconds
  SELECTORS: {
    // CSS selectors for different elements
  }
}
```

### Batching Configuration

In `background.js`:

```javascript
const CONFIG = {
  BATCH_SIZE: 10,           // Send after 10 items
  BATCH_INTERVAL: 60000     // Or send every 60 seconds
}
```

## API Reference

### Ingest Endpoint

**POST** `/functions/v1/youtube-studio-ingest`

Headers:
```
Content-Type: application/json
Authorization: Bearer <anon_key>  (optional)
```

Body:
```json
{
  "user_id": "uuid",
  "data": {
    "type": "video_list",
    "videos": [...],
    "timestamp": "ISO8601"
  },
  "source": "youtube_studio_extension",
  "version": "1.0.0"
}
```

Response:
```json
{
  "success": true,
  "result": {
    "type": "video_list",
    "stored": true,
    "count": 10
  }
}
```

### Analytics Endpoint

**POST** `/functions/v1/youtube-studio-analyze`

Body:
```json
{
  "user_id": "uuid",
  "time_range": "7d"  // "24h", "7d", "30d", "all"
}
```

Response:
```json
{
  "success": true,
  "insights": {
    "summary": {...},
    "video_trends": {...},
    "dashboard_trends": {...},
    "comment_analysis": {...},
    "performance_metrics": {...},
    "recommendations": [...]
  },
  "generated_at": "ISO8601"
}
```

## Security Considerations

### Extension Permissions

The extension requests minimal permissions:
- `storage`: For configuration
- `activeTab`: For accessing YouTube Studio
- `scripting`: For injecting content scripts

### Data Privacy

- Extension only runs on `studio.youtube.com`
- No data sent to third parties
- All data encrypted in transit (HTTPS)
- Row-level security enforced in database

### API Security

- Edge Functions validate user_id
- RLS policies prevent cross-user data access
- API keys optional but recommended
- Service role key used only server-side

## Troubleshooting

### Common Issues

1. **Extension not loading**
   - Check Chrome extensions page for errors
   - Ensure manifest.json is valid
   - Verify file permissions

2. **Data not extracting**
   - YouTube Studio may have updated their DOM structure
   - Update selectors in content.js
   - Check browser console for errors

3. **Data not reaching backend**
   - Verify API URL configuration
   - Check network tab for failed requests
   - Verify Edge Functions are deployed
   - Check CORS configuration

4. **Insights not generating**
   - Ensure enough data is collected
   - Check Edge Function logs
   - Verify database tables have data

### Debugging Tools

1. **Extension Console**
   - Open DevTools on YouTube Studio
   - Look for logs prefixed with 🎬

2. **Background Worker**
   - Go to chrome://extensions
   - Find extension → Details → Inspect service worker

3. **Supabase Logs**
   ```bash
   supabase functions logs youtube-studio-ingest
   supabase functions logs youtube-studio-analyze
   ```

4. **Database Queries**
   ```sql
   -- Check raw data
   SELECT * FROM youtube_studio_raw_archive
   WHERE user_id = 'your-id'
   ORDER BY created_at DESC LIMIT 10;

   -- Check processed videos
   SELECT * FROM youtube_studio_latest_videos
   WHERE user_id = 'your-id';
   ```

## Customization

### Adding New Selectors

To capture additional data, modify `content.js`:

```javascript
const CONFIG = {
  SELECTORS: {
    // Add new selector
    customMetric: '.my-custom-selector',
  }
};

// In extraction function
function extractCustomData() {
  const element = document.querySelector(CONFIG.SELECTORS.customMetric);
  if (element) {
    return element.textContent.trim();
  }
  return null;
}
```

### Creating Custom Analytics

Add custom analysis in `youtube-studio-analyze/index.ts`:

```typescript
async function customAnalysis(supabaseClient: any, userId: string) {
  // Fetch data
  const { data } = await supabaseClient
    .from('youtube_studio_video_snapshots')
    .select('*')
    .eq('user_id', userId);

  // Perform analysis
  const insight = performCustomCalculation(data);

  return insight;
}
```

### Styling the Dashboard

Customize `YouTubeStudioAnalytics.tsx`:

```typescript
// Add custom components
import MyCustomChart from '@/components/MyCustomChart';

// Use in render
<Card>
  <CardHeader>
    <CardTitle>My Custom Visualization</CardTitle>
  </CardHeader>
  <CardContent>
    <MyCustomChart data={insights} />
  </CardContent>
</Card>
```

## Performance Optimization

### Reducing API Calls

1. Enable batching in extension
2. Increase batch size/interval
3. Reduce extraction frequency

### Database Optimization

- Indexes already created on common query patterns
- Consider partitioning for large datasets
- Archive old data periodically

### Frontend Optimization

- Use React Query for caching
- Implement pagination for large datasets
- Lazy load components

## Future Enhancements

- [ ] Firefox and Safari support
- [ ] Advanced AI insights using OpenAI
- [ ] Real-time notifications
- [ ] Custom alerts and triggers
- [ ] Data export functionality
- [ ] Comparison with API data
- [ ] Anomaly detection
- [ ] Predictive analytics

## Support

For issues or questions:
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)
- Documentation: Check README files
- Community: Discord/Slack channel

---

Last updated: 2025-11-18
