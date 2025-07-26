import { CategoryService, UniversalCategory } from './ICategoryService';
import { supabase } from '@/integrations/supabase/client';

interface EbayCategory {
  ebay_category_id: string;
  category_name: string;
  parent_ebay_category_id: string | null;
  leaf_category: boolean;
  requires_item_specifics?: any;
  suggested_item_specifics?: any;
}

export class EbayCategoryService implements CategoryService {
  async getRootCategories(): Promise<UniversalCategory[]> {
    // Deprecated: Use AI-driven mapping instead of DB fetch
    return [];
  }

  async getChildCategories(parentId: string): Promise<UniversalCategory[]> {
    // Deprecated: Use AI-driven mapping instead of DB fetch
    return [];
  }

  async searchCategories(query: string, limit = 50): Promise<UniversalCategory[]> {
    // Deprecated: Use AI-driven mapping instead of DB fetch
    return [];
  }

  async getCategoryPath(categoryId: string): Promise<string[]> {
    // Deprecated: Use AI-driven mapping instead of DB fetch
    return [];
  }

  async getCategoryById(categoryId: string): Promise<UniversalCategory | null> {
    // Deprecated: Use AI-driven mapping instead of DB fetch
    return null;
  }

  async isAvailable(): Promise<boolean> {
    // Deprecated: Use AI-driven mapping instead of DB fetch
    return true;
        .select('id')
        .limit(1);
      
      return !error && (data?.length || 0) > 0;
    } catch {
      return false;
    }
  }

  mapToUniversalFormat(platformCategory: any): UniversalCategory {
    return {
      id: platformCategory.ebay_category_id,
      name: platformCategory.category_name,
      parentId: platformCategory.parent_ebay_category_id || undefined,
      platformId: platformCategory.ebay_category_id,
      platform: 'ebay',
      metadata: {
        requires_item_specifics: platformCategory.requires_item_specifics,
        suggested_item_specifics: platformCategory.suggested_item_specifics,
        match_score: platformCategory.match_score
      },
      level: platformCategory.level || 0,
      hasChildren: !platformCategory.leaf_category,
      isLeaf: platformCategory.leaf_category || false,
      fullPath: platformCategory.full_path
    };
  }
}