import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle, Instagram, ExternalLink } from "lucide-react";
import { useInstagramConnection } from "@/hooks/useInstagramConnection";
import { useInstagramOAuth } from "@/hooks/useInstagramOAuth";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function InstagramSetup() {
  const [syncingDaily, setSyncingDaily] = useState(false);
  const [fetchingMedia, setFetchingMedia] = useState(false);
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const { connection, isConnected, loading: connectionLoading, disconnect } = useInstagramConnection();
  const { startOAuth, loading: oauthLoading } = useInstagramOAuth();

  // Check if we just returned from OAuth
  useEffect(() => {
    const isAuthorized = searchParams.get('authorized');

    if (isAuthorized === 'true') {
      toast({
        title: "Success!",
        description: "Instagram connected successfully",
      });

      // Clean up URL
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, toast]);

  const handleConnect = async () => {
    await startOAuth();
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast({
        title: "Disconnected",
        description: "Instagram account has been disconnected",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to disconnect";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleSyncDaily = async () => {
    setSyncingDaily(true);
    try {
      const { error } = await supabase.functions.invoke('instagram-sync-daily');

      if (error) throw error;

      toast({
        title: "Sync Complete",
        description: "Daily Instagram insights have been synced",
      });
    } catch (error) {
      console.error('Sync error:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to sync data";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSyncingDaily(false);
    }
  };

  const handleFetchMedia = async () => {
    setFetchingMedia(true);
    try {
      const { error } = await supabase.functions.invoke('instagram-fetch-media');

      if (error) throw error;

      toast({
        title: "Media Fetched",
        description: "Instagram media and insights have been fetched",
      });
    } catch (error) {
      console.error('Fetch media error:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch media";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setFetchingMedia(false);
    }
  };

  if (connectionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Instagram Integration</h1>
        <p className="text-muted-foreground">
          Connect your Instagram Business account to track analytics
        </p>
      </div>

      {/* Requirements Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            To connect Instagram, you need:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>An <strong>Instagram Business</strong> or <strong>Creator</strong> account</li>
            <li>Instagram account connected to a <strong>Facebook Page</strong></li>
            <li>Admin access to the Facebook Page</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-3">
            Personal Instagram accounts are not supported by the Instagram API.
          </p>
        </CardContent>
      </Card>

      {/* Connection Status */}
      {isConnected && connection ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Connected Account
            </CardTitle>
            <CardDescription>
              Your Instagram Business account is connected
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {connection.profile_picture_url && (
                <img
                  src={connection.profile_picture_url}
                  alt={connection.username}
                  className="w-16 h-16 rounded-full"
                />
              )}
              <div>
                <p className="font-semibold">@{connection.username}</p>
                <p className="text-sm text-muted-foreground">
                  {connection.account_type || 'BUSINESS'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Connected: {new Date(connection.connected_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {connection.last_synced_at && (
              <p className="text-sm text-muted-foreground">
                Last synced: {new Date(connection.last_synced_at).toLocaleString()}
              </p>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleSyncDaily}
                disabled={syncingDaily}
                variant="outline"
              >
                {syncingDaily ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  'Sync Daily Insights'
                )}
              </Button>

              <Button
                onClick={handleFetchMedia}
                disabled={fetchingMedia}
                variant="outline"
              >
                {fetchingMedia ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  'Fetch Media'
                )}
              </Button>

              <Button
                onClick={handleDisconnect}
                variant="destructive"
              >
                Disconnect
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Instagram className="h-5 w-5" />
              Connect Instagram
            </CardTitle>
            <CardDescription>
              Connect your Instagram Business account to start tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleConnect}
              disabled={oauthLoading}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {oauthLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Instagram className="mr-2 h-4 w-4" />
                  Connect Instagram
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What We Track</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Follower growth & engagement</li>
              <li>• Profile views & website clicks</li>
              <li>• Post/Reel/Story performance</li>
              <li>• Impressions & reach</li>
              <li>• Likes, comments, saves, shares</li>
              <li>• Real-time updates (every 30 mins)</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>1. Connect via Facebook/Instagram OAuth</li>
              <li>2. We fetch historical data (last 2 years)</li>
              <li>3. Daily sync runs automatically</li>
              <li>4. Real-time snapshots every 30 minutes</li>
              <li>5. View analytics in your dashboard</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Need Help */}
      <Alert className="mt-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Need Help?</AlertTitle>
        <AlertDescription>
          Having trouble connecting? Make sure your Instagram is set to Business/Creator mode and linked to a Facebook Page.{' '}
          <a
            href="https://developers.facebook.com/docs/instagram-api"
            target="_blank"
            rel="noopener noreferrer"
            className="underline inline-flex items-center gap-1"
          >
            Learn more
            <ExternalLink className="h-3 w-3" />
          </a>
        </AlertDescription>
      </Alert>
    </div>
  );
}
