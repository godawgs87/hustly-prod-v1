-- Clear out fake policy IDs for your account
UPDATE user_profiles 
SET 
  ebay_payment_policy_id = NULL,
  ebay_fulfillment_policy_id = NULL,
  ebay_return_policy_id = NULL
WHERE 
  id = '79b74ec0-1eca-4d71-8b03-b349cf01df31'
  AND (
    ebay_payment_policy_id LIKE '%INDIVIDUAL_DEFAULT%'
    OR ebay_fulfillment_policy_id LIKE '%INDIVIDUAL_DEFAULT%'
    OR ebay_return_policy_id LIKE '%INDIVIDUAL_DEFAULT%'
    OR ebay_payment_policy_id LIKE '%DEFAULT_%'
    OR ebay_fulfillment_policy_id LIKE '%DEFAULT_%'
    OR ebay_return_policy_id LIKE '%DEFAULT_%'
  );

-- Verify the update
SELECT 
  id,
  ebay_payment_policy_id,
  ebay_fulfillment_policy_id,
  ebay_return_policy_id
FROM user_profiles
WHERE id = '79b74ec0-1eca-4d71-8b03-b349cf01df31';
