#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Production Supabase configuration
const SUPABASE_URL = 'https://ekzaaptxfwixgmbrooqr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVremFhcHR4ZndpeGdtYnJvb3FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTg5ODM2NjAsImV4cCI6MjAzNDU1OTY2MH0.Vu7Aw7WK7bqB-QnTRVVJGUmJpMZ5r5iqTjcUaZsU0LQ';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testPhotoUpload() {
  console.log('🚀 Testing photo upload to production storage...\n');

  try {
    // Test 1: Check if bucket exists
    console.log('1️⃣ Checking if listing_photos bucket exists...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
    } else {
      const listingPhotosBucket = buckets?.find(b => b.name === 'listing_photos');
      if (listingPhotosBucket) {
        console.log('✅ Bucket "listing_photos" exists:', listingPhotosBucket);
      } else {
        console.log('⚠️ Bucket "listing_photos" not found. Available buckets:', buckets?.map(b => b.name));
      }
    }

    // Test 2: Create a test image as base64 data URI
    console.log('\n2️⃣ Creating test image data URI...');
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    console.log('✅ Test image created (1x1 red pixel)');

    // Test 3: Upload image to storage
    console.log('\n3️⃣ Uploading image to storage...');
    const matches = testImageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid data URI format');
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    const timestamp = Date.now();
    const filename = `test-${timestamp}.png`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('listing_photos')
      .upload(filename, byteArray, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      
      // If bucket doesn't exist, try to create it
      if (uploadError.message?.includes('not found')) {
        console.log('\n📦 Attempting to create bucket...');
        const { data: createData, error: createError } = await supabase.storage.createBucket('listing_photos', {
          public: true
        });
        
        if (createError) {
          console.error('❌ Failed to create bucket:', createError);
        } else {
          console.log('✅ Bucket created successfully:', createData);
          
          // Retry upload
          console.log('🔄 Retrying upload...');
          const { data: retryData, error: retryError } = await supabase.storage
            .from('listing_photos')
            .upload(filename, byteArray, {
              contentType: mimeType,
              upsert: true
            });
          
          if (retryError) {
            console.error('❌ Retry failed:', retryError);
          } else {
            console.log('✅ Upload successful on retry:', retryData);
          }
        }
      }
    } else {
      console.log('✅ Upload successful:', uploadData);
      
      // Test 4: Get public URL
      console.log('\n4️⃣ Getting public URL...');
      const { data: urlData } = supabase.storage
        .from('listing_photos')
        .getPublicUrl(filename);
      
      console.log('✅ Public URL:', urlData.publicUrl);
      
      // Test 5: Verify URL is accessible
      console.log('\n5️⃣ Verifying URL accessibility...');
      try {
        const response = await fetch(urlData.publicUrl);
        if (response.ok) {
          console.log('✅ URL is accessible (status:', response.status, ')');
        } else {
          console.log('⚠️ URL returned status:', response.status);
        }
      } catch (fetchError) {
        console.error('❌ Failed to fetch URL:', fetchError.message);
      }
      
      // Test 6: Clean up test file
      console.log('\n6️⃣ Cleaning up test file...');
      const { error: deleteError } = await supabase.storage
        .from('listing_photos')
        .remove([filename]);
      
      if (deleteError) {
        console.error('⚠️ Failed to delete test file:', deleteError);
      } else {
        console.log('✅ Test file deleted');
      }
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }

  console.log('\n✨ Photo upload test complete!');
}

// Run the test
testPhotoUpload();
