// eBay-specific error handling and parsing utilities

export interface EbayError {
  errorId: number;
  domain: string;
  category: string;
  message: string;
  longMessage: string;
  parameters?: Array<{
    name: string;
    value: string;
  }>;
}

export interface EbayErrorResponse {
  errors: EbayError[];
}

export interface ParsedEbayError {
  userMessage: string;
  technicalMessage: string;
  category: 'validation' | 'authentication' | 'policy' | 'business' | 'system' | 'unknown';
  isRetryable: boolean;
  actionRequired?: string;
  retryAfter?: number; // seconds
}

// Common eBay error codes and their meanings
const EBAY_ERROR_CODES: Record<number, Partial<ParsedEbayError>> = {
  // Authentication Errors
  1001: {
    category: 'authentication',
    userMessage: 'Your eBay connection has expired. Please reconnect your eBay account.',
    actionRequired: 'Go to Settings → Connections → eBay and reconnect your account',
    isRetryable: false
  },
  1002: {
    category: 'authentication', 
    userMessage: 'Invalid eBay credentials. Please reconnect your eBay account.',
    actionRequired: 'Go to Settings → Connections → eBay and reconnect your account',
    isRetryable: false
  },
  
  // Request Validation Errors
  2004: {
    category: 'validation',
    userMessage: 'The listing data contains invalid information.',
    isRetryable: false
  },
  2001: {
    category: 'validation',
    userMessage: 'Required information is missing from your listing.',
    isRetryable: false
  },
  
  // Business Policy Errors
  21916: {
    category: 'policy',
    userMessage: 'Business policies are required but not configured.',
    actionRequired: 'Go to Settings → Connections → eBay and refresh your business policies',
    isRetryable: false
  },
  21917: {
    category: 'policy',
    userMessage: 'Your business policies are invalid or expired.',
    actionRequired: 'Go to Settings → Connections → eBay and refresh your business policies',
    isRetryable: false
  },
  21919: {
    category: 'policy',
    userMessage: 'The specified fulfillment policy ID is invalid or does not exist.',
    actionRequired: 'Go to Settings → Connections → eBay and refresh your business policies',
    isRetryable: false
  },
  21920: {
    category: 'policy',
    userMessage: 'The specified payment policy ID is invalid or does not exist.',
    actionRequired: 'Go to Settings → Connections → eBay and refresh your business policies',
    isRetryable: false
  },
  21921: {
    category: 'policy',
    userMessage: 'The specified return policy ID is invalid or does not exist.',
    actionRequired: 'Go to Settings → Connections → eBay and refresh your business policies',
    isRetryable: false
  },
  
  // Category/Item Specifics Errors
  21916601: {
    category: 'validation',
    userMessage: 'The selected category requires additional item specifics.',
    isRetryable: false
  },
  21916585: {
    category: 'validation',
    userMessage: 'Invalid category selected for this item type.',
    isRetryable: false
  },
  
  // Inventory/SKU Errors
  25002: {
    category: 'business',
    userMessage: 'This SKU already exists in your eBay inventory.',
    isRetryable: false
  },
  25001: {
    category: 'business',
    userMessage: 'Inventory item not found or inaccessible.',
    isRetryable: true,
    retryAfter: 5
  },
  
  // Rate Limiting
  931: {
    category: 'system',
    userMessage: 'eBay API rate limit exceeded. Please wait before trying again.',
    isRetryable: true,
    retryAfter: 60
  },
  
  // System Errors
  500: {
    category: 'system',
    userMessage: 'eBay services are temporarily unavailable.',
    isRetryable: true,
    retryAfter: 30
  },
  502: {
    category: 'system',
    userMessage: 'eBay services are experiencing issues.',
    isRetryable: true,
    retryAfter: 60
  },
  503: {
    category: 'system',
    userMessage: 'eBay services are temporarily down for maintenance.',
    isRetryable: true,
    retryAfter: 300
  }
};

export function parseEbayError(error: any): ParsedEbayError {
  // Handle HTTP status codes
  if (typeof error === 'number') {
    const httpError = EBAY_ERROR_CODES[error];
    if (httpError) {
      return {
        technicalMessage: `HTTP ${error}`,
        ...httpError
      } as ParsedEbayError;
    }
  }

  // Handle eBay API error response
  if (error && typeof error === 'object') {
    try {
      let ebayResponse: EbayErrorResponse;
      
      // Parse if it's a string
      if (typeof error === 'string') {
        ebayResponse = JSON.parse(error);
      } else {
        ebayResponse = error;
      }

      if (ebayResponse.errors && ebayResponse.errors.length > 0) {
        const firstError = ebayResponse.errors[0];
        const knownError = EBAY_ERROR_CODES[firstError.errorId];
        
        if (knownError) {
          return {
            technicalMessage: `${firstError.errorId}: ${firstError.message}`,
            ...knownError,
            // Override with specific parameter info if available
            userMessage: enhanceErrorMessage(knownError.userMessage || firstError.longMessage, firstError.parameters)
          } as ParsedEbayError;
        }

        // Handle unknown eBay errors
        return {
          userMessage: firstError.longMessage || firstError.message || 'An eBay error occurred',
          technicalMessage: `${firstError.errorId}: ${firstError.message}`,
          category: categorizeError(firstError),
          isRetryable: isErrorRetryable(firstError),
          retryAfter: getRetryDelay(firstError)
        };
      }
    } catch (parseError) {
      // Fall through to generic error handling
    }
  }

  // Handle generic errors
  const errorMessage = error?.message || String(error);
  return {
    userMessage: 'An unexpected error occurred while communicating with eBay',
    technicalMessage: errorMessage,
    category: 'unknown',
    isRetryable: false
  };
}

