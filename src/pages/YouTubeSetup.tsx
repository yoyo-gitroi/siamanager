import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function YouTubeSetup() {
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Check if we just returned from OAuth or localStorage flag
  useEffect(() => {
    const isAuthorized = searchParams.get('authorized');
    const localStorageFlag = localStorage.getItem('yt_oauth_success');
    
    if (isAuthorized === 'true' || localStorageFlag === '1') {
      setAuthorized(true);
      
      if (localStorageFlag === '1') {
        localStorage.removeItem('yt_oauth_success');
      }
      
      toast({
        title: "Success!",
        description: "YouTube Analytics connected successfully",
      });
      
      // Clean up URL
      if (isAuthorized === 'true') {
        setSearchParams({});
      }
    }
  }, [searchParams, setSearchParams, toast]);

  const handleOAuthStart = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-oauth-start');
      
      if (error) throw error;
      
      if (data?.url) {
        // Detect if we're in an iframe (preview mode)
        const inIframe = window.self !== window.top;
        
        if (inIframe) {
          // Open in new tab to bypass X-Frame-Options
          window.open(data.url, '_blank', 'noopener,noreferrer');
          setLoading(false);
          toast({
            title: "Authorization Opened",
            description: "Complete authorization in the new tab, then return here.",
          });
        } else {
          // Full-page redirect
          window.location.href = data.url;
        }
      }
    } catch (error) {
      console.error('OAuth error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start OAuth flow",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleBackfill = async () => {
    setBackfilling(true);
    try {
      const { data, error } = await supabase.functions.invoke('yt-backfill', {
        body: { fromDate: '2012-01-01' }
      });

      if (error) throw error;

      toast({
        title: "Backfill Complete",
        description: `Synced ${data.totalChannelRows} channel days and ${data.totalVideoRows} video days`,
      });
    } catch (error) {
      console.error('Backfill error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to backfill data",
        variant: "destructive",
      });
    } finally {
      setBackfilling(false);
    }
  };

  const handleDailySync = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('yt-sync-daily');

      if (error) throw error;

      toast({
        title: "Sync Complete",
        description: `Synced ${data.channelRows} channel metrics and ${data.videoRows} video metrics`,
      });
    } catch (error) {
      console.error('Daily sync error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to sync data",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">YouTube Analytics Setup</h1>
        <p className="text-muted-foreground">
          Connect your YouTube account to start syncing analytics data
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Step 1: Authorize YouTube Access</h2>
          <p className="text-sm text-muted-foreground">
            Grant access to your YouTube Analytics data. This is a one-time setup.
          </p>
          <Button
            onClick={handleOAuthStart}
            disabled={loading || authorized}
            size="lg"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {authorized ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Connected
              </>
            ) : (
              'Connect YouTube'
            )}
          </Button>
        </div>

        {authorized && (
          <>
            <div className="border-t pt-6 space-y-4">
              <h2 className="text-xl font-semibold">Step 2: Backfill Historical Data</h2>
              <p className="text-sm text-muted-foreground">
                Import all historical analytics data from your channel. This may take several minutes.
              </p>
              <Button
                onClick={handleBackfill}
                disabled={backfilling}
                size="lg"
                variant="secondary"
              >
                {backfilling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run Backfill
              </Button>
            </div>

            <div className="border-t pt-6 space-y-4">
              <h2 className="text-xl font-semibold">Step 3: Test Daily Sync</h2>
              <p className="text-sm text-muted-foreground">
                Manually trigger a sync to import yesterday's data. Daily syncs will run automatically via cron.
              </p>
              <Button
                onClick={handleDailySync}
                size="lg"
                variant="outline"
              >
                Sync Yesterday's Data
              </Button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                    Next Steps
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    After completing the backfill, set up a daily cron job in Supabase to call the
                    <code className="mx-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded">
                      yt-sync-daily
                    </code>
                    function every morning. Recommended time: 06:30 IST (30 1 * * * UTC).
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}