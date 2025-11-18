/**
 * YouTube Studio Data Ingest Edge Function
 * Receives data from the browser extension and stores it in the database
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface StudioDataPayload {
  user_id: string;
  data: any;
  source: string;
  version: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for inserts
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Parse request body
    const payload: StudioDataPayload = await req.json();

    if (!payload.user_id || !payload.data) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, data' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`📥 Received YouTube Studio data from user: ${payload.user_id}`);
    console.log(`Data type: ${payload.data.type}`);

    // Handle batch data
    if (payload.data.type === 'batch') {
      console.log(`Processing batch of ${payload.data.count} items`);

      const results = [];
      for (const item of payload.data.items) {
        const result = await processStudioData(supabaseClient, payload.user_id, item);
        results.push(result);
      }

      return new Response(
        JSON.stringify({
          success: true,
          processed: results.length,
          results: results
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle single data point
    const result = await processStudioData(supabaseClient, payload.user_id, payload.data);

    return new Response(
      JSON.stringify({
        success: true,
        result: result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Error processing Studio data:', error);

    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Process and store YouTube Studio data based on type
 */
async function processStudioData(supabaseClient: any, userId: string, data: any) {
  const timestamp = new Date(data.timestamp || data.extractedAt);

  // Store raw data in archive table
  const { error: archiveError } = await supabaseClient
    .from('youtube_studio_raw_archive')
    .insert({
      user_id: userId,
      data_type: data.type,
      page_type: data.pageType,
      url: data.url,
      raw_data: data,
      extracted_at: timestamp,
    });

  if (archiveError) {
    console.error('Error storing raw archive:', archiveError);
  }

  // Process based on data type
  switch (data.type) {
    case 'dashboard':
      return await processDashboardData(supabaseClient, userId, data, timestamp);

    case 'video_list':
      return await processVideoListData(supabaseClient, userId, data, timestamp);

    case 'analytics':
      return await processAnalyticsData(supabaseClient, userId, data, timestamp);

    case 'comments':
      return await processCommentsData(supabaseClient, userId, data, timestamp);

    default:
      console.warn(`Unknown data type: ${data.type}`);
      return { type: data.type, stored: 'raw_only' };
  }
}

/**
 * Process dashboard data
 */
async function processDashboardData(supabaseClient: any, userId: string, data: any, timestamp: Date) {
  const { error } = await supabaseClient
    .from('youtube_studio_dashboard_snapshots')
    .insert({
      user_id: userId,
      channel_name: data.channelName,
      metrics: data.metrics,
      snapshot_at: timestamp,
    });

  if (error) {
    console.error('Error storing dashboard data:', error);
    throw error;
  }

  return { type: 'dashboard', stored: true };
}

/**
 * Process video list data
 */
async function processVideoListData(supabaseClient: any, userId: string, data: any, timestamp: Date) {
  // Store each video in the list
  const videoInserts = data.videos.map((video: any) => ({
    user_id: userId,
    video_id: video.videoId,
    title: video.title,
    url: video.url,
    visibility: video.visibility,
    views: parseMetricValue(video.views),
    comments_count: parseMetricValue(video.comments),
    likes_count: parseMetricValue(video.likes),
    published_date: video.date,
    list_position: video.position,
    captured_at: timestamp,
  }));

  const { error } = await supabaseClient
    .from('youtube_studio_video_snapshots')
    .insert(videoInserts);

  if (error) {
    console.error('Error storing video list:', error);
    throw error;
  }

  return { type: 'video_list', stored: true, count: data.videos.length };
}

/**
 * Process analytics data
 */
async function processAnalyticsData(supabaseClient: any, userId: string, data: any, timestamp: Date) {
  const { error } = await supabaseClient
    .from('youtube_studio_analytics_snapshots')
    .insert({
      user_id: userId,
      metrics: data.metrics,
      charts: data.charts,
      snapshot_at: timestamp,
    });

  if (error) {
    console.error('Error storing analytics data:', error);
    throw error;
  }

  return { type: 'analytics', stored: true };
}

/**
 * Process comments data
 */
async function processCommentsData(supabaseClient: any, userId: string, data: any, timestamp: Date) {
  const commentInserts = data.comments.map((comment: any) => ({
    user_id: userId,
    author: comment.author,
    text: comment.text,
    posted_date: comment.date,
    likes_count: parseMetricValue(comment.likes),
    replies_count: parseMetricValue(comment.replies),
    captured_at: timestamp,
  }));

  const { error } = await supabaseClient
    .from('youtube_studio_comments')
    .insert(commentInserts);

  if (error) {
    console.error('Error storing comments:', error);
    throw error;
  }

  return { type: 'comments', stored: true, count: data.comments.length };
}

/**
 * Parse metric values (removes commas, handles K/M suffixes)
 */
function parseMetricValue(value: string | null): number | null {
  if (!value) return null;

  // Remove commas
  let cleaned = value.replace(/,/g, '');

  // Handle K/M/B suffixes
  const multipliers: { [key: string]: number } = {
    'K': 1000,
    'M': 1000000,
    'B': 1000000000,
  };

  for (const [suffix, multiplier] of Object.entries(multipliers)) {
    if (cleaned.toUpperCase().includes(suffix)) {
      const num = parseFloat(cleaned.replace(suffix, ''));
      return Math.round(num * multiplier);
    }
  }

  // Try to parse as number
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}
