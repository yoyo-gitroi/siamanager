import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface InstagramAnalytics {
  date: string;
  posts_count: number;
  likes: number;
  comments: number;
  views_impressions: number;
  engagement: number;
  followers: number;
}

export const useInstagramAnalytics = (userId: string | undefined) => {
  const [data, setData] = useState<InstagramAnalytics[]>([]);
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
      const { data: instagramData } = await supabase
        .from("instagram_analytics")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: true });

      if (instagramData) {
        setData(instagramData);
      }
    } catch (error) {
      console.error("Error fetching Instagram analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const importData = async (rows: any[]) => {
    if (!userId) return;

    const records = rows.map((row) => ({
      user_id: userId,
      date: row.date,
      posts_count: row.posts_count || 0,
      likes: row.likes || 0,
      comments: row.comments || 0,
      views_impressions: row.views_impressions || 0,
      engagement: row.engagement || 0,
      followers: row.followers || 0,
    }));

    const { error } = await supabase.from("instagram_analytics").upsert(records);
    if (error) throw error;

    await fetchAnalytics();
  };

  return {
    data,
    loading,
    importData,
    refetch: fetchAnalytics,
  };
};
