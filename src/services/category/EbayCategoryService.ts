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
    try {
      const { data, error } = await supabase.rpc('get_root_categories');
      
      if (error) throw error;
      
      return (data || []).map((cat: any) => this.mapToUniversalFormat(cat));
    } catch (error) {
      console.error('EbayCategoryService: Error loading root categories:', error);
      return [];
    }
  }

  async getChildCategories(parentId: string): Promise<UniversalCategory[]> {
    try {
      const { data, error } = await supabase.rpc('get_child_categories', {
        parent_id: parentId
      });
      
      if (error) throw error;
      
      return (data || []).map((cat: any) => this.mapToUniversalFormat(cat));
    } catch (error) {
      console.error('EbayCategoryService: Error loading child categories:', error);
      return [];
    }
  }

  async searchCategories(query: string, limit = 50): Promise<UniversalCategory[]> {
    try {
      const { data, error } = await supabase.rpc('search_categories', {
        search_term: query,
        limit_count: limit
      });
      
      if (error) throw error;
      
      return (data || []).map((cat: any) => this.mapToUniversalFormat({
        ...cat,
        full_path: cat.full_path
      }));
    } catch (error) {
      console.error('EbayCategoryService: Error searching categories:', error);
      return [];
    }
  }

  async getCategoryPath(categoryId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase.rpc('get_category_path', {
        category_id: categoryId
      });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        return [data[0].full_path];
      }
      
      return [];
    } catch (error) {
      console.error('EbayCategoryService: Error getting category path:', error);
      return [];
    }
  }

  async getCategoryById(categoryId: string): Promise<UniversalCategory | null> {
    try {
      const { data, error } = await supabase
        .from('ebay_categories')
        .select('*')
        .eq('ebay_category_id', categoryId)
        .eq('is_active', true)
        .single();
      
      if (error || !data) return null;
      
      return this.mapToUniversalFormat(data);
    } catch (error) {
      console.error('EbayCategoryService: Error getting category by ID:', error);
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('ebay_categories')
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