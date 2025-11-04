import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ExternalLink, AlertCircle } from 'lucide-react';

const OAuthRedirect = () => {
  const [error, setError] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState<string>('');

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const encodedUrl = params.get('u');
      
      if (!encodedUrl) {
        setError('Missing redirect URL parameter');
        return;
      }

      const decodedUrl = decodeURIComponent(encodedUrl);
      setTargetUrl(decodedUrl);

      // Validate the URL is a Google OAuth URL
      if (!decodedUrl.startsWith('https://accounts.google.com/')) {
        setError('Invalid OAuth URL');
        return;
      }

      // Redirect to Google OAuth
      window.location.replace(decodedUrl);
    } catch (err) {
      console.error('OAuth redirect error:', err);
      setError('Failed to process OAuth redirect');
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>OAuth Error</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.close()} 
              className="w-full"
            >
              Close Window
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Redirecting to Google
          </CardTitle>
          <CardDescription>
            You'll be redirected to Google in a moment to complete authentication...
          </CardDescription>
        </CardHeader>
        {targetUrl && (
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              If you're not redirected automatically:
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = targetUrl}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Continue to Google
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default OAuthRedirect;
