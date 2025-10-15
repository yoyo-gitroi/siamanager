import { useState, useEffect } from "react";
import { agents as initialAgents } from "@/data/sampleData";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CheckCircle, AlertCircle } from "lucide-react";

const Settings = () => {
  const [webhookUrls, setWebhookUrls] = useState<Record<string, string>>({});
  const [testingAgent, setTestingAgent] = useState<string | null>(null);
  const [userName, setUserName] = useState("John Doe");
  const [userEmail] = useState("john.doe@example.com");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("asm-webhooks");
      if (saved) setWebhookUrls(JSON.parse(saved));
    } catch {}
  }, []);

  const handleWebhookChange = (agentId: string, url: string) => {
    setWebhookUrls((prev) => ({ ...prev, [agentId]: url }));
  };

  const handleTestConnection = async (agentId: string) => {
    const url = webhookUrls[agentId];
    
    if (!url) {
      toast.error("No webhook URL configured");
      return;
    }

    setTestingAgent(agentId);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        toast.success("Connection successful", {
          description: "Webhook is configured correctly",
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      toast.error("Connection failed", {
        description: error instanceof Error ? error.message : "Could not reach webhook",
      });
    } finally {
      setTestingAgent(null);
    }
  };

  const handleSaveWebhook = (agentId: string) => {
    const url = webhookUrls[agentId];
    
    if (!url) {
      toast.error("Please enter a webhook URL");
      return;
    }

    // Persist locally for now; will sync to Cloud later
    try {
      const saved = localStorage.getItem("asm-webhooks");
      const mapping = saved ? JSON.parse(saved) : {};
      mapping[agentId] = url;
      localStorage.setItem("asm-webhooks", JSON.stringify(mapping));
    } catch {}

    toast.success("Webhook saved", {
      description: "Configuration updated successfully",
    });
  };

  const handleSaveProfile = () => {
    toast.success("Profile updated", {
      description: "Your account settings have been saved",
    });
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      <div>
        <h1 className="mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure agent webhooks and manage your account settings
        </p>
      </div>

      {/* Agent Webhook Configuration */}
      <div className="space-y-6">
        <div>
          <h2 className="mb-4">Agent Webhook Configuration</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Configure n8n webhook URLs for each agent. These endpoints will receive agent execution requests.
          </p>
        </div>

        {initialAgents.map((agent) => (
          <Card key={agent.id} className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-${agent.color}/10 text-${agent.color}`}>
                  <span className="font-medium">{agent.name}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`webhook-${agent.id}`}>Webhook URL</Label>
                <Input
                  id={`webhook-${agent.id}`}
                  type="url"
                  placeholder="https://your-n8n-instance.com/webhook/..."
                  value={webhookUrls[agent.id] || ""}
                  onChange={(e) => handleWebhookChange(agent.id, e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestConnection(agent.id)}
                  disabled={testingAgent === agent.id || !webhookUrls[agent.id]}
                >
                  {testingAgent === agent.id ? (
                    <>
                      <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-3 w-3" />
                      Test Connection
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSaveWebhook(agent.id)}
                  disabled={!webhookUrls[agent.id]}
                >
                  Save
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Account Settings */}
      <div className="space-y-6">
        <h2>Account Settings</h2>

        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={userEmail} disabled />
            <p className="text-xs text-muted-foreground">
              Contact support to change your email address
            </p>
          </div>

          <Button onClick={handleSaveProfile}>Save Changes</Button>
        </Card>
      </div>

      <Separator />

      {/* Data Management */}
      <div className="space-y-6">
        <h2>Data Management</h2>

        <Card className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Export Your Data</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Download all your imported analytics data as CSV files
                </p>
                <Button variant="outline" size="sm">
                  Export Data
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-danger mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Clear All Data</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Permanently delete all imported analytics data. This action cannot be undone.
                </p>
                <Button variant="destructive" size="sm">
                  Clear All Data
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
