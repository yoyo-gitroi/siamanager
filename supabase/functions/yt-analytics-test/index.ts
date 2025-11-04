import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface TokenRecord {
  access_token: string;
  refresh_token: string | null;
  token_expiry: string | null;
  channel_id: string | null;
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

async function getValidToken(supabase: any, userId: string): Promise<{ token: string; channelId: string }> {
  const { data: tokenRecord, error } = await supabase
    .from('youtube_connection')
    .select('access_token, refresh_token, token_expiry, channel_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !tokenRecord) {
    throw new Error('No YouTube connection found');
  }

  const token = tokenRecord as TokenRecord;
  
  if (!token.channel_id) {
    throw new Error('No channel selected. Please select a channel first.');
  }

  let accessToken = token.access_token;

  // Check if token is expired
  if (token.token_expiry) {
    const expiryDate = new Date(token.token_expiry);
    if (expiryDate <= new Date()) {
      if (!token.refresh_token) {
        throw new Error('No refresh token available');
      }

      const refreshed = await refreshToken(token.refresh_token);
      const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000);

      await supabase
        .from('youtube_connection')
        .update({
          access_token: refreshed.access_token,
          token_expiry: newExpiry.toISOString(),
        })
        .eq('user_id', userId);

      accessToken = refreshed.access_token;
    }
  }

  return { token: accessToken, channelId: token.channel_id };
}

async function queryYouTubeAnalytics(
  accessToken: string,
  channelId: string,
  startDate: string,
  endDate: string,
  metrics: string,
  dimensions: string
): Promise<any> {
  const url = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
  url.searchParams.set('ids', `channel==${channelId}`);
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);
  url.searchParams.set('metrics', metrics);
  url.searchParams.set('dimensions', dimensions);

  console.log(`Testing YouTube Analytics: ${startDate} to ${endDate}, dimensions: ${dimensions}, metrics: ${metrics}`);

  let lastErrText = '';
  for (let attempt = 1; attempt <= 4; attempt++) {
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.ok) {
      return await response.json();
    }

    const errText = await response.text();
    lastErrText = errText;
    let retryable = false;
    try {
      const parsed = JSON.parse(errText);
      const reason = parsed?.error?.errors?.[0]?.reason || parsed?.error?.status;
      retryable = response.status >= 500 || reason === 'internalError' || reason === 'backendError';
    } catch (_) {
      retryable = response.status >= 500;
    }

    console.warn(`YouTube API test error (attempt ${attempt}/4):`, errText);
    if (!retryable || attempt === 4) {
      throw new Error(`Analytics API error: ${errText}`);
    }
    // Exponential backoff
    await new Promise((r) => setTimeout(r, attempt * 700));
  }

  throw new Error(`Analytics API error: ${lastErrText || 'Unknown error'}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const userId = user.id;
    const body = await req.json();
    const { mode, fromDate, toDate, metrics: customMetrics, dimensions: customDimensions } = body;

    // Default dates
    const today = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    let actualFromDate: string;
    let actualToDate: string;
    let metrics = customMetrics;
    let dimensions = customDimensions;

    // Set defaults based on mode
    if (mode === 'channel_monthly') {
      // Calculate last completed month (previous month) to avoid timezone issues
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth(); // 0-indexed (0 = January, 10 = November)
      
      let lastCompletedYear = currentYear;
      let lastCompletedMonth = currentMonth - 1;
      if (lastCompletedMonth < 0) {
        lastCompletedMonth = 11;
        lastCompletedYear -= 1;
      }
      
      // Get last day of previous month
      const lastDayOfPrevMonth = new Date(lastCompletedYear, lastCompletedMonth + 1, 0).getDate();
      const lastCompletedMonthEndStr = `${lastCompletedYear}-${String(lastCompletedMonth + 1).padStart(2, '0')}-${String(lastDayOfPrevMonth).padStart(2, '0')}`;
      
      console.log(`Today: ${today.toISOString().split('T')[0]}, Last completed month end: ${lastCompletedMonthEndStr}`);
      
      actualFromDate = fromDate || '2015-01-01';
      actualToDate = toDate || lastCompletedMonthEndStr;
      
      // Cap toDate at last completed month if user provided a future date
      if (toDate && toDate > lastCompletedMonthEndStr) {
        console.warn(`Requested toDate ${toDate} is beyond last completed month, capping at ${lastCompletedMonthEndStr}`);
        actualToDate = lastCompletedMonthEndStr;
      }

      metrics = metrics || 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments,subscribersGained,subscribersLost';
      dimensions = dimensions || 'month';
    } else if (mode === 'video_daily') {
      actualFromDate = fromDate || thirtyDaysAgo.toISOString().split('T')[0];
      actualToDate = toDate || today.toISOString().split('T')[0];
      metrics = metrics || 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments';
      dimensions = dimensions || 'video,day';
    } else {
      throw new Error('Invalid mode. Use "channel_monthly" or "video_daily"');
    }

    console.log(`Test mode: ${mode}, dates: ${actualFromDate} to ${actualToDate}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { token: accessToken, channelId } = await getValidToken(supabase, userId);
    
    const data = await queryYouTubeAnalytics(
      accessToken,
      channelId,
      actualFromDate,
      actualToDate,
      metrics,
      dimensions
    );

    const rowCount = data.rows?.length || 0;
    const firstRow = data.rows?.[0] || null;
    const lastRow = data.rows?.[rowCount - 1] || null;

    console.log(`Test successful: ${rowCount} rows returned`);

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        channelId,
        request: {
          startDate: actualFromDate,
          endDate: actualToDate,
          metrics,
          dimensions,
        },
        columnHeaders: data.columnHeaders,
        rowCount,
        firstRow,
        lastRow,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Test error:', error);
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
