-- Add contact_name field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN contact_name text;

-- Migrate existing full_name data to contact_name for existing users
UPDATE public.user_profiles 
SET contact_name = full_name 
WHERE contact_name IS NULL AND full_name IS NOT NULL;

-- Add a comment to clarify the field purpose
COMMENT ON COLUMN public.user_profiles.contact_name IS 'Primary contact person name - required for all business types';
COMMENT ON COLUMN public.user_profiles.business_name IS 'Legal business name - required for LLC/Corp, optional for Individual/Sole Prop';
COMMENT ON COLUMN public.user_profiles.business_type IS 'Business structure type - affects required fields and tax handling';