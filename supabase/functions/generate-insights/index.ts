import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { youtubeData, linkedInData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Prepare analytics summary for AI
    const ytTotal = youtubeData.reduce((sum: number, v: any) => sum + v.views, 0);
    const liTotal = linkedInData.reduce((sum: number, d: any) => sum + d.impressions, 0);
    const ytAvgCTR = youtubeData.reduce((sum: number, v: any) => sum + v.ctr, 0) / youtubeData.length;
    const liAvgER = linkedInData.reduce((sum: number, d: any) => {
      return sum + (d.impressions > 0 ? (d.engagement / d.impressions) * 100 : 0);
    }, 0) / linkedInData.length;

    const systemPrompt = `You are an expert social media analytics consultant specializing in cross-platform performance analysis. 
Analyze the correlation between YouTube and LinkedIn performance data and provide actionable insights.
Focus on:
1. Cross-platform content performance patterns
2. Audience behavior correlations
3. Optimal posting strategies
4. Growth opportunities

Keep insights concise, data-driven, and actionable. Use bullet points and clear recommendations.`;

    const userPrompt = `Analyze this social media data and provide 3-5 key insights about cross-platform correlation:

YouTube Performance:
- Total Views: ${ytTotal.toLocaleString()}
- Videos Analyzed: ${youtubeData.length}
- Average CTR: ${ytAvgCTR.toFixed(2)}%
- Top Video: ${youtubeData[0]?.video_title || 'N/A'} (${youtubeData[0]?.views?.toLocaleString() || 0} views)

LinkedIn Performance:
- Total Impressions: ${liTotal.toLocaleString()}
- Days Tracked: ${linkedInData.length}
- Average ER: ${liAvgER.toFixed(2)}%
- Peak Day: ${linkedInData.sort((a: any, b: any) => b.impressions - a.impressions)[0]?.date || 'N/A'}

Generate insights about:
1. Content themes that perform well across both platforms
2. Timing patterns for maximum reach
3. Cross-promotion opportunities
4. Audience engagement trends`;

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
        max_tokens: 1000,
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
    const insights = data.choices?.[0]?.message?.content || "No insights generated";

    return new Response(
      JSON.stringify({ insights }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating insights:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
