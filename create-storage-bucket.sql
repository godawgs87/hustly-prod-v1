-- Create the listing_photos storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('listing_photos', 'listing_photos', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;

-- Create comprehensive storage policies for listing_photos bucket
-- 1. Public read access for all photos
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'listing_photos');

-- 2. Authenticated users can upload photos
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'listing_photos' 
  AND auth.role() = 'authenticated'
);

-- 3. Service role can do everything (for edge functions)
CREATE POLICY "Service role can manage" ON storage.objects
FOR ALL USING (
  bucket_id = 'listing_photos'
  AND auth.role() = 'service_role'
);

-- 4. Authenticated users can update their own photos
CREATE POLICY "Users can update own photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'listing_photos'
  AND auth.role() = 'authenticated'
) WITH CHECK (
  bucket_id = 'listing_photos'
  AND auth.role() = 'authenticated'
);

-- 5. Authenticated users can delete their own photos
CREATE POLICY "Users can delete own photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'listing_photos'
  AND auth.role() = 'authenticated'
);

-- Verify the bucket exists
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'listing_photos';
