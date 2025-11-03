import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface TokenRecord {
  access_token: string;
  refresh_token: string | null;
  token_expiry: string | null;
}

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
    throw new Error('Failed to refresh token');
  }

  return await response.json();
}

async function getValidToken(supabase: any, userId: string): Promise<string> {
  const { data: tokenRecord, error } = await supabase
    .from('youtube_connection')
    .select('access_token, refresh_token, token_expiry')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !tokenRecord) {
    throw new Error('No YouTube connection found. Please connect your account first.');
  }

  const token = tokenRecord as TokenRecord;
  
  // Check if token is expired
  if (token.token_expiry) {
    const expiryDate = new Date(token.token_expiry);
    const now = new Date();
    
    if (expiryDate <= now) {
      console.log('Token expired, refreshing...');
      
      if (!token.refresh_token) {
        throw new Error('No refresh token available. Please reconnect your account.');
      }

      const refreshed = await refreshToken(token.refresh_token);
      const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000);

      // Update token in database
      await supabase
        .from('youtube_connection')
        .update({
          access_token: refreshed.access_token,
          token_expiry: newExpiry.toISOString(),
        })
        .eq('user_id', userId);

      return refreshed.access_token;
    }
  }

  return token.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const userId = user.id;

    // Create service client for DB operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get valid access token
    const accessToken = await getValidToken(supabase, userId);

    // Fetch user's YouTube channels
    const channelsResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!channelsResponse.ok) {
      const error = await channelsResponse.text();
      console.error('Failed to fetch channels:', error);
      throw new Error('Failed to fetch YouTube channels');
    }

    const channelsData = await channelsResponse.json();
    
    if (!channelsData.items || channelsData.items.length === 0) {
      return new Response(
        JSON.stringify({ 
          channels: [],
          message: 'No YouTube channels found for this account' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Format channels for dropdown
    const channels = channelsData.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails?.default?.url,
    }));

    console.log(`Found ${channels.length} channels for user ${userId}`);

    return new Response(
      JSON.stringify({ channels }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error listing channels:', error);
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
