/**
 * Shared YouTube Authentication Utilities
 *
 * This module provides centralized functions for managing YouTube OAuth tokens.
 * Used across all YouTube edge functions to eliminate code duplication.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

export interface TokenRecord {
  access_token: string;
  refresh_token: string | null;
  token_expiry: string | null;
  channel_id: string;
}

export interface ValidToken {
  token: string;
  channelId: string;
}

/**
 * Refresh an expired YouTube access token using the refresh token
 *
 * @param refreshToken - The refresh token from YouTube OAuth
 * @returns Promise with new access token and expiry information
 * @throws Error if refresh fails
 */
export async function refreshToken(refreshToken: string): Promise<any> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh token: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Get a valid YouTube access token for a user, refreshing if necessary
 *
 * This function:
 * 1. Fetches the user's YouTube connection from database
 * 2. Checks if the token is expired
 * 3. Refreshes the token if needed and updates the database
 * 4. Returns a valid access token and channel ID
 *
 * @param supabase - Supabase client instance
 * @param userId - The user's ID
 * @returns Promise with valid token and channel ID
 * @throws Error if no connection found or refresh fails
 */
export async function getValidToken(
  supabase: SupabaseClient,
  userId: string
): Promise<ValidToken> {
  const { data, error } = await supabase
    .from('youtube_connection')
    .select('access_token, refresh_token, token_expiry, channel_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    throw new Error('No YouTube connection found. Please connect your YouTube account first.');
  }

  const record = data as TokenRecord;
  const now = new Date();
  const expiry = record.token_expiry ? new Date(record.token_expiry) : null;

  // If token is expired or about to expire (within 5 minutes), refresh it
  const expiryThreshold = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now

  if (!expiry || expiry <= expiryThreshold) {
    if (!record.refresh_token) {
      throw new Error('No refresh token available. Please reconnect your YouTube account.');
    }

    console.log(`Token expired or expiring soon for user ${userId}, refreshing...`);
    const refreshed = await refreshToken(record.refresh_token);

    const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000);
    await supabase
      .from('youtube_connection')
      .update({
        access_token: refreshed.access_token,
        token_expiry: newExpiry.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return { token: refreshed.access_token, channelId: record.channel_id };
  }

  return { token: record.access_token, channelId: record.channel_id };
}

/**
 * Validate that a YouTube connection exists for a user
 *
 * @param supabase - Supabase client instance
 * @param userId - The user's ID
 * @returns Promise with boolean indicating if connection exists
 */
export async function hasYouTubeConnection(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('youtube_connection')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  return !error && !!data;
}
