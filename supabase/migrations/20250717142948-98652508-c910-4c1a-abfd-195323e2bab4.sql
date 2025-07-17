-- Add eBay account type and capability fields to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN ebay_account_type text DEFAULT 'individual',
ADD COLUMN ebay_seller_level text,
ADD COLUMN ebay_store_subscription text,
ADD COLUMN ebay_account_capabilities jsonb DEFAULT '{}';

-- Add eBay account details to marketplace_accounts
ALTER TABLE public.marketplace_accounts
ADD COLUMN ebay_account_type text,
ADD COLUMN ebay_store_subscription text,
ADD COLUMN ebay_seller_level text,
ADD COLUMN ebay_business_policies jsonb DEFAULT '{}',
ADD COLUMN ebay_account_capabilities jsonb DEFAULT '{}';

-- Update existing user profile with correct individual account settings
UPDATE public.user_profiles 
SET 
  ebay_account_type = 'individual',
  preferred_shipping_service = 'usps_priority',
  ebay_payment_policy_id = 'INDIVIDUAL_DEFAULT_PAYMENT',
  ebay_return_policy_id = 'INDIVIDUAL_DEFAULT_RETURN',
  ebay_fulfillment_policy_id = 'INDIVIDUAL_DEFAULT_FULFILLMENT'
WHERE id = '79b74ec0-1eca-4d71-8b03-b349cf01df31';

-- Update existing marketplace account with individual account type
UPDATE public.marketplace_accounts 
SET 
  ebay_account_type = 'individual'
WHERE user_id = '79b74ec0-1eca-4d71-8b03-b349cf01df31' AND platform = 'ebay';