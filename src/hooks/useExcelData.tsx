import { useState, useEffect } from 'react';
import { parseLinkedInExcel, parseYouTubeExcel, LinkedInRecord, YouTubeRecord } from '@/utils/excelParser';

export const useExcelData = () => {
  const [linkedInData, setLinkedInData] = useState<LinkedInRecord[]>([]);
  const [youtubeData, setYouTubeData] = useState<YouTubeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [linkedIn, youtube] = await Promise.all([
          parseLinkedInExcel('/data/linkedin-data.xlsx'),
          parseYouTubeExcel('/data/youtube-data.xlsx'),
        ]);
        
        setLinkedInData(linkedIn);
        setYouTubeData(youtube);
        setError(null);
      } catch (err) {
        console.error('Error loading Excel data:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return { linkedInData, youtubeData, loading, error };
};
