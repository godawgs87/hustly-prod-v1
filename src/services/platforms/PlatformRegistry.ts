import { IPlatformAdapter } from '@/types/platform';

export class PlatformRegistry {
  private static instance: PlatformRegistry;
  private platforms: Map<string, IPlatformAdapter> = new Map();
  private enabledPlatforms: Set<string> = new Set();

  private constructor() {}

  static getInstance(): PlatformRegistry {
    if (!PlatformRegistry.instance) {
      PlatformRegistry.instance = new PlatformRegistry();
    }
    return PlatformRegistry.instance;
  }

  register(adapter: IPlatformAdapter): void {
    console.log(`📦 Registering platform: ${adapter.name} (${adapter.id})`);
    this.platforms.set(adapter.id, adapter);
  }

  get(platformId: string): IPlatformAdapter | undefined {
    return this.platforms.get(platformId);
  }

  getAll(): IPlatformAdapter[] {
    return Array.from(this.platforms.values());
  }

  getEnabled(): IPlatformAdapter[] {
    return Array.from(this.platforms.values()).filter(
      platform => this.enabledPlatforms.has(platform.id)
    );
  }

  enablePlatform(platformId: string): void {
    if (this.platforms.has(platformId)) {
      this.enabledPlatforms.add(platformId);
    }
  }

  disablePlatform(platformId: string): void {
    this.enabledPlatforms.delete(platformId);
  }

  isEnabled(platformId: string): boolean {
    return this.enabledPlatforms.has(platformId);
  }

  // Get platforms available for user's tier
  getAvailableForTier(tier: 'starter' | 'professional' | 'business'): IPlatformAdapter[] {
    const allPlatforms = this.getAll();
    
    if (tier === 'starter') {
      // Starter only gets eBay
      return allPlatforms.filter(p => p.id === 'ebay');
    }
    
    if (tier === 'professional') {
      // Professional gets eBay, Poshmark, Mercari
      return allPlatforms.filter(p => 
        ['ebay', 'poshmark', 'mercari'].includes(p.id)
      );
    }
    
    // Business tier gets all platforms
    return allPlatforms;
  }
}

// Export singleton instance
export const platformRegistry = PlatformRegistry.getInstance();
