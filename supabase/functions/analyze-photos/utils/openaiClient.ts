import { validateOpenAIApiKey } from './apiValidation.ts';
import { parseOpenAIResponse } from './responseParser.ts';
import { buildAnalysisPrompt, prepareImageMessages } from './promptBuilder.ts';

export async function analyzePhotosWithOpenAI(apiKey: string, base64Images: string[]) {
  await validateOpenAIApiKey(apiKey);
  
  console.log('Analyzing photos with OpenAI...');
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
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid response structure from OpenAI');
  }

  const content = data.choices[0].message.content.trim();
  return parseOpenAIResponse(content);
}
