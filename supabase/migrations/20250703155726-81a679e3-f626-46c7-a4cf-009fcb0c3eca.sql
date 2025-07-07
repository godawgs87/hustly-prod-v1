-- Insert sample eBay categories for testing
INSERT INTO public.ebay_categories (ebay_category_id, category_name, parent_ebay_category_id, leaf_category, is_active) VALUES
('11450', 'Clothing, Shoes & Accessories', NULL, false, true),
('1059', 'Men', '11450', false, true),
('15709', 'Shirts', '1059', false, true),
('57989', 'Casual Shirts', '15709', true, true),
('57990', 'Dress Shirts', '15709', true, true),
('11484', 'Women', '11450', false, true),
('15724', 'Tops & Blouses', '11484', false, true),
('53159', 'Blouses', '15724', true, true),
('53174', 'Tank Tops', '15724', true, true),
('93427', 'Shoes', '11450', false, true),
('95672', 'Athletic Shoes', '93427', true, true),
('45333', 'Boots', '93427', true, true);