import { Eye, PlayCircle, Users, TrendingUp } from "lucide-react";
import { useState } from "react";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import { linkedInData, youtubeVideos } from "@/data/sampleData";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

const Dashboard = () => {
  // Calculate totals
  const totalLinkedInImpressions = linkedInData.reduce((sum, d) => sum + d.impressions, 0);
  const totalYouTubeViews = youtubeVideos.reduce((sum, v) => sum + v.views, 0);
  const totalSubscribers = youtubeVideos.reduce((sum, v) => sum + v.subscribers, 0);

  // Prepare chart data (combining LinkedIn and YouTube by date)
  const [range, setRange] = useState<"7d" | "30d" | "90d">("90d");
  const sliceLen = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const chartData = linkedInData.slice(-sliceLen).map((item) => ({
    date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    linkedin: item.impressions,
    youtube: Math.floor(Math.random() * 100000) + 50000, // Sample data
  }));

  // Recent agent activity (mock data)
  const recentActivity = [
    {
      agent: "YouTube to Shorts",
      status: "Completed",
      startedAt: "2 hours ago",
      duration: "45s",
    },
    {
      agent: "Multi-Channel Publisher",
      status: "Running",
      startedAt: "15 minutes ago",
      duration: "-",
    },
    {
      agent: "Topic Analyzer",
      status: "Completed",
      startedAt: "1 day ago",
      duration: "2m 13s",
    },
  ];

  const activityColumns = [
    { key: "agent", label: "Agent Name", sortable: true },
    {
      key: "status",
      label: "Status",
      render: (value: string) => (
        <Badge
          variant="outline"
          className={
            value === "Completed"
              ? "bg-success/10 text-success"
              : value === "Running"
              ? "bg-primary/10 text-primary"
              : "bg-danger/10 text-danger"
          }
        >
          {value}
        </Badge>
      ),
    },
    { key: "startedAt", label: "Started At" },
    { key: "duration", label: "Duration" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor your social media performance at a glance
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="LinkedIn Impressions"
          value={(totalLinkedInImpressions / 1000000).toFixed(1) + "M"}
          growth={12}
          icon={Eye}
          iconColor="primary"
        />
        <StatCard
          label="YouTube Views"
          value={(totalYouTubeViews / 1000000).toFixed(1) + "M"}
          growth={8}
          icon={PlayCircle}
          iconColor="danger"
        />
        <StatCard
          label="Total Subscribers"
          value={totalSubscribers.toLocaleString()}
          growth={15}
          icon={Users}
          iconColor="success"
        />
      </div>

      {/* Cross-Platform Correlation Chart */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="mb-1">Cross-Platform Correlation</h2>
            <p className="text-sm text-muted-foreground">
              LinkedIn impressions vs YouTube views over time
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant={range === "7d" ? "default" : "outline"} size="sm" onClick={() => setRange("7d")}>7d</Button>
            <Button variant={range === "30d" ? "default" : "outline"} size="sm" onClick={() => setRange("30d")}>30d</Button>
            <Button variant={range === "90d" ? "default" : "outline"} size="sm" onClick={() => setRange("90d")}>90d</Button>
          </div>
        </div>

        <div className="mb-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="font-medium">
              YouTube uploads drive a 23% increase in LinkedIn engagement within 48 hours
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-xs" />
            <YAxis yAxisId="left" className="text-xs" />
            <YAxis yAxisId="right" orientation="right" className="text-xs" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="linkedin"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              name="LinkedIn Impressions"
              dot={{ r: 4 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="youtube"
              stroke="hsl(var(--danger))"
              strokeWidth={2}
              name="YouTube Views"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Agent Activity */}
      <div className="stat-card">
        <h2 className="mb-4">Recent Agent Activity</h2>
        <DataTable columns={activityColumns} data={recentActivity} />
      </div>
    </div>
  );
};

export default Dashboard;
