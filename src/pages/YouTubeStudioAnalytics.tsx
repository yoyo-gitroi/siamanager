import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUpIcon, ArrowDownIcon, TrendingUpIcon, MessageSquareIcon, VideoIcon, ActivityIcon } from 'lucide-react';

interface StudioInsights {
  summary: {
    time_range: string;
    total_snapshots: number;
    videos_tracked: number;
  };
  video_trends: {
    totalSnapshots: number;
    videosTracked: number;
    top_performing: any[];
  };
  dashboard_trends: {
    totalSnapshots: number;
    metrics: any;
  };
  comment_analysis: {
    total_comments: number;
    average_likes: number;
    top_comments: any[];
  };
  performance_metrics: {
    total_videos: number;
    total_views: number;
    total_likes: number;
    total_comments: number;
    avg_views_per_video: number;
    engagement_rate: string;
  };
  recommendations: Array<{
    type: string;
    category: string;
    title: string;
    message: string;
  }>;
}

export default function YouTubeStudioAnalytics() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<StudioInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    if (user) {
      loadInsights();
    }
  }, [user, timeRange]);

  const loadInsights = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('youtube-studio-analyze', {
        body: {
          user_id: user?.id,
          time_range: timeRange,
        },
      });

      if (error) throw error;

      setInsights(data.insights);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };


  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <ActivityIcon className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading YouTube Studio insights...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>YouTube Studio Analytics</CardTitle>
            <CardDescription>
              Install the browser extension to start capturing YouTube Studio data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <VideoIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No data available</p>
              <p className="text-sm text-muted-foreground mb-6">
                Install the YouTube Studio extension to start tracking your channel metrics
              </p>
              <Button onClick={() => window.open('/browser-extension/youtube-studio', '_blank')}>
                Download Extension
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">YouTube Studio Analytics</h1>
          <p className="text-muted-foreground">Real-time insights from your YouTube Studio</p>
        </div>
        <div className="flex gap-2">
          <Button variant={timeRange === '24h' ? 'default' : 'outline'} onClick={() => setTimeRange('24h')}>24h</Button>
          <Button variant={timeRange === '7d' ? 'default' : 'outline'} onClick={() => setTimeRange('7d')}>7d</Button>
          <Button variant={timeRange === '30d' ? 'default' : 'outline'} onClick={() => setTimeRange('30d')}>30d</Button>
          <Button onClick={loadInsights}>Refresh</Button>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Videos</CardDescription>
            <CardTitle className="text-3xl">{insights.performance_metrics.total_videos}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Tracked in last {timeRange}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Views</CardDescription>
            <CardTitle className="text-3xl">{formatNumber(insights.performance_metrics.total_views)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Avg: {formatNumber(insights.performance_metrics.avg_views_per_video)}/video
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Engagement Rate</CardDescription>
            <CardTitle className="text-3xl">{insights.performance_metrics.engagement_rate}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {formatNumber(insights.performance_metrics.total_likes)} likes, {formatNumber(insights.performance_metrics.total_comments)} comments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Data Snapshots</CardDescription>
            <CardTitle className="text-3xl">{insights.summary.total_snapshots}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Collected in {timeRange}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {insights.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUpIcon className="w-5 h-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.recommendations.map((rec, idx) => (
              <div key={idx} className={`p-4 rounded-lg border ${getRecommendationColor(rec.type)}`}>
                <h4 className="font-semibold mb-1">{rec.title}</h4>
                <p className="text-sm">{rec.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Detailed Analytics */}
      <Tabs defaultValue="videos" className="w-full">
        <TabsList>
          <TabsTrigger value="videos">Video Trends</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Videos</CardTitle>
              <CardDescription>Videos with the highest growth in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.video_trends.top_performing?.map((video, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{video.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(video.current_views)} views
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        {video.views_growth > 0 ? (
                          <ArrowUpIcon className="w-4 h-4 text-green-600" />
                        ) : (
                          <ArrowDownIcon className="w-4 h-4 text-red-600" />
                        )}
                        <span className={video.views_growth > 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatNumber(Math.abs(video.views_growth))}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {video.views_growth_rate.toFixed(1)}% growth
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareIcon className="w-5 h-5" />
                Comment Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">Total Comments</p>
                  <p className="text-2xl font-bold">{insights.comment_analysis.total_comments}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Likes per Comment</p>
                  <p className="text-2xl font-bold">{insights.comment_analysis.average_likes.toFixed(1)}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Top Comments</h4>
                {insights.comment_analysis.top_comments?.slice(0, 5).map((comment, idx) => (
                  <div key={idx} className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">{comment.author}</p>
                    <p className="text-sm mt-1">{comment.text?.substring(0, 150)}...</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {comment.likes_count} likes · {comment.posted_date}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
