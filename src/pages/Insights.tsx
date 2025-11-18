import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ShortsConversionChart } from "@/components/youtube/ShortsConversionChart";
import { TopVideoCard } from "@/components/youtube/TopVideoCard";
import { AudienceDNAPanel } from "@/components/youtube/AudienceDNAPanel";
import { RevenueImpactCard } from "@/components/youtube/RevenueImpactCard";
import { TrendDetectionCard } from "@/components/youtube/TrendDetectionCard";

const Insights = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const [lastProcessed, setLastProcessed] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadExistingInsights();
    }
  }, [user?.id]);

  const loadExistingInsights = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('yt_processed_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('processed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading insights:', error);
        return;
      }

      if (data) {
        setInsights(data.insights_data);
        setLastProcessed(data.processed_at);
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    }
  };

  const processInsights = async () => {
    if (!user) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-youtube-insights', {
        body: { userId: user.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setInsights(data.insights);
      setLastProcessed(new Date().toISOString());
      toast({
        title: "Insights Generated",
        description: "AI analysis complete with actionable recommendations",
      });
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate insights",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI-Powered Insights</h1>
          <p className="text-muted-foreground mt-2">
            Data-driven analysis with specific recommendations
          </p>
          {lastProcessed && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {new Date(lastProcessed).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {insights && (
            <Button onClick={loadExistingInsights} variant="outline" size="lg">
              <RefreshCw className="h-5 w-5 mr-2" />
              Refresh
            </Button>
          )}
          <Button onClick={processInsights} disabled={isProcessing || !user} size="lg">
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                {insights ? "Regenerate" : "Generate Insights"}
              </>
            )}
          </Button>
        </div>
      </div>

      {!insights ? (
        <Card className="p-12 text-center border-dashed">
          <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No Insights Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Generate AI-powered insights with specific metrics, top video analysis, audience DNA, 
            revenue optimization strategies, and trend detection from your last 14 days of YouTube data
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {insights.shortsConversionAnalysis && (
            <ShortsConversionChart data={insights.shortsConversionAnalysis} />
          )}

          {insights.topVideos && insights.topVideos.length > 0 && (
            <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-none shadow-sm">
              <h3 className="text-2xl font-bold mb-4">
                🔥 What Made These Videos Work
              </h3>
              <div className="space-y-4">
                {insights.topVideos.slice(0, 3).map((video: any, idx: number) => (
                  <TopVideoCard 
                    key={video.videoId || idx} 
                    video={video} 
                    rank={idx + 1}
                    channelAvgRetention={45}
                  />
                ))}
              </div>

              <div className="mt-6 bg-primary/10 rounded-lg p-4 border border-primary/20">
                <h4 className="font-semibold text-primary mb-2">💡 Pattern Detected</h4>
                <p className="text-sm">
                  Your best performing content = [Emotional vulnerability + Actionable advice + Personal story]
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Recommendation: Test a 3:1 ratio (3 solo emotional/advice videos : 1 guest)
                </p>
              </div>
            </Card>
          )}

          {insights.audienceDNA && <AudienceDNAPanel data={insights.audienceDNA} />}

          {insights.revenueOptimization && <RevenueImpactCard data={insights.revenueOptimization} />}

          {insights.trendDetection && <TrendDetectionCard data={insights.trendDetection} />}

          {insights.competitivePosition && (
            <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-none shadow-sm">
              <h3 className="text-2xl font-bold mb-4">📊 Competitive Position</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Rank</p>
                  <p className="text-2xl font-bold text-primary">{insights.competitivePosition.estimatedRank}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Regular Viewers</p>
                  <p className="text-2xl font-bold">
                    {insights.competitivePosition.regularViewerRate?.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Improvement Areas</p>
                  <p className="text-2xl font-bold">{insights.competitivePosition.comparisonPoints?.length || 0}</p>
                </div>
              </div>
              {insights.competitivePosition.comparisonPoints?.length > 0 && (
                <div className="mt-4 bg-warning/10 rounded-lg p-4 border border-warning/20">
                  <p className="text-sm font-semibold mb-2">What competitors do better:</p>
                  <ul className="space-y-1">
                    {insights.competitivePosition.comparisonPoints.map((point: string, idx: number) => (
                      <li key={idx} className="text-sm">• {point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default Insights;
