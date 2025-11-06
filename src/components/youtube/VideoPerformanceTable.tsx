import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpDown, Download, ExternalLink, Search } from "lucide-react";
import { exportToCSV, exportToExcel } from "@/utils/exportUtils";

interface VideoPerformance {
  video_id: string;
  title: string;
  thumbnail_url: string;
  published_at: string;
  duration_seconds: number;
  totalViews: number;
  totalWatchTime: number;
  totalImpressions: number;
  totalLikes: number;
  totalComments: number;
  avgCTR: number;
  engagementRate: number;
}

interface VideoPerformanceTableProps {
  videos: VideoPerformance[];
  maxRows?: number;
}

const VideoPerformanceTable = ({ videos, maxRows = 50 }: VideoPerformanceTableProps) => {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof VideoPerformance>("totalViews");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredAndSorted = useMemo(() => {
    let result = videos;

    // Filter by search
    if (search) {
      result = result.filter((v) =>
        v.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortOrder === "desc" ? -comparison : comparison;
    });

    return result.slice(0, maxRows);
  }, [videos, search, sortKey, sortOrder, maxRows]);

  const handleSort = (key: keyof VideoPerformance) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const handleExport = (exportFormat: string) => {
    const exportData = filteredAndSorted.map((v) => ({
      "Video ID": v.video_id,
      Title: v.title,
      Published: format(new Date(v.published_at), "yyyy-MM-dd"),
      "Duration (min)": (v.duration_seconds / 60).toFixed(1),
      Views: v.totalViews,
      "Watch Hours": (v.totalWatchTime / 3600).toFixed(1),
      Impressions: v.totalImpressions,
      "CTR %": v.avgCTR.toFixed(2),
      Likes: v.totalLikes,
      Comments: v.totalComments,
      "Engagement Rate %": v.engagementRate.toFixed(2),
    }));

    if (exportFormat === "csv") {
      exportToCSV(exportData, "youtube-video-performance");
    } else {
      exportToExcel(exportData, "youtube-video-performance", "Videos");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search videos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("excel")}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Thumbnail</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("title")}
                  className="hover:bg-transparent"
                >
                  Title
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("totalViews")}
                  className="hover:bg-transparent"
                >
                  Views
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("totalWatchTime")}
                  className="hover:bg-transparent"
                >
                  Watch Hours
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("avgCTR")}
                  className="hover:bg-transparent"
                >
                  CTR %
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("engagementRate")}
                  className="hover:bg-transparent"
                >
                  Engagement %
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("published_at")}
                  className="hover:bg-transparent"
                >
                  Published
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSorted.map((video) => (
              <TableRow key={video.video_id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-16 h-9 object-cover rounded"
                  />
                </TableCell>
                <TableCell className="font-medium max-w-[300px] truncate">
                  {video.title}
                </TableCell>
                <TableCell>{video.totalViews.toLocaleString()}</TableCell>
                <TableCell>{(video.totalWatchTime / 3600).toFixed(1)}</TableCell>
                <TableCell>{video.avgCTR.toFixed(2)}%</TableCell>
                <TableCell>{video.engagementRate.toFixed(2)}%</TableCell>
                <TableCell>
                  {format(new Date(video.published_at), "MMM dd, yyyy")}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `https://youtube.com/watch?v=${video.video_id}`,
                        "_blank"
                      )
                    }
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {filteredAndSorted.length} of {videos.length} videos
      </p>
    </div>
  );
};

export default VideoPerformanceTable;
