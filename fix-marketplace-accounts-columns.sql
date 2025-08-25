-- Fix marketplace_accounts table missing columns causing 400 errors

-- Add missing columns to marketplace_accounts
ALTER TABLE public.marketplace_accounts
ADD COLUMN IF NOT EXISTS is_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS oauth_token TEXT,
ADD COLUMN IF NOT EXISTS oauth_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS refresh_token TEXT,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_marketplace_accounts_user_platform 
ON public.marketplace_accounts(user_id, platform, is_connected, is_active);

-- Check if columns were added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'marketplace_accounts'
ORDER BY ordinal_position;
