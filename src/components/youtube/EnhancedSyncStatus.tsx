import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Clock, CheckCircle2, AlertCircle, Database } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface EnhancedSyncStatusProps {
  lastSync: string | null;
  onRefresh: () => void;
  loading?: boolean;
  channelRows?: number;
  videoRows?: number;
  status?: "success" | "error" | "syncing";
}

export const EnhancedSyncStatus = ({
  lastSync,
  onRefresh,
  loading = false,
  channelRows = 0,
  videoRows = 0,
  status = "success",
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

          {lastSync && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Last synced {formatDistanceToNow(new Date(lastSync), { addSuffix: true })}
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
                Sync Now
              </>
            )}
          </Button>
        </div>
      </div>

      {status === "error" && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md">
          <p className="text-sm text-red-800 dark:text-red-200">
            Data sync encountered an error. Please try again or check your YouTube connection.
          </p>
        </div>
      )}

      {!lastSync && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            No data synced yet. Click "Sync Now" or run the backfill to populate historical data.
          </p>
        </div>
      )}
    </Card>
  );
};