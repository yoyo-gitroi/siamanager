import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import { getValidToken } from "../_shared/youtube-auth.ts";
import { queryYouTubeAnalytics, queryYouTubeDataAPI } from "../_shared/youtube-api.ts";

// ------------ YouTube Data API helpers (to collect video IDs) ------------
async function getUploadsPlaylistId(accessToken: string, channelId: string): Promise<string> {
  const data = await queryYouTubeDataAPI(
    "channels",
    {
      part: "contentDetails",
      id: channelId,
    },
    accessToken
  );

  const uploads = data?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error("Could not find uploads playlist for channel.");
  return uploads;
}

async function listAllUploadVideoIds(accessToken: string, uploadsPlaylistId: string): Promise<string[]> {
  const ids: string[] = [];
  let pageToken = "";
  let safety = 0;

  while (safety++ < 1000) {
    const params: Record<string, string> = {
      part: "contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: "50",
    };
    if (pageToken) params.pageToken = pageToken;

    const data = await queryYouTubeDataAPI("playlistItems", params, accessToken);

    for (const item of data.items ?? []) {
      const vid = item?.contentDetails?.videoId;
      if (vid) ids.push(vid);
    }

    pageToken = data.nextPageToken || "";
    if (!pageToken) break;

    // small delay to be gentle on quota
    await new Promise((r) => setTimeout(r, 150));
  }
  return ids;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function queryWithFallback(
  channelId: string,
  startDate: string,
  endDate: string,
  metrics: string,
  accessToken: string,
  dimensions?: string,
  minimalMetrics?: string,
  filters?: string,
): Promise<{ data: any; wasFallback: boolean }> {
  try {
    const data = await queryYouTubeAnalytics(
      channelId,
      startDate,
      endDate,
      metrics,
      accessToken,
      dimensions,
      filters,
    );
    return { data, wasFallback: false };
  } catch (err: any) {
    const errMsg = err.message || "";
    if (minimalMetrics && (errMsg.includes('"code": 500') || errMsg.includes("internalError"))) {
      console.warn(`Chunk ${startDate}-${endDate} failed with 500, trying minimal metrics...`);
      const fallbackData = await queryYouTubeAnalytics(
        channelId,
        startDate,
        endDate,
        minimalMetrics,
        accessToken,
        dimensions,
        filters,
      );
      return { data: fallbackData, wasFallback: true };
    }
    throw err;
  }
}

function getMonthChunks(fromDate: string, toDate: string): Array<{ start: string; end: string }> {
  const chunks: Array<{ start: string; end: string }> = [];
  const start = new Date(fromDate);
  const end = new Date(toDate);
  let current = new Date(start);

  while (current <= end) {
    const chunkStart = new Date(current);
    const chunkEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    if (chunkEnd > end) {
      chunks.push({ start: chunkStart.toISOString().split("T")[0], end: end.toISOString().split("T")[0] });
      break;
    }
    chunks.push({ start: chunkStart.toISOString().split("T")[0], end: chunkEnd.toISOString().split("T")[0] });
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }
  return chunks;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const userId = user.id;
    const { fromDate, toDate } = await req.json();

    const minDate = "2015-01-01";
    const requestedFromDate = fromDate || minDate;
    const actualFromDate = requestedFromDate < minDate ? minDate : requestedFromDate;

    // Stop backfill 3 days before today to account for YouTube Analytics API delay
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() - 3);
    const maxDateStr = maxDate.toISOString().split("T")[0];
    const endDate = toDate ? (toDate > maxDateStr ? maxDateStr : toDate) : maxDateStr;

    console.log(`Starting backfill for user ${userId} from ${actualFromDate} to ${endDate}`);

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const { token: accessToken, channelId } = await getValidToken(supabase, userId);

    // =======================
    // 1) Channel-level data
    // =======================
    const channelMetrics = "views,estimatedMinutesWatched,subscribersGained,subscribersLost";
    const minimalMetrics = "views,estimatedMinutesWatched";
    const chunks = getMonthChunks(actualFromDate, endDate);

    let totalChannelRows = 0;
    let totalVideoRows = 0;
    const failedChunks: Array<{ type: string; start: string; end: string; error: string }> = [];
    const salvagedChunks: Array<{ type: string; start: string; end: string }> = [];

    console.log("Fetching channel-level daily data...");
    for (const chunk of chunks) {
      const requestData = {
        channelId,
        startDate: chunk.start,
        endDate: chunk.end,
        metrics: channelMetrics,
        dimensions: "day",
      };

      try {
        const { data, wasFallback } = await queryWithFallback(
          channelId,
          chunk.start,
          chunk.end,
          channelMetrics,
          accessToken,
          "day",
          minimalMetrics,
        );

        if (wasFallback) salvagedChunks.push({ type: "channel", start: chunk.start, end: chunk.end });

        await supabase.from("youtube_raw_archive").insert({
          user_id: userId,
          channel_id: channelId,
          report_type: "daily_channel",
          request_json: requestData,
          response_json: data,
        });

        if (data.rows?.length) {
          const map = new Map(data.columnHeaders.map((h: any, i: number) => [h.name, i]));
          const rows = data.rows.map((row: any) => ({
            user_id: userId,
            channel_id: channelId,
            day: row[map.get("day") as number],
            views: row[map.get("views") as number] || 0,
            watch_time_seconds: (row[map.get("estimatedMinutesWatched") as number] || 0) * 60,
            subscribers_gained: row[map.get("subscribersGained") as number] || 0,
            subscribers_lost: row[map.get("subscribersLost") as number] || 0,
          }));
          const { error } = await supabase.from("yt_channel_daily").upsert(rows, { onConflict: "channel_id,day" });
          if (error) console.error("Error upserting channel data:", error);
          else totalChannelRows += rows.length;
        }
      } catch (err: any) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("Channel chunk failed", { start: chunk.start, end: chunk.end }, errMsg);
        failedChunks.push({ type: "channel", start: chunk.start, end: chunk.end, error: errMsg });

        await supabase.from("youtube_raw_archive").insert({
          user_id: userId,
          channel_id: channelId,
          report_type: "daily_channel_error",
          request_json: requestData,
          response_json: { error: errMsg },
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // ======================================
    // 2) Video-level daily data
    // ======================================
    console.log("Collecting video IDs via Data API...");
    const uploadsPlaylistId = await getUploadsPlaylistId(accessToken, channelId);
    const allVideoIds = await listAllUploadVideoIds(accessToken, uploadsPlaylistId);
    console.log(`Found ${allVideoIds.length} uploaded videos`);

    const videoMetricsBasic = "views,estimatedMinutesWatched,averageViewDuration,likes,comments";
    const videoBatchSize = 50; // safe batch size for filters list
    const idBatches = chunkArray(allVideoIds, videoBatchSize);

    console.log("Fetching video-level daily data (batched by video IDs)...");
    for (const chunk of chunks) {
      for (const batch of idBatches) {
        const filters = `video==${batch.join(",")}`;
        const requestData = {
          channelId,
          startDate: chunk.start,
          endDate: chunk.end,
          metrics: videoMetricsBasic,
          dimensions: "day,video",
          filters,
        };

        try {
          const { data } = await queryWithFallback(
            channelId,
            chunk.start,
            chunk.end,
            videoMetricsBasic,
            accessToken,
            "day,video",
            minimalMetrics,
            filters,
          );

          await supabase.from("youtube_raw_archive").insert({
            user_id: userId,
            channel_id: channelId,
            report_type: "daily_video",
            request_json: requestData,
            response_json: data,
          });

          if (data.rows?.length) {
            const map = new Map(data.columnHeaders.map((h: any, i: number) => [h.name, i]));
            const rows = data.rows.map((row: any) => ({
              user_id: userId,
              channel_id: channelId,
              video_id: row[map.get("video") as number],
              day: row[map.get("day") as number],
              views: row[map.get("views") as number] || 0,
              watch_time_seconds: (row[map.get("estimatedMinutesWatched") as number] || 0) * 60,
              avg_view_duration_seconds: row[map.get("averageViewDuration") as number] || 0,
              likes: row[map.get("likes") as number] || 0,
              comments: row[map.get("comments") as number] || 0,
            }));

            const { error } = await supabase
              .from("yt_video_daily")
              .upsert(rows, { onConflict: "channel_id,video_id,day" });

            if (error) console.error("Error upserting video data:", error);
            else totalVideoRows += rows.length;
          }
        } catch (err: any) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error("Video chunk failed", { start: chunk.start, end: chunk.end }, errMsg);

          failedChunks.push({ type: "video", start: chunk.start, end: chunk.end, error: errMsg });

          await supabase.from("youtube_raw_archive").insert({
            user_id: userId,
            channel_id: channelId,
            report_type: "daily_video_error",
            request_json: requestData,
            response_json: { error: errMsg },
          });
        }

        // gentle pacing between batches
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    // Update sync state
    await supabase.from("youtube_sync_state").upsert(
      {
        user_id: userId,
        channel_id: channelId,
        last_sync_date: endDate,
        last_sync_at: new Date().toISOString(),
        status: "completed",
        rows_inserted: totalChannelRows + totalVideoRows,
        rows_updated: 0,
        last_error: null,
      },
      { onConflict: "user_id,channel_id" },
    );

    console.log(`Backfill complete: ${totalChannelRows} channel rows, ${totalVideoRows} video rows`);
    console.log(`Failed chunks: ${failedChunks.length}, Salvaged: ${salvagedChunks.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        channelRows: totalChannelRows,
        videoRows: totalVideoRows,
        failedChunks,
        salvagedChunks,
        message: `Backfill completed successfully`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("Backfill error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    // Try to update sync state with error
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
