import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAgents } from "@/hooks/useAgents";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle, Upload, FileText, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const { user } = useAuth();
  const { agents, updateAgent, loading } = useAgents();
  const [testingAgent, setTestingAgent] = useState<string | null>(null);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [prefillLoading, setPrefillLoading] = useState<string | null>(null);

  const handleTestConnection = async (agent: any) => {
    if (!agent.webhook_url) {
      toast.error("No webhook URL configured");
      return;
    }

    setTestingAgent(agent.id);

    try {
      const response = await fetch(agent.webhook_url, {
        method: agent.webhook_method || "POST",
        headers: { "Content-Type": "application/json", ...agent.webhook_headers },
        body: JSON.stringify({
          test: true,
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
