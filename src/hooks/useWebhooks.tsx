import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useWebhooks = (userId: string | undefined) => {
  const [webhooks, setWebhooks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchWebhooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchWebhooks = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("agent_webhooks")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;

      const webhookMap: Record<string, string> = {};
      data?.forEach((webhook) => {
        webhookMap[webhook.agent_id] = webhook.webhook_url;
      });
      setWebhooks(webhookMap);
    } catch (error) {
      console.error("Error fetching webhooks:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveWebhook = async (agentId: string, webhookUrl: string) => {
    if (!userId) {
      toast.error("Please sign in to save webhooks");
      return;
    }

    try {
      const { error } = await supabase.from("agent_webhooks").upsert({
        user_id: userId,
        agent_id: agentId,
        webhook_url: webhookUrl,
      });

      if (error) throw error;

      setWebhooks((prev) => ({ ...prev, [agentId]: webhookUrl }));
      toast.success("Webhook saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save webhook");
    }
  };

  return { webhooks, loading, saveWebhook, refetch: fetchWebhooks };
};
