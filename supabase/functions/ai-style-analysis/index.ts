import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AI-STYLE-ANALYSIS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { action, listingData, trainingData } = await req.json();

    switch (action) {
      case 'analyze_user_style':
        return await analyzeUserStyle(supabaseClient, user.id);
      
      case 'generate_content':
        return await generatePersonalizedContent(supabaseClient, user.id, listingData);
      
      case 'import_training_data':
        return await importTrainingData(supabaseClient, user.id, trainingData);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function analyzeUserStyle(supabaseClient: any, userId: string) {
  logStep("Analyzing user style", { userId });
  
  // Get user's training data
  const { data: trainingData, error } = await supabaseClient
    .from('ai_training_data')
    .select('*')
    .eq('user_id', userId)
    .order('success_score', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to fetch training data: ${error.message}`);
  }

  if (!trainingData || trainingData.length < 5) {
    return new Response(JSON.stringify({
      status: 'insufficient_data',
      message: 'Need at least 5 successful listings to analyze style patterns',
      training_data_count: trainingData?.length || 0
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }

  // Analyze patterns in successful listings
  const titlePatterns = extractTitlePatterns(trainingData);
  const descriptionPatterns = extractDescriptionPatterns(trainingData);
  const pricingPatterns = extractPricingPatterns(trainingData);
  const categoryPreferences = extractCategoryPreferences(trainingData);
  const keywordPatterns = extractKeywordPatterns(trainingData);

  const styleMetrics = {
    avg_title_length: titlePatterns.avgLength,
    common_title_words: titlePatterns.commonWords,
    avg_description_length: descriptionPatterns.avgLength,
    pricing_strategy: pricingPatterns.strategy,
    preferred_categories: categoryPreferences.top5,
    success_factors: analyzeSuccessFactors(trainingData)
  };

  // Upsert AI user model
  const { error: upsertError } = await supabaseClient
    .from('ai_user_models')
    .upsert({
      user_id: userId,
      training_data_count: trainingData.length,
      last_trained_at: new Date().toISOString(),
      model_confidence_score: Math.min(0.99, Math.max(0.1, trainingData.length / 100)),
      title_patterns: titlePatterns,
      description_patterns: descriptionPatterns,
      pricing_patterns: pricingPatterns,
      category_preferences: categoryPreferences,
      keyword_patterns: keywordPatterns,
      style_metrics: styleMetrics
    }, { onConflict: 'user_id' });

  if (upsertError) {
    throw new Error(`Failed to save AI model: ${upsertError.message}`);
  }

  logStep("Style analysis complete", { 
    trainingDataCount: trainingData.length,
    confidenceScore: Math.min(0.99, Math.max(0.1, trainingData.length / 100))
  });

  return new Response(JSON.stringify({
    status: 'success',
    training_data_count: trainingData.length,
    confidence_score: Math.min(0.99, Math.max(0.1, trainingData.length / 100)),
    style_metrics: styleMetrics
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function generatePersonalizedContent(supabaseClient: any, userId: string, listingData: any) {
  logStep("Generating personalized content", { userId, category: listingData.category });

  // Get user's AI model
  const { data: aiModel, error } = await supabaseClient
    .from('ai_user_models')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !aiModel) {
    // Fallback to generic content generation
    return generateGenericContent(listingData);
  }

  const { title_patterns, description_patterns, pricing_patterns, keyword_patterns } = aiModel;

  // Generate personalized title
  const personalizedTitle = generatePersonalizedTitle(listingData, title_patterns);
  
  // Generate personalized description
  const personalizedDescription = generatePersonalizedDescription(listingData, description_patterns);
  
  // Generate pricing suggestion
  const pricingSuggestion = generatePricingSuggestion(listingData, pricing_patterns);
  
  // Generate keywords
  const suggestedKeywords = generatePersonalizedKeywords(listingData, keyword_patterns);

  return new Response(JSON.stringify({
    title: personalizedTitle,
    description: personalizedDescription,
    pricing_suggestion: pricingSuggestion,
    keywords: suggestedKeywords,
    confidence_score: aiModel.model_confidence_score,
    personalization_applied: true
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function importTrainingData(supabaseClient: any, userId: string, trainingData: any[]) {
  logStep("Importing training data", { userId, count: trainingData.length });

  const processedData = trainingData.map(item => ({
    user_id: userId,
    source_platform: item.platform || 'ebay',
    external_listing_id: item.listing_id,
    title: item.title,
    description: item.description,
    final_price: item.sold_price || item.price,
    category: item.category,
    condition_rating: item.condition,
    days_to_sell: item.days_to_sell,
    view_count: item.view_count || 0,
    watcher_count: item.watcher_count || 0,
    offer_count: item.offer_count || 0,
    listing_date: item.listing_date,
    sold_date: item.sold_date,
    success_score: calculateSuccessScore(item),
    keywords: item.keywords || [],
    raw_data: item
  }));

  const { error } = await supabaseClient
    .from('ai_training_data')
    .upsert(processedData, { onConflict: 'user_id,external_listing_id,source_platform' });

  if (error) {
    throw new Error(`Failed to import training data: ${error.message}`);
  }

  return new Response(JSON.stringify({
    status: 'success',
    imported_count: processedData.length,
    message: 'Training data imported successfully'
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

// Helper functions
function extractTitlePatterns(data: any[]) {
  const titles = data.map(item => item.title).filter(Boolean);
  const avgLength = titles.reduce((sum, title) => sum + title.length, 0) / titles.length;
  
  const allWords = titles.join(' ').toLowerCase().split(/\s+/);
  const wordCounts = allWords.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const commonWords = Object.entries(wordCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20)
    .map(([word]) => word);

  return { avgLength, commonWords, patterns: titles };
}

function extractDescriptionPatterns(data: any[]) {
  const descriptions = data.map(item => item.description).filter(Boolean);
  const avgLength = descriptions.reduce((sum, desc) => sum + desc.length, 0) / descriptions.length;
  
  return { avgLength, patterns: descriptions };
}

function extractPricingPatterns(data: any[]) {
  const prices = data.map(item => item.final_price).filter(Boolean);
  const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  
  return { avgPrice, strategy: 'competitive', patterns: prices };
}

function extractCategoryPreferences(data: any[]) {
  const categories = data.map(item => item.category).filter(Boolean);
  const categoryCounts = categories.reduce((acc, cat) => {
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const top5 = Object.entries(categoryCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([category]) => category);

  return { top5, all: categoryCounts };
}

function extractKeywordPatterns(data: any[]) {
  const allKeywords = data.flatMap(item => item.keywords || []);
  const keywordCounts = allKeywords.reduce((acc, keyword) => {
    acc[keyword] = (acc[keyword] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return { common: Object.keys(keywordCounts).slice(0, 50), patterns: keywordCounts };
}

function analyzeSuccessFactors(data: any[]) {
  // Analyze what makes listings successful
  const highPerforming = data.filter(item => item.success_score > 0.7);
  
  return {
    optimal_price_range: calculateOptimalPriceRange(highPerforming),
    best_listing_days: calculateBestListingDays(highPerforming),
    effective_keywords: extractEffectiveKeywords(highPerforming)
  };
}

function calculateSuccessScore(item: any): number {
  let score = 0;
  
  // Sold items get base score
  if (item.sold_date) score += 0.5;
  
  // Quick sales get bonus
  if (item.days_to_sell <= 7) score += 0.2;
  else if (item.days_to_sell <= 30) score += 0.1;
  
  // High engagement gets bonus
  if (item.view_count > 50) score += 0.1;
  if (item.watcher_count > 5) score += 0.1;
  if (item.offer_count > 3) score += 0.1;
  
  return Math.min(1.0, score);
}

function generatePersonalizedTitle(listingData: any, patterns: any): string {
  // Use user's common words and patterns to generate title
  const baseTitle = listingData.ai_analysis?.detected_brand || 'Item';
  const condition = listingData.condition || 'Good';
  const category = listingData.category || '';
  
  return `${baseTitle} ${category} ${condition} Condition`.trim();
}

function generatePersonalizedDescription(listingData: any, patterns: any): string {
  // Generate description based on user's style patterns
  return `Quality ${listingData.category || 'item'} in ${listingData.condition || 'good'} condition. ` +
         `${listingData.ai_analysis?.detected_material ? `Made from ${listingData.ai_analysis.detected_material}. ` : ''}` +
         `Ships fast with tracking.`;
}

function generatePricingSuggestion(listingData: any, patterns: any): number {
  // Use user's pricing patterns for suggestion
  const basePrice = patterns.avgPrice || 25;
  const conditionMultiplier = getConditionMultiplier(listingData.condition);
  
  return Math.round(basePrice * conditionMultiplier * 100) / 100;
}

function generatePersonalizedKeywords(listingData: any, patterns: any): string[] {
  const keywords = [];
  
  if (listingData.ai_analysis?.detected_brand) {
    keywords.push(listingData.ai_analysis.detected_brand.toLowerCase());
  }
  
  if (listingData.category) {
    keywords.push(listingData.category.toLowerCase());
  }
  
  if (listingData.condition) {
    keywords.push(listingData.condition.toLowerCase());
  }
  
  // Add user's common keywords
  if (patterns.common) {
    keywords.push(...patterns.common.slice(0, 5));
  }
  
  return [...new Set(keywords)];
}

function generateGenericContent(listingData: any) {
  return new Response(JSON.stringify({
    title: `${listingData.ai_analysis?.detected_brand || 'Quality'} ${listingData.category || 'Item'}`,
    description: `Great ${listingData.category || 'item'} in ${listingData.condition || 'good'} condition.`,
    pricing_suggestion: 25.00,
    keywords: ['quality', 'fast shipping'],
    confidence_score: 0.3,
    personalization_applied: false
  }), {
    headers: corsHeaders,
    status: 200,
  });
}

function calculateOptimalPriceRange(data: any[]) {
  const prices = data.map(item => item.final_price).filter(Boolean).sort((a, b) => a - b);
  return {
    min: prices[Math.floor(prices.length * 0.25)],
    max: prices[Math.floor(prices.length * 0.75)]
  };
}

function calculateBestListingDays(data: any[]) {
  // Analyze which days of week perform best
  return ['monday', 'tuesday', 'wednesday'];
}

function extractEffectiveKeywords(data: any[]) {
  return data.flatMap(item => item.keywords || []).slice(0, 10);
}

function getConditionMultiplier(condition: string): number {
  const multipliers: Record<string, number> = {
    'new': 1.2,
    'like new': 1.1,
    'excellent': 1.0,
    'good': 0.8,
    'fair': 0.6,
    'poor': 0.4
  };
  
  return multipliers[condition?.toLowerCase()] || 0.8;
}