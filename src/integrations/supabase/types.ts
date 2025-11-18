export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agent_runs: {
        Row: {
          agent_id: string
          created_at: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          latency_ms: number | null
          request_body: Json | null
          response_code: number | null
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          latency_ms?: number | null
          request_body?: Json | null
          response_code?: number | null
          started_at?: string | null
          status: string
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          latency_ms?: number | null
          request_body?: Json | null
          response_code?: number | null
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_webhooks: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
          webhook_url: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          webhook_url: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          webhook_url?: string
        }
        Relationships: []
      }
      agents: {
        Row: {
          avg_latency_ms: number | null
          created_at: string | null
          description: string | null
          id: string
          last_run_at: string | null
          name: string
          payload_template: Json | null
          pillar: string
          status: string | null
          success_rate: number | null
          updated_at: string | null
          webhook_headers: Json | null
          webhook_method: string | null
          webhook_url: string | null
        }
        Insert: {
          avg_latency_ms?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_run_at?: string | null
          name: string
          payload_template?: Json | null
          pillar: string
          status?: string | null
          success_rate?: number | null
          updated_at?: string | null
          webhook_headers?: Json | null
          webhook_method?: string | null
          webhook_url?: string | null
        }
        Update: {
          avg_latency_ms?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_run_at?: string | null
          name?: string
          payload_template?: Json | null
          pillar?: string
          status?: string | null
          success_rate?: number | null
          updated_at?: string | null
          webhook_headers?: Json | null
          webhook_method?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      content_correlations: {
        Row: {
          correlation_coeff: number
          created_at: string | null
          date_bucket: string
          id: string
          metric_a: string
          metric_b: string
          notes: string | null
          p_value: number | null
          platform_a: string
          platform_b: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          correlation_coeff: number
          created_at?: string | null
          date_bucket: string
          id?: string
          metric_a: string
          metric_b: string
          notes?: string | null
          p_value?: number | null
          platform_a: string
          platform_b: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          correlation_coeff?: number
          created_at?: string | null
          date_bucket?: string
          id?: string
          metric_a?: string
          metric_b?: string
          notes?: string | null
          p_value?: number | null
          platform_a?: string
          platform_b?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      content_queue: {
        Row: {
          caption: string | null
          created_at: string | null
          error_message: string | null
          id: string
          media_url: string | null
          platforms: string[]
          published_at: string | null
          schedule_at: string
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          media_url?: string | null
          platforms: string[]
          published_at?: string | null
          schedule_at: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          media_url?: string | null
          platforms?: string[]
          published_at?: string | null
          schedule_at?: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      google_oauth_tokens: {
        Row: {
          access_token: string
          created_at: string
          expiry_ts: string
          id: string
          provider: string
          refresh_token: string
          scope: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token: string
          created_at?: string
          expiry_ts: string
          id?: string
          provider?: string
          refresh_token: string
          scope: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string
          expiry_ts?: string
          id?: string
          provider?: string
          refresh_token?: string
          scope?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      guest_candidates: {
        Row: {
          audience_overlap_estimate: number | null
          created_at: string | null
          followers: number | null
          handle: string
          id: string
          name: string
          notes: string | null
          platform: string
          source_url: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audience_overlap_estimate?: number | null
          created_at?: string | null
          followers?: number | null
          handle: string
          id?: string
          name: string
          notes?: string | null
          platform: string
          source_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audience_overlap_estimate?: number | null
          created_at?: string | null
          followers?: number | null
          handle?: string
          id?: string
          name?: string
          notes?: string | null
          platform?: string
          source_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      instagram_analytics: {
        Row: {
          comments: number | null
          created_at: string | null
          date: string
          engagement: number | null
          followers: number | null
          id: string
          likes: number | null
          posts_count: number | null
          updated_at: string | null
          user_id: string
          views_impressions: number | null
        }
        Insert: {
          comments?: number | null
          created_at?: string | null
          date: string
          engagement?: number | null
          followers?: number | null
          id?: string
          likes?: number | null
          posts_count?: number | null
          updated_at?: string | null
          user_id: string
          views_impressions?: number | null
        }
        Update: {
          comments?: number | null
          created_at?: string | null
          date?: string
          engagement?: number | null
          followers?: number | null
          id?: string
          likes?: number | null
          posts_count?: number | null
          updated_at?: string | null
          user_id?: string
          views_impressions?: number | null
        }
        Relationships: []
      }
      linkedin_analytics: {
        Row: {
          created_at: string | null
          date: string
          engagement: number | null
          followers: number | null
          id: string
          impressions: number | null
          reach: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          engagement?: number | null
          followers?: number | null
          id?: string
          impressions?: number | null
          reach?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          engagement?: number | null
          followers?: number | null
          id?: string
          impressions?: number | null
          reach?: number | null
          user_id?: string
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          created_at: string
          id: string
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shorts_generation_logs: {
        Row: {
          avg_video_time: number
          created_at: string
          id: string
          number_of_shorts: number
          user_email: string
          user_id: string
          video_url: string
        }
        Insert: {
          avg_video_time: number
          created_at?: string
          id?: string
          number_of_shorts: number
          user_email: string
          user_id: string
          video_url: string
        }
        Update: {
          avg_video_time?: number
          created_at?: string
          id?: string
          number_of_shorts?: number
          user_email?: string
          user_id?: string
          video_url?: string
        }
        Relationships: []
      }
      social_accounts: {
        Row: {
          created_at: string | null
          handle: string
          id: string
          is_primary: boolean | null
          oauth_token: string | null
          platform: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          handle: string
          id?: string
          is_primary?: boolean | null
          oauth_token?: string | null
          platform: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          handle?: string
          id?: string
          is_primary?: boolean | null
          oauth_token?: string | null
          platform?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      youtube_analytics: {
        Row: {
          content_type: string | null
          created_at: string | null
          ctr: number | null
          engagement: number | null
          id: string
          impressions: number | null
          publish_date: string | null
          subscribers: number | null
          user_id: string
          video_title: string
          video_url: string | null
          views: number | null
          watch_hours: number | null
          watch_time_hours: number | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string | null
          ctr?: number | null
          engagement?: number | null
          id?: string
          impressions?: number | null
          publish_date?: string | null
          subscribers?: number | null
          user_id: string
          video_title: string
          video_url?: string | null
          views?: number | null
          watch_hours?: number | null
          watch_time_hours?: number | null
        }
        Update: {
          content_type?: string | null
          created_at?: string | null
          ctr?: number | null
          engagement?: number | null
          id?: string
          impressions?: number | null
          publish_date?: string | null
          subscribers?: number | null
          user_id?: string
          video_title?: string
          video_url?: string | null
          views?: number | null
          watch_hours?: number | null
          watch_time_hours?: number | null
        }
        Relationships: []
      }
      youtube_connection: {
        Row: {
          access_token: string
          channel_id: string | null
          created_at: string | null
          id: string
          refresh_token: string | null
          token_expiry: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          channel_id?: string | null
          created_at?: string | null
          id?: string
          refresh_token?: string | null
          token_expiry?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          channel_id?: string | null
          created_at?: string | null
          id?: string
          refresh_token?: string | null
          token_expiry?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      youtube_external_signals: {
        Row: {
          created_at: string | null
          id: string
          metric: string
          observed_at: string | null
          source: string
          user_id: string
          value: number
          video_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metric: string
          observed_at?: string | null
          source: string
          user_id: string
          value: number
          video_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metric?: string
          observed_at?: string | null
          source?: string
          user_id?: string
          value?: number
          video_id?: string
        }
        Relationships: []
      }
      youtube_raw_archive: {
        Row: {
          channel_id: string
          fetched_at: string | null
          id: number
          report_type: string
          request_json: Json
          response_json: Json
          user_id: string
        }
        Insert: {
          channel_id: string
          fetched_at?: string | null
          id?: number
          report_type: string
          request_json: Json
          response_json: Json
          user_id: string
        }
        Update: {
          channel_id?: string
          fetched_at?: string | null
          id?: number
          report_type?: string
          request_json?: Json
          response_json?: Json
          user_id?: string
        }
        Relationships: []
      }
      youtube_sync_state: {
        Row: {
          channel_id: string
          id: string
          last_error: string | null
          last_sync_at: string | null
          last_sync_date: string | null
          rows_inserted: number | null
          rows_updated: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          last_sync_date?: string | null
          rows_inserted?: number | null
          rows_updated?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          last_sync_date?: string | null
          rows_inserted?: number | null
          rows_updated?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      yt_api_quota_usage: {
        Row: {
          created_at: string | null
          date: string
          id: string
          last_reset_at: string | null
          units_available: number
          units_used: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          last_reset_at?: string | null
          units_available?: number
          units_used?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          last_reset_at?: string | null
          units_available?: number
          units_used?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      yt_audience_retention: {
        Row: {
          audience_watch_ratio: number | null
          channel_id: string
          created_at: string | null
          day: string
          elapsed_video_time_ratio: number | null
          id: string
          subscribed_status: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          audience_watch_ratio?: number | null
          channel_id: string
          created_at?: string | null
          day: string
          elapsed_video_time_ratio?: number | null
          id?: string
          subscribed_status?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          audience_watch_ratio?: number | null
          channel_id?: string
          created_at?: string | null
          day?: string
          elapsed_video_time_ratio?: number | null
          id?: string
          subscribed_status?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      yt_channel_daily: {
        Row: {
          channel_id: string
          created_at: string
          day: string
          estimated_revenue: number | null
          subscribers_gained: number | null
          subscribers_lost: number | null
          user_id: string | null
          views: number | null
          watch_time_seconds: number | null
        }
        Insert: {
          channel_id: string
          created_at?: string
          day: string
          estimated_revenue?: number | null
          subscribers_gained?: number | null
          subscribers_lost?: number | null
          user_id?: string | null
          views?: number | null
          watch_time_seconds?: number | null
        }
        Update: {
          channel_id?: string
          created_at?: string
          day?: string
          estimated_revenue?: number | null
          subscribers_gained?: number | null
          subscribers_lost?: number | null
          user_id?: string | null
          views?: number | null
          watch_time_seconds?: number | null
        }
        Relationships: []
      }
      yt_channel_intraday: {
        Row: {
          captured_at: string
          channel_id: string
          id: string
          subscriber_count: number | null
          user_id: string
          video_count: number | null
          view_count: number | null
        }
        Insert: {
          captured_at?: string
          channel_id: string
          id?: string
          subscriber_count?: number | null
          user_id: string
          video_count?: number | null
          view_count?: number | null
        }
        Update: {
          captured_at?: string
          channel_id?: string
          id?: string
          subscriber_count?: number | null
          user_id?: string
          video_count?: number | null
          view_count?: number | null
        }
        Relationships: []
      }
      yt_demographics: {
        Row: {
          age_group: string | null
          channel_id: string
          created_at: string | null
          day: string
          gender: string | null
          id: string
          user_id: string
          viewer_percentage: number | null
        }
        Insert: {
          age_group?: string | null
          channel_id: string
          created_at?: string | null
          day: string
          gender?: string | null
          id?: string
          user_id: string
          viewer_percentage?: number | null
        }
        Update: {
          age_group?: string | null
          channel_id?: string
          created_at?: string | null
          day?: string
          gender?: string | null
          id?: string
          user_id?: string
          viewer_percentage?: number | null
        }
        Relationships: []
      }
      yt_device_stats: {
        Row: {
          channel_id: string
          created_at: string | null
          day: string
          device_type: string | null
          id: string
          operating_system: string | null
          user_id: string
          views: number | null
          watch_time_seconds: number | null
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          day: string
          device_type?: string | null
          id?: string
          operating_system?: string | null
          user_id: string
          views?: number | null
          watch_time_seconds?: number | null
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          day?: string
          device_type?: string | null
          id?: string
          operating_system?: string | null
          user_id?: string
          views?: number | null
          watch_time_seconds?: number | null
        }
        Relationships: []
      }
      yt_geography: {
        Row: {
          channel_id: string
          country: string | null
          created_at: string | null
          day: string
          id: string
          province: string | null
          user_id: string
          views: number | null
          watch_time_seconds: number | null
        }
        Insert: {
          channel_id: string
          country?: string | null
          created_at?: string | null
          day: string
          id?: string
          province?: string | null
          user_id: string
          views?: number | null
          watch_time_seconds?: number | null
        }
        Update: {
          channel_id?: string
          country?: string | null
          created_at?: string | null
          day?: string
          id?: string
          province?: string | null
          user_id?: string
          views?: number | null
          watch_time_seconds?: number | null
        }
        Relationships: []
      }
      yt_playlist_analytics: {
        Row: {
          avg_time_in_playlist_seconds: number | null
          channel_id: string
          created_at: string | null
          day: string
          id: string
          playlist_id: string | null
          user_id: string
          views: number | null
          watch_time_seconds: number | null
        }
        Insert: {
          avg_time_in_playlist_seconds?: number | null
          channel_id: string
          created_at?: string | null
          day: string
          id?: string
          playlist_id?: string | null
          user_id: string
          views?: number | null
          watch_time_seconds?: number | null
        }
        Update: {
          avg_time_in_playlist_seconds?: number | null
          channel_id?: string
          created_at?: string | null
          day?: string
          id?: string
          playlist_id?: string | null
          user_id?: string
          views?: number | null
          watch_time_seconds?: number | null
        }
        Relationships: []
      }
      yt_processed_insights: {
        Row: {
          channel_id: string
          id: string
          insights_data: Json
          period_end: string
          period_start: string
          processed_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          channel_id: string
          id?: string
          insights_data: Json
          period_end: string
          period_start: string
          processed_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          channel_id?: string
          id?: string
          insights_data?: Json
          period_end?: string
          period_start?: string
          processed_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: []
      }
      yt_revenue_daily: {
        Row: {
          ad_impressions: number | null
          channel_id: string
          cpm: number | null
          created_at: string | null
          day: string
          estimated_revenue: number | null
          id: string
          playback_based_cpm: number | null
          user_id: string
        }
        Insert: {
          ad_impressions?: number | null
          channel_id: string
          cpm?: number | null
          created_at?: string | null
          day: string
          estimated_revenue?: number | null
          id?: string
          playback_based_cpm?: number | null
          user_id: string
        }
        Update: {
          ad_impressions?: number | null
          channel_id?: string
          cpm?: number | null
          created_at?: string | null
          day?: string
          estimated_revenue?: number | null
          id?: string
          playback_based_cpm?: number | null
          user_id?: string
        }
        Relationships: []
      }
      yt_search_terms: {
        Row: {
          channel_id: string
          created_at: string | null
          day: string
          id: string
          search_term: string | null
          user_id: string
          views: number | null
          watch_time_seconds: number | null
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          day: string
          id?: string
          search_term?: string | null
          user_id: string
          views?: number | null
          watch_time_seconds?: number | null
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          day?: string
          id?: string
          search_term?: string | null
          user_id?: string
          views?: number | null
          watch_time_seconds?: number | null
        }
        Relationships: []
      }
      yt_thumbnail_tests: {
        Row: {
          created_at: string | null
          ctr: number | null
          id: string
          impressions: number | null
          notes: string | null
          updated_at: string | null
          user_id: string
          variant_label: string
          video_id: string
          window_end: string
          window_start: string
          winner: boolean | null
        }
        Insert: {
          created_at?: string | null
          ctr?: number | null
          id?: string
          impressions?: number | null
          notes?: string | null
          updated_at?: string | null
          user_id: string
          variant_label: string
          video_id: string
          window_end: string
          window_start: string
          winner?: boolean | null
        }
        Update: {
          created_at?: string | null
          ctr?: number | null
          id?: string
          impressions?: number | null
          notes?: string | null
          updated_at?: string | null
          user_id?: string
          variant_label?: string
          video_id?: string
          window_end?: string
          window_start?: string
          winner?: boolean | null
        }
        Relationships: []
      }
      yt_traffic_sources: {
        Row: {
          channel_id: string
          created_at: string | null
          day: string
          id: string
          source_detail: string | null
          source_type: string | null
          user_id: string
          views: number | null
          watch_time_seconds: number | null
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          day: string
          id?: string
          source_detail?: string | null
          source_type?: string | null
          user_id: string
          views?: number | null
          watch_time_seconds?: number | null
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          day?: string
          id?: string
          source_detail?: string | null
          source_type?: string | null
          user_id?: string
          views?: number | null
          watch_time_seconds?: number | null
        }
        Relationships: []
      }
      yt_video_daily: {
        Row: {
          avg_view_duration_seconds: number | null
          channel_id: string
          click_through_rate: number | null
          comments: number | null
          created_at: string
          day: string
          impressions: number | null
          likes: number | null
          user_id: string | null
          video_id: string
          views: number | null
          watch_time_seconds: number | null
        }
        Insert: {
          avg_view_duration_seconds?: number | null
          channel_id: string
          click_through_rate?: number | null
          comments?: number | null
          created_at?: string
          day: string
          impressions?: number | null
          likes?: number | null
          user_id?: string | null
          video_id: string
          views?: number | null
          watch_time_seconds?: number | null
        }
        Update: {
          avg_view_duration_seconds?: number | null
          channel_id?: string
          click_through_rate?: number | null
          comments?: number | null
          created_at?: string
          day?: string
          impressions?: number | null
          likes?: number | null
          user_id?: string | null
          video_id?: string
          views?: number | null
          watch_time_seconds?: number | null
        }
        Relationships: []
      }
      yt_video_intraday: {
        Row: {
          captured_at: string
          channel_id: string
          comment_count: number | null
          concurrent_viewers: number | null
          id: string
          is_live: boolean | null
          like_count: number | null
          user_id: string
          video_id: string
          view_count: number | null
        }
        Insert: {
          captured_at?: string
          channel_id: string
          comment_count?: number | null
          concurrent_viewers?: number | null
          id?: string
          is_live?: boolean | null
          like_count?: number | null
          user_id: string
          video_id: string
          view_count?: number | null
        }
        Update: {
          captured_at?: string
          channel_id?: string
          comment_count?: number | null
          concurrent_viewers?: number | null
          id?: string
          is_live?: boolean | null
          like_count?: number | null
          user_id?: string
          video_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      yt_video_metadata: {
        Row: {
          category_id: string | null
          channel_id: string
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          published_at: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          category_id?: string | null
          channel_id: string
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          published_at?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          category_id?: string | null
          channel_id?: string
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          published_at?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_oauth_states: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
