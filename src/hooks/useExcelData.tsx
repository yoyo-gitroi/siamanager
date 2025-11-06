import { useState, useEffect } from "react";
import { parseLinkedInExcel, parseYouTubeExcel } from "@/utils/excelParser";

interface LinkedInRow {
  date: string;
  impressions: number;
  engagement: number;
}

interface YouTubeRow {
  video_title: string;
  publish_date: string;
  views: number;
  watch_time_hours: number;
  impressions: number;
  ctr: number;
  engagement: number;
  video_url?: string;
}

export const useExcelData = () => {
  const [linkedInData, setLinkedInData] = useState<LinkedInRow[]>([]);
  const [youtubeData, setYoutubeData] = useState<YouTubeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExcelFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadExcelFiles = async () => {
    try {
      // Load LinkedIn data
      const linkedInRecords = await parseLinkedInExcel("/data/linkedin-data.xlsx");
      setLinkedInData(linkedInRecords);

      // Load YouTube data
      const youtubeRecords = await parseYouTubeExcel("/data/youtube-data.xlsx");

      // Calculate engagement as 5% of views for YouTube data
      const processedYoutube = youtubeRecords.map(record => ({
        ...record,
        engagement: Math.round(record.views * 0.05),
      }));

      setYoutubeData(processedYoutube);
    } catch (error) {
      console.error("Error loading Excel files:", error);
    } finally {
      setLoading(false);
    }
  };

  return { linkedInData, youtubeData, loading };
};
