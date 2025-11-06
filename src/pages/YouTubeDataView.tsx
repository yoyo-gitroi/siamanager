import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useYouTubeData } from "@/hooks/useYouTubeData";
import { useYouTubeAnalytics } from "@/hooks/useYouTubeAnalytics";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import MetricCard from "@/components/youtube/MetricCard";
import PerformanceChart from "@/components/youtube/PerformanceChart";
import VideoPerformanceTable from "@/components/youtube/VideoPerformanceTable";
import AudienceInsightsPanel from "@/components/youtube/AudienceInsightsPanel";
import ContentStrategyInsights from "@/components/youtube/ContentStrategyInsights";
import SyncStatus from "@/components/youtube/SyncStatus";
import { Loader2, Eye, Clock, Users, DollarSign, Target, ThumbsUp, Video } from "lucide-react";

export default function YouTubeDataView() {
  const { user } = useAuth();
  const [daysBack, setDaysBack] = useState(30);
  
  const {
    channelData,
    videoData,
    videoMetadata,
    revenueData,
    demographics,
    geography,
    trafficSources,
    deviceStats,
    loading,
    error,
    refetch,
  } = useYouTubeData(user?.id, daysBack);

  const {
    videoPerformance,
    currentMetrics,
    periodComparison,
    contentInsights,
    audienceInsights,
  } = useYouTubeAnalytics(
    channelData,
    videoData,
    videoMetadata,
    revenueData,
    demographics,
    geography,
    trafficSources,
    deviceStats
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-6 bg-danger/10 border-danger">
          <p className="text-danger">Error loading data: {error}</p>
          <Button onClick={refetch} className="mt-4">Retry</Button>
        </Card>
      </div>
    );
  }

  const lastSync = channelData.length > 0 ? new Date(channelData[0].day) : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">YouTube Studio Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics for your YouTube channel
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={daysBack === 7 ? "default" : "outline"}
            onClick={() => setDaysBack(7)}
            size="sm"
          >
            7 Days
          </Button>
          <Button
            variant={daysBack === 30 ? "default" : "outline"}
            onClick={() => setDaysBack(30)}
            size="sm"
          >
            30 Days
          </Button>
          <Button
            variant={daysBack === 90 ? "default" : "outline"}
            onClick={() => setDaysBack(90)}
            size="sm"
          >
            90 Days
          </Button>
        </div>
      </div>

      {/* Sync Status */}
      <SyncStatus lastSync={lastSync} onRefresh={refetch} loading={loading} />

      {/* Overview KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          label="Total Views"
          value={currentMetrics.totalViews.toLocaleString()}
          growth={periodComparison.growth.views}
          icon={Eye}
          iconColor="primary"
          subtitle={`Last ${daysBack} days`}
        />
        <MetricCard
          label="Watch Hours"
          value={currentMetrics.totalWatchHours.toFixed(1)}
          growth={periodComparison.growth.watchHours}
          icon={Clock}
          iconColor="success"
          subtitle={`${(currentMetrics.totalWatchHours / 24).toFixed(1)} days`}
        />
        <MetricCard
          label="Net Subscribers"
          value={currentMetrics.netSubscribers.toLocaleString()}
          growth={periodComparison.growth.subscribers}
          icon={Users}
          iconColor="warning"
          subtitle={`+${currentMetrics.totalSubscribersGained} -${currentMetrics.totalSubscribersLost}`}
        />
        <MetricCard
          label="Estimated Revenue"
          value={`$${currentMetrics.totalRevenue.toFixed(2)}`}
          growth={periodComparison.growth.revenue}
          icon={DollarSign}
          iconColor="secondary"
          subtitle={`Last ${daysBack} days`}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label="Average CTR"
          value={`${currentMetrics.avgCTR.toFixed(2)}%`}
          icon={Target}
          iconColor="primary"
          subtitle="Click-through rate"
        />
        <MetricCard
          label="Engagement Rate"
          value={`${currentMetrics.avgEngagementRate.toFixed(2)}%`}
          icon={ThumbsUp}
          iconColor="success"
          subtitle={`${currentMetrics.totalEngagements.toLocaleString()} total engagements`}
        />
        <MetricCard
          label="Total Videos"
          value={currentMetrics.totalVideos.toLocaleString()}
          icon={Video}
          iconColor="warning"
          subtitle="Published on channel"
        />
      </div>

      {/* Performance Chart */}
      <Card className="p-6">
        <h2 className="mb-4">Performance Trends</h2>
        <PerformanceChart
          data={channelData}
          metrics={["views", "watch_time", "subscribers", "revenue"]}
          chartType="area"
        />
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="videos" className="space-y-6">
        <TabsList>
          <TabsTrigger value="videos">Video Performance</TabsTrigger>
          <TabsTrigger value="audience">Audience Insights</TabsTrigger>
          <TabsTrigger value="strategy">Content Strategy</TabsTrigger>
        </TabsList>

        <TabsContent value="videos">
          <Card className="p-6">
            <h2 className="mb-4">Top Performing Videos</h2>
            <VideoPerformanceTable videos={videoPerformance} maxRows={50} />
          </Card>
        </TabsContent>

        <TabsContent value="audience">
          <Card className="p-6">
            <h2 className="mb-4">Audience Insights</h2>
            <AudienceInsightsPanel
              demographics={demographics}
              geography={geography}
              trafficSources={trafficSources}
              deviceStats={deviceStats}
            />
          </Card>
        </TabsContent>

        <TabsContent value="strategy">
          <ContentStrategyInsights insights={contentInsights} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
