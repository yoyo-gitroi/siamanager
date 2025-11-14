import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface OAuthResponse {
  authUrl: string;
  state: string;
}

export const useInstagramOAuth = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startOAuth = async () => {
    if (!user) {
      setError('You must be logged in to connect Instagram');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: functionError} = await supabase.functions.invoke<OAuthResponse>(
        'instagram-oauth-start'
      );

      if (functionError) throw functionError;

      if (!data?.authUrl) {
        throw new Error('No authorization URL received');
      }

      // Redirect to Instagram OAuth
      window.location.href = data.authUrl;

      return data;
    } catch (err: any) {
      console.error('Error starting Instagram OAuth:', err);
      setError(err.message || 'Failed to start OAuth flow');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleCallback = async (_code: string) => {
    if (!user) {
      setError('You must be logged in to complete Instagram connection');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      // The callback is handled by the edge function
      // We just need to wait for the connection to be created
      // The useInstagramConnection hook will pick it up via realtime

      return true;
    } catch (err: any) {
      console.error('Error handling OAuth callback:', err);
      setError(err.message || 'Failed to complete connection');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    startOAuth,
    handleCallback,
    loading,
    error,
  };
};
