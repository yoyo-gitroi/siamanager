import { useState } from "react";
import AgentCard from "@/components/AgentCard";
import { agents as initialAgents } from "@/data/sampleData";
import { Agent, WebhookPayload } from "@/types";
import { toast } from "sonner";

const Agents = () => {
  const [agents, setAgents] = useState(initialAgents);

  const handleRunAgent = async (agent: Agent, inputData: Record<string, any>) => {
    // Update agent status to running
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agent.id ? { ...a, status: "running" as const } : a
      )
    );

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const payload: WebhookPayload = {
      userId: "user-123", // In production, this would be the actual user ID
      agentId: agent.id,
      agentKey: agent.key,
      executionId,
      timestamp: new Date().toISOString(),
      input: inputData,
    };

    try {
      // Check if webhook URL is configured
      if (!agent.webhookUrl) {
        toast.error("Webhook URL not configured", {
          description: "Please configure the webhook URL in Settings",
        });
        throw new Error("No webhook URL");
      }

      // Make the webhook call
      const response = await fetch(agent.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      toast.success("Agent started successfully", {
        description: `${agent.name} is now processing your request`,
      });

      // Simulate completion after 3 seconds
      setTimeout(() => {
        setAgents((prev) =>
          prev.map((a) =>
            a.id === agent.id
              ? { ...a, status: "idle" as const, lastRun: new Date() }
              : a
          )
        );
        toast.success("Agent completed", {
          description: `${agent.name} finished execution`,
        });
      }, 3000);
    } catch (error) {
      console.error("Agent execution error:", error);
      setAgents((prev) =>
        prev.map((a) =>
          a.id === agent.id ? { ...a, status: "failed" as const } : a
        )
      );
      toast.error("Agent execution failed", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="mb-2">AI Agents</h1>
        <p className="text-muted-foreground">
          Configure and run AI-powered automation agents for your social media workflow
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} onRun={handleRunAgent} />
        ))}
      </div>
    </div>
  );
};

export default Agents;
