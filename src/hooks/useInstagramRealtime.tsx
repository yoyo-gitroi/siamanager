import { useState } from 'react';

interface InstagramRealtimeMetrics {
  followerCount: number;
  followingCount: number;
  mediaCount: number;
  todayFollowerGrowth: number;
  todayEngagement: number;
  last60MinFollowers: number;
  last48HrFollowers: number;
  last48HrEngagement: number;
  lastCaptured: string | null;
}

export const useInstagramRealtime = (_userId: string | undefined) => {
  // Temporarily disabled - Instagram tables not yet migrated
  const [metrics] = useState<InstagramRealtimeMetrics | null>(null);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const refetch = () => {
    // Temporarily disabled
  };

  return {
    metrics,
    loading,
    error,
    refetch,
  };
};
