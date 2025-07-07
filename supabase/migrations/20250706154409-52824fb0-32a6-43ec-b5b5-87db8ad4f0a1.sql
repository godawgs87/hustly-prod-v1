-- Update user profile with correct individual account policy IDs
UPDATE user_profiles 
SET 
  ebay_payment_policy_id = 'INDIVIDUAL_DEFAULT_PAYMENT',
  ebay_return_policy_id = 'INDIVIDUAL_DEFAULT_RETURN',
  ebay_fulfillment_policy_id = 'INDIVIDUAL_DEFAULT_FULFILLMENT',
  updated_at = now()
WHERE 
  ebay_payment_policy_id = 'EBAY_DEFAULT_PAYMENT' OR
  ebay_return_policy_id = 'EBAY_DEFAULT_RETURN' OR
  ebay_fulfillment_policy_id = 'EBAY_DEFAULT_FULFILLMENT';