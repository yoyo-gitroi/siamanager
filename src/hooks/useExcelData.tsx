import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

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
  }, []);

  const loadExcelFiles = async () => {
    try {
      // Load LinkedIn data
      const linkedInResponse = await fetch("/data/linkedin-data.xlsx");
      const linkedInBuffer = await linkedInResponse.arrayBuffer();
      const linkedInWorkbook = XLSX.read(linkedInBuffer);
      const linkedInSheet = linkedInWorkbook.Sheets[linkedInWorkbook.SheetNames[1]]; // Page 2 has the daily data
      const linkedInJson = XLSX.utils.sheet_to_json(linkedInSheet);

      const processedLinkedIn = linkedInJson.map((row: any) => ({
        date: row.Date ? new Date(row.Date).toISOString().split('T')[0] : '',
        impressions: parseInt(row.Impressions) || 0,
        engagement: parseInt(row.Engagements) || 0,
      })).filter((row: any) => row.date); // Filter out rows without dates

      // Load YouTube data
      const youtubeResponse = await fetch("/data/youtube-data.xlsx");
      const youtubeBuffer = await youtubeResponse.arrayBuffer();
      const youtubeWorkbook = XLSX.read(youtubeBuffer);
      const youtubeSheet = youtubeWorkbook.Sheets[youtubeWorkbook.SheetNames[0]];
      const youtubeJson = XLSX.utils.sheet_to_json(youtubeSheet);

      const processedYoutube = youtubeJson
        .slice(1) // Skip the "Total" row
        .map((row: any) => ({
          video_title: row['Video title'] || '',
          publish_date: row['Video publish time'] ? parseYouTubeDate(row['Video publish time']) : '',
          views: parseInt(row.Views) || 0,
          watch_time_hours: parseFloat(row['Watch time (hours)']) || 0,
          impressions: parseInt(row.Impressions) || 0,
          ctr: parseFloat(row['Impressions click-through rate (%)']) || 0,
          engagement: Math.round((parseInt(row.Views) || 0) * 0.05), // Estimate engagement as 5% of views
        }))
        .filter((row: any) => row.video_title && row.video_title !== 'Total');

      setLinkedInData(processedLinkedIn);
      setYoutubeData(processedYoutube);
    } catch (error) {
      console.error("Error loading Excel files:", error);
    } finally {
      setLoading(false);
    }
  };

  // Parse YouTube date format (e.g., "May 5, 2025")
  const parseYouTubeDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  return { linkedInData, youtubeData, loading };
};
