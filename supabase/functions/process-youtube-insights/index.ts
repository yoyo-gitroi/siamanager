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

    console.log('Fetching comprehensive YouTube data for user:', userId, 'since:', dateStr);

    // Fetch video performance (real-time intraday data)
    const { data: videoIntradayData } = await supabaseClient
      .from('yt_video_intraday')
      .select('*')
      .eq('user_id', userId)
      .gte('captured_at', dateStr)
      .order('view_count', { ascending: false })
      .limit(50);

    // Fetch channel performance (real-time)
    const { data: channelIntradayData } = await supabaseClient
      .from('yt_channel_intraday')
      .select('*')
      .eq('user_id', userId)
      .gte('captured_at', dateStr)
      .order('captured_at', { ascending: false });

    // Fetch channel daily data
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
      .limit(50);

    // Fetch traffic sources
    const { data: trafficData } = await supabaseClient
      .from('yt_traffic_sources')
      .select('*')
      .eq('user_id', userId)
      .gte('day', dateStr);

    // Fetch search terms
    const { data: searchTermsData } = await supabaseClient
      .from('yt_search_terms')
      .select('*')
      .eq('user_id', userId)
      .gte('day', dateStr)
      .order('views', { ascending: false })
      .limit(100);

    // Fetch revenue data
    const { data: revenueData } = await supabaseClient
      .from('yt_revenue_daily')
      .select('*')
      .eq('user_id', userId)
      .gte('day', dateStr)
      .order('day', { ascending: false });

    // Fetch demographics
    const { data: demographicsData } = await supabaseClient
      .from('yt_demographics')
      .select('*')
      .eq('user_id', userId)
      .gte('day', dateStr);

    // Fetch geography
    const { data: geographyData } = await supabaseClient
      .from('yt_geography')
      .select('*')
      .eq('user_id', userId)
      .gte('day', dateStr)
      .order('views', { ascending: false })
      .limit(20);

    // Fetch device stats
    const { data: deviceData } = await supabaseClient
      .from('yt_device_stats')
      .select('*')
      .eq('user_id', userId)
      .gte('day', dateStr);

    console.log('Data fetched:', {
      videoIntraday: videoIntradayData?.length || 0,
      channelIntraday: channelIntradayData?.length || 0,
      channelDaily: channelData?.length || 0,
      metadata: metadataData?.length || 0,
      traffic: trafficData?.length || 0,
      searchTerms: searchTermsData?.length || 0,
      revenue: revenueData?.length || 0,
      demographics: demographicsData?.length || 0,
      geography: geographyData?.length || 0,
      devices: deviceData?.length || 0
    });

    const systemPrompt = `You are an expert YouTube growth consultant specializing in Indian content creators. Analyze the data and return SPECIFIC, DATA-DRIVEN insights.

CRITICAL RULES:
1. Use ACTUAL numbers from the data provided - calculate metrics, don't estimate
2. For percentages, show the math: (X / Y) * 100
3. For revenue, use ₹ symbol and actual RPM from data
4. Identify Shorts vs Long-form patterns from traffic sources
5. Match video titles to search terms to find viral keywords
6. Calculate hook retention as % of viewers who stayed >30 seconds
7. Flag "algorithmic luck" videos where external trends caused spikes

Return insights as tool call with this structure - fill EVERY field with real data.`;

    const userPrompt = `Analyze this YouTube channel data (last 14 days) and generate comprehensive insights:

VIDEO INTRADAY PERFORMANCE (${videoIntradayData?.length || 0} videos):
${JSON.stringify(videoIntradayData?.slice(0, 10) || [], null, 2)}

CHANNEL PERFORMANCE:
${JSON.stringify(channelIntradayData?.[0] || {}, null, 2)}
${JSON.stringify(channelData?.[0] || {}, null, 2)}

VIDEO METADATA (${metadataData?.length || 0} videos):
${JSON.stringify(metadataData?.slice(0, 20) || [], null, 2)}

TRAFFIC SOURCES (${trafficData?.length || 0} records):
${JSON.stringify(trafficData?.slice(0, 30) || [], null, 2)}

SEARCH TERMS (Top 50):
${JSON.stringify(searchTermsData?.slice(0, 50) || [], null, 2)}

REVENUE DATA:
${JSON.stringify(revenueData || [], null, 2)}

DEMOGRAPHICS:
${JSON.stringify(demographicsData || [], null, 2)}

GEOGRAPHY (Top 10):
${JSON.stringify(geographyData?.slice(0, 10) || [], null, 2)}

DEVICE STATS:
${JSON.stringify(deviceData || [], null, 2)}

ANALYSIS INSTRUCTIONS:
1. Calculate Shorts conversion: Find traffic from "YT_SHORTS" source vs other sources
2. Identify top 3 videos by view_count, calculate their engagement (likes/views)
3. Match video titles to search_term data to find viral keywords
4. Calculate total revenue and RPM from revenue_daily table
5. Analyze demographics to understand age/gender split
6. Identify peak viewing hours from intraday captured_at timestamps
7. Calculate quick wins: revenue impact of improving conversion by 5%
8. Detect algorithmic spikes: videos where views jumped >200% in 1-2 days then dropped

Use REAL numbers. Show calculations. Be specific.`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "generate_youtube_insights",
              description: "Generate comprehensive YouTube channel insights with specific metrics",
              parameters: {
                type: "object",
                properties: {
                  shortsConversionAnalysis: {
                    type: "object",
                    properties: {
                      shortsOnlyViewers: { type: "number" },
                      crossFormatViewers: { type: "number" },
                      longFormOnlyViewers: { type: "number" },
                      conversionRate: { type: "number" },
                      avgWatchTime: { type: "string" },
                      swipeAwayRate: { type: "number" },
                      revenueImpact: {
                        type: "object",
                        properties: {
                          currentMonthly: { type: "number" },
                          potentialMonthly: { type: "number" },
                          monthlyGain: { type: "number" }
                        }
                      }
                    },
                    required: ["shortsOnlyViewers", "conversionRate"]
                  },
                  topVideos: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        videoId: { type: "string" },
                        title: { type: "string" },
                        views: { type: "number" },
                        hookRetention: { type: "number" },
                        viralSearchTerms: { type: "array", items: { type: "string" } },
                        trafficSource: { type: "string" },
                        trafficPercent: { type: "number" },
                        likeRatio: { type: "number" },
                        missedOpportunities: { type: "array", items: { type: "string" } }
                      },
                      required: ["videoId", "title", "views"]
                    }
                  },
                  audienceDNA: {
                    type: "object",
                    properties: {
                      demographics: {
                        type: "object",
                        properties: {
                          topAgeGroup: { type: "string" },
                          genderSplit: { 
                            type: "object",
                            properties: {
                              male: { type: "number" },
                              female: { type: "number" }
                            }
                          },
                          topCountries: { type: "array", items: { type: "string" } }
                        }
                      },
                      psychographics: { type: "array", items: { type: "string" } },
                      peakHours: { type: "array", items: { type: "string" } },
                      contentPreferences: { type: "array", items: { type: "string" } }
                    }
                  },
                  competitivePosition: {
                    type: "object",
                    properties: {
                      estimatedRank: { type: "string" },
                      regularViewerRate: { type: "number" },
                      comparisonPoints: { type: "array", items: { type: "string" } }
                    }
                  },
                  revenueOptimization: {
                    type: "object",
                    properties: {
                      currentRPM: { type: "number" },
                      dailyRevenue: { type: "number" },
                      quickWins: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            currentState: { type: "string" },
                            proposedFix: { type: "string" },
                            impactAmount: { type: "number" },
                            impactPercent: { type: "number" },
                            effort: { type: "string" },
                            timeToImplement: { type: "string" }
                          },
                          required: ["title", "proposedFix", "impactAmount"]
                        }
                      }
                    }
                  },
                  trendDetection: {
                    type: "object",
                    properties: {
                      algorithmicLuck: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            videoTitle: { type: "string" },
                            spikeDate: { type: "string" },
                            externalTrend: { type: "string" },
                            realEngagement: { type: "number" },
                            verdict: { type: "string" }
                          }
                        }
                      },
                      genuineWinners: { type: "array", items: { type: "string" } }
                    }
                  }
                },
                required: ["topVideos", "audienceDNA", "revenueOptimization"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_youtube_insights" } }
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
    console.log('LLM response received:', { status: response.status });
    
    // Extract insights from tool call
    let insights;
    const toolCalls = data.choices?.[0]?.message?.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      const functionArgs = toolCalls[0].function.arguments;
      insights = typeof functionArgs === 'string' ? JSON.parse(functionArgs) : functionArgs;
      console.log('Insights extracted from tool call');
    } else {
      // Fallback to content parsing
      const insightsText = data.choices?.[0]?.message?.content || "{}";
      try {
        insights = JSON.parse(insightsText);
      } catch (e) {
        const jsonMatch = insightsText.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          insights = JSON.parse(jsonMatch[1]);
        } else {
          insights = { error: "Failed to parse AI response", raw: insightsText };
        }
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
