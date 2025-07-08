// eBay Shipping Services - Centralized shipping service mapping and validation
export interface ShippingServiceConfig {
  serviceCode: string;
  displayName: string;
  estimatedDays: { min: number; max: number };
  isValid: boolean;
}

export interface ShippingOption {
  optionType: "DOMESTIC" | "INTERNATIONAL";
  costType: "FLAT_RATE" | "CALCULATED";
  shippingServices: Array<{
    serviceCode: string; // FIXED: Align with eBay Inventory API property name
    shippingCost: {
      value: string;
      currency: "USD";
    };
    additionalShippingCost?: {
      value: string;
      currency: "USD";
    };
  }>;
}

export interface FulfillmentDetails {
  handlingTime: {
    value: number;
    unit: "DAY" | "BUSINESS_DAY";
  };
  shippingOptions: ShippingOption[];
  shipToLocations?: {
    regionIncluded: Array<{
      regionName: string;
      regionType: "COUNTRY" | "REGION";
    }>;
  };
}

// eBay Individual Seller Compatible Shipping Service Codes
// Simplified for inline fulfillment - these work for individual accounts without business policies
const VALIDATED_EBAY_SERVICES: Record<string, ShippingServiceConfig> = {
  // Primary individual seller compatible services
  'US_Postal': {
    serviceCode: 'US_Postal',
    displayName: 'USPS Standard',
    estimatedDays: { min: 3, max: 7 },
    isValid: true
  },
  'USPSMedia': {
    serviceCode: 'USPSMedia',
    displayName: 'USPS Media Mail',
    estimatedDays: { min: 2, max: 8 },
    isValid: true
  },
  'USPSPriorityFlatRateBox': {
    serviceCode: 'USPSPriorityFlatRateBox',
    displayName: 'USPS Priority Flat Rate Box',
    estimatedDays: { min: 1, max: 3 },
    isValid: true
  },
  'USPSExpressFlatRateBox': {
    serviceCode: 'USPSExpressFlatRateBox',
    displayName: 'USPS Express Flat Rate Box',
    estimatedDays: { min: 1, max: 2 },
    isValid: true
  },
  // Fallback options - most basic USPS services
  'USPSGround': {
    serviceCode: 'USPSGround',
    displayName: 'USPS Ground Advantage',
    estimatedDays: { min: 2, max: 5 },
    isValid: true
  },
  'Other': {
    serviceCode: 'Other',
    displayName: 'Standard Shipping',
    estimatedDays: { min: 3, max: 7 },
    isValid: true
  }
};

// User preference to individual seller compatible eBay service mapping
const PREFERENCE_TO_EBAY_SERVICE: Record<string, string> = {
  'usps_priority': 'US_Postal',
  'usps_first_class': 'US_Postal', 
  'usps_ground': 'USPSGround',
  'usps_media': 'USPSMedia',
  'standard': 'US_Postal',
  'expedited': 'USPSGround',
  'overnight': 'USPSExpressFlatRateBox',
  'express': 'USPSExpressFlatRateBox',
  'flat_rate': 'USPSPriorityFlatRateBox'
};

const DEFAULT_SERVICE = 'US_Postal'; // Most basic individual seller compatible service
const FALLBACK_SERVICE = 'Other'; // Ultimate fallback - generic "Other" service

