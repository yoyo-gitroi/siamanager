/**
 * Instagram OAuth Callback
 *
 * Handles the OAuth callback from Facebook/Instagram.
 * Exchanges the authorization code for an access token,
 * fetches Instagram Business Account info, and stores the connection.
 *
 * Environment variables needed:
 * - FACEBOOK_APP_ID
 * - FACEBOOK_APP_SECRET
 * - INSTAGRAM_REDIRECT_URI
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { corsHeaders } from '../_shared/cors.ts';

interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
  };
}

interface InstagramAccount {
  id: string;
  username: string;
  name: string;
  profile_picture_url: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('Instagram OAuth error:', error);
      return new Response(
        JSON.stringify({ error: `Instagram OAuth failed: ${error}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get environment variables
    const facebookAppId = Deno.env.get('FACEBOOK_APP_ID');
    const facebookAppSecret = Deno.env.get('FACEBOOK_APP_SECRET');
    const redirectUri = Deno.env.get('INSTAGRAM_REDIRECT_URI');

    if (!facebookAppId || !facebookAppSecret || !redirectUri) {
      return new Response(
        JSON.stringify({ error: 'Instagram OAuth not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Step 1: Exchange code for access token
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', facebookAppId);
    tokenUrl.searchParams.set('client_secret', facebookAppSecret);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);

    const tokenResponse = await fetch(tokenUrl.toString());
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Failed to exchange code for token: ${errorText}`);
    }

    const tokenData: FacebookTokenResponse = await tokenResponse.json();
    const shortLivedToken = tokenData.access_token;

    // Step 2: Exchange short-lived token for long-lived token (60 days)
    const longLivedTokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    longLivedTokenUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longLivedTokenUrl.searchParams.set('client_id', facebookAppId);
    longLivedTokenUrl.searchParams.set('client_secret', facebookAppSecret);
    longLivedTokenUrl.searchParams.set('fb_exchange_token', shortLivedToken);

    const longLivedResponse = await fetch(longLivedTokenUrl.toString());
    if (!longLivedResponse.ok) {
      const errorText = await longLivedResponse.text();
      throw new Error(`Failed to get long-lived token: ${errorText}`);
    }

    const longLivedData: FacebookTokenResponse = await longLivedResponse.json();
    const accessToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in; // Usually 5184000 seconds (60 days)
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000);

    // Step 3: Get user's Facebook Pages
    const pagesUrl = new URL('https://graph.facebook.com/v18.0/me/accounts');
    pagesUrl.searchParams.set('access_token', accessToken);
    pagesUrl.searchParams.set('fields', 'id,name,access_token,instagram_business_account');

    const pagesResponse = await fetch(pagesUrl.toString());
    if (!pagesResponse.ok) {
      const errorText = await pagesResponse.text();
      throw new Error(`Failed to fetch Facebook pages: ${errorText}`);
    }

    const pagesData = await pagesResponse.json();
    const pages: FacebookPage[] = pagesData.data || [];

    // Find the first page with an Instagram Business Account
    const pageWithInstagram = pages.find(page => page.instagram_business_account);

    if (!pageWithInstagram || !pageWithInstagram.instagram_business_account) {
      return new Response(
        JSON.stringify({
          error: 'No Instagram Business Account found. Please ensure your Instagram account is connected to a Facebook Page and is set to Business or Creator.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const instagramAccountId = pageWithInstagram.instagram_business_account.id;
    const pageAccessToken = pageWithInstagram.access_token; // Use page access token for Instagram API calls

    // Step 4: Get Instagram account details
    const instagramUrl = new URL(`https://graph.facebook.com/v18.0/${instagramAccountId}`);
    instagramUrl.searchParams.set('fields', 'id,username,name,profile_picture_url,followers_count,follows_count,media_count');
    instagramUrl.searchParams.set('access_token', pageAccessToken);

    const instagramResponse = await fetch(instagramUrl.toString());
    if (!instagramResponse.ok) {
      const errorText = await instagramResponse.text();
      throw new Error(`Failed to fetch Instagram account: ${errorText}`);
    }

    const instagramAccount: InstagramAccount = await instagramResponse.json();

    // Step 5: Store the connection in database
    const { data: connection, error: upsertError } = await supabase
      .from('instagram_connection')
      .upsert({
        user_id: user.id,
        instagram_user_id: instagramAccount.id,
        username: instagramAccount.username,
        account_type: 'BUSINESS', // We only support business accounts for now
        profile_picture_url: instagramAccount.profile_picture_url,
        access_token: pageAccessToken, // Store page access token (used for API calls)
        token_expiry: tokenExpiry.toISOString(),
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Error storing Instagram connection:', upsertError);
      throw new Error(`Failed to store connection: ${upsertError.message}`);
    }

    console.log(`Successfully connected Instagram account ${instagramAccount.username} for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        account: {
          instagram_user_id: instagramAccount.id,
          username: instagramAccount.username,
          name: instagramAccount.name,
          profile_picture_url: instagramAccount.profile_picture_url,
          followers_count: instagramAccount.followers_count,
          follows_count: instagramAccount.follows_count,
          media_count: instagramAccount.media_count,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in instagram-oauth-callback:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
