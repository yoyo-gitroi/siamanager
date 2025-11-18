import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, DollarSign } from "lucide-react";

interface ShortsConversionChartProps {
  data: {
    shortsOnlyViewers: number;
    crossFormatViewers: number;
    longFormOnlyViewers: number;
    conversionRate: number;
    avgWatchTime: string;
    swipeAwayRate: number;
    revenueImpact: {
      currentMonthly: number;
      potentialMonthly: number;
      monthlyGain: number;
    };
  };
}

export const ShortsConversionChart = ({ data }: ShortsConversionChartProps) => {
  const totalViewers = data.shortsOnlyViewers + data.crossFormatViewers + data.longFormOnlyViewers;
  const shortsPercent = ((data.shortsOnlyViewers / totalViewers) * 100).toFixed(0);
  const crossPercent = ((data.crossFormatViewers / totalViewers) * 100).toFixed(0);
  const longPercent = ((data.longFormOnlyViewers / totalViewers) * 100).toFixed(0);

  return (
    <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-none shadow-sm">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            The Shorts Trap: Why {shortsPercent}% Never Convert
          </h3>
          <p className="text-sm text-muted-foreground">
            Audience breakdown over last 14 days
          </p>
        </div>
        <TrendingDown className="h-8 w-8 text-destructive" />
      </div>

      {/* Audience Breakdown Visual */}
      <div className="space-y-4 mb-6">
        <div className="relative">
          <div className="flex h-12 rounded-lg overflow-hidden border border-border">
            <div 
              className="bg-destructive/20 border-r border-destructive flex items-center justify-center text-sm font-semibold"
              style={{ width: `${shortsPercent}%` }}
            >
              {shortsPercent}%
            </div>
            <div 
              className="bg-primary/20 border-r border-primary flex items-center justify-center text-sm font-semibold"
              style={{ width: `${crossPercent}%` }}
            >
              {crossPercent}%
            </div>
            <div 
              className="bg-success/20 flex items-center justify-center text-sm font-semibold"
              style={{ width: `${longPercent}%` }}
            >
              {longPercent}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive/60 mt-1" />
            <div>
              <p className="text-sm font-semibold text-foreground">Shorts Only</p>
              <p className="text-xs text-muted-foreground">{(data.shortsOnlyViewers / 1000).toFixed(0)}K viewers</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded-full bg-primary/60 mt-1" />
            <div>
              <p className="text-sm font-semibold text-foreground">Watch Both</p>
              <p className="text-xs text-muted-foreground">{(data.crossFormatViewers / 1000).toFixed(0)}K viewers</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded-full bg-success/60 mt-1" />
            <div>
              <p className="text-sm font-semibold text-foreground">Videos Only</p>
              <p className="text-xs text-muted-foreground">{(data.longFormOnlyViewers / 1000).toFixed(0)}K viewers</p>
            </div>
          </div>
        </div>
      </div>

      {/* The Problem */}
      <div className="bg-destructive/10 rounded-lg p-4 mb-6 border border-destructive/20">
        <h4 className="text-sm font-semibold text-destructive mb-3">⚠️ The Problem</h4>
        <div className="space-y-2 text-sm text-foreground">
          <p>• Only <span className="font-bold">{data.conversionRate.toFixed(1)}%</span> become "regular viewers"</p>
          <p>• Average watch time: <span className="font-bold">{data.avgWatchTime}</span> (need 0:35+ for retention)</p>
          <p>• <span className="font-bold">{data.swipeAwayRate.toFixed(1)}%</span> swipe away before hook completes</p>
        </div>
      </div>

      {/* Revenue Impact */}
      <div className="bg-success/10 rounded-lg p-4 border border-success/20">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="h-5 w-5 text-success" />
          <h4 className="text-sm font-semibold text-success">💰 Revenue Impact</h4>
        </div>
        <div className="space-y-2 text-sm text-foreground">
          <p>If you convert just 5% of Shorts-only viewers to regular:</p>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="bg-background/50 rounded p-2 text-center">
              <p className="text-xs text-muted-foreground">Engaged Viewers</p>
              <p className="text-lg font-bold text-primary">+{(data.shortsOnlyViewers * 0.05 / 1000).toFixed(1)}K</p>
            </div>
            <div className="bg-background/50 rounded p-2 text-center">
              <p className="text-xs text-muted-foreground">Monthly Revenue</p>
              <p className="text-lg font-bold text-success">+₹{(data.revenueImpact.monthlyGain / 1000).toFixed(0)}K</p>
            </div>
            <div className="bg-background/50 rounded p-2 text-center">
              <p className="text-xs text-muted-foreground">Real Subscribers</p>
              <p className="text-lg font-bold text-primary">+{(data.shortsOnlyViewers * 0.05 * 0.13 / 1000).toFixed(1)}K</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