export class EbayShippingServices {
  private static logStep(step: string, details?: any) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
    console.log(`[EBAY-SHIPPING-SERVICES] ${step}${detailsStr}`);
  }

  /**
   * Maps user shipping preference to valid eBay service code - PHASE 2A: Ultra-minimal approach
   */
  static mapUserPreferenceToEbayService(userPreference?: string): string {
    // 🔥 PHASE 2A: Start with absolute minimal approach - just use "Other" for everything
    const fallbackService = 'Other';
    
    this.logStep('🔥 PHASE 2A: Using ultra-minimal service mapping', {
      userPreference: userPreference || 'none',
      forcedService: fallbackService,
      reason: 'Testing minimal configuration to get ANY listing to sync'
    });

    return fallbackService;
  }

  /**
   * Validates if a service code is in our list of confirmed working services
   */
  static isValidService(serviceCode: string): boolean {
    return serviceCode in VALIDATED_EBAY_SERVICES;
  }

  /**
   * Gets service configuration details
   */
  static getServiceConfig(serviceCode: string): ShippingServiceConfig | null {
    return VALIDATED_EBAY_SERVICES[serviceCode] || null;
  }

  /**
   * Creates fulfillment details for individual eBay accounts
   */
  static createFulfillmentDetails(
    userProfile: any,
    options: {
      domesticCost?: number;
      handlingTimeDays?: number;
    } = {}
  ): FulfillmentDetails {
    const domesticCost = options.domesticCost || userProfile.shipping_cost_domestic || 9.95;
    const handlingTime = options.handlingTimeDays || userProfile.handling_time_days || 1;
    const preferredService = userProfile.preferred_shipping_service;

    // Get validated eBay service code
    const serviceCode = this.mapUserPreferenceToEbayService(preferredService);
    const serviceConfig = this.getServiceConfig(serviceCode);

    this.logStep('Creating fulfillment details', {
      preferredService,
      serviceCode,
      serviceConfig: serviceConfig?.displayName,
      domesticCost,
      handlingTime
    });

    // 🔥 PHASE 2A: Ultra-minimal fulfillment configuration
    const fulfillmentDetails: FulfillmentDetails = {
      handlingTime: {
        value: handlingTime,
        unit: "DAY"
      },
      shippingOptions: [{
        optionType: "DOMESTIC",
        costType: "FLAT_RATE",
        shippingServices: [{
          serviceCode: serviceCode, // Using "Other" service for maximum compatibility
          shippingCost: {
            value: domesticCost.toFixed(2),
            currency: "USD"
          }
          // 🔥 REMOVED: additionalShippingCost to test minimal config
        }]
      }]
      // 🔥 REMOVED: shipToLocations to test minimal config
    };

    this.logStep('✅ Fulfillment details created successfully', {
      serviceCode,
      cost: domesticCost.toFixed(2),
      handlingTime,
      fulfillmentDetails: JSON.stringify(fulfillmentDetails, null, 2)
    });

    // 🔍 CRITICAL DEBUG - Shipping service mapping
    console.log('🔍 SHIPPING MODULE - Service mapping:', {
      userPreference: preferredService,
      mappedService: serviceCode,
      isValidService: this.isValidService(serviceCode),
      finalServiceCode: fulfillmentDetails.shippingOptions[0]?.shippingServices[0]?.serviceCode,
      fullResult: JSON.stringify(fulfillmentDetails, null, 2)
    });

    // CRITICAL DEBUG: Log exact service code that will be sent to eBay
    this.logStep('🚨 CRITICAL - Service code that will be sent to eBay API', {
      exactServiceCode: serviceCode,
      isValidInOurList: this.isValidService(serviceCode),
      fromOfficialEbayDocs: serviceCode in VALIDATED_EBAY_SERVICES,
      userPreference: preferredService,
      mappingUsed: `${preferredService} → ${serviceCode}`
    });

    return fulfillmentDetails;
  }

  /**
   * Validates fulfillment details before sending to eBay
   */
  static validateFulfillmentDetails(fulfillmentDetails: FulfillmentDetails): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check handling time
    if (!fulfillmentDetails.handlingTime || fulfillmentDetails.handlingTime.value < 1) {
      errors.push('Handling time must be at least 1 day');
    }

    // Check shipping options
    if (!fulfillmentDetails.shippingOptions || fulfillmentDetails.shippingOptions.length === 0) {
      errors.push('At least one shipping option is required');
    }

    // Validate each shipping service
    fulfillmentDetails.shippingOptions.forEach((option, optionIndex) => {
      if (!option.shippingServices || option.shippingServices.length === 0) {
        errors.push(`Shipping option ${optionIndex + 1} must have at least one shipping service`);
        return;
      }

      option.shippingServices.forEach((service, serviceIndex) => {
        if (!service.serviceCode) {
          errors.push(`Shipping service ${serviceIndex + 1} in option ${optionIndex + 1} missing service code`);
        } else if (!this.isValidService(service.serviceCode)) {
          errors.push(`Invalid shipping service code: ${service.serviceCode}`);
        }

        if (!service.shippingCost || !service.shippingCost.value) {
          errors.push(`Shipping service ${serviceIndex + 1} in option ${optionIndex + 1} missing cost`);
        }
      });
    });

    const isValid = errors.length === 0;

    this.logStep('Fulfillment details validation', {
      isValid,
      errors,
      servicesUsed: fulfillmentDetails.shippingOptions.flatMap(opt => 
        opt.shippingServices.map(svc => svc.serviceCode)
      )
    });

    return { isValid, errors };
  }

  /**
   * Creates fulfillment details with fallback logic for failed service codes
   */
  static createFulfillmentDetailsWithFallback(
    userProfile: any,
    options: {
      domesticCost?: number;
      handlingTimeDays?: number;
      attemptedService?: string;
    } = {}
  ): FulfillmentDetails {
    const domesticCost = options.domesticCost || userProfile.shipping_cost_domestic || 9.95;
    const handlingTime = options.handlingTimeDays || userProfile.handling_time_days || 1;
    const preferredService = userProfile.preferred_shipping_service;
    
    // Define fallback service priority order
    const fallbackOrder = [
      'US_Postal',     // Most basic and widely accepted
      'USPSGround',    // USPS Ground Advantage
      'Other',         // Generic fallback
      'USPSMedia'      // Last resort for media items
    ];
    
    let serviceCode: string;
    
    // If we've already attempted a service and it failed, try the next in fallback order
    if (options.attemptedService) {
      this.logStep('Attempting fallback service selection', { 
        failedService: options.attemptedService,
        fallbackOrder 
      });
      
      const failedIndex = fallbackOrder.indexOf(options.attemptedService);
      const nextServiceIndex = failedIndex + 1;
      
      if (nextServiceIndex < fallbackOrder.length) {
        serviceCode = fallbackOrder[nextServiceIndex];
        this.logStep('Using next fallback service', { 
          selectedService: serviceCode,
          position: nextServiceIndex + 1,
          totalOptions: fallbackOrder.length
        });
      } else {
        serviceCode = 'Other'; // Ultimate fallback
        this.logStep('Using ultimate fallback service', { selectedService: serviceCode });
      }
    } else {
      // Normal service selection
      serviceCode = this.mapUserPreferenceToEbayService(preferredService);
    }
    
    const serviceConfig = this.getServiceConfig(serviceCode);
    
    this.logStep('Creating fulfillment details with fallback logic', {
      preferredService,
      selectedService: serviceCode,
      serviceConfig: serviceConfig?.displayName,
      domesticCost,
      handlingTime,
      isFallbackAttempt: !!options.attemptedService
    });

    const fulfillmentDetails: FulfillmentDetails = {
      handlingTime: {
        value: handlingTime,
        unit: "DAY"
      },
      shippingOptions: [{
        optionType: "DOMESTIC",
        costType: "FLAT_RATE",
        shippingServices: [{
          serviceCode: serviceCode,
          shippingCost: {
            value: domesticCost.toFixed(2),
            currency: "USD"
          },
          additionalShippingCost: {
            value: (userProfile.shipping_cost_additional || 2.00).toFixed(2),
            currency: "USD"
          }
        }]
      }],
      shipToLocations: {
        regionIncluded: [{
          regionName: "United States",
          regionType: "COUNTRY"
        }]
      }
    };

    this.logStep('✅ Fallback fulfillment details created', {
      serviceCode,
      cost: domesticCost.toFixed(2),
      handlingTime,
      isRetryAttempt: !!options.attemptedService
    });

    return fulfillmentDetails;
  }

  /**
   * Lists all available validated eBay services
   */
  static getAvailableServices(): ShippingServiceConfig[] {
    return Object.values(VALIDATED_EBAY_SERVICES);
  }
}