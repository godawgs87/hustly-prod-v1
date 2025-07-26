-- Fix storage bucket policies for listing-photos bucket
-- This migration ensures authenticated users can upload photos to the listing-photos bucket

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
DROP POLICY IF EXISTS "Users can upload their own listing photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own listing photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own listing photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own listing photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view listing photos" ON storage.objects;

-- Create comprehensive storage policies for listing-photos bucket
-- Allow authenticated users to upload photos to their own folder
CREATE POLICY "Users can upload their own listing photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listing-photos' AND
  (storage.foldername(name))[1] = 'listings' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow authenticated users to view their own photos
CREATE POLICY "Users can view their own listing photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'listing-photos' AND
  (storage.foldername(name))[1] = 'listings' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow public access to view listing photos (for marketplace display)
CREATE POLICY "Public can view listing photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listing-photos');

-- Allow authenticated users to update their own photos
CREATE POLICY "Users can update their own listing photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'listing-photos' AND
  (storage.foldername(name))[1] = 'listings' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow authenticated users to delete their own photos
CREATE POLICY "Users can delete their own listing photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'listing-photos' AND
  (storage.foldername(name))[1] = 'listings' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
