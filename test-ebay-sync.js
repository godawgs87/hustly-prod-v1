#!/usr/bin/env node

/**
 * Test script for eBay inventory sync with automatic policy creation
 * Run with: node test-ebay-sync.js
 */

const fetch = require('node-fetch');

// Configuration - Update these values
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // e.g., https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const LISTING_ID = 'YOUR_LISTING_ID'; // The listing ID you want to sync
const USER_ID = 'YOUR_USER_ID'; // Your user ID

async function testEbaySync() {
  console.log('🚀 Starting eBay sync test...\n');
  
  try {
    // Call the edge function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ebay-inventory-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        listingId: LISTING_ID,
        userId: USER_ID
      })
    });

    const responseText = await response.text();
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Status Text: ${response.statusText}\n`);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ Sync completed successfully!\n');
      console.log('Response data:', JSON.stringify(data, null, 2));
      
      if (data.ebayItemId) {
        console.log(`\n🎉 eBay Item ID: ${data.ebayItemId}`);
      }
      if (data.offerId) {
        console.log(`🎉 eBay Offer ID: ${data.offerId}`);
      }
      if (data.ebayListingId) {
        console.log(`🎉 eBay Listing ID: ${data.ebayListingId}`);
        console.log(`\n🔗 View on eBay: https://www.ebay.com/itm/${data.ebayListingId}`);
      }
    } else {
      console.error('❌ Sync failed!\n');
      console.error('Error response:', responseText);
      
      // Try to parse error details
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.error) {
          console.error('\nError details:', errorData.error);
        }
        if (errorData.details) {
          console.error('Additional details:', errorData.details);
        }
      } catch (e) {
        // Response wasn't JSON
      }
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Check if required values are set
if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || 
    SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY' ||
    LISTING_ID === 'YOUR_LISTING_ID' ||
    USER_ID === 'YOUR_USER_ID') {
  console.error('⚠️  Please update the configuration values in this script before running!');
  console.log('\nRequired values:');
  console.log('- SUPABASE_URL: Your Supabase project URL');
  console.log('- SUPABASE_ANON_KEY: Your Supabase anon key');
  console.log('- LISTING_ID: The ID of the listing you want to sync');
  console.log('- USER_ID: Your user ID');
  process.exit(1);
}

// Run the test
testEbaySync();
