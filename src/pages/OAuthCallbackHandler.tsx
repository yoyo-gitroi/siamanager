import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function OAuthCallback() {
  useEffect(() => {
    // Get the authorization code from URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      console.error('OAuth error:', error);
      window.opener?.postMessage({ type: 'oauth-error', error }, '*');
      window.close();
      return;
    }

    if (code) {
      // Send code back to parent window
      window.opener?.postMessage({ type: 'oauth-callback', code }, '*');
      // Don't close immediately - parent will close after processing
    }
  }, []);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Completing authorization...</p>
      </div>
    </div>
  );
}