import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface InstagramDailyMetrics {
  day: string;
  followerCount: number;
  followingCount: number;
  mediaCount: number;
  impressions: number;
  reach: number;
  profileViews: number;
  websiteClicks: number;
  emailContacts: number;
  phoneCallClicks: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
}

interface InstagramMedia {
  id: string;
  media_id: string;
  media_type: string;
  media_url: string | null;
  thumbnail_url: string | null;
  permalink: string | null;
  caption: string | null;
  timestamp: string;
  likeCount: number;
  commentCount: number;
  saved: number;
  impressions: number;
  reach: number;
}

export const useInstagramData = (userId: string | undefined, days: number = 30) => {
  const [dailyMetrics, setDailyMetrics] = useState<InstagramDailyMetrics[]>([]);
  const [media, setMedia] = useState<InstagramMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Fetch daily account metrics
        const { data: dailyData, error: dailyError } = await supabase
          .from('instagram_account_daily')
          .select('*')
          .eq('user_id', userId)
          .gte('day', startDateStr)
          .lte('day', endDateStr)
          .order('day', { ascending: true });

        if (dailyError) throw dailyError;

        if (dailyData) {
          setDailyMetrics(
            dailyData.map(d => ({
              day: d.day,
              followerCount: d.follower_count || 0,
              followingCount: d.following_count || 0,
              mediaCount: d.media_count || 0,
              impressions: d.impressions || 0,
              reach: d.reach || 0,
              profileViews: d.profile_views || 0,
              websiteClicks: d.website_clicks || 0,
              emailContacts: d.email_contacts || 0,
              phoneCallClicks: d.phone_call_clicks || 0,
              likes: d.likes || 0,
              comments: d.comments || 0,
              saves: d.saves || 0,
              shares: d.shares || 0,
            }))
          );
        }

        // Fetch recent media
        const { data: mediaData, error: mediaError } = await supabase
          .from('instagram_media')
          .select(`
            *,
            instagram_media_daily (
              like_count,
              comment_count,
              saved,
              impressions,
              reach
            )
          `)
          .eq('user_id', userId)
          .order('timestamp', { ascending: false })
          .limit(50);

        if (mediaError) throw mediaError;

        if (mediaData) {
          setMedia(
            mediaData.map((m: any) => ({
              id: m.id,
              media_id: m.media_id,
              media_type: m.media_type,
              media_url: m.media_url,
              thumbnail_url: m.thumbnail_url,
              permalink: m.permalink,
              caption: m.caption,
              timestamp: m.timestamp,
              // Get latest metrics from daily insights
              likeCount: m.instagram_media_daily?.[0]?.like_count || 0,
              commentCount: m.instagram_media_daily?.[0]?.comment_count || 0,
              saved: m.instagram_media_daily?.[0]?.saved || 0,
              impressions: m.instagram_media_daily?.[0]?.impressions || 0,
              reach: m.instagram_media_daily?.[0]?.reach || 0,
            }))
          );
        }
      } catch (err: any) {
        console.error('Error fetching Instagram data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, days]);

  const syncDaily = async () => {
    if (!userId) return;

    try {
      const { error: syncError } = await supabase.functions.invoke('instagram-sync-daily');

      if (syncError) throw syncError;

      // Refetch data after sync
      // The useEffect will handle this automatically
    } catch (err: any) {
      console.error('Error syncing Instagram data:', err);
      throw err;
    }
  };

  const fetchMedia = async () => {
    if (!userId) return;

    try {
      const { error: fetchError } = await supabase.functions.invoke('instagram-fetch-media');

      if (fetchError) throw fetchError;

      // Refetch data after fetch
    } catch (err: any) {
      console.error('Error fetching Instagram media:', err);
      throw err;
    }
  };

  return {
    dailyMetrics,
    media,
    loading,
    error,
    syncDaily,
    fetchMedia,
  };
};
