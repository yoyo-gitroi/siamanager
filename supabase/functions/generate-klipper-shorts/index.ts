import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  videoUrl: string;
  numberOfShorts: number;
  avgVideoTime: number;
}

// Validate video URL on server-side
function validateVideoUrl(url: string): { valid: boolean; error?: string } {
  try {
    // Check if it's a valid URL
    const parsed = new URL(url);
    
    // Only HTTPS allowed
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'URL must use HTTPS protocol' };
    }
    
    // Whitelist YouTube and Google Drive domains
    const allowedDomains = [
      'youtube.com',
      'youtu.be',
      'm.youtube.com',
      'www.youtube.com',
      'drive.google.com',
      'docs.google.com'
    ];
    
    const isAllowed = allowedDomains.some(domain => 
      parsed.hostname === domain || 
      parsed.hostname.endsWith('.' + domain)
    );
    
    if (!isAllowed) {
      return { valid: false, error: 'URL must be from YouTube or Google Drive' };
    }
    
    // Check URL length
    if (url.length > 500) {
      return { valid: false, error: 'URL is too long' };
    }
    
    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get webhook URL from environment
    const webhookUrl = Deno.env.get('N8N_KLIPPER_WEBHOOK');
    if (!webhookUrl) {
      console.error('N8N_KLIPPER_WEBHOOK is not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { videoUrl, numberOfShorts, avgVideoTime }: GenerateRequest = await req.json();

    // Validate video URL
    const urlValidation = validateVideoUrl(videoUrl);
    if (!urlValidation.valid) {
      console.error('URL validation failed:', urlValidation.error);
      return new Response(
        JSON.stringify({ error: urlValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate numberOfShorts range
    if (numberOfShorts < 1 || numberOfShorts > 10) {
      return new Response(
        JSON.stringify({ error: 'Number of shorts must be between 1 and 10' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate avgVideoTime range
    if (avgVideoTime < 15 || avgVideoTime > 60) {
      return new Response(
        JSON.stringify({ error: 'Video time must be between 15 and 60 seconds' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare payload for webhook
    const payload = {
      videoUrl,
      numberOfShorts,
      avgVideoTime,
      userId: user.id,
      userEmail: user.email
    };

    console.log('Sending to webhook:', { videoUrl, numberOfShorts, avgVideoTime, userId: user.id });

    // Call n8n webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!webhookResponse.ok) {
      console.error('Webhook failed:', webhookResponse.status, await webhookResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to process request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log to database using service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: logError } = await supabaseAdmin
      .from('shorts_generation_logs')
      .insert({
        user_id: user.id,
        user_email: user.email || '',
        video_url: videoUrl,
        number_of_shorts: numberOfShorts,
        avg_video_time: avgVideoTime,
      });

    if (logError) {
      console.error('Failed to log generation:', logError);
      // Don't fail the request if logging fails
    }

    console.log('Shorts generation started successfully for user:', user.id);

    return new Response(
      JSON.stringify({ success: true, message: 'Shorts generation started' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-klipper-shorts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
