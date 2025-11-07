import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeMetrics {
  // Today so far (PT timezone)
  todayViews: number;
  todayLikes: number;
  todayComments: number;
  
  // Last 60 minutes
  last60MinViews: number;
  last60MinLikes: number;
  
  // Last 48 hours
  last48HrViews: number;
  last48HrLikes: number;
  
  // Live streaming
  currentLiveViewers: number | null;
  isLive: boolean;
  
  // Metadata
  lastCaptured: string | null;
  totalVideos: number;
}

interface VideoRealtimeMetrics extends RealtimeMetrics {
  videoId: string;
}

interface ChannelRealtimeMetrics {
  todayViews: number;
  todaySubscribers: number;
  last60MinViews: number;
  last48HrViews: number;
  lastCaptured: string | null;
}

export const useYouTubeRealtime = (userId: string | undefined, videoId?: string) => {
  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null);
  const [channelMetrics, setChannelMetrics] = useState<ChannelRealtimeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchRealtimeData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch channel-level realtime metrics
        const { data: channelData, error: channelError } = await supabase
          .from('yt_channel_intraday')
          .select('*')
          .eq('user_id', userId)
          .order('captured_at', { ascending: false })
          .limit(1000); // Last ~3.5 days at 5-min intervals

        if (channelError) throw channelError;

        if (channelData && channelData.length > 0) {
          const now = new Date();
          const ptNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
          const ptTodayStart = new Date(ptNow.getFullYear(), ptNow.getMonth(), ptNow.getDate());
          const last60Min = new Date(now.getTime() - 60 * 60 * 1000);
          const last48Hr = new Date(now.getTime() - 48 * 60 * 60 * 1000);

          // Filter data for different time windows
          const todayData = channelData.filter(d => {
            const capturedPT = new Date(new Date(d.captured_at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
            return capturedPT >= ptTodayStart;
          });

          const last60MinData = channelData.filter(d => new Date(d.captured_at) >= last60Min);
          const last48HrData = channelData.filter(d => new Date(d.captured_at) >= last48Hr);

          // Compute deltas (max - min for cumulative counters)
          const computeDelta = (data: any[], field: string) => {
            if (data.length === 0) return 0;
            const values = data.map(d => d[field] || 0);
            return Math.max(...values) - Math.min(...values);
          };

          setChannelMetrics({
            todayViews: computeDelta(todayData, 'view_count'),
            todaySubscribers: computeDelta(todayData, 'subscriber_count'),
            last60MinViews: computeDelta(last60MinData, 'view_count'),
            last48HrViews: computeDelta(last48HrData, 'view_count'),
            lastCaptured: channelData[0].captured_at,
          });
        }

        // If videoId is provided, fetch video-specific metrics
        if (videoId) {
          const { data: videoData, error: videoError } = await supabase
            .from('yt_video_intraday')
            .select('*')
            .eq('user_id', userId)
            .eq('video_id', videoId)
            .order('captured_at', { ascending: false })
            .limit(1000);

          if (videoError) throw videoError;

          if (videoData && videoData.length > 0) {
            const now = new Date();
            const ptNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
            const ptTodayStart = new Date(ptNow.getFullYear(), ptNow.getMonth(), ptNow.getDate());
            const last60Min = new Date(now.getTime() - 60 * 60 * 1000);
            const last48Hr = new Date(now.getTime() - 48 * 60 * 60 * 1000);

            const todayData = videoData.filter(d => {
              const capturedPT = new Date(new Date(d.captured_at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
              return capturedPT >= ptTodayStart;
            });

            const last60MinData = videoData.filter(d => new Date(d.captured_at) >= last60Min);
            const last48HrData = videoData.filter(d => new Date(d.captured_at) >= last48Hr);

            const computeDelta = (data: any[], field: string) => {
              if (data.length === 0) return 0;
              const values = data.map(d => d[field] || 0);
              return Math.max(...values) - Math.min(...values);
            };

            const latestSnapshot = videoData[0];

            setMetrics({
              todayViews: computeDelta(todayData, 'view_count'),
              todayLikes: computeDelta(todayData, 'like_count'),
              todayComments: computeDelta(todayData, 'comment_count'),
              last60MinViews: computeDelta(last60MinData, 'view_count'),
              last60MinLikes: computeDelta(last60MinData, 'like_count'),
              last48HrViews: computeDelta(last48HrData, 'view_count'),
              last48HrLikes: computeDelta(last48HrData, 'like_count'),
              currentLiveViewers: latestSnapshot.concurrent_viewers,
              isLive: latestSnapshot.is_live || false,
              lastCaptured: latestSnapshot.captured_at,
              totalVideos: 1,
            });
          }
        } else {
          // Aggregate metrics across all videos
          const { data: allVideos, error: allVideosError } = await supabase
            .from('yt_video_intraday')
            .select('*')
            .eq('user_id', userId)
            .order('captured_at', { ascending: false })
            .limit(5000); // More data for aggregation

          if (allVideosError) throw allVideosError;

          if (allVideos && allVideos.length > 0) {
            const now = new Date();
            const ptNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
            const ptTodayStart = new Date(ptNow.getFullYear(), ptNow.getMonth(), ptNow.getDate());
            const last60Min = new Date(now.getTime() - 60 * 60 * 1000);
            const last48Hr = new Date(now.getTime() - 48 * 60 * 60 * 1000);

            // Group by video_id
            const videoGroups = allVideos.reduce((acc, snapshot) => {
              if (!acc[snapshot.video_id]) acc[snapshot.video_id] = [];
              acc[snapshot.video_id].push(snapshot);
              return acc;
            }, {} as Record<string, any[]>);

            let totalTodayViews = 0;
            let totalTodayLikes = 0;
            let totalTodayComments = 0;
            let total60MinViews = 0;
            let total60MinLikes = 0;
            let total48HrViews = 0;
            let total48HrLikes = 0;
            let liveViewers: number | null = null;
            let hasLive = false;

            Object.values(videoGroups).forEach(videoSnapshots => {
              const todayData = videoSnapshots.filter(d => {
                const capturedPT = new Date(new Date(d.captured_at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
                return capturedPT >= ptTodayStart;
              });

              const last60MinData = videoSnapshots.filter(d => new Date(d.captured_at) >= last60Min);
              const last48HrData = videoSnapshots.filter(d => new Date(d.captured_at) >= last48Hr);

              const computeDelta = (data: any[], field: string) => {
                if (data.length === 0) return 0;
                const values = data.map(d => d[field] || 0);
                return Math.max(...values) - Math.min(...values);
              };

              totalTodayViews += computeDelta(todayData, 'view_count');
              totalTodayLikes += computeDelta(todayData, 'like_count');
              totalTodayComments += computeDelta(todayData, 'comment_count');
              total60MinViews += computeDelta(last60MinData, 'view_count');
              total60MinLikes += computeDelta(last60MinData, 'like_count');
              total48HrViews += computeDelta(last48HrData, 'view_count');
              total48HrLikes += computeDelta(last48HrData, 'like_count');

              const latest = videoSnapshots[0];
              if (latest.is_live && latest.concurrent_viewers) {
                hasLive = true;
                liveViewers = (liveViewers || 0) + latest.concurrent_viewers;
              }
            });

            setMetrics({
              todayViews: totalTodayViews,
              todayLikes: totalTodayLikes,
              todayComments: totalTodayComments,
              last60MinViews: total60MinViews,
              last60MinLikes: total60MinLikes,
              last48HrViews: total48HrViews,
              last48HrLikes: total48HrLikes,
              currentLiveViewers: liveViewers,
              isLive: hasLive,
              lastCaptured: allVideos[0].captured_at,
              totalVideos: Object.keys(videoGroups).length,
            });
          }
        }
      } catch (err: any) {
        console.error('Error fetching realtime data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRealtimeData();

    // Set up realtime subscription for new snapshots
    const channel = supabase
      .channel('realtime-snapshots')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'yt_video_intraday',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchRealtimeData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'yt_channel_intraday',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchRealtimeData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, videoId]);

  return { metrics, channelMetrics, loading, error };
};
