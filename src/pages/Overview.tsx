import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAgents } from "@/hooks/useAgents";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Play, Pause, Settings as SettingsIcon, TrendingUp, TrendingDown } from "lucide-react";
import { format, subDays, isAfter, isBefore } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { DateRangePicker } from "@/components/DateRangePicker";

const Overview = () => {
  const { user } = useAuth();
  const { youtubeData, linkedInData, loading: analyticsLoading } = useAnalytics(user?.id);
  const { agents, runs, loading: agentsLoading, runAgent } = useAgents();
  const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 30), to: new Date() });

  // Calculate KPIs for last 30/90 days
  const kpis = useMemo(() => {
    const now = new Date();
    const days30Ago = subDays(now, 30);
    const days60Ago = subDays(now, 60);
    const days90Ago = subDays(now, 90);

    // YouTube metrics
    const ytLast30 = youtubeData.filter((v) => 
      v.publish_date && isAfter(new Date(v.publish_date), days30Ago)
    );
    const ytPrev30 = youtubeData.filter((v) => 
      v.publish_date && isAfter(new Date(v.publish_date), days60Ago) && isBefore(new Date(v.publish_date), days30Ago)
    );

    const ytViews30 = ytLast30.reduce((sum, v) => sum + v.views, 0);
    const ytViewsPrev30 = ytPrev30.reduce((sum, v) => sum + v.views, 0);
    const ytViewsGrowth = ytViewsPrev30 > 0 ? ((ytViews30 - ytViewsPrev30) / ytViewsPrev30) * 100 : 0;

    const ytWatchTime30 = ytLast30.reduce((sum, v) => sum + v.watch_time_hours, 0);
    const ytAvgWatch = ytLast30.length > 0 ? ytWatchTime30 / ytLast30.length : 0;

    // LinkedIn metrics
    const liLast30 = linkedInData.filter((d) => 
      isAfter(new Date(d.date), days30Ago)
    );
    const liPrev30 = linkedInData.filter((d) => 
      isAfter(new Date(d.date), days60Ago) && isBefore(new Date(d.date), days30Ago)
    );

    const liImpressions30 = liLast30.reduce((sum, d) => sum + d.impressions, 0);
    const liImpressionsPrev30 = liPrev30.reduce((sum, d) => sum + d.impressions, 0);
    const liImpressionsGrowth = liImpressionsPrev30 > 0 ? ((liImpressions30 - liImpressionsPrev30) / liImpressionsPrev30) * 100 : 0;

    const liEngagement30 = liLast30.reduce((sum, d) => sum + d.engagement, 0);
    const liEngagementRate = liImpressions30 > 0 ? (liEngagement30 / liImpressions30) * 100 : 0;

    return {
      ytViews30,
      ytViewsGrowth,
      ytWatchTime30,
      ytAvgWatch,
      liImpressions30,
      liImpressionsGrowth,
      liEngagement30,
      liEngagementRate,
    };
  }, [youtubeData, linkedInData]);

  // Prepare 30-day growth chart
  const chartData = useMemo(() => {
    const now = new Date();
    const days30Ago = subDays(now, 30);
    
    const dateMap = new Map<string, { youtube: number; linkedin: number; sortDate: Date }>();
    
    youtubeData.forEach((video) => {
      if (video.publish_date && isAfter(new Date(video.publish_date), days30Ago)) {
        const videoDate = new Date(video.publish_date);
        const date = format(videoDate, "MMM dd");
        const existing = dateMap.get(date) || { youtube: 0, linkedin: 0, sortDate: videoDate };
        dateMap.set(date, { 
          youtube: existing.youtube + video.views,
          linkedin: existing.linkedin,
          sortDate: existing.sortDate
        });
      }
    });

    linkedInData.forEach((day) => {
      if (isAfter(new Date(day.date), days30Ago)) {
        const dayDate = new Date(day.date);
        const date = format(dayDate, "MMM dd");
        const existing = dateMap.get(date) || { youtube: 0, linkedin: 0, sortDate: dayDate };
        dateMap.set(date, { 
          youtube: existing.youtube,
          linkedin: existing.linkedin + day.impressions,
          sortDate: existing.sortDate
        });
      }
    });

    return Array.from(dateMap.entries())
      .map(([date, values]) => ({ date, youtube: values.youtube, linkedin: values.linkedin, sortDate: values.sortDate }))
      .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
      .map(({ date, youtube, linkedin }) => ({ date, youtube, linkedin }));
  }, [youtubeData, linkedInData]);

  // Agents table columns
  const agentColumns = [
    { 
      key: "name", 
      label: "Agent Name",
      render: (value: string, row: any) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.pillar}</div>
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (value: string) => (
        <Badge
          variant="outline"
          className={
            value === "idle"
              ? "bg-muted"
              : value === "running"
              ? "bg-primary/10 text-primary"
              : value === "error"
              ? "bg-destructive/10 text-destructive"
              : "bg-warning/10 text-warning"
          }
        >
          {value}
        </Badge>
      ),
    },
    {
      key: "last_run_at",
      label: "Last Run",
      render: (value: string | null) =>
        value ? format(new Date(value), "MMM dd, HH:mm") : "Never",
    },
    {
      key: "avg_latency_ms",
      label: "Avg Latency",
      render: (value: number) => `${value}ms`,
    },
    {
      key: "success_rate",
      label: "Success %",
      render: (value: number) => `${value.toFixed(1)}%`,
    },
    {
      key: "actions",
      label: "Actions",
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => runAgent(row.id)}
            disabled={row.status === "running"}
          >
            <Play className="h-3 w-3 mr-1" />
            Run
          </Button>
        </div>
      ),
    },
  ];

  // Latest runs
  const latestRuns = runs.slice(0, 10);
  const runColumns = [
    {
      key: "agent_id",
      label: "Agent",
      render: (agentId: string) => {
        const agent = agents.find((a) => a.id === agentId);
        return agent?.name || "Unknown";
      },
    },
    {
      key: "status",
      label: "Status",
      render: (value: string) => (
        <Badge
          variant="outline"
          className={
            value === "success"
              ? "bg-success/10 text-success"
              : value === "error"
              ? "bg-destructive/10 text-destructive"
              : value === "running"
              ? "bg-primary/10 text-primary"
              : "bg-muted"
          }
        >
          {value}
        </Badge>
      ),
    },
    {
      key: "started_at",
      label: "Started",
      render: (value: string) => format(new Date(value), "MMM dd, HH:mm"),
    },
    {
      key: "latency_ms",
      label: "Duration",
      render: (value: number | null) => (value ? `${value}ms` : "-"),
    },
  ];

  if (analyticsLoading || agentsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl">
      <div>
        <h1 className="mb-2">Welcome to ASM Control Panel</h1>
        <p className="text-muted-foreground">
          Monitor your social media performance and orchestrate your agents
        </p>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 border-none shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">Total YT Views</p>
            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <p className="text-4xl font-bold mb-2">
            {(kpis.ytViews30 / 1000000).toFixed(1)}M
          </p>
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary" 
              className={`${kpis.ytViewsGrowth > 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'} text-xs font-semibold`}
            >
              {kpis.ytViewsGrowth > 0 ? "↗" : "↘"} {kpis.ytViewsGrowth > 0 ? "+" : ""}{Math.round(kpis.ytViewsGrowth)}%
            </Badge>
            <span className="text-xs text-muted-foreground">vs last 30 days</span>
          </div>
        </Card>

        <Card className="p-6 border-none shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">LI Impressions</p>
            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <p className="text-4xl font-bold mb-2">
            {(kpis.liImpressions30 / 1000000).toFixed(1)}M
          </p>
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary" 
              className={`${kpis.liImpressionsGrowth > 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'} text-xs font-semibold`}
            >
              {kpis.liImpressionsGrowth > 0 ? "↗" : "↘"} {kpis.liImpressionsGrowth > 0 ? "+" : ""}{Math.round(kpis.liImpressionsGrowth)}%
            </Badge>
            <span className="text-xs text-muted-foreground">vs last 30 days</span>
          </div>
        </Card>

        <Card className="p-6 border-none shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">Engagement Rate</p>
            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <p className="text-4xl font-bold mb-2">
            {kpis.liEngagementRate.toFixed(1)}%
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary text-xs font-semibold">
              ↗ +0.8%
            </Badge>
            <span className="text-xs text-muted-foreground">vs last 30 days</span>
          </div>
        </Card>

        <Card className="p-6 border-none shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">Avg Watch %</p>
            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <p className="text-4xl font-bold mb-2">
            42%
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-destructive/10 text-destructive text-xs font-semibold">
              ↘ -2.1%
            </Badge>
            <span className="text-xs text-muted-foreground">vs last 30 days</span>
          </div>
        </Card>
      </div>

      {/* 30-Day Growth Chart */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="mb-1">30-Day Platform Trends</h2>
          </div>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
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
              dataKey="youtube"
              stroke="hsl(var(--danger))"
              strokeWidth={2}
              name="YouTube Views"
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="linkedin"
              stroke="hsl(var(--linkedin))"
              strokeWidth={2}
              name="LinkedIn Impressions"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Agents Status */}
      <Card className="p-8 border-none shadow-sm">
        <div className="mb-6">
          <h2 className="mb-2">Agents Status</h2>
          <p className="text-sm text-muted-foreground">
            Overview of your social media agents
          </p>
        </div>
        
        {agents.length > 0 ? (
          <DataTable columns={agentColumns} data={agents} />
        ) : (
          <div className="flex items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">
              Agent status will be displayed here. Navigate to Settings to configure agents.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Overview;
