import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useInstagramAnalytics } from "@/hooks/useInstagramAnalytics";
import { useCorrelations } from "@/hooks/useCorrelations";
import { toast } from "sonner";
import CorrelationMatrix from "@/components/CorrelationMatrix";
import GrowthCards from "@/components/GrowthCards";
import { AIInsights } from "@/components/AIInsights";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw } from "lucide-react";

const MatrixAnalytics = () => {
  const { user } = useAuth();
  const { linkedInData, youtubeData, loading: analyticsLoading } = useAnalytics(user?.id);
  const { data: instagramData, loading: instagramLoading } = useInstagramAnalytics(user?.id);
  const { correlations, loading: correlationsLoading, computeCorrelations } = useCorrelations(user?.id);
  const [selectedMetric, setSelectedMetric] = useState("engagement");
  const [computing, setComputing] = useState(false);

  const growthMetrics = useMemo(() => {
    const getLast7Days = (data: any[]) => {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      return data.filter((d) => new Date(d.date || d.publish_date) >= sevenDaysAgo);
    };

    const getLast30Days = (data: any[]) => {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return data.filter((d) => new Date(d.date || d.publish_date) >= thirtyDaysAgo);
    };

    // YouTube Subscribers
    const ytLast7 = getLast7Days(youtubeData);
    const ytLast30 = getLast30Days(youtubeData);
    const ytSubsCurrent = ytLast7.reduce((sum, d) => sum + ((d as any).subscribers || 0), 0);
    const ytSubsPrior7 = youtubeData.slice(7, 14).reduce((sum, d) => sum + ((d as any).subscribers || 0), 0);
    const ytSubsDelta7 = ytSubsPrior7 ? ((ytSubsCurrent - ytSubsPrior7) / ytSubsPrior7) * 100 : 0;

    // YouTube Watch Hours
    const ytWatchCurrent = ytLast7.reduce((sum, d) => sum + ((d as any).watch_hours || d.watch_time_hours || 0), 0);
    const ytWatchPrior7 = youtubeData.slice(7, 14).reduce((sum, d) => sum + ((d as any).watch_hours || d.watch_time_hours || 0), 0);
    const ytWatchDelta7 = ytWatchPrior7 ? ((ytWatchCurrent - ytWatchPrior7) / ytWatchPrior7) * 100 : 0;

    // Instagram Followers
    const igLast7 = getLast7Days(instagramData);
    const igFollowersCurrent = igLast7[igLast7.length - 1]?.followers || 0;
    const igFollowersPrior7 = instagramData[7]?.followers || igFollowersCurrent;
    const igFollowersDelta7 = igFollowersPrior7 ? ((igFollowersCurrent - igFollowersPrior7) / igFollowersPrior7) * 100 : 0;

    // LinkedIn Followers
    const liLast7 = getLast7Days(linkedInData);
    const liFollowersCurrent = liLast7[liLast7.length - 1]?.followers || 0;
    const liFollowersPrior7 = linkedInData[7]?.followers || liFollowersCurrent;
    const liFollowersDelta7 = liFollowersPrior7 ? ((liFollowersCurrent - liFollowersPrior7) / liFollowersPrior7) * 100 : 0;

    return {
      youtubeSubscribers: { current: ytSubsCurrent, delta7: ytSubsDelta7, delta30: 0 },
      youtubeWatchHours: { current: ytWatchCurrent, delta7: ytWatchDelta7, delta30: 0 },
      instagramFollowers: { current: igFollowersCurrent, delta7: igFollowersDelta7, delta30: 0 },
      linkedinFollowers: { current: liFollowersCurrent, delta7: liFollowersDelta7, delta30: 0 },
    };
  }, [youtubeData, instagramData, linkedInData]);

  const handleComputeCorrelations = async () => {
    setComputing(true);
    try {
      await computeCorrelations();
      toast.success("Correlations computed successfully");
    } catch (error) {
      toast.error("Failed to compute correlations");
    } finally {
      setComputing(false);
    }
  };

  const loading = analyticsLoading || instagramLoading || correlationsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl">
      <div>
        <h1 className="mb-2">Cross-Platform Matrix</h1>
        <p className="text-muted-foreground">
          Analyze performance correlations across YouTube, LinkedIn, and Instagram
        </p>
      </div>

      <GrowthCards {...growthMetrics} />

      <Tabs defaultValue="matrix" className="space-y-6">
        <TabsList>
          <TabsTrigger value="matrix">Correlation Matrix</TabsTrigger>
          <TabsTrigger value="shorts">YouTube Shorts</TabsTrigger>
          <TabsTrigger value="longform">Long-form Content</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <h2>Performance Correlation Matrix</h2>
                <p className="text-sm text-muted-foreground">
                  Compare how content performs across platforms
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engagement">Engagement</SelectItem>
                    <SelectItem value="followers">Followers/Subscribers</SelectItem>
                    <SelectItem value="views">Views/Impressions</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleComputeCorrelations}
                  disabled={computing}
                  variant="outline"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${computing ? "animate-spin" : ""}`} />
                  Compute
                </Button>
              </div>
            </div>

            {correlations.length > 0 ? (
              <CorrelationMatrix correlations={correlations} selectedMetric={selectedMetric} />
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  No correlation data yet. Click "Compute" to analyze your content performance.
                </p>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="shorts">
          <Card className="p-6">
            <h2 className="mb-4">YouTube Shorts Performance</h2>
            <p className="text-muted-foreground">
              Filtered view of short-form content performance
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="longform">
          <Card className="p-6">
            <h2 className="mb-4">Long-form Content Performance</h2>
            <p className="text-muted-foreground">
              Filtered view of long-form content performance
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <AIInsights youtubeData={youtubeData} linkedInData={linkedInData} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MatrixAnalytics;
