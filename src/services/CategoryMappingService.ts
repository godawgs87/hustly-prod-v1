import { supabase } from '@/integrations/supabase/client';

export interface CategoryMapping {
  id: string;
  user_id: string;
  internal_category: string;
  platform: string;
  platform_category_id: string;
  platform_category_path?: string;
  confidence_score: number;
  usage_count: number;
  last_used_at: string;
}

export interface PlatformCategoryField {
  categoryId: string;
  categoryPath?: string;
}

export interface PlatformCategories {
  ebay?: PlatformCategoryField;
  mercari?: PlatformCategoryField;
  poshmark?: PlatformCategoryField;
  depop?: PlatformCategoryField;
  facebook?: PlatformCategoryField;
}

export type Platform = 'ebay' | 'mercari' | 'poshmark' | 'depop' | 'facebook';

export class CategoryMappingService {
  /**
   * Get suggested platform categories based on internal category
   */
  static async getSuggestedCategories(internalCategory: string): Promise<PlatformCategories> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};

      // Get existing mappings for this user and category
      const { data: mappings } = await supabase
        .from('category_mappings')
        .select('*')
        .eq('user_id', user.id)
        .eq('internal_category', internalCategory)
        .order('confidence_score', { ascending: false })
        .order('usage_count', { ascending: false });

      if (!mappings) return {};

      // Group by platform and return the best mapping for each
      const platformCategories: PlatformCategories = {};
      
      for (const mapping of mappings) {
        const platform = mapping.platform as Platform;
        if (!platformCategories[platform]) {
          platformCategories[platform] = {
            categoryId: mapping.platform_category_id,
            categoryPath: mapping.platform_category_path || undefined
          };
        }
      }

      return platformCategories;
    } catch (error) {
      console.error('Error getting suggested categories:', error);
      return {};
    }
  }

  /**
   * Save a category mapping when user makes a selection
   */
  static async saveCategoryMapping(
    internalCategory: string,
    platform: Platform,
    platformCategoryId: string,
    platformCategoryPath?: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if mapping already exists
      const { data: existing } = await supabase
        .from('category_mappings')
        .select('*')
        .eq('user_id', user.id)
        .eq('internal_category', internalCategory)
        .eq('platform', platform)
        .eq('platform_category_id', platformCategoryId)
        .single();

      if (existing) {
        // Update usage count and last used time
        await supabase
          .from('category_mappings')
          .update({
            usage_count: existing.usage_count + 1,
            last_used_at: new Date().toISOString(),
            confidence_score: Math.min(existing.confidence_score + 0.1, 1.0)
          })
          .eq('id', existing.id);
      } else {
        // Create new mapping
        await supabase
          .from('category_mappings')
          .insert({
            user_id: user.id,
            internal_category: internalCategory,
            platform,
            platform_category_id: platformCategoryId,
            platform_category_path: platformCategoryPath,
            confidence_score: 0.7,
            usage_count: 1
          });
      }
    } catch (error) {
      console.error('Error saving category mapping:', error);
    }
  }

  /**
   * Auto-apply suggested categories to a listing
   */
  static async autoApplyCategories(internalCategory: string): Promise<PlatformCategories> {
    if (!internalCategory) return {};

    const suggestions = await this.getSuggestedCategories(internalCategory);
    
    // Only auto-apply if we have high confidence mappings
    const highConfidenceSuggestions: PlatformCategories = {};
    
    Object.entries(suggestions).forEach(([platform, categoryData]) => {
      // For now, we'll auto-apply all suggestions
      // In the future, we could add confidence thresholds
      if (categoryData) {
        highConfidenceSuggestions[platform as Platform] = categoryData;
      }
    });

    return highConfidenceSuggestions;
  }

  /**
   * Get category mapping statistics for analytics
   */
  static async getCategoryMappingStats(internalCategory?: string): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      let query = supabase
        .from('category_mappings')
        .select('platform, usage_count, confidence_score')
        .eq('user_id', user.id);

      if (internalCategory) {
        query = query.eq('internal_category', internalCategory);
      }

      const { data: mappings } = await query;
      
      if (!mappings) return null;

      // Aggregate stats by platform
      const stats = mappings.reduce((acc, mapping) => {
        const platform = mapping.platform;
        if (!acc[platform]) {
          acc[platform] = {
            totalMappings: 0,
            totalUsage: 0,
            avgConfidence: 0
          };
        }
        
        acc[platform].totalMappings += 1;
        acc[platform].totalUsage += mapping.usage_count;
        acc[platform].avgConfidence += mapping.confidence_score;
        
        return acc;
      }, {} as any);

      // Calculate averages
      Object.keys(stats).forEach(platform => {
        stats[platform].avgConfidence = stats[platform].avgConfidence / stats[platform].totalMappings;
      });

      return stats;
    } catch (error) {
      console.error('Error getting category mapping stats:', error);
      return null;
    }
  }
}