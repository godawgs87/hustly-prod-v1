-- Create eBay categories table
CREATE TABLE public.ebay_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebay_category_id TEXT NOT NULL UNIQUE,
  category_name TEXT NOT NULL,
  parent_ebay_category_id TEXT,
  leaf_category BOOLEAN DEFAULT false,
  requires_item_specifics JSONB DEFAULT '[]'::jsonb,
  suggested_item_specifics JSONB DEFAULT '[]'::jsonb,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for eBay categories
ALTER TABLE public.ebay_categories ENABLE ROW LEVEL SECURITY;

-- Create policy for eBay categories (publicly readable for authenticated users)
CREATE POLICY "Authenticated users can view eBay categories" 
ON public.ebay_categories 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Add eBay category reference to listings
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS ebay_category_id TEXT;

-- Create mapping between internal and eBay categories
CREATE TABLE public.category_ebay_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_category_id UUID REFERENCES categories(id),
  ebay_category_id TEXT REFERENCES ebay_categories(ebay_category_id),
  confidence_score DECIMAL(3,2) DEFAULT 0.8,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for category mappings
ALTER TABLE public.category_ebay_mappings ENABLE ROW LEVEL SECURITY;

-- Create policy for category mappings
CREATE POLICY "Authenticated users can view category mappings" 
ON public.category_ebay_mappings 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ebay_categories_parent ON public.ebay_categories(parent_ebay_category_id);
CREATE INDEX IF NOT EXISTS idx_ebay_categories_leaf ON public.ebay_categories(leaf_category);
CREATE INDEX IF NOT EXISTS idx_listings_ebay_category ON public.listings(ebay_category_id);
CREATE INDEX IF NOT EXISTS idx_category_mappings_internal ON public.category_ebay_mappings(internal_category_id);

-- Create trigger for updated_at on ebay_categories
CREATE TRIGGER update_ebay_categories_updated_at
BEFORE UPDATE ON public.ebay_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on category_ebay_mappings
CREATE TRIGGER update_category_mappings_updated_at
BEFORE UPDATE ON public.category_ebay_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();