import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenRecord {
  access_token: string;
  refresh_token: string | null;
  token_expiry: string | null;
  channel_id: string;
}

// Refresh an expired YouTube access token
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
    const errorText = await response.text();
    throw new Error(`Failed to refresh token: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// Get a valid YouTube access token for the user
async function getValidToken(supabase: any, userId: string): Promise<{ token: string; channelId: string }> {
  const { data, error } = await supabase
    .from('youtube_connection')
    .select('access_token, refresh_token, token_expiry, channel_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    throw new Error('No YouTube connection found. Please connect your YouTube account first.');
  }

  const record = data as TokenRecord;
  const now = new Date();
  const expiry = record.token_expiry ? new Date(record.token_expiry) : null;

  // If token is expired, refresh it
  if (!expiry || expiry <= now) {
    if (!record.refresh_token) {
      throw new Error('No refresh token available. Please reconnect your YouTube account.');
    }

    console.log('Token expired, refreshing...');
    const refreshed = await refreshToken(record.refresh_token);

    const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000);
    await supabase
      .from('youtube_connection')
      .update({
        access_token: refreshed.access_token,
        token_expiry: newExpiry.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return { token: refreshed.access_token, channelId: record.channel_id };
  }

  return { token: record.access_token, channelId: record.channel_id };
}

// Query YouTube Data API with retry logic
async function queryYouTubeDataAPI(
  endpoint: string,
  params: Record<string, string>,
  token: string,
  retries = 3
): Promise<any> {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status >= 500 && attempt < retries) {
          console.warn(`Attempt ${attempt} failed with ${response.status}, retrying...`);
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw new Error(`YouTube API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt === retries) throw error;
      console.warn(`Attempt ${attempt} failed:`, error);
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// Track API quota usage
async function trackQuotaUsage(supabase: any, userId: string, unitsUsed: number): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  
  // Get or create today's quota record
  const { data: quota } = await supabase
    .from('yt_api_quota_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  const currentUsage = quota?.units_used || 0;
  const newUsage = currentUsage + unitsUsed;

  // Check if we're over quota (80% threshold = 8000 units)
  if (newUsage >= 8000) {
    console.warn(`User ${userId} approaching quota limit: ${newUsage}/10000 units`);
    return false; // Don't proceed with API call
  }

  // Upsert quota usage
  await supabase
    .from('yt_api_quota_usage')
    .upsert({
      user_id: userId,
      date: today,
      units_used: newUsage,
      units_available: 10000,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,date'
    });

  return true;
}

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
        const canProceed = await trackQuotaUsage(supabase, connection.user_id, 0);
        if (!canProceed) {
          console.warn(`Skipping user ${connection.user_id} - quota limit reached`);
          results.push({
            userId: connection.user_id,
            skipped: true,
            reason: 'quota_limit_reached',
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
