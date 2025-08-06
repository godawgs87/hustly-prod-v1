import { validateOpenAIApiKey } from './apiValidation.ts';
import { parseOpenAIResponse } from './responseParser.ts';
import { buildAnalysisPrompt, prepareImageMessages } from './promptBuilder.ts';

// Retry configuration for scalability
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

const RETRY_CONFIG: RetryConfig = {
  maxRetries: 2, // Conservative for bulk uploads
  baseDelay: 1000, // Start with 1 second
  maxDelay: 5000, // Max 5 seconds to avoid long delays
  retryableErrors: [
    "I'm unable to analyze",
    "I cannot analyze",
    "I'm not able to analyze",
    "I cannot provide",
    "I'm unable to provide"
  ]
};

// Add jitter to prevent thundering herd with bulk uploads
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
  return Math.floor(exponentialDelay + jitter);
}

// Check if response should be retried
function shouldRetry(content: string, attempt: number): boolean {
  if (attempt >= RETRY_CONFIG.maxRetries) return false;
  
  return RETRY_CONFIG.retryableErrors.some(error => 
    content.toLowerCase().includes(error.toLowerCase())
  );
}

export async function analyzePhotosWithOpenAI(apiKey: string, base64Images: string[], retryAttempt: number = 0) {
  await validateOpenAIApiKey(apiKey);
  
  const isRetry = retryAttempt > 0;
  console.log(isRetry ? `🔄 Retry attempt ${retryAttempt}/2 for photo analysis` : 'Analyzing photos with OpenAI...');
  console.log('Number of images:', base64Images.length);
  console.log('API Key present:', !!apiKey);
  console.log('API Key format valid:', apiKey?.startsWith('sk-'));
  
  const prompt = buildAnalysisPrompt();
  const imageMessages = prepareImageMessages(base64Images);
  
  console.log('Image messages prepared:', imageMessages.length);
  console.log('First image message structure:', JSON.stringify(imageMessages[0], null, 2));

  const requestBody = {
    model: 'gpt-4o', // Use gpt-4o which supports vision
    messages: [
      {
        role: 'system',
        content: prompt.system
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt.user
          },
          ...imageMessages
        ]
      }
    ],
    max_tokens: 1500, // Increase token limit
    temperature: 0.1
  };

  console.log('Request body structure:', {
    model: requestBody.model,
    messagesCount: requestBody.messages.length,
    userContentLength: requestBody.messages[1].content.length,
    maxTokens: requestBody.max_tokens
  });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  console.log(`OpenAI API response status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`OpenAI API error ${response.status}:`, errorText);
    
    if (response.status === 401) {
      throw new Error('Invalid OpenAI API key.');
    } else if (response.status === 429) {
      throw new Error('OpenAI API rate limit exceeded. Please wait and try again.');
    } else if (response.status === 402) {
      throw new Error('OpenAI API quota exceeded. Please check your account billing.');
    } else if (response.status === 400) {
      console.error('Request body:', requestBody);
      throw new Error(`OpenAI API error: ${response.status}`);
    } else {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
  }

  const data = await response.json();
  console.log('OpenAI response received');
  
  console.log('=== OPENAI RAW RESPONSE DEBUG ===');
  console.log('Response structure:', {
    hasChoices: !!data.choices,
    choicesLength: data.choices?.length,
    hasFirstChoice: !!data.choices?.[0],
    hasMessage: !!data.choices?.[0]?.message,
    hasContent: !!data.choices?.[0]?.message?.content
  });
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('Invalid OpenAI response structure:', JSON.stringify(data, null, 2));
    throw new Error('Invalid response structure from OpenAI');
  }

  // Extract content for retry logic and parsing
  const content = data.choices[0].message.content.trim();
  
  // Check if we should retry due to disclaimer/refusal response
  if (shouldRetry(content, retryAttempt)) {
    const delay = calculateDelay(retryAttempt, RETRY_CONFIG.baseDelay, RETRY_CONFIG.maxDelay);
    console.log(`⚠️ OpenAI returned disclaimer text, retrying in ${delay}ms (attempt ${retryAttempt + 1}/${RETRY_CONFIG.maxRetries})`);
    console.log('Disclaimer content:', content.substring(0, 100));
    
    // Wait with jittered exponential backoff
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Recursive retry
    return analyzePhotosWithOpenAI(apiKey, base64Images, retryAttempt + 1);
  }
  console.log('=== OPENAI CONTENT TO PARSE ===');
  console.log('Content length:', content.length);
  console.log('Content type:', typeof content);
  console.log('Full content:', content);
  console.log('First 300 chars:', content.substring(0, 300));
  console.log('Last 300 chars:', content.substring(Math.max(0, content.length - 300)));
  console.log('=== END OPENAI CONTENT ===');
  
  const parsedResult = parseOpenAIResponse(content);
  console.log('=== PARSER RESULT ===');
  console.log('Parsed result:', JSON.stringify(parsedResult, null, 2));
  console.log('=== END PARSER RESULT ===');
  
  return parsedResult;
}
