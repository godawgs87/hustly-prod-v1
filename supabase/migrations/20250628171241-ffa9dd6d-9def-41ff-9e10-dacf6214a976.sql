
-- Create categories table with hierarchical structure
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for better performance on parent_id lookups
CREATE INDEX idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX idx_categories_slug ON public.categories(slug);

-- Insert main clothing and shoe categories
INSERT INTO public.categories (name, slug, description, sort_order) VALUES 
('Clothing, Shoes & Accessories', 'clothing-shoes-accessories', 'Main category for all clothing, shoes and accessories', 1),
('Electronics', 'electronics', 'Electronics and gadgets', 2),
('Tools & Hardware', 'tools-hardware', 'Tools and hardware items', 3),
('Home & Garden', 'home-garden', 'Home and garden items', 4),
('Sports & Outdoors', 'sports-outdoors', 'Sports and outdoor equipment', 5),
('Books & Media', 'books-media', 'Books, movies, music', 6),
('Toys & Games', 'toys-games', 'Toys and games', 7),
('Collectibles', 'collectibles', 'Collectible items', 8);

-- Get the clothing category ID for subcategories
WITH clothing_cat AS (
  SELECT id FROM public.categories WHERE slug = 'clothing-shoes-accessories'
)
INSERT INTO public.categories (name, slug, parent_id, description, sort_order) 
SELECT 
  subcategory.name,
  subcategory.slug,
  clothing_cat.id,
  subcategory.description,
  subcategory.sort_order
FROM clothing_cat,
(VALUES 
  ('Men''s Clothing', 'mens-clothing', 'Clothing for men', 1),
  ('Women''s Clothing', 'womens-clothing', 'Clothing for women', 2),
  ('Kids'' Clothing', 'kids-clothing', 'Clothing for children', 3),
  ('Men''s Shoes', 'mens-shoes', 'Shoes for men', 4),
  ('Women''s Shoes', 'womens-shoes', 'Shoes for women', 5),
  ('Kids'' Shoes', 'kids-shoes', 'Shoes for children', 6),
  ('Accessories', 'accessories', 'Fashion accessories', 7),
  ('Bags & Purses', 'bags-purses', 'Bags, purses, and wallets', 8)
) AS subcategory(name, slug, description, sort_order);

-- Add category_id to listings table
ALTER TABLE public.listings 
ADD COLUMN category_id UUID REFERENCES public.categories(id);

-- Create index for better performance
CREATE INDEX idx_listings_category_id ON public.listings(category_id);

-- Enable RLS on categories table
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create policy for categories (public read access since categories are shared)
CREATE POLICY "Categories are publicly readable" 
  ON public.categories 
  FOR SELECT 
  TO public
  USING (true);

-- Create policy for authenticated users to suggest new categories (if needed later)
CREATE POLICY "Authenticated users can view categories" 
  ON public.categories 
  FOR SELECT 
  TO authenticated
  USING (true);
