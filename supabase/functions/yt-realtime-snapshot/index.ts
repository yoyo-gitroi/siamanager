import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { getValidToken } from '../_shared/youtube-auth.ts';
import { queryYouTubeDataAPI } from '../_shared/youtube-api.ts';
import { trackQuotaUsage, canProceed } from '../_shared/quota.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all users with YouTube connections
    const { data: connections, error: connectionsError } = await supabase
      .from('youtube_connection')
      .select('user_id, channel_id');

    if (connectionsError) {
      throw new Error(`Failed to fetch connections: ${connectionsError.message}`);
    }

    if (!connections || connections.length === 0) {
      console.log('No YouTube connections found');
      return new Response(
        JSON.stringify({ message: 'No YouTube connections to sync' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    const capturedAt = new Date().toISOString();

    for (const connection of connections) {
      try {
        console.log(`Processing user ${connection.user_id}, channel ${connection.channel_id}`);

        // Check quota before proceeding (estimate: 3 units for this run)
        const quotaCheck = await canProceed(supabase, connection.user_id, 3);
        if (!quotaCheck.canProceed) {
          console.warn(`Skipping user ${connection.user_id} - quota limit reached (${quotaCheck.currentUsage} units used)`);
          results.push({
            userId: connection.user_id,
            skipped: true,
            reason: 'quota_limit_reached',
            quotaUsed: quotaCheck.currentUsage,
          });
          continue;
        }

        const { token, channelId } = await getValidToken(supabase, connection.user_id);
        let apiUnitsUsed = 0;

        // 1. Fetch channel statistics (1 unit)
        const channelData = await queryYouTubeDataAPI(
          'channels',
          {
            part: 'statistics',
            id: channelId,
          },
          token
        );
        apiUnitsUsed += 1;

        if (channelData.items && channelData.items.length > 0) {
          const stats = channelData.items[0].statistics;
          await supabase.from('yt_channel_intraday').insert({
            user_id: connection.user_id,
            channel_id: channelId,
            captured_at: capturedAt,
            view_count: parseInt(stats.viewCount) || 0,
            subscriber_count: parseInt(stats.subscriberCount) || 0,
            video_count: parseInt(stats.videoCount) || 0,
          });
        }

        // 2. Get recent video IDs from database (published in last 48 hours)
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        const { data: recentVideos } = await supabase
          .from('yt_video_metadata')
          .select('video_id')
          .eq('channel_id', channelId)
          .eq('user_id', connection.user_id)
          .gte('published_at', twoDaysAgo.toISOString())
          .order('published_at', { ascending: false })
          .limit(20);

        const videoIds = recentVideos?.map((v: any) => v.video_id) || [];

        if (videoIds.length === 0) {
          console.log(`No recent videos found for channel ${channelId}`);
          await trackQuotaUsage(supabase, connection.user_id, apiUnitsUsed);
          results.push({
            userId: connection.user_id,
            channelId,
            videosCaptured: 0,
            apiUnitsUsed,
          });
          continue;
        }

        // 3. Fetch video statistics (1 unit per 50 videos)
        const videoSnapshots = [];
        const batchSize = 50;

        for (let i = 0; i < videoIds.length; i += batchSize) {
          const batch = videoIds.slice(i, i + batchSize);

          const videoData = await queryYouTubeDataAPI(
            'videos',
            {
              part: 'statistics,liveStreamingDetails',
              id: batch.join(','),
            },
            token
          );
          apiUnitsUsed += 1;

          if (videoData.items) {
            for (const video of videoData.items) {
              const stats = video.statistics;
              const liveDetails = video.liveStreamingDetails;

              videoSnapshots.push({
                user_id: connection.user_id,
                channel_id: channelId,
                video_id: video.id,
                captured_at: capturedAt,
                view_count: parseInt(stats.viewCount) || 0,
                like_count: parseInt(stats.likeCount) || 0,
                comment_count: parseInt(stats.commentCount) || 0,
                concurrent_viewers: liveDetails?.concurrentViewers ? parseInt(liveDetails.concurrentViewers) : null,
                is_live: !!liveDetails?.concurrentViewers,
              });
            }
          }
        }

        // 4. Insert video snapshots
        if (videoSnapshots.length > 0) {
          const { error: insertError } = await supabase
            .from('yt_video_intraday')
            .insert(videoSnapshots);

          if (insertError) {
            console.error('Error inserting video snapshots:', insertError);
          }
        }

        // Track actual API usage
        await trackQuotaUsage(supabase, connection.user_id, apiUnitsUsed);

        results.push({
          userId: connection.user_id,
          channelId,
          videosCaptured: videoSnapshots.length,
          liveNow: videoSnapshots.filter(v => v.is_live).length,
          apiUnitsUsed,
        });

        console.log(`Successfully captured ${videoSnapshots.length} video snapshots (${apiUnitsUsed} API units)`);
      } catch (error) {
        console.error(`Error processing user ${connection.user_id}:`, error);
        results.push({
          userId: connection.user_id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        capturedAt,
        totalUsers: connections.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in yt-realtime-snapshot:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
