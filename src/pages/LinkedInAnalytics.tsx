import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { TrendingUp, AlertCircle, Target, BarChart3 } from "lucide-react";
import { 
  LineChart, Line, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from "recharts";

const LinkedInAnalytics = () => {
  const { user } = useAuth();
  const { linkedInData, loading } = useAnalytics(user?.id);
  const [period, setPeriod] = useState<"7d" | "14d">("7d");

  // Calculate current and prior week metrics
  const { current, prior, alerts, chartData } = useMemo(() => {
    if (!linkedInData.length) return { current: null, prior: null, alerts: [], chartData: [] };

    const now = new Date();
    const daysBack = period === "7d" ? 7 : 14;
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

    // Check alerts
    const alerts: string[] = [];
    if (prior.er > 0 && (prior.er - current.er) >= 0.6) {
      alerts.push("Engagement Rate down ≥0.6 percentage points");
    }
    if (prior.impressions > 0 && ((prior.impressions - current.impressions) / prior.impressions) >= 0.15) {
      alerts.push("Impressions down ≥15%");
    }

    // Prepare chart data for daily impressions & engagements
    const chartData = currentData.map(d => ({
      date: new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      impressions: d.impressions,
      engagements: d.engagement,
      er: d.impressions > 0 ? (d.engagement / d.impressions) * 100 : 0,
    }));

    return { current, prior, alerts, chartData };
  }, [linkedInData, period]);

  // Engagement rate by weekday
  const weekdayData = useMemo(() => {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const grouped = linkedInData.reduce((acc, d) => {
      const day = new Date(d.date).getDay();
      const dayName = weekdays[day];
      if (!acc[dayName]) {
        acc[dayName] = { impressions: 0, engagements: 0, count: 0 };
      }
      acc[dayName].impressions += d.impressions;
      acc[dayName].engagements += d.engagement;
      acc[dayName].count++;
      return acc;
    }, {} as Record<string, { impressions: number; engagements: number; count: number }>);

    return weekdays.map(day => {
      const data = grouped[day] || { impressions: 0, engagements: 0, count: 1 };
      return {
        day,
        avgImpressions: data.count > 0 ? data.impressions / data.count : 0,
        avgEngagements: data.count > 0 ? data.engagements / data.count : 0,
        er: data.impressions > 0 ? (data.engagements / data.impressions) * 100 : 0,
      };
    });
  }, [linkedInData]);

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
        <h1 className="mb-2">LinkedIn Analytics</h1>
        <p className="text-muted-foreground">
          Weekly engagement health, content benchmarks, and posting rhythm insights
        </p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="stat-card border-danger/50 bg-danger/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-danger mt-0.5" />
            <div>
              <h3 className="font-semibold text-danger mb-2">Engagement Alerts</h3>
              <ul className="space-y-1">
                {alerts.map((alert, i) => (
                  <li key={i} className="text-sm text-danger/80">• {alert}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Engagement Health */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2>Weekly Engagement Health</h2>
          <div className="flex gap-2">
            <Button 
              variant={period === "7d" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setPeriod("7d")}
            >
              Last 7d
            </Button>
            <Button 
              variant={period === "14d" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setPeriod("14d")}
            >
              Last 14d
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            label="Impressions"
            value={current?.impressions.toLocaleString() || "0"}
            growth={current && prior ? calcChange(current.impressions, prior.impressions) : 0}
            icon={Target}
            iconColor="primary"
          />
          <StatCard
            label="Engagements"
            value={current?.engagements.toLocaleString() || "0"}
            growth={current && prior ? calcChange(current.engagements, prior.engagements) : 0}
            icon={TrendingUp}
            iconColor="success"
          />
          <StatCard
            label="Engagement Rate (%)"
            value={current?.er.toFixed(2) || "0"}
            growth={current && prior ? calcChange(current.er, prior.er) : 0}
            icon={BarChart3}
            iconColor="warning"
          />
        </div>
      </div>

      {/* Daily Impressions & Engagements */}
      <div className="stat-card">
        <h2 className="mb-4">Daily Performance</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Impressions and engagements over time
        </p>
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

      {/* Posting Rhythm vs Results */}
      <div className="stat-card">
        <h2 className="mb-4">Posting Rhythm vs Results</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Average engagement rate by weekday
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weekdayData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="day" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
              }}
            />
            <Legend />
            <Bar dataKey="er" fill="hsl(var(--primary))" name="Engagement Rate (%)" />
            <Bar dataKey="avgImpressions" fill="hsl(var(--secondary))" name="Avg Impressions" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LinkedInAnalytics;
