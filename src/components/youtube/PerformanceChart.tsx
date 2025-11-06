import { useMemo } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { ChannelDaily } from "@/hooks/useYouTubeData";

interface PerformanceChartProps {
  data: ChannelDaily[];
  metrics: Array<"views" | "watch_time" | "subscribers" | "revenue">;
  chartType?: "line" | "area";
}

const PerformanceChart = ({ data, metrics, chartType = "line" }: PerformanceChartProps) => {
  const chartData = useMemo(() => {
    return data
      .map((d) => ({
        date: format(new Date(d.day), "MMM dd"),
        views: d.views || 0,
        watchHours: (d.watch_time_seconds || 0) / 3600,
        netSubscribers: (d.subscribers_gained || 0) - (d.subscribers_lost || 0),
        revenue: d.estimated_revenue || 0,
      }))
      .reverse();
  }, [data]);

  const metricConfig = {
    views: { key: "views", name: "Views", color: "hsl(var(--primary))" },
    watch_time: { key: "watchHours", name: "Watch Hours", color: "hsl(var(--success))" },
    subscribers: { key: "netSubscribers", name: "Net Subscribers", color: "hsl(var(--warning))" },
    revenue: { key: "revenue", name: "Revenue ($)", color: "hsl(var(--secondary))" },
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      {chartType === "area" ? (
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="date" 
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis 
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Legend />
          {metrics.map((metric) => {
            const config = metricConfig[metric];
            return (
              <Area
                key={config.key}
                type="monotone"
                dataKey={config.key}
                name={config.name}
                stroke={config.color}
                fill={config.color}
                strokeWidth={2}
              />
            );
          })}
        </AreaChart>
      ) : (
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="date" 
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis 
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Legend />
          {metrics.map((metric) => {
            const config = metricConfig[metric];
            return (
              <Line
                key={config.key}
                type="monotone"
                dataKey={config.key}
                name={config.name}
                stroke={config.color}
                fill={config.color}
                strokeWidth={2}
              />
            );
          })}
        </LineChart>
      )}
    </ResponsiveContainer>
  );
};

export default PerformanceChart;
