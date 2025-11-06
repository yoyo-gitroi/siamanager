import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

export interface ChannelDaily {
  day: string;
  views: number;
  watch_time_seconds: number;
  subscribers_gained: number;
  subscribers_lost: number;
  estimated_revenue: number;
}

export interface VideoDaily {
  channel_id: string;
  video_id: string;
  day: string;
  views: number;
  watch_time_seconds: number;
  avg_view_duration_seconds: number;
  impressions: number;
  click_through_rate: number;
  likes: number;
  comments: number;
}

export interface VideoMetadata {
  video_id: string;
  title: string;
  description: string;
  published_at: string;
  duration_seconds: number;
  thumbnail_url: string;
  tags: string[];
}

export interface Revenue {
  day: string;
  estimated_revenue: number;
  ad_impressions: number;
  cpm: number;
  playback_based_cpm: number;
}

export interface Demographics {
  day: string;
  age_group: string;
  gender: string;
  viewer_percentage: number;
}

export interface Geography {
  day: string;
  country: string;
  province: string;
  views: number;
  watch_time_seconds: number;
}

export interface TrafficSource {
  day: string;
  source_type: string;
  source_detail: string;
  views: number;
  watch_time_seconds: number;
}

export interface DeviceStats {
  day: string;
  device_type: string;
  operating_system: string;
  views: number;
  watch_time_seconds: number;
}

export const useYouTubeData = (userId: string | undefined, daysBack: number = 30) => {
  const [channelData, setChannelData] = useState<ChannelDaily[]>([]);
  const [videoData, setVideoData] = useState<VideoDaily[]>([]);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata[]>([]);
  const [revenueData, setRevenueData] = useState<Revenue[]>([]);
  const [demographics, setDemographics] = useState<Demographics[]>([]);
  const [geography, setGeography] = useState<Geography[]>([]);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [deviceStats, setDeviceStats] = useState<DeviceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, daysBack]);

  const fetchAllData = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const startDate = subDays(new Date(), daysBack).toISOString().split('T')[0];

      // Fetch channel daily data
      const { data: channelRows, error: channelError } = await supabase
        .from("yt_channel_daily")
        .select("*")
        .eq("user_id", userId)
        .gte("day", startDate)
        .order("day", { ascending: false });

      if (channelError) throw channelError;
      const mappedChannelData = (channelRows || []).map(row => ({
        day: row.day,
        views: row.views || 0,
        watch_time_seconds: row.watch_time_seconds || 0,
        subscribers_gained: row.subscribers_gained || 0,
        subscribers_lost: row.subscribers_lost || 0,
        estimated_revenue: row.estimated_revenue || 0,
      }));
      setChannelData(mappedChannelData);

      // Fetch video daily data
      const { data: videoRows, error: videoError } = await supabase
        .from("yt_video_daily")
        .select("*")
        .eq("user_id", userId)
        .gte("day", startDate)
        .order("day", { ascending: false });

      if (videoError) throw videoError;
      const mappedVideoData = (videoRows || []).map(row => ({
        channel_id: row.channel_id,
        video_id: row.video_id,
        day: row.day,
        views: row.views || 0,
        watch_time_seconds: row.watch_time_seconds || 0,
        avg_view_duration_seconds: row.avg_view_duration_seconds || 0,
        impressions: row.impressions || 0,
        click_through_rate: row.click_through_rate || 0,
        likes: row.likes || 0,
        comments: row.comments || 0,
      }));
      setVideoData(mappedVideoData);

      // Fetch video metadata
      const { data: metadataRows, error: metadataError } = await supabase
        .from("yt_video_metadata")
        .select("*")
        .eq("user_id", userId)
        .order("published_at", { ascending: false });

      if (metadataError) throw metadataError;
      const mappedMetadata = (metadataRows || []).map(row => ({
        video_id: row.video_id,
        title: row.title || '',
        description: row.description || '',
        published_at: row.published_at || '',
        duration_seconds: row.duration_seconds || 0,
        thumbnail_url: row.thumbnail_url || '',
        tags: row.tags || [],
      }));
      setVideoMetadata(mappedMetadata);

      // Fetch revenue data
      const { data: revenueRows, error: revenueError } = await supabase
        .from("yt_revenue_daily")
        .select("*")
        .eq("user_id", userId)
        .gte("day", startDate)
        .order("day", { ascending: false });

      if (revenueError) throw revenueError;
      const mappedRevenue = (revenueRows || []).map(row => ({
        day: row.day,
        estimated_revenue: row.estimated_revenue || 0,
        ad_impressions: row.ad_impressions || 0,
        cpm: row.cpm || 0,
        playback_based_cpm: row.playback_based_cpm || 0,
      }));
      setRevenueData(mappedRevenue);

      // Fetch demographics (quarterly data - always get recent data regardless of filter)
      const { data: demoRows, error: demoError } = await supabase
        .from("yt_demographics")
        .select("*")
        .eq("user_id", userId)
        .order("day", { ascending: false })
        .limit(500);

      if (demoError) throw demoError;
      const mappedDemo = (demoRows || []).map(row => ({
        day: row.day,
        age_group: row.age_group || '',
        gender: row.gender || '',
        viewer_percentage: row.viewer_percentage || 0,
      }));
      setDemographics(mappedDemo);

      // Fetch geography (quarterly data - always get recent data)
      const { data: geoRows, error: geoError } = await supabase
        .from("yt_geography")
        .select("*")
        .eq("user_id", userId)
        .order("day", { ascending: false })
        .limit(200);

      if (geoError) throw geoError;
      const mappedGeo = (geoRows || []).map(row => ({
        day: row.day,
        country: row.country || '',
        province: row.province || '',
        views: row.views || 0,
        watch_time_seconds: row.watch_time_seconds || 0,
      }));
      setGeography(mappedGeo);

      // Fetch traffic sources (quarterly data - always get recent data)
      const { data: trafficRows, error: trafficError } = await supabase
        .from("yt_traffic_sources")
        .select("*")
        .eq("user_id", userId)
        .order("day", { ascending: false })
        .limit(200);

      if (trafficError) throw trafficError;
      const mappedTraffic = (trafficRows || []).map(row => ({
        day: row.day,
        source_type: row.source_type || '',
        source_detail: row.source_detail || '',
        views: row.views || 0,
        watch_time_seconds: row.watch_time_seconds || 0,
      }));
      setTrafficSources(mappedTraffic);

      // Fetch device stats (quarterly data - always get recent data)
      const { data: deviceRows, error: deviceError } = await supabase
        .from("yt_device_stats")
        .select("*")
        .eq("user_id", userId)
        .order("day", { ascending: false })
        .limit(200);

      if (deviceError) throw deviceError;
      const mappedDevices = (deviceRows || []).map(row => ({
        day: row.day,
        device_type: row.device_type || '',
        operating_system: row.operating_system || '',
        views: row.views || 0,
        watch_time_seconds: row.watch_time_seconds || 0,
      }));
      setDeviceStats(mappedDevices);

    } catch (err: any) {
      console.error("Error fetching YouTube data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    channelData,
    videoData,
    videoMetadata,
    revenueData,
    demographics,
    geography,
    trafficSources,
    deviceStats,
    loading,
    error,
    refetch: fetchAllData,
  };
};
