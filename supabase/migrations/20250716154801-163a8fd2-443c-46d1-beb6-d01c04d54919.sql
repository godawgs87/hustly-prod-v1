-- Add billing cycle tracking to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN billing_cycle_start DATE DEFAULT CURRENT_DATE,
ADD COLUMN billing_cycle_end DATE DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
ADD COLUMN listings_used_this_cycle INTEGER DEFAULT 0;

-- Create user_addons table for tracking booster packs
CREATE TABLE public.user_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  addon_type TEXT NOT NULL, -- 'extra_listings', 'extra_marketplace', 'bulk_upload_boost'
  addon_value INTEGER NOT NULL, -- quantity (listings, marketplaces, etc.)
  price_paid DECIMAL(10,2) NOT NULL,
  billing_cycle_start DATE NOT NULL,
  billing_cycle_end DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_addons ENABLE ROW LEVEL SECURITY;

-- Create policies for user_addons
CREATE POLICY "Users can view their own addons" 
ON public.user_addons 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own addons" 
ON public.user_addons 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own addons" 
ON public.user_addons 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_addons_updated_at
BEFORE UPDATE ON public.user_addons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to reset monthly usage and billing cycle
CREATE OR REPLACE FUNCTION public.reset_billing_cycle(user_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_profiles 
  SET 
    billing_cycle_start = CURRENT_DATE,
    billing_cycle_end = CURRENT_DATE + INTERVAL '1 month',
    listings_used_this_cycle = 0,
    updated_at = now()
  WHERE id = user_id_param;
  
  -- Deactivate expired add-ons
  UPDATE public.user_addons 
  SET is_active = false, updated_at = now()
  WHERE user_id = user_id_param 
    AND billing_cycle_end < CURRENT_DATE 
    AND is_active = true;
END;
$$;