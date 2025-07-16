/**
 * Application-wide constants to avoid magic strings and improve maintainability
 */

export const PLATFORMS = {
  EBAY: 'ebay',
  MERCARI: 'mercari', 
  POSHMARK: 'poshmark',
  WHATNOT: 'whatnot',
  DEPOP: 'depop'
} as const;

export const PLATFORM_ICONS = {
  [PLATFORMS.EBAY]: '🛒',
  [PLATFORMS.MERCARI]: '📦', 
  [PLATFORMS.POSHMARK]: '👗',
  [PLATFORMS.WHATNOT]: '📱',
  [PLATFORMS.DEPOP]: '🎨'
} as const;

export const PLATFORM_NAMES = {
  [PLATFORMS.EBAY]: 'eBay',
  [PLATFORMS.MERCARI]: 'Mercari',
  [PLATFORMS.POSHMARK]: 'Poshmark', 
  [PLATFORMS.WHATNOT]: 'Whatnot',
  [PLATFORMS.DEPOP]: 'Depop'
} as const;

export const LISTING_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  SOLD: 'sold',
  ENDED: 'ended',
  CANCELLED: 'cancelled'
} as const;

export const AI_ANALYSIS_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;

export const USER_REVIEW_STATUS = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const;

export const SUBSCRIPTION_TIERS = {
  TRIAL: 'trial',
  FREE: 'free',
  SIDE_HUSTLER: 'side_hustler',
  SERIOUS_SELLER: 'serious_seller',
  FULL_TIME_FLIPPER: 'full_time_flipper',
  FOUNDERS: 'founders'
} as const;

export const SUBSCRIPTION_FEATURES = {
  BULK_UPLOAD: 'bulk_upload',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  TEAM_COLLABORATION: 'team_collaboration',
  API_ACCESS: 'api_access',
  PRIORITY_SUPPORT: 'priority_support',
  DEDICATED_SUPPORT: 'dedicated_support'
} as const;

// Feature limits by subscription tier
export const TIER_LIMITS = {
  [SUBSCRIPTION_TIERS.FREE]: {
    listings_per_month: 25,
    marketplace_connections: 1,
    allowed_platforms: [PLATFORMS.EBAY],
    photo_analyses_per_month: 25, // Same as listings since AI analysis is automatic
    features: [] as const,
    price: 0,
    name: 'Free'
  },
  [SUBSCRIPTION_TIERS.SIDE_HUSTLER]: {
    listings_per_month: 150,
    marketplace_connections: 2,
    allowed_platforms: [PLATFORMS.EBAY, PLATFORMS.POSHMARK, PLATFORMS.MERCARI, PLATFORMS.DEPOP],
    photo_analyses_per_month: 150, // Same as listings since AI analysis is automatic
    features: [] as const, // NO bulk upload - this is intentional
    price: 19,
    name: 'Side Hustler'
  },
  [SUBSCRIPTION_TIERS.SERIOUS_SELLER]: {
    listings_per_month: 300, // Changed from unlimited to 300
    marketplace_connections: 4,
    allowed_platforms: [PLATFORMS.EBAY, PLATFORMS.POSHMARK, PLATFORMS.MERCARI, PLATFORMS.DEPOP],
    photo_analyses_per_month: 300, // Same as listings
    features: ['bulk_upload', 'advanced_analytics', 'priority_support'] as const,
    price: 49,
    name: 'Serious Seller'
  },
  [SUBSCRIPTION_TIERS.FULL_TIME_FLIPPER]: {
    listings_per_month: -1, // unlimited
    marketplace_connections: -1, // unlimited
    allowed_platforms: [PLATFORMS.EBAY, PLATFORMS.POSHMARK, PLATFORMS.MERCARI, PLATFORMS.DEPOP, PLATFORMS.WHATNOT],
    photo_analyses_per_month: -1, // unlimited
    features: ['bulk_upload', 'advanced_analytics', 'team_collaboration', 'api_access', 'dedicated_support'] as const,
    price: 89,
    name: 'Full-Time Flipper'
  },
  [SUBSCRIPTION_TIERS.FOUNDERS]: {
    listings_per_month: 300, // Same as Serious Seller
    marketplace_connections: 4,
    allowed_platforms: [PLATFORMS.EBAY, PLATFORMS.POSHMARK, PLATFORMS.MERCARI, PLATFORMS.DEPOP],
    photo_analyses_per_month: 300, // Same as listings
    features: ['bulk_upload', 'advanced_analytics', 'priority_support'] as const,
    price: 39.99,
    name: 'Founders',
    is_founders: true
  }
} as const;

export const STORAGE_KEYS = {
  EBAY_OAUTH_PENDING: 'ebay_oauth_pending',
  THEME: 'theme',
  USER_PREFERENCES: 'user_preferences'
} as const;

export const ROUTES = {
  HOME: '/',
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
  CREATE_LISTING: '/create-listing',
  INVENTORY: '/inventory',
  SETTINGS: '/settings',
  EBAY_CALLBACK: '/ebay/callback'
} as const;

export const ADDON_TYPES = {
  EXTRA_LISTINGS: 'extra_listings',
  EXTRA_MARKETPLACE: 'extra_marketplace', 
  BULK_UPLOAD_BOOST: 'bulk_upload_boost'
} as const;

export const ADDON_PRICING = {
  [ADDON_TYPES.EXTRA_LISTINGS]: {
    name: 'Extra Listings Pack',
    description: '10 additional listings for this billing cycle',
    price: 1.00,
    value: 10
  },
  [ADDON_TYPES.EXTRA_MARKETPLACE]: {
    name: 'Extra Marketplace Access',
    description: 'Add one additional marketplace for this billing cycle',
    price: 10.00,
    value: 1
  },
  [ADDON_TYPES.BULK_UPLOAD_BOOST]: {
    name: 'Bulk Upload Booster',
    description: 'Enable bulk upload for Side Hustler plan',
    price: 15.00,
    value: 1
  }
} as const;

export const VALIDATION_LIMITS = {
  MAX_PHOTOS: 24,
  MAX_TITLE_LENGTH: 80,
  MAX_DESCRIPTION_LENGTH: 4000,
  MAX_KEYWORDS: 20,
  MIN_PRICE: 0.01,
  MAX_PRICE: 99999.99
} as const;