-- Sales Operations Enterprise Schema
-- This migration creates the database structure for enterprise-grade sales automation

-- Sales Automation Rules Table
CREATE TABLE IF NOT EXISTS sales_automation_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('auto_list', 'auto_delist', 'price_adjust', 'offer_response', 'cross_list')),
  conditions JSONB NOT NULL DEFAULT '[]',
  actions JSONB NOT NULL DEFAULT '[]',
  enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1,
  execution_count INTEGER DEFAULT 0,
  last_executed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Listing Performance Tracking
CREATE TABLE IF NOT EXISTS listing_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0,
  watchers INTEGER DEFAULT 0,
  days_listed INTEGER DEFAULT 0,
  price_changes INTEGER DEFAULT 0,
  offers_received INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  engagement_score DECIMAL(5,2) DEFAULT 0,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, user_id)
);

-- Sales Action Log
CREATE TABLE IF NOT EXISTS sales_action_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES sales_automation_rules(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  parameters JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  result JSONB DEFAULT '{}',
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Market Intelligence Cache
CREATE TABLE IF NOT EXISTS market_intelligence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  average_price DECIMAL(10,2),
  price_trend TEXT CHECK (price_trend IN ('up', 'down', 'stable')),
  demand_level TEXT CHECK (demand_level IN ('high', 'medium', 'low')),
  competition_count INTEGER DEFAULT 0,
  seasonal_factor DECIMAL(3,2) DEFAULT 1.0,
  recommended_actions JSONB DEFAULT '[]',
  data_source TEXT DEFAULT 'ebay',
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, data_source)
);

-- Sales Operations Settings
CREATE TABLE IF NOT EXISTS sales_operations_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  automation_enabled BOOLEAN DEFAULT false,
  max_price_drop_percentage DECIMAL(5,2) DEFAULT 20.0,
  min_listing_duration_days INTEGER DEFAULT 7,
  max_listing_duration_days INTEGER DEFAULT 30,
  auto_relist_enabled BOOLEAN DEFAULT true,
  cross_listing_enabled BOOLEAN DEFAULT false,
  offer_auto_response_enabled BOOLEAN DEFAULT false,
  notification_preferences JSONB DEFAULT '{"email": true, "dashboard": true}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Analytics Aggregates
CREATE TABLE IF NOT EXISTS sales_performance_daily (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  active_listings INTEGER DEFAULT 0,
  new_listings INTEGER DEFAULT 0,
  ended_listings INTEGER DEFAULT 0,
  average_sale_time DECIMAL(5,2) DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  automation_actions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_sales_rules_user_enabled ON sales_automation_rules(user_id, enabled);
CREATE INDEX IF NOT EXISTS idx_sales_rules_priority ON sales_automation_rules(priority DESC);
CREATE INDEX IF NOT EXISTS idx_listing_performance_listing ON listing_performance(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_performance_user ON listing_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_action_log_listing ON sales_action_log(listing_id);
CREATE INDEX IF NOT EXISTS idx_sales_action_log_user_date ON sales_action_log(user_id, executed_at);
CREATE INDEX IF NOT EXISTS idx_market_intelligence_category ON market_intelligence(category);
CREATE INDEX IF NOT EXISTS idx_market_intelligence_expires ON market_intelligence(expires_at);
CREATE INDEX IF NOT EXISTS idx_sales_performance_user_date ON sales_performance_daily(user_id, date);

-- Row Level Security (RLS)
ALTER TABLE sales_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_action_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_operations_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_performance_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own sales rules" ON sales_automation_rules
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own listing performance" ON listing_performance
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own action logs" ON sales_action_log
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own settings" ON sales_operations_settings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own performance data" ON sales_performance_daily
  FOR ALL USING (auth.uid() = user_id);

-- Market intelligence is readable by all authenticated users
CREATE POLICY "Authenticated users can read market intelligence" ON market_intelligence
  FOR SELECT USING (auth.role() = 'authenticated');

-- Functions for automated updates
CREATE OR REPLACE FUNCTION update_listing_performance()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_sales_rules_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_listing_performance_timestamp
  BEFORE UPDATE ON listing_performance
  FOR EACH ROW EXECUTE FUNCTION update_listing_performance();

CREATE TRIGGER update_sales_rules_timestamp
  BEFORE UPDATE ON sales_automation_rules
  FOR EACH ROW EXECUTE FUNCTION update_sales_rules_timestamp();

-- Function to clean up expired market intelligence
CREATE OR REPLACE FUNCTION cleanup_expired_market_intelligence()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM market_intelligence WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate daily performance aggregates
CREATE OR REPLACE FUNCTION calculate_daily_performance(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
  INSERT INTO sales_performance_daily (
    user_id,
    date,
    total_revenue,
    total_sales,
    active_listings,
    automation_actions
  )
  SELECT 
    i.user_id,
    target_date,
    COALESCE(SUM(CASE WHEN i.status = 'sold' AND i.sold_date::date = target_date THEN i.price ELSE 0 END), 0) as total_revenue,
    COUNT(CASE WHEN i.status = 'sold' AND i.sold_date::date = target_date THEN 1 END) as total_sales,
    COUNT(CASE WHEN i.status = 'listed' THEN 1 END) as active_listings,
    COALESCE(automation_actions.action_count, 0) as automation_actions
  FROM inventory_items i
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) as action_count
    FROM sales_action_log 
    WHERE executed_at::date = target_date
    GROUP BY user_id
  ) automation_actions ON i.user_id = automation_actions.user_id
  GROUP BY i.user_id, automation_actions.action_count
  ON CONFLICT (user_id, date) 
  DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    total_sales = EXCLUDED.total_sales,
    active_listings = EXCLUDED.active_listings,
    automation_actions = EXCLUDED.automation_actions;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE sales_automation_rules IS 'Stores user-defined automation rules for sales operations';
COMMENT ON TABLE listing_performance IS 'Tracks performance metrics for individual listings';
COMMENT ON TABLE sales_action_log IS 'Logs all automated actions performed by the sales engine';
COMMENT ON TABLE market_intelligence IS 'Cached market data and intelligence for categories';
COMMENT ON TABLE sales_operations_settings IS 'User preferences and settings for sales automation';
COMMENT ON TABLE sales_performance_daily IS 'Daily aggregated performance metrics for analytics';

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
