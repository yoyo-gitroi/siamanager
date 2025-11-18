import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

interface TopVideoCardProps {
  video: {
    videoId: string;
    title: string;
    views: number;
    hookRetention: number;
    viralSearchTerms: string[];
    trafficSource: string;
    trafficPercent: number;
    likeRatio: number;
    missedOpportunities: string[];
  };
  rank: number;
  channelAvgRetention?: number;
}

export const TopVideoCard = ({ video, rank, channelAvgRetention = 45 }: TopVideoCardProps) => {
  const isAboveAvg = (video.hookRetention || 0) > channelAvgRetention;
  
  // Safely format numbers with fallbacks
  const views = video.views || 0;
  const hookRetention = video.hookRetention || 0;
  const trafficPercent = video.trafficPercent || 0;
  const likeRatio = video.likeRatio || 0;

  return (
    <Card className="p-5 bg-gradient-to-br from-background to-muted/10 border-none shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xl font-bold text-primary">{rank}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground mb-2 line-clamp-2">
            "{video.title}"
          </h4>

          <div className="flex items-center gap-4 mb-3 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span className="font-semibold">{(views / 1000).toFixed(0)}K views</span>
            </div>
            <div className="flex items-center gap-1">
              {isAboveAvg ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={isAboveAvg ? "text-success font-semibold" : "text-muted-foreground"}>
                {hookRetention.toFixed(1)}% retention
              </span>
            </div>
          </div>

          {/* Success Indicators */}
          <div className="space-y-2 mb-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">Hook worked:</span> {hookRetention.toFixed(1)}% retention 
                {isAboveAvg && <span className="text-success"> (vs {channelAvgRetention}% channel avg)</span>}
              </p>
            </div>

            {video.viralSearchTerms && video.viralSearchTerms.length > 0 && (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold text-foreground">Viral search terms:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {video.viralSearchTerms.slice(0, 3).map((term, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {term}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">Traffic source:</span> {video.trafficSource || 'Unknown'} 
                <span className="text-muted-foreground"> ({trafficPercent.toFixed(0)}% of traffic)</span>
              </p>
            </div>

            {likeRatio > 0 && (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground">
                  <span className="font-semibold">{(likeRatio * 100).toFixed(1)}% like ratio</span>
                  <span className="text-muted-foreground"> (extremely positive sentiment)</span>
                </p>
              </div>
            )}
          </div>

          {/* Missed Opportunities */}
          {video.missedOpportunities && video.missedOpportunities.length > 0 && (
            <div className="bg-warning/10 rounded-lg p-3 border border-warning/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  {video.missedOpportunities.map((opp, idx) => (
                    <p key={idx} className="text-sm text-foreground">
                      <span className="font-semibold text-warning">BUT:</span> {opp}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
