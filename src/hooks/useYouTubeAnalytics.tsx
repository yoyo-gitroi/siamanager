import { useMemo } from "react";
import { 
  ChannelDaily, 
  VideoDaily, 
  VideoMetadata, 
  Revenue,
  Demographics,
  Geography,
  TrafficSource,
  DeviceStats
} from "./useYouTubeData";

interface VideoPerformance {
  video_id: string;
  title: string;
  thumbnail_url: string;
  published_at: string;
  duration_seconds: number;
  tags: string[];
  totalViews: number;
  totalWatchTime: number;
  totalImpressions: number;
  totalLikes: number;
  totalComments: number;
  avgCTR: number;
  engagementRate: number;
}

interface AggregatedMetrics {
  totalViews: number;
  totalWatchHours: number;
  totalSubscribersGained: number;
  totalSubscribersLost: number;
  netSubscribers: number;
  totalRevenue: number;
  totalImpressions: number;
  avgCTR: number;
  totalEngagements: number;
  avgEngagementRate: number;
  totalVideos: number;
}

interface PeriodComparison {
  current: AggregatedMetrics;
  previous: AggregatedMetrics;
  growth: {
    views: number;
    watchHours: number;
    subscribers: number;
    revenue: number;
    ctr: number;
    engagement: number;
  };
}

