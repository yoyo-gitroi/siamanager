import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAgents } from "@/hooks/useAgents";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle, Upload, FileText, AlertTriangle, Youtube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { validateWebhookUrl } from "@/utils/webhookValidation";

const Settings = () => {
  const { user } = useAuth();
  const { agents, updateAgent, loading } = useAgents();
  const [testingAgent, setTestingAgent] = useState<string | null>(null);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [prefillLoading, setPrefillLoading] = useState<string | null>(null);
  
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

  const handleTestConnection = async (agent: any) => {
    const urlToTest = (editingAgent === agent.id && webhookUrl) ? webhookUrl : agent.webhook_url;
    if (!urlToTest) {
      toast.error("No webhook URL configured");
      return;
    }

    setTestingAgent(agent.id);

    try {
      const response = await fetch(urlToTest, {
        method: agent.webhook_method || "POST",
        headers: { "Content-Type": "application/json", ...agent.webhook_headers },
        body: JSON.stringify({
          test: true,
          source: "settings_test",
          agent_id: agent.id,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        toast.success("Connection successful");
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      toast.error("Connection failed");
    } finally {
      setTestingAgent(null);
    }
  };

  const handleSaveWebhook = async (agentId: string) => {
    if (!webhookUrl) {
      toast.error("Please enter a webhook URL");
      return;
    }

    // Validate webhook URL to prevent SSRF attacks
    const validation = validateWebhookUrl(webhookUrl);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid webhook URL");
      return;
    }

    // Save per-user webhook override in agent_webhooks
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) {
      toast.error("Not authenticated");
      return;
    }

    // Try update existing; if none, insert
    const { data: updated, error: updErr } = await supabase
      .from("agent_webhooks")
      .update({ webhook_url: webhookUrl })
      .eq("user_id", uid)
      .eq("agent_id", agentId)
      .select();

    if (updErr) {
      toast.error("Failed to save webhook");
      return;
    }

    if (!updated || updated.length === 0) {
      const { error: insErr } = await supabase.from("agent_webhooks").insert({
        user_id: uid,
        agent_id: agentId,
        webhook_url: webhookUrl,
      });
      if (insErr) {
        toast.error("Failed to save webhook");
        return;
      }
    }

    toast.success("Webhook saved");
    setEditingAgent(null);
    setWebhookUrl("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl">
      <div>
        <h1 className="mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure agents, import data, and view system logs
        </p>
      </div>

      <Tabs defaultValue="agents" className="space-y-6">
        <TabsList>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="youtube">YouTube Setup</TabsTrigger>
          <TabsTrigger value="data-import">Data Import</TabsTrigger>
          <TabsTrigger value="runs">Runs & Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-6">
          <Card className="p-8 border-none shadow-sm">
            <div className="mb-6">
              <h2 className="mb-2">Agent Configuration</h2>
              <p className="text-sm text-muted-foreground">
                Configure webhook URLs and settings for each agent
              </p>
            </div>

            {agents.length > 0 ? (
              <div className="space-y-4">
                {agents.map((agent) => (
                  <Card key={agent.id} className="p-6 border">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{agent.name}</p>
                          <p className="text-sm text-muted-foreground">{agent.pillar}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            setEditingAgent(agent.id);
                            setWebhookUrl("");
                            setPrefillLoading(agent.id);
                            const { data: userRes } = await supabase.auth.getUser();
                            const uid = userRes.user?.id;
                            if (uid) {
                              const { data: existing } = await supabase
                                .from("agent_webhooks")
                                .select("webhook_url")
                                .eq("user_id", uid)
                                .eq("agent_id", agent.id)
                                .maybeSingle();
                              if (existing?.webhook_url) setWebhookUrl(existing.webhook_url);
                            }
                            setPrefillLoading(null);
                          }}
                        >
                          {prefillLoading === agent.id ? "Loading..." : "Configure"}
                        </Button>
                      </div>

                      {editingAgent === agent.id && (
                        <div className="space-y-3 pt-3 border-t">
                          <div className="space-y-2">
                            <Label>Webhook URL</Label>
                            <Input
                              type="url"
                              placeholder="https://your-n8n-instance.com/webhook/..."
                              value={webhookUrl}
                              onChange={(e) => setWebhookUrl(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTestConnection(agent)}
                              disabled={testingAgent === agent.id || !webhookUrl}
                            >
                              {testingAgent === agent.id ? (
                                <>
                                  <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                  Testing...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-3 w-3" />
                                  Test
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveWebhook(agent.id)}
                              disabled={!webhookUrl}
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingAgent(null);
                                setWebhookUrl("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-16 text-center">
                <p className="text-muted-foreground">
                  Agent configuration interface will be displayed here
                </p>
              </div>
            )}
          </Card>
        </TabsContent>

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
