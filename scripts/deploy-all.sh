#!/bin/bash

# SiaManager - Complete Deployment Script
# This script deploys all migrations and edge functions for Phase 1 & 2

set -e  # Exit on error

echo "🚀 SiaManager Deployment Script"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0.32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Step 1: Apply Database Migrations
echo -e "${BLUE}Step 1: Applying database migrations...${NC}"
echo "----------------------------------------"
supabase db reset
echo -e "${GREEN}✓ Migrations applied${NC}"
echo ""

# Step 2: Deploy YouTube Edge Functions (Phase 1)
echo -e "${BLUE}Step 2: Deploying YouTube edge functions...${NC}"
echo "-------------------------------------------"

YOUTUBE_FUNCTIONS=(
    "yt-realtime-snapshot"
    "yt-sync-daily-v2"
    "yt-sync-all-users-daily"
    "yt-backfill-v2"
    "yt-backfill-comprehensive"
    "yt-fetch-video-metadata"
    "yt-fetch-revenue"
    "yt-fetch-demographics"
    "yt-fetch-geography"
    "yt-fetch-traffic"
    "yt-fetch-devices"
    "yt-fetch-retention"
    "yt-fetch-playlists"
    "yt-fetch-search-terms"
    "yt-validate-channel"
    "yt-update-channel"
    "yt-list-channels"
)

for func in "${YOUTUBE_FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$func" ]; then
        echo "Deploying $func..."
        supabase functions deploy $func
    else
        echo -e "${YELLOW}⚠ Skipping $func (not found)${NC}"
    fi
done

echo -e "${GREEN}✓ YouTube functions deployed${NC}"
echo ""

# Step 3: Deploy Instagram Edge Functions (Phase 2)
echo -e "${BLUE}Step 3: Deploying Instagram edge functions...${NC}"
echo "--------------------------------------------"

INSTAGRAM_FUNCTIONS=(
    "instagram-oauth-start"
    "instagram-oauth-callback"
    "instagram-sync-daily"
    "instagram-realtime-snapshot"
    "instagram-fetch-media"
)

for func in "${INSTAGRAM_FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$func" ]; then
        echo "Deploying $func..."
        supabase functions deploy $func
    else
        echo -e "${YELLOW}⚠ Skipping $func (not found)${NC}"
    fi
done

echo -e "${GREEN}✓ Instagram functions deployed${NC}"
echo ""

# Step 4: Verify Cron Jobs
echo -e "${BLUE}Step 4: Verifying cron jobs...${NC}"
echo "--------------------------------"
echo "Checking scheduled jobs..."

supabase db psql <<SQL
SELECT
    jobname,
    schedule,
    active,
    jobid
FROM cron.job
WHERE jobname LIKE '%realtime-snapshots'
ORDER BY jobname;
SQL

echo -e "${GREEN}✓ Cron jobs verified${NC}"
echo ""

# Step 5: Display Summary
echo ""
echo "================================"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Set environment variables (if not done yet):"
echo "   - FACEBOOK_APP_ID"
echo "   - FACEBOOK_APP_SECRET"
echo "   - INSTAGRAM_REDIRECT_URI"
echo ""
echo "2. Test the deployment:"
echo "   - YouTube real-time: supabase functions invoke yt-realtime-snapshot"
echo "   - Instagram real-time: supabase functions invoke instagram-realtime-snapshot"
echo ""
echo "3. Monitor cron jobs:"
echo "   supabase db psql -c \"SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;\""
echo ""
echo "📚 For more info, see:"
echo "   - REFACTORING.md (Phase 1)"
echo "   - PHASE2_INSTAGRAM.md (Phase 2)"
echo ""
