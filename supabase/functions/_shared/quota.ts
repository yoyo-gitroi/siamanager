/**
 * Shared YouTube API Quota Management Utilities
 *
 * This module provides centralized functions for tracking and managing YouTube API quota usage.
 * YouTube API has a default quota of 10,000 units per day per project.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

// Quota limits
export const DAILY_QUOTA_LIMIT = 10000; // YouTube API default daily quota
export const WARNING_THRESHOLD = 0.8; // Warn at 80% usage (8000 units)
export const CRITICAL_THRESHOLD = 0.9; // Critical at 90% usage (9000 units)

/**
 * Track YouTube API quota usage for a user
 *
 * This function:
 * 1. Gets or creates today's quota record for the user
 * 2. Adds the specified units to the user's daily usage
 * 3. Checks if usage exceeds warning threshold
 * 4. Returns whether the user can proceed with API calls
 *
 * @param supabase - Supabase client instance
 * @param userId - The user's ID
 * @param unitsUsed - Number of API units consumed
 * @returns Promise with boolean indicating if more API calls can be made
 */
export async function trackQuotaUsage(
  supabase: SupabaseClient,
  userId: string,
  unitsUsed: number
): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];

  // Get today's quota record
  const { data: quota } = await supabase
    .from('yt_api_quota_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  const currentUsage = quota?.units_used || 0;
  const newUsage = currentUsage + unitsUsed;

  // Check if we're approaching the limit
  const warningLimit = DAILY_QUOTA_LIMIT * WARNING_THRESHOLD;
  const criticalLimit = DAILY_QUOTA_LIMIT * CRITICAL_THRESHOLD;

  if (newUsage >= criticalLimit) {
    console.error(`User ${userId} exceeded critical quota threshold: ${newUsage}/${DAILY_QUOTA_LIMIT} units (${Math.round(newUsage / DAILY_QUOTA_LIMIT * 100)}%)`);
    return false; // Don't proceed
  }

  if (newUsage >= warningLimit) {
    console.warn(`User ${userId} approaching quota limit: ${newUsage}/${DAILY_QUOTA_LIMIT} units (${Math.round(newUsage / DAILY_QUOTA_LIMIT * 100)}%)`);
  }

  // Upsert quota usage
  const { error } = await supabase
    .from('yt_api_quota_usage')
    .upsert(
      {
        user_id: userId,
        date: today,
        units_used: newUsage,
        units_available: DAILY_QUOTA_LIMIT,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,date',
      }
    );

  if (error) {
    console.error(`Error tracking quota usage for user ${userId}:`, error);
  }

  return newUsage < criticalLimit;
}

/**
 * Check if a user can proceed with API call without updating quota
 *
 * This is useful for checking quota before making API calls.
 *
 * @param supabase - Supabase client instance
 * @param userId - The user's ID
 * @param estimatedUnits - Estimated units that will be consumed (optional)
 * @returns Promise with object containing canProceed flag and current usage
 */
export async function canProceed(
  supabase: SupabaseClient,
  userId: string,
  estimatedUnits = 0
): Promise<{ canProceed: boolean; currentUsage: number; remaining: number }> {
  const today = new Date().toISOString().split('T')[0];

  const { data: quota } = await supabase
    .from('yt_api_quota_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  const currentUsage = quota?.units_used || 0;
  const projectedUsage = currentUsage + estimatedUnits;
  const criticalLimit = DAILY_QUOTA_LIMIT * CRITICAL_THRESHOLD;

  return {
    canProceed: projectedUsage < criticalLimit,
    currentUsage,
    remaining: DAILY_QUOTA_LIMIT - currentUsage,
  };
}

/**
 * Get quota usage statistics for a user
 *
 * @param supabase - Supabase client instance
 * @param userId - The user's ID
 * @returns Promise with quota statistics
 */
export async function getQuotaStats(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  usedToday: number;
  remaining: number;
  percentUsed: number;
  isWarning: boolean;
  isCritical: boolean;
}> {
  const today = new Date().toISOString().split('T')[0];

  const { data: quota } = await supabase
    .from('yt_api_quota_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  const usedToday = quota?.units_used || 0;
  const remaining = DAILY_QUOTA_LIMIT - usedToday;
  const percentUsed = (usedToday / DAILY_QUOTA_LIMIT) * 100;

  return {
    usedToday,
    remaining,
    percentUsed: Math.round(percentUsed * 100) / 100, // Round to 2 decimals
    isWarning: usedToday >= DAILY_QUOTA_LIMIT * WARNING_THRESHOLD,
    isCritical: usedToday >= DAILY_QUOTA_LIMIT * CRITICAL_THRESHOLD,
  };
}

/**
 * Reset quota for a user (use with caution - mainly for testing)
 *
 * @param supabase - Supabase client instance
 * @param userId - The user's ID
 * @returns Promise with success status
 */
export async function resetQuota(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];

  const { error } = await supabase
    .from('yt_api_quota_usage')
    .delete()
    .eq('user_id', userId)
    .eq('date', today);

  if (error) {
    console.error(`Error resetting quota for user ${userId}:`, error);
    return false;
  }

  return true;
}

/**
 * YouTube API quota cost reference
 *
 * Common operations and their quota costs:
 * - channels.list: 1 unit
 * - videos.list: 1 unit
 * - search.list: 100 units
 * - playlistItems.list: 1 unit
 * - youtube.reporting.reports.query: 0 units (Analytics API)
 *
 * For detailed quota costs: https://developers.google.com/youtube/v3/determine_quota_cost
 */
export const QUOTA_COSTS = {
  CHANNEL_LIST: 1,
  VIDEO_LIST: 1,
  SEARCH: 100,
  PLAYLIST_ITEMS: 1,
  ANALYTICS_QUERY: 0, // Analytics API doesn't consume Data API quota
} as const;
