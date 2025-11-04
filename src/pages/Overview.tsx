import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useYouTubeData } from "@/hooks/useYouTubeData";
import { useAgents } from "@/hooks/useAgents";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Play, Eye, TrendingUp, DollarSign, Users } from "lucide-react";
import { format, subDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { DateRangePicker } from "@/components/DateRangePicker";
const Overview = () => {
  const { user } = useAuth();
  const { channelData, revenueData, loading: ytLoading } = useYouTubeData(user?.id, 60);
  const { agents, runs, loading: agentsLoading, runAgent } = useAgents();
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  });

  // Calculate KPIs from channel data
  const kpis = useMemo(() => {
    if (!channelData.length) {
      return {
        views30: 0, viewsGrowth: 0,
        watchHours30: 0, watchGrowth: 0,
        subscribers30: 0, subsGrowth: 0,
        revenue30: 0, revenueGrowth: 0
      };
    }

    const now = new Date();
    const days30Ago = subDays(now, 30);
    const days60Ago = subDays(now, 60);

    // Last 30 days
    const last30 = channelData.filter(d => new Date(d.day) >= days30Ago);
    const prev30 = channelData.filter(d => {
      const date = new Date(d.day);
      return date >= days60Ago && date < days30Ago;
    });

    const views30 = last30.reduce((sum, d) => sum + (d.views || 0), 0);
    const viewsPrev = prev30.reduce((sum, d) => sum + (d.views || 0), 0);
    const viewsGrowth = viewsPrev > 0 ? ((views30 - viewsPrev) / viewsPrev) * 100 : 0;

    const watchHours30 = last30.reduce((sum, d) => sum + (d.watch_time_seconds || 0), 0) / 3600;
    const watchPrev = prev30.reduce((sum, d) => sum + (d.watch_time_seconds || 0), 0) / 3600;
    const watchGrowth = watchPrev > 0 ? ((watchHours30 - watchPrev) / watchPrev) * 100 : 0;

    const subsGained30 = last30.reduce((sum, d) => sum + (d.subscribers_gained || 0), 0);
    const subsLost30 = last30.reduce((sum, d) => sum + (d.subscribers_lost || 0), 0);
    const subscribers30 = subsGained30 - subsLost30;
    
    const subsGainedPrev = prev30.reduce((sum, d) => sum + (d.subscribers_gained || 0), 0);
    const subsLostPrev = prev30.reduce((sum, d) => sum + (d.subscribers_lost || 0), 0);
    const subscribersPrev = subsGainedPrev - subsLostPrev;
    const subsGrowth = subscribersPrev !== 0 ? ((subscribers30 - subscribersPrev) / Math.abs(subscribersPrev)) * 100 : 0;

    const revenue30 = last30.reduce((sum, d) => sum + (Number(d.estimated_revenue) || 0), 0);
    const revenuePrev = prev30.reduce((sum, d) => sum + (Number(d.estimated_revenue) || 0), 0);
    const revenueGrowth = revenuePrev > 0 ? ((revenue30 - revenuePrev) / revenuePrev) * 100 : 0;

    return {
      views30,
      viewsGrowth,
      watchHours30,
      watchGrowth,
      subscribers30,
      subsGrowth,
      revenue30,
      revenueGrowth
    };
  }, [channelData]);

  // Prepare 30-day growth chart
  const chartData = useMemo(() => {
    const now = new Date();
    const days30Ago = subDays(now, 30);
    
    const last30Days = channelData
      .filter(d => new Date(d.day) >= days30Ago)
      .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime())
      .map(d => ({
        date: format(new Date(d.day), "MMM dd"),
        views: d.views || 0,
        watchHours: (d.watch_time_seconds || 0) / 3600,
        revenue: Number(d.estimated_revenue) || 0,
        subscribers: (d.subscribers_gained || 0) - (d.subscribers_lost || 0)
      }));

    return last30Days;
  }, [channelData]);

  // Agents table columns
  const agentColumns = [{
    key: "name",
    label: "Agent Name",
    render: (value: string, row: any) => <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.pillar}</div>
        </div>
  }, {
    key: "status",
    label: "Status",
    render: (value: string) => <Badge variant="outline" className={value === "idle" ? "bg-muted" : value === "running" ? "bg-primary/10 text-primary" : value === "error" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}>
          {value}
        </Badge>
  }, {
    key: "last_run_at",
    label: "Last Run",
    render: (value: string | null) => value ? format(new Date(value), "MMM dd, HH:mm") : "Never"
  }, {
    key: "avg_latency_ms",
    label: "Avg Latency",
    render: (value: number) => `${value}ms`
  }, {
    key: "success_rate",
    label: "Success %",
    render: (value: number) => `${value.toFixed(1)}%`
  }, {
    key: "actions",
    label: "Actions",
    render: (_: any, row: any) => <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => runAgent(row.id)} disabled={row.status === "running"}>
            <Play className="h-3 w-3 mr-1" />
            Run
          </Button>
        </div>
  }];

  // Latest runs
  const latestRuns = runs.slice(0, 10);
  const runColumns = [{
    key: "agent_id",
    label: "Agent",
    render: (agentId: string) => {
      const agent = agents.find(a => a.id === agentId);
      return agent?.name || "Unknown";
    }
  }, {
    key: "status",
    label: "Status",
    render: (value: string) => <Badge variant="outline" className={value === "success" ? "bg-success/10 text-success" : value === "error" ? "bg-destructive/10 text-destructive" : value === "running" ? "bg-primary/10 text-primary" : "bg-muted"}>
          {value}
        </Badge>
  }, {
    key: "started_at",
    label: "Started",
    render: (value: string) => format(new Date(value), "MMM dd, HH:mm")
  }, {
    key: "latency_ms",
    label: "Duration",
    render: (value: number | null) => value ? `${value}ms` : "-"
  }];
  if (ytLoading || agentsLoading) {
    return <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>;
  }
  return <div className="space-y-8 animate-fade-in max-w-7xl">
      <div>
        <h1 className="mb-2">Welcome to SIA Control Panel</h1>
        <p className="text-muted-foreground">
          Monitor your social media performance and orchestrate your agents
        </p>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Views (30d)"
          value={kpis.views30 >= 1000000 ? `${(kpis.views30 / 1000000).toFixed(1)}M` : kpis.views30.toLocaleString()}
          growth={kpis.viewsGrowth}
          icon={Eye}
          iconColor="primary"
        />
        <StatCard
          label="Watch Hours (30d)"
          value={kpis.watchHours30.toFixed(0)}
          growth={kpis.watchGrowth}
          icon={TrendingUp}
          iconColor="success"
        />
        <StatCard
          label="Net Subscribers (30d)"
          value={kpis.subscribers30 >= 0 ? `+${kpis.subscribers30.toLocaleString()}` : kpis.subscribers30.toLocaleString()}
          growth={kpis.subsGrowth}
          icon={Users}
          iconColor="warning"
        />
        <StatCard
          label="Revenue (30d)"
          value={`$${kpis.revenue30.toFixed(2)}`}
          growth={kpis.revenueGrowth}
          icon={DollarSign}
          iconColor="secondary"
        />
      </div>

      {/* 30-Day Growth Chart */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="mb-1">30-Day Performance Trends</h2>
          </div>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-xs" />
            <YAxis yAxisId="left" className="text-xs" />
            <YAxis yAxisId="right" orientation="right" className="text-xs" />
            <Tooltip contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px"
            }} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} name="Views" dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="watchHours" stroke="hsl(var(--success))" strokeWidth={2} name="Watch Hours" dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(var(--warning))" strokeWidth={2} name="Revenue ($)" dot={false} />
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
        
        {agents.length > 0 ? <DataTable columns={agentColumns} data={agents} /> : <div className="flex items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">
              Agent status will be displayed here. Navigate to Settings to configure agents.
            </p>
          </div>}
      </Card>
    </div>;
};
export default Overview;