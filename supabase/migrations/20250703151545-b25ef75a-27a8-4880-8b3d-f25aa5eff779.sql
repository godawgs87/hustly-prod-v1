-- Add missing eBay seller requirements to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'individual',
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS store_name TEXT,
ADD COLUMN IF NOT EXISTS store_description TEXT,
ADD COLUMN IF NOT EXISTS payment_policy_id TEXT,
ADD COLUMN IF NOT EXISTS return_policy_id TEXT,
ADD COLUMN IF NOT EXISTS fulfillment_policy_id TEXT,
ADD COLUMN IF NOT EXISTS handling_time_days INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS accepts_returns BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS return_period_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS return_method TEXT DEFAULT 'REPLACEMENT',
ADD COLUMN IF NOT EXISTS domestic_shipping_type TEXT DEFAULT 'FLAT_RATE',
ADD COLUMN IF NOT EXISTS international_shipping_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ebay_category_preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS listing_duration TEXT DEFAULT 'GTC';