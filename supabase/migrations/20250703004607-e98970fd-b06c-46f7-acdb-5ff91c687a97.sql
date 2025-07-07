-- Update marketplace_accounts table to support OAuth 2.0 tokens
ALTER TABLE marketplace_accounts
ADD COLUMN IF NOT EXISTS platform_user_id TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- Update access_token column to handle longer OAuth tokens
ALTER TABLE marketplace_accounts
ALTER COLUMN oauth_token TYPE TEXT;

-- Add index for token expiration checks
CREATE INDEX IF NOT EXISTS idx_marketplace_accounts_token_expiry 
ON marketplace_accounts(platform, token_expires_at) 
WHERE token_expires_at IS NOT NULL;