import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@supabase/auth-helpers-react';

interface InstagramConnection {
  id: string;
  instagram_user_id: string;
  username: string;
  account_type: string | null;
  profile_picture_url: string | null;
  connected_at: string;
  last_synced_at: string | null;
  token_expiry: string | null;
}

export const useInstagramConnection = () => {
  const session = useSession();
  const [connection, setConnection] = useState<InstagramConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    const fetchConnection = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('instagram_connection')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        setConnection(data);
      } catch (err: any) {
        console.error('Error fetching Instagram connection:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConnection();

    // Set up realtime subscription for connection changes
    const channel = supabase
      .channel('instagram-connection-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'instagram_connection',
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          fetchConnection();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const disconnect = async () => {
    if (!session?.user?.id) return;

    try {
      const { error: deleteError } = await supabase
        .from('instagram_connection')
        .delete()
        .eq('user_id', session.user.id);

      if (deleteError) throw deleteError;

      setConnection(null);
    } catch (err: any) {
      console.error('Error disconnecting Instagram:', err);
      setError(err.message);
      throw err;
    }
  };

  const isTokenExpiringSoon = () => {
    if (!connection?.token_expiry) return false;
    const expiry = new Date(connection.token_expiry);
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return expiry <= sevenDaysFromNow;
  };

  return {
    connection,
    isConnected: !!connection,
    loading,
    error,
    disconnect,
    isTokenExpiringSoon: isTokenExpiringSoon(),
  };
};
