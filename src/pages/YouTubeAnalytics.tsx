import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Clock, Users, TrendingUp, AlertCircle, Target, PlayCircle } from "lucide-react";
import { 
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell 
} from "recharts";

const YouTubeAnalytics = () => {
  const { user } = useAuth();
  const { youtubeData, loading } = useAnalytics(user?.id);
  const [period, setPeriod] = useState<"30d" | "60d">("30d");

  // Calculate current and prior period metrics
  const { current, prior, alerts } = useMemo(() => {
    if (!youtubeData.length) return { current: null, prior: null, alerts: [] };

    const now = new Date();
    const daysBack = period === "30d" ? 30 : 60;
    const currentPeriodStart = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const priorPeriodStart = new Date(currentPeriodStart.getTime() - daysBack * 24 * 60 * 60 * 1000);

    const currentData = youtubeData.filter(v => {
      const date = new Date(v.publish_date);
      return date >= currentPeriodStart && date <= now;
    });

    const priorData = youtubeData.filter(v => {
      const date = new Date(v.publish_date);
      return date >= priorPeriodStart && date < currentPeriodStart;
    });

    const calcMetrics = (data: typeof youtubeData) => {
      const views = data.reduce((sum, v) => sum + v.views, 0);
      const watchTime = data.reduce((sum, v) => sum + v.watch_time_hours, 0);
      const impressions = data.reduce((sum, v) => sum + v.impressions, 0);
      const ctr = impressions > 0 ? (views / impressions) * 100 : 0;
      const vtr = impressions > 0 ? (views / impressions) : 0;
      return { views, watchTime, impressions, ctr, vtr };
    };

    const current = calcMetrics(currentData);
    const prior = calcMetrics(priorData);

    // Check alerts
    const alerts: string[] = [];
    if (prior.ctr > 0 && ((prior.ctr - current.ctr) / prior.ctr) >= 0.15) {
      alerts.push("CTR dropped ≥15%");
    }
    if (prior.vtr > 0 && ((prior.vtr - current.vtr) / prior.vtr) >= 0.15) {
      alerts.push("VTR dropped ≥15%");
    }

    return { current, prior, alerts };
  }, [youtubeData, period]);

  // Content performance table data with calculated metrics
  const contentPerformance = useMemo(() => {
    return youtubeData.map(video => {
      const vtr = video.impressions > 0 ? (video.views / video.impressions) : 0;
      const watchTimePerView = video.views > 0 ? (video.watch_time_hours * 60) / video.views : 0;
      const subsPerK = video.views > 0 ? (1000 / video.views) : 0;

      return {
        title: video.video_title,
        publishDate: new Date(video.publish_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        views: video.views,
        watchTime: video.watch_time_hours.toFixed(2),
        impressions: video.impressions,
        ctr: video.ctr.toFixed(2),
        vtr: vtr.toFixed(3),
        watchTimePerView: watchTimePerView.toFixed(2),
        subsPerK: subsPerK.toFixed(2),
        url: video.video_url,
      };
    });
  }, [youtubeData]);

  // CTR vs Impressions scatter data
  const scatterData = useMemo(() => {
    return youtubeData.map(v => ({
      impressions: v.impressions,
      ctr: v.ctr,
      views: v.views,
      title: v.video_title.substring(0, 20) + "...",
    }));
  }, [youtubeData]);

  // VTR distribution
  const vtrData = useMemo(() => {
    const median = youtubeData.length > 0 
      ? youtubeData.map(v => v.impressions > 0 ? v.views / v.impressions : 0).sort((a, b) => a - b)[Math.floor(youtubeData.length / 2)]
      : 0;

    return youtubeData.map(v => ({
      title: v.video_title.substring(0, 25) + "...",
      vtr: v.impressions > 0 ? (v.views / v.impressions) : 0,
      isAboveMedian: v.impressions > 0 ? (v.views / v.impressions) >= median : false,
    }));
  }, [youtubeData]);

  const contentColumns = [
    { key: "title", label: "Video Title", sortable: true },
    { key: "publishDate", label: "Published (IST)", sortable: true },
    { key: "views", label: "Views", sortable: true },
    { key: "watchTime", label: "Watch Time (hrs)", sortable: true },
    { key: "impressions", label: "Impressions", sortable: true },
    { key: "ctr", label: "CTR (%)", sortable: true },
    { key: "vtr", label: "VTR", sortable: true },
    { key: "watchTimePerView", label: "Watch/View (min)", sortable: true },
    { key: "subsPerK", label: "Subs/1K Views", sortable: true },
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

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <StatCard
            label="Views"
            value={current?.views.toLocaleString() || "0"}
            growth={current && prior ? calcChange(current.views, prior.views) : 0}
            icon={Eye}
            iconColor="primary"
          />
          <StatCard
            label="Watch Time (hrs)"
            value={current?.watchTime.toFixed(1) || "0"}
            growth={current && prior ? calcChange(current.watchTime, prior.watchTime) : 0}
            icon={Clock}
            iconColor="success"
          />
          <StatCard
            label="Impressions"
            value={current?.impressions.toLocaleString() || "0"}
            growth={current && prior ? calcChange(current.impressions, prior.impressions) : 0}
            icon={Target}
            iconColor="warning"
          />
          <StatCard
            label="CTR (%)"
            value={current?.ctr.toFixed(2) || "0"}
            growth={current && prior ? calcChange(current.ctr, prior.ctr) : 0}
            icon={TrendingUp}
            iconColor="secondary"
          />
          <StatCard
            label="VTR"
            value={current?.vtr.toFixed(3) || "0"}
            growth={current && prior ? calcChange(current.vtr, prior.vtr) : 0}
            icon={PlayCircle}
            iconColor="primary"
          />
        </div>
      </div>

      {/* Content Performance Table */}
      <div className="stat-card">
        <h2 className="mb-4">Content Performance</h2>
        <DataTable
          columns={contentColumns}
          data={contentPerformance}
          onRowClick={(row) => row.url && window.open(row.url, "_blank")}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Thumbnail & Hook Effect - CTR vs Impressions */}
        <div className="stat-card">
          <h2 className="mb-4">Thumbnail & Hook Effect</h2>
          <p className="text-sm text-muted-foreground mb-4">
            CTR vs Impressions (bubble size = Views)
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                type="number" 
                dataKey="impressions" 
                name="Impressions" 
                className="text-xs"
              />
              <YAxis 
                type="number" 
                dataKey="ctr" 
                name="CTR (%)" 
                className="text-xs"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                }}
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Scatter 
                name="Videos" 
                data={scatterData} 
                fill="hsl(var(--primary))"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* View-Through Rate */}
        <div className="stat-card">
          <h2 className="mb-4">View-Through Rate (VTR)</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Views / Impressions by video
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vtrData.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="title" className="text-xs" angle={-45} textAnchor="end" height={80} />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                }}
              />
              <Bar dataKey="vtr" name="VTR">
                {vtrData.slice(0, 10).map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.isAboveMedian ? "hsl(var(--success))" : "hsl(var(--danger))"}
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
