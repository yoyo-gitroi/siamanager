/**
 * Instagram Daily Sync
 *
 * Syncs Instagram account-level insights for yesterday.
 * Runs daily to capture daily metrics (impressions, reach, profile views, etc.)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { corsHeaders } from '../_shared/cors.ts';
import { getInstagramConnection, getAccountInsights, ACCOUNT_METRICS } from '../_shared/instagram-api.ts';
import { getDaysAgo } from '../_shared/youtube-api.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user is authenticated
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

    // Get Instagram connection
    const connection = await getInstagramConnection(supabase, user.id);

    // Sync data from yesterday
    const dateStr = getDaysAgo(1);

    console.log(`Starting Instagram daily sync for user ${user.id}, date: ${dateStr}`);

    // Fetch account insights
    const insightsData = await getAccountInsights(
      connection.instagram_user_id,
      ACCOUNT_METRICS.DAILY,
      'day',
      connection.access_token
    );

    // Process insights data
    const insights: Record<string, number> = {};
    if (insightsData.data) {
      for (const metric of insightsData.data) {
        const value = metric.values && metric.values.length > 0 ? metric.values[0].value : 0;
        insights[metric.name] = value;
      }
    }

    // Insert/update daily metrics
    const { error: upsertError } = await supabase
      .from('instagram_account_daily')
      .upsert({
        user_id: user.id,
        instagram_user_id: connection.instagram_user_id,
        day: dateStr,
        impressions: insights.impressions || 0,
        reach: insights.reach || 0,
        profile_views: insights.profile_views || 0,
        website_clicks: insights.website_clicks || 0,
        email_contacts: insights.email_contacts || 0,
        phone_call_clicks: insights.phone_call_clicks || 0,
        text_message_clicks: insights.text_message_clicks || 0,
        get_directions_clicks: insights.get_directions_clicks || 0,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,instagram_user_id,day',
      });

    if (upsertError) {
      throw new Error(`Failed to store insights: ${upsertError.message}`);
    }

    // Update sync state
    await supabase
      .from('instagram_sync_state')
      .upsert({
        user_id: user.id,
        instagram_user_id: connection.instagram_user_id,
        last_sync_date: dateStr,
        last_sync_at: new Date().toISOString(),
        status: 'completed',
        rows_inserted: 1,
        last_error: null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,instagram_user_id',
      });

    console.log(`Successfully synced Instagram account insights for ${dateStr}`);

    return new Response(
      JSON.stringify({
        success: true,
        date: dateStr,
        insights,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in instagram-sync-daily:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Try to update sync state with error
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const supabaseAuth = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_ANON_KEY')!
        );
        const { data: { user } } = await supabaseAuth.auth.getUser(token);

        if (user) {
          const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
          );

          const connection = await getInstagramConnection(supabase, user.id);

          await supabase
            .from('instagram_sync_state')
            .upsert({
              user_id: user.id,
              instagram_user_id: connection.instagram_user_id,
              last_sync_at: new Date().toISOString(),
              status: 'failed',
              last_error: message,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,instagram_user_id',
            });
        }
      }
    } catch (stateError) {
      console.error('Failed to update sync state:', stateError);
    }

    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
