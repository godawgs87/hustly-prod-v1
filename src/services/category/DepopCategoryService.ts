import { CategoryService, UniversalCategory } from './ICategoryService';

// Static Depop categories for now - will be replaced with API integration
const DEPOP_CATEGORIES = [
  { id: '1', name: 'Women\'s Fashion', parentId: null, level: 0 },
  { id: '2', name: 'Men\'s Fashion', parentId: null, level: 0 },
  { id: '3', name: 'Vintage', parentId: null, level: 0 },
  { id: '4', name: 'Electronics', parentId: null, level: 0 },
  { id: '5', name: 'Art & Collectibles', parentId: null, level: 0 },
  { id: '6', name: 'Books, Films & Music', parentId: null, level: 0 },
  { id: '7', name: 'Jewellery & Accessories', parentId: null, level: 0 },
  
  // Women's Fashion subcategories (trend-focused)
  { id: '101', name: 'Tops & T-shirts', parentId: '1', level: 1 },
  { id: '102', name: 'Jumpers & Cardigans', parentId: '1', level: 1 },
  { id: '103', name: 'Dresses', parentId: '1', level: 1 },
  { id: '104', name: 'Skirts', parentId: '1', level: 1 },
  { id: '105', name: 'Jeans', parentId: '1', level: 1 },
  { id: '106', name: 'Trousers', parentId: '1', level: 1 },
  { id: '107', name: 'Shorts', parentId: '1', level: 1 },
  { id: '108', name: 'Coats & Jackets', parentId: '1', level: 1 },
  { id: '109', name: 'Activewear', parentId: '1', level: 1 },
  { id: '110', name: 'Shoes', parentId: '1', level: 1 },
  { id: '111', name: 'Bags', parentId: '1', level: 1 },
  { id: '112', name: 'Underwear & Sleepwear', parentId: '1', level: 1 },
  { id: '113', name: 'Swimwear', parentId: '1', level: 1 },
  
  // Men's Fashion subcategories
  { id: '201', name: 'Tops & T-shirts', parentId: '2', level: 1 },
  { id: '202', name: 'Jumpers & Hoodies', parentId: '2', level: 1 },
  { id: '203', name: 'Shirts', parentId: '2', level: 1 },
  { id: '204', name: 'Jeans', parentId: '2', level: 1 },
  { id: '205', name: 'Trousers', parentId: '2', level: 1 },
  { id: '206', name: 'Shorts', parentId: '2', level: 1 },
  { id: '207', name: 'Coats & Jackets', parentId: '2', level: 1 },
  { id: '208', name: 'Activewear', parentId: '2', level: 1 },
  { id: '209', name: 'Shoes', parentId: '2', level: 1 },
  { id: '210', name: 'Bags', parentId: '2', level: 1 },
  { id: '211', name: 'Underwear', parentId: '2', level: 1 },
  
  // Vintage subcategories
  { id: '301', name: 'Vintage Women\'s', parentId: '3', level: 1 },
  { id: '302', name: 'Vintage Men\'s', parentId: '3', level: 1 },
  { id: '303', name: 'Vintage Accessories', parentId: '3', level: 1 },
  { id: '304', name: 'Vintage Home', parentId: '3', level: 1 },
];

export class DepopCategoryService implements CategoryService {
  private categories = DEPOP_CATEGORIES;

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
      platform: 'depop',
      metadata: {},
      level: platformCategory.level,
      hasChildren,
      isLeaf: !hasChildren
    };
  }
}