const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPriceResearch() {
  console.log('🧪 Testing eBay Price Research with Browse API...\n');
  
  const testQuery = 'Ford F-150 Lightning Smart Key Fob';
  console.log(`📦 Searching for: "${testQuery}"`);
  console.log('🔍 Using Browse API with application token\n');
  
  try {
    const { data, error } = await supabase.functions.invoke('ebay-api-client', {
      body: {
        action: 'research_item_price',
        params: {
          query: testQuery,
          brand: 'Ford',
          condition: 'New',
          limit: 20
        }
      }
    });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    if (data.status === 'error') {
      console.error('❌ API Error:', data.error);
      return;
    }

    console.log('✅ Price Research Results:\n');
    
    if (data.data?.searchResults) {
      const results = data.data.searchResults;
      console.log(`📊 Found ${results.total || 0} total listings`);
      console.log(`📋 Retrieved ${results.items?.length || 0} items for analysis\n`);
      
      if (results.items && results.items.length > 0) {
        console.log('🔝 Top 3 Results:');
        results.items.slice(0, 3).forEach((item, i) => {
          console.log(`\n${i + 1}. ${item.title}`);
          console.log(`   💵 Price: $${item.price}`);
          console.log(`   📍 Location: ${item.location || 'N/A'}`);
          console.log(`   🔗 ${item.url}`);
        });
      }
    }
    
    if (data.data?.priceAnalysis) {
      const analysis = data.data.priceAnalysis;
      console.log('\n💰 Price Analysis:');
      console.log(`   Suggested Price: $${analysis.suggestedPrice}`);
      console.log(`   Confidence: ${analysis.confidence}`);
      if (analysis.analysis) {
        console.log(`   Sample Size: ${analysis.analysis.sampleSize}`);
        console.log(`   Price Range: $${analysis.analysis.priceRange?.min} - $${analysis.analysis.priceRange?.max}`);
        console.log(`   Average: $${analysis.analysis.average}`);
        console.log(`   Median: $${analysis.analysis.median}`);
      }
    }
    
    console.log('\n✅ Test completed successfully!');
    console.log('🎯 Browse API is working with application token');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testPriceResearch();
