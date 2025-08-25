const https = require('https');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Test data with a data URI photo
const testData = {
  action: 'addFixedPriceItem',
  listing: {
    id: 'test-' + Date.now(),
    title: 'Test Vintage T-Shirt - Nike Just Do It',
    description: 'Vintage Nike t-shirt in excellent condition. Classic Just Do It slogan.',
    price: 29.99,
    condition: 'Pre-owned',
    quantity: 1,
    handling_time: 3,
    photos: [
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k='
    ]
  }
};

async function testTradingAPI() {
  console.log('Testing Trading API with data URI photo...\n');
  
  const url = new URL(`${supabaseUrl}/functions/v1/ebay-trading-api`);
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json'
    }
  };

  const req = https.request(url, options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response status:', res.statusCode);
      console.log('Response headers:', res.headers);
      
      try {
        const result = JSON.parse(data);
        console.log('\nResponse body:');
        console.log(JSON.stringify(result, null, 2));
        
        if (result.success) {
          console.log('\n✅ Successfully created eBay listing!');
          console.log('eBay Item ID:', result.itemId);
        } else {
          console.log('\n❌ Failed:', result.error || result.message);
        }
      } catch (e) {
        console.log('Raw response:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('Request error:', error);
  });
  
  req.write(JSON.stringify(testData));
  req.end();
}

testTradingAPI();
