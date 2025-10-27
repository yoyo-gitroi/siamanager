import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useExcelData } from "./useExcelData";

interface LinkedInAnalytics {
  date: string;
  impressions: number;
  engagement: number;
  followers?: number;
  reach?: number;
}

interface YouTubeAnalytics {
  video_title: string;
  video_url?: string;
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
  
  // Load Excel data as fallback
  const { linkedInData: excelLinkedIn, youtubeData: excelYoutube, loading: excelLoading } = useExcelData();

  useEffect(() => {
    if (!userId) {
      // If no user, use Excel data
      if (!excelLoading) {
        setLinkedInData(excelLinkedIn);
        setYouTubeData(excelYoutube);
        setLoading(false);
      }
      return;
    }

    fetchAnalytics();
  }, [userId, excelLoading, excelLinkedIn, excelYoutube]);

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

      // Use DB data if available, otherwise fall back to Excel data
      if (linkedIn.data && linkedIn.data.length > 0) {
        setLinkedInData(linkedIn.data);
      } else {
        setLinkedInData(excelLinkedIn);
      }

      if (youtube.data && youtube.data.length > 0) {
        // Map DB records to include calculated engagement
        const mappedYoutube = youtube.data.map(v => ({
          ...v,
          engagement: v.engagement || Math.round(v.views * 0.05)
        }));
        setYouTubeData(mappedYoutube);
      } else {
        setYouTubeData(excelYoutube);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      // Fall back to Excel data on error
      setLinkedInData(excelLinkedIn);
      setYouTubeData(excelYoutube);
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
