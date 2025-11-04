import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface TokenRecord {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  channel_id: string;
}

async function refreshToken(refreshToken: string): Promise<any> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  return await response.json();
}

async function getValidToken(supabase: any, userId: string): Promise<{ token: string; channelId: string }> {
  const { data, error } = await supabase
    .from('youtube_connection')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) throw new Error('No YouTube connection found');

  const tokenData = data as TokenRecord;
  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();

  if (expiresAt <= now) {
    const refreshed = await refreshToken(tokenData.refresh_token);
    const newExpiresAt = new Date(Date.now() + (refreshed.expires_in * 1000));
    
    await supabase
      .from('youtube_connection')
      .update({
        access_token: refreshed.access_token,
        expires_at: newExpiresAt.toISOString()
      })
      .eq('user_id', userId);

    return { token: refreshed.access_token, channelId: tokenData.channel_id };
  }

  return { token: tokenData.access_token, channelId: tokenData.channel_id };
}

async function fetchAllVideoIds(accessToken: string): Promise<string[]> {
  const videoIds: string[] = [];
  let pageToken = '';

  do {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'id');
    url.searchParams.set('forMine', 'true');
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('order', 'date');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`YouTube Data API error: ${errorText}`);
    }

    const data = await response.json();
    
    if (data.items) {
      videoIds.push(...data.items.map((item: any) => item.id.videoId));
    }

    pageToken = data.nextPageToken || '';

    await new Promise(resolve => setTimeout(resolve, 100));

  } while (pageToken);

  return videoIds;
}

async function fetchVideoDetails(accessToken: string, videoIds: string[]): Promise<any[]> {
  const videos = [];
  
  // Process in batches of 50 (YouTube API limit)
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'snippet,contentDetails,statistics,status,topicDetails');
    url.searchParams.set('id', batch.join(','));

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`YouTube Data API error: ${errorText}`);
    }

    const data = await response.json();
    videos.push(...data.items);

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return videos;
}

function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 3600 + minutes * 60 + seconds;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const jwt = authHeader.replace('Bearer ', '');
    
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(jwt);
    if (authError || !user) throw new Error('Unauthorized');

    const userId = user.id;
    console.log('Fetching video metadata for user:', userId);

    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { token, channelId } = await getValidToken(serviceSupabase, userId);

    console.log('Fetching all video IDs...');
    const videoIds = await fetchAllVideoIds(token);
    console.log(`Found ${videoIds.length} videos`);

    console.log('Fetching video details...');
    const videos = await fetchVideoDetails(token, videoIds);
    console.log(`Retrieved details for ${videos.length} videos`);

    let totalInserted = 0;

    for (const video of videos) {
      try {
        const record = {
          video_id: video.id,
          user_id: userId,
          channel_id: channelId,
          title: video.snippet.title,
          description: video.snippet.description || null,
          published_at: video.snippet.publishedAt,
          duration_seconds: parseDuration(video.contentDetails.duration),
          thumbnail_url: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url,
          tags: video.snippet.tags || [],
          category_id: video.snippet.categoryId
        };

        const { error: insertError } = await serviceSupabase
          .from('yt_video_metadata')
          .upsert([record], {
            onConflict: 'user_id,video_id'
          });

        if (insertError) {
          console.error('Insert error for video', video.id, ':', insertError);
        } else {
          totalInserted++;
        }

      } catch (error) {
        console.error('Error processing video', video.id, ':', error);
      }
    }

    console.log(`Successfully inserted/updated ${totalInserted} video metadata records`);

    return new Response(
      JSON.stringify({
        success: true,
        totalVideos: videoIds.length,
        totalInserted
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
