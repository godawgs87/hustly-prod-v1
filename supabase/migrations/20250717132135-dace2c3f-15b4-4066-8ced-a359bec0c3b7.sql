-- Clean up expired eBay connections for better OAuth flow
UPDATE marketplace_accounts 
SET 
  is_connected = false,
  is_active = false,
  oauth_token = null,
  oauth_token_secret = null,
  refresh_token = null
WHERE platform = 'ebay' 
  AND (
    oauth_expires_at < NOW() 
    OR oauth_token IS NULL 
    OR LENGTH(oauth_token) < 50
  );