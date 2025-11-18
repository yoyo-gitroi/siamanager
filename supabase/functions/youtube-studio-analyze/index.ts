/**
 * YouTube Studio Analytics Processor
 * Analyzes YouTube Studio DOM data and generates insights
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface AnalyticsRequest {
  user_id: string;
  time_range?: string; // '24h', '7d', '30d', 'all'
  data_types?: string[]; // Filter by data types
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const payload: AnalyticsRequest = await req.json();

    if (!payload.user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`📊 Analyzing YouTube Studio data for user: ${payload.user_id}`);

    // Generate insights
    const insights = await generateInsights(supabaseClient, payload);

    return new Response(
      JSON.stringify({
        success: true,
        insights: insights,
        generated_at: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Error generating insights:', error);

    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Generate comprehensive insights from YouTube Studio data
 */
async function generateInsights(supabaseClient: any, request: AnalyticsRequest) {
  const timeFilter = getTimeFilter(request.time_range || '7d');

  // Fetch data
  const [videoTrends, dashboardTrends, commentAnalysis, performanceMetrics] = await Promise.all([
    analyzeVideoTrends(supabaseClient, request.user_id, timeFilter),
    analyzeDashboardTrends(supabaseClient, request.user_id, timeFilter),
    analyzeComments(supabaseClient, request.user_id, timeFilter),
    calculatePerformanceMetrics(supabaseClient, request.user_id, timeFilter),
  ]);

  // Generate recommendations
  const recommendations = generateRecommendations(videoTrends, dashboardTrends, commentAnalysis);

  return {
    summary: {
      time_range: request.time_range || '7d',
      total_snapshots: videoTrends.totalSnapshots + dashboardTrends.totalSnapshots,
      videos_tracked: videoTrends.videosTracked,
    },
    video_trends: videoTrends,
    dashboard_trends: dashboardTrends,
    comment_analysis: commentAnalysis,
    performance_metrics: performanceMetrics,
    recommendations: recommendations,
  };
}

/**
 * Analyze video performance trends
 */
async function analyzeVideoTrends(supabaseClient: any, userId: string, timeFilter: string) {
  const { data, error } = await supabaseClient
    .from('youtube_studio_video_snapshots')
    .select('*')
    .eq('user_id', userId)
    .gte('captured_at', timeFilter)
    .order('captured_at', { ascending: false });

  if (error) {
    console.error('Error fetching video snapshots:', error);
    return { error: error.message };
  }

  // Group by video_id and analyze trends
  const videoMap = new Map();

  data.forEach((snapshot: any) => {
    if (!snapshot.video_id) return;

    if (!videoMap.has(snapshot.video_id)) {
      videoMap.set(snapshot.video_id, {
        video_id: snapshot.video_id,
        title: snapshot.title,
        snapshots: [],
      });
    }

    videoMap.get(snapshot.video_id).snapshots.push(snapshot);
  });

  // Calculate trends for each video
  const trends = Array.from(videoMap.values()).map(video => {
    const sortedSnapshots = video.snapshots.sort(
      (a: any, b: any) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime()
    );

    const first = sortedSnapshots[0];
    const last = sortedSnapshots[sortedSnapshots.length - 1];

    const viewsGrowth = last.views && first.views ? last.views - first.views : 0;
    const likesGrowth = last.likes_count && first.likes_count ? last.likes_count - first.likes_count : 0;
    const commentsGrowth = last.comments_count && first.comments_count ? last.comments_count - first.comments_count : 0;

    return {
      video_id: video.video_id,
      title: video.title,
      current_views: last.views,
      views_growth: viewsGrowth,
      views_growth_rate: first.views ? (viewsGrowth / first.views) * 100 : 0,
      likes_growth: likesGrowth,
      comments_growth: commentsGrowth,
      snapshots_count: sortedSnapshots.length,
      first_seen: first.captured_at,
      last_seen: last.captured_at,
    };
  });

  // Sort by views growth
  trends.sort((a, b) => b.views_growth - a.views_growth);

  return {
    totalSnapshots: data.length,
    videosTracked: videoMap.size,
    top_performing: trends.slice(0, 5),
    all_trends: trends,
  };
}

/**
 * Analyze dashboard metrics trends
 */
