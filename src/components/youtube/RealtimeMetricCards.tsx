import { Clock, TrendingUp, Radio } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface RealtimeMetricCardsProps {
  todayViews: number;
  last60MinViews: number;
  last48HrViews: number;
  todayLikes: number;
  isLive?: boolean;
  liveViewers?: number | null;
  lastCaptured: string | null;
}

export const RealtimeMetricCards = ({
  todayViews,
  last60MinViews,
  last48HrViews,
  todayLikes,
  isLive = false,
  liveViewers = null,
  lastCaptured,
}: RealtimeMetricCardsProps) => {
  return (
    <div className="space-y-4">
      {/* Status Header */}
      <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
              <div className="absolute inset-0 h-3 w-3 bg-green-500 rounded-full animate-ping" />
            </div>
            <div>
              <p className="text-sm font-semibold">Real-time Data</p>
              <p className="text-xs text-muted-foreground">
                {lastCaptured
                  ? `Updated ${formatDistanceToNow(new Date(lastCaptured), { addSuffix: true })}`
                  : 'Waiting for data...'}
              </p>
            </div>
          </div>
          {isLive && liveViewers && (
            <Badge variant="destructive" className="gap-1.5 animate-pulse">
              <Radio className="h-3 w-3" />
              {liveViewers.toLocaleString()} watching now
            </Badge>
          )}
        </div>
      </Card>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Last 60 Minutes */}
        <Card className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <Badge variant="outline" className="text-xs">
              Live
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Last 60 Minutes</p>
          <p className="text-2xl font-bold mb-1">
            {last60MinViews.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">views</p>
        </Card>

        {/* Last 48 Hours */}
        <Card className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-success/10">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <Badge variant="outline" className="text-xs">
              48h
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Last 48 Hours</p>
          <p className="text-2xl font-bold mb-1">
            {last48HrViews.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">views</p>
        </Card>

        {/* Today So Far (PT) */}
        <Card className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-secondary/10">
              <TrendingUp className="h-5 w-5 text-secondary" />
            </div>
            <Badge variant="outline" className="text-xs">
              Today PT
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-1">Today So Far</p>
          <p className="text-2xl font-bold mb-1">
            {todayViews.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            views • {todayLikes.toLocaleString()} likes
          </p>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="p-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>Real-time data</strong> comes from YouTube Data API and updates every 5 minutes. 
          These are cumulative counters, not filtered for invalid traffic. For official daily metrics, 
          see the "Processed Analytics" tab.
        </p>
      </Card>
    </div>
  );
};
