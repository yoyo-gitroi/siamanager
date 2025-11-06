import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface TokenRecord {
  user_id: string;
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
    console.log('Starting daily sync for all users...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all YouTube connections
    const { data: connections, error: connectionsError } = await supabase
      .from('youtube_connection')
      .select('user_id, access_token, refresh_token, token_expiry, channel_id');

    if (connectionsError) {
      throw connectionsError;
    }

    if (!connections || connections.length === 0) {
      console.log('No YouTube connections found');
      return new Response(
        JSON.stringify({ success: true, message: 'No connections to sync', usersSynced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${connections.length} YouTube connections`);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ userId: string; error: string }> = [];

    for (const conn of connections) {
      const token = conn as TokenRecord;
      
      if (!token.channel_id) {
        console.log(`Skipping user ${token.user_id} - no channel selected`);
        continue;
      }

      try {
        // Check and refresh token if needed
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
              .eq('user_id', token.user_id);

            accessToken = refreshed.access_token;
          }
        }

        // Channel-level sync
        const channelMetrics = 'views,estimatedMinutesWatched,subscribersGained,subscribersLost';
        const channelData = await queryYouTubeAnalytics(
          accessToken,
          token.channel_id,
          dateStr,
          dateStr,
          channelMetrics,
          'day'
        );

        await supabase.from('youtube_raw_archive').insert({
          user_id: token.user_id,
          channel_id: token.channel_id,
          report_type: 'daily_channel',
          request_json: { channelId: token.channel_id, startDate: dateStr, endDate: dateStr, metrics: channelMetrics, dimensions: 'day' },
          response_json: channelData,
        });

        let channelRows = 0;
        if (channelData.rows && channelData.rows.length > 0) {
          const columnMap = new Map(
            channelData.columnHeaders.map((h: any, i: number) => [h.name, i])
          );

          const rows = channelData.rows.map((row: any) => ({
            user_id: token.user_id,
            channel_id: token.channel_id,
            day: row[columnMap.get('day') as number],
            views: row[columnMap.get('views') as number] || 0,
            watch_time_seconds: (row[columnMap.get('estimatedMinutesWatched') as number] || 0) * 60,
            subscribers_gained: row[columnMap.get('subscribersGained') as number] || 0,
            subscribers_lost: row[columnMap.get('subscribersLost') as number] || 0,
          }));

          await supabase.from('yt_channel_daily').upsert(rows, { onConflict: 'channel_id,day' });
          channelRows = rows.length;
        }

        // Video-level sync
        const videoMetrics = 'views,estimatedMinutesWatched,averageViewDuration,impressions,impressionClickThroughRate,likes,comments';
        const videoData = await queryYouTubeAnalytics(
          accessToken,
          token.channel_id,
          dateStr,
          dateStr,
          videoMetrics,
          'video,day'
        );

        await supabase.from('youtube_raw_archive').insert({
          user_id: token.user_id,
          channel_id: token.channel_id,
          report_type: 'daily_video',
          request_json: { channelId: token.channel_id, startDate: dateStr, endDate: dateStr, metrics: videoMetrics, dimensions: 'video,day' },
          response_json: videoData,
        });

        let videoRows = 0;
        if (videoData.rows && videoData.rows.length > 0) {
          const columnMap = new Map(
            videoData.columnHeaders.map((h: any, i: number) => [h.name, i])
          );

          const rows = videoData.rows.map((row: any) => ({
            user_id: token.user_id,
            channel_id: token.channel_id,
            video_id: row[columnMap.get('video') as number],
            day: row[columnMap.get('day') as number],
            views: row[columnMap.get('views') as number] || 0,
            watch_time_seconds: (row[columnMap.get('estimatedMinutesWatched') as number] || 0) * 60,
            avg_view_duration_seconds: row[columnMap.get('averageViewDuration') as number] || 0,
            impressions: row[columnMap.get('impressions') as number] || 0,
            click_through_rate: row[columnMap.get('impressionClickThroughRate') as number] || 0,
            likes: row[columnMap.get('likes') as number] || 0,
            comments: row[columnMap.get('comments') as number] || 0,
          }));

          await supabase.from('yt_video_daily').upsert(rows, { onConflict: 'channel_id,video_id,day' });
          videoRows = rows.length;
        }

        // Update sync state
        await supabase.from('youtube_sync_state').upsert({
          user_id: token.user_id,
          channel_id: token.channel_id,
          last_sync_date: dateStr,
          last_sync_at: new Date().toISOString(),
          status: 'completed',
          rows_inserted: channelRows + videoRows,
          last_error: null,
        }, { onConflict: 'user_id,channel_id' });

        successCount++;
        console.log(`✓ Synced user ${token.user_id}: ${channelRows} channel, ${videoRows} video rows`);

      } catch (error: any) {
        failureCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ userId: token.user_id, error: errorMsg });
        console.error(`✗ Failed to sync user ${token.user_id}:`, errorMsg);

        // Update sync state with error
        await supabase.from('youtube_sync_state').upsert({
          user_id: token.user_id,
          channel_id: token.channel_id,
          last_sync_at: new Date().toISOString(),
          status: 'failed',
          last_error: errorMsg,
        }, { onConflict: 'user_id,channel_id' });
      }

      // Rate limiting - wait 500ms between users
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`Daily sync complete: ${successCount} succeeded, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        date: dateStr,
        usersSynced: successCount,
        usersFailed: failureCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Daily sync service error:', error);
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
