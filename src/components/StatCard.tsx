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

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-xl", colorClasses[iconColor])}>
          <Icon className="h-6 w-6" />
        </div>
        {growth !== undefined && (
          <span
            className={cn(
              "text-sm font-medium px-2 py-1 rounded-full",
              growth >= 0
                ? "bg-success/10 text-success"
                : "bg-danger/10 text-danger"
            )}
          >
            {growth >= 0 ? "+" : ""}{growth}%
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
};

export default StatCard;
