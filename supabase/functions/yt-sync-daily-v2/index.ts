import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface TokenRecord {
  access_token: string;
  refresh_token: string | null;
  token_expiry: string | null;
  channel_id: string | null;
}

async function refreshToken(refreshToken: string): Promise<any> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  return await response.json();
}

async function getValidToken(supabase: any, userId: string): Promise<{ token: string; channelId: string }> {
  const { data: tokenRecord, error } = await supabase
    .from('youtube_connection')
    .select('access_token, refresh_token, token_expiry, channel_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !tokenRecord) {
    throw new Error('No YouTube connection found');
  }

  const token = tokenRecord as TokenRecord;
  
  if (!token.channel_id) {
    throw new Error('No channel selected');
  }

  let accessToken = token.access_token;

  if (token.token_expiry) {
    const expiryDate = new Date(token.token_expiry);
    if (expiryDate <= new Date()) {
      if (!token.refresh_token) {
        throw new Error('No refresh token available');
      }

      const refreshed = await refreshToken(token.refresh_token);
      const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000);

      await supabase
        .from('youtube_connection')
        .update({
          access_token: refreshed.access_token,
          token_expiry: newExpiry.toISOString(),
        })
        .eq('user_id', userId);

      accessToken = refreshed.access_token;
    }
  }

  return { token: accessToken, channelId: token.channel_id };
}

async function queryYouTubeAnalytics(
  accessToken: string,
  channelId: string,
  startDate: string,
  endDate: string,
  metrics: string,
  dimensions: string
): Promise<any> {
  const url = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
  url.searchParams.set('ids', `channel==${channelId}`);
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);
  url.searchParams.set('metrics', metrics);
  url.searchParams.set('dimensions', dimensions);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Analytics API error: ${error}`);
  }

  return await response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const userId = user.id;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { token: accessToken, channelId } = await getValidToken(supabase, userId);

    // Sync yesterday's data
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const metrics = 'views,estimatedMinutesWatched,subscribersGained,subscribersLost';

    // Channel-level sync
    const requestChannel = {
      channelId,
      startDate: dateStr,
      endDate: dateStr,
      metrics,
      dimensions: 'day'
    };

    const channelData = await queryYouTubeAnalytics(
      accessToken,
      channelId,
      dateStr,
      dateStr,
      metrics,
      'day'
    );

    await supabase.from('youtube_raw_archive').insert({
      user_id: userId,
      channel_id: channelId,
      report_type: 'daily_channel',
      request_json: requestChannel,
      response_json: channelData,
    });

    let channelRows = 0;
    if (channelData.rows && channelData.rows.length > 0) {
      const columnMap = new Map(
        channelData.columnHeaders.map((h: any, i: number) => [h.name, i])
      );

      const rows = channelData.rows.map((row: any) => ({
        user_id: userId,
        channel_id: channelId,
        day: row[columnMap.get('day') as number],
        views: row[columnMap.get('views') as number] || 0,
        watch_time_seconds: (row[columnMap.get('estimatedMinutesWatched') as number] || 0) * 60,
        subscribers_gained: row[columnMap.get('subscribersGained') as number] || 0,
        subscribers_lost: row[columnMap.get('subscribersLost') as number] || 0,
      }));

      await supabase.from('yt_channel_daily').upsert(rows, { onConflict: 'channel_id,day' });
      channelRows = rows.length;
    }

    // Video-level sync with impressions and CTR
    const videoMetrics = 'views,estimatedMinutesWatched,averageViewDuration,cardImpressions,cardClickThroughRate,likes,comments';
    
    const requestVideo = {
      channelId,
      startDate: dateStr,
      endDate: dateStr,
      metrics: videoMetrics,
      dimensions: 'video,day'
    };

    const videoData = await queryYouTubeAnalytics(
      accessToken,
      channelId,
      dateStr,
      dateStr,
      videoMetrics,
      'video,day'
    );

    await supabase.from('youtube_raw_archive').insert({
      user_id: userId,
      channel_id: channelId,
      report_type: 'daily_video',
      request_json: requestVideo,
      response_json: videoData,
    });

    let videoRows = 0;
    if (videoData.rows && videoData.rows.length > 0) {
      const columnMap = new Map(
        videoData.columnHeaders.map((h: any, i: number) => [h.name, i])
      );

      const rows = videoData.rows.map((row: any) => ({
        user_id: userId,
        channel_id: channelId,
        video_id: row[columnMap.get('video') as number],
        day: row[columnMap.get('day') as number],
        views: row[columnMap.get('views') as number] || 0,
        watch_time_seconds: (row[columnMap.get('estimatedMinutesWatched') as number] || 0) * 60,
        avg_view_duration_seconds: row[columnMap.get('averageViewDuration') as number] || 0,
        impressions: row[columnMap.get('cardImpressions') as number] || 0,
        click_through_rate: row[columnMap.get('cardClickThroughRate') as number] || 0,
        likes: row[columnMap.get('likes') as number] || 0,
        comments: row[columnMap.get('comments') as number] || 0,
      }));

      await supabase.from('yt_video_daily').upsert(rows, { onConflict: 'channel_id,video_id,day' });
      videoRows = rows.length;
    }

    // Update sync state
    await supabase.from('youtube_sync_state').upsert({
      user_id: userId,
      channel_id: channelId,
      last_sync_date: dateStr,
      last_sync_at: new Date().toISOString(),
      status: 'completed',
      rows_inserted: channelRows + videoRows,
    }, { onConflict: 'user_id,channel_id' });

    console.log(`Daily sync complete for ${dateStr}: ${channelRows} channel, ${videoRows} video rows`);

    return new Response(
      JSON.stringify({
        success: true,
        date: dateStr,
        channelRows,
        videoRows,
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
