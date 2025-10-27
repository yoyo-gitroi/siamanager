import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Correlation {
  id: string;
  date_bucket: string;
  platform_a: string;
  metric_a: string;
  platform_b: string;
  metric_b: string;
  correlation_coeff: number;
  p_value?: number;
  notes?: string;
}

export const useCorrelations = (userId: string | undefined) => {
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchCorrelations();
  }, [userId]);

  const fetchCorrelations = async () => {
    if (!userId) return;

    try {
      const { data } = await supabase
        .from("content_correlations")
        .select("*")
        .eq("user_id", userId)
        .order("date_bucket", { ascending: false })
        .limit(50);

      if (data) {
        setCorrelations(data);
      }
    } catch (error) {
      console.error("Error fetching correlations:", error);
    } finally {
      setLoading(false);
    }
  };

  const computeCorrelations = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase.functions.invoke("compute-correlations", {
        body: { userId },
      });

      if (error) throw error;
      await fetchCorrelations();
    } catch (error) {
      console.error("Error computing correlations:", error);
      throw error;
    }
  };

  return {
    correlations,
    loading,
    computeCorrelations,
    refetch: fetchCorrelations,
  };
};
