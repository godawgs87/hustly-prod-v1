-- Add offers_free_shipping column to user_profiles table
-- This enables users to set free shipping as a default option in business settings

ALTER TABLE user_profiles 
ADD COLUMN offers_free_shipping BOOLEAN DEFAULT false;

-- Update the column to be NOT NULL with a default value
ALTER TABLE user_profiles 
ALTER COLUMN offers_free_shipping SET NOT NULL;

-- Add a comment to document the column purpose
COMMENT ON COLUMN user_profiles.offers_free_shipping IS 'Whether the user offers free shipping as a default option for bulk uploads';
