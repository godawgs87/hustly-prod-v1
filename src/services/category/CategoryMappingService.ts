import { supabase } from '@/integrations/supabase/client';
import { CategoryMappingService, PlatformCategories, Platform } from '@/services/CategoryMappingService';

interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  categoryPath: string;
  confidence: number;
  reason: string;
}

interface SmartCategoryMapping {
  keywords: string[];
  ebayCategories: Array<{
    categoryId: string;
    categoryName: string;
    confidence: number;
  }>;
}

// Pre-defined smart mappings for common categories
const SMART_CATEGORY_MAPPINGS: Record<string, SmartCategoryMapping> = {
  'automotive': {
    keywords: ['car', 'auto', 'vehicle', 'automotive', 'motor', 'engine', 'transmission'],
    ebayCategories: [
      { categoryId: '6030', categoryName: 'eBay Motors > Parts & Accessories', confidence: 0.9 },
      { categoryId: '94830', categoryName: 'Car Keys & Transponders', confidence: 0.8 }
    ]
  },
  'electronics': {
    keywords: ['electronic', 'digital', 'tech', 'device', 'gadget', 'remote', 'key fob'],
    ebayCategories: [
      { categoryId: '293', categoryName: 'Consumer Electronics', confidence: 0.9 },
      { categoryId: '94830', categoryName: 'Car Keys & Transponders', confidence: 0.7 }
    ]
  },
  'keys': {
    keywords: ['key', 'fob', 'remote', 'transponder', 'keyless', 'entry'],
    ebayCategories: [
      { categoryId: '94830', categoryName: 'Car Keys & Transponders', confidence: 0.95 },
      { categoryId: '12040', categoryName: 'Audio/Video Remotes', confidence: 0.6 }
    ]
  },
  'clothing': {
    keywords: ['shirt', 'dress', 'pants', 'jacket', 'clothing', 'apparel', 'fashion'],
    ebayCategories: [
      { categoryId: '11450', categoryName: 'Clothing, Shoes & Accessories', confidence: 0.9 }
    ]
  },
  'collectibles': {
    keywords: ['vintage', 'antique', 'collectible', 'rare', 'memorabilia'],
    ebayCategories: [
      { categoryId: '1', categoryName: 'Collectibles', confidence: 0.8 },
      { categoryId: '20081', categoryName: 'Antiques', confidence: 0.7 }
    ]
  }
};

export class EnhancedCategoryMappingService extends CategoryMappingService {
  /**
   * Get smart category suggestions based on listing details
   */
  static async getSmartCategorySuggestions(
    internalCategory?: string,
    title?: string,
    description?: string
  ): Promise<PlatformCategories> {
    try {
      // First try to get user's historical mappings
      let suggestions: PlatformCategories = {};
      
      if (internalCategory) {
        suggestions = await super.getSuggestedCategories(internalCategory);
      }

      // If no user mappings exist, use smart detection
      if (!suggestions.ebay && (title || description || internalCategory)) {
        const smartSuggestion = await this.detectSmartCategory(internalCategory, title, description);
        if (smartSuggestion) {
          suggestions.ebay = {
            categoryId: smartSuggestion.categoryId,
            categoryPath: smartSuggestion.categoryPath
          };
        }
      }

      return suggestions;
    } catch (error) {
      console.error('Error getting smart category suggestions:', error);
      return {};
    }
  }

  /**
   * Detect appropriate category using semantic analysis
   */
  private static async detectSmartCategory(
    internalCategory?: string,
    title?: string,
    description?: string
  ): Promise<CategorySuggestion | null> {
    const textToAnalyze = [internalCategory, title, description]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (!textToAnalyze.trim()) return null;

    // Check against smart mappings
    for (const [categoryType, mapping] of Object.entries(SMART_CATEGORY_MAPPINGS)) {
      const matchingKeywords = mapping.keywords.filter(keyword => 
        textToAnalyze.includes(keyword.toLowerCase())
      );

      if (matchingKeywords.length > 0) {
        const confidence = Math.min(0.95, 0.5 + (matchingKeywords.length * 0.15));
        const bestCategory = mapping.ebayCategories[0];
        
        // Verify the category exists in our database
        const { data: categoryExists } = await supabase
          .from('ebay_categories')
          .select('category_name, ebay_category_id')
          .eq('ebay_category_id', bestCategory.categoryId)
          .eq('is_active', true)
          .single();

        if (categoryExists) {
          return {
            categoryId: bestCategory.categoryId,
            categoryName: categoryExists.category_name,
            categoryPath: bestCategory.categoryName,
            confidence,
            reason: `Matched keywords: ${matchingKeywords.join(', ')}`
          };
        }
      }
    }

    // Fallback: try to search for relevant categories
    return await this.searchBasedSuggestion(textToAnalyze);
  }

  /**
   * Search-based fallback suggestion
   */
  private static async searchBasedSuggestion(text: string): Promise<CategorySuggestion | null> {
    try {
      // Extract key terms for search
      const words = text.split(/\s+/).filter(word => word.length > 2);
      const searchTerms = words.slice(0, 3); // Use first 3 meaningful words

      for (const term of searchTerms) {
        const { data: searchResults } = await supabase.rpc('search_categories', {
          search_term: term,
          limit_count: 5
        });

        if (searchResults && searchResults.length > 0) {
          const bestMatch = searchResults[0];
          return {
            categoryId: bestMatch.ebay_category_id,
            categoryName: bestMatch.category_name,
            categoryPath: bestMatch.full_path || bestMatch.category_name,
            confidence: Math.min(0.8, bestMatch.match_score / 100),
            reason: `Search match for "${term}"`
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error in search-based suggestion:', error);
      return null;
    }
  }

  /**
   * Enhanced auto-apply with smart detection
   */
  static async autoApplySmartCategories(
    internalCategory?: string,
    title?: string,
    description?: string
  ): Promise<PlatformCategories> {
    const suggestions = await this.getSmartCategorySuggestions(internalCategory, title, description);
    
    // Only auto-apply suggestions with high confidence (>= 0.7)
    const highConfidenceSuggestions: PlatformCategories = {};
    
    Object.entries(suggestions).forEach(([platform, categoryData]) => {
      if (categoryData) {
        // For now, apply all suggestions. In production, you might want to check confidence
        highConfidenceSuggestions[platform as Platform] = categoryData;
      }
    });

    return highConfidenceSuggestions;
  }

  /**
   * Get category suggestions with confidence scores and reasons
   */
  static async getCategorySuggestionsWithDetails(
    internalCategory?: string,
    title?: string,
    description?: string
  ): Promise<{
    ebay?: CategorySuggestion;
    // Add other platforms as needed
  }> {
    try {
      const suggestions: { ebay?: CategorySuggestion } = {};

      // Try smart detection for eBay
      const ebaySuggestion = await this.detectSmartCategory(internalCategory, title, description);
      if (ebaySuggestion) {
        suggestions.ebay = ebaySuggestion;
      }

      return suggestions;
    } catch (error) {
      console.error('Error getting detailed category suggestions:', error);
      return {};
    }
  }
}