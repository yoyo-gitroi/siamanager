import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Completing authorization...');

  useEffect(() => {
    const handleCallback = async () => {
      // Get the authorization code from URL
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');

      if (error) {
        console.error('OAuth error:', error);
        setStatus('error');
        setMessage(`Authorization failed: ${error}`);
        setTimeout(() => navigate('/youtube-setup'), 3000);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('No authorization code received');
        setTimeout(() => navigate('/youtube-setup'), 3000);
        return;
      }

      try {
        // Get state from URL
        const state = params.get('state');
        if (!state) {
          throw new Error('Missing state parameter');
        }

        // Exchange code for tokens with state verification
        const { data, error: callbackError } = await supabase.functions.invoke(
          'google-oauth-callback',
          { body: { code, state } }
        );

        if (callbackError) throw callbackError;

        if (data?.success) {
          // Set localStorage flag for cross-tab persistence
          localStorage.setItem('yt_oauth_success', '1');
          setStatus('success');
          setMessage('Authorization successful! Redirecting...');
          setTimeout(() => navigate('/youtube-setup?authorized=true'), 1500);
        } else {
          throw new Error('Failed to complete authorization');
        }
      } catch (err) {
        console.error('Callback error:', err);
        setStatus('error');
        const errorMessage = err instanceof Error ? err.message : 'Failed to complete authorization';
        setMessage(errorMessage);
        setTimeout(() => navigate('/youtube-setup'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center space-y-4">
        {status === 'processing' && (
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        )}
        {status === 'success' && (
          <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
        )}
        {status === 'error' && (
          <XCircle className="h-12 w-12 mx-auto text-destructive" />
        )}
        <p className="text-lg text-foreground">{message}</p>
      </div>
    </div>
  );
}