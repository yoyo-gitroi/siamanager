// supabase/functions/yt-sync-daily-v2/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import { getValidToken } from "../_shared/youtube-auth.ts";
import { queryYouTubeAnalytics, getDaysAgo } from "../_shared/youtube-api.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized: missing JWT" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      console.error("Authentication failed:", authError);
      return new Response(JSON.stringify({ error: `Unauthorized: ${authError?.message || "invalid JWT"}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userId = user.id;

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const { token: accessToken, channelId } = await getValidToken(supabase, userId);

    // Sync data from 3 days ago (accounts for YouTube Analytics API 2-3 day delay)
    const dateStr = getDaysAgo(3);

    // --------------------------
    // Channel-level (time-based)
    // --------------------------
    const channelMetrics = "views,estimatedMinutesWatched,subscribersGained,subscribersLost";
    const channelDims = "day";

    const channelRequest = {
      channelId,
      startDate: dateStr,
      endDate: dateStr,
      metrics: channelMetrics,
      dimensions: channelDims,
    };

    const channelData = await queryYouTubeAnalytics(
      channelId,
      dateStr,
      dateStr,
      channelMetrics,
      accessToken,
      channelDims
    );

    await supabase.from("youtube_raw_archive").insert({
      user_id: userId,
      channel_id: channelId,
      report_type: "daily_channel",
      request_json: channelRequest,
      response_json: channelData,
    });

    let channelRows = 0;
    if (channelData.rows && channelData.rows.length > 0) {
      const columnMap = new Map(channelData.columnHeaders.map((h: any, i: number) => [h.name, i]));

      const rows = channelData.rows.map((row: any) => ({
        user_id: userId,
        channel_id: channelId,
        day: row[columnMap.get("day") as number],
        views: row[columnMap.get("views") as number] || 0,
        watch_time_seconds: (row[columnMap.get("estimatedMinutesWatched") as number] || 0) * 60,
        subscribers_gained: row[columnMap.get("subscribersGained") as number] || 0,
        subscribers_lost: row[columnMap.get("subscribersLost") as number] || 0,
      }));

      await supabase.from("yt_channel_daily").upsert(rows, { onConflict: "channel_id,day" });
      channelRows = rows.length;
    }

    // ------------------------------------
    // Video-level using "Top videos" report
    // dimensions=video, sorted by views, maxResults <= 200
    // ------------------------------------
    const videoMetricsBasic =
      "views,estimatedMinutesWatched,averageViewDuration,likes,comments,subscribersGained,subscribersLost";

    const videoRequest = {
      channelId,
      startDate: dateStr,
      endDate: dateStr,
      metrics: videoMetricsBasic,
      dimensions: "video",
      sort: "-views",
      maxResults: 200,
    };

    const videoData = await queryYouTubeAnalytics(
      channelId,
      dateStr,
      dateStr,
      videoMetricsBasic,
      accessToken,
      "video",
      undefined,
      "-views",
      200
    );

    await supabase.from("youtube_raw_archive").insert({
      user_id: userId,
      channel_id: channelId,
      report_type: "daily_video_top",
      request_json: videoRequest,
      response_json: videoData,
    });

    let videoRows = 0;
    if (videoData.rows && videoData.rows.length > 0) {
      const columnMap = new Map(videoData.columnHeaders.map((h: any, i: number) => [h.name, i]));

      const rows = videoData.rows.map((row: any) => {
        const videoId = row[columnMap.get("video") as number];

        return {
          user_id: userId,
          channel_id: channelId,
          video_id: videoId,
          day: dateStr, // attach the day because Top videos doesn't include a day column
          views: row[columnMap.get("views") as number] || 0,
          watch_time_seconds: (row[columnMap.get("estimatedMinutesWatched") as number] || 0) * 60,
          avg_view_duration_seconds: row[columnMap.get("averageViewDuration") as number] || 0,
          likes: row[columnMap.get("likes") as number] || 0,
          comments: row[columnMap.get("comments") as number] || 0,
          subscribers_gained: row[columnMap.get("subscribersGained") as number] || 0,
          subscribers_lost: row[columnMap.get("subscribersLost") as number] || 0,
        };
      });

      await supabase.from("yt_video_daily").upsert(rows, { onConflict: "channel_id,video_id,day" });
      videoRows = rows.length;
    }

    // Update sync state
    await supabase.from("youtube_sync_state").upsert(
      {
        user_id: userId,
        channel_id: channelId,
        last_sync_date: dateStr,
        last_sync_at: new Date().toISOString(),
        status: "completed",
        rows_inserted: channelRows + videoRows,
        last_error: null,
      },
      { onConflict: "user_id,channel_id" },
    );

    console.log(`Daily sync complete for ${dateStr}: ${channelRows} channel, ${videoRows} video rows`);

    return new Response(
      JSON.stringify({
        success: true,
        date: dateStr,
        channelRows,
        videoRows,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Daily sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    // Try to update sync state with error if we have user context
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
        const {
          data: { user },
        } = await supabaseAuth.auth.getUser(token);

        if (user) {
          const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          );

          await supabase.from("youtube_sync_state").upsert(
            {
              user_id: user.id,
              last_sync_at: new Date().toISOString(),
              status: "failed",
              last_error: message,
            },
            { onConflict: "user_id,channel_id", ignoreDuplicates: false },
          );
        }
      }
    } catch (stateError) {
      console.error("Failed to update sync state:", stateError);
    }

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
