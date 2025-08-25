-- Create the user_profiles table that was missing
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  
  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT false,
  
  -- Subscription
  subscription_status TEXT DEFAULT 'trialing',
  subscription_tier TEXT DEFAULT 'trial',
  subscription_id TEXT,
  stripe_customer_id TEXT,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  
  -- Business Info
  business_name TEXT,
  business_type TEXT DEFAULT 'individual',
  business_phone TEXT,
  contact_name TEXT,
  tax_id TEXT,
  
  -- Shipping Address
  shipping_address_line1 TEXT,
  shipping_address_line2 TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_postal_code TEXT,
  shipping_country TEXT DEFAULT 'US',
  
  -- Return Address
  use_different_return_address BOOLEAN DEFAULT false,
  return_address_line1 TEXT,
  return_address_line2 TEXT,
  return_city TEXT,
  return_state TEXT,
  return_postal_code TEXT,
  return_country TEXT DEFAULT 'US',
  
  -- Inventory Location
  inventory_location_name TEXT,
  inventory_address_line1 TEXT,
  inventory_address_line2 TEXT,
  inventory_city TEXT,
  inventory_state TEXT,
  inventory_postal_code TEXT,
  inventory_country TEXT DEFAULT 'US',
  
  -- eBay Settings
  ebay_payment_policy_id TEXT,
  ebay_return_policy_id TEXT,
  ebay_fulfillment_policy_id TEXT,
  ebay_account_type TEXT DEFAULT 'individual',
  ebay_seller_level TEXT,
  ebay_store_subscription TEXT,
  ebay_account_capabilities JSONB DEFAULT '{}',
  preferred_shipping_service TEXT DEFAULT 'usps_priority',
  
  -- Shipping Costs
  shipping_cost_domestic NUMERIC DEFAULT 9.95,
  shipping_cost_additional NUMERIC DEFAULT 2.00,
  
  -- SKU Settings
  sku_prefix TEXT DEFAULT 'SKU',
  sku_counter INTEGER DEFAULT 1,
  
  -- Billing
  billing_cycle_start DATE DEFAULT CURRENT_DATE,
  billing_cycle_end DATE DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
  listings_used_this_cycle INTEGER DEFAULT 0,
  
  -- Admin
  user_role TEXT DEFAULT 'user',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON public.user_profiles(subscription_status);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

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
    false, -- New users need onboarding
    'trialing',
    'trial',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Fix any existing users who don't have profiles
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
