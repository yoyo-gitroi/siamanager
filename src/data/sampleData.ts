import { LinkedInData, YouTubeVideo, Agent } from "@/types";

// Sample LinkedIn data from the uploaded CSV
export const linkedInData: LinkedInData[] = [
  { date: '2024-10-16', impressions: 6990, engagements: 243 },
  { date: '2024-10-17', impressions: 2370725, engagements: 1011 },
  { date: '2024-10-18', impressions: 2815634, engagements: 1826 },
  { date: '2024-10-19', impressions: 27543, engagements: 96 },
  { date: '2024-10-20', impressions: 7803, engagements: 57 },
  { date: '2024-11-07', impressions: 450070, engagements: 565 },
  { date: '2024-11-08', impressions: 986347, engagements: 570 },
  { date: '2024-12-27', impressions: 113460, engagements: 598 },
  { date: '2024-12-28', impressions: 191447, engagements: 421 },
  { date: '2025-01-13', impressions: 402272, engagements: 541 },
  { date: '2025-01-23', impressions: 559714, engagements: 2966 },
  { date: '2025-01-24', impressions: 416643, engagements: 2562 },
  { date: '2025-03-03', impressions: 948026, engagements: 270 },
  { date: '2025-03-04', impressions: 1129068, engagements: 428 },
  { date: '2025-03-06', impressions: 1267232, engagements: 524 },
];

// Sample YouTube data from the uploaded CSV
export const youtubeVideos: YouTubeVideo[] = [
  {
    id: 'cXrpmJZgsvA',
    title: 'Celebrity Diet Privilege | Divya Jain',
    url: 'https://youtube.com/watch?v=cXrpmJZgsvA',
    publishDate: '2025-05-05',
    views: 3024335,
    watchTimeHours: 8860.17,
    subscribers: 711,
    impressions: 24290,
    ctr: 2.08
  },
  {
    id: 'kOZhmeic_Gg',
    title: 'His Name Is Enough | Divya Jain',
    url: 'https://youtube.com/watch?v=kOZhmeic_Gg',
    publishDate: '2025-02-14',
    views: 3013866,
    watchTimeHours: 21668.9124,
    subscribers: 1408,
    impressions: 31338,
    ctr: 2.56
  },
  {
    id: '9wBQwIfd1L0',
    title: 'This stops you from growing in life | @MonksWarriors',
    url: 'https://youtube.com/watch?v=9wBQwIfd1L0',
    publishDate: '2025-09-21',
    views: 1849855,
    watchTimeHours: 7617.0584,
    subscribers: 1228,
    impressions: 296804,
    ctr: 8.67
  },
  {
    id: 'RzvnxXx2g-M',
    title: "Child's Gender Does not Matter | Dr Aruna Kalra",
    url: 'https://youtube.com/watch?v=RzvnxXx2g-M',
    publishDate: '2024-12-09',
    views: 1230913,
    watchTimeHours: 13755.3402,
    subscribers: 1094,
    impressions: 44650,
    ctr: 2.14
  },
  {
    id: 'b2rgSILFQgI',
    title: 'Build UNSTOPPABLE Confidence in 2025',
    url: 'https://youtube.com/watch?v=b2rgSILFQgI',
    publishDate: '2024-09-08',
    views: 317825,
    watchTimeHours: 44346.0696,
    subscribers: 2367,
    impressions: 4628121,
    ctr: 4.98
  },
];

export const agents: Agent[] = [
  {
    id: 'agent-1',
    key: 'youtube_to_shorts',
    name: 'YouTube to Shorts',
    description: 'Convert long-form YouTube videos into 15-30 second shorts using AI',
    icon: 'Video',
    color: 'danger',
    status: 'idle',
    inputSchema: [
      { name: 'videoUrl', label: 'YouTube Video URL', type: 'text', required: true, placeholder: 'https://youtube.com/watch?v=...' },
      { name: 'numShorts', label: 'Number of Shorts', type: 'slider', min: 1, max: 10, default: 5 },
      { name: 'shortsLength', label: 'Shorts Length', type: 'dropdown', options: ['15s', '30s', '60s'], default: '30s' },
      { name: 'platforms', label: 'Target Platforms', type: 'checkbox', options: ['Instagram Reels', 'YouTube Shorts', 'TikTok'] },
    ]
  },
  {
    id: 'agent-2',
    key: 'multi_channel_publisher',
    name: 'Multi-Channel Publisher',
    description: 'Automatically publish content across all connected social platforms',
    icon: 'Upload',
    color: 'success',
    status: 'idle',
    inputSchema: [
      { name: 'contentUrl', label: 'Content URL or Upload', type: 'text', placeholder: 'https://... or upload file' },
      { name: 'caption', label: 'Caption', type: 'textarea', maxLength: 2000, placeholder: 'Write your caption...' },
      { name: 'hashtags', label: 'Hashtags', type: 'text', placeholder: '#marketing #socialmedia' },
      { name: 'platforms', label: 'Target Platforms', type: 'checkbox', options: ['LinkedIn', 'YouTube', 'Instagram', 'Twitter'] },
      { name: 'scheduling', label: 'Schedule', type: 'datetime', placeholder: 'Post now or schedule' },
    ]
  },
  {
    id: 'agent-3',
    key: 'smart_scheduler',
    name: 'Smart Scheduler',
    description: 'AI-powered optimal posting time recommendations',
    icon: 'Calendar',
    color: 'secondary',
    status: 'idle',
    inputSchema: [
      { name: 'contentType', label: 'Content Type', type: 'dropdown', options: ['video', 'image', 'text', 'carousel'], required: true },
      { name: 'priority', label: 'Priority', type: 'dropdown', options: ['high', 'medium', 'low'], default: 'medium' },
      { name: 'dateRange', label: 'Date Range', type: 'daterange' },
      { name: 'platforms', label: 'Platforms', type: 'checkbox', options: ['LinkedIn', 'YouTube', 'Instagram', 'Twitter'] },
    ]
  },
  {
    id: 'agent-4',
    key: 'guest_suggester',
    name: 'Guest Suggester',
    description: 'AI-powered podcast guest recommendations based on audience overlap',
    icon: 'Users',
    color: 'primary',
    status: 'idle',
    inputSchema: [
      { name: 'channelId', label: 'YouTube Channel ID', type: 'text', required: true, placeholder: 'UC...' },
      { name: 'minSubscribers', label: 'Min Subscribers', type: 'number', default: 10000 },
      { name: 'maxSubscribers', label: 'Max Subscribers', type: 'number', default: 5000000 },
      { name: 'relevanceThreshold', label: 'Relevance Threshold', type: 'slider', min: 0, max: 1, default: 0.7 },
    ]
  },
  {
    id: 'agent-5',
    key: 'topic_analyzer',
    name: 'Topic Analyzer',
    description: 'Trending topics and keyword suggestions for your content',
    icon: 'TrendingUp',
    color: 'warning',
    status: 'idle',
    inputSchema: [
      { name: 'platforms', label: 'Platforms', type: 'checkbox', options: ['LinkedIn', 'YouTube', 'Instagram'], required: true },
      { name: 'timeRange', label: 'Time Range', type: 'daterange' },
      { name: 'analysisType', label: 'Analysis Type', type: 'dropdown', options: ['trending', 'gaps', 'seasonal', 'competitive'], default: 'trending' },
      { name: 'numSuggestions', label: 'Number of Suggestions', type: 'slider', min: 5, max: 20, default: 10 },
    ]
  },
];
