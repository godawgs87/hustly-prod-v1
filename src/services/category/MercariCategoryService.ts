import { CategoryService, UniversalCategory } from './ICategoryService';

// Static Mercari categories for now - will be replaced with API integration
const MERCARI_CATEGORIES = [
  { id: '1', name: 'Women', parentId: null, level: 0 },
  { id: '2', name: 'Men', parentId: null, level: 0 },
  { id: '3', name: 'Kids', parentId: null, level: 0 },
  { id: '4', name: 'Electronics', parentId: null, level: 0 },
  { id: '5', name: 'Home & Garden', parentId: null, level: 0 },
  { id: '6', name: 'Sports & Outdoors', parentId: null, level: 0 },
  { id: '7', name: 'Beauty', parentId: null, level: 0 },
  { id: '8', name: 'Handmade', parentId: null, level: 0 },
  { id: '9', name: 'Entertainment', parentId: null, level: 0 },
  { id: '10', name: 'Hobbies', parentId: null, level: 0 },
  
  // Women subcategories
  { id: '101', name: 'Tops & Blouses', parentId: '1', level: 1 },
  { id: '102', name: 'Sweaters', parentId: '1', level: 1 },
  { id: '103', name: 'Dresses', parentId: '1', level: 1 },
  { id: '104', name: 'Skirts', parentId: '1', level: 1 },
  { id: '105', name: 'Pants', parentId: '1', level: 1 },
  { id: '106', name: 'Jeans', parentId: '1', level: 1 },
  { id: '107', name: 'Activewear', parentId: '1', level: 1 },
  { id: '108', name: 'Shoes', parentId: '1', level: 1 },
  { id: '109', name: 'Bags', parentId: '1', level: 1 },
  { id: '110', name: 'Jewelry', parentId: '1', level: 1 },
  
  // Men subcategories
  { id: '201', name: 'Shirts', parentId: '2', level: 1 },
  { id: '202', name: 'T-Shirts', parentId: '2', level: 1 },
  { id: '203', name: 'Sweaters', parentId: '2', level: 1 },
  { id: '204', name: 'Pants', parentId: '2', level: 1 },
  { id: '205', name: 'Jeans', parentId: '2', level: 1 },
  { id: '206', name: 'Shorts', parentId: '2', level: 1 },
  { id: '207', name: 'Activewear', parentId: '2', level: 1 },
  { id: '208', name: 'Shoes', parentId: '2', level: 1 },
  { id: '209', name: 'Accessories', parentId: '2', level: 1 },
];

export class MercariCategoryService implements CategoryService {
  private categories = MERCARI_CATEGORIES;

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
      platform: 'mercari',
      metadata: {},
      level: platformCategory.level,
      hasChildren,
      isLeaf: !hasChildren
    };
  }
}