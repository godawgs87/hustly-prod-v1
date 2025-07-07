-- Add shipping cost configuration fields to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN shipping_cost_domestic numeric DEFAULT 9.95,
ADD COLUMN shipping_cost_additional numeric DEFAULT 2.00;

-- Add comments to clarify the field purposes
COMMENT ON COLUMN public.user_profiles.shipping_cost_domestic IS 'Default domestic shipping cost for eBay fulfillment policies';
COMMENT ON COLUMN public.user_profiles.shipping_cost_additional IS 'Additional item shipping cost for multiple quantities';