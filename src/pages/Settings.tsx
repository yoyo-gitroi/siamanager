import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, Upload, FileText, Youtube, Loader2, PlayCircle, Database, ExternalLink, Copy, LogOut, Instagram, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
}

interface SyncState {
  last_sync_date: string | null;
  last_sync_at: string | null;
  status: string | null;
  rows_inserted: number | null;
  rows_updated: number | null;
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

  const handleTestAPI = async (mode: 'channel_monthly' | 'video_daily') => {
    if (!savedChannel) {
      toast.error('Please save a channel first');
      return;
    }

    const loadingToast = toast.loading(`Testing ${mode === 'channel_monthly' ? 'channel monthly' : 'video daily'} API...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('yt-analytics-test', {
        body: { mode }
      });

      toast.dismiss(loadingToast);

      if (error) throw error;

      if (data && data.success) {
        toast.success(`API test successful! Retrieved ${data.rowCount} rows from ${data.request.startDate} to ${data.request.endDate}`);
        console.log('Test results:', data);
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('API test error:', error);
      toast.error(error.message || 'API test failed');
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

      toast.info('Starting comprehensive backfill... This will fetch all data types. This may take 10-15 minutes.');

      // Try comprehensive backfill first
      try {
        const { data, error } = await supabase.functions.invoke('yt-backfill-comprehensive', {
          body: { fromDate: '2015-01-01' }
        });

        if (error) throw error;

        if (data) {
          const { summary, results } = data;
          
          // Build detailed message
          let message = `Comprehensive backfill completed!\n✅ ${summary.completed} of ${summary.total} data types succeeded\n`;
          
          if (results.completed?.length > 0) {
            message += `\nCompleted:\n`;
            results.completed.forEach((item: any) => {
              message += `  • ${item.function}\n`;
            });
          }
          
          if (results.failed?.length > 0) {
            message += `\n⚠️ Failed:\n`;
            results.failed.forEach((item: any) => {
              message += `  • ${item.function}: ${item.error}\n`;
            });
          }
          
          if (summary.failed === 0) {
            toast.success(message);
          } else {
            toast.warning(message);
          }
          
          // Reload sync logs
          const { data: syncState } = await supabase
            .from('youtube_sync_state')
            .select('*')
            .eq('user_id', user?.id || '')
            .eq('channel_id', savedChannel || '')
            .maybeSingle();
          
          if (syncState) {
            setSyncLogs(syncState);
          }
        }
      } catch (comprehensiveError: any) {
        // If comprehensive fails (CORS, timeout, etc.), fall back to sequential calls
        console.log('Comprehensive backfill failed, using fallback sequential approach:', comprehensiveError);
        toast.info('Using fallback mode: running each data type sequentially...');
        
        const functions = [
          { name: 'yt-backfill-v2', label: 'Channel & Video Daily Metrics' },
          { name: 'yt-fetch-revenue', label: 'Revenue Data' },
          { name: 'yt-fetch-demographics', label: 'Demographics' },
          { name: 'yt-fetch-geography', label: 'Geography' },
          { name: 'yt-fetch-traffic', label: 'Traffic Sources' },
          { name: 'yt-fetch-devices', label: 'Device Stats' },
          { name: 'yt-fetch-retention', label: 'Audience Retention' },
          { name: 'yt-fetch-playlists', label: 'Playlists' },
          { name: 'yt-fetch-search-terms', label: 'Search Terms' },
          { name: 'yt-fetch-video-metadata', label: 'Video Metadata' },
        ];

        const completed: string[] = [];
        const failed: Array<{ label: string; error: string }> = [];
        const skipped: string[] = [];

        for (const func of functions) {
          try {
            toast.loading(`Running ${func.label}...`);
            
            const { data, error } = await supabase.functions.invoke(func.name, {
              body: { fromDate: '2015-01-01' }
            });

            if (error) {
              // Check if it's a revenue authorization error
              if (func.name === 'yt-fetch-revenue' && error.message?.includes('401')) {
                skipped.push('Revenue Data (missing monetization OAuth scope)');
              } else {
                failed.push({ label: func.label, error: error.message });
              }
            } else {
              completed.push(func.label);
            }

            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (funcError: any) {
            const errorMsg = funcError.message || String(funcError);
            if (func.name === 'yt-fetch-revenue' && errorMsg.includes('401')) {
              skipped.push('Revenue Data (missing monetization OAuth scope)');
            } else {
              failed.push({ label: func.label, error: errorMsg });
            }
          }
        }

        toast.dismiss();
        
        // Build summary
        let message = `Backfill completed!\n✅ ${completed.length} succeeded`;
        if (skipped.length > 0) message += `\n⚠️ ${skipped.length} skipped`;
        if (failed.length > 0) message += `\n❌ ${failed.length} failed`;
        
        if (completed.length > 0) {
          message += `\n\nCompleted:\n${completed.map(l => `  • ${l}`).join('\n')}`;
        }
        
        if (skipped.length > 0) {
          message += `\n\nSkipped:\n${skipped.map(l => `  • ${l}`).join('\n')}`;
        }
        
        if (failed.length > 0) {
          message += `\n\nFailed:\n${failed.map(f => `  • ${f.label}: ${f.error}`).join('\n')}`;
        }
        
        if (failed.length === 0) {
          toast.success(message);
        } else {
          toast.warning(message);
        }
        
        // Reload sync logs
        const { data: syncState } = await supabase
          .from('youtube_sync_state')
          .select('*')
          .eq('user_id', user?.id || '')
          .eq('channel_id', savedChannel || '')
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
          .eq('user_id', user?.id || '')
          .eq('channel_id', savedChannel || '')
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
          <TabsTrigger value="instagram">Instagram Setup</TabsTrigger>
          <TabsTrigger value="data-import">Data Import</TabsTrigger>
          <TabsTrigger value="runs">Runs & Logs</TabsTrigger>
          <TabsTrigger value="api-config">API Configuration</TabsTrigger>
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

                    {/* Step 3: Test API & Backfill */}
                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg space-y-4">
                        <div>
                          <h3 className="font-medium">Step 3a: Test API Connection (Optional)</h3>
                          <p className="text-sm text-muted-foreground">
                            Verify your YouTube Analytics access before running a full backfill
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleTestAPI('channel_monthly')}
                            disabled={!savedChannel}
                            variant="outline"
                            size="sm"
                          >
                            Test Channel Lifetime (Monthly)
                          </Button>
                          <Button
                            onClick={() => handleTestAPI('video_daily')}
                            disabled={!savedChannel}
                            variant="outline"
                            size="sm"
                          >
                            Test Video Daily (Last 30 Days)
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">Step 3b: Run Comprehensive Backfill</h3>
                          <p className="text-sm text-muted-foreground">
                            Fetch ALL data types from 2015 to present: channel daily, video daily, demographics, geography, traffic sources, devices, audience retention, revenue, playlists, search terms, and video metadata
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            ⏱️ This will take 10-15 minutes. Results will show which data types succeeded/failed.
                          </p>
                          <p className="text-xs text-yellow-600 mt-2">
                            💡 Revenue tracking requires monetization access. If skipped, disconnect and reconnect your account to enable it.
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
                              Backfilling...
                            </>
                          ) : (
                            'Run Backfill'
                          )}
                        </Button>
                      </div>
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
                            <p className="font-medium">{syncLogs.last_sync_at ? new Date(syncLogs.last_sync_at).toLocaleString() : 'Never'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Date:</span>
                            <p className="font-medium">{syncLogs.last_sync_date || 'N/A'}</p>
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

        <TabsContent value="instagram" className="space-y-6">
          <Card className="p-8 border-none shadow-sm">
            <div className="mb-6">
              <h2 className="mb-2 flex items-center gap-2">
                <Instagram className="h-6 w-6" />
                Instagram Integration
              </h2>
              <p className="text-sm text-muted-foreground">
                Connect your Instagram Business account to track analytics
              </p>
            </div>

            {/* Requirements Alert */}
            <div className="mb-6 p-4 border border-amber-500/20 bg-amber-500/10 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-5 w-5" />
                Requirements
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>An <strong>Instagram Business</strong> or <strong>Creator</strong> account</li>
                <li>Instagram account connected to a <strong>Facebook Page</strong></li>
                <li>Admin access to the Facebook Page</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-3">
                Personal Instagram accounts are not supported by the Instagram API.
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Instagram integration is currently in setup. Please visit the{" "}
                <a href="/analytics" className="text-primary underline">
                  Analytics Dashboard
                </a>{" "}
                to see your Instagram data once connected.
              </p>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Instagram className="h-4 w-4 mr-2" />
                  Learn More
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://developers.facebook.com/docs/instagram-api" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    API Documentation
                  </a>
                </Button>
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

        <TabsContent value="api-config" className="space-y-6">
          <Card className="p-8 border-none shadow-sm">
            <div className="mb-6">
              <h2 className="mb-2">API Configuration</h2>
              <p className="text-sm text-muted-foreground">
                Use these credentials to configure external integrations like the YouTube Studio browser extension
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 border rounded-lg space-y-3">
                <div>
                  <Label className="text-sm font-medium">Supabase URL</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono break-all">
                      {import.meta.env.VITE_SUPABASE_URL}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(import.meta.env.VITE_SUPABASE_URL);
                        toast.success('Supabase URL copied to clipboard');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">User ID</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono break-all">
                      {user?.id || 'Not logged in'}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!user?.id}
                      onClick={() => {
                        if (user?.id) {
                          navigator.clipboard.writeText(user.id);
                          toast.success('User ID copied to clipboard');
                        }
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">API Key (Optional)</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono break-all">
                      {import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
                        toast.success('API Key copied to clipboard');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg border">
                <h3 className="font-medium mb-2 text-sm">YouTube Studio Extension Setup</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Install the YouTube Studio browser extension</li>
                  <li>Open the extension popup and click "Settings"</li>
                  <li>Copy and paste the values above into the corresponding fields</li>
                  <li>Click "Save Configuration"</li>
                </ol>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
