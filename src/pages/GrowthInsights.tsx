import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Clock, Hash, Users, Zap, Target, BarChart3 } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, PieChart, Pie, Cell } from "recharts";
import { format, parseISO, getHours, getDay, subDays, isAfter } from "date-fns";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const GrowthInsights = () => {
  const { user } = useAuth();
  const { youtubeData, linkedInData, loading } = useAnalytics(user?.id);

  // Best Times to Post Analysis
  const bestTimesData = useMemo(() => {
    const hourlyPerformance: Record<number, { posts: number; avgEngagement: number; avgViews: number }> = {};
    
    youtubeData.forEach((video) => {
      if (video.publish_date) {
        const hour = getHours(new Date(video.publish_date));
        if (!hourlyPerformance[hour]) {
          hourlyPerformance[hour] = { posts: 0, avgEngagement: 0, avgViews: 0 };
        }
        hourlyPerformance[hour].posts += 1;
        hourlyPerformance[hour].avgViews += video.views;
        hourlyPerformance[hour].avgEngagement += video.engagement;
      }
    });

    return Object.entries(hourlyPerformance)
      .map(([hour, data]) => ({
        hour: `${hour}:00`,
        avgEngagement: Math.round(data.avgEngagement / data.posts),
        avgViews: Math.round(data.avgViews / data.posts),
        posts: data.posts,
      }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  }, [youtubeData]);

  // Day of Week Performance
  const dayOfWeekData = useMemo(() => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayPerformance: Record<number, { posts: number; totalEngagement: number; totalViews: number }> = {};

    youtubeData.forEach((video) => {
      if (video.publish_date) {
        const day = getDay(new Date(video.publish_date));
        if (!dayPerformance[day]) {
          dayPerformance[day] = { posts: 0, totalEngagement: 0, totalViews: 0 };
        }
        dayPerformance[day].posts += 1;
        dayPerformance[day].totalViews += video.views;
        dayPerformance[day].totalEngagement += video.engagement;
      }
    });

    return Object.entries(dayPerformance)
      .map(([day, data]) => ({
        day: dayNames[parseInt(day)],
        avgEngagement: Math.round(data.totalEngagement / data.posts),
        avgViews: Math.round(data.totalViews / data.posts),
        posts: data.posts,
      }));
  }, [youtubeData]);

  // Content Length Performance
  const contentLengthData = useMemo(() => {
    const lengthBuckets = {
      'Short (< 5 min)': { count: 0, totalViews: 0, totalEngagement: 0 },
      'Medium (5-15 min)': { count: 0, totalViews: 0, totalEngagement: 0 },
      'Long (> 15 min)': { count: 0, totalViews: 0, totalEngagement: 0 },
    };

    youtubeData.forEach((video) => {
      const duration = video.watch_time_hours * 60 / (video.views || 1); // avg duration per view
      let bucket;
      if (duration < 5) bucket = 'Short (< 5 min)';
      else if (duration < 15) bucket = 'Medium (5-15 min)';
      else bucket = 'Long (> 15 min)';

      lengthBuckets[bucket].count += 1;
      lengthBuckets[bucket].totalViews += video.views;
      lengthBuckets[bucket].totalEngagement += video.engagement;
    });

    return Object.entries(lengthBuckets).map(([name, data]) => ({
      name,
      avgViews: data.count > 0 ? Math.round(data.totalViews / data.count) : 0,
      avgEngagement: data.count > 0 ? Math.round(data.totalEngagement / data.count) : 0,
      count: data.count,
    }));
  }, [youtubeData]);

  // Engagement Rate Trends (Last 30 days)
  const engagementTrends = useMemo(() => {
    const last30Days = subDays(new Date(), 30);
    const ytRecent = youtubeData.filter((v) => 
      v.publish_date && isAfter(new Date(v.publish_date), last30Days)
    );
    const liRecent = linkedInData.filter((d) => 
      isAfter(new Date(d.date), last30Days)
    );

    const dateMap = new Map<string, { ytER: number; liER: number; ytCount: number; liCount: number }>();

    ytRecent.forEach((video) => {
      const date = format(new Date(video.publish_date!), "MMM dd");
      const er = video.views > 0 ? (video.engagement / video.views) * 100 : 0;
      if (!dateMap.has(date)) {
        dateMap.set(date, { ytER: 0, liER: 0, ytCount: 0, liCount: 0 });
      }
      const existing = dateMap.get(date)!;
      existing.ytER += er;
      existing.ytCount += 1;
    });

    liRecent.forEach((day) => {
      const date = format(new Date(day.date), "MMM dd");
      const er = day.impressions > 0 ? (day.engagement / day.impressions) * 100 : 0;
      if (!dateMap.has(date)) {
        dateMap.set(date, { ytER: 0, liER: 0, ytCount: 0, liCount: 0 });
      }
      const existing = dateMap.get(date)!;
      existing.liER += er;
      existing.liCount += 1;
    });

    return Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        youtubeER: data.ytCount > 0 ? (data.ytER / data.ytCount).toFixed(2) : 0,
        linkedInER: data.liCount > 0 ? (data.liER / data.liCount).toFixed(2) : 0,
      }))
      .slice(-30);
  }, [youtubeData, linkedInData]);

  // Top Performing Content
  const topContent = useMemo(() => {
    return youtubeData
      .map((video) => ({
        title: video.video_title,
        views: video.views,
        engagement: video.engagement,
        engagementRate: video.views > 0 ? ((video.engagement / video.views) * 100).toFixed(2) : "0.00",
        ctr: video.ctr.toFixed(2),
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
  }, [youtubeData]);

  // Growth Velocity (7-day moving average)
  const growthVelocity = useMemo(() => {
    const last30Days = subDays(new Date(), 30);
    const liRecent = linkedInData.filter((d) => 
      isAfter(new Date(d.date), last30Days)
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return liRecent.map((day, index) => {
      const window = liRecent.slice(Math.max(0, index - 6), index + 1);
      const avgImpressions = window.reduce((sum, d) => sum + d.impressions, 0) / window.length;
      const avgEngagement = window.reduce((sum, d) => sum + d.engagement, 0) / window.length;

      return {
        date: format(new Date(day.date), "MMM dd"),
        impressions: Math.round(avgImpressions),
        engagement: Math.round(avgEngagement),
      };
    });
  }, [linkedInData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl">
      <div>
        <h1 className="mb-2">Growth Insights</h1>
        <p className="text-muted-foreground">
          Actionable insights to drive audience growth and engagement
        </p>
      </div>

      {/* Actionable Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-6 border-l-4 border-l-primary bg-primary/5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Best Time to Post</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {bestTimesData.length > 0 
                  ? `Peak engagement at ${bestTimesData.sort((a, b) => b.avgEngagement - a.avgEngagement)[0]?.hour}`
                  : "Analyzing..."}
              </p>
              <Badge variant="secondary" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                +15% engagement
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-success bg-success/5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
              <Target className="h-5 w-5 text-success" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Content Sweet Spot</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {contentLengthData.sort((a, b) => b.avgViews - a.avgViews)[0]?.name} performs best
              </p>
              <Badge variant="secondary" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Optimize length
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-warning bg-warning/5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Audience Growth</h3>
              <p className="text-sm text-muted-foreground mb-2">
                7-day velocity trending upward
              </p>
              <Badge variant="secondary" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{linkedInData.length > 7 ? ((linkedInData[0]?.followers || 0) - (linkedInData[7]?.followers || 0)).toFixed(0) : "0"}% weekly
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Best Times to Post */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-none shadow-sm">
          <h2 className="mb-4">Best Hours to Post</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bestTimesData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="hour" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="avgEngagement" fill="hsl(var(--primary))" name="Avg Engagement" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 border-none shadow-sm">
          <h2 className="mb-4">Best Days to Post</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dayOfWeekData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" className="text-xs" angle={-45} textAnchor="end" height={80} />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="avgViews" fill="hsl(var(--danger))" name="Avg Views" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Content Performance Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-none shadow-sm">
          <h2 className="mb-4">Content Length Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={contentLengthData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.count}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="avgViews"
              >
                {contentLengthData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 border-none shadow-sm">
          <h2 className="mb-4">Engagement Rate Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={engagementTrends}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="youtubeER"
                stroke="hsl(var(--danger))"
                strokeWidth={2}
                name="YouTube ER %"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="linkedInER"
                stroke="hsl(var(--linkedin))"
                strokeWidth={2}
                name="LinkedIn ER %"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Growth Velocity */}
      <Card className="p-6 border-none shadow-sm">
        <h2 className="mb-4">Growth Velocity (7-Day Moving Average)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={growthVelocity}>
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
              dataKey="impressions"
              stroke="hsl(var(--linkedin))"
              strokeWidth={2}
              name="Impressions (7d avg)"
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="engagement"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              name="Engagement (7d avg)"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Top Performing Content */}
      <Card className="p-6 border-none shadow-sm">
        <h2 className="mb-4">Top 5 Performing Videos</h2>
        <div className="space-y-3">
          {topContent.map((content, index) => (
            <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex-1 min-w-0 pr-4">
                <p className="font-medium truncate">{content.title}</p>
                <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                  <span>{content.views.toLocaleString()} views</span>
                  <span>{content.engagementRate}% ER</span>
                  <span>{content.ctr}% CTR</span>
                </div>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary">
                #{index + 1}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default GrowthInsights;
