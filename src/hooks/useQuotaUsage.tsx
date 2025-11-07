import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface QuotaUsage {
  unitsUsed: number;
  unitsAvailable: number;
  percentage: number;
  date: string;
}

export const useQuotaUsage = (userId: string | undefined) => {
  const [quota, setQuota] = useState<QuotaUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchQuota = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('yt_api_quota_usage')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching quota:', error);
          setLoading(false);
          return;
        }

        if (data) {
          setQuota({
            unitsUsed: data.units_used,
            unitsAvailable: data.units_available,
            percentage: (data.units_used / data.units_available) * 100,
            date: data.date,
          });
        } else {
          // No usage yet today
          setQuota({
            unitsUsed: 0,
            unitsAvailable: 10000,
            percentage: 0,
            date: today,
          });
        }
      } catch (error) {
        console.error('Error in useQuotaUsage:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuota();

    // Set up realtime subscription for quota updates
    const channel = supabase
      .channel('quota-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'yt_api_quota_usage',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchQuota();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { quota, loading };
};
