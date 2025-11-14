/**
 * Shared Instagram API Utilities
 *
 * This module provides centralized functions for querying Instagram Graph API.
 * Used across all Instagram edge functions to eliminate code duplication.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

export interface InstagramConnection {
  instagram_user_id: string;
  username: string;
  access_token: string;
  token_expiry: string | null;
}

/**
 * Refresh Instagram long-lived access token
 *
 * Long-lived tokens last 60 days. This function exchanges an existing
 * long-lived token for a new one with extended expiry.
 *
 * @param accessToken - Current Instagram access token
 * @returns Promise with new token and expiry
 */
export async function refreshInstagramToken(accessToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const url = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
  url.searchParams.set('grant_type', 'ig_refresh_token');
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh Instagram token: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Get Instagram connection for a user with automatic token refresh
 *
 * This function:
 * 1. Fetches the user's Instagram connection
 * 2. Checks if token is expired or expiring soon (within 7 days)
 * 3. Refreshes the token if needed
 * 4. Updates database with new token
 *
 * @param supabase - Supabase client instance
 * @param userId - The user's ID
 * @returns Promise with Instagram connection details
 */
export async function getInstagramConnection(
  supabase: SupabaseClient,
  userId: string
): Promise<InstagramConnection> {
  const { data, error } = await supabase
    .from('instagram_connection')
    .select('instagram_user_id, username, access_token, token_expiry')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    throw new Error('No Instagram connection found. Please connect your Instagram account first.');
  }

  // Check if token is expired or expiring soon (within 7 days)
  const expiry = data.token_expiry ? new Date(data.token_expiry) : null;
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (expiry && expiry <= sevenDaysFromNow) {
    console.log(`Instagram token expiring soon for user ${userId}, refreshing...`);

    try {
      const refreshed = await refreshInstagramToken(data.access_token);
      const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000);

      // Update connection with new token
      await supabase
        .from('instagram_connection')
        .update({
          access_token: refreshed.access_token,
          token_expiry: newExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      console.log(`Instagram token refreshed successfully, new expiry: ${newExpiry.toISOString()}`);

      return {
        instagram_user_id: data.instagram_user_id,
        username: data.username,
        access_token: refreshed.access_token,
        token_expiry: newExpiry.toISOString(),
      };
    } catch (refreshError) {
      console.error(`Failed to refresh Instagram token for user ${userId}:`, refreshError);
      throw new Error('Instagram access token expired and refresh failed. Please reconnect your account.');
    }
  }

  return data as InstagramConnection;
}

/**
 * Query Instagram Graph API with retry logic
 *
 * @param endpoint - API endpoint (e.g., 'me/media', 'insights')
 * @param params - Query parameters
 * @param accessToken - Instagram access token
 * @param retries - Number of retry attempts
 * @returns Promise with API response data
 */
export async function queryInstagramAPI(
  endpoint: string,
  params: Record<string, string>,
  accessToken: string,
  retries = 3
): Promise<any> {
  const url = new URL(`https://graph.facebook.com/v18.0/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
  url.searchParams.append('access_token', accessToken);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorText = await response.text();

        // Retry on server errors (5xx)
        if (response.status >= 500 && attempt < retries) {
          console.warn(`Instagram API attempt ${attempt} failed with ${response.status}, retrying...`);
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        throw new Error(`Instagram API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt === retries) throw error;
      console.warn(`Instagram API attempt ${attempt} failed:`, error);
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/**
 * Get Instagram account insights
 *
 * @param instagramUserId - Instagram Business Account ID
 * @param metrics - Comma-separated metrics
 * @param period - Time period ('day', 'week', 'days_28')
 * @param accessToken - Access token
 * @returns Promise with insights data
 */
export async function getAccountInsights(
  instagramUserId: string,
  metrics: string,
  period: string,
  accessToken: string
): Promise<any> {
  return await queryInstagramAPI(
    `${instagramUserId}/insights`,
    {
      metric: metrics,
      period,
    },
    accessToken
  );
}

/**
 * Get Instagram media insights
 *
 * @param mediaId - Instagram media ID
 * @param metrics - Comma-separated metrics
 * @param accessToken - Access token
 * @returns Promise with insights data
 */
export async function getMediaInsights(
  mediaId: string,
  metrics: string,
  accessToken: string
): Promise<any> {
  return await queryInstagramAPI(
    `${mediaId}/insights`,
    {
      metric: metrics,
    },
    accessToken
  );
}

/**
 * Get Instagram media list
 *
 * @param instagramUserId - Instagram Business Account ID
 * @param accessToken - Access token
 * @param limit - Number of media items to fetch
 * @param fields - Fields to retrieve
 * @returns Promise with media list
 */
export async function getMediaList(
  instagramUserId: string,
  accessToken: string,
  limit = 25,
  fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username'
): Promise<any> {
  return await queryInstagramAPI(
    `${instagramUserId}/media`,
    {
      fields,
      limit: limit.toString(),
    },
    accessToken
  );
}

/**
 * Get Instagram account info
 *
 * @param instagramUserId - Instagram Business Account ID
 * @param accessToken - Access token
 * @returns Promise with account info
 */
export async function getAccountInfo(
  instagramUserId: string,
  accessToken: string
): Promise<any> {
  return await queryInstagramAPI(
    instagramUserId,
    {
      fields: 'id,username,name,profile_picture_url,followers_count,follows_count,media_count',
    },
    accessToken
  );
}

/**
 * Available Instagram Account Insights Metrics
 *
 * Lifetime metrics (period=day):
 * - impressions: Total impressions
 * - reach: Total reach
 * - profile_views: Profile views
 * - website_clicks: Website button clicks
 * - email_contacts: Email button clicks
 * - phone_call_clicks: Phone button clicks
 * - text_message_clicks: Text button clicks
 * - get_directions_clicks: Directions button clicks
 *
 * For more: https://developers.facebook.com/docs/instagram-api/reference/ig-user/insights
 */
export const ACCOUNT_METRICS = {
  DAILY: [
    'impressions',
    'reach',
    'profile_views',
    'website_clicks',
    'email_contacts',
    'phone_call_clicks',
    'text_message_clicks',
    'get_directions_clicks',
  ].join(','),
} as const;

/**
 * Available Instagram Media Insights Metrics
 *
 * For posts/reels:
 * - engagement: Post engagements
 * - impressions: Post impressions
 * - reach: Post reach
 * - saved: Post saves
 * - video_views: Video views (video only)
 * - likes: Likes (removed from API but available via media object)
 * - comments: Comments (removed from API but available via media object)
 *
 * For stories:
 * - exits: Story exits
 * - impressions: Story impressions
 * - reach: Story reach
 * - replies: Story replies
 * - taps_forward: Taps forward
 * - taps_back: Taps back
 */
export const MEDIA_METRICS = {
  POST: ['engagement', 'impressions', 'reach', 'saved'].join(','),
  VIDEO: ['engagement', 'impressions', 'reach', 'saved', 'video_views'].join(','),
  STORY: ['exits', 'impressions', 'reach', 'replies', 'taps_forward', 'taps_back'].join(','),
} as const;
