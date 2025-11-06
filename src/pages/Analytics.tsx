import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useYouTubeData } from "@/hooks/useYouTubeData";
import { useYouTubeAnalytics } from "@/hooks/useYouTubeAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area } from "recharts";
import MetricCard from "@/components/youtube/MetricCard";
import DataTable from "@/components/DataTable";
import { TrendingUp, Target, Clock, Award, Loader2 } from "lucide-react";
import { format } from "date-fns";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--secondary))",
];

const Analytics = () => {
  const [activeTab, setActiveTab] = useState("all");
  const { user } = useAuth();
  
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
  } = useYouTubeData(user?.id, 30);

  const {
    videoPerformance,
    currentMetrics,
    contentInsights,
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

  // Content type breakdown
  const contentTypeData = useMemo(() => {
    const shorts = contentInsights.byLength.shorts;
    const medium = contentInsights.byLength.medium;
    const long = contentInsights.byLength.long;

    return [
      {
        name: "Shorts (<60s)",
        value: shorts.count,
        avgViews: shorts.avgViews,
        color: COLORS[0],
      },
      {
        name: "Medium (1-10min)",
        value: medium.count,
        avgViews: medium.avgViews,
        color: COLORS[1],
      },
      {
        name: "Long (>10min)",
        value: long.count,
        avgViews: long.avgViews,
        color: COLORS[2],
      },
    ].filter(item => item.value > 0);
  }, [contentInsights]);

  // Platform performance data
  const platformData = useMemo(() => {
    return [
      {
        platform: "YouTube",
        impressions: (currentMetrics.totalImpressions / 1000000).toFixed(2),
        engagement: (currentMetrics.totalEngagements / 1000).toFixed(1),
      },
    ];
  }, [currentMetrics]);

  // Growth trends data
  const growthTrendsData = useMemo(() => {
    return channelData
      .slice(0, 30)
      .map((d) => ({
        date: format(new Date(d.day), "MMM dd"),
        views: d.views || 0,
        watchHours: (d.watch_time_seconds || 0) / 3600,
        subscribers: (d.subscribers_gained || 0) - (d.subscribers_lost || 0),
      }))
      .reverse();
  }, [channelData]);

  // Top performing content
  const topContent = useMemo(() => {
    return videoPerformance.slice(0, 10).map((video) => ({
      platform: "YouTube",
      title: video.title.substring(0, 50) + (video.title.length > 50 ? "..." : ""),
      impressions: video.totalImpressions.toLocaleString(),
      engagements: (video.totalLikes + video.totalComments).toLocaleString(),
      engagementRate: video.engagementRate.toFixed(2) + "%",
      publishDate: format(new Date(video.published_at), "MMM dd, yyyy"),
      url: `https://youtube.com/watch?v=${video.video_id}`,
    }));
  }, [videoPerformance]);

  const contentColumns = [
    { key: "platform", label: "Platform", sortable: true },
    { key: "title", label: "Content Title", sortable: true },
    { key: "impressions", label: "Impressions", sortable: true },
    { key: "engagements", label: "Engagements", sortable: true },
    { key: "engagementRate", label: "Engagement Rate", sortable: true },
    { key: "publishDate", label: "Published", sortable: true },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const bestContentType = contentTypeData.reduce((best, current) =>
    current.avgViews > best.avgViews ? current : best
  , contentTypeData[0]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="mb-2">Analytics</h1>
        <p className="text-muted-foreground">
          Deep dive into your content performance and engagement metrics
        </p>
      </div>

      {/* Platform Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Platforms</TabsTrigger>
          <TabsTrigger value="youtube">YouTube</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-8 mt-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              label="Avg Engagement Rate"
              value={currentMetrics.avgEngagementRate.toFixed(2) + "%"}
              icon={TrendingUp}
              iconColor="primary"
              subtitle="Likes + Comments / Views"
            />
            <MetricCard
              label="Best Content Type"
              value={bestContentType?.name.split(" ")[0] || "N/A"}
              icon={Target}
              iconColor="success"
              subtitle={`${bestContentType?.avgViews.toLocaleString() || 0} avg views`}
            />
            <MetricCard
              label="Total Watch Hours"
              value={currentMetrics.totalWatchHours.toFixed(1)}
              icon={Clock}
              iconColor="warning"
              subtitle="Last 30 days"
            />
            <MetricCard
              label="Top Platform"
              value="YouTube"
              icon={Award}
              iconColor="secondary"
              subtitle={`${currentMetrics.totalViews.toLocaleString()} views`}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Content Type Breakdown */}
            <div className="stat-card">
              <h2 className="mb-4">Content Type Breakdown</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={contentTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {contentTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {contentTypeData.map((type) => (
                  <div key={type.name} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{type.name}</span>
                    <span className="font-medium">
                      {type.avgViews.toLocaleString()} avg views
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform Performance */}
            <div className="stat-card">
              <h2 className="mb-4">Platform Performance</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={platformData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="platform" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="impressions" fill="hsl(var(--primary))" name="Impressions (M)" />
                  <Bar dataKey="engagement" fill="hsl(var(--success))" name="Engagement (K)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Growth Trends Chart */}
          <div className="stat-card">
            <h2 className="mb-4">Growth Trends Over Time</h2>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={growthTrendsData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="views"
                  name="Views"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="watchHours"
                  name="Watch Hours"
                  stroke="hsl(var(--success))"
                  fill="hsl(var(--success))"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="subscribers"
                  name="Net Subscribers"
                  stroke="hsl(var(--warning))"
                  fill="hsl(var(--warning))"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Top Performing Content */}
          <div className="stat-card">
            <h2 className="mb-4">Top Performing Content</h2>
            <DataTable
              columns={contentColumns}
              data={topContent}
              onRowClick={(row) => window.open(row.url, "_blank")}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
