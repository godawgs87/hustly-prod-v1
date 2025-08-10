// Unified Platform Types
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
  
  // Limits
  maxPhotos: number;
  maxTitleLength: number;
  maxDescriptionLength: number;
  supportedCategories: string[];
}

export interface PlatformCredentials {
  apiKey?: string;
  secret?: string;
  token?: string;
  refreshToken?: string;
  accessToken?: string;
  username?: string;
  password?: string;
  expiresAt?: string;
}

export interface UnifiedListing {
  id?: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  photos: string[];
  quantity?: number;
  brand?: string;
  size?: string;
  color?: string;
  material?: string;
  measurements?: Record<string, number>;
  tags?: string[];
  location?: {
    lat?: number;
    lng?: number;
    city?: string;
    state?: string;
    zip?: string;
  };
  shipping?: {
    price?: number;
    service?: string;
    handlingTime?: number;
  };
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
  saves?: number;
  messages?: number;
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

export type OfferAction = 
  | { type: 'accept' }
  | { type: 'decline' }
  | { type: 'counter'; counterPrice: number };

export interface IPlatformAdapter {
  id: string;
  name: string;
  icon: string;
  capabilities: PlatformCapabilities;
  
  // Core methods every platform must implement
  connect(credentials: PlatformCredentials): Promise<void>;
  disconnect(): Promise<void>;
  validateConnection(): Promise<boolean>;
  
  // Listing operations
  createListing(listing: UnifiedListing): Promise<PlatformListingResult>;
  updateListing(id: string, updates: Partial<UnifiedListing>): Promise<void>;
  deleteListing(id: string): Promise<void>;
  syncListing(id: string): Promise<SyncResult>;
  
  // Optional advanced features
  manageOffers?(offerId: string, action: OfferAction): Promise<void>;
  bulkOperations?(operations: BulkOperation[]): Promise<BulkResult>;
  getPolicies?(): Promise<any[]>;
  refreshPolicies?(): Promise<void>;
}
