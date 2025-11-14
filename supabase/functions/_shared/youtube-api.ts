/**
 * Shared YouTube API Utilities
 *
 * This module provides centralized functions for querying YouTube Analytics and Data APIs.
 * Used across all YouTube edge functions to eliminate code duplication.
 */

/**
 * Query YouTube Analytics API with retry logic
 *
 * @param channelId - The YouTube channel ID
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @param metrics - Comma-separated metrics (e.g., 'views,estimatedMinutesWatched')
 * @param token - Valid YouTube access token
 * @param dimensions - Optional dimensions (e.g., 'day', 'video')
 * @param filters - Optional filters (e.g., 'video==VIDEO_ID')
 * @param sort - Optional sort parameter
 * @param maxResults - Optional max results limit
 * @param retries - Number of retry attempts (default: 3)
 * @returns Promise with API response data
 */
export async function queryYouTubeAnalytics(
  channelId: string,
  startDate: string,
  endDate: string,
  metrics: string,
  token: string,
  dimensions?: string,
  filters?: string,
  sort?: string,
  maxResults?: number,
  retries = 3
): Promise<any> {
  const url = new URL('https://youtubeanalytics.googleapis.com/v2/reports');

  url.searchParams.append('ids', `channel==${channelId}`);
  url.searchParams.append('startDate', startDate);
  url.searchParams.append('endDate', endDate);
  url.searchParams.append('metrics', metrics);

  if (dimensions) url.searchParams.append('dimensions', dimensions);
  if (filters) url.searchParams.append('filters', filters);
  if (sort) url.searchParams.append('sort', sort);
  if (maxResults) url.searchParams.append('maxResults', maxResults.toString());

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Retry on server errors (5xx)
        if (response.status >= 500 && attempt < retries) {
          console.warn(`YouTube Analytics API attempt ${attempt} failed with ${response.status}, retrying...`);
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        throw new Error(`YouTube Analytics API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt === retries) throw error;
      console.warn(`YouTube Analytics API attempt ${attempt} failed:`, error);
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/**
 * Query YouTube Data API v3 with retry logic
 *
 * @param endpoint - API endpoint (e.g., 'channels', 'videos', 'search')
 * @param params - Query parameters as key-value object
 * @param token - Valid YouTube access token
 * @param retries - Number of retry attempts (default: 3)
 * @returns Promise with API response data
 */
export async function queryYouTubeDataAPI(
  endpoint: string,
  params: Record<string, string>,
  token: string,
  retries = 3
): Promise<any> {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Retry on server errors (5xx)
        if (response.status >= 500 && attempt < retries) {
          console.warn(`YouTube Data API attempt ${attempt} failed with ${response.status}, retrying...`);
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        throw new Error(`YouTube Data API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt === retries) throw error;
      console.warn(`YouTube Data API attempt ${attempt} failed:`, error);
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/**
 * Split a date range into quarters to avoid hitting YouTube Analytics API row limits
 *
 * The YouTube Analytics API has a limit of 200 rows per request.
 * This function helps chunk large date ranges for video-level queries.
 *
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Array of date range objects with start and end dates
 */
export function getQuarterChunks(startDate: string, endDate: string): Array<{ start: string; end: string }> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const chunks: Array<{ start: string; end: string }> = [];

  let currentStart = new Date(start);

  while (currentStart < end) {
    const currentQuarterStart = new Date(
      currentStart.getFullYear(),
      Math.floor(currentStart.getMonth() / 3) * 3,
      1
    );

    const currentQuarterEnd = new Date(
      currentQuarterStart.getFullYear(),
      currentQuarterStart.getMonth() + 3,
      0
    );

    const chunkStart = currentStart > currentQuarterStart ? currentStart : currentQuarterStart;
    const chunkEnd = end < currentQuarterEnd ? end : currentQuarterEnd;

    chunks.push({
      start: chunkStart.toISOString().split('T')[0],
      end: chunkEnd.toISOString().split('T')[0],
    });

    currentStart = new Date(currentQuarterEnd);
    currentStart.setDate(currentStart.getDate() + 1);
  }

  return chunks;
}

/**
 * Format a date to YYYY-MM-DD string
 *
 * @param date - Date object to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get date N days ago in YYYY-MM-DD format
 *
 * @param daysAgo - Number of days in the past
 * @returns Date string in YYYY-MM-DD format
 */
export function getDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return formatDate(date);
}

/**
 * Validate date format (YYYY-MM-DD)
 *
 * @param dateString - Date string to validate
 * @returns Boolean indicating if format is valid
 */
export function isValidDateFormat(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