export const useYouTubeAnalytics = (
  channelData: ChannelDaily[],
  videoData: VideoDaily[],
  videoMetadata: VideoMetadata[],
  revenueData: Revenue[],
  demographics: Demographics[],
  geography: Geography[],
  trafficSources: TrafficSource[],
  deviceStats: DeviceStats[]
) => {
  
  // Aggregate video performance
  const videoPerformance = useMemo((): VideoPerformance[] => {
    const videoMap = new Map<string, VideoPerformance>();

    videoMetadata.forEach((meta) => {
      videoMap.set(meta.video_id, {
        video_id: meta.video_id,
        title: meta.title,
        thumbnail_url: meta.thumbnail_url,
        published_at: meta.published_at,
        duration_seconds: meta.duration_seconds,
        tags: meta.tags || [],
        totalViews: 0,
        totalWatchTime: 0,
        totalImpressions: 0,
        totalLikes: 0,
        totalComments: 0,
        avgCTR: 0,
        engagementRate: 0,
      });
    });

    // Aggregate daily metrics
    const ctrSum = new Map<string, { sum: number; count: number }>();
    
    videoData.forEach((daily) => {
      const video = videoMap.get(daily.video_id);
      if (video) {
        video.totalViews += daily.views || 0;
        video.totalWatchTime += daily.watch_time_seconds || 0;
        video.totalImpressions += daily.impressions || 0;
        video.totalLikes += daily.likes || 0;
        video.totalComments += daily.comments || 0;

        if (daily.click_through_rate > 0) {
          const existing = ctrSum.get(daily.video_id) || { sum: 0, count: 0 };
          existing.sum += daily.click_through_rate;
          existing.count += 1;
          ctrSum.set(daily.video_id, existing);
        }
      }
    });

    // Calculate averages and engagement rates
    videoMap.forEach((video, videoId) => {
      const ctrData = ctrSum.get(videoId);
      video.avgCTR = ctrData ? ctrData.sum / ctrData.count : 0;
      video.engagementRate = video.totalViews > 0
        ? ((video.totalLikes + video.totalComments) / video.totalViews) * 100
        : 0;
    });

    return Array.from(videoMap.values())
      .filter((v) => v.totalViews > 0)
      .sort((a, b) => b.totalViews - a.totalViews);
  }, [videoData, videoMetadata]);

  // Current period metrics
  const currentMetrics = useMemo((): AggregatedMetrics => {
    const totalViews = channelData.reduce((sum, d) => sum + (d.views || 0), 0);
    const totalWatchTime = channelData.reduce((sum, d) => sum + (d.watch_time_seconds || 0), 0);
    const totalSubscribersGained = channelData.reduce((sum, d) => sum + (d.subscribers_gained || 0), 0);
    const totalSubscribersLost = channelData.reduce((sum, d) => sum + (d.subscribers_lost || 0), 0);
    const totalRevenue = revenueData.reduce((sum, d) => sum + (d.estimated_revenue || 0), 0);
    
    const totalImpressions = videoData.reduce((sum, d) => sum + (d.impressions || 0), 0);
    const totalLikes = videoData.reduce((sum, d) => sum + (d.likes || 0), 0);
    const totalComments = videoData.reduce((sum, d) => sum + (d.comments || 0), 0);
    
    const videosWithCTR = videoData.filter(d => d.click_through_rate > 0);
    const avgCTR = videosWithCTR.length > 0
      ? videosWithCTR.reduce((sum, d) => sum + d.click_through_rate, 0) / videosWithCTR.length
      : 0;

    const totalEngagements = totalLikes + totalComments;
    const avgEngagementRate = totalViews > 0 ? (totalEngagements / totalViews) * 100 : 0;

    return {
      totalViews,
      totalWatchHours: totalWatchTime / 3600,
      totalSubscribersGained,
      totalSubscribersLost,
      netSubscribers: totalSubscribersGained - totalSubscribersLost,
      totalRevenue,
      totalImpressions,
      avgCTR,
      totalEngagements,
      avgEngagementRate,
      totalVideos: videoMetadata.length,
    };
  }, [channelData, videoData, videoMetadata, revenueData]);

  // Period comparison (current vs previous)
  const periodComparison = useMemo((): PeriodComparison => {
    const midpoint = Math.floor(channelData.length / 2);
    const currentPeriod = channelData.slice(0, midpoint);
    const previousPeriod = channelData.slice(midpoint);

    const calcMetrics = (period: ChannelDaily[]): Partial<AggregatedMetrics> => ({
      totalViews: period.reduce((sum, d) => sum + (d.views || 0), 0),
      totalWatchHours: period.reduce((sum, d) => sum + (d.watch_time_seconds || 0), 0) / 3600,
      netSubscribers: period.reduce((sum, d) => sum + (d.subscribers_gained || 0) - (d.subscribers_lost || 0), 0),
      totalRevenue: period.reduce((sum, d) => sum + (d.estimated_revenue || 0), 0),
    });

    const current = calcMetrics(currentPeriod);
    const previous = calcMetrics(previousPeriod);

    const calcGrowth = (curr: number, prev: number) => 
      prev > 0 ? ((curr - prev) / prev) * 100 : 0;

    return {
      current: current as AggregatedMetrics,
      previous: previous as AggregatedMetrics,
      growth: {
        views: calcGrowth(current.totalViews || 0, previous.totalViews || 0),
        watchHours: calcGrowth(current.totalWatchHours || 0, previous.totalWatchHours || 0),
        subscribers: calcGrowth(current.netSubscribers || 0, previous.netSubscribers || 0),
        revenue: calcGrowth(current.totalRevenue || 0, previous.totalRevenue || 0),
        ctr: 0,
        engagement: 0,
      },
    };
  }, [channelData]);

  // Content insights
  const contentInsights = useMemo(() => {
    const videosByLength = {
      shorts: videoPerformance.filter(v => v.duration_seconds < 60),
      medium: videoPerformance.filter(v => v.duration_seconds >= 60 && v.duration_seconds <= 600),
      long: videoPerformance.filter(v => v.duration_seconds > 600),
    };

    const avgViews = (videos: VideoPerformance[]) => 
      videos.length > 0 ? videos.reduce((sum, v) => sum + v.totalViews, 0) / videos.length : 0;

    const avgEngagement = (videos: VideoPerformance[]) =>
      videos.length > 0 ? videos.reduce((sum, v) => sum + v.engagementRate, 0) / videos.length : 0;

    return {
      byLength: {
        shorts: { count: videosByLength.shorts.length, avgViews: avgViews(videosByLength.shorts), avgEngagement: avgEngagement(videosByLength.shorts) },
        medium: { count: videosByLength.medium.length, avgViews: avgViews(videosByLength.medium), avgEngagement: avgEngagement(videosByLength.medium) },
        long: { count: videosByLength.long.length, avgViews: avgViews(videosByLength.long), avgEngagement: avgEngagement(videosByLength.long) },
      },
      topTags: extractTopTags(videoPerformance, 10),
      bestPerformingLength: getBestPerformingLength(videosByLength),
    };
  }, [videoPerformance]);

  // Audience insights
  const audienceInsights = useMemo(() => {
    const topCountries = geography
      .reduce((acc, geo) => {
        const existing = acc.find(c => c.country === geo.country);
        if (existing) {
          existing.views += geo.views;
          existing.watch_time += geo.watch_time_seconds;
        } else {
          acc.push({
            country: geo.country,
            views: geo.views,
            watch_time: geo.watch_time_seconds,
          });
        }
        return acc;
      }, [] as Array<{ country: string; views: number; watch_time: number }>)
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    const trafficBySource = trafficSources
      .reduce((acc, source) => {
        const existing = acc.find(s => s.type === source.source_type);
        if (existing) {
          existing.views += source.views;
          existing.watch_time += source.watch_time_seconds;
        } else {
          acc.push({
            type: source.source_type,
            views: source.views,
            watch_time: source.watch_time_seconds,
          });
        }
        return acc;
      }, [] as Array<{ type: string; views: number; watch_time: number }>)
      .sort((a, b) => b.views - a.views);

    const deviceBreakdown = deviceStats
      .reduce((acc, device) => {
        const existing = acc.find(d => d.type === device.device_type);
        if (existing) {
          existing.views += device.views;
          existing.watch_time += device.watch_time_seconds;
        } else {
          acc.push({
            type: device.device_type,
            views: device.views,
            watch_time: device.watch_time_seconds,
          });
        }
        return acc;
      }, [] as Array<{ type: string; views: number; watch_time: number }>)
      .sort((a, b) => b.views - a.views);

    return {
      topCountries,
      trafficBySource,
      deviceBreakdown,
      demographics,
    };
  }, [geography, trafficSources, deviceStats, demographics]);

  return {
    videoPerformance,
    currentMetrics,
    periodComparison,
    contentInsights,
    audienceInsights,
  };
};

