-- Fix storage bucket policies to allow edge functions to upload photos
-- This migration updates the policies to allow both user uploads and edge function uploads

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their own listing photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own listing photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own listing photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own listing photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view listing photos" ON storage.objects;

-- Create new comprehensive storage policies for listing-photos bucket

-- Allow authenticated users and service role to upload photos anywhere in the bucket
CREATE POLICY "Authenticated users can upload listing photos"
ON storage.objects FOR INSERT
TO authenticated, service_role
WITH CHECK (bucket_id = 'listing-photos');

-- Allow authenticated users and service role to view all photos
CREATE POLICY "Authenticated users can view listing photos"
ON storage.objects FOR SELECT
TO authenticated, service_role
USING (bucket_id = 'listing-photos');

-- Allow public access to view listing photos (for eBay and marketplace display)
CREATE POLICY "Public can view listing photos"
ON storage.objects FOR SELECT
TO public, anon
USING (bucket_id = 'listing-photos');

-- Allow authenticated users and service role to update photos
CREATE POLICY "Authenticated users can update listing photos"
ON storage.objects FOR UPDATE
TO authenticated, service_role
USING (bucket_id = 'listing-photos');

-- Allow authenticated users and service role to delete photos
CREATE POLICY "Authenticated users can delete listing photos"
ON storage.objects FOR DELETE
TO authenticated, service_role
USING (bucket_id = 'listing-photos');

-- Ensure the bucket exists with correct settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-photos',
  'listing-photos',
  true, -- Public bucket so URLs are accessible
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Ensure RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
