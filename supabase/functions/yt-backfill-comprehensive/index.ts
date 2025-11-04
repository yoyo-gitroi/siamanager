import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const jwt = authHeader.replace('Bearer ', '');
    
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(jwt);
    if (authError || !user) throw new Error('Unauthorized');

    const userId = user.id;
    console.log('Starting comprehensive YouTube Analytics backfill for user:', userId);

    const { fromDate = '2015-01-01', toDate } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const results: any = {
      completed: [],
      failed: []
    };

    // Define all backfill functions to run
    const functions = [
      { name: 'yt-backfill-v2', label: 'Channel & Video Daily Metrics' },
      { name: 'yt-fetch-revenue', label: 'Revenue Data' },
      { name: 'yt-fetch-demographics', label: 'Demographics' },
      { name: 'yt-fetch-geography', label: 'Geography' },
      { name: 'yt-fetch-traffic', label: 'Traffic Sources' },
      { name: 'yt-fetch-devices', label: 'Device Stats' },
      { name: 'yt-fetch-retention', label: 'Audience Retention' },
      { name: 'yt-fetch-playlists', label: 'Playlists' },
      { name: 'yt-fetch-search-terms', label: 'Search Terms' },
      { name: 'yt-fetch-video-metadata', label: 'Video Metadata' }
    ];

    for (const func of functions) {
      try {
        console.log(`Running ${func.label}...`);
        
        const { data, error } = await supabase.functions.invoke(func.name, {
          body: { fromDate, toDate },
          headers: { Authorization: authHeader }
        });

        if (error) {
          console.error(`${func.label} failed:`, error);
          results.failed.push({ function: func.label, error: error.message });
        } else {
          console.log(`${func.label} completed:`, data);
          results.completed.push({ function: func.label, data });
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`${func.label} error:`, error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.failed.push({ function: func.label, error: errorMsg });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: functions.length,
          completed: results.completed.length,
          failed: results.failed.length
        },
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
