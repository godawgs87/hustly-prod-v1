-- ALTERNATIVE STORAGE BUCKET FIX (More Permissive)
-- Use this if the main script still has issues
-- This creates simpler policies that are more likely to work

-- Create the listing-photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-photos',
  'listing-photos',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads to listing-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to listing-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to listing-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes to listing-photos" ON storage.objects;

-- Create simpler, more permissive policies
-- Allow any authenticated user to upload to listing-photos bucket
CREATE POLICY "Allow authenticated uploads to listing-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listing-photos');

-- Allow public read access to listing-photos
CREATE POLICY "Allow public read access to listing-photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listing-photos');

-- Allow authenticated users to update in listing-photos
CREATE POLICY "Allow authenticated updates to listing-photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'listing-photos');

-- Allow authenticated users to delete in listing-photos
CREATE POLICY "Allow authenticated deletes to listing-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'listing-photos');
