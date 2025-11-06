import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface SyncStatusProps {
  lastSync: Date | null;
  onRefresh: () => void;
  loading?: boolean;
}

const SyncStatus = ({ lastSync, onRefresh, loading = false }: SyncStatusProps) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatus = () => {
    if (!lastSync) return { text: "Never synced", icon: AlertCircle, color: "text-warning" };
    
    const minutesAgo = (now.getTime() - lastSync.getTime()) / 1000 / 60;
    
    if (minutesAgo < 10) {
      return { text: "Up to date", icon: CheckCircle, color: "text-success" };
    } else if (minutesAgo < 60) {
      return { text: "Recently synced", icon: CheckCircle, color: "text-success" };
    } else {
      return { text: "Needs refresh", icon: AlertCircle, color: "text-warning" };
    }
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border">
      <div className="flex items-center gap-2 flex-1">
        <StatusIcon className={cn("h-5 w-5", status.color)} />
        <div>
          <p className="text-sm font-medium">{status.text}</p>
          {lastSync && (
            <p className="text-xs text-muted-foreground">
              Last synced {formatDistanceToNow(lastSync, { addSuffix: true })}
            </p>
          )}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={loading}
        className="gap-2"
      >
        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        Refresh
      </Button>
    </div>
  );
};

export default SyncStatus;
