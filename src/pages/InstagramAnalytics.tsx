import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useInstagramData } from "@/hooks/useInstagramData";
import { useInstagramRealtime } from "@/hooks/useInstagramRealtime";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Eye, Users, Heart, MessageCircle, Bookmark, Share2,
  TrendingUp, Image, Video, Clock, AlertCircle
} from "lucide-react";
import { format, subDays } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell
} from "recharts";

const InstagramAnalytics = () => {
  const { user } = useAuth();
  const { dailyMetrics, media, loading: dataLoading, syncDaily, fetchMedia } = useInstagramData(user?.id, 30);
  const { metrics: realtimeMetrics, loading: realtimeLoading } = useInstagramRealtime(user?.id);
  const [period, setPeriod] = useState<"30d" | "60d">("30d");

  const loading = dataLoading || realtimeLoading;

  // Calculate current and prior period metrics
  const { current, prior, alerts } = useMemo(() => {
    if (!dailyMetrics.length) return { current: null, prior: null, alerts: [] };

    const now = new Date();
    const daysBack = period === "30d" ? 30 : 60;
    const currentPeriodStart = subDays(now, daysBack);
    const priorPeriodStart = subDays(currentPeriodStart, daysBack);

    const currentData = dailyMetrics.filter(d => {
      const date = new Date(d.day);
      return date >= currentPeriodStart && date <= now;
    });

    const priorData = dailyMetrics.filter(d => {
      const date = new Date(d.day);
      return date >= priorPeriodStart && date < currentPeriodStart;
    });

    const calcMetrics = (data: typeof dailyMetrics) => {
      const impressions = data.reduce((sum, d) => sum + (d.impressions || 0), 0);
      const reach = data.reduce((sum, d) => sum + (d.reach || 0), 0);
      const profileViews = data.reduce((sum, d) => sum + (d.profileViews || 0), 0);
      const websiteClicks = data.reduce((sum, d) => sum + (d.websiteClicks || 0), 0);
      const engagement = data.reduce((sum, d) => sum + (d.likes || 0) + (d.comments || 0) + (d.saves || 0) + (d.shares || 0), 0);
      return { impressions, reach, profileViews, websiteClicks, engagement };
    };

    const current = calcMetrics(currentData);
    const prior = calcMetrics(priorData);

    // Check alerts
    const alerts: string[] = [];
    if (prior.impressions > 0 && ((prior.impressions - current.impressions) / prior.impressions) >= 0.15) {
      alerts.push("Impressions dropped ≥15%");
    }
    if (prior.reach > 0 && ((prior.reach - current.reach) / prior.reach) >= 0.15) {
      alerts.push("Reach dropped ≥15%");
    }
    if (prior.engagement > 0 && ((prior.engagement - current.engagement) / prior.engagement) >= 0.15) {
      alerts.push("Engagement dropped ≥15%");
    }

    return { current, prior, alerts };
  }, [dailyMetrics, period]);

  // Media performance data
  const mediaPerformance = useMemo(() => {
    if (!media.length) return [];

    return media.map(m => {
      const engagement = (m.likeCount || 0) + (m.commentCount || 0) + (m.saved || 0);
      const engagementRate = m.impressions > 0 ? (engagement / m.impressions) * 100 : 0;

      return {
        media_id: m.media_id,
        media_type: m.media_type,
        caption: m.caption?.substring(0, 60) + (m.caption && m.caption.length > 60 ? '...' : ''),
        timestamp: m.timestamp,
        impressions: m.impressions || 0,
        reach: m.reach || 0,
        likes: m.likeCount || 0,
        comments: m.commentCount || 0,
        saves: m.saved || 0,
        shares: 0,
        engagement,
        engagementRate: engagementRate.toFixed(2),
        permalink: m.permalink,
      };
    })
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 50);
  }, [media]);

  // Daily trend chart
  const dailyTrendData = useMemo(() => {
    const last30Days = dailyMetrics
      .filter(d => new Date(d.day) >= subDays(new Date(), 30))
      .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime())
      .map(d => ({
        date: format(new Date(d.day), "MMM dd"),
        impressions: d.impressions || 0,
        reach: d.reach || 0,
        profileViews: d.profileViews || 0,
        engagement: (d.likes || 0) + (d.comments || 0) + (d.saves || 0) + (d.shares || 0),
        websiteClicks: d.websiteClicks || 0,
      }));

    return last30Days;
  }, [dailyMetrics]);

  const mediaColumns = [
    {
      key: "media_type",
      label: "Type",
      render: (val: string) => (
        <Badge variant="outline" className="capitalize">
          {val === 'IMAGE' && <Image className="h-3 w-3 mr-1" />}
          {val === 'VIDEO' && <Video className="h-3 w-3 mr-1" />}
          {val === 'CAROUSEL_ALBUM' && <Image className="h-3 w-3 mr-1" />}
          {val}
        </Badge>
      )
    },
    {
      key: "caption",
      label: "Caption",
      render: (val: string) => <div className="max-w-md truncate">{val || 'No caption'}</div>
    },
    {
      key: "timestamp",
      label: "Posted",
      render: (val: string) => format(new Date(val), "MMM dd, yyyy")
    },
    {
      key: "impressions",
      label: "Impressions",
      sortable: true,
      render: (val: number) => val.toLocaleString()
    },
    {
      key: "reach",
      label: "Reach",
      sortable: true,
      render: (val: number) => val.toLocaleString()
    },
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
    {
      key: "saves",
      label: "Saves",
      sortable: true,
      render: (val: number) => val.toLocaleString()
    },
    { key: "engagementRate", label: "Engagement %", sortable: true },
  ];

  if (loading && !realtimeMetrics && !dailyMetrics.length) {
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
        <h1 className="mb-2">Instagram Analytics</h1>
        <p className="text-muted-foreground">
          Content performance, audience reach, and engagement insights
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

      {/* Real-time Metrics */}
      {realtimeMetrics && (
        <Card className="p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="mb-1 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Real-time Snapshot
              </h2>
              <p className="text-sm text-muted-foreground">
                Last updated: {realtimeMetrics.lastCaptured ? format(new Date(realtimeMetrics.lastCaptured), "MMM dd, HH:mm") : 'Never'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Followers</p>
              <p className="text-2xl font-bold">{realtimeMetrics.followerCount.toLocaleString()}</p>
              {realtimeMetrics.todayFollowerGrowth !== 0 && (
                <p className="text-xs text-muted-foreground">
                  {realtimeMetrics.todayFollowerGrowth > 0 ? '+' : ''}{realtimeMetrics.todayFollowerGrowth} today
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Following</p>
              <p className="text-2xl font-bold">{realtimeMetrics.followingCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Posts</p>
              <p className="text-2xl font-bold">{realtimeMetrics.mediaCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">48h Growth</p>
              <p className="text-2xl font-bold">{realtimeMetrics.last48HrFollowers > 0 ? '+' : ''}{realtimeMetrics.last48HrFollowers}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">48h Engagement</p>
              <p className="text-2xl font-bold">{realtimeMetrics.last48HrEngagement.toLocaleString()}</p>
            </div>
          </div>
        </Card>
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
            label="Impressions"
            value={current?.impressions.toLocaleString() || "0"}
            growth={current && prior ? calcChange(current.impressions, prior.impressions) : 0}
            icon={Eye}
            iconColor="primary"
          />
          <StatCard
            label="Reach"
            value={current?.reach.toLocaleString() || "0"}
            growth={current && prior ? calcChange(current.reach, prior.reach) : 0}
            icon={Users}
            iconColor="success"
          />
          <StatCard
            label="Profile Views"
            value={current?.profileViews.toLocaleString() || "0"}
            growth={current && prior ? calcChange(current.profileViews, prior.profileViews) : 0}
            icon={Eye}
            iconColor="warning"
          />
          <StatCard
            label="Total Engagement"
            value={current?.engagement.toLocaleString() || "0"}
            growth={current && prior ? calcChange(current.engagement, prior.engagement) : 0}
            icon={Heart}
            iconColor="secondary"
          />
          <StatCard
            label="Website Clicks"
            value={current?.websiteClicks.toLocaleString() || "0"}
            growth={current && prior ? calcChange(current.websiteClicks, prior.websiteClicks) : 0}
            icon={TrendingUp}
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
              <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
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
            <Area yAxisId="left" type="monotone" dataKey="impressions" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorImpressions)" name="Impressions" />
            <Area yAxisId="right" type="monotone" dataKey="reach" stroke="hsl(var(--success))" fillOpacity={1} fill="url(#colorReach)" name="Reach" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Media Performance Table */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="mb-2">Content Performance</h2>
            <p className="text-sm text-muted-foreground">
              Top 50 posts by total engagement
            </p>
          </div>
          <Button onClick={fetchMedia} size="sm" variant="outline">
            Refresh Media
          </Button>
        </div>
        <DataTable
          columns={mediaColumns}
          data={mediaPerformance}
          onRowClick={(row) => row.permalink && window.open(row.permalink, "_blank")}
        />
      </div>

      {/* Engagement Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="stat-card">
          <h2 className="mb-4">Daily Engagement Trend</h2>
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
              <Line type="monotone" dataKey="engagement" stroke="hsl(var(--secondary))" strokeWidth={2} name="Total Engagement" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card">
          <h2 className="mb-4">Profile Views & Website Clicks</h2>
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
              <Legend />
              <Bar dataKey="profileViews" fill="hsl(var(--warning))" name="Profile Views" />
              <Bar dataKey="websiteClicks" fill="hsl(var(--primary))" name="Website Clicks" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default InstagramAnalytics;
