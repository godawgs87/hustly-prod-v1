-- Add SKU management fields to listings table
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS sku TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS auto_generate_sku BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sku_prefix TEXT DEFAULT 'SKU';

-- Create index for SKU lookups
CREATE INDEX IF NOT EXISTS idx_listings_sku ON public.listings(sku);

-- Create function for auto-generating SKUs
CREATE OR REPLACE FUNCTION generate_sku(prefix TEXT DEFAULT 'SKU') 
RETURNS TEXT AS $$
DECLARE
    new_sku TEXT;
    sku_exists BOOLEAN := true;
    counter INTEGER := 1;
BEGIN
    WHILE sku_exists LOOP
        new_sku := prefix || '-' || TO_CHAR(EXTRACT(YEAR FROM NOW()), 'YYYY') || '-' || LPAD(counter::TEXT, 6, '0');
        SELECT EXISTS(SELECT 1 FROM listings WHERE sku = new_sku) INTO sku_exists;
        IF sku_exists THEN
            counter := counter + 1;
        END IF;
    END LOOP;
    RETURN new_sku;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for auto-generating SKUs
CREATE OR REPLACE FUNCTION auto_generate_listing_sku()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sku IS NULL AND NEW.auto_generate_sku = true THEN
        NEW.sku := generate_sku(COALESCE(NEW.sku_prefix, 'SKU'));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating SKUs
DROP TRIGGER IF EXISTS auto_generate_sku_trigger ON public.listings;
CREATE TRIGGER auto_generate_sku_trigger
    BEFORE INSERT ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_listing_sku();

-- Backfill SKUs for existing listings without them
UPDATE public.listings 
SET sku = generate_sku('SKU') 
WHERE sku IS NULL;