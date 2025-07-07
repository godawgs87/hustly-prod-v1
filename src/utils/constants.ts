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
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise'
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

export const VALIDATION_LIMITS = {
  MAX_PHOTOS: 24,
  MAX_TITLE_LENGTH: 80,
  MAX_DESCRIPTION_LENGTH: 4000,
  MAX_KEYWORDS: 20,
  MIN_PRICE: 0.01,
  MAX_PRICE: 99999.99
} as const;