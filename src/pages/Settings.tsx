import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, Upload, FileText, Youtube, Loader2, PlayCircle, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
}

interface SyncState {
  last_sync_date: string;
  last_sync_at: string;
  status: string;
  rows_inserted: number;
  rows_updated: number;
}

const Settings = () => {
  const { user } = useAuth();
  
  // YouTube Setup states
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [savedChannel, setSavedChannel] = useState<string>("");
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [dailySyncEnabled, setDailySyncEnabled] = useState(false);
  const [syncLogs, setSyncLogs] = useState<SyncState | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      if (!user) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check if user has a YouTube connection
      const { data: connection } = await supabase
        .from('youtube_connection')
        .select('channel_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (connection) {
        setIsAuthorized(true);
        if (connection.channel_id) {
          setSavedChannel(connection.channel_id);
          setSelectedChannel(connection.channel_id);
          
          // Load sync logs
          const { data: syncState } = await supabase
            .from('youtube_sync_state')
            .select('*')
            .eq('user_id', user.id)
            .eq('channel_id', connection.channel_id)
            .maybeSingle();
          
          if (syncState) {
            setSyncLogs(syncState);
          }
        }
      }
    };

    checkConnection();

    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('authorized');
    if (authSuccess === 'true') {
      setIsAuthorized(true);
      toast.success('YouTube account connected successfully!');
      window.history.replaceState({}, '', window.location.pathname);
      loadChannels();
    }
  }, [user]);

  const loadChannels = async () => {
    setChannelsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('yt-list-channels');

      if (error) throw error;

      if (data?.channels) {
        setChannels(data.channels);
      }
    } catch (error: any) {
      console.error('Failed to load channels:', error);
      toast.error(error.message || 'Failed to load channels');
    } finally {
      setChannelsLoading(false);
    }
  };

  const handleOAuthStart = async () => {
    setOauthLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in first');
        return;
      }

      const { data, error } = await supabase.functions.invoke('google-oauth-start');

      if (error) throw error;

      if (data?.url) {
        try {
          // Force top-level navigation to avoid X-Frame-Options/iframe blocking
          if (window.top) {
            (window.top as Window).location.href = data.url;
          } else {
            window.location.href = data.url;
          }
        } catch {
          // Fallback to opening a new tab
          window.open(data.url, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (error: any) {
      console.error('OAuth start error:', error);
      toast.error(error.message || 'Failed to start authorization');
    } finally {
      setOauthLoading(false);
    }
  };

  const handleSaveChannel = async () => {
    if (!selectedChannel) {
      toast.error('Please select a channel first');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.functions.invoke('yt-update-channel', {
        body: { channelId: selectedChannel }
      });

      if (error) throw error;

      setSavedChannel(selectedChannel);
      toast.success('Channel saved successfully');
    } catch (error: any) {
      console.error('Failed to save channel:', error);
      toast.error(error.message || 'Failed to save channel');
    }
  };

  const handleBackfill = async () => {
    if (!savedChannel) {
      toast.error('Please save a channel first');
      return;
    }

    setIsBackfilling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in first');
        return;
      }

      toast.info('Starting backfill... This may take several minutes.');

      const { data, error } = await supabase.functions.invoke('yt-backfill-v2', {
        body: { fromDate: '2006-01-01' }
      });

      if (error) throw error;

      if (data) {
        toast.success(`Backfill completed! Channel: ${data.channelRows} rows, Videos: ${data.videoRows} rows`);
        
        // Reload sync logs
        const { data: syncState } = await supabase
          .from('youtube_sync_state')
          .select('*')
          .eq('user_id', user?.id)
          .eq('channel_id', savedChannel)
          .maybeSingle();
        
        if (syncState) {
          setSyncLogs(syncState);
        }
      }
    } catch (error: any) {
      console.error('Backfill error:', error);
      toast.error(error.message || 'Backfill failed');
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleDailySync = async () => {
    if (!savedChannel) {
      toast.error('Please save a channel first');
      return;
    }

    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in first');
        return;
      }

      const { data, error } = await supabase.functions.invoke('yt-sync-daily-v2');

      if (error) throw error;

      if (data) {
        toast.success(`Daily sync completed! Channel: ${data.channelRows} rows, Videos: ${data.videoRows} rows`);
        
        // Reload sync logs
        const { data: syncState } = await supabase
          .from('youtube_sync_state')
          .select('*')
          .eq('user_id', user?.id)
          .eq('channel_id', savedChannel)
          .maybeSingle();
        
        if (syncState) {
          setSyncLogs(syncState);
        }
      }
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
                YouTube Analytics: OAuth, Channel Picker, Backfill + Daily Sync to SQL
              </h2>
              <p className="text-sm text-muted-foreground">
                Connect your YouTube account, select a channel, and sync analytics data
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                {/* Step 1: Connect Google */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Step 1: Connect Google (YouTube Analytics)</h3>
                    <p className="text-sm text-muted-foreground">
                      Authorize with Google to access YouTube Analytics API
                    </p>
                  </div>
                  <Button
                    onClick={handleOAuthStart}
                    disabled={oauthLoading || isAuthorized}
                    variant={isAuthorized ? "outline" : "default"}
                  >
                    {oauthLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : isAuthorized ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Connected
                      </>
                    ) : (
                      'Connect Google'
                    )}
                  </Button>
                </div>

                {/* Step 2: Pick Channel */}
                {isAuthorized && (
                  <>
                    <div className="p-4 border rounded-lg space-y-4">
                      <div>
                        <h3 className="font-medium mb-2">Step 2: Pick a Channel</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Select which YouTube channel to sync analytics for
                        </p>
                      </div>

                      {channels.length === 0 && !channelsLoading && (
                        <Button 
                          onClick={loadChannels}
                          variant="outline"
                          size="sm"
                        >
                          Load My Channels
                        </Button>
                      )}

                      {channelsLoading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading channels...
                        </div>
                      )}

                      {channels.length > 0 && (
                        <>
                          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a channel" />
                            </SelectTrigger>
                            <SelectContent>
                              {channels.map((channel) => (
                                <SelectItem key={channel.id} value={channel.id}>
                                  {channel.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {savedChannel && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span>Connected: {channels.find(c => c.id === savedChannel)?.title || savedChannel}</span>
                            </div>
                          )}

                          <Button
                            onClick={handleSaveChannel}
                            disabled={!selectedChannel || selectedChannel === savedChannel}
                            size="sm"
                          >
                            Save Channel
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Step 3: Backfill */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">Step 3: Run Full Backfill Now</h3>
                        <p className="text-sm text-muted-foreground">
                          Fetch all historical data from 2006 to present
                        </p>
                      </div>
                      <Button
                        onClick={handleBackfill}
                        disabled={isBackfilling || !savedChannel}
                        variant="outline"
                      >
                        {isBackfilling ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Running...
                          </>
                        ) : (
                          <>
                            <Database className="mr-2 h-4 w-4" />
                            Run Backfill
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Step 4: Daily Sync */}
                    <div className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Step 4: Enable Daily Sync</h3>
                          <p className="text-sm text-muted-foreground">
                            Automatically sync yesterday's data every day
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={dailySyncEnabled}
                            onCheckedChange={setDailySyncEnabled}
                            disabled={!savedChannel}
                          />
                          <Label className="text-sm">
                            {dailySyncEnabled ? 'Enabled' : 'Disabled'}
                          </Label>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <Button
                          onClick={handleDailySync}
                          disabled={isSyncing || !savedChannel}
                          variant="outline"
                          size="sm"
                        >
                          {isSyncing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <PlayCircle className="mr-2 h-4 w-4" />
                              Manual Sync Yesterday
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Sync Logs */}
                    {syncLogs && (
                      <div className="p-4 bg-muted rounded-lg space-y-2">
                        <h3 className="font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Sync Logs
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Last Sync:</span>
                            <p className="font-medium">{new Date(syncLogs.last_sync_at).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Date:</span>
                            <p className="font-medium">{syncLogs.last_sync_date}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Status:</span>
                            <p className="font-medium capitalize">{syncLogs.status}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Rows Inserted:</span>
                            <p className="font-medium">{syncLogs.rows_inserted}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">Next Steps</h3>
                <p className="text-sm text-muted-foreground">
                  After completing the setup above, consider setting up automated daily syncs using Supabase Edge Functions cron jobs. 
                  The sync will fetch yesterday's data automatically every morning.
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
