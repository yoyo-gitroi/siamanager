import ExcelJS from 'exceljs';

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

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // Get the second sheet (Page 2) which has the daily data
    const worksheet = workbook.worksheets[1];
    if (!worksheet) {
      throw new Error('LinkedIn data sheet not found');
    }

    const records: LinkedInRecord[] = [];

    // Skip header row (row 1), start from row 2
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const date = row.getCell(1).value?.toString() || '';
      if (!date) return; // Skip empty rows

      records.push({
        date,
        impressions: Number(row.getCell(2).value) || 0,
        engagement: Number(row.getCell(3).value) || 0,
      });
    });

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

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // Get the first sheet
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('YouTube data sheet not found');
    }

    const records: YouTubeRecord[] = [];

    // Skip header row (row 1) and total row (row 2), start from row 3
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 2) return; // Skip header and total row

      const videoTitle = row.getCell(2).value?.toString() || '';
      if (!videoTitle || videoTitle === 'Total') return; // Skip empty rows and total

      const videoId = row.getCell(1).value?.toString() || '';

      records.push({
        video_title: videoTitle,
        video_url: videoId ? `https://youtube.com/watch?v=${videoId}` : '',
        publish_date: row.getCell(3).value?.toString() || '',
        duration: Number(row.getCell(4).value) || 0,
        views: Number(row.getCell(5).value) || 0,
        watch_time_hours: Number(row.getCell(6).value) || 0,
        subscribers: Number(row.getCell(7).value) || 0,
        impressions: Number(row.getCell(8).value) || 0,
        ctr: Number(row.getCell(9).value) || 0,
      });
    });

    return records;
  } catch (error) {
    console.error('Error parsing YouTube Excel:', error);
    return [];
  }
}
