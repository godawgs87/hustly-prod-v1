import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTradingAPIWithPhotos() {
  console.log('Testing eBay Trading API with photo handling...\n');

  try {
    // First, sign in as a test user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'chad@hustly.app',
      password: 'Chadman1!'
    });

    if (authError) {
      console.error('Auth error:', authError);
      return;
    }

    console.log('✅ Authenticated successfully');
    console.log('User ID:', authData.user.id);

    // Find a listing with photos to test
    const { data: listings, error: listingError } = await supabase
      .from('listings')
      .select('id, title, photos')
      .eq('user_id', authData.user.id)
      .not('photos', 'is', null)
      .limit(1)
      .single();

    if (listingError || !listings) {
      console.error('No listings with photos found:', listingError);
      return;
    }

    console.log('\n📦 Testing with listing:');
    console.log('- ID:', listings.id);
    console.log('- Title:', listings.title);
    console.log('- Photos count:', Array.isArray(listings.photos) ? listings.photos.length : 0);

    // Check if photos are data URIs
    if (listings.photos && listings.photos.length > 0) {
      const firstPhoto = listings.photos[0];
      if (firstPhoto.startsWith('data:')) {
        console.log('- Photo type: Data URI (will be converted to URL)');
      } else if (firstPhoto.startsWith('http')) {
        console.log('- Photo type: URL');
      }
    }

    // Call the Trading API
    console.log('\n🚀 Calling Trading API...');
    const { data: result, error: apiError } = await supabase.functions.invoke('ebay-trading-api', {
      body: {
        action: 'addFixedPriceItem',
        listingId: listings.id
      }
    });

    if (apiError) {
      console.error('\n❌ Trading API error:', apiError);
      if (result) {
        console.error('Error details:', result);
      }
      return;
    }

    if (result.success) {
      console.log('\n✅ Successfully created eBay listing!');
      console.log('eBay Item ID:', result.itemId);
      console.log('\nView your listing at:');
      console.log(`https://www.ebay.com/itm/${result.itemId}`);
    } else {
      console.error('\n❌ Failed to create listing:', result.error);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    await supabase.auth.signOut();
  }
}

// Run the test
testTradingAPIWithPhotos();
