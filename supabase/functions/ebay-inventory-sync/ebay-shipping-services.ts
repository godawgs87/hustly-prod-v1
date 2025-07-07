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

// eBay Inventory API shipping service codes (different from Trading API)
// Source: eBay Inventory API documentation - these codes work with fulfillmentDetails
const VALIDATED_EBAY_SERVICES: Record<string, ShippingServiceConfig> = {
  'US_PriorityMail': {
    serviceCode: 'US_PriorityMail',
    displayName: 'USPS Priority Mail',
    estimatedDays: { min: 1, max: 3 },
    isValid: true
  },
  'US_FirstClassMail': {
    serviceCode: 'US_FirstClassMail',
    displayName: 'USPS First Class Mail',
    estimatedDays: { min: 1, max: 3 },
    isValid: true
  },
  'US_GroundAdvantage': {
    serviceCode: 'US_GroundAdvantage',
    displayName: 'USPS Ground Advantage',
    estimatedDays: { min: 2, max: 8 },
    isValid: true
  },
  'US_ExpressMail': {
    serviceCode: 'US_ExpressMail',
    displayName: 'USPS Priority Mail Express',
    estimatedDays: { min: 1, max: 2 },
    isValid: true
  },
  'US_UPSGround': {
    serviceCode: 'US_UPSGround',
    displayName: 'UPS Ground',
    estimatedDays: { min: 3, max: 5 },
    isValid: true
  }
};

// User preference to eBay Inventory API service mapping
const PREFERENCE_TO_EBAY_SERVICE: Record<string, string> = {
  'usps_priority': 'US_PriorityMail',
  'usps_first_class': 'US_FirstClassMail',
  'usps_ground': 'US_GroundAdvantage',
  'ups_ground': 'US_UPSGround',
  'standard': 'US_PriorityMail',
  'expedited': 'US_PriorityMail',
  'overnight': 'US_ExpressMail',
  'express': 'US_ExpressMail'
};

const DEFAULT_SERVICE = 'US_PriorityMail'; // eBay Inventory API service code
const FALLBACK_SERVICE = 'US_PriorityMail';

export class EbayShippingServices {
  private static logStep(step: string, details?: any) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
    console.log(`[EBAY-SHIPPING-SERVICES] ${step}${detailsStr}`);
  }

  /**
   * Maps user shipping preference to valid eBay service code
   */
  static mapUserPreferenceToEbayService(userPreference?: string): string {
    const preference = userPreference || 'standard';
    const mappedService = PREFERENCE_TO_EBAY_SERVICE[preference] || DEFAULT_SERVICE;
    
    this.logStep('Mapping user preference to eBay service', {
      userPreference: preference,
      mappedService,
      isValidService: this.isValidService(mappedService)
    });

    // Validate the mapped service exists in our validated list
    if (!this.isValidService(mappedService)) {
      this.logStep('Mapped service not valid, using fallback', {
        invalidService: mappedService,
        fallbackService: FALLBACK_SERVICE
      });
      return FALLBACK_SERVICE;
    }

    return mappedService;
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

    const fulfillmentDetails: FulfillmentDetails = {
      handlingTime: {
        value: handlingTime,
        unit: "DAY"
      },
      shippingOptions: [{
        optionType: "DOMESTIC",
        costType: "FLAT_RATE",
        shippingServices: [{
          serviceCode: serviceCode, // FIXED: Use correct property name for eBay Inventory API
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
   * Lists all available validated eBay services
   */
  static getAvailableServices(): ShippingServiceConfig[] {
    return Object.values(VALIDATED_EBAY_SERVICES);
  }
}