// Helper functions
function extractTopTags(videos: VideoPerformance[], limit: number) {
  const tagMap = new Map<string, { count: number; totalViews: number }>();
  
  videos.forEach((video) => {
    video.tags.forEach((tag) => {
      const existing = tagMap.get(tag) || { count: 0, totalViews: 0 };
      existing.count += 1;
      existing.totalViews += video.totalViews;
      tagMap.set(tag, existing);
    });
  });

  return Array.from(tagMap.entries())
    .map(([tag, data]) => ({ tag, ...data, avgViews: data.totalViews / data.count }))
    .sort((a, b) => b.avgViews - a.avgViews)
    .slice(0, limit);
}

function getBestPerformingLength(videosByLength: Record<string, VideoPerformance[]>) {
  const avgViews = {
    shorts: videosByLength.shorts.length > 0 
      ? videosByLength.shorts.reduce((sum, v) => sum + v.totalViews, 0) / videosByLength.shorts.length 
      : 0,
    medium: videosByLength.medium.length > 0
      ? videosByLength.medium.reduce((sum, v) => sum + v.totalViews, 0) / videosByLength.medium.length
      : 0,
    long: videosByLength.long.length > 0
      ? videosByLength.long.reduce((sum, v) => sum + v.totalViews, 0) / videosByLength.long.length
      : 0,
  };

  const max = Math.max(avgViews.shorts, avgViews.medium, avgViews.long);
  if (max === avgViews.shorts) return "shorts";
  if (max === avgViews.medium) return "medium";
  return "long";
}
