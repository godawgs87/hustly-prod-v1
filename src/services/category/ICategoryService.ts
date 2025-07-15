import { Platform } from '@/services/CategoryMappingService';

export interface UniversalCategory {
  id: string;
  name: string;
  parentId?: string;
  platformId: string;
  platform: Platform;
  metadata: Record<string, any>;
  level: number;
  hasChildren: boolean;
  isLeaf: boolean;
  fullPath?: string;
}

export interface CategoryService {
  /**
   * Get root categories for the platform
   */
  getRootCategories(): Promise<UniversalCategory[]>;
  
  /**
   * Get child categories for a given parent ID
   */
  getChildCategories(parentId: string): Promise<UniversalCategory[]>;
  
  /**
   * Search categories by query string
   */
  searchCategories(query: string, limit?: number): Promise<UniversalCategory[]>;
  
  /**
   * Get the full path for a category
   */
  getCategoryPath(categoryId: string): Promise<string[]>;
  
  /**
   * Map platform-specific category to universal format
   */
  mapToUniversalFormat(platformCategory: any): UniversalCategory;
  
  /**
   * Get category by ID
   */
  getCategoryById(categoryId: string): Promise<UniversalCategory | null>;
  
  /**
   * Check if service is available/initialized
   */
  isAvailable(): Promise<boolean>;
}