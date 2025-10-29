import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface TokenRecord {
  id: string;
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

async function getValidToken(supabase: any, userId: string): Promise<string> {
  const { data: tokens, error } = await supabase
    .from('google_oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !tokens) {
    throw new Error('No OAuth tokens found in database. Please authorize first.');
  }

  const token = tokens as TokenRecord;
  const now = Date.now();
  const expiry = new Date(token.expiry_ts).getTime();

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

function getMonthChunks(fromDate: string, toDate: string): Array<{start: string, end: string}> {
  const chunks: Array<{start: string, end: string}> = [];
  const current = new Date(fromDate);
  const end = new Date(toDate);

  while (current <= end) {
    const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    
    const start = monthStart < new Date(fromDate) ? fromDate : monthStart.toISOString().split('T')[0];
    const endStr = monthEnd > end ? toDate : monthEnd.toISOString().split('T')[0];
    
    chunks.push({ start, end: endStr });
    
    current.setMonth(current.getMonth() + 1);
    current.setDate(1);
  }

  return chunks;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authenticated user by decoding JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Decode JWT to extract user_id
    const jwt = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(jwt.split('.')[1]));
    const userId = payload.sub;

    if (!userId) {
      throw new Error('Unauthorized - invalid token');
    }

    console.log('Starting backfill for user:', userId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { fromDate = '2012-01-01', toDate } = await req.json();
    const endDate = toDate || new Date().toISOString().split('T')[0];

    console.log('Starting backfill from', fromDate, 'to', endDate, 'for user:', userId);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const accessToken = await getValidToken(supabase, userId);
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

    // Get month chunks
    const chunks = getMonthChunks(fromDate, endDate);
    console.log('Processing', chunks.length, 'months');

    let totalChannelRows = 0;
    let totalVideoRows = 0;

    for (const chunk of chunks) {
      console.log('Processing chunk:', chunk.start, 'to', chunk.end);

      // Fetch channel data
      const channelData_analytics = await queryYouTubeAnalytics(
        accessToken,
        chunk.start,
        chunk.end,
        'views,estimatedMinutesWatched,subscribersGained,subscribersLost,estimatedRevenue',
        'day'
      );

      // Fetch video data
      const videoData = await queryYouTubeAnalytics(
        accessToken,
        chunk.start,
        chunk.end,
        'views,estimatedMinutesWatched,averageViewDuration,impressions,clickThroughRate,likes,comments',
        'day,video'
      );

      // Insert channel data
      if (channelData_analytics.rows && channelData_analytics.rows.length > 0) {
        const channelRows = channelData_analytics.rows.map((row: any) => ({
          channel_id: channelId,
          user_id: userId,
          day: row[0],
          views: row[1] || 0,
          watch_time_seconds: (row[2] || 0) * 60,
          subscribers_gained: row[3] || 0,
          subscribers_lost: row[4] || 0,
          estimated_revenue: row[5] || 0,
        }));

        const { error: channelError } = await supabase
          .from('yt_channel_daily')
          .upsert(channelRows);

        if (channelError) {
          console.error('Channel insert error:', channelError);
          throw channelError;
        }
        totalChannelRows += channelRows.length;
        console.log('Inserted', channelRows.length, 'channel rows');
      }

      // Insert video data
      if (videoData.rows && videoData.rows.length > 0) {
        const videoRows = videoData.rows.map((row: any) => ({
          channel_id: channelId,
          user_id: userId,
          video_id: row[1],
          day: row[0],
          views: row[2] || 0,
          watch_time_seconds: (row[3] || 0) * 60,
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
        totalVideoRows += videoRows.length;
        console.log('Inserted', videoRows.length, 'video rows');
      }

      // Small delay between chunks to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        fromDate,
        toDate: endDate,
        totalChannelRows,
        totalVideoRows,
        chunksProcessed: chunks.length,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Backfill error:', error);
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