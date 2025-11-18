import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, TrendingUp, Users, DollarSign, Target, Zap, Loader2 } from "lucide-react";

const Insights = () => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [insights, setInsights] = useState<any>(null);

  const processInsights = async () => {
    if (!user) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-youtube-insights', {
        body: { userId: user.id }
      });

      if (error) throw error;

      setInsights(data.insights);
      toast.success("Insights processed successfully!");
    } catch (error: any) {
      console.error("Error processing insights:", error);
      toast.error(error.message || "Failed to process insights");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI-Powered Insights</h1>
          <p className="text-muted-foreground mt-2">
            Deep analysis and actionable recommendations from your YouTube data
          </p>
        </div>
        <Button 
          onClick={processInsights} 
          disabled={isProcessing}
          className="gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Insights
            </>
          )}
        </Button>
      </div>

      {!insights && !isProcessing && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Insights Yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Click "Generate Insights" to analyze your last 14 days of YouTube data and get AI-powered recommendations.
            </p>
          </CardContent>
        </Card>
      )}

      {insights && (
        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="audience">Audience</TabsTrigger>
            <TabsTrigger value="competitive">Competitive</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Overview (14-Day Analysis)
                </CardTitle>
                <CardDescription>Key metrics and conversion rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Shorts Conversion Rate</p>
                    <p className="text-2xl font-bold">{insights.performanceOverview?.shortsConversionRate || 0}%</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Audience Retention</p>
                    <p className="text-2xl font-bold">{insights.performanceOverview?.audienceRetention || 0}%</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Ghost Subscribers</p>
                    <p className="text-2xl font-bold">{insights.performanceOverview?.ghostSubscriberRate || 0}%</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Revenue Impact</p>
                    <p className="text-2xl font-bold">₹{insights.performanceOverview?.revenueImpact || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Content Analysis
                </CardTitle>
                <CardDescription>Top performing videos and patterns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {insights.topVideos?.map((video: any, index: number) => (
                  <div key={index} className="border-l-4 border-primary pl-4 space-y-2">
                    <h4 className="font-semibold">{video.title}</h4>
                    <div className="grid gap-2 text-sm">
                      <p className="text-muted-foreground">Hook Retention: {video.hookRetention}%</p>
                      <p className="text-muted-foreground">
                        Viral Terms: {video.viralSearchTerms?.join(", ") || "None"}
                      </p>
                      <p className="text-amber-600">
                        Missed Opportunities: {video.missedOpportunities?.join(", ") || "None"}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audience" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Audience Intelligence
                </CardTitle>
                <CardDescription>Who's watching and when</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Demographics</h4>
                    <pre className="text-sm text-muted-foreground bg-muted p-4 rounded-lg overflow-auto">
                      {JSON.stringify(insights.audienceIntel?.demographics, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Peak Hours</h4>
                    <p className="text-sm text-muted-foreground">
                      {insights.audienceIntel?.peakHours?.join(", ") || "No data"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="competitive" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Competitive Intelligence</CardTitle>
                <CardDescription>How you stack up against competitors</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Competitive analysis coming soon. This will show your position vs top creators.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Revenue Optimization
                </CardTitle>
                <CardDescription>Quick wins to increase monetization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {insights.quickWins?.map((win: any, index: number) => (
                  <div key={index} className="border border-border rounded-lg p-4 space-y-2">
                    <h4 className="font-semibold">{win.title}</h4>
                    <div className="grid gap-1 text-sm">
                      <p className="text-green-600">Impact: {win.impact}</p>
                      <p className="text-muted-foreground">Effort: {win.effort}</p>
                      <p className="text-muted-foreground">Implementation: {win.implementation}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Trend Spotting
                </CardTitle>
                <CardDescription>Algorithmic luck vs genuine growth</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Trend analysis coming soon. This will identify which videos benefited from external trends.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Insights;
