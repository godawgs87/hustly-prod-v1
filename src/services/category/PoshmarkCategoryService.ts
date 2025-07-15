import { CategoryService, UniversalCategory } from './ICategoryService';

// Static Poshmark categories for now - will be replaced with API integration
const POSHMARK_CATEGORIES = [
  { id: '1', name: 'Women', parentId: null, level: 0 },
  { id: '2', name: 'Men', parentId: null, level: 0 },
  { id: '3', name: 'Kids', parentId: null, level: 0 },
  { id: '4', name: 'Home', parentId: null, level: 0 },
  { id: '5', name: 'Pets', parentId: null, level: 0 },
  
  // Women subcategories (fashion-focused)
  { id: '101', name: 'Dresses', parentId: '1', level: 1 },
  { id: '102', name: 'Tops', parentId: '1', level: 1 },
  { id: '103', name: 'Sweaters', parentId: '1', level: 1 },
  { id: '104', name: 'Blazers & Jackets', parentId: '1', level: 1 },
  { id: '105', name: 'Pants & Jumpsuits', parentId: '1', level: 1 },
  { id: '106', name: 'Jeans', parentId: '1', level: 1 },
  { id: '107', name: 'Skirts', parentId: '1', level: 1 },
  { id: '108', name: 'Shorts', parentId: '1', level: 1 },
  { id: '109', name: 'Activewear', parentId: '1', level: 1 },
  { id: '110', name: 'Intimates & Sleepwear', parentId: '1', level: 1 },
  { id: '111', name: 'Swimwear', parentId: '1', level: 1 },
  { id: '112', name: 'Shoes', parentId: '1', level: 1 },
  { id: '113', name: 'Bags', parentId: '1', level: 1 },
  { id: '114', name: 'Accessories', parentId: '1', level: 1 },
  { id: '115', name: 'Jewelry', parentId: '1', level: 1 },
  { id: '116', name: 'Makeup', parentId: '1', level: 1 },
  { id: '117', name: 'Other', parentId: '1', level: 1 },
  
  // Men subcategories
  { id: '201', name: 'Shirts', parentId: '2', level: 1 },
  { id: '202', name: 'Pants', parentId: '2', level: 1 },
  { id: '203', name: 'Jeans', parentId: '2', level: 1 },
  { id: '204', name: 'Shorts', parentId: '2', level: 1 },
  { id: '205', name: 'Sweaters', parentId: '2', level: 1 },
  { id: '206', name: 'Jackets & Coats', parentId: '2', level: 1 },
  { id: '207', name: 'Activewear', parentId: '2', level: 1 },
  { id: '208', name: 'Shoes', parentId: '2', level: 1 },
  { id: '209', name: 'Bags', parentId: '2', level: 1 },
  { id: '210', name: 'Accessories', parentId: '2', level: 1 },
  { id: '211', name: 'Other', parentId: '2', level: 1 },
  
  // Kids subcategories
  { id: '301', name: 'Baby Girl (0-24M)', parentId: '3', level: 1 },
  { id: '302', name: 'Baby Boy (0-24M)', parentId: '3', level: 1 },
  { id: '303', name: 'Girl (2T-20)', parentId: '3', level: 1 },
  { id: '304', name: 'Boy (2T-20)', parentId: '3', level: 1 },
  { id: '305', name: 'Unisex', parentId: '3', level: 1 },
];

export class PoshmarkCategoryService implements CategoryService {
  private categories = POSHMARK_CATEGORIES;

  async getRootCategories(): Promise<UniversalCategory[]> {
    const rootCategories = this.categories.filter(cat => cat.parentId === null);
    return rootCategories.map(cat => this.mapToUniversalFormat(cat));
  }

  async getChildCategories(parentId: string): Promise<UniversalCategory[]> {
    const childCategories = this.categories.filter(cat => cat.parentId === parentId);
    return childCategories.map(cat => this.mapToUniversalFormat(cat));
  }

  async searchCategories(query: string, limit = 50): Promise<UniversalCategory[]> {
    const filtered = this.categories
      .filter(cat => cat.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);
    
    return filtered.map(cat => this.mapToUniversalFormat(cat));
  }

  async getCategoryPath(categoryId: string): Promise<string[]> {
    const category = this.categories.find(cat => cat.id === categoryId);
    if (!category) return [];

    const path: string[] = [category.name];
    let current = category;

    while (current.parentId) {
      const parent = this.categories.find(cat => cat.id === current.parentId);
      if (!parent) break;
      path.unshift(parent.name);
      current = parent;
    }

    return [path.join(' > ')];
  }

  async getCategoryById(categoryId: string): Promise<UniversalCategory | null> {
    const category = this.categories.find(cat => cat.id === categoryId);
    return category ? this.mapToUniversalFormat(category) : null;
  }

  async isAvailable(): Promise<boolean> {
    return true; // Static data is always available
  }

  mapToUniversalFormat(platformCategory: any): UniversalCategory {
    const hasChildren = this.categories.some(cat => cat.parentId === platformCategory.id);
    
    return {
      id: platformCategory.id,
      name: platformCategory.name,
      parentId: platformCategory.parentId || undefined,
      platformId: platformCategory.id,
      platform: 'poshmark',
      metadata: {},
      level: platformCategory.level,
      hasChildren,
      isLeaf: !hasChildren
    };
  }
}