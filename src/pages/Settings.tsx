import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle, Upload, FileText, AlertTriangle, Youtube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const { user } = useAuth();
  
  // YouTube Setup states
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('authorized');
    if (authSuccess === 'true') {
      setIsAuthorized(true);
      toast.success('YouTube account connected successfully!');
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    const storedAuth = localStorage.getItem('youtube_authorized');
    if (storedAuth === 'true') {
      setIsAuthorized(true);
    }
  }, []);

  const handleOAuthStart = async () => {
    setOauthLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in first');
        return;
      }

      const { data, error } = await supabase.functions.invoke('google-oauth-start', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;

      if (data?.authUrl) {
        const isLocalhost = window.location.hostname === 'localhost';
        if (isLocalhost) {
          window.location.href = data.authUrl;
        } else {
          window.open(data.authUrl, '_blank', 'width=600,height=700');
        }
      }
    } catch (error: any) {
      console.error('OAuth start error:', error);
      toast.error(error.message || 'Failed to start authorization');
    } finally {
      setOauthLoading(false);
    }
  };

  const handleBackfill = async () => {
    setIsBackfilling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in first');
        return;
      }

      const { error } = await supabase.functions.invoke('yt-backfill', {
        body: { fromDate: '2012-01-01' },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;
      toast.success('Backfill completed successfully');
    } catch (error: any) {
      console.error('Backfill error:', error);
      toast.error(error.message || 'Backfill failed');
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleDailySync = async () => {
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in first');
        return;
      }

      const { error } = await supabase.functions.invoke('yt-sync-daily', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;
      toast.success('Daily sync completed successfully');
    } catch (error: any) {
      console.error('Daily sync error:', error);
      toast.error(error.message || 'Daily sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl">
      <div>
        <h1 className="mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure agents, import data, and view system logs
        </p>
      </div>

      <Tabs defaultValue="youtube" className="space-y-6">
        <TabsList>
          <TabsTrigger value="youtube">YouTube Setup</TabsTrigger>
          <TabsTrigger value="data-import">Data Import</TabsTrigger>
          <TabsTrigger value="runs">Runs & Logs</TabsTrigger>
        </TabsList>


        <TabsContent value="youtube" className="space-y-6">
          <Card className="p-8 border-none shadow-sm">
            <div className="mb-6">
              <h2 className="mb-2 flex items-center gap-2">
                <Youtube className="h-6 w-6" />
                YouTube Analytics Setup
              </h2>
              <p className="text-sm text-muted-foreground">
                Connect your YouTube account to sync analytics data
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">1. Authorize YouTube Account</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect your Google account to access YouTube Analytics
                    </p>
                  </div>
                  <Button
                    onClick={handleOAuthStart}
                    disabled={oauthLoading || isAuthorized}
                    variant={isAuthorized ? "outline" : "default"}
                  >
                    {oauthLoading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Connecting...
                      </>
                    ) : isAuthorized ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Connected
                      </>
                    ) : (
                      'Connect YouTube'
                    )}
                  </Button>
                </div>

                {isAuthorized && (
                  <>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">2. Backfill Historical Data</h3>
                        <p className="text-sm text-muted-foreground">
                          Import analytics data from 2012 to present
                        </p>
                      </div>
                      <Button
                        onClick={handleBackfill}
                        disabled={isBackfilling}
                        variant="outline"
                      >
                        {isBackfilling ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Running...
                          </>
                        ) : (
                          'Run Backfill'
                        )}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">3. Manual Daily Sync</h3>
                        <p className="text-sm text-muted-foreground">
                          Sync yesterday's analytics data
                        </p>
                      </div>
                      <Button
                        onClick={handleDailySync}
                        disabled={isSyncing}
                        variant="outline"
                      >
                        {isSyncing ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Syncing...
                          </>
                        ) : (
                          'Sync Yesterday'
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">Next Steps</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  After completing the setup, you can configure automated daily syncs using cron jobs.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="data-import" className="space-y-6">
          <Card className="p-8 border-none shadow-sm">
            <div className="mb-6">
              <h2 className="mb-2">Data Import</h2>
              <p className="text-sm text-muted-foreground">
                Import YouTube and LinkedIn analytics data
              </p>
            </div>

            <div className="flex items-center justify-center py-16 text-center">
              <div className="space-y-4">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  Upload your CSV or XLSX files to import analytics data
                </p>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Files
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="runs" className="space-y-6">
          <Card className="p-8 border-none shadow-sm">
            <div className="mb-6">
              <h2 className="mb-2">Runs & Logs</h2>
              <p className="text-sm text-muted-foreground">
                View agent execution history and logs
              </p>
            </div>

            <div className="flex items-center justify-center py-16 text-center">
              <div className="space-y-4">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  Agent run history will be displayed here
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
