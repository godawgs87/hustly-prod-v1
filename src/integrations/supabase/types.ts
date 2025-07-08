export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_training_data: {
        Row: {
          category: string | null
          condition_rating: string | null
          created_at: string
          days_to_sell: number | null
          description: string | null
          external_listing_id: string | null
          final_price: number | null
          id: string
          keywords: string[] | null
          listing_date: string | null
          offer_count: number | null
          raw_data: Json | null
          sold_date: string | null
          source_platform: string
          success_score: number | null
          title: string
          training_weight: number | null
          updated_at: string
          user_id: string
          view_count: number | null
          watcher_count: number | null
        }
        Insert: {
          category?: string | null
          condition_rating?: string | null
          created_at?: string
          days_to_sell?: number | null
          description?: string | null
          external_listing_id?: string | null
          final_price?: number | null
          id?: string
          keywords?: string[] | null
          listing_date?: string | null
          offer_count?: number | null
          raw_data?: Json | null
          sold_date?: string | null
          source_platform: string
          success_score?: number | null
          title: string
          training_weight?: number | null
          updated_at?: string
          user_id: string
          view_count?: number | null
          watcher_count?: number | null
        }
        Update: {
          category?: string | null
          condition_rating?: string | null
          created_at?: string
          days_to_sell?: number | null
          description?: string | null
          external_listing_id?: string | null
          final_price?: number | null
          id?: string
          keywords?: string[] | null
          listing_date?: string | null
          offer_count?: number | null
          raw_data?: Json | null
          sold_date?: string | null
          source_platform?: string
          success_score?: number | null
          title?: string
          training_weight?: number | null
          updated_at?: string
          user_id?: string
          view_count?: number | null
          watcher_count?: number | null
        }
        Relationships: []
      }
      ai_user_models: {
        Row: {
          category_preferences: Json | null
          created_at: string
          description_patterns: Json | null
          id: string
          keyword_patterns: Json | null
          last_trained_at: string | null
          model_confidence_score: number | null
          model_version: string
          pricing_patterns: Json | null
          style_metrics: Json | null
          title_patterns: Json | null
          training_data_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category_preferences?: Json | null
          created_at?: string
          description_patterns?: Json | null
          id?: string
          keyword_patterns?: Json | null
          last_trained_at?: string | null
          model_confidence_score?: number | null
          model_version?: string
          pricing_patterns?: Json | null
          style_metrics?: Json | null
          title_patterns?: Json | null
          training_data_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category_preferences?: Json | null
          created_at?: string
          description_patterns?: Json | null
          id?: string
          keyword_patterns?: Json | null
          last_trained_at?: string | null
          model_confidence_score?: number | null
          model_version?: string
          pricing_patterns?: Json | null
          style_metrics?: Json | null
          title_patterns?: Json | null
          training_data_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bulk_sessions: {
        Row: {
          completed_items: number
          created_at: string
          error_log: Json | null
          grouped_items: number
          grouping_results: Json | null
          id: string
          processed_photos: number
          processing_completed_at: string | null
          processing_started_at: string | null
          session_name: string | null
          session_settings: Json | null
          session_status: string
          total_photos: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_items?: number
          created_at?: string
          error_log?: Json | null
          grouped_items?: number
          grouping_results?: Json | null
          id?: string
          processed_photos?: number
          processing_completed_at?: string | null
          processing_started_at?: string | null
          session_name?: string | null
          session_settings?: Json | null
          session_status?: string
          total_photos?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_items?: number
          created_at?: string
          error_log?: Json | null
          grouped_items?: number
          grouping_results?: Json | null
          id?: string
          processed_photos?: number
          processing_completed_at?: string | null
          processing_started_at?: string | null
          session_name?: string | null
          session_settings?: Json | null
          session_status?: string
          total_photos?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      category_mappings: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          internal_category: string
          last_used_at: string | null
          platform: string
          platform_category_id: string
          platform_category_path: string | null
          updated_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          internal_category: string
          last_used_at?: string | null
          platform: string
          platform_category_id: string
          platform_category_path?: string | null
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          internal_category?: string
          last_used_at?: string | null
          platform?: string
          platform_category_id?: string
          platform_category_path?: string | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ebay_categories: {
        Row: {
          category_name: string
          created_at: string | null
          ebay_category_id: string
          id: string
          is_active: boolean | null
          last_updated: string | null
          leaf_category: boolean | null
          parent_ebay_category_id: string | null
          requires_item_specifics: Json | null
          suggested_item_specifics: Json | null
          updated_at: string | null
        }
        Insert: {
          category_name: string
          created_at?: string | null
          ebay_category_id: string
          id?: string
          is_active?: boolean | null
          last_updated?: string | null
          leaf_category?: boolean | null
          parent_ebay_category_id?: string | null
          requires_item_specifics?: Json | null
          suggested_item_specifics?: Json | null
          updated_at?: string | null
        }
        Update: {
          category_name?: string
          created_at?: string | null
          ebay_category_id?: string
          id?: string
          is_active?: boolean | null
          last_updated?: string | null
          leaf_category?: boolean | null
          parent_ebay_category_id?: string | null
          requires_item_specifics?: Json | null
          suggested_item_specifics?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      listing_analytics: {
        Row: {
          click_through_rate: number | null
          conversion_events: Json | null
          created_at: string
          date: string
          engagement_score: number | null
          id: string
          listing_id: string
          messages: number
          offers: number
          platform: string
          search_impressions: number | null
          shares: number
          updated_at: string
          user_id: string
          views: number
          watchers: number
        }
        Insert: {
          click_through_rate?: number | null
          conversion_events?: Json | null
          created_at?: string
          date?: string
          engagement_score?: number | null
          id?: string
          listing_id: string
          messages?: number
          offers?: number
          platform: string
          search_impressions?: number | null
          shares?: number
          updated_at?: string
          user_id: string
          views?: number
          watchers?: number
        }
        Update: {
          click_through_rate?: number | null
          conversion_events?: Json | null
          created_at?: string
          date?: string
          engagement_score?: number | null
          id?: string
          listing_id?: string
          messages?: number
          offers?: number
          platform?: string
          search_impressions?: number | null
          shares?: number
          updated_at?: string
          user_id?: string
          views?: number
          watchers?: number
        }
        Relationships: [
          {
            foreignKeyName: "listing_analytics_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_photos: {
        Row: {
          ai_analysis_status: string | null
          compressed_path: string | null
          confidence_scores: Json | null
          created_at: string | null
          detected_brand: string | null
          detected_colors: Json | null
          detected_flaws: Json | null
          detected_material: string | null
          detected_measurements: Json | null
          file_size_bytes: number | null
          id: string
          is_primary: boolean | null
          listing_id: string | null
          mime_type: string | null
          original_filename: string | null
          photo_order: number
          photo_type: string | null
          storage_path: string
          thumbnail_path: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ai_analysis_status?: string | null
          compressed_path?: string | null
          confidence_scores?: Json | null
          created_at?: string | null
          detected_brand?: string | null
          detected_colors?: Json | null
          detected_flaws?: Json | null
          detected_material?: string | null
          detected_measurements?: Json | null
          file_size_bytes?: number | null
          id?: string
          is_primary?: boolean | null
          listing_id?: string | null
          mime_type?: string | null
          original_filename?: string | null
          photo_order?: number
          photo_type?: string | null
          storage_path: string
          thumbnail_path?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ai_analysis_status?: string | null
          compressed_path?: string | null
          confidence_scores?: Json | null
          created_at?: string | null
          detected_brand?: string | null
          detected_colors?: Json | null
          detected_flaws?: Json | null
          detected_material?: string | null
          detected_measurements?: Json | null
          file_size_bytes?: number | null
          id?: string
          is_primary?: boolean | null
          listing_id?: string | null
          mime_type?: string | null
          original_filename?: string | null
          photo_order?: number
          photo_type?: string | null
          storage_path?: string
          thumbnail_path?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_photos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          age_group: string | null
          ai_analysis_status: string | null
          ai_confidence_score: number | null
          ai_suggestions: Json | null
          auto_generate_sku: boolean | null
          brand: string | null
          bulk_session_id: string | null
          category: string | null
          clothing_size: string | null
          color_primary: string | null
          color_secondary: string | null
          condition: string | null
          consignment_percentage: number | null
          consignor_contact: string | null
          consignor_name: string | null
          cost_basis: number | null
          created_at: string
          days_to_sell: number | null
          depop_category_id: string | null
          depop_category_path: string | null
          description: string | null
          ebay_category_id: string | null
          ebay_category_path: string | null
          facebook_category_id: string | null
          facebook_category_path: string | null
          fees_paid: number | null
          gender: string | null
          id: string
          is_consignment: boolean | null
          keywords: string[] | null
          listed_date: string | null
          markup_percentage: number | null
          material: string | null
          measurements: Json | null
          mercari_category_id: string | null
          mercari_category_path: string | null
          minimum_price: number | null
          net_profit: number | null
          package_height_in: number | null
          package_length_in: number | null
          package_width_in: number | null
          pattern: string | null
          performance_notes: string | null
          photos: string[] | null
          poshmark_category_id: string | null
          poshmark_category_path: string | null
          price: number
          price_research: string | null
          processing_order: number | null
          profit_margin: number | null
          purchase_date: string | null
          purchase_price: number | null
          shipping_cost: number | null
          ships_from_zip: string | null
          shoe_size: string | null
          size_type: string | null
          size_value: string | null
          sku: string | null
          sku_prefix: string | null
          sold_date: string | null
          sold_price: number | null
          source_location: string | null
          source_type: string | null
          status: string | null
          target_price: number | null
          title: string
          updated_at: string
          user_id: string
          user_notes: string | null
          user_review_status: string | null
          weight_oz: number | null
        }
        Insert: {
          age_group?: string | null
          ai_analysis_status?: string | null
          ai_confidence_score?: number | null
          ai_suggestions?: Json | null
          auto_generate_sku?: boolean | null
          brand?: string | null
          bulk_session_id?: string | null
          category?: string | null
          clothing_size?: string | null
          color_primary?: string | null
          color_secondary?: string | null
          condition?: string | null
          consignment_percentage?: number | null
          consignor_contact?: string | null
          consignor_name?: string | null
          cost_basis?: number | null
          created_at?: string
          days_to_sell?: number | null
          depop_category_id?: string | null
          depop_category_path?: string | null
          description?: string | null
          ebay_category_id?: string | null
          ebay_category_path?: string | null
          facebook_category_id?: string | null
          facebook_category_path?: string | null
          fees_paid?: number | null
          gender?: string | null
          id?: string
          is_consignment?: boolean | null
          keywords?: string[] | null
          listed_date?: string | null
          markup_percentage?: number | null
          material?: string | null
          measurements?: Json | null
          mercari_category_id?: string | null
          mercari_category_path?: string | null
          minimum_price?: number | null
          net_profit?: number | null
          package_height_in?: number | null
          package_length_in?: number | null
          package_width_in?: number | null
          pattern?: string | null
          performance_notes?: string | null
          photos?: string[] | null
          poshmark_category_id?: string | null
          poshmark_category_path?: string | null
          price: number
          price_research?: string | null
          processing_order?: number | null
          profit_margin?: number | null
          purchase_date?: string | null
          purchase_price?: number | null
          shipping_cost?: number | null
          ships_from_zip?: string | null
          shoe_size?: string | null
          size_type?: string | null
          size_value?: string | null
          sku?: string | null
          sku_prefix?: string | null
          sold_date?: string | null
          sold_price?: number | null
          source_location?: string | null
          source_type?: string | null
          status?: string | null
          target_price?: number | null
          title: string
          updated_at?: string
          user_id: string
          user_notes?: string | null
          user_review_status?: string | null
          weight_oz?: number | null
        }
        Update: {
          age_group?: string | null
          ai_analysis_status?: string | null
          ai_confidence_score?: number | null
          ai_suggestions?: Json | null
          auto_generate_sku?: boolean | null
          brand?: string | null
          bulk_session_id?: string | null
          category?: string | null
          clothing_size?: string | null
          color_primary?: string | null
          color_secondary?: string | null
          condition?: string | null
          consignment_percentage?: number | null
          consignor_contact?: string | null
          consignor_name?: string | null
          cost_basis?: number | null
          created_at?: string
          days_to_sell?: number | null
          depop_category_id?: string | null
          depop_category_path?: string | null
          description?: string | null
          ebay_category_id?: string | null
          ebay_category_path?: string | null
          facebook_category_id?: string | null
          facebook_category_path?: string | null
          fees_paid?: number | null
          gender?: string | null
          id?: string
          is_consignment?: boolean | null
          keywords?: string[] | null
          listed_date?: string | null
          markup_percentage?: number | null
          material?: string | null
          measurements?: Json | null
          mercari_category_id?: string | null
          mercari_category_path?: string | null
          minimum_price?: number | null
          net_profit?: number | null
          package_height_in?: number | null
          package_length_in?: number | null
          package_width_in?: number | null
          pattern?: string | null
          performance_notes?: string | null
          photos?: string[] | null
          poshmark_category_id?: string | null
          poshmark_category_path?: string | null
          price?: number
          price_research?: string | null
          processing_order?: number | null
          profit_margin?: number | null
          purchase_date?: string | null
          purchase_price?: number | null
          shipping_cost?: number | null
          ships_from_zip?: string | null
          shoe_size?: string | null
          size_type?: string | null
          size_value?: string | null
          sku?: string | null
          sku_prefix?: string | null
          sold_date?: string | null
          sold_price?: number | null
          source_location?: string | null
          source_type?: string | null
          status?: string | null
          target_price?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          user_notes?: string | null
          user_review_status?: string | null
          weight_oz?: number | null
        }
        Relationships: []
      }
      marketplace_accounts: {
        Row: {
          account_email: string | null
          account_id: string | null
          account_username: string | null
          api_permissions: string[] | null
          created_at: string
          id: string
          is_active: boolean
          is_connected: boolean
          last_sync_at: string | null
          oauth_expires_at: string | null
          oauth_token: string | null
          oauth_token_secret: string | null
          platform: string
          platform_settings: Json | null
          platform_user_id: string | null
          refresh_token: string | null
          seller_level: string | null
          store_name: string | null
          sync_errors: Json | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_email?: string | null
          account_id?: string | null
          account_username?: string | null
          api_permissions?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_connected?: boolean
          last_sync_at?: string | null
          oauth_expires_at?: string | null
          oauth_token?: string | null
          oauth_token_secret?: string | null
          platform: string
          platform_settings?: Json | null
          platform_user_id?: string | null
          refresh_token?: string | null
          seller_level?: string | null
          store_name?: string | null
          sync_errors?: Json | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_email?: string | null
          account_id?: string | null
          account_username?: string | null
          api_permissions?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_connected?: boolean
          last_sync_at?: string | null
          oauth_expires_at?: string | null
          oauth_token?: string | null
          oauth_token_secret?: string | null
          platform?: string
          platform_settings?: Json | null
          platform_user_id?: string | null
          refresh_token?: string | null
          seller_level?: string | null
          store_name?: string | null
          sync_errors?: Json | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_listings: {
        Row: {
          auto_relist: boolean
          created_at: string
          id: string
          last_synced_at: string | null
          listing_id: string
          marketplace_account_id: string
          performance_metrics: Json | null
          platform: string
          platform_data: Json | null
          platform_listing_id: string | null
          platform_url: string | null
          relist_count: number
          status: string
          sync_errors: Json | null
          sync_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_relist?: boolean
          created_at?: string
          id?: string
          last_synced_at?: string | null
          listing_id: string
          marketplace_account_id: string
          performance_metrics?: Json | null
          platform: string
          platform_data?: Json | null
          platform_listing_id?: string | null
          platform_url?: string | null
          relist_count?: number
          status?: string
          sync_errors?: Json | null
          sync_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_relist?: boolean
          created_at?: string
          id?: string
          last_synced_at?: string | null
          listing_id?: string
          marketplace_account_id?: string
          performance_metrics?: Json | null
          platform?: string
          platform_data?: Json | null
          platform_listing_id?: string | null
          platform_url?: string | null
          relist_count?: number
          status?: string
          sync_errors?: Json | null
          sync_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_listings_marketplace_account_id_fkey"
            columns: ["marketplace_account_id"]
            isOneToOne: false
            referencedRelation: "marketplace_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      posting_queue: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          id: string
          last_attempt_at: string | null
          listing_id: string
          marketplace_account_id: string
          max_attempts: number
          platform: string
          priority: number
          processing_data: Json | null
          queue_status: string
          result_data: Json | null
          scheduled_for: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          listing_id: string
          marketplace_account_id: string
          max_attempts?: number
          platform: string
          priority?: number
          processing_data?: Json | null
          queue_status?: string
          result_data?: Json | null
          scheduled_for?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          listing_id?: string
          marketplace_account_id?: string
          max_attempts?: number
          platform?: string
          priority?: number
          processing_data?: Json | null
          queue_status?: string
          result_data?: Json | null
          scheduled_for?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posting_queue_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posting_queue_marketplace_account_id_fkey"
            columns: ["marketplace_account_id"]
            isOneToOne: false
            referencedRelation: "marketplace_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle: string | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_name: string
          plan_price_monthly: number | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          billing_cycle?: string | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_name: string
          plan_price_monthly?: number | null
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          billing_cycle?: string | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_name?: string
          plan_price_monthly?: number | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_analytics_summary: {
        Row: {
          active_listings: number
          avg_days_to_sell: number | null
          avg_profit_margin: number | null
          best_platform: string | null
          created_at: string
          date: string
          engagement_metrics: Json | null
          id: string
          sold_listings: number
          top_category: string | null
          total_listings: number
          total_profit: number | null
          total_revenue: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_listings?: number
          avg_days_to_sell?: number | null
          avg_profit_margin?: number | null
          best_platform?: string | null
          created_at?: string
          date?: string
          engagement_metrics?: Json | null
          id?: string
          sold_listings?: number
          top_category?: string | null
          total_listings?: number
          total_profit?: number | null
          total_revenue?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_listings?: number
          avg_days_to_sell?: number | null
          avg_profit_margin?: number | null
          best_platform?: string | null
          created_at?: string
          date?: string
          engagement_metrics?: Json | null
          id?: string
          sold_listings?: number
          top_category?: string | null
          total_listings?: number
          total_profit?: number | null
          total_revenue?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          accepts_returns: boolean | null
          account_type: string | null
          ai_training_completed: boolean | null
          business_name: string | null
          business_phone: string | null
          business_type: string | null
          contact_name: string | null
          created_at: string | null
          default_markup_percentage: number | null
          domestic_shipping_type: string | null
          ebay_category_preferences: Json | null
          ebay_fulfillment_policy_id: string | null
          ebay_payment_policy_id: string | null
          ebay_policies_created_at: string | null
          ebay_return_policy_id: string | null
          email: string
          fulfillment_policy_id: string | null
          full_name: string | null
          handling_time_days: number | null
          id: string
          international_shipping_enabled: boolean | null
          inventory_address_line1: string | null
          inventory_address_line2: string | null
          inventory_city: string | null
          inventory_country: string | null
          inventory_location_name: string | null
          inventory_postal_code: string | null
          inventory_state: string | null
          last_photo_reset_date: string | null
          listing_duration: string | null
          monthly_photo_limit: number | null
          onboarding_completed: boolean | null
          payment_policy_id: string | null
          photos_used_this_month: number | null
          preferred_shipping_service: string | null
          return_address_line1: string | null
          return_address_line2: string | null
          return_city: string | null
          return_country: string | null
          return_method: string | null
          return_period_days: number | null
          return_policy_id: string | null
          return_postal_code: string | null
          return_state: string | null
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_city: string | null
          shipping_cost_additional: number | null
          shipping_cost_domestic: number | null
          shipping_country: string | null
          shipping_postal_code: string | null
          shipping_state: string | null
          sku_prefix: string | null
          store_description: string | null
          store_name: string | null
          subscription_ends_at: string | null
          subscription_status: string | null
          subscription_tier: string | null
          tax_id: string | null
          timezone: string | null
          trial_ends_at: string | null
          updated_at: string | null
          use_different_return_address: boolean | null
        }
        Insert: {
          accepts_returns?: boolean | null
          account_type?: string | null
          ai_training_completed?: boolean | null
          business_name?: string | null
          business_phone?: string | null
          business_type?: string | null
          contact_name?: string | null
          created_at?: string | null
          default_markup_percentage?: number | null
          domestic_shipping_type?: string | null
          ebay_category_preferences?: Json | null
          ebay_fulfillment_policy_id?: string | null
          ebay_payment_policy_id?: string | null
          ebay_policies_created_at?: string | null
          ebay_return_policy_id?: string | null
          email: string
          fulfillment_policy_id?: string | null
          full_name?: string | null
          handling_time_days?: number | null
          id: string
          international_shipping_enabled?: boolean | null
          inventory_address_line1?: string | null
          inventory_address_line2?: string | null
          inventory_city?: string | null
          inventory_country?: string | null
          inventory_location_name?: string | null
          inventory_postal_code?: string | null
          inventory_state?: string | null
          last_photo_reset_date?: string | null
          listing_duration?: string | null
          monthly_photo_limit?: number | null
          onboarding_completed?: boolean | null
          payment_policy_id?: string | null
          photos_used_this_month?: number | null
          preferred_shipping_service?: string | null
          return_address_line1?: string | null
          return_address_line2?: string | null
          return_city?: string | null
          return_country?: string | null
          return_method?: string | null
          return_period_days?: number | null
          return_policy_id?: string | null
          return_postal_code?: string | null
          return_state?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_cost_additional?: number | null
          shipping_cost_domestic?: number | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          shipping_state?: string | null
          sku_prefix?: string | null
          store_description?: string | null
          store_name?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          tax_id?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          use_different_return_address?: boolean | null
        }
        Update: {
          accepts_returns?: boolean | null
          account_type?: string | null
          ai_training_completed?: boolean | null
          business_name?: string | null
          business_phone?: string | null
          business_type?: string | null
          contact_name?: string | null
          created_at?: string | null
          default_markup_percentage?: number | null
          domestic_shipping_type?: string | null
          ebay_category_preferences?: Json | null
          ebay_fulfillment_policy_id?: string | null
          ebay_payment_policy_id?: string | null
          ebay_policies_created_at?: string | null
          ebay_return_policy_id?: string | null
          email?: string
          fulfillment_policy_id?: string | null
          full_name?: string | null
          handling_time_days?: number | null
          id?: string
          international_shipping_enabled?: boolean | null
          inventory_address_line1?: string | null
          inventory_address_line2?: string | null
          inventory_city?: string | null
          inventory_country?: string | null
          inventory_location_name?: string | null
          inventory_postal_code?: string | null
          inventory_state?: string | null
          last_photo_reset_date?: string | null
          listing_duration?: string | null
          monthly_photo_limit?: number | null
          onboarding_completed?: boolean | null
          payment_policy_id?: string | null
          photos_used_this_month?: number | null
          preferred_shipping_service?: string | null
          return_address_line1?: string | null
          return_address_line2?: string | null
          return_city?: string | null
          return_country?: string | null
          return_method?: string | null
          return_period_days?: number | null
          return_policy_id?: string | null
          return_postal_code?: string | null
          return_state?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_cost_additional?: number | null
          shipping_cost_domestic?: number | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          shipping_state?: string | null
          sku_prefix?: string | null
          store_description?: string | null
          store_name?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          tax_id?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          use_different_return_address?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_sku: {
        Args: { prefix?: string }
        Returns: string
      }
      generate_unique_sku: {
        Args: { prefix?: string }
        Returns: string
      }
      get_category_path: {
        Args: { category_id: string }
        Returns: {
          ebay_category_id: string
          category_name: string
          parent_ebay_category_id: string
          level: number
          leaf_category: boolean
          full_path: string
        }[]
      }
      get_child_categories: {
        Args: { parent_id: string }
        Returns: {
          ebay_category_id: string
          category_name: string
          parent_ebay_category_id: string
          leaf_category: boolean
        }[]
      }
      get_listing_with_photos: {
        Args: { listing_id_param: string }
        Returns: {
          listing_data: Json
          photo_urls: string[]
        }[]
      }
      get_root_categories: {
        Args: Record<PropertyKey, never>
        Returns: {
          ebay_category_id: string
          category_name: string
          leaf_category: boolean
        }[]
      }
      search_categories: {
        Args: { search_term: string; limit_count?: number }
        Returns: {
          ebay_category_id: string
          category_name: string
          parent_ebay_category_id: string
          leaf_category: boolean
          match_score: number
          full_path: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
