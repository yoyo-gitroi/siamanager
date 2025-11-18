import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

interface TrendDetectionCardProps {
  data: {
    algorithmicLuck?: Array<{
      videoTitle: string;
      spikeDate: string;
      externalTrend: string;
      realEngagement: number;
      verdict: string;
    }>;
    genuineWinners: string[];
  };
}

export const TrendDetectionCard = ({ data }: TrendDetectionCardProps) => {
  return (
    <Card className="p-6 bg-gradient-to-br from-background to-muted/20 border-none shadow-sm">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            🤯 Trend Detection: Algorithmic Luck vs Genuine Growth
          </h3>
          <p className="text-sm text-muted-foreground">
            Understanding the "why" behind the numbers
          </p>
        </div>
        <TrendingUp className="h-8 w-8 text-primary" />
      </div>

      {/* Algorithmic Luck Section */}
      {data.algorithmicLuck && data.algorithmicLuck.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h4 className="font-semibold text-foreground">Algorithmic Luck Videos</h4>
          </div>

          <div className="space-y-4">
            {data.algorithmicLuck.map((video, idx) => (
              <div key={idx} className="bg-warning/10 rounded-lg p-4 border border-warning/20">
                <div className="flex items-start justify-between mb-3">
                  <h5 className="font-semibold text-foreground flex-1">"{video.videoTitle}"</h5>
                  <Badge variant="destructive" className="bg-warning/20 text-warning border-warning/30">
                    {video.verdict}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="bg-background/50 rounded p-3 space-y-2">
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">What happened:</span>
                    </p>
                    <ol className="space-y-1 ml-4 text-foreground">
                      <li>1. Video posted {video.spikeDate}</li>
                      <li>2. External event: <span className="font-semibold">{video.externalTrend}</span></li>
                      <li>3. Algorithm thought: "Oh, this is trending"</li>
                      <li>4. Pushed to 200K+ feeds</li>
                    </ol>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-xs text-muted-foreground">Real Engagement:</span>
                    <Badge variant="outline" className="text-xs">
                      {video.realEngagement.toFixed(1)}% stayed
                    </Badge>
                  </div>

                  <div className="bg-destructive/10 rounded p-2 border-l-4 border-destructive/30">
                    <p className="text-xs text-foreground">
                      <span className="font-semibold">Why this matters:</span> This wasn't organic growth from your content. 
                      These viewers don't care about your usual topics.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Genuine Winners Section */}
      {data.genuineWinners && data.genuineWinners.length > 0 && (
        <div className="bg-success/10 rounded-lg p-4 border border-success/20">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <h4 className="font-semibold text-success">The Real Winners</h4>
          </div>

          <p className="text-sm text-muted-foreground mb-3">
            Your "genuine" performing videos that DON'T rely on external trends:
          </p>

          <div className="space-y-2">
            {data.genuineWinners.map((winner, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-background/50 rounded p-2">
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground">{winner}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-success/20">
            <p className="text-sm font-semibold text-success">
              These are your TRUE audience. Focus here for sustainable growth.
            </p>
          </div>
        </div>
      )}

      {(!data.algorithmicLuck || data.algorithmicLuck.length === 0) && 
       (!data.genuineWinners || data.genuineWinners.length === 0) && (
        <div className="text-center py-8 text-muted-foreground">
          <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No trend data available yet. Generate insights to see trend analysis.</p>
        </div>
      )}
    </Card>
  );
};
