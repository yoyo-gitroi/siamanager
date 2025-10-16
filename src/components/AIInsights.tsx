import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIInsightsProps {
  youtubeData: any[];
  linkedInData: any[];
}

export const AIInsights = ({ youtubeData, linkedInData }: AIInsightsProps) => {
  const [insights, setInsights] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateInsights = async () => {
    if (!youtubeData.length || !linkedInData.length) {
      toast({
        title: "Insufficient Data",
        description: "Please ensure you have both YouTube and LinkedIn data imported",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-insights", {
        body: {
          youtubeData: youtubeData.slice(0, 50), // Send top 50 videos
          linkedInData: linkedInData.slice(-30), // Send last 30 days
        },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setInsights(data.insights);
      toast({
        title: "Insights Generated",
        description: "AI has analyzed your cross-platform performance",
      });
    } catch (error: any) {
      console.error("Error generating insights:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate insights",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 border-none shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="mb-1">Cross-Platform Correlation</h2>
          <p className="text-sm text-muted-foreground">
            AI-powered insights on your content performance
          </p>
        </div>
        <Button
          onClick={generateInsights}
          disabled={loading || !youtubeData.length || !linkedInData.length}
          size="sm"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Insights
            </>
          )}
        </Button>
      </div>

      {insights ? (
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {insights}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-12 text-center text-muted-foreground">
          <div>
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Click "Generate Insights" to get AI-powered analysis of your cross-platform performance</p>
          </div>
        </div>
      )}
    </Card>
  );
};
