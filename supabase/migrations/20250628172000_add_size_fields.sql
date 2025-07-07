
-- Add size information fields to listings table
ALTER TABLE public.listings 
ADD COLUMN clothing_size TEXT,
ADD COLUMN shoe_size TEXT,
ADD COLUMN gender TEXT CHECK (gender IN ('Men', 'Women', 'Kids', 'Unisex')),
ADD COLUMN age_group TEXT CHECK (age_group IN ('Adult', 'Youth', 'Toddler', 'Baby'));

-- Create indexes for better performance
CREATE INDEX idx_listings_gender ON public.listings(gender);
CREATE INDEX idx_listings_clothing_size ON public.listings(clothing_size);
CREATE INDEX idx_listings_shoe_size ON public.listings(shoe_size);
