import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI');

    if (!clientId || !redirectUri) {
      throw new Error('Missing Google OAuth configuration');
    }

    // Build OAuth URL with YouTube Analytics scope
    const scope = 'https://www.googleapis.com/auth/yt-analytics.readonly https://www.googleapis.com/auth/youtube.readonly';
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    console.log('Generated OAuth URL:', authUrl.toString());

    return new Response(
      JSON.stringify({ url: authUrl.toString() }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error generating OAuth URL:', error);
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