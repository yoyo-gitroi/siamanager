import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import { TrendingUp, Target, Clock, Award } from "lucide-react";
import { linkedInData, youtubeVideos } from "@/data/sampleData";

const Analytics = () => {
  const [activeTab, setActiveTab] = useState("all");

  // Calculate engagement metrics
  const totalImpressions = linkedInData.reduce((sum, d) => sum + d.impressions, 0);
  const totalEngagements = linkedInData.reduce((sum, d) => sum + d.engagements, 0);
  const avgEngagementRate = ((totalEngagements / totalImpressions) * 100).toFixed(2);

  // Content type breakdown data
  const contentTypeData = [
    { name: "Video", value: 45, color: "hsl(var(--primary))" },
    { name: "Image", value: 30, color: "hsl(var(--success))" },
    { name: "Text", value: 15, color: "hsl(var(--warning))" },
    { name: "Carousel", value: 10, color: "hsl(var(--secondary))" },
  ];

  // Platform performance data
  const fullPlatformData = [
    { platform: "LinkedIn", impressions: totalImpressions / 1000000, engagement: totalEngagements / 1000 },
    { platform: "YouTube", impressions: youtubeVideos.reduce((sum, v) => sum + v.impressions, 0) / 1000000, engagement: youtubeVideos.reduce((sum, v) => sum + v.views, 0) / 1000 },
    { platform: "Instagram", impressions: 8.2, engagement: 320 },
    { platform: "Twitter", impressions: 5.4, engagement: 180 },
  ];
  const platformData = activeTab === "all"
    ? fullPlatformData
    : fullPlatformData.filter((d) => d.platform.toLowerCase() === activeTab);

  // Top performing content
  const topContent =
    activeTab === "linkedin"
      ? []
      : youtubeVideos.slice(0, 10).map((video) => ({
          platform: "YouTube",
          title: video.title.substring(0, 50) + "...",
          impressions: video.impressions.toLocaleString(),
          engagements: video.views.toLocaleString(),
          engagementRate: ((video.views / video.impressions) * 100).toFixed(2) + "%",
          publishDate: new Date(video.publishDate).toLocaleDateString(),
          url: video.url,
        }));

  const contentColumns = [
    { key: "platform", label: "Platform", sortable: true },
    { key: "title", label: "Content Title", sortable: true },
    { key: "impressions", label: "Impressions", sortable: true },
    { key: "engagements", label: "Engagements", sortable: true },
    { key: "engagementRate", label: "Engagement Rate", sortable: true },
    { key: "publishDate", label: "Published", sortable: true },
  ];

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
          <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
          <TabsTrigger value="youtube">YouTube</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-8 mt-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              label="Avg Engagement Rate"
              value={avgEngagementRate + "%"}
              icon={TrendingUp}
              iconColor="primary"
            />
            <StatCard
              label="Best Content Type"
              value="Video"
              icon={Target}
              iconColor="success"
            />
            <StatCard
              label="Peak Hour"
              value="2-4 PM"
              icon={Clock}
              iconColor="warning"
            />
            <StatCard
              label="Top Platform"
              value="LinkedIn"
              icon={Award}
              iconColor="secondary"
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
                    label={({ name, value }) => `${name}: ${value}%`}
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
