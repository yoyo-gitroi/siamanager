import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface QuotaUsageDisplayProps {
  unitsUsed: number;
  unitsAvailable: number;
  percentage: number;
}

export const QuotaUsageDisplay = ({
  unitsUsed,
  unitsAvailable,
  percentage,
}: QuotaUsageDisplayProps) => {
  const getStatusColor = () => {
    if (percentage >= 80) return "text-destructive";
    if (percentage >= 50) return "text-yellow-600";
    return "text-green-600";
  };

  const getProgressColor = () => {
    if (percentage >= 80) return "bg-destructive";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Daily API Quota</span>
        <span className={`font-medium ${getStatusColor()}`}>
          {unitsUsed.toLocaleString()} / {unitsAvailable.toLocaleString()} units
        </span>
      </div>
      
      <div className="relative">
        <Progress 
          value={percentage} 
          className="h-2"
        />
        <div 
          className={`absolute inset-0 h-2 rounded-full ${getProgressColor()} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {percentage >= 80 && (
        <Alert variant="destructive" className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You're approaching the daily quota limit. Real-time updates may be paused to prevent exceeding limits.
          </AlertDescription>
        </Alert>
      )}

      {percentage < 50 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          <span>Quota healthy - real-time updates active</span>
        </div>
      )}
    </div>
  );
};
