
export async function validateOpenAIApiKey(apiKey: string): Promise<void> {
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please check your Supabase Edge Function secrets.');
  }

  if (!apiKey.startsWith('sk-')) {
    throw new Error('Invalid OpenAI API key format. Please check your API key in Supabase secrets.');
  }

  console.log('Testing API key validity...');
  
  try {
    const testResponse = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('API key test failed:', errorText);
      
      if (testResponse.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your API key in Supabase secrets.');
      } else if (testResponse.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Your account may have hit request limits.');
      } else {
        throw new Error(`OpenAI API error during key validation: ${testResponse.status}`);
      }
    }
  } catch (testError) {
    console.error('API key test error:', testError);
    throw testError;
  }
}
