/**
 * Instagram OAuth Start
 *
 * Initiates Instagram OAuth flow using Facebook Login.
 * Instagram Insights API requires a Facebook/Instagram Graph API integration.
 *
 * Prerequisites:
 * - Facebook App created at developers.facebook.com
 * - Instagram Business or Creator account
 * - Instagram account connected to a Facebook Page
 *
 * Environment variables needed:
 * - FACEBOOK_APP_ID
 * - INSTAGRAM_REDIRECT_URI
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { corsHeaders } from '../_shared/cors.ts';

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Get environment variables
    const facebookAppId = Deno.env.get('FACEBOOK_APP_ID');
    const redirectUri = Deno.env.get('INSTAGRAM_REDIRECT_URI');

    if (!facebookAppId || !redirectUri) {
      return new Response(
        JSON.stringify({
          error: 'Instagram OAuth not configured. Missing FACEBOOK_APP_ID or INSTAGRAM_REDIRECT_URI'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Build Facebook OAuth URL with Instagram permissions
    // We need these permissions to access Instagram Business Account insights:
    // - instagram_basic: Basic account info
    // - instagram_manage_insights: Read insights
    // - pages_read_engagement: Read page data
    // - pages_show_list: List pages
    const scope = [
      'instagram_basic',
      'instagram_manage_insights',
      'pages_read_engagement',
      'pages_show_list',
      'business_management'
    ].join(',');

    const state = crypto.randomUUID(); // CSRF protection

    // Store state in a short-lived session (you might want to use a DB table for this)
    // For now, we'll pass it through and validate in callback

    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    authUrl.searchParams.set('client_id', facebookAppId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_type', 'code');

    console.log(`Generated Instagram OAuth URL for user ${user.id}`);

    return new Response(
      JSON.stringify({
        authUrl: authUrl.toString(),
        state,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in instagram-oauth-start:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
