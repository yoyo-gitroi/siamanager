/**
 * Instagram Real-Time Snapshot
 *
 * Captures current Instagram account stats (followers, following, media count)
 * and recent media engagement for real-time tracking.
 * Designed to run every 30 minutes via pg_cron.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { getInstagramConnection, getAccountInfo, getMediaList } from '../_shared/instagram-api.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get all Instagram connections
    const { data: connections, error: connectionsError } = await supabase
      .from('instagram_connection')
      .select('user_id, instagram_user_id, access_token');

    if (connectionsError) {
      throw new Error(`Failed to fetch connections: ${connectionsError.message}`);
    }

    if (!connections || connections.length === 0) {
      console.log('No Instagram connections found');
      return new Response(
        JSON.stringify({ message: 'No Instagram connections to sync' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    const capturedAt = new Date().toISOString();

    for (const connection of connections) {
      try {
        console.log(`Processing Instagram user ${connection.user_id}`);

        // Fetch current account stats
        const accountInfo = await getAccountInfo(
          connection.instagram_user_id,
          connection.access_token
        );

        // Store account snapshot
        await supabase.from('instagram_account_intraday').insert({
          user_id: connection.user_id,
          instagram_user_id: connection.instagram_user_id,
          captured_at: capturedAt,
          follower_count: accountInfo.followers_count || 0,
          following_count: accountInfo.follows_count || 0,
          media_count: accountInfo.media_count || 0,
        });

        // Fetch recent media (last 10 posts)
        const mediaList = await getMediaList(
          connection.instagram_user_id,
          connection.access_token,
          10,
          'id,like_count,comments_count,media_type'
        );

        // Store media snapshots
        const mediaSnapshots = [];
        if (mediaList.data) {
          for (const media of mediaList.data) {
            mediaSnapshots.push({
              user_id: connection.user_id,
              instagram_user_id: connection.instagram_user_id,
              media_id: media.id,
              captured_at: capturedAt,
              like_count: media.like_count || 0,
              comment_count: media.comments_count || 0,
              video_views: media.media_type === 'VIDEO' ? (media.video_views || 0) : 0,
            });
          }
        }

        if (mediaSnapshots.length > 0) {
          await supabase.from('instagram_media_intraday').insert(mediaSnapshots);
        }

        results.push({
          userId: connection.user_id,
          followers: accountInfo.followers_count,
          mediaCaptured: mediaSnapshots.length,
        });

        console.log(`Successfully captured Instagram snapshot (${mediaSnapshots.length} media items)`);
      } catch (error) {
        console.error(`Error processing Instagram user ${connection.user_id}:`, error);
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
    console.error('Error in instagram-realtime-snapshot:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
