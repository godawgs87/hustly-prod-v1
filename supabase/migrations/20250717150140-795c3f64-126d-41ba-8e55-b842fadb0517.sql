-- Insert valid eBay shipping services to unblock immediate testing
-- These are confirmed working service codes from eBay documentation

INSERT INTO ebay_valid_services (
  service_code, 
  service_name, 
  is_domestic, 
  is_international, 
  account_type, 
  category, 
  cost_type, 
  is_active, 
  last_validated
) VALUES 
('USPSGround', 'USPS Ground', true, false, 'individual', 'standard', 'flat', true, now()),
('USPSFirstClass', 'USPS First Class', true, false, 'individual', 'standard', 'flat', true, now()),
('USPSMedia', 'USPS Media Mail', true, false, 'individual', 'media', 'flat', true, now()),
('USPSPriorityMailFlatRateBox', 'USPS Priority Mail Flat Rate Box', true, false, 'individual', 'priority', 'flat', true, now())
ON CONFLICT (service_code) DO UPDATE SET
  last_validated = now(),
  is_active = true;