import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  growth?: number;
  icon: LucideIcon;
  iconColor: "primary" | "success" | "warning" | "danger" | "secondary";
}

const StatCard = ({ label, value, growth, icon: Icon, iconColor }: StatCardProps) => {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
    secondary: "bg-secondary/10 text-secondary",
  };

  const roundedGrowth = growth !== undefined ? Math.round(growth * 10) / 10 : undefined;

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-xl", colorClasses[iconColor])}>
          <Icon className="h-6 w-6" />
        </div>
        {roundedGrowth !== undefined && (
          <span
            className={cn(
              "text-sm font-medium px-2 py-1 rounded-full",
              roundedGrowth >= 0
                ? "bg-success/10 text-success"
                : "bg-danger/10 text-danger"
            )}
          >
            {roundedGrowth >= 0 ? "+" : ""}{roundedGrowth}%
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
};

export default StatCard;
