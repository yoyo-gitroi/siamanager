import * as XLSX from 'xlsx';

export interface LinkedInRecord {
  date: string;
  impressions: number;
  engagement: number;
}

export interface YouTubeRecord {
  video_title: string;
  video_url: string;
  publish_date: string;
  duration: number;
  views: number;
  watch_time_hours: number;
  subscribers: number;
  impressions: number;
  ctr: number;
}

export async function parseLinkedInExcel(filePath: string): Promise<LinkedInRecord[]> {
  try {
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get the second sheet (Page 2) which has the daily data
    const sheetName = workbook.SheetNames[1];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON, skipping the header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    // Skip header row and map to our interface
    const records: LinkedInRecord[] = jsonData.slice(1).map(row => ({
      date: row[0] || '',
      impressions: Number(row[1]) || 0,
      engagement: Number(row[2]) || 0,
    })).filter(record => record.date); // Filter out empty rows
    
    return records;
  } catch (error) {
    console.error('Error parsing LinkedIn Excel:', error);
    return [];
  }
}

export async function parseYouTubeExcel(filePath: string): Promise<YouTubeRecord[]> {
  try {
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    // Skip header row and the "Total" row, map to our interface
    const records: YouTubeRecord[] = jsonData.slice(2).map(row => {
      const videoId = row[0] || '';
      return {
        video_title: row[1] || '',
        video_url: videoId ? `https://youtube.com/watch?v=${videoId}` : '',
        publish_date: row[2] || '',
        duration: Number(row[3]) || 0,
        views: Number(row[4]) || 0,
        watch_time_hours: Number(row[5]) || 0,
        subscribers: Number(row[6]) || 0,
        impressions: Number(row[7]) || 0,
        ctr: Number(row[8]) || 0,
      };
    }).filter(record => record.video_title && record.video_title !== 'Total'); // Filter out empty rows and total
    
    return records;
  } catch (error) {
    console.error('Error parsing YouTube Excel:', error);
    return [];
  }
}
