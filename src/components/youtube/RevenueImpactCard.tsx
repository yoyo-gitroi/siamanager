import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Zap } from "lucide-react";

interface QuickWin {
  title: string;
  currentState: string;
  proposedFix: string;
  impactAmount: number;
  impactPercent: number;
  effort: string;
  timeToImplement: string;
}

interface RevenueImpactCardProps {
  data: {
    currentRPM: number;
    dailyRevenue: number;
    quickWins: QuickWin[];
  };
}

export const RevenueImpactCard = ({ data }: RevenueImpactCardProps) => {
  const totalImpact = data.quickWins.reduce((sum, win) => sum + win.impactAmount, 0);
  const monthlyRevenue = data.dailyRevenue * 30;

  return (
    <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-none shadow-sm">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            💰 Revenue Optimization Report
          </h3>
          <p className="text-sm text-muted-foreground">
            Based on last 14 days of data
          </p>
        </div>
        <DollarSign className="h-8 w-8 text-success" />
      </div>

      {/* Current Performance */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Daily Revenue</p>
          <p className="text-xl font-bold text-foreground">₹{data.dailyRevenue.toFixed(0)}</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">RPM</p>
          <p className="text-xl font-bold text-success">₹{data.currentRPM.toFixed(0)}</p>
          <p className="text-xs text-success">Top 20%</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Monthly (Projected)</p>
          <p className="text-xl font-bold text-foreground">₹{(monthlyRevenue / 1000).toFixed(0)}K</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Efficiency</p>
          <Badge variant="secondary" className="text-xs">Strong</Badge>
        </div>
      </div>

      {/* Quick Wins */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-warning" />
          <h4 className="font-semibold text-foreground">🎯 Quick Wins (No Extra Content Needed)</h4>
        </div>

        {data.quickWins && data.quickWins.map((win, idx) => (
          <div key={idx} className="bg-gradient-to-r from-success/5 to-primary/5 rounded-lg p-4 border border-success/20">
            <div className="flex items-start justify-between mb-2">
              <h5 className="font-semibold text-foreground flex items-center gap-2">
                <span className="text-primary">{idx + 1}️⃣</span>
                {win.title}
              </h5>
              <Badge variant="outline" className="bg-background">
                {win.effort} effort
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground font-semibold">Current:</span>
                <p className="text-foreground flex-1">{win.currentState}</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-success font-semibold">Fix:</span>
                <p className="text-foreground flex-1">{win.proposedFix}</p>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="font-bold text-success">+₹{(win.impactAmount / 1000).toFixed(1)}K/month</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    (+{win.impactPercent?.toFixed(0) || 0}% revenue)
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{win.timeToImplement}</span>
              </div>
            </div>
          </div>
        ))}

        {/* Total Impact */}
        <div className="bg-gradient-to-r from-success/10 to-success/5 rounded-lg p-4 border-2 border-success/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Low-Hanging Fruit</p>
              <p className="text-2xl font-bold text-success">+₹{(totalImpact / 1000).toFixed(1)}K/month</p>
              <p className="text-sm text-muted-foreground mt-1">
                +{((totalImpact / monthlyRevenue) * 100).toFixed(0)}% revenue increase
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Implementation Time</p>
              <p className="text-sm font-semibold text-foreground">2 weeks</p>
              <p className="text-xs text-success">₹0 investment</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
