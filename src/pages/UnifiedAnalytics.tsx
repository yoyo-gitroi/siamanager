import { useState, useMemo } from "react";
import { useExcelData } from "@/hooks/useExcelData";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import AIChat from "@/components/AIChat";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Clock, Users, TrendingUp, AlertCircle, Target, PlayCircle, BarChart3 } from "lucide-react";
import { 
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell 
} from "recharts";

const UnifiedAnalytics = () => {
  const { linkedInData, youtubeData, loading, error } = useExcelData();
  const [period, setPeriod] = useState<"7d" | "30d">("30d");
  const [activeTab, setActiveTab] = useState<"overview" | "youtube" | "linkedin">("overview");

  // Calculate YouTube metrics
  const youtubeMetrics = useMemo(() => {
    if (!youtubeData.length) return { current: null, prior: null, alerts: [] };

    const now = new Date();
    const daysBack = period === "7d" ? 7 : 30;
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

    const alerts: string[] = [];
    if (prior.ctr > 0 && ((prior.ctr - current.ctr) / prior.ctr) >= 0.15) {
      alerts.push("YouTube CTR dropped ≥15%");
    }
    if (prior.vtr > 0 && ((prior.vtr - current.vtr) / prior.vtr) >= 0.15) {
      alerts.push("YouTube VTR dropped ≥15%");
    }

    return { current, prior, alerts };
  }, [youtubeData, period]);

  // Calculate LinkedIn metrics
  const linkedInMetrics = useMemo(() => {
    if (!linkedInData.length) return { current: null, prior: null, alerts: [] };

    const now = new Date();
    const daysBack = period === "7d" ? 7 : 30;
    const currentPeriodStart = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const priorPeriodStart = new Date(currentPeriodStart.getTime() - daysBack * 24 * 60 * 60 * 1000);

    const currentData = linkedInData.filter(d => {
      const date = new Date(d.date);
      return date >= currentPeriodStart && date <= now;
    });

    const priorData = linkedInData.filter(d => {
      const date = new Date(d.date);
      return date >= priorPeriodStart && date < currentPeriodStart;
    });

    const calcMetrics = (data: typeof linkedInData) => {
      const impressions = data.reduce((sum, d) => sum + d.impressions, 0);
      const engagements = data.reduce((sum, d) => sum + d.engagement, 0);
      const er = impressions > 0 ? (engagements / impressions) * 100 : 0;
      return { impressions, engagements, er };
    };

    const current = calcMetrics(currentData);
    const prior = calcMetrics(priorData);

    const alerts: string[] = [];
    if (prior.er > 0 && (prior.er - current.er) >= 0.6) {
      alerts.push("LinkedIn ER down ≥0.6 percentage points");
    }
    if (prior.impressions > 0 && ((prior.impressions - current.impressions) / prior.impressions) >= 0.15) {
      alerts.push("LinkedIn Impressions down ≥15%");
    }

    return { current, prior, alerts };
  }, [linkedInData, period]);

  // Content performance table
  const contentPerformance = useMemo(() => {
    return youtubeData.slice(0, 50).map(video => {
      const vtr = video.impressions > 0 ? (video.views / video.impressions) : 0;
      const watchTimePerView = video.views > 0 ? (video.watch_time_hours * 60) / video.views : 0;

      return {
        title: video.video_title,
        publishDate: video.publish_date,
        views: video.views.toLocaleString(),
        watchTime: video.watch_time_hours.toFixed(2),
        impressions: video.impressions.toLocaleString(),
        ctr: video.ctr.toFixed(2),
        vtr: vtr.toFixed(3),
        watchTimePerView: watchTimePerView.toFixed(2),
        url: video.video_url,
      };
    });
  }, [youtubeData]);

  // CTR vs Impressions scatter
  const scatterData = useMemo(() => {
    return youtubeData.slice(0, 50).map(v => ({
      impressions: v.impressions,
      ctr: v.ctr,
      views: v.views,
      title: v.video_title.substring(0, 20) + "...",
    }));
  }, [youtubeData]);

  // LinkedIn daily chart
  const linkedInChartData = useMemo(() => {
    const daysBack = period === "7d" ? 7 : 30;
    return linkedInData.slice(-daysBack).map(d => ({
      date: new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      impressions: d.impressions,
      engagements: d.engagement,
      er: d.impressions > 0 ? (d.engagement / d.impressions) * 100 : 0,
    }));
  }, [linkedInData, period]);

  const contentColumns = [
    { key: "title", label: "Video Title", sortable: true },
    { key: "publishDate", label: "Published", sortable: true },
    { key: "views", label: "Views", sortable: true },
    { key: "watchTime", label: "Watch Time (hrs)", sortable: true },
    { key: "impressions", label: "Impressions", sortable: true },
    { key: "ctr", label: "CTR (%)", sortable: true },
    { key: "vtr", label: "VTR", sortable: true },
    { key: "watchTimePerView", label: "Watch/View (min)", sortable: true },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-danger mx-auto mb-4" />
          <p className="text-danger">{error}</p>
        </div>
      </div>
    );
  }

  const calcChange = (curr: number, prev: number) => {
    if (!prev) return 0;
    return ((curr - prev) / prev) * 100;
  };

  const allAlerts = [...youtubeMetrics.alerts, ...linkedInMetrics.alerts];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="mb-2">Analytics</h1>
        <p className="text-muted-foreground">
          Deep dive into your YouTube and LinkedIn performance
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="youtube">YouTube Deep Dive</TabsTrigger>
          <TabsTrigger value="linkedin">LinkedIn Deep Dive</TabsTrigger>
          <TabsTrigger value="correlation">Correlation Story</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 mt-6">
          {/* Alerts */}
          {allAlerts.length > 0 && (
            <div className="stat-card border-danger/50 bg-danger/5">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-danger mt-0.5" />
                <div>
                  <h3 className="font-semibold text-danger mb-2">Performance Alerts</h3>
                  <ul className="space-y-1">
                    {allAlerts.map((alert, i) => (
                      <li key={i} className="text-sm text-danger/80">• {alert}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Period Selector */}
          <div className="flex items-center justify-end gap-2">
            <Button 
              variant={period === "7d" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setPeriod("7d")}
            >
              Last 7d
            </Button>
            <Button 
              variant={period === "30d" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setPeriod("30d")}
            >
              Last 30d
            </Button>
          </div>

          {/* Cross-Platform KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              label="YouTube Views"
              value={youtubeMetrics.current?.views.toLocaleString() || "0"}
              growth={youtubeMetrics.current && youtubeMetrics.prior ? calcChange(youtubeMetrics.current.views, youtubeMetrics.prior.views) : 0}
              icon={Eye}
              iconColor="primary"
            />
            <StatCard
              label="YouTube CTR (%)"
              value={youtubeMetrics.current?.ctr.toFixed(2) || "0"}
              growth={youtubeMetrics.current && youtubeMetrics.prior ? calcChange(youtubeMetrics.current.ctr, youtubeMetrics.prior.ctr) : 0}
              icon={Target}
              iconColor="success"
            />
            <StatCard
              label="LinkedIn Impressions"
              value={linkedInMetrics.current?.impressions.toLocaleString() || "0"}
              growth={linkedInMetrics.current && linkedInMetrics.prior ? calcChange(linkedInMetrics.current.impressions, linkedInMetrics.prior.impressions) : 0}
              icon={TrendingUp}
              iconColor="warning"
            />
            <StatCard
              label="LinkedIn ER (%)"
              value={linkedInMetrics.current?.er.toFixed(2) || "0"}
              growth={linkedInMetrics.current && linkedInMetrics.prior ? calcChange(linkedInMetrics.current.er, linkedInMetrics.prior.er) : 0}
              icon={BarChart3}
              iconColor="secondary"
            />
          </div>

          {/* AI Chat Assistant */}
          <AIChat />
        </TabsContent>

        <TabsContent value="youtube" className="space-y-8 mt-6">
          {/* YouTube Executive Snapshot */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <StatCard
              label="Views"
              value={youtubeMetrics.current?.views.toLocaleString() || "0"}
              growth={youtubeMetrics.current && youtubeMetrics.prior ? calcChange(youtubeMetrics.current.views, youtubeMetrics.prior.views) : 0}
              icon={Eye}
              iconColor="primary"
            />
            <StatCard
              label="Watch Time (hrs)"
              value={youtubeMetrics.current?.watchTime.toFixed(1) || "0"}
              growth={youtubeMetrics.current && youtubeMetrics.prior ? calcChange(youtubeMetrics.current.watchTime, youtubeMetrics.prior.watchTime) : 0}
              icon={Clock}
              iconColor="success"
            />
            <StatCard
              label="Impressions"
              value={youtubeMetrics.current?.impressions.toLocaleString() || "0"}
              growth={youtubeMetrics.current && youtubeMetrics.prior ? calcChange(youtubeMetrics.current.impressions, youtubeMetrics.prior.impressions) : 0}
              icon={Target}
              iconColor="warning"
            />
            <StatCard
              label="CTR (%)"
              value={youtubeMetrics.current?.ctr.toFixed(2) || "0"}
              growth={youtubeMetrics.current && youtubeMetrics.prior ? calcChange(youtubeMetrics.current.ctr, youtubeMetrics.prior.ctr) : 0}
              icon={TrendingUp}
              iconColor="secondary"
            />
            <StatCard
              label="VTR"
              value={youtubeMetrics.current?.vtr.toFixed(3) || "0"}
              growth={youtubeMetrics.current && youtubeMetrics.prior ? calcChange(youtubeMetrics.current.vtr, youtubeMetrics.prior.vtr) : 0}
              icon={PlayCircle}
              iconColor="primary"
            />
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

          {/* CTR vs Impressions Scatter */}
          <div className="stat-card">
            <h2 className="mb-4">Thumbnail & Hook Effect</h2>
            <p className="text-sm text-muted-foreground mb-4">
              CTR vs Impressions (bubble size = Views)
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" dataKey="impressions" name="Impressions" className="text-xs" />
                <YAxis type="number" dataKey="ctr" name="CTR (%)" className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                  }}
                />
                <Scatter name="Videos" data={scatterData} fill="hsl(var(--primary))" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="linkedin" className="space-y-8 mt-6">
          {/* LinkedIn Weekly Health */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              label="Impressions"
              value={linkedInMetrics.current?.impressions.toLocaleString() || "0"}
              growth={linkedInMetrics.current && linkedInMetrics.prior ? calcChange(linkedInMetrics.current.impressions, linkedInMetrics.prior.impressions) : 0}
              icon={Target}
              iconColor="primary"
            />
            <StatCard
              label="Engagements"
              value={linkedInMetrics.current?.engagements.toLocaleString() || "0"}
              growth={linkedInMetrics.current && linkedInMetrics.prior ? calcChange(linkedInMetrics.current.engagements, linkedInMetrics.prior.engagements) : 0}
              icon={TrendingUp}
              iconColor="success"
            />
            <StatCard
              label="Engagement Rate (%)"
              value={linkedInMetrics.current?.er.toFixed(2) || "0"}
              growth={linkedInMetrics.current && linkedInMetrics.prior ? calcChange(linkedInMetrics.current.er, linkedInMetrics.prior.er) : 0}
              icon={BarChart3}
              iconColor="warning"
            />
          </div>

          {/* Daily Performance Chart */}
          <div className="stat-card">
            <h2 className="mb-4">Daily Performance</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={linkedInChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" />
                <YAxis yAxisId="right" orientation="right" className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="impressions"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Impressions"
                  dot={{ r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="engagements"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  name="Engagements"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
        
        <TabsContent value="correlation" className="space-y-6 mt-6">
          <div className="stat-card">
            <h2 className="mb-4">Cross-Platform Correlation</h2>
            <div className="flex items-center justify-center py-16 text-center">
              <p className="text-muted-foreground">
                Correlation analysis will be displayed here once sufficient data is available
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedAnalytics;
