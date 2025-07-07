
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
