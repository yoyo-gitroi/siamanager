import { corsHeaders } from '../_shared/cors.ts';

interface TokenRecord {
  access_token: string;
  refresh_token: string;
  token_expiry: string;
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
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.statusText}`);
  }

  return await response.json();
}

async function getValidToken(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('youtube_connection')
    .select('access_token, refresh_token, token_expiry')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error('No YouTube connection found');
  }

  const now = new Date();
  const expiry = new Date(data.token_expiry);

  if (now >= expiry) {
    console.log('Token expired, refreshing...');
    const refreshed = await refreshToken(data.refresh_token);
    
    const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000);
    
    await supabase
      .from('youtube_connection')
      .update({
        access_token: refreshed.access_token,
        token_expiry: newExpiry.toISOString(),
      })
      .eq('user_id', userId);

    return refreshed.access_token;
  }

  return data.access_token;
}

async function fetchChannelMetadata(channelId: string, accessToken: string) {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch channel metadata: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.items || data.items.length === 0) {
    throw new Error('Channel not found');
  }

  const channel = data.items[0];
  return {
    id: channel.id,
    title: channel.snippet.title,
    description: channel.snippet.description,
    thumbnailUrl: channel.snippet.thumbnails?.default?.url,
  };
}

async function validateChannelAccess(channelId: string, accessToken: string): Promise<boolean> {
  // Try to fetch a simple analytics query to validate access
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  const url = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
  url.searchParams.append('ids', `channel==${channelId}`);
  url.searchParams.append('startDate', dateStr);
  url.searchParams.append('endDate', dateStr);
  url.searchParams.append('metrics', 'views');

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  // If we get 200, user has access. If 403/401, they don't.
  return response.ok;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Extract JWT token from Authorization header
    const jwt = authHeader.replace('Bearer ', '');

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(jwt);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { channelId } = await req.json();

    if (!channelId) {
      return new Response(
        JSON.stringify({ error: 'Channel ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Validating channel access for user ${user.id}, channel ${channelId}`);

    // Create Supabase client with service role to read tokens
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get valid access token
    const accessToken = await getValidToken(supabase, user.id);

    // Validate that user has analytics access to this channel
    const hasAccess = await validateChannelAccess(channelId, accessToken);

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ 
          error: 'You do not have analytics access to this channel. Make sure you have Editor or Manager permissions in YouTube Studio.',
          hasAccess: false 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch channel metadata
    const channelMetadata = await fetchChannelMetadata(channelId, accessToken);

    console.log(`Channel validated successfully: ${channelMetadata.title}`);

    return new Response(
      JSON.stringify({
        success: true,
        hasAccess: true,
        channel: channelMetadata,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error validating channel:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
