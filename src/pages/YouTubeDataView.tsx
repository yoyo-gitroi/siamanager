import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useYouTubeData } from "@/hooks/useYouTubeData";
import { useYouTubeAnalytics } from "@/hooks/useYouTubeAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import MetricCard from "@/components/youtube/MetricCard";
import PerformanceChart from "@/components/youtube/PerformanceChart";
import VideoPerformanceTable from "@/components/youtube/VideoPerformanceTable";
import AudienceInsightsPanel from "@/components/youtube/AudienceInsightsPanel";
import ContentStrategyInsights from "@/components/youtube/ContentStrategyInsights";
import { EnhancedSyncStatus } from "@/components/youtube/EnhancedSyncStatus";
import { EmptyDataState } from "@/components/youtube/EmptyDataState";
import { Loader2, Eye, Clock, Users, DollarSign, Target, ThumbsUp, Video } from "lucide-react";

export default function YouTubeDataView() {
  const { user } = useAuth();
  const [daysBack, setDaysBack] = useState(30);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncState, setSyncState] = useState<{ status: string; last_error: string | null } | null>(null);
  const { toast } = useToast();
  
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

  // Fetch sync state separately
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchSyncState = async () => {
      const { data } = await supabase
        .from('youtube_sync_state')
        .select('status, last_error')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setSyncState(data);
      }
    };
    
    fetchSyncState();
  }, [user?.id, channelData]);

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

  const handleManualSync = async () => {
    setSyncLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('yt-sync-daily-v2');
      
      if (error) {
        // Handle FunctionsHttpError - extract the actual error message
        const errorMessage = error.message || error.context?.error || "Failed to sync data";
        throw new Error(errorMessage);
      }
      
      toast({
        title: "Sync Complete",
        description: `Synced ${data.channelRows} channel metrics and ${data.videoRows} video metrics`,
      });
      
      await refetch();
    } catch (error: any) {
      console.error('Manual sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync data",
        variant: "destructive",
      });
    } finally {
      setSyncLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyDataState
        title="Error Loading Data"
        description={error}
        actionText="Try Again"
        onAction={refetch}
      />
    );
  }

  const hasChannelData = channelData.length > 0;
  const hasVideoData = videoData.length > 0;
  const hasAnyData = hasChannelData || hasVideoData;

  if (!hasAnyData) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">YouTube Studio Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics for your YouTube channel
          </p>
        </div>
        
        <EmptyDataState
          title="No Data Available"
          description="No YouTube analytics data found. Please run the backfill to import your channel's historical data."
          actionText="Go to Setup"
          actionLink="/youtube-setup"
        />
      </div>
    );
  }

  const lastSync = channelData.length > 0 ? channelData[0].day : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
            7d
          </Button>
          <Button
            variant={daysBack === 30 ? "default" : "outline"}
            onClick={() => setDaysBack(30)}
            size="sm"
          >
            30d
          </Button>
          <Button
            variant={daysBack === 90 ? "default" : "outline"}
            onClick={() => setDaysBack(90)}
            size="sm"
          >
            90d
          </Button>
        </div>
      </div>

      {/* Enhanced Sync Status */}
      <EnhancedSyncStatus
        lastSync={lastSync}
        onRefresh={handleManualSync}
        loading={syncLoading}
        channelRows={channelData.length}
        videoRows={videoData.length}
        status={syncState?.status === 'failed' ? 'error' : syncLoading ? 'syncing' : 'success'}
        errorMessage={syncState?.last_error}
      />

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
        <h2 className="text-xl font-semibold mb-4">Performance Trends</h2>
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
          {videoPerformance.length > 0 ? (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Top Performing Videos</h2>
              <VideoPerformanceTable videos={videoPerformance} maxRows={50} />
            </Card>
          ) : (
            <EmptyDataState
              title="No Video Data"
              description="No video performance data available for the selected period."
              actionText="Refresh Data"
              onAction={refetch}
            />
          )}
        </TabsContent>

        <TabsContent value="audience">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Audience Insights</h2>
            {(demographics.length > 0 || geography.length > 0 || trafficSources.length > 0 || deviceStats.length > 0) ? (
              <AudienceInsightsPanel
                demographics={demographics}
                geography={geography}
                trafficSources={trafficSources}
                deviceStats={deviceStats}
              />
            ) : (
              <EmptyDataState
                title="No Audience Data"
                description="Audience insights data is updated quarterly. Please wait for the next quarterly update or run the comprehensive backfill."
                actionText="Go to Setup"
                actionLink="/youtube-setup"
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="strategy">
          <ContentStrategyInsights insights={contentInsights} />
        </TabsContent>
      </Tabs>
    </div>
  );
}