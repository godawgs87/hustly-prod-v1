-- Add missing core tables for Phase 1 infrastructure

-- AI User Models table for personalized style learning
CREATE TABLE public.ai_user_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_version TEXT NOT NULL DEFAULT 'v1',
  training_data_count INTEGER NOT NULL DEFAULT 0,
  last_trained_at TIMESTAMP WITH TIME ZONE,
  model_confidence_score NUMERIC(3,2) DEFAULT 0.0,
  title_patterns JSONB DEFAULT '[]'::jsonb,
  description_patterns JSONB DEFAULT '[]'::jsonb,
  pricing_patterns JSONB DEFAULT '{}'::jsonb,
  category_preferences JSONB DEFAULT '{}'::jsonb,
  keyword_patterns JSONB DEFAULT '[]'::jsonb,
  style_metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI Training Data table for storing successful listings
CREATE TABLE public.ai_training_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_platform TEXT NOT NULL,
  external_listing_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  final_price NUMERIC,
  category TEXT,
  condition_rating TEXT,
  days_to_sell INTEGER,
  view_count INTEGER DEFAULT 0,
  watcher_count INTEGER DEFAULT 0,
  offer_count INTEGER DEFAULT 0,
  listing_date DATE,
  sold_date DATE,
  success_score NUMERIC(3,2) DEFAULT 0.0,
  training_weight NUMERIC(3,2) DEFAULT 1.0,
  keywords TEXT[],
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Marketplace Accounts table for platform connections
CREATE TABLE public.marketplace_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  account_username TEXT,
  account_email TEXT,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  oauth_token TEXT,
  oauth_token_secret TEXT,
  oauth_expires_at TIMESTAMP WITH TIME ZONE,
  refresh_token TEXT,
  account_id TEXT,
  store_name TEXT,
  seller_level TEXT,
  api_permissions TEXT[],
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_errors JSONB DEFAULT '[]'::jsonb,
  platform_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Platform Listings table for cross-platform tracking
CREATE TABLE public.platform_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  marketplace_account_id UUID NOT NULL REFERENCES public.marketplace_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_listing_id TEXT,
  platform_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TIMESTAMP WITH TIME ZONE,
  platform_data JSONB DEFAULT '{}'::jsonb,
  performance_metrics JSONB DEFAULT '{}'::jsonb,
  sync_errors JSONB DEFAULT '[]'::jsonb,
  auto_relist BOOLEAN NOT NULL DEFAULT false,
  relist_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(listing_id, platform, marketplace_account_id)
);

-- Posting Queue table for automated publishing
CREATE TABLE public.posting_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  marketplace_account_id UUID NOT NULL REFERENCES public.marketplace_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  queue_status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 0,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  processing_data JSONB DEFAULT '{}'::jsonb,
  result_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bulk Sessions table for batch processing
CREATE TABLE public.bulk_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_name TEXT,
  total_photos INTEGER NOT NULL DEFAULT 0,
  processed_photos INTEGER NOT NULL DEFAULT 0,
  grouped_items INTEGER NOT NULL DEFAULT 0,
  completed_items INTEGER NOT NULL DEFAULT 0,
  session_status TEXT NOT NULL DEFAULT 'uploading',
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  session_settings JSONB DEFAULT '{}'::jsonb,
  grouping_results JSONB DEFAULT '{}'::jsonb,
  error_log JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Listing Analytics table for performance tracking
CREATE TABLE public.listing_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  views INTEGER NOT NULL DEFAULT 0,
  watchers INTEGER NOT NULL DEFAULT 0,
  offers INTEGER NOT NULL DEFAULT 0,
  messages INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  engagement_score NUMERIC(3,2) DEFAULT 0.0,
  search_impressions INTEGER DEFAULT 0,
  click_through_rate NUMERIC(5,4) DEFAULT 0.0,
  conversion_events JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(listing_id, platform, date)
);

-- User Analytics Summary table for dashboard metrics
CREATE TABLE public.user_analytics_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_listings INTEGER NOT NULL DEFAULT 0,
  active_listings INTEGER NOT NULL DEFAULT 0,
  sold_listings INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0.0,
  total_profit NUMERIC DEFAULT 0.0,
  avg_days_to_sell NUMERIC(5,2) DEFAULT 0.0,
  avg_profit_margin NUMERIC(5,2) DEFAULT 0.0,
  top_category TEXT,
  best_platform TEXT,
  engagement_metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.ai_user_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posting_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics_summary ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_user_models
CREATE POLICY "Users can access their own AI models" ON public.ai_user_models
FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for ai_training_data
CREATE POLICY "Users can access their own training data" ON public.ai_training_data
FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for marketplace_accounts
CREATE POLICY "Users can access their own marketplace accounts" ON public.marketplace_accounts
FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for platform_listings
CREATE POLICY "Users can access their own platform listings" ON public.platform_listings
FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for posting_queue
CREATE POLICY "Users can access their own posting queue" ON public.posting_queue
FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for bulk_sessions
CREATE POLICY "Users can access their own bulk sessions" ON public.bulk_sessions
FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for listing_analytics
CREATE POLICY "Users can access their own listing analytics" ON public.listing_analytics
FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for user_analytics_summary
CREATE POLICY "Users can access their own analytics summary" ON public.user_analytics_summary
FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_ai_user_models_user_id ON public.ai_user_models(user_id);
CREATE INDEX idx_ai_training_data_user_id ON public.ai_training_data(user_id);
CREATE INDEX idx_ai_training_data_success_score ON public.ai_training_data(user_id, success_score DESC);
CREATE INDEX idx_marketplace_accounts_user_platform ON public.marketplace_accounts(user_id, platform);
CREATE INDEX idx_platform_listings_listing_platform ON public.platform_listings(listing_id, platform);
CREATE INDEX idx_posting_queue_status_priority ON public.posting_queue(queue_status, priority DESC, scheduled_for);
CREATE INDEX idx_bulk_sessions_user_status ON public.bulk_sessions(user_id, session_status);
CREATE INDEX idx_listing_analytics_listing_date ON public.listing_analytics(listing_id, date DESC);
CREATE INDEX idx_user_analytics_user_date ON public.user_analytics_summary(user_id, date DESC);

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_user_models_updated_at BEFORE UPDATE ON public.ai_user_models FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_training_data_updated_at BEFORE UPDATE ON public.ai_training_data FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marketplace_accounts_updated_at BEFORE UPDATE ON public.marketplace_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_platform_listings_updated_at BEFORE UPDATE ON public.platform_listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_posting_queue_updated_at BEFORE UPDATE ON public.posting_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bulk_sessions_updated_at BEFORE UPDATE ON public.bulk_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_listing_analytics_updated_at BEFORE UPDATE ON public.listing_analytics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_analytics_summary_updated_at BEFORE UPDATE ON public.user_analytics_summary FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();