import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, Upload, FileText, Youtube, Loader2, PlayCircle, Database, ExternalLink, Copy, LogOut } from "lucide-react";
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
  
  // Manual channel ID input states
  const [manualChannelId, setManualChannelId] = useState("");
  const [validatingChannel, setValidatingChannel] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showPopupHelper, setShowPopupHelper] = useState(false);
  const [oauthRedirectUrl, setOauthRedirectUrl] = useState('');

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

  // Listen for OAuth completion via localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'yt_oauth_success' && e.newValue === '1') {
        console.log('OAuth success detected, refreshing connection...');
        setIsAuthorized(true);
        loadChannels();
        localStorage.removeItem('yt_oauth_success');
        toast.success('Successfully connected to YouTube!');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check on mount in case the flag was set in the same window
    const checkOAuthSuccess = () => {
      const success = localStorage.getItem('yt_oauth_success');
      if (success === '1') {
        console.log('OAuth success flag found on mount');
        setIsAuthorized(true);
        loadChannels();
        localStorage.removeItem('yt_oauth_success');
        toast.success('Successfully connected to YouTube!');
      }
    };
    
    checkOAuthSuccess();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

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
        setOauthLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('google-oauth-start');

      if (error) throw error;

      if (data?.url) {
        // Use our intermediate redirect page to avoid iframe blocking
        const redirectUrl = `${window.location.origin}/oauth-redirect?u=${encodeURIComponent(data.url)}`;
        setOauthRedirectUrl(redirectUrl);
        
        // Open OAuth in popup window
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        const popup = window.open(
          redirectUrl,
          'google-oauth',
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no`
        );
        
        if (popup) {
          toast.info('Complete authentication in the popup window');
          setShowPopupHelper(false);
        } else {
          toast.error('Popup blocked. Please allow popups and try again.');
          setShowPopupHelper(true);
        }
      }
    } catch (error: any) {
      console.error('OAuth start error:', error);
      toast.error(error.message || 'Failed to start authorization');
    } finally {
      setOauthLoading(false);
    }
  };

  const handleSaveChannel = async (channelId?: string) => {
    const channelToSave = channelId || selectedChannel;
    if (!channelToSave) {
      toast.error('Please select a channel first');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.functions.invoke('yt-update-channel', {
        body: { channelId: channelToSave }
      });

      if (error) throw error;

      setSavedChannel(channelToSave);
      toast.success('Channel saved successfully');
    } catch (error: any) {
      console.error('Failed to save channel:', error);
      toast.error(error.message || 'Failed to save channel');
    }
  };

  const handleValidateAndAddChannel = async () => {
    if (!manualChannelId.trim()) {
      toast.error('Please enter a channel ID');
      return;
    }

    setValidatingChannel(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('yt-validate-channel', {
        body: { channelId: manualChannelId.trim() }
      });

      if (error) throw error;

      if (data?.hasAccess && data?.channel) {
        // Add to channels list if not already there
        const channelExists = channels.find(c => c.id === data.channel.id);
        if (!channelExists) {
          setChannels([...channels, data.channel]);
        }
        
        // Auto-select and save the validated channel
        setSelectedChannel(data.channel.id);
        await handleSaveChannel(data.channel.id);
        
        toast.success(`Channel "${data.channel.title}" validated and added!`);
        setManualChannelId("");
      }
    } catch (error: any) {
      console.error('Failed to validate channel:', error);
      toast.error(error.message || 'Failed to validate channel access');
    } finally {
      setValidatingChannel(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    
    if (!confirm('Are you sure you want to disconnect? This will remove your YouTube connection and you will need to reconnect.')) {
      return;
    }
    
    setIsDisconnecting(true);
    try {
      const { error } = await supabase
        .from('youtube_connection')
        .delete()
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Reset all state
      setIsAuthorized(false);
      setChannels([]);
      setSelectedChannel("");
      setSavedChannel("");
      setSyncLogs(null);
      setDailySyncEnabled(false);
      setManualChannelId("");
      
      toast.success('YouTube account disconnected successfully');
    } catch (error: any) {
      console.error('Failed to disconnect:', error);
      toast.error(error.message || 'Failed to disconnect');
    } finally {
      setIsDisconnecting(false);
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
        body: { fromDate: '2015-01-01' }  // YouTube Analytics data starts from 2015
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
                  {isAuthorized ? (
                    <div className="flex flex-col items-end gap-3">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Connected</span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleDisconnect}
                        disabled={isDisconnecting}
                      >
                        {isDisconnecting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Disconnecting...
                          </>
                        ) : (
                          'Disconnect & Use Different Account'
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <Button
                        onClick={handleOAuthStart}
                        disabled={oauthLoading}
                      >
                        {oauthLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          'Connect Google'
                        )}
                      </Button>
                      
                      {showPopupHelper && oauthRedirectUrl && (
                        <Card className="border-amber-500/50 bg-amber-500/5 p-4">
                          <p className="text-sm text-muted-foreground mb-3">
                            Popup blocked? Try these options:
                          </p>
                          <div className="flex flex-col gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(oauthRedirectUrl, '_blank')}
                              className="w-full"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open in New Tab
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(oauthRedirectUrl);
                                toast.success('Link copied to clipboard');
                              }}
                              className="w-full"
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy Link
                            </Button>
                          </div>
                        </Card>
                      )}
                    </div>
                  )}
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
                            onClick={() => handleSaveChannel()}
                            disabled={!selectedChannel || selectedChannel === savedChannel}
                            size="sm"
                          >
                            Save Channel
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Manual Channel ID Section */}
                    <div className="p-4 border rounded-lg space-y-4">
                      <div>
                        <h3 className="font-medium mb-2">Can't find your channel?</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          If you manage a channel but don't own it, enter the Channel ID manually
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="manual-channel-id" className="text-sm">
                            Channel ID
                          </Label>
                          <input
                            id="manual-channel-id"
                            type="text"
                            placeholder="UC..."
                            value={manualChannelId}
                            onChange={(e) => setManualChannelId(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={validatingChannel}
                          />
                          <p className="text-xs text-muted-foreground">
                            Find your Channel ID in YouTube Studio → Settings → Channel → Advanced settings
                          </p>
                        </div>

                        <Button
                          onClick={handleValidateAndAddChannel}
                          disabled={validatingChannel || !manualChannelId.trim()}
                          variant="outline"
                          size="sm"
                        >
                          {validatingChannel ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Validating Access...
                            </>
                          ) : (
                            'Add & Validate Channel'
                          )}
                        </Button>
                      </div>
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
