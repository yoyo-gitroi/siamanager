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
        
        const { token, channelId } = await getValidToken(supabase, connection.user_id);

        // 1. Fetch channel statistics
        const channelData = await queryYouTubeDataAPI(
          'channels',
          {
            part: 'statistics',
            id: channelId,
          },
          token
        );

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

        // 2. Get uploads playlist ID
        const channelDetails = await queryYouTubeDataAPI(
          'channels',
          {
            part: 'contentDetails',
            id: channelId,
          },
          token
        );

        if (!channelDetails.items || channelDetails.items.length === 0) {
          throw new Error('Channel not found');
        }

        const uploadsPlaylistId = channelDetails.items[0].contentDetails.relatedPlaylists.uploads;

        // 3. Get recent video IDs from uploads playlist
        const playlistItems = await queryYouTubeDataAPI(
          'playlistItems',
          {
            part: 'contentDetails',
            playlistId: uploadsPlaylistId,
            maxResults: '50',
          },
          token
        );

        const videoIds = playlistItems.items?.map((item: any) => item.contentDetails.videoId) || [];

        // 4. Search for live videos
        const liveSearch = await queryYouTubeDataAPI(
          'search',
          {
            part: 'id',
            channelId: channelId,
            eventType: 'live',
            type: 'video',
            maxResults: '10',
          },
          token
        );

        const liveVideoIds = liveSearch.items?.map((item: any) => item.id.videoId) || [];
        const allVideoIds = [...new Set([...videoIds, ...liveVideoIds])];

        if (allVideoIds.length === 0) {
          console.log(`No videos found for channel ${channelId}`);
          continue;
        }

        // 5. Fetch video statistics in batches of 50
        const videoSnapshots = [];
        for (let i = 0; i < allVideoIds.length; i += 50) {
          const batch = allVideoIds.slice(i, i + 50);
          
          // Add delay between batches to respect rate limits
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          const videoData = await queryYouTubeDataAPI(
            'videos',
            {
              part: 'statistics,liveStreamingDetails',
              id: batch.join(','),
            },
            token
          );

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

        // 6. Insert video snapshots
        if (videoSnapshots.length > 0) {
          const { error: insertError } = await supabase
            .from('yt_video_intraday')
            .insert(videoSnapshots);

          if (insertError) {
            console.error('Error inserting video snapshots:', insertError);
          }
        }

        results.push({
          userId: connection.user_id,
          channelId,
          videosCaptured: videoSnapshots.length,
          liveNow: videoSnapshots.filter(v => v.is_live).length,
        });

        console.log(`Successfully captured ${videoSnapshots.length} video snapshots for ${channelId}`);
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
