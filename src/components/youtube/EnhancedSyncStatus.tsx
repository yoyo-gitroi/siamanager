import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Clock, CheckCircle2, AlertCircle, Database, Radio } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface EnhancedSyncStatusProps {
  lastSync: string | null;
  dataDate?: string | null;
  onRefresh: () => void;
  loading?: boolean;
  channelRows?: number;
  videoRows?: number;
  status?: "success" | "error" | "syncing";
  errorMessage?: string | null;
  realtimeLastCapture?: string | null;
  realtimeVideos?: number;
  onRealtimeCapture?: () => void;
  realtimeLoading?: boolean;
}

export const EnhancedSyncStatus = ({
  lastSync,
  dataDate,
  onRefresh,
  loading = false,
  channelRows = 0,
  videoRows = 0,
  status = "success",
  errorMessage = null,
  realtimeLastCapture = null,
  realtimeVideos = 0,
  onRealtimeCapture,
  realtimeLoading = false,
}: EnhancedSyncStatusProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every 30 seconds for accurate "time ago" display
  useState(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(interval);
  });

  const getStatusInfo = () => {
    if (loading || status === "syncing") {
      return {
        text: "Syncing...",
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
        color: "text-blue-600 dark:text-blue-400",
        badgeVariant: "default" as const,
      };
    }

    if (status === "error") {
      return {
        text: "Sync Failed",
        icon: <AlertCircle className="h-4 w-4" />,
        color: "text-red-600 dark:text-red-400",
        badgeVariant: "destructive" as const,
      };
    }

    if (!lastSync) {
      return {
        text: "Not Synced",
        icon: <Clock className="h-4 w-4" />,
        color: "text-gray-600 dark:text-gray-400",
        badgeVariant: "secondary" as const,
      };
    }

    const syncDate = new Date(lastSync);
    const hoursSinceSync = (currentTime.getTime() - syncDate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceSync < 2) {
      return {
        text: "Up to Date",
        icon: <CheckCircle2 className="h-4 w-4" />,
        color: "text-green-600 dark:text-green-400",
        badgeVariant: "default" as const,
      };
    }

    if (hoursSinceSync < 48) {
      return {
        text: "Recently Synced",
        icon: <Clock className="h-4 w-4" />,
        color: "text-blue-600 dark:text-blue-400",
        badgeVariant: "secondary" as const,
      };
    }

    return {
      text: "Needs Refresh",
      icon: <AlertCircle className="h-4 w-4" />,
      color: "text-orange-600 dark:text-orange-400",
      badgeVariant: "outline" as const,
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className={`flex items-center gap-2 ${statusInfo.color}`}>
            {statusInfo.icon}
            <span className="font-semibold">{statusInfo.text}</span>
          </div>

          {realtimeLastCapture && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                </div>
                <span className="font-medium text-green-600 dark:text-green-400">
                  Real-time: Updated {formatDistanceToNow(new Date(realtimeLastCapture), { addSuffix: true })}
                </span>
              </div>
              {realtimeVideos > 0 && (
                <div className="flex items-center gap-2 px-2 py-1 bg-green-50 dark:bg-green-950/20 rounded-md">
                  <Database className="h-3 w-3 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-300">
                    {realtimeVideos} videos tracked
                  </span>
                </div>
              )}
            </div>
          )}
          {lastSync && dataDate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Processed Analytics: {new Date(dataDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (official metrics)
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {(channelRows > 0 || videoRows > 0) && (
            <div className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-2">
                <Badge variant="outline" className="font-mono">
                  {channelRows.toLocaleString()} ch
                </Badge>
                <Badge variant="outline" className="font-mono">
                  {videoRows.toLocaleString()} vid
                </Badge>
              </div>
            </div>
          )}

          {onRealtimeCapture && (
            <Button 
              onClick={onRealtimeCapture} 
              disabled={realtimeLoading}
              size="sm"
              variant="default"
              className="gap-2"
            >
              {realtimeLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Capturing...
                </>
              ) : (
                <>
                  <Radio className="h-4 w-4" />
                  Capture Now
                </>
              )}
            </Button>
          )}
          <Button
            onClick={onRefresh}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Analytics
              </>
            )}
          </Button>
        </div>
      </div>

      {status === "error" && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                Data sync encountered an error
              </p>
              {errorMessage && (
                <p className="text-xs text-red-700 dark:text-red-300 font-mono">
                  {errorMessage}
                </p>
              )}
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                Please try again or check your YouTube connection in Settings.
              </p>
            </div>
          </div>
        </div>
      )}

      {!lastSync && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            No data synced yet. Click "Sync Now" or run the backfill to populate historical data.
          </p>
        </div>
      )}

      {realtimeLastCapture && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
                Live Data Updates Every 5 Minutes
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Real-time metrics are captured directly from YouTube Data API and update automatically every 5 minutes. 
                For official filtered metrics (invalid traffic removed), check the "Processed Analytics" tab which has a 2-3 day delay.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};