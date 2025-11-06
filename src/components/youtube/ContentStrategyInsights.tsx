import { Card } from "@/components/ui/card";
import { Lightbulb, TrendingUp, Target, Clock } from "lucide-react";

interface ContentInsights {
  byLength: {
    shorts: { count: number; avgViews: number; avgEngagement: number };
    medium: { count: number; avgViews: number; avgEngagement: number };
    long: { count: number; avgViews: number; avgEngagement: number };
  };
  topTags: Array<{ tag: string; count: number; avgViews: number }>;
  bestPerformingLength: string;
}

interface ContentStrategyInsightsProps {
  insights: ContentInsights;
}

const ContentStrategyInsights = ({ insights }: ContentStrategyInsightsProps) => {
  const getLengthLabel = (key: string) => {
    switch (key) {
      case "shorts":
        return "Shorts (<60s)";
      case "medium":
        return "Medium (1-10min)";
      case "long":
        return "Long (>10min)";
      default:
        return key;
    }
  };

  const getBestPerformingLabel = () => {
    const best = insights.bestPerformingLength;
    const data = insights.byLength[best as keyof typeof insights.byLength];
    return `${getLengthLabel(best)} videos perform best with ${data.avgViews.toLocaleString()} avg views`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4">Content Strategy Insights</h2>
        <p className="text-muted-foreground">
          AI-powered recommendations based on your content performance
        </p>
      </div>

      {/* Recommendation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 border-l-4 border-l-success">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Best Video Length</h3>
              <p className="text-sm text-muted-foreground">{getBestPerformingLabel()}</p>
            </div>
          </div>
        </Card>

        {insights.topTags.length > 0 && (
          <Card className="p-6 border-l-4 border-l-primary">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Top Performing Tag</h3>
                <p className="text-sm text-muted-foreground">
                  Videos with "{insights.topTags[0].tag}" tag average{" "}
                  {insights.topTags[0].avgViews.toLocaleString()} views
                </p>
              </div>
            </div>
          </Card>
        )}

        {insights.byLength.shorts.count > 5 && insights.byLength.medium.count > 5 && (
          <Card className="p-6 border-l-4 border-l-warning">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Content Mix Optimization</h3>
                <p className="text-sm text-muted-foreground">
                  Your {getLengthLabel(insights.bestPerformingLength).toLowerCase()} get{" "}
                  {(
                    (insights.byLength[
                      insights.bestPerformingLength as keyof typeof insights.byLength
                    ].avgEngagement /
                      Math.max(
                        insights.byLength.shorts.avgEngagement,
                        insights.byLength.medium.avgEngagement,
                        insights.byLength.long.avgEngagement
                      )) *
                    100
                  ).toFixed(0)}
                  % higher engagement
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 border-l-4 border-l-secondary">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-secondary/10">
              <Lightbulb className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Content Suggestion</h3>
              <p className="text-sm text-muted-foreground">
                Create more {getLengthLabel(insights.bestPerformingLength).toLowerCase()} to
                maximize reach and engagement
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Video Length Performance Table */}
      <Card className="p-6">
        <h3 className="mb-4">Performance by Video Length</h3>
        <div className="space-y-4">
          {Object.entries(insights.byLength).map(([key, data]) => (
            <div key={key} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">{getLengthLabel(key)}</p>
                <p className="text-sm text-muted-foreground">{data.count} videos</p>
              </div>
              <div className="text-right">
                <p className="font-medium">{data.avgViews.toLocaleString()} avg views</p>
                <p className="text-sm text-muted-foreground">
                  {data.avgEngagement.toFixed(2)}% engagement
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Top Tags */}
      {insights.topTags.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-4">Top Performing Tags</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {insights.topTags.slice(0, 9).map((tag) => (
              <div
                key={tag.tag}
                className="p-3 rounded-lg bg-muted/50 border border-border hover:border-primary transition-colors"
              >
                <p className="font-medium truncate">{tag.tag}</p>
                <p className="text-sm text-muted-foreground">
                  {tag.avgViews.toLocaleString()} avg views
                </p>
                <p className="text-xs text-muted-foreground">{tag.count} videos</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ContentStrategyInsights;
