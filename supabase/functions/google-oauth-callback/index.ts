import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, state } = await req.json();

    if (!code) {
      throw new Error('Missing authorization code');
    }

    if (!state) {
      throw new Error('Missing state parameter');
    }

    // Verify state and get user_id
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: stateRecord, error: stateError } = await supabase
      .from('oauth_states')
      .select('user_id')
      .eq('state', state)
      .maybeSingle();

    if (stateError || !stateRecord) {
      console.error('Invalid state:', stateError);
      throw new Error('Invalid or expired state parameter');
    }

    const userId = stateRecord.user_id;

    // Delete used state to prevent replay attacks
    await supabase.from('oauth_states').delete().eq('state', state);

    console.log('State verified for user:', userId);

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Missing Google OAuth configuration');
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      throw new Error('Failed to exchange code for tokens');
    }

    const tokens = await tokenResponse.json();
    console.log('Tokens received, expires_in:', tokens.expires_in);

    // Get channel ID
    const channelResponse = await fetch(
      'https://youtube.googleapis.com/youtube/v3/channels?part=id&mine=true',
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    if (!channelResponse.ok) {
      throw new Error('Failed to fetch channel info');
    }

    const channelData = await channelResponse.json();
    const channelId = channelData.items?.[0]?.id;

    if (!channelId) {
      throw new Error('No YouTube channel found for this account');
    }

    console.log('Channel ID:', channelId);

    // Store tokens in youtube_connection table
    const expiryTs = new Date(Date.now() + tokens.expires_in * 1000);

    const { error: dbError } = await supabase
      .from('youtube_connection')
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: expiryTs.toISOString(),
        channel_id: channelId, // Store first channel by default
      }, {
        onConflict: 'user_id'
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to store tokens');
    }

    console.log('Tokens stored successfully with channel:', channelId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        channelId,
        message: 'OAuth completed successfully. You can now select your channel.' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});