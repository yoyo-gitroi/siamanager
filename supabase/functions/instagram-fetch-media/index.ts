/**
 * Instagram Fetch Media
 *
 * Fetches Instagram media metadata and daily insights.
 * Can be called manually or scheduled to update media analytics.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { corsHeaders } from '../_shared/cors.ts';
import { getInstagramConnection, getMediaList, getMediaInsights, MEDIA_METRICS } from '../_shared/instagram-api.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const connection = await getInstagramConnection(supabase, user.id);

    // Get query params
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');

    console.log(`Fetching Instagram media for user ${user.id}, limit: ${limit}`);

    // Fetch media list
    const mediaList = await getMediaList(
      connection.instagram_user_id,
      connection.access_token,
      limit
    );

    if (!mediaList.data || mediaList.data.length === 0) {
      return new Response(
        JSON.stringify({ success: true, mediaCount: 0, message: 'No media found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mediaItems = [];
    let insightsCount = 0;

    for (const media of mediaList.data) {
      try {
        // Store media metadata
        await supabase.from('instagram_media').upsert({
          user_id: user.id,
          instagram_user_id: connection.instagram_user_id,
          media_id: media.id,
          media_type: media.media_type,
          media_url: media.media_url,
          thumbnail_url: media.thumbnail_url,
          permalink: media.permalink,
          caption: media.caption || null,
          timestamp: media.timestamp,
          is_story: media.media_type === 'STORY',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,media_id',
        });

        // Fetch media insights (skip stories as they expire)
        if (media.media_type !== 'STORY') {
          try {
            const metrics = media.media_type === 'VIDEO' ? MEDIA_METRICS.VIDEO : MEDIA_METRICS.POST;
            const insights = await getMediaInsights(media.id, metrics, connection.access_token);

            const insightValues: Record<string, number> = {};
            if (insights.data) {
              for (const metric of insights.data) {
                insightValues[metric.name] = metric.values[0]?.value || 0;
              }
            }

            // Store media daily insights (using media timestamp date)
            const mediaDate = new Date(media.timestamp).toISOString().split('T')[0];
            await supabase.from('instagram_media_daily').upsert({
              user_id: user.id,
              instagram_user_id: connection.instagram_user_id,
              media_id: media.id,
              day: mediaDate,
              like_count: media.like_count || 0,
              comment_count: media.comments_count || 0,
              saved: insightValues.saved || 0,
              shares: insightValues.shares || 0,
              impressions: insightValues.impressions || 0,
              reach: insightValues.reach || 0,
              video_views: insightValues.video_views || 0,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,media_id,day',
            });

            insightsCount++;
          } catch (insightError) {
            console.warn(`Could not fetch insights for media ${media.id}:`, insightError);
          }
        }

        mediaItems.push({
          id: media.id,
          type: media.media_type,
          timestamp: media.timestamp,
        });

      } catch (error) {
        console.error(`Error processing media ${media.id}:`, error);
      }

      // Rate limit: wait 100ms between media items
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Successfully fetched ${mediaItems.length} media items, ${insightsCount} with insights`);

    return new Response(
      JSON.stringify({
        success: true,
        mediaCount: mediaItems.length,
        insightsCount,
        media: mediaItems,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in instagram-fetch-media:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
