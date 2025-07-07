
-- Add inventory management columns to listings table
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS purchase_date DATE,
ADD COLUMN IF NOT EXISTS source_location TEXT,
ADD COLUMN IF NOT EXISTS source_type TEXT,
ADD COLUMN IF NOT EXISTS cost_basis DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS fees_paid DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_profit DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS sold_date DATE,
ADD COLUMN IF NOT EXISTS sold_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS days_to_sell INTEGER,
ADD COLUMN IF NOT EXISTS performance_notes TEXT;

-- Create sourcing locations table for tracking where items are purchased
CREATE TABLE IF NOT EXISTS public.sourcing_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  location_type TEXT, -- 'thrift_store', 'estate_sale', 'garage_sale', 'online', 'wholesale', 'other'
  address TEXT,
  notes TEXT,
  success_rate DECIMAL(5,2), -- percentage of profitable items from this source
  average_profit DECIMAL(10,2),
  visit_count INTEGER DEFAULT 0,
  last_visit DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for sourcing_locations
ALTER TABLE public.sourcing_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sourcing locations" 
  ON public.sourcing_locations 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sourcing locations" 
  ON public.sourcing_locations 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sourcing locations" 
  ON public.sourcing_locations 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sourcing locations" 
  ON public.sourcing_locations 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create listing templates table
CREATE TABLE IF NOT EXISTS public.listing_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  description_template TEXT,
  shipping_cost DECIMAL(10,2) DEFAULT 9.95,
  keywords TEXT[],
  condition TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usage_count INTEGER DEFAULT 0
);

-- Enable RLS for listing_templates
ALTER TABLE public.listing_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own listing templates" 
  ON public.listing_templates 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own listing templates" 
  ON public.listing_templates 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listing templates" 
  ON public.listing_templates 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listing templates" 
  ON public.listing_templates 
  FOR DELETE 
  USING (auth.uid() = user_id);