function enhanceErrorMessage(baseMessage: string, parameters?: Array<{name: string, value: string}>): string {
  if (!parameters || parameters.length === 0) {
    return baseMessage;
  }

  // Add specific parameter information
  const paramInfo = parameters.map(p => `${p.name}: ${p.value}`).join(', ');
  return `${baseMessage} (${paramInfo})`;
}

function categorizeError(error: EbayError): ParsedEbayError['category'] {
  const domain = error.domain?.toLowerCase() || '';
  const message = error.message?.toLowerCase() || '';
  
  if (domain.includes('access') || message.includes('auth') || message.includes('token')) {
    return 'authentication';
  }
  if (domain.includes('request') || message.includes('invalid') || message.includes('required')) {
    return 'validation';
  }
  if (message.includes('policy') || message.includes('payment') || message.includes('return')) {
    return 'policy';
  }
  if (message.includes('inventory') || message.includes('sku') || message.includes('offer')) {
    return 'business';
  }
  if (message.includes('rate') || message.includes('limit') || message.includes('quota')) {
    return 'system';
  }
  
  return 'unknown';
}

function isErrorRetryable(error: EbayError): boolean {
  const retryableDomains = ['SYSTEM', 'SERVICE'];
  const retryableMessages = ['temporarily', 'unavailable', 'timeout', 'rate limit'];
  
  if (retryableDomains.includes(error.domain)) {
    return true;
  }
  
  const message = error.message?.toLowerCase() || '';
  return retryableMessages.some(keyword => message.includes(keyword));
}

function getRetryDelay(error: EbayError): number | undefined {
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('rate limit')) {
    return 60; // 1 minute for rate limits
  }
  if (message.includes('temporarily')) {
    return 30; // 30 seconds for temporary issues
  }
  if (message.includes('maintenance')) {
    return 300; // 5 minutes for maintenance
  }
  
  return undefined;
}

// Retry logic utilities
export class EbayRetryManager {
  private maxRetries: number;
  private baseDelay: number;
  
  constructor(maxRetries = 3, baseDelay = 1000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
  }
  
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string = 'eBay API call'
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const parsedError = parseEbayError(error);
        
        console.log(`[EBAY-RETRY] ${context} attempt ${attempt}/${this.maxRetries} failed:`, {
          category: parsedError.category,
          message: parsedError.technicalMessage,
          isRetryable: parsedError.isRetryable
        });
        
        // Don't retry if error is not retryable
        if (!parsedError.isRetryable) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === this.maxRetries) {
          break;
        }
        
        // Calculate delay (exponential backoff with jitter)
        const delay = parsedError.retryAfter 
          ? parsedError.retryAfter * 1000 
          : this.calculateDelay(attempt);
          
        console.log(`[EBAY-RETRY] Waiting ${delay}ms before retry...`);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }
  
  private calculateDelay(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Pre-validation utilities
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateListingForEbay(listing: any, userProfile: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields validation
  if (!listing.title || listing.title.length < 10) {
    errors.push('Title must be at least 10 characters long');
  }
  if (listing.title && listing.title.length > 80) {
    errors.push('Title cannot exceed 80 characters');
  }
  
  if (!listing.price || listing.price <= 0) {
    errors.push('Price must be greater than $0');
  }
  
  if (!listing.condition) {
    errors.push('Item condition is required');
  }
  
  if (!listing.category) {
    errors.push('Category is required');
  }
  
  if (!listing.photos || listing.photos.length === 0) {
    errors.push('At least one photo is required');
  }
  
  // User profile validation
  if (!userProfile?.shipping_address_line1 || !userProfile?.shipping_city || 
      !userProfile?.shipping_state || !userProfile?.shipping_postal_code) {
    errors.push('Complete business address is required');
  }
  
  if (!userProfile?.business_phone) {
    errors.push('Business phone number is required');
  }
  
  if (!userProfile?.ebay_payment_policy_id || !userProfile?.ebay_return_policy_id || 
      !userProfile?.ebay_fulfillment_policy_id) {
    errors.push('eBay business policies must be created first');
  }
  
  // Warnings
  if (!listing.description || listing.description.length < 50) {
    warnings.push('Consider adding a more detailed description');
  }
  
  if (!listing.brand) {
    warnings.push('Adding a brand will improve discoverability');
  }
  
  if (listing.photos && listing.photos.length < 3) {
    warnings.push('Adding more photos can increase buyer confidence');
  }
  
  if (!listing.measurements?.weight) {
    warnings.push('Adding weight will improve shipping calculations');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}