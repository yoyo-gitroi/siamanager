import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  growth?: number;
  icon: LucideIcon;
  iconColor: "primary" | "success" | "warning" | "danger" | "secondary";
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
}

const MetricCard = ({ 
  label, 
  value, 
  growth, 
  icon: Icon, 
  iconColor, 
  subtitle,
  trend 
}: MetricCardProps) => {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
    secondary: "bg-secondary/10 text-secondary",
  };

  const roundedGrowth = growth !== undefined ? Math.round(growth * 10) / 10 : undefined;
  const displayTrend = trend || (roundedGrowth !== undefined ? (roundedGrowth >= 0 ? "up" : "down") : "neutral");

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-xl", colorClasses[iconColor])}>
          <Icon className="h-6 w-6" />
        </div>
        {roundedGrowth !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full",
              roundedGrowth >= 0
                ? "bg-success/10 text-success"
                : "bg-danger/10 text-danger"
            )}
          >
            {roundedGrowth >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(roundedGrowth)}%
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-3xl font-bold mb-1">{value}</p>
      {subtitle && (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
};

export default MetricCard;
