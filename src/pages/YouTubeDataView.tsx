import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataTable from "@/components/DataTable";
import { YouTubeDataSummary } from "@/components/YouTubeDataSummary";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface ChannelDaily {
  channel_id: string;
  day: string;
  views: number;
  watch_time_seconds: number;
  subscribers_gained: number;
  subscribers_lost: number;
  estimated_revenue: number;
}

interface VideoDaily {
  channel_id: string;
  video_id: string;
  day: string;
  views: number;
  watch_time_seconds: number;
  avg_view_duration_seconds: number;
  impressions: number;
  click_through_rate: number;
  likes: number;
  comments: number;
}

const channelColumns = [
  {
    key: "day",
    label: "Date",
    sortable: true,
    render: (value: string) => format(new Date(value), "MMM dd, yyyy"),
  },
  {
    key: "views",
    label: "Views",
    sortable: true,
    render: (value: number) => value.toLocaleString(),
  },
  {
    key: "watch_time_seconds",
    label: "Watch Time (hrs)",
    sortable: true,
    render: (value: number) => (value / 3600).toFixed(1),
  },
  {
    key: "subscribers_gained",
    label: "Subs Gained",
    sortable: true,
    render: (value: number) => value.toLocaleString(),
  },
  {
    key: "subscribers_lost",
    label: "Subs Lost",
    sortable: true,
    render: (value: number) => value.toLocaleString(),
  },
  {
    key: "estimated_revenue",
    label: "Revenue",
    sortable: true,
    render: (value: number) => `$${parseFloat(value.toString()).toFixed(2)}`,
  },
];

const videoColumns = [
  {
    key: "day",
    label: "Date",
    sortable: true,
    render: (value: string) => format(new Date(value), "MMM dd, yyyy"),
  },
  {
    key: "video_id",
    label: "Video ID",
    render: (value: string) => (
      <a
        href={`https://youtube.com/watch?v=${value}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        {value}
      </a>
    ),
  },
  {
    key: "views",
    label: "Views",
    sortable: true,
    render: (value: number) => value.toLocaleString(),
  },
  {
    key: "watch_time_seconds",
    label: "Watch Time (hrs)",
    sortable: true,
    render: (value: number) => (value / 3600).toFixed(1),
  },
  {
    key: "avg_view_duration_seconds",
    label: "Avg Duration (min)",
    sortable: true,
    render: (value: number) => (value / 60).toFixed(1),
  },
  {
    key: "impressions",
    label: "Impressions",
    sortable: true,
    render: (value: number) => value.toLocaleString(),
  },
  {
    key: "click_through_rate",
    label: "CTR",
    sortable: true,
    render: (value: number) => `${parseFloat(value.toString()).toFixed(2)}%`,
  },
  {
    key: "likes",
    label: "Likes",
    sortable: true,
    render: (value: number) => value.toLocaleString(),
  },
  {
    key: "comments",
    label: "Comments",
    sortable: true,
    render: (value: number) => value.toLocaleString(),
  },
];

export default function YouTubeDataView() {
  const [channelData, setChannelData] = useState<ChannelDaily[]>([]);
  const [videoData, setVideoData] = useState<VideoDaily[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch channel data (last 30 days)
      const { data: channelRows, error: channelError } = await supabase
        .from("yt_channel_daily")
        .select("*")
        .order("day", { ascending: false })
        .limit(30);

      if (channelError) throw channelError;
      setChannelData(channelRows || []);

      // Fetch video data (last 30 days)
      const { data: videoRows, error: videoError } = await supabase
        .from("yt_video_daily")
        .select("*")
        .order("day", { ascending: false })
        .limit(100);

      if (videoError) throw videoError;
      setVideoData(videoRows || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">YouTube Analytics Data</h1>
        <p className="text-muted-foreground">
          Comprehensive view of your YouTube channel and video analytics
        </p>
      </div>

      <YouTubeDataSummary />

      <Tabs defaultValue="channel" className="space-y-4">
        <TabsList>
          <TabsTrigger value="channel">Channel Daily</TabsTrigger>
          <TabsTrigger value="video">Video Daily</TabsTrigger>
        </TabsList>

        <TabsContent value="channel">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Channel Daily Metrics</h2>
            <DataTable
              columns={channelColumns}
              data={channelData}
            />
          </Card>
        </TabsContent>

        <TabsContent value="video">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Video Daily Metrics</h2>
            <DataTable
              columns={videoColumns}
              data={videoData}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}