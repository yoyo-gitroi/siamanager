import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useYouTubeData } from "@/hooks/useYouTubeData";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Clock, Users, TrendingUp, AlertCircle, Target, PlayCircle, DollarSign, ThumbsUp, MessageSquare } from "lucide-react";
import { format, subDays } from "date-fns";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell 
} from "recharts";

const YouTubeAnalytics = () => {
  const { user } = useAuth();
  const { channelData, videoData, videoMetadata, revenueData, loading } = useYouTubeData(user?.id, 90);
  const [period, setPeriod] = useState<"30d" | "60d">("30d");

  // Calculate current and prior period metrics
  const { current, prior, alerts } = useMemo(() => {
    if (!channelData.length) return { current: null, prior: null, alerts: [] };

    const now = new Date();
    const daysBack = period === "30d" ? 30 : 60;
    const currentPeriodStart = subDays(now, daysBack);
    const priorPeriodStart = subDays(currentPeriodStart, daysBack);

    const currentData = channelData.filter(d => {
      const date = new Date(d.day);
      return date >= currentPeriodStart && date <= now;
    });

    const priorData = channelData.filter(d => {
      const date = new Date(d.day);
      return date >= priorPeriodStart && date < currentPeriodStart;
    });

    const calcMetrics = (data: typeof channelData) => {
      const views = data.reduce((sum, d) => sum + (d.views || 0), 0);
      const watchTime = data.reduce((sum, d) => sum + (d.watch_time_seconds || 0), 0) / 3600;
      const subscribers = data.reduce((sum, d) => sum + (d.subscribers_gained || 0) - (d.subscribers_lost || 0), 0);
      const revenue = data.reduce((sum, d) => sum + (Number(d.estimated_revenue) || 0), 0);
      return { views, watchTime, subscribers, revenue };
    };

    const current = calcMetrics(currentData);
    const prior = calcMetrics(priorData);

    // Check alerts
    const alerts: string[] = [];
    if (prior.views > 0 && ((prior.views - current.views) / prior.views) >= 0.15) {
      alerts.push("Views dropped ≥15%");
    }
    if (prior.watchTime > 0 && ((prior.watchTime - current.watchTime) / prior.watchTime) >= 0.15) {
      alerts.push("Watch time dropped ≥15%");
    }
    if (current.subscribers < 0) {
      alerts.push("Net negative subscribers");
    }

    return { current, prior, alerts };
  }, [channelData, period]);

  // Video performance data
  const videoPerformance = useMemo(() => {
    if (!videoData.length || !videoMetadata.length) return [];

    // Group video data by video_id and aggregate
    const videoMap = new Map<string, any>();

    videoData.forEach(v => {
      const existing = videoMap.get(v.video_id) || {
        video_id: v.video_id,
        views: 0,
        watch_time_seconds: 0,
        impressions: 0,
        ctr: 0,
        likes: 0,
        comments: 0,
        dataPoints: 0
      };

      videoMap.set(v.video_id, {
        ...existing,
        views: existing.views + (v.views || 0),
        watch_time_seconds: existing.watch_time_seconds + (v.watch_time_seconds || 0),
        impressions: existing.impressions + (v.impressions || 0),
        ctr: existing.ctr + (v.click_through_rate || 0),
        likes: existing.likes + (v.likes || 0),
        comments: existing.comments + (v.comments || 0),
        dataPoints: existing.dataPoints + 1
      });
    });

    // Join with metadata
    return Array.from(videoMap.values())
      .map(v => {
        const metadata = videoMetadata.find(m => m.video_id === v.video_id);
        const avgCtr = v.dataPoints > 0 ? v.ctr / v.dataPoints : 0;
        const engagementRate = v.views > 0 ? ((v.likes + v.comments) / v.views) * 100 : 0;

        return {
          video_id: v.video_id,
          title: metadata?.title || v.video_id,
          published_at: metadata?.published_at || '',
          views: v.views,
          watchHours: (v.watch_time_seconds / 3600).toFixed(1),
          impressions: v.impressions,
          ctr: avgCtr.toFixed(2),
          likes: v.likes,
          comments: v.comments,
          engagement: engagementRate.toFixed(2)
        };
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, 50);
  }, [videoData, videoMetadata]);

  // Daily trend chart
  const dailyTrendData = useMemo(() => {
    const last30Days = channelData
      .filter(d => new Date(d.day) >= subDays(new Date(), 30))
      .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime())
      .map(d => ({
        date: format(new Date(d.day), "MMM dd"),
        views: d.views || 0,
        watchHours: ((d.watch_time_seconds || 0) / 3600),
        subscribers: (d.subscribers_gained || 0) - (d.subscribers_lost || 0),
        revenue: Number(d.estimated_revenue) || 0
      }));

    return last30Days;
  }, [channelData]);

  const videoColumns = [
    { 
      key: "title", 
      label: "Video Title", 
      sortable: true,
      render: (val: string) => <div className="max-w-md truncate">{val}</div>
    },
    { 
      key: "views", 
      label: "Views", 
      sortable: true,
      render: (val: number) => val.toLocaleString()
    },
    { key: "watchHours", label: "Watch (hrs)", sortable: true },
    { 
      key: "impressions", 
      label: "Impressions", 
      sortable: true,
      render: (val: number) => val.toLocaleString()
    },
    { key: "ctr", label: "CTR (%)", sortable: true },
    { 
      key: "likes", 
      label: "Likes", 
      sortable: true,
      render: (val: number) => val.toLocaleString()
    },
    { 
      key: "comments", 
      label: "Comments", 
      sortable: true,
      render: (val: number) => val.toLocaleString()
    },
    { key: "engagement", label: "Engagement %", sortable: true },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const calcChange = (curr: number, prev: number) => {
    if (!prev) return 0;
    return ((curr - prev) / prev) * 100;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="mb-2">YouTube Analytics</h1>
        <p className="text-muted-foreground">
          Content performance, discovery metrics, and audience engagement insights
        </p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="stat-card border-danger/50 bg-danger/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-danger mt-0.5" />
            <div>
              <h3 className="font-semibold text-danger mb-2">Performance Alerts</h3>
              <ul className="space-y-1">
                {alerts.map((alert, i) => (
                  <li key={i} className="text-sm text-danger/80">• {alert}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Executive Snapshot */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2>Executive Snapshot</h2>
          <div className="flex gap-2">
            <Button 
              variant={period === "30d" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setPeriod("30d")}
            >
              Last 30d
            </Button>
            <Button 
              variant={period === "60d" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setPeriod("60d")}
            >
              Last 60d
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard
            label="Views"
            value={current?.views.toLocaleString() || "0"}
            growth={current && prior ? calcChange(current.views, prior.views) : 0}
            icon={Eye}
            iconColor="primary"
          />
          <StatCard
            label="Watch Hours"
            value={current?.watchTime.toFixed(0) || "0"}
            growth={current && prior ? calcChange(current.watchTime, prior.watchTime) : 0}
            icon={Clock}
            iconColor="success"
          />
          <StatCard
            label="Net Subscribers"
            value={current?.subscribers.toLocaleString() || "0"}
            growth={current && prior ? calcChange(current.subscribers, prior.subscribers) : 0}
            icon={Users}
            iconColor="warning"
          />
          <StatCard
            label="Revenue"
            value={`$${current?.revenue.toFixed(2) || "0"}`}
            growth={current && prior ? calcChange(current.revenue, prior.revenue) : 0}
            icon={DollarSign}
            iconColor="secondary"
          />
          <StatCard
            label="Videos"
            value={videoMetadata.length.toLocaleString()}
            icon={PlayCircle}
            iconColor="primary"
          />
        </div>
      </div>

      {/* Daily Trends */}
      <div className="stat-card">
        <h2 className="mb-4">30-Day Performance Trends</h2>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={dailyTrendData}>
            <defs>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorWatch" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-xs" />
            <YAxis yAxisId="left" className="text-xs" />
            <YAxis yAxisId="right" orientation="right" className="text-xs" />
            <Tooltip contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "12px",
            }} />
            <Legend />
            <Area yAxisId="left" type="monotone" dataKey="views" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorViews)" name="Views" />
            <Area yAxisId="right" type="monotone" dataKey="watchHours" stroke="hsl(var(--success))" fillOpacity={1} fill="url(#colorWatch)" name="Watch Hours" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Video Performance Table */}
      <div className="stat-card">
        <h2 className="mb-4">Top Video Performance</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Top 50 videos by views with engagement metrics
        </p>
        <DataTable
          columns={videoColumns}
          data={videoPerformance}
          onRowClick={(row) => window.open(`https://youtube.com/watch?v=${row.video_id}`, "_blank")}
        />
      </div>

      {/* Revenue & Engagement Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="stat-card">
          <h2 className="mb-4">Daily Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyTrendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
              }} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--warning))" strokeWidth={2} name="Revenue ($)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card">
          <h2 className="mb-4">Daily Subscriber Growth</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyTrendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
              }} />
              <Bar dataKey="subscribers" name="Net Subscribers">
                {dailyTrendData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.subscribers >= 0 ? "hsl(var(--success))" : "hsl(var(--danger))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default YouTubeAnalytics;
