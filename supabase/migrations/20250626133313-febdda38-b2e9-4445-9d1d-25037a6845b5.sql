
-- Add purchase tracking and consignment fields to listings table
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS purchase_date DATE,
ADD COLUMN IF NOT EXISTS is_consignment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS consignment_percentage DECIMAL(5,2), -- percentage seller gets (e.g., 70.00 for 70%)
ADD COLUMN IF NOT EXISTS consignor_name TEXT,
ADD COLUMN IF NOT EXISTS consignor_contact TEXT,
ADD COLUMN IF NOT EXISTS source_location TEXT,
ADD COLUMN IF NOT EXISTS source_type TEXT; -- 'thrift_store', 'estate_sale', 'garage_sale', 'consignment', 'wholesale', 'online', 'other'

-- Add profit calculation fields
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS cost_basis DECIMAL(10,2), -- total cost including fees
ADD COLUMN IF NOT EXISTS fees_paid DECIMAL(10,2) DEFAULT 0, -- platform fees, shipping costs, etc.
ADD COLUMN IF NOT EXISTS net_profit DECIMAL(10,2), -- calculated profit after all costs
ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5,2); -- profit margin percentage

-- Add performance tracking
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS listed_date DATE,
ADD COLUMN IF NOT EXISTS sold_date DATE,
ADD COLUMN IF NOT EXISTS sold_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS days_to_sell INTEGER,
ADD COLUMN IF NOT EXISTS performance_notes TEXT;
