-- Add eBay business policy fields to user profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS ebay_payment_policy_id TEXT,
ADD COLUMN IF NOT EXISTS ebay_return_policy_id TEXT, 
ADD COLUMN IF NOT EXISTS ebay_fulfillment_policy_id TEXT,
ADD COLUMN IF NOT EXISTS ebay_policies_created_at TIMESTAMP WITH TIME ZONE;