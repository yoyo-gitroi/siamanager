import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { getValidToken } from '../_shared/youtube-auth.ts';
import { queryYouTubeAnalytics, getDaysAgo } from '../_shared/youtube-api.ts';

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
      .select('user_id, channel_id');

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

    // Sync data from 3 days ago (accounts for YouTube Analytics API 2-3 day delay)
    const dateStr = getDaysAgo(3);

    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ userId: string; error: string }> = [];

    for (const conn of connections) {
      if (!conn.channel_id) {
        console.log(`Skipping user ${conn.user_id} - no channel selected`);
        continue;
      }

      try {
        // Get valid access token (handles refresh automatically)
        const { token: accessToken, channelId } = await getValidToken(supabase, conn.user_id);

        // Channel-level sync
        const channelMetrics = 'views,estimatedMinutesWatched,subscribersGained,subscribersLost';
        const channelData = await queryYouTubeAnalytics(
          channelId,
          dateStr,
          dateStr,
          channelMetrics,
          accessToken,
          'day'
        );

        await supabase.from('youtube_raw_archive').insert({
          user_id: conn.user_id,
          channel_id: channelId,
          report_type: 'daily_channel',
          request_json: { channelId, startDate: dateStr, endDate: dateStr, metrics: channelMetrics, dimensions: 'day' },
          response_json: channelData,
        });

        let channelRows = 0;
        if (channelData.rows && channelData.rows.length > 0) {
          const columnMap = new Map(
            channelData.columnHeaders.map((h: any, i: number) => [h.name, i])
          );

          const rows = channelData.rows.map((row: any) => ({
            user_id: conn.user_id,
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

        // Video-level sync - fetch basic metrics first
        const videoMetricsBasic = 'views,estimatedMinutesWatched,averageViewDuration';
        const videoData = await queryYouTubeAnalytics(
          channelId,
          dateStr,
          dateStr,
          videoMetricsBasic,
          accessToken,
          'day,video'
        );

        await supabase.from('youtube_raw_archive').insert({
          user_id: conn.user_id,
          channel_id: channelId,
          report_type: 'daily_video',
          request_json: { channelId, startDate: dateStr, endDate: dateStr, metrics: videoMetricsBasic, dimensions: 'day,video' },
          response_json: videoData,
        });

        // Try to fetch impression metrics separately (may not be available for all channels)
        let impressionData: any = null;
        try {
          impressionData = await queryYouTubeAnalytics(
            channelId,
            dateStr,
            dateStr,
            'impressions,impressionClickThroughRate',
            accessToken,
            'day,video'
          );
          console.log('Impression data fetched successfully');
        } catch (error) {
          console.log('Impression metrics not available for this channel:', error instanceof Error ? error.message : 'Unknown error');
          // Continue without impression data
        }

        let videoRows = 0;
        if (videoData.rows && videoData.rows.length > 0) {
          const columnMap = new Map(
            videoData.columnHeaders.map((h: any, i: number) => [h.name, i])
          );

          // Create impression map if data is available
          const impressionMap = new Map();
          if (impressionData?.rows && impressionData.rows.length > 0) {
            const impColumnMap = new Map(
              impressionData.columnHeaders.map((h: any, i: number) => [h.name, i])
            );
            impressionData.rows.forEach((row: any) => {
              const key = `${row[impColumnMap.get('video') as number]}_${row[impColumnMap.get('day') as number]}`;
              impressionMap.set(key, {
                impressions: row[impColumnMap.get('impressions') as number] || 0,
                ctr: row[impColumnMap.get('impressionClickThroughRate') as number] || 0,
              });
            });
          }

          const rows = videoData.rows.map((row: any) => {
            const videoId = row[columnMap.get('video') as number];
            const day = row[columnMap.get('day') as number];
            const key = `${videoId}_${day}`;
            const impressions = impressionMap.get(key);

            return {
              user_id: conn.user_id,
              channel_id: channelId,
              video_id: videoId,
              day: day,
              views: row[columnMap.get('views') as number] || 0,
              watch_time_seconds: (row[columnMap.get('estimatedMinutesWatched') as number] || 0) * 60,
              avg_view_duration_seconds: row[columnMap.get('averageViewDuration') as number] || 0,
              impressions: impressions?.impressions || 0,
              click_through_rate: impressions?.ctr || 0,
              likes: 0,
              comments: 0,
            };
          });

          await supabase.from('yt_video_daily').upsert(rows, { onConflict: 'channel_id,video_id,day' });
          videoRows = rows.length;
        }

        // Update sync state
        await supabase.from('youtube_sync_state').upsert({
          user_id: conn.user_id,
          channel_id: channelId,
          last_sync_date: dateStr,
          last_sync_at: new Date().toISOString(),
          status: 'completed',
          rows_inserted: channelRows + videoRows,
          last_error: null,
        }, { onConflict: 'user_id,channel_id' });

        successCount++;
        console.log(`✓ Synced user ${conn.user_id}: ${channelRows} channel, ${videoRows} video rows`);

      } catch (error: any) {
        failureCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ userId: conn.user_id, error: errorMsg });
        console.error(`✗ Failed to sync user ${conn.user_id}:`, errorMsg);

        // Update sync state with error
        await supabase.from('youtube_sync_state').upsert({
          user_id: conn.user_id,
          channel_id: conn.channel_id,
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
