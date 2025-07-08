-- Create table for caching valid eBay shipping service codes
CREATE TABLE public.ebay_valid_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code TEXT NOT NULL,
  service_name TEXT NOT NULL,
  is_domestic BOOLEAN NOT NULL DEFAULT true,
  is_international BOOLEAN NOT NULL DEFAULT false,
  account_type TEXT, -- 'individual', 'business', 'both'
  category TEXT, -- 'standard', 'expedited', 'economy', etc.
  cost_type TEXT, -- 'flat', 'calculated', 'free'
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_validated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(service_code, account_type)
);

-- Enable RLS
ALTER TABLE public.ebay_valid_services ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read valid services
CREATE POLICY "Authenticated users can view valid eBay services" 
ON public.ebay_valid_services 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create policy for service role to manage services
CREATE POLICY "Service role can manage eBay services" 
ON public.ebay_valid_services 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create index for faster lookups
CREATE INDEX idx_ebay_valid_services_code_type ON public.ebay_valid_services(service_code, account_type);
CREATE INDEX idx_ebay_valid_services_validated ON public.ebay_valid_services(last_validated);

-- Add trigger for updated_at
CREATE TRIGGER update_ebay_valid_services_updated_at
BEFORE UPDATE ON public.ebay_valid_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();