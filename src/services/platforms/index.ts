import { platformRegistry } from './PlatformRegistry';
import { EbayAdapter } from './adapters/EbayAdapter';

// Register all platform adapters
console.log('🚀 Initializing Platform Registry...');

// Register eBay adapter
platformRegistry.register(new EbayAdapter());

// Enable eBay by default (for now)
platformRegistry.enablePlatform('ebay');

// TODO: Add more platform adapters as they are created
// platformRegistry.register(new PoshmarkAdapter());
// platformRegistry.register(new MercariAdapter());
// platformRegistry.register(new DepopAdapter());

console.log('✅ Platform Registry initialized with:', 
  platformRegistry.getAll().map(p => p.name).join(', '));

export { platformRegistry };
export * from './PlatformRegistry';
export * from './BasePlatformAdapter';
