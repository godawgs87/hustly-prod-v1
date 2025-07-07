-- Step 1: Clean up ALL existing eBay accounts (including the mock one that's still there)
DELETE FROM platform_listings WHERE platform = 'ebay';
DELETE FROM marketplace_accounts WHERE platform = 'ebay';

-- Step 2: Ensure proper OAuth token validation and clean data structure
ALTER TABLE marketplace_accounts 
  DROP CONSTRAINT IF EXISTS check_oauth_token_format;

-- Add a check to ensure OAuth tokens are proper format (not mock data)
ALTER TABLE marketplace_accounts 
  ADD CONSTRAINT check_oauth_token_format 
  CHECK (
    oauth_token IS NULL OR 
    (oauth_token NOT LIKE 'mock_%' AND oauth_token != 'fake_token' AND LENGTH(oauth_token) > 50)
  );

-- Step 3: Add index for better performance on OAuth operations
CREATE INDEX IF NOT EXISTS idx_marketplace_accounts_oauth_lookup 
ON marketplace_accounts(user_id, platform, is_connected, is_active) 
WHERE is_connected = true AND is_active = true;