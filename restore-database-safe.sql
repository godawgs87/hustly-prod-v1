-- Restore complete database schema for Hustly (safe version)
-- This creates all missing tables that the app requires

-- 1. Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  subscription_status TEXT DEFAULT 'trialing',
  subscription_tier TEXT DEFAULT 'trial',
  subscription_id TEXT,
  stripe_customer_id TEXT,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  business_name TEXT,
  business_type TEXT DEFAULT 'individual',
  business_phone TEXT,
  contact_name TEXT,
  tax_id TEXT,
  shipping_address_line1 TEXT,
  shipping_address_line2 TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_postal_code TEXT,
  shipping_country TEXT DEFAULT 'US',
  use_different_return_address BOOLEAN DEFAULT false,
  return_address_line1 TEXT,
  return_address_line2 TEXT,
  return_city TEXT,
  return_state TEXT,
  return_postal_code TEXT,
  return_country TEXT DEFAULT 'US',
  inventory_location_name TEXT,
  inventory_address_line1 TEXT,
  inventory_address_line2 TEXT,
  inventory_city TEXT,
  inventory_state TEXT,
  inventory_postal_code TEXT,
  inventory_country TEXT DEFAULT 'US',
  ebay_payment_policy_id TEXT,
  ebay_return_policy_id TEXT,
  ebay_fulfillment_policy_id TEXT,
  ebay_account_type TEXT DEFAULT 'individual',
  ebay_seller_level TEXT,
  ebay_store_subscription TEXT,
  ebay_account_capabilities JSONB DEFAULT '{}',
  preferred_shipping_service TEXT DEFAULT 'usps_priority',
  shipping_cost_domestic NUMERIC DEFAULT 9.95,
  shipping_cost_additional NUMERIC DEFAULT 2.00,
  sku_prefix TEXT DEFAULT 'SKU',
  sku_counter INTEGER DEFAULT 1,
  billing_cycle_start DATE DEFAULT CURRENT_DATE,
  billing_cycle_end DATE DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
  listings_used_this_cycle INTEGER DEFAULT 0,
  photos_used_this_month INTEGER DEFAULT 0,
  monthly_photo_limit INTEGER DEFAULT 100,
  last_photo_reset_date DATE DEFAULT CURRENT_DATE,
  user_role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create listings table
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  condition TEXT DEFAULT 'used',
  category TEXT,
  brand TEXT,
  size TEXT,
  color TEXT,
  material TEXT,
  weight DECIMAL(10,3),
  dimensions_length DECIMAL(10,2),
  dimensions_width DECIMAL(10,2),
  dimensions_height DECIMAL(10,2),
  sku TEXT,
  status TEXT DEFAULT 'draft',
  source_platform TEXT,
  source_listing_id TEXT,
  purchase_price DECIMAL(10,2),
  purchase_date DATE,
  purchase_location TEXT,
  notes TEXT,
  tags TEXT[],
  shipping_cost DECIMAL(10,2) DEFAULT 9.95,
  handling_time INTEGER DEFAULT 3,
  return_accepted BOOLEAN DEFAULT true,
  return_period INTEGER DEFAULT 30,
  paypal_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create marketplace_accounts table
CREATE TABLE IF NOT EXISTS public.marketplace_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  account_username TEXT,
  account_email TEXT,
  is_connected BOOLEAN DEFAULT false,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  account_id TEXT,
  seller_id TEXT,
  store_name TEXT,
  store_url TEXT,
  connection_status TEXT DEFAULT 'disconnected',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create user_addons table
CREATE TABLE IF NOT EXISTS public.user_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  addon_type TEXT NOT NULL,
  addon_value INTEGER NOT NULL,
  price_paid DECIMAL(10,2) NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  billing_cycle_start DATE DEFAULT CURRENT_DATE,
  billing_cycle_end DATE DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create listing_photos table
CREATE TABLE IF NOT EXISTS public.listing_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can insert own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can update own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can delete own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can view own marketplace accounts" ON public.marketplace_accounts;
DROP POLICY IF EXISTS "Users can insert own marketplace accounts" ON public.marketplace_accounts;
DROP POLICY IF EXISTS "Users can update own marketplace accounts" ON public.marketplace_accounts;
DROP POLICY IF EXISTS "Users can delete own marketplace accounts" ON public.marketplace_accounts;
DROP POLICY IF EXISTS "Users can view own addons" ON public.user_addons;
DROP POLICY IF EXISTS "Users can insert own addons" ON public.user_addons;
DROP POLICY IF EXISTS "Users can update own addons" ON public.user_addons;
DROP POLICY IF EXISTS "Users can view own listing photos" ON public.listing_photos;
DROP POLICY IF EXISTS "Users can insert own listing photos" ON public.listing_photos;
DROP POLICY IF EXISTS "Users can update own listing photos" ON public.listing_photos;
DROP POLICY IF EXISTS "Users can delete own listing photos" ON public.listing_photos;

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for listings
CREATE POLICY "Users can view own listings" ON public.listings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own listings" ON public.listings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own listings" ON public.listings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own listings" ON public.listings
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for marketplace_accounts
CREATE POLICY "Users can view own marketplace accounts" ON public.marketplace_accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own marketplace accounts" ON public.marketplace_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own marketplace accounts" ON public.marketplace_accounts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own marketplace accounts" ON public.marketplace_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for user_addons
CREATE POLICY "Users can view own addons" ON public.user_addons
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own addons" ON public.user_addons
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own addons" ON public.user_addons
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for listing_photos
CREATE POLICY "Users can view own listing photos" ON public.listing_photos
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.listings WHERE id = listing_id));
CREATE POLICY "Users can insert own listing photos" ON public.listing_photos
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.listings WHERE id = listing_id));
CREATE POLICY "Users can update own listing photos" ON public.listing_photos
  FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM public.listings WHERE id = listing_id));
CREATE POLICY "Users can delete own listing photos" ON public.listing_photos
  FOR DELETE USING (auth.uid() IN (SELECT user_id FROM public.listings WHERE id = listing_id));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON public.listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_accounts_user_id ON public.marketplace_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_accounts_platform ON public.marketplace_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_user_addons_user_id ON public.user_addons(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_photos_listing_id ON public.listing_photos(listing_id);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    onboarding_completed,
    subscription_status,
    subscription_tier,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    false,
    'trialing',
    'trial',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create your user profile
INSERT INTO public.user_profiles (
  id,
  email,
  onboarding_completed,
  subscription_status,
  subscription_tier,
  created_at,
  updated_at
)
SELECT 
  u.id,
  u.email,
  false,
  'trialing',
  'trial',
  NOW(),
  NOW()
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
