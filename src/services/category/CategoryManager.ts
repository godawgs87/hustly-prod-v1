import { CategoryService, UniversalCategory } from './ICategoryService';
import { EbayCategoryService } from './EbayCategoryService';
import { MercariCategoryService } from './MercariCategoryService';
import { PoshmarkCategoryService } from './PoshmarkCategoryService';
import { DepopCategoryService } from './DepopCategoryService';
import { Platform } from '@/services/CategoryMappingService';

export interface PlatformCategoryData {
  categoryId: string;
  categoryPath: string;
  category?: UniversalCategory;
}

export type PlatformCategoriesMap = Record<Platform, PlatformCategoryData>;

export class CategoryManager {
  private services: Record<Platform, CategoryService>;
  private cache: Map<string, UniversalCategory[]> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.services = {
      ebay: new EbayCategoryService(),
      mercari: new MercariCategoryService(),
      poshmark: new PoshmarkCategoryService(),
      depop: new DepopCategoryService(),
      facebook: new MercariCategoryService() // Using Mercari as placeholder for now
    };
  }

  /**
   * Get categories for multiple platforms
   */
  async getCategoriesForPlatforms(platforms: Platform[]): Promise<Record<Platform, UniversalCategory[]>> {
    const results: Record<Platform, UniversalCategory[]> = {} as any;
    
    const promises = platforms.map(async (platform) => {
      try {
        const categories = await this.getRootCategories(platform);
        results[platform] = categories;
      } catch (error) {
        console.error(`Error loading categories for ${platform}:`, error);
        results[platform] = [];
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Search across all platforms
   */
  async searchAcrossAllPlatforms(query: string, platforms: Platform[] = ['ebay', 'mercari', 'poshmark', 'depop']): Promise<Record<Platform, UniversalCategory[]>> {
    const results: Record<Platform, UniversalCategory[]> = {} as any;
    
    const promises = platforms.map(async (platform) => {
      try {
        const categories = await this.searchCategories(platform, query);
        results[platform] = categories;
      } catch (error) {
        console.error(`Error searching categories for ${platform}:`, error);
        results[platform] = [];
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Get root categories for a platform
   */
  async getRootCategories(platform: Platform): Promise<UniversalCategory[]> {
    const cacheKey = `${platform}_root`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const service = this.services[platform];
      const categories = await service.getRootCategories();
      
      // Cache the results
      this.cache.set(cacheKey, categories);
      setTimeout(() => this.cache.delete(cacheKey), this.cacheTimeout);
      
      return categories;
    } catch (error) {
      console.error(`Error getting root categories for ${platform}:`, error);
      return [];
    }
  }

  /**
   * Get child categories for a platform
   */
  async getChildCategories(platform: Platform, parentId: string): Promise<UniversalCategory[]> {
    const cacheKey = `${platform}_children_${parentId}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const service = this.services[platform];
      const categories = await service.getChildCategories(parentId);
      
      // Cache the results
      this.cache.set(cacheKey, categories);
      setTimeout(() => this.cache.delete(cacheKey), this.cacheTimeout);
      
      return categories;
    } catch (error) {
      console.error(`Error getting child categories for ${platform}:`, error);
      return [];
    }
  }

  /**
   * Search categories for a platform
   */
  async searchCategories(platform: Platform, query: string, limit = 50): Promise<UniversalCategory[]> {
    try {
      const service = this.services[platform];
      return await service.searchCategories(query, limit);
    } catch (error) {
      console.error(`Error searching categories for ${platform}:`, error);
      return [];
    }
  }

  /**
   * Get category by ID for a platform
   */
  async getCategoryById(platform: Platform, categoryId: string): Promise<UniversalCategory | null> {
    try {
      const service = this.services[platform];
      return await service.getCategoryById(categoryId);
    } catch (error) {
      console.error(`Error getting category by ID for ${platform}:`, error);
      return null;
    }
  }

  /**
   * Get category path for a platform
   */
  async getCategoryPath(platform: Platform, categoryId: string): Promise<string[]> {
    try {
      const service = this.services[platform];
      return await service.getCategoryPath(categoryId);
    } catch (error) {
      console.error(`Error getting category path for ${platform}:`, error);
      return [];
    }
  }

  /**
   * Check if platform service is available
   */
  async isPlatformAvailable(platform: Platform): Promise<boolean> {
    try {
      const service = this.services[platform];
      return await service.isAvailable();
    } catch (error) {
      console.error(`Error checking platform availability for ${platform}:`, error);
      return false;
    }
  }

  /**
   * Get available platforms
   */
  async getAvailablePlatforms(platforms: Platform[] = ['ebay', 'mercari', 'poshmark', 'depop']): Promise<Platform[]> {
    const results = await Promise.all(
      platforms.map(async (platform) => ({
        platform,
        available: await this.isPlatformAvailable(platform)
      }))
    );

    return results.filter(result => result.available).map(result => result.platform);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const categoryManager = new CategoryManager();