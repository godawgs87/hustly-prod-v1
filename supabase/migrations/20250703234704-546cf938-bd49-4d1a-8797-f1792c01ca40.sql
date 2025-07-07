-- Fix the SKU generation race condition by ensuring uniqueness
DROP TRIGGER IF EXISTS auto_generate_sku_trigger ON public.listings;

-- Create improved SKU generation function that handles race conditions
CREATE OR REPLACE FUNCTION generate_unique_sku(prefix TEXT DEFAULT 'SKU') 
RETURNS TEXT AS $$
DECLARE
    new_sku TEXT;
    sku_exists BOOLEAN := true;
    counter INTEGER;
    year_str TEXT;
BEGIN
    year_str := TO_CHAR(EXTRACT(YEAR FROM NOW()), 'YYYY');
    
    -- Start with a random counter to reduce collisions
    counter := floor(random() * 100000 + 1)::INTEGER;
    
    WHILE sku_exists AND counter < 999999 LOOP
        new_sku := prefix || '-' || year_str || '-' || LPAD(counter::TEXT, 6, '0');
        
        -- Use advisory lock to prevent race conditions
        PERFORM pg_advisory_xact_lock(hashtext(new_sku));
        
        SELECT EXISTS(SELECT 1 FROM listings WHERE sku = new_sku) INTO sku_exists;
        
        IF sku_exists THEN
            counter := counter + 1;
        END IF;
    END LOOP;
    
    IF sku_exists THEN
        RAISE EXCEPTION 'Unable to generate unique SKU after % attempts', counter;
    END IF;
    
    RETURN new_sku;
END;
$$ LANGUAGE plpgsql;

-- Update the auto-generation trigger to use the improved function
CREATE OR REPLACE FUNCTION auto_generate_listing_sku()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate if SKU is null/empty and auto_generate_sku is true
    IF (NEW.sku IS NULL OR trim(NEW.sku) = '') AND COALESCE(NEW.auto_generate_sku, true) = true THEN
        NEW.sku := generate_unique_sku(COALESCE(NEW.sku_prefix, 'SKU'));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER auto_generate_sku_trigger
    BEFORE INSERT OR UPDATE ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_listing_sku();