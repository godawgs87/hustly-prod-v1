-- Add ALL missing columns to fix onboarding and settings

-- Add missing columns to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS photos_used_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_photo_limit INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS last_photo_reset_date DATE DEFAULT CURRENT_DATE;

-- Add photos column to listings table
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS ebay_item_id TEXT,
ADD COLUMN IF NOT EXISTS platform_status TEXT,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Fix marketplace_accounts table - Add ALL missing columns
ALTER TABLE public.marketplace_accounts
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS platform TEXT,
ADD COLUMN IF NOT EXISTS account_username TEXT,
ADD COLUMN IF NOT EXISTS oauth_token TEXT,
ADD COLUMN IF NOT EXISTS refresh_token TEXT,
ADD COLUMN IF NOT EXISTS oauth_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ebay_account_type TEXT DEFAULT 'individual',
ADD COLUMN IF NOT EXISTS ebay_seller_level TEXT,
ADD COLUMN IF NOT EXISTS ebay_store_subscription TEXT,
ADD COLUMN IF NOT EXISTS ebay_account_capabilities JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create unique constraint if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'marketplace_accounts_user_platform_key'
    ) THEN
        ALTER TABLE public.marketplace_accounts 
        ADD CONSTRAINT marketplace_accounts_user_platform_key 
        UNIQUE (user_id, platform);
    END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_marketplace_accounts_user_platform 
ON public.marketplace_accounts(user_id, platform, is_connected, is_active);

-- Check current onboarding status for your user
SELECT id, email, onboarding_completed, subscription_status, subscription_tier
FROM public.user_profiles
WHERE email = 'chadm87@gmail.com';

-- Force onboarding to trigger by setting it to false
UPDATE public.user_profiles
SET onboarding_completed = false
WHERE email = 'chadm87@gmail.com';

-- Verify the update
SELECT id, email, onboarding_completed, timezone
FROM public.user_profiles
WHERE email = 'chadm87@gmail.com';
