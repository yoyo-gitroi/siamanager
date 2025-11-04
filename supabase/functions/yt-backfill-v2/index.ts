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
    throw new Error('No channel selected. Please select a channel first.');
  }

  let accessToken = token.access_token;

  // Check if token is expired
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

  console.log(`Querying YouTube Analytics: ${startDate} to ${endDate}, dimensions: ${dimensions}`);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`YouTube API error for ${startDate}-${endDate}:`, error);
    throw new Error(`Analytics API error: ${error}`);
  }

  return await response.json();
}

function getMonthChunks(fromDate: string, toDate: string): Array<{start: string, end: string}> {
  const chunks: Array<{start: string, end: string}> = [];
  const start = new Date(fromDate);
  const end = new Date(toDate);

  let current = new Date(start);
  
  while (current <= end) {
    const chunkStart = new Date(current);
    const chunkEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    
    if (chunkEnd > end) {
      chunks.push({
        start: chunkStart.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      });
      break;
    }
    
    chunks.push({
      start: chunkStart.toISOString().split('T')[0],
      end: chunkEnd.toISOString().split('T')[0]
    });
    
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }
  
  return chunks;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');
    console.log('Token length:', token.length);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    console.log('Env present:', { hasUrl: !!supabaseUrl, hasAnonKey: !!supabaseAnonKey });

    const supabaseAuth = createClient(
      supabaseUrl,
      supabaseAnonKey
    );

    // Pass the token directly to getUser()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    console.log('Auth result:', { hasUser: !!user, authError: authError?.message });
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      throw new Error('Unauthorized');
    }

    const userId = user.id;
    const { fromDate, toDate } = await req.json();
    
    // YouTube Analytics data is only available from 2015 onwards
    const minDate = '2015-01-01';
    const requestedFromDate = fromDate || minDate;
    const actualFromDate = requestedFromDate < minDate ? minDate : requestedFromDate;
    const endDate = toDate || new Date().toISOString().split('T')[0];

    console.log(`Starting backfill for user ${userId} from ${actualFromDate} to ${endDate}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { token: accessToken, channelId } = await getValidToken(supabase, userId);
    
    const metrics = 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments,shares,subscribersGained,subscribersLost';
    const chunks = getMonthChunks(actualFromDate, endDate);
    
    let totalChannelRows = 0;
    let totalVideoRows = 0;

    // Process channel-level data
    console.log('Fetching channel-level daily data...');
    for (const chunk of chunks) {
      const requestData = {
        channelId,
        startDate: chunk.start,
        endDate: chunk.end,
        metrics,
        dimensions: 'date'
      };

      const data = await queryYouTubeAnalytics(
        accessToken,
        channelId,
        chunk.start,
        chunk.end,
        metrics,
        'day'
      );

      // Archive raw response
      await supabase.from('youtube_raw_archive').insert({
        user_id: userId,
        channel_id: channelId,
        report_type: 'daily_channel',
        request_json: requestData,
        response_json: data,
      });

      if (data.rows && data.rows.length > 0) {
        const columnMap = new Map(
          data.columnHeaders.map((h: any, i: number) => [h.name, i])
        );

        const rows = data.rows.map((row: any) => ({
          user_id: userId,
          channel_id: channelId,
          day: row[columnMap.get('day') as number],
          views: row[columnMap.get('views') as number] || 0,
          watch_time_seconds: (row[columnMap.get('estimatedMinutesWatched') as number] || 0) * 60,
          average_view_duration_seconds: row[columnMap.get('averageViewDuration') as number] || 0,
          average_view_percentage: row[columnMap.get('averageViewPercentage') as number] || 0,
          likes: row[columnMap.get('likes') as number] || 0,
          comments: row[columnMap.get('comments') as number] || 0,
          shares: row[columnMap.get('shares') as number] || 0,
          subscribers_gained: row[columnMap.get('subscribersGained') as number] || 0,
          subscribers_lost: row[columnMap.get('subscribersLost') as number] || 0,
        }));

        const { error } = await supabase
          .from('yt_channel_daily')
          .upsert(rows, { onConflict: 'channel_id,day' });

        if (error) {
          console.error('Error upserting channel data:', error);
        } else {
          totalChannelRows += rows.length;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Process video-level data
    console.log('Fetching video-level daily data...');
    for (const chunk of chunks) {
      const requestData = {
        channelId,
        startDate: chunk.start,
        endDate: chunk.end,
        metrics,
        dimensions: 'video,date'
      };

      const data = await queryYouTubeAnalytics(
        accessToken,
        channelId,
        chunk.start,
        chunk.end,
        metrics,
        'video,day'
      );

      // Archive raw response
      await supabase.from('youtube_raw_archive').insert({
        user_id: userId,
        channel_id: channelId,
        report_type: 'daily_video',
        request_json: requestData,
        response_json: data,
      });

      if (data.rows && data.rows.length > 0) {
        const columnMap = new Map(
          data.columnHeaders.map((h: any, i: number) => [h.name, i])
        );

        const rows = data.rows.map((row: any) => ({
          user_id: userId,
          channel_id: channelId,
          video_id: row[columnMap.get('video') as number],
          day: row[columnMap.get('day') as number],
          views: row[columnMap.get('views') as number] || 0,
          watch_time_seconds: (row[columnMap.get('estimatedMinutesWatched') as number] || 0) * 60,
          average_view_duration_seconds: row[columnMap.get('averageViewDuration') as number] || 0,
          average_view_percentage: row[columnMap.get('averageViewPercentage') as number] || 0,
          likes: row[columnMap.get('likes') as number] || 0,
          comments: row[columnMap.get('comments') as number] || 0,
          shares: row[columnMap.get('shares') as number] || 0,
          subscribers_gained: row[columnMap.get('subscribersGained') as number] || 0,
          subscribers_lost: row[columnMap.get('subscribersLost') as number] || 0,
        }));

        const { error } = await supabase
          .from('yt_video_daily')
          .upsert(rows, { onConflict: 'channel_id,video_id,day' });

        if (error) {
          console.error('Error upserting video data:', error);
        } else {
          totalVideoRows += rows.length;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update sync state
    await supabase.from('youtube_sync_state').upsert({
      user_id: userId,
      channel_id: channelId,
      last_sync_date: endDate,
      last_sync_at: new Date().toISOString(),
      status: 'completed',
      rows_inserted: totalChannelRows + totalVideoRows,
      rows_updated: 0,
    }, { onConflict: 'user_id,channel_id' });

    console.log(`Backfill complete: ${totalChannelRows} channel rows, ${totalVideoRows} video rows`);

    return new Response(
      JSON.stringify({
        success: true,
        channelRows: totalChannelRows,
        videoRows: totalVideoRows,
        message: `Backfill completed successfully`
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
