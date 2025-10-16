import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LinkedInAnalytics {
  date: string;
  impressions: number;
  engagement: number;
  followers: number;
  reach: number;
}

interface YouTubeAnalytics {
  video_title: string;
  video_url: string;
  publish_date: string;
  views: number;
  watch_time_hours: number;
  impressions: number;
  ctr: number;
  engagement: number;
}

export const useAnalytics = (userId: string | undefined) => {
  const [linkedInData, setLinkedInData] = useState<LinkedInAnalytics[]>([]);
  const [youtubeData, setYouTubeData] = useState<YouTubeAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchAnalytics();
  }, [userId]);

  const fetchAnalytics = async () => {
    if (!userId) return;

    try {
      const [linkedIn, youtube] = await Promise.all([
        supabase
          .from("linkedin_analytics")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: true }),
        supabase
          .from("youtube_analytics")
          .select("*")
          .eq("user_id", userId)
          .order("views", { ascending: false }),
      ]);

      if (linkedIn.data) setLinkedInData(linkedIn.data);
      if (youtube.data) setYouTubeData(youtube.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const importLinkedIn = async (data: any[]) => {
    if (!userId) return;

    const records = data.map((row) => ({
      user_id: userId,
      date: row.date,
      impressions: row.impressions || 0,
      engagement: row.engagement || 0,
      followers: row.followers || 0,
      reach: row.reach || 0,
    }));

    const { error } = await supabase.from("linkedin_analytics").upsert(records);
    if (error) throw error;

    await fetchAnalytics();
  };

  const importYouTube = async (data: any[]) => {
    if (!userId) return;

    const records = data.map((row) => ({
      user_id: userId,
      video_title: row.title,
      video_url: row.url,
      publish_date: row.publishDate,
      views: row.views || 0,
      watch_time_hours: row.watchTimeHours || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      engagement: row.engagement || 0,
    }));

    const { error } = await supabase.from("youtube_analytics").insert(records);
    if (error) throw error;

    await fetchAnalytics();
  };

  return {
    linkedInData,
    youtubeData,
    loading,
    importLinkedIn,
    importYouTube,
    refetch: fetchAnalytics,
  };
};
