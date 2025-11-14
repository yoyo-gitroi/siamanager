import { useState } from 'react';

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

export const useInstagramData = (_userId: string | undefined, _days: number = 30) => {
  // Temporarily disabled - Instagram tables not yet migrated
  const [dailyMetrics] = useState<InstagramDailyMetrics[]>([]);
  const [media] = useState<InstagramMedia[]>([]);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const syncDaily = async () => {
    // Temporarily disabled
    return false;
  };

  const fetchMedia = async () => {
    // Temporarily disabled
    return false;
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
