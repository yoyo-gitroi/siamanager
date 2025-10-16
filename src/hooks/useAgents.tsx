import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Agent {
  id: string;
  name: string;
  pillar: string;
  description: string | null;
  webhook_url: string | null;
  webhook_method: string;
  webhook_headers: Record<string, string>;
  payload_template: Record<string, any>;
  status: 'idle' | 'running' | 'error' | 'paused';
  last_run_at: string | null;
  avg_latency_ms: number;
  success_rate: number;
  created_at: string;
  updated_at: string;
}

export interface AgentRun {
  id: string;
  agent_id: string;
  user_id: string | null;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'success' | 'error' | 'cancelled';
  latency_ms: number | null;
  request_body: Record<string, any> | null;
  response_code: number | null;
  error_message: string | null;
  created_at: string;
}

export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
    fetchRuns();
  }, []);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAgents((data || []) as Agent[]);
    } catch (error: any) {
      console.error("Error fetching agents:", error);
      toast.error("Failed to load agents");
    } finally {
      setLoading(false);
    }
  };

  const fetchRuns = async () => {
    try {
      const { data, error } = await supabase
        .from("agent_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setRuns((data || []) as AgentRun[]);
    } catch (error: any) {
      console.error("Error fetching runs:", error);
    }
  };

  const runAgent = async (agentId: string, customPayload?: Record<string, any>) => {
    // Fetch latest agent data to ensure we have current webhook_url
    const { data: latestAgent, error: fetchError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .single();

    if (fetchError || !latestAgent) {
      toast.error("Failed to fetch agent data");
      return;
    }

    const agent = latestAgent as Agent;
    
    if (!agent.webhook_url) {
      toast.error("Agent not configured", {
        description: "Please configure the webhook URL in Settings first",
      });
      return;
    }

    const startTime = Date.now();
    
    // Create run record
    const { data: runData, error: runError } = await supabase
      .from("agent_runs")
      .insert({
        agent_id: agentId,
        status: "running",
        request_body: customPayload || agent.payload_template,
      })
      .select()
      .single();

    if (runError) {
      toast.error("Failed to start agent");
      return;
    }

    // Update agent status
    await supabase
      .from("agents")
      .update({ status: "running", last_run_at: new Date().toISOString() })
      .eq("id", agentId);

    try {
      const response = await fetch(agent.webhook_url, {
        method: agent.webhook_method,
        headers: {
          "Content-Type": "application/json",
          ...agent.webhook_headers,
        },
        body: JSON.stringify(customPayload || agent.payload_template),
      });

      const latency = Date.now() - startTime;

      await supabase
        .from("agent_runs")
        .update({
          status: response.ok ? "success" : "error",
          finished_at: new Date().toISOString(),
          latency_ms: latency,
          response_code: response.status,
          error_message: response.ok ? null : await response.text(),
        })
        .eq("id", runData.id);

      await supabase
        .from("agents")
        .update({ status: "idle" })
        .eq("id", agentId);

      if (response.ok) {
        toast.success("Agent completed successfully");
      } else {
        toast.error("Agent failed");
      }

      fetchAgents();
      fetchRuns();
    } catch (error: any) {
      const latency = Date.now() - startTime;
      
      await supabase
        .from("agent_runs")
        .update({
          status: "error",
          finished_at: new Date().toISOString(),
          latency_ms: latency,
          error_message: error.message,
        })
        .eq("id", runData.id);

      await supabase
        .from("agents")
        .update({ status: "error" })
        .eq("id", agentId);

      toast.error("Agent failed: " + error.message);
      fetchAgents();
      fetchRuns();
    }
  };

  const updateAgent = async (agentId: string, updates: Partial<Agent>) => {
    try {
      const { error } = await supabase
        .from("agents")
        .update(updates)
        .eq("id", agentId);

      if (error) throw error;
      toast.success("Agent updated");
      await fetchAgents(); // Ensure we refetch to get fresh data
    } catch (error: any) {
      toast.error("Failed to update agent");
    }
  };

  return {
    agents,
    runs,
    loading,
    runAgent,
    updateAgent,
    refetch: fetchAgents,
  };
};
