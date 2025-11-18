import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch last 14 days of YouTube data
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const dateStr = fourteenDaysAgo.toISOString().split('T')[0];

    // Fetch video performance data
    const { data: videoData } = await supabaseClient
      .from('yt_video_daily')
      .select('*')
      .eq('user_id', userId)
      .gte('day', dateStr)
      .order('views', { ascending: false })
      .limit(10);

    // Fetch channel data
    const { data: channelData } = await supabaseClient
      .from('yt_channel_daily')
      .select('*')
      .eq('user_id', userId)
      .gte('day', dateStr)
      .order('day', { ascending: false });

    // Fetch video metadata
    const { data: metadataData } = await supabaseClient
      .from('yt_video_metadata')
      .select('*')
      .eq('user_id', userId)
      .limit(20);

    const systemPrompt = `You are an expert YouTube analytics consultant. Analyze the provided data and generate actionable insights in JSON format.

Focus on:
1. Performance patterns (Shorts vs Long-form conversion)
2. Content analysis (top videos, hook retention)
3. Audience behavior
4. Revenue optimization opportunities
5. Quick wins with high ROI

Return ONLY valid JSON with this exact structure:
{
  "performanceOverview": {
    "shortsConversionRate": number,
    "audienceRetention": number,
    "ghostSubscriberRate": number,
    "revenueImpact": number
  },
  "topVideos": [
    {
      "videoId": "string",
      "title": "string",
      "hookRetention": number,
      "viralSearchTerms": ["string"],
      "missedOpportunities": ["string"]
    }
  ],
  "audienceIntel": {
    "demographics": {},
    "psychographics": ["string"],
    "peakHours": ["string"]
  },
  "quickWins": [
    {
      "title": "string",
      "impact": "string",
      "effort": "string",
      "implementation": "string"
    }
  ]
}`;

    const userPrompt = `Analyze this YouTube channel data from the last 14 days:

Video Performance:
${JSON.stringify(videoData, null, 2)}

Channel Metrics:
${JSON.stringify(channelData, null, 2)}

Video Metadata:
${JSON.stringify(metadataData, null, 2)}

Generate comprehensive insights with specific numbers and actionable recommendations.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const insightsText = data.choices?.[0]?.message?.content || "{}";
    
    // Parse JSON from response
    let insights;
    try {
      insights = JSON.parse(insightsText);
    } catch (e) {
      // If AI returned markdown with JSON, extract it
      const jsonMatch = insightsText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[1]);
      } else {
        insights = { error: "Failed to parse AI response" };
      }
    }

    // Store insights in database
    await supabaseClient
      .from('yt_processed_insights')
      .insert({
        user_id: userId,
        channel_id: channelData?.[0]?.channel_id || 'unknown',
        period_start: dateStr,
        period_end: new Date().toISOString().split('T')[0],
        insights_data: insights,
      });

    return new Response(
      JSON.stringify({ insights }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing insights:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
