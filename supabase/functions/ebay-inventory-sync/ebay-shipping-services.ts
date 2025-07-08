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

// eBay Inventory API Compatible Shipping Service Codes
// These are specifically for the Inventory API (different from Trading API)
const VALIDATED_EBAY_SERVICES: Record<string, ShippingServiceConfig> = {
  // Most basic and widely accepted Inventory API service codes
  'Other': {
    serviceCode: 'Other',
    displayName: 'Standard Shipping',
    estimatedDays: { min: 3, max: 7 },
    isValid: true
  },
  'US_Postal': {
    serviceCode: 'US_Postal',
    displayName: 'USPS Standard',
    estimatedDays: { min: 3, max: 7 },
    isValid: true
  },
  'USPS_PRIORITY': {
    serviceCode: 'USPS_PRIORITY',
    displayName: 'USPS Priority Mail',
    estimatedDays: { min: 1, max: 3 },
    isValid: true
  },
  'USPS_FIRST_CLASS': {
    serviceCode: 'USPS_FIRST_CLASS',
    displayName: 'USPS First Class',
    estimatedDays: { min: 1, max: 3 },
    isValid: true
  },
  'USPS_MEDIA_MAIL': {
    serviceCode: 'USPS_MEDIA_MAIL',
    displayName: 'USPS Media Mail',
    estimatedDays: { min: 2, max: 8 },
    isValid: true
  }
};

// User preference to Inventory API compatible eBay service mapping
const PREFERENCE_TO_EBAY_SERVICE: Record<string, string> = {
  // Inventory API validated mappings
  'other': 'Other',                    // ✅ Most compatible fallback
  'usps_media': 'USPS_MEDIA_MAIL',     // ✅ Media mail
  'usps_priority_flat': 'USPS_PRIORITY', // ✅ Priority
  'usps_express_flat': 'USPS_PRIORITY',  // ✅ Map to Priority  
  'usps_ground': 'US_Postal',          // ✅ Map to basic USPS
  // Legacy mappings - all map to Inventory API services
  'usps_priority': 'USPS_PRIORITY',    // ✅ Direct mapping
  'usps_first_class': 'USPS_FIRST_CLASS', // ✅ Direct mapping
  'standard': 'Other',                 // ✅ Map to Other (most compatible)
  'expedited': 'USPS_PRIORITY',        // ✅ Map to Priority
  'overnight': 'USPS_PRIORITY',        // ✅ Map to Priority
  'express': 'USPS_PRIORITY',          // ✅ Map to Priority
  'flat_rate': 'USPS_PRIORITY',        // ✅ Map to Priority
  'ups_ground': 'Other',               // ✅ Map unsupported to Other
  'fedex_ground': 'Other'              // ✅ Map unsupported to Other
};

const DEFAULT_SERVICE = 'Other';       // Most basic and compatible service
const FALLBACK_SERVICE = 'US_Postal'; // USPS fallback

export class EbayShippingServices {
  private static logStep(step: string, details?: any) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
    console.log(`[EBAY-SHIPPING-SERVICES] ${step}${detailsStr}`);
  }

  /**
   * Fetches valid shipping services from eBay API
   */
  static async fetchValidServices(userId: string, forceRefresh = false): Promise<any[]> {
    try {
      this.logStep('Fetching valid services from eBay API', { userId, forceRefresh });
      
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.50.3');
      const supabase = createClient(
        // @ts-ignore - Deno env access
        Deno.env.get('SUPABASE_URL') ?? '',
        // @ts-ignore - Deno env access  
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const response = await supabase.functions.invoke('ebay-shipping-services-fetcher', {
        body: { userId, forceRefresh }
      });

      if (response.error) {
        throw new Error(`Failed to fetch services: ${response.error.message}`);
      }

      this.logStep('✅ Successfully fetched valid services', {
        serviceCount: response.data?.services?.length || 0,
        cached: response.data?.cached
      });

      return response.data?.services || [];
    } catch (error) {
      this.logStep('❌ Error fetching valid services, using fallbacks', { error: error.message });
      return [];
    }
  }

  /**
   * Maps user shipping preference to valid eBay service code with dynamic validation
   */
  static async mapUserPreferenceToEbayService(
    userPreference?: string, 
    userId?: string
  ): Promise<string> {
    let serviceCode = PREFERENCE_TO_EBAY_SERVICE[userPreference || 'standard'] || DEFAULT_SERVICE;
    
    // Try to get valid services from eBay if userId provided
    if (userId) {
      try {
        const validServices = await this.fetchValidServices(userId);
        
        if (validServices.length > 0) {
          // Find best matching service from eBay's valid list
          const preferredService = validServices.find(s => 
            s.service_code === serviceCode || 
            s.service_name.toLowerCase().includes(userPreference?.toLowerCase() || 'priority')
          );
          
          if (preferredService) {
            serviceCode = preferredService.service_code;
            this.logStep('✅ Using eBay-validated service', {
              userPreference,
              validatedService: serviceCode,
              serviceName: preferredService.service_name
            });
          } else {
            // Use first available domestic service
            const fallbackService = validServices.find(s => s.is_domestic);
            if (fallbackService) {
              serviceCode = fallbackService.service_code;
              this.logStep('🔄 Using eBay fallback service', {
                userPreference,
                fallbackService: serviceCode,
                serviceName: fallbackService.service_name
              });
            }
          }
        }
      } catch (error) {
        this.logStep('⚠️ Failed to validate with eBay, using hardcoded mapping', { error: error.message });
      }
    }
    
    this.logStep('Mapping user preference to eBay service', {
      userPreference: userPreference || 'none',
      mappedService: serviceCode,
      isValidService: this.isValidService(serviceCode)
    });

    return serviceCode;
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
  static async createFulfillmentDetails(
    userProfile: any,
    options: {
      domesticCost?: number;
      handlingTimeDays?: number;
      userId?: string;
    } = {}
  ): Promise<FulfillmentDetails> {
    const domesticCost = options.domesticCost || userProfile.shipping_cost_domestic || 9.95;
    const handlingTime = options.handlingTimeDays || userProfile.handling_time_days || 1;
    const preferredService = userProfile.preferred_shipping_service;

    // Get validated eBay service code (now async with eBay API validation)
    const serviceCode = await this.mapUserPreferenceToEbayService(preferredService, options.userId);
    const serviceConfig = this.getServiceConfig(serviceCode);

    this.logStep('Creating fulfillment details', {
      preferredService,
      serviceCode,
      serviceConfig: serviceConfig?.displayName,
      domesticCost,
      handlingTime
    });

    // Create shipping service with service code
    const shippingService: any = {
      serviceCode: serviceCode,
      shippingCost: {
        value: domesticCost.toFixed(2),
        currency: "USD"
      },
      additionalShippingCost: {
        value: (userProfile.shipping_cost_additional || 2.00).toFixed(2),
        currency: "USD"
      }
    };

    const fulfillmentDetails: FulfillmentDetails = {
      handlingTime: {
        value: handlingTime,
        unit: "DAY"
      },
      shippingOptions: [{
        optionType: "DOMESTIC",
        costType: "FLAT_RATE",
        shippingServices: [shippingService]
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