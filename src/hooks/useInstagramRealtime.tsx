import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface InstagramRealtimeMetrics {
  // Current counts
  followerCount: number;
  followingCount: number;
  mediaCount: number;

  // Today so far
  todayFollowerGrowth: number;
  todayEngagement: number;

  // Last 60 minutes
  last60MinFollowers: number;

  // Last 48 hours
  last48HrFollowers: number;
  last48HrEngagement: number;

  // Metadata
  lastCaptured: string | null;
}

export const useInstagramRealtime = (userId: string | undefined) => {
  const [metrics, setMetrics] = useState<InstagramRealtimeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchRealtimeData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch Instagram real-time snapshots
        const { data: snapshots, error: snapshotsError } = await supabase
          .from('instagram_account_intraday' as any)
          .select('*')
          .eq('user_id', userId)
          .order('captured_at', { ascending: false })
          .limit(1000); // Last ~20 hours at 30-min intervals

        if (snapshotsError) {
          // Ignore error if table doesn't exist yet
          if (snapshotsError.code === '42P01') {
            setMetrics(null);
            return;
          }
          throw snapshotsError;
        }

        if (snapshots && snapshots.length > 0) {
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const last60Min = new Date(now.getTime() - 60 * 60 * 1000);
          const last48Hr = new Date(now.getTime() - 48 * 60 * 60 * 1000);

          // Filter data for different time windows
          const todayData = snapshots.filter((d: any) => new Date(d.captured_at) >= todayStart);
          const last60MinData = snapshots.filter((d: any) => new Date(d.captured_at) >= last60Min);
          const last48HrData = snapshots.filter((d: any) => new Date(d.captured_at) >= last48Hr);

          // Latest snapshot
          const latest: any = snapshots[0];

          // Compute deltas
          const computeDelta = (data: any[], field: string) => {
            if (data.length === 0) return 0;
            const values = data.map((d: any) => d[field] || 0);
            return Math.max(...values) - Math.min(...values);
          };

          setMetrics({
            followerCount: latest.follower_count || 0,
            followingCount: latest.following_count || 0,
            mediaCount: latest.media_count || 0,
            todayFollowerGrowth: computeDelta(todayData, 'follower_count'),
            todayEngagement: 0, // Will be computed from media snapshots
            last60MinFollowers: computeDelta(last60MinData, 'follower_count'),
            last48HrFollowers: computeDelta(last48HrData, 'follower_count'),
            last48HrEngagement: 0, // Will be computed from media snapshots
            lastCaptured: latest.captured_at,
          });
        }

        // Fetch media snapshots for engagement metrics
        const { data: mediaSnapshots, error: mediaError } = await supabase
          .from('instagram_media_intraday' as any)
          .select('*')
          .eq('user_id', userId)
          .order('captured_at', { ascending: false })
          .limit(2000);

        if (mediaError) {
          // Ignore error if table doesn't exist yet
          if (mediaError.code !== '42P01') {
            throw mediaError;
          }
          return;
        }

        if (mediaSnapshots && mediaSnapshots.length > 0) {
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const last48Hr = new Date(now.getTime() - 48 * 60 * 60 * 1000);

          // Group by media_id
          const mediaGroups = mediaSnapshots.reduce((acc: any, snapshot: any) => {
            if (!acc[snapshot.media_id]) acc[snapshot.media_id] = [];
            acc[snapshot.media_id].push(snapshot);
            return acc;
          }, {} as Record<string, any[]>);

          let todayLikes = 0;
          let todayComments = 0;
          let last48HrLikes = 0;
          let last48HrComments = 0;

          Object.values(mediaGroups).forEach((mediaSnaps: any[]) => {
            const todayData = mediaSnaps.filter((d: any) => new Date(d.captured_at) >= todayStart);
            const last48HrData = mediaSnaps.filter((d: any) => new Date(d.captured_at) >= last48Hr);

            const computeDelta = (data: any[], field: string) => {
              if (data.length === 0) return 0;
              const values = data.map((d: any) => d[field] || 0);
              return Math.max(...values) - Math.min(...values);
            };

            todayLikes += computeDelta(todayData, 'like_count');
            todayComments += computeDelta(todayData, 'comment_count');
            last48HrLikes += computeDelta(last48HrData, 'like_count');
            last48HrComments += computeDelta(last48HrData, 'comment_count');
          });

          setMetrics(prev => ({
            ...prev!,
            todayEngagement: todayLikes + todayComments,
            last48HrEngagement: last48HrLikes + last48HrComments,
          }));
        }
      } catch (err: any) {
        console.error('Error fetching Instagram realtime data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRealtimeData();

    // Set up realtime subscription for new snapshots
    const channel = supabase
      .channel('instagram-realtime-snapshots')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'instagram_account_intraday',
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
          table: 'instagram_media_intraday',
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
  }, [userId, refetchTrigger]);

  return { metrics, loading, error, refetch };
};
