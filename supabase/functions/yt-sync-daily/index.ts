import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface TokenRecord {
  access_token: string;
  refresh_token: string;
  expiry_ts: string;
  scope: string;
}

async function refreshToken(refreshToken: string): Promise<any> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId!,
      client_secret: clientSecret!,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  return await response.json();
}

async function getValidToken(supabase: any): Promise<string> {
  const { data: tokens, error } = await supabase
    .from('google_oauth_tokens')
    .select('*')
    .single();

  if (error || !tokens) {
    throw new Error('No OAuth tokens found. Please authorize first.');
  }

  const token = tokens as TokenRecord;
  const now = Date.now();
  const expiry = new Date(token.expiry_ts).getTime();

  // Refresh if expired or expiring soon (within 5 minutes)
  if (now >= expiry - 5 * 60 * 1000) {
    console.log('Token expired or expiring soon, refreshing...');
    const newTokens = await refreshToken(token.refresh_token);
    
    const newExpiry = new Date(Date.now() + newTokens.expires_in * 1000);
    
    await supabase
      .from('google_oauth_tokens')
      .update({
        access_token: newTokens.access_token,
        expiry_ts: newExpiry.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tokens.id);

    return newTokens.access_token;
  }

  return token.access_token;
}

async function queryYouTubeAnalytics(
  accessToken: string,
  startDate: string,
  endDate: string,
  metrics: string,
  dimensions: string
): Promise<any> {
  const url = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
  url.searchParams.set('ids', 'channel==MINE');
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);
  url.searchParams.set('metrics', metrics);
  url.searchParams.set('dimensions', dimensions);
  url.searchParams.set('sort', dimensions.split(',')[0]);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('YouTube Analytics API error:', error);
    throw new Error(`Failed to query YouTube Analytics: ${response.status}`);
  }

  return await response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting daily YouTube Analytics sync...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get valid access token
    const accessToken = await getValidToken(supabase);
    console.log('Got valid access token');

    // Get channel ID
    const channelResponse = await fetch(
      'https://youtube.googleapis.com/youtube/v3/channels?part=id&mine=true',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const channelData = await channelResponse.json();
    const channelId = channelData.items?.[0]?.id;

    if (!channelId) {
      throw new Error('No channel found');
    }

    console.log('Channel ID:', channelId);

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    console.log('Fetching data for date:', dateStr);

    // Fetch channel daily data
    const channelData_analytics = await queryYouTubeAnalytics(
      accessToken,
      dateStr,
      dateStr,
      'views,watchTime,subscribersGained,subscribersLost,estimatedRevenue',
      'day'
    );

    // Fetch video daily data
    const videoData = await queryYouTubeAnalytics(
      accessToken,
      dateStr,
      dateStr,
      'views,watchTime,averageViewDuration,impressions,clickThroughRate,likes,comments',
      'day,video'
    );

    console.log('Channel rows:', channelData_analytics.rows?.length || 0);
    console.log('Video rows:', videoData.rows?.length || 0);

    // Insert channel data
    if (channelData_analytics.rows && channelData_analytics.rows.length > 0) {
      const channelRow = channelData_analytics.rows[0];
      const { error: channelError } = await supabase
        .from('yt_channel_daily')
        .upsert({
          channel_id: channelId,
          day: channelRow[0],
          views: channelRow[1] || 0,
          watch_time_seconds: channelRow[2] || 0,
          subscribers_gained: channelRow[3] || 0,
          subscribers_lost: channelRow[4] || 0,
          estimated_revenue: channelRow[5] || 0,
        });

      if (channelError) {
        console.error('Channel insert error:', channelError);
        throw channelError;
      }
      console.log('Channel data inserted');
    }

    // Insert video data
    if (videoData.rows && videoData.rows.length > 0) {
      const videoRows = videoData.rows.map((row: any) => ({
        channel_id: channelId,
        video_id: row[1],
        day: row[0],
        views: row[2] || 0,
        watch_time_seconds: row[3] || 0,
        avg_view_duration_seconds: row[4] || 0,
        impressions: row[5] || 0,
        click_through_rate: row[6] || 0,
        likes: row[7] || 0,
        comments: row[8] || 0,
      }));

      const { error: videoError } = await supabase
        .from('yt_video_daily')
        .upsert(videoRows);

      if (videoError) {
        console.error('Video insert error:', videoError);
        throw videoError;
      }
      console.log('Video data inserted:', videoRows.length, 'videos');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        date: dateStr,
        channelRows: channelData_analytics.rows?.length || 0,
        videoRows: videoData.rows?.length || 0,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Daily sync error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});