async function analyzeDashboardTrends(supabaseClient: any, userId: string, timeFilter: string) {
  const { data, error } = await supabaseClient
    .from('youtube_studio_dashboard_snapshots')
    .select('*')
    .eq('user_id', userId)
    .gte('snapshot_at', timeFilter)
    .order('snapshot_at', { ascending: false });

  if (error) {
    console.error('Error fetching dashboard snapshots:', error);
    return { error: error.message };
  }

  if (data.length === 0) {
    return { totalSnapshots: 0, metrics: {} };
  }

  // Extract all unique metric keys
  const metricKeys = new Set();
  data.forEach((snapshot: any) => {
    Object.keys(snapshot.metrics || {}).forEach(key => metricKeys.add(key));
  });

  // Analyze each metric
  const metricAnalysis: any = {};

  metricKeys.forEach(key => {
    const values = data
      .map((snapshot: any) => ({
        value: snapshot.metrics[key],
        timestamp: snapshot.snapshot_at,
      }))
      .filter((item: any) => item.value !== undefined);

    if (values.length > 0) {
      metricAnalysis[key] = {
        current: values[0].value,
        previous: values[values.length - 1]?.value,
        snapshots: values.length,
      };
    }
  });

  return {
    totalSnapshots: data.length,
    metrics: metricAnalysis,
    latest_snapshot: data[0],
  };
}

/**
 * Analyze comments
 */
async function analyzeComments(supabaseClient: any, userId: string, timeFilter: string) {
  const { data, error } = await supabaseClient
    .from('youtube_studio_comments')
    .select('*')
    .eq('user_id', userId)
    .gte('captured_at', timeFilter)
    .order('captured_at', { ascending: false });

  if (error) {
    console.error('Error fetching comments:', error);
    return { error: error.message };
  }

  // Analyze sentiment and topics (basic analysis)
  const totalComments = data.length;
  const avgLikes = data.reduce((sum: number, c: any) => sum + (c.likes_count || 0), 0) / totalComments || 0;

  // Find most liked comments
  const topComments = [...data]
    .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
    .slice(0, 10);

  return {
    total_comments: totalComments,
    average_likes: avgLikes,
    top_comments: topComments,
  };
}

/**
 * Calculate performance metrics
 */
async function calculatePerformanceMetrics(supabaseClient: any, userId: string, timeFilter: string) {
  // Fetch latest video snapshots
  const { data: videos, error: videosError } = await supabaseClient
    .from('youtube_studio_latest_videos')
    .select('*')
    .eq('user_id', userId);

  if (videosError || !videos || videos.length === 0) {
    return { total_videos: 0 };
  }

  const totalViews = videos.reduce((sum: number, v: any) => sum + (v.views || 0), 0);
  const totalLikes = videos.reduce((sum: number, v: any) => sum + (v.likes_count || 0), 0);
  const totalComments = videos.reduce((sum: number, v: any) => sum + (v.comments_count || 0), 0);

  const avgViews = totalViews / videos.length;
  const avgLikes = totalLikes / videos.length;
  const avgComments = totalComments / videos.length;

  // Engagement rate: (likes + comments) / views
  const engagementRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0;

  return {
    total_videos: videos.length,
    total_views: totalViews,
    total_likes: totalLikes,
    total_comments: totalComments,
    avg_views_per_video: Math.round(avgViews),
    avg_likes_per_video: Math.round(avgLikes),
    avg_comments_per_video: Math.round(avgComments),
    engagement_rate: engagementRate.toFixed(2) + '%',
  };
}

/**
 * Generate recommendations based on insights
 */
function generateRecommendations(videoTrends: any, dashboardTrends: any, commentAnalysis: any) {
  const recommendations = [];

  // Video performance recommendations
  if (videoTrends.top_performing?.length > 0) {
    const topVideo = videoTrends.top_performing[0];
    if (topVideo.views_growth > 1000) {
      recommendations.push({
        type: 'success',
        category: 'video_performance',
        title: 'Strong Video Performance',
        message: `Your video "${topVideo.title}" is gaining ${topVideo.views_growth} views! Consider creating similar content.`,
      });
    }
  }

  // Check for declining videos
  const decliningVideos = videoTrends.all_trends?.filter((v: any) => v.views_growth < 0) || [];
  if (decliningVideos.length > 0) {
    recommendations.push({
      type: 'warning',
      category: 'video_performance',
      title: 'Review Video Strategy',
      message: `${decliningVideos.length} videos showing negative growth. Consider refreshing thumbnails or titles.`,
    });
  }

  // Comment engagement
  if (commentAnalysis.total_comments > 0) {
    recommendations.push({
      type: 'info',
      category: 'engagement',
      title: 'Active Community',
      message: `You have ${commentAnalysis.total_comments} comments to engage with. Regular responses boost engagement!`,
    });
  }

  return recommendations;
}

/**
 * Get time filter for SQL query
 */
function getTimeFilter(range: string): string {
  const now = new Date();

  switch (range) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case 'all':
      return new Date(0).toISOString();
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }
}
