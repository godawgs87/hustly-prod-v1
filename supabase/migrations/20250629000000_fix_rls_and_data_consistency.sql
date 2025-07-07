
-- Enable RLS on listings table
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on categories table  
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for listings
CREATE POLICY "Users can view their own listings" ON public.listings
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own listings" ON public.listings
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listings" ON public.listings
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listings" ON public.listings
FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for categories (public read access)
CREATE POLICY "Anyone can view categories" ON public.categories
FOR SELECT USING (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON public.listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);

-- Create a function to clean up inconsistent data
CREATE OR REPLACE FUNCTION public.cleanup_listing_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure measurements is always a valid JSON object
  UPDATE public.listings 
  SET measurements = '{}'::jsonb 
  WHERE measurements IS NULL OR measurements::text = 'null';
  
  -- Set default values for required fields
  UPDATE public.listings 
  SET status = 'draft' 
  WHERE status IS NULL;
  
  UPDATE public.listings 
  SET shipping_cost = 9.95 
  WHERE shipping_cost IS NULL;
END;
$$;

-- Run the cleanup function
SELECT public.cleanup_listing_data();
