// Platform types for the unified platform architecture
// This extends the existing Platform.ts types with new unified architecture types

export * from './Platform'; // Re-export existing types

export interface PlatformCapabilities {
  // Basic capabilities
  listing: boolean;
  bulkListing: boolean;
  scheduling: boolean;
  
  // Pricing capabilities
  offers: boolean;
  autoPrice: boolean;
  pricingRules: boolean;
  
  // Inventory management
  inventorySync: boolean;
  quantityManagement: boolean;
  variations: boolean;
  
  // Shipping
  calculatedShipping: boolean;
  shippingPolicies: boolean;
  internationalShipping: boolean;
  
  // Advanced features
  promotions: boolean;
  analytics: boolean;
  messaging: boolean;
  
  // Platform-specific limits
  maxPhotos: number;
  maxTitleLength: number;
  maxDescriptionLength: number;
  supportedCategories: string[];
}

export interface PlatformFeatures {
  supportsVariations: boolean;
  supportsBulkOperations: boolean;
  supportsScheduledListings: boolean;
  supportsOffers: boolean;
  maxPhotos: number;
  maxTitleLength: number;
  maxDescriptionLength: number;
}

export interface PlatformCategory {
  id: string;
  name: string;
  parentId?: string | null;
  isLeaf?: boolean;
  path?: string;
}

export interface PlatformCredentials {
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  apiSecret?: string;
  expiresAt?: string;
  [key: string]: any; // Allow platform-specific credentials
}

export interface UnifiedListing {
  id?: string;
  title: string;
  description: string;
  price: number;
  quantity?: number;
  category: string;
  condition: string;
  photos: string[];
  
  // Item specifics
  brand?: string;
  size?: string;
  color?: string;
  material?: string;
  measurements?: Record<string, string>;
  
  // Shipping
  shipping?: {
    service: string;
    price: number;
    handlingTime?: number;
  };
  
  // Platform-specific data
  platformData?: Record<string, any>;
}

export interface PlatformListingResult {
  success: boolean;
  platformListingId?: string;
  url?: string;
  errors?: string[];
  warnings?: string[];
}

export interface SyncResult {
  views?: number;
  watchers?: number;
  offers?: number;
  status: 'active' | 'sold' | 'ended' | 'draft' | 'error';
  lastUpdated: string;
  errors?: string[];
}

export interface BulkOperation {
  type: 'create' | 'update' | 'delete' | 'sync';
  listingId?: string;
  listing?: UnifiedListing;
  updates?: Partial<UnifiedListing>;
}

export interface BulkResult {
  successful: number;
  failed: number;
  results: Array<{
    listingId: string;
    success: boolean;
    error?: string;
  }>;
}

export interface OfferAction {
  type: 'accept' | 'decline' | 'counter';
  counterPrice?: number;
  message?: string;
}

export interface PlatformAdapter {
  id: string;
  name: string;
  icon: string;
  color: string;
  
  // Connection management
  connect(userId: string): Promise<void>;
  disconnect(userId: string): Promise<void>;
  validateConnection(userId: string): Promise<boolean>;
  
  // Listing operations
  createListing(listing: UnifiedListing): Promise<PlatformListing>;
  updateListing(listingId: string, updates: Partial<UnifiedListing>): Promise<PlatformListing>;
  deleteListing(listingId: string): Promise<void>;
  getListing(listingId: string): Promise<PlatformListing>;
  
  // Sync operations
  syncListing(listingId: string): Promise<SyncResult>;
  bulkSync(operations: BulkOperation[]): Promise<BulkResult>;
  
  // Category operations
  getCategories(parentId?: string): Promise<PlatformCategory[]>;
  searchCategories(query: string): Promise<PlatformCategory[]>;
  
  // Platform-specific features
  getFeatures(): PlatformFeatures;
  getPolicies?(): Promise<any>;
  updatePolicies?(policies: any): Promise<void>;
}

export interface Platform {
  id: string;
  name: string;
  icon: string;
  isActive: boolean;
  credentials?: {
    apiKey?: string;
    secret?: string;
    token?: string;
  };
  settings: {
    autoList: boolean;
    autoDelist: boolean;
    autoPrice: boolean;
    offerManagement: boolean;
    listingTemplate?: string;
  };
  fees: {
    listingFee: number;
    finalValueFee: number;
    paymentProcessingFee: number;
  };
}

export interface CrossListingRule {
  id: string;
  name: string;
  platforms: string[];
  conditions: {
    category?: string[];
    priceRange?: { min: number; max: number };
    condition?: string[];
  };
  settings: {
    autoList: boolean;
    priceMultiplier: number;
    titleTemplate: string;
    descriptionTemplate: string;
  };
}

export interface ListingOffer {
  id: string;
  listingId: string;
  platform: string;
  offerType: 'best_offer' | 'coupon' | 'price_drop';
  originalPrice: number;
  offerPrice: number;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
}

export interface PlatformListing {
  id: string;
  listingId: string;
  platform: string;
  platformListingId: string;
  status: 'active' | 'sold' | 'ended' | 'draft';
  views: number;
  watchers: number;
  offers: number;
  lastSynced: string;
  syncErrors?: string[];
}
