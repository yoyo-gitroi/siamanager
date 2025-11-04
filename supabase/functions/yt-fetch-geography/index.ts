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
    console.log('Token expired, refreshing...');
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

async function queryYouTubeAnalytics(
  accessToken: string,
  channelId: string,
  startDate: string,
  endDate: string,
  metrics: string,
  dimensions: string,
  filters?: string,
  maxResults?: number
): Promise<any> {
  const url = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
  url.searchParams.set('ids', `channel==${channelId}`);
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);
  url.searchParams.set('metrics', metrics);
  url.searchParams.set('dimensions', dimensions);
  url.searchParams.set('sort', '-views');
  if (filters) url.searchParams.set('filters', filters);
  if (maxResults) url.searchParams.set('maxResults', maxResults.toString());

  console.log('Querying YouTube Analytics API:', url.toString());

  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Analytics API error: ${errorText}`);
  }

  return await response.json();
}

function getQuarterChunks(fromDate: string, toDate: string): Array<{start: string, end: string}> {
  const chunks: Array<{start: string, end: string}> = [];
  const start = new Date(fromDate);
  const end = new Date(toDate);
  
  let current = new Date(start);
  
  while (current < end) {
    const chunkStart = new Date(current);
    const chunkEnd = new Date(current);
    chunkEnd.setMonth(chunkEnd.getMonth() + 3);
    
    if (chunkEnd > end) {
      chunks.push({
        start: chunkStart.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      });
      break;
    } else {
      chunkEnd.setDate(chunkEnd.getDate() - 1);
      chunks.push({
        start: chunkStart.toISOString().split('T')[0],
        end: chunkEnd.toISOString().split('T')[0]
      });
      current = new Date(chunkEnd);
      current.setDate(current.getDate() + 1);
    }
  }
  
  return chunks;
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
    console.log('Fetching geography data for user:', userId);

    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { token, channelId } = await getValidToken(serviceSupabase, userId);

    const { fromDate = '2015-01-01', toDate } = await req.json();
    const actualToDate = toDate || new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const chunks = getQuarterChunks(fromDate, actualToDate);
    console.log(`Processing ${chunks.length} quarterly chunks for geography`);

    let totalInserted = 0;
    const failedChunks = [];

    for (const chunk of chunks) {
      try {
        // Fetch country data
        console.log(`Fetching country data for ${chunk.start} to ${chunk.end}`);
        
        const countryResult = await queryYouTubeAnalytics(
          token,
          channelId,
          chunk.start,
          chunk.end,
          'views,estimatedMinutesWatched,averageViewDuration,subscribersGained',
          'country',
          undefined,
          250
        );

        if (countryResult.rows && countryResult.rows.length > 0) {
          const records = countryResult.rows.map((row: any[]) => ({
            user_id: userId,
            channel_id: channelId,
            day: chunk.start,
            country: row[0],
            province: null,
            views: row[1],
            watch_time_seconds: Math.round((row[2] || 0) * 60)
          }));

          const { error: insertError } = await serviceSupabase
            .from('yt_geography')
            .upsert(records, {
              onConflict: 'user_id,channel_id,day,country,province'
            });

          if (insertError) {
            console.error('Insert error:', insertError);
            failedChunks.push({ chunk, type: 'countries', error: insertError.message });
          } else {
            totalInserted += records.length;
            console.log(`Inserted ${records.length} country records`);
          }
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        // Fetch US cities data
        console.log(`Fetching US cities data for ${chunk.start} to ${chunk.end}`);
        
        const cityResult = await queryYouTubeAnalytics(
          token,
          channelId,
          chunk.start,
          chunk.end,
          'views,estimatedMinutesWatched',
          'province',
          'country==US',
          100
        );

        if (cityResult.rows && cityResult.rows.length > 0) {
          const records = cityResult.rows.map((row: any[]) => ({
            user_id: userId,
            channel_id: channelId,
            day: chunk.start,
            country: 'US',
            province: row[0],
            views: row[1],
            watch_time_seconds: Math.round((row[2] || 0) * 60)
          }));

          const { error: insertError } = await serviceSupabase
            .from('yt_geography')
            .upsert(records, {
              onConflict: 'user_id,channel_id,day,country,province'
            });

          if (insertError) {
            console.error('Insert error:', insertError);
            failedChunks.push({ chunk, type: 'us_cities', error: insertError.message });
          } else {
            totalInserted += records.length;
            console.log(`Inserted ${records.length} US city records`);
          }
        }

        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Failed chunk ${chunk.start}-${chunk.end}:`, error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        failedChunks.push({ chunk, error: errorMsg });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalInserted,
        chunksProcessed: chunks.length,
        failedChunks
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
