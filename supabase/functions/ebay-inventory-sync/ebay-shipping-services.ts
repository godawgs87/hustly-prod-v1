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

// Dynamic service mapping - populated from eBay API
let VALIDATED_EBAY_SERVICES: Record<string, ShippingServiceConfig> = {};
let PREFERENCE_TO_EBAY_SERVICE: Record<string, string> = {};

// Fallback hardcoded services only used if eBay API fails - using validated service codes
const HARDCODED_FALLBACK_SERVICES: Record<string, ShippingServiceConfig> = {
  'USPSGround': {
    serviceCode: 'USPSGround',
    displayName: 'USPS Ground',
    estimatedDays: { min: 2, max: 8 },
    isValid: true
  },
  'USPSFirstClass': {
    serviceCode: 'USPSFirstClass',
    displayName: 'USPS First Class',
    estimatedDays: { min: 1, max: 5 },
    isValid: true
  },
  'USPSMedia': {
    serviceCode: 'USPSMedia',
    displayName: 'USPS Media Mail',
    estimatedDays: { min: 3, max: 8 },
    isValid: true
  },
  'USPSPriorityMailFlatRateBox': {
    serviceCode: 'USPSPriorityMailFlatRateBox',
    displayName: 'USPS Priority Mail Flat Rate Box',
    estimatedDays: { min: 1, max: 3 },
    isValid: true
  }
};

const DEFAULT_SERVICE = 'USPSGround';  // Most reliable validated service
const FALLBACK_SERVICE = 'USPSFirstClass';  // Secondary fallback option

export class EbayShippingServices {
  private static logStep(step: string, details?: any) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
    console.log(`[EBAY-SHIPPING-SERVICES] ${step}${detailsStr}`);
  }

  /**
   * Fetches valid shipping services from eBay API and populates internal cache
   */
  static async fetchValidServices(userId: string, forceRefresh = false): Promise<any[]> {
    try {
      this.logStep('🔍 CRITICAL DEBUG - Attempting to fetch valid services from eBay API', { userId, forceRefresh });
      
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.50.3');
      const supabase = createClient(
        // @ts-ignore - Deno env access
        Deno.env.get('SUPABASE_URL') ?? '',
        // @ts-ignore - Deno env access  
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      this.logStep('🚀 CRITICAL DEBUG - About to call ebay-shipping-services-fetcher', { userId, forceRefresh });

      const response = await supabase.functions.invoke('ebay-shipping-services-fetcher', {
        body: { userId, forceRefresh }
      });

      this.logStep('📡 CRITICAL DEBUG - Response from ebay-shipping-services-fetcher', { 
        response: JSON.stringify(response, null, 2),
        hasError: !!response.error,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : 'NO_DATA'
      });

      if (response.error) {
        this.logStep('❌ CRITICAL DEBUG - Error from shipping services fetcher', { 
          error: response.error,
          errorMessage: response.error.message 
        });
        throw new Error(`Failed to fetch services: ${response.error.message}`);
      }

      const services = response.data?.services || [];
      
      // Update internal cache with real eBay services
      if (services.length > 0) {
        this.logStep('🔄 Updating internal service cache with eBay data', { serviceCount: services.length });
        this.updateServiceCache(services);
      }

      this.logStep('✅ Successfully fetched and cached valid services', {
        serviceCount: services.length,
        cached: response.data?.cached,
        validatedServicesCount: Object.keys(VALIDATED_EBAY_SERVICES).length
      });

      return services;
    } catch (error) {
      this.logStep('❌ CRITICAL DEBUG - Exception in fetchValidServices', { 
        error: error.message,
        stack: error.stack,
        errorType: error.constructor.name 
      });
      return [];
    }
  }

  /**
   * Updates internal service cache with real eBay service data
   */
  private static updateServiceCache(services: any[]) {
    // Clear existing cache
    VALIDATED_EBAY_SERVICES = {};
    PREFERENCE_TO_EBAY_SERVICE = {};

    // Populate with real eBay services
    services.forEach(service => {
      if (service.service_code && service.service_name) {
        VALIDATED_EBAY_SERVICES[service.service_code] = {
          serviceCode: service.service_code,
          displayName: service.service_name,
          estimatedDays: { min: 1, max: 5 }, // Default estimate
          isValid: true
        };
      }
    });

    // Update preference mapping with real service codes
    const realServiceCodes = Object.keys(VALIDATED_EBAY_SERVICES);
    if (realServiceCodes.length > 0) {
      // Find best matches for common preferences
      const priorityService = this.findBestService(realServiceCodes, ['priority', 'express', 'expedited']);
      const groundService = this.findBestService(realServiceCodes, ['ground', 'standard', 'regular']);
      const firstClassService = this.findBestService(realServiceCodes, ['first', 'class', 'economy']);
      const mediaService = this.findBestService(realServiceCodes, ['media', 'book']);

      // Create preference mapping with validated services as fallback
      PREFERENCE_TO_EBAY_SERVICE = {
        'usps_priority': priorityService || 'USPSPriorityMailFlatRateBox',
        'usps_priority_flat': priorityService || 'USPSPriorityMailFlatRateBox',
        'usps_express_flat': priorityService || 'USPSPriorityMailFlatRateBox',
        'usps_ground': groundService || 'USPSGround',
        'usps_first_class': firstClassService || 'USPSFirstClass',
        'usps_media': mediaService || 'USPSMedia',
        'standard': groundService || 'USPSGround',
        'expedited': priorityService || 'USPSPriorityMailFlatRateBox',
        'overnight': priorityService || 'USPSPriorityMailFlatRateBox',
        'express': priorityService || 'USPSPriorityMailFlatRateBox',
        'flat_rate': priorityService || 'USPSPriorityMailFlatRateBox',
        'other': groundService || 'USPSGround'
      };
    }

    this.logStep('✅ Service cache updated', {
      validatedServicesCount: Object.keys(VALIDATED_EBAY_SERVICES).length,
      preferenceMappingCount: Object.keys(PREFERENCE_TO_EBAY_SERVICE).length,
      services: Object.keys(VALIDATED_EBAY_SERVICES)
    });
  }

  /**
   * Finds the best matching service code from available options
   */
  private static findBestService(availableServices: string[], keywords: string[]): string | null {
    for (const keyword of keywords) {
      const match = availableServices.find(service => 
        service.toLowerCase().includes(keyword.toLowerCase())
      );
      if (match) return match;
    }
    return null;
  }

  /**
   * Maps user shipping preference to valid eBay service code with dynamic validation
   */
  static async mapUserPreferenceToEbayService(
    userPreference?: string, 
    userId?: string
  ): Promise<string> {
    this.logStep('🔍 CRITICAL DEBUG - Starting service mapping', {
      userPreference,
      userId,
      hasUserId: !!userId,
      cachedServicesCount: Object.keys(VALIDATED_EBAY_SERVICES).length
    });

    // First ensure we have the latest service data
    if (userId) {
      this.logStep('🚀 CRITICAL DEBUG - About to fetch valid services from eBay', { userId });
      try {
        const validServices = await this.fetchValidServices(userId);
        
        this.logStep('📡 CRITICAL DEBUG - Received response from fetchValidServices', {
          serviceCount: validServices?.length || 0,
          cachedServicesAfterFetch: Object.keys(VALIDATED_EBAY_SERVICES).length,
          isArray: Array.isArray(validServices)
        });
      } catch (error) {
        this.logStep('❌ CRITICAL ERROR - Failed to fetch eBay services, using fallback', { 
          error: error.message,
          stack: error.stack,
          errorType: error.constructor.name 
        });
        // Use hardcoded fallback
        VALIDATED_EBAY_SERVICES = { ...HARDCODED_FALLBACK_SERVICES };
      }
    }

    // Now map using the updated cache
    let serviceCode = PREFERENCE_TO_EBAY_SERVICE[userPreference || 'standard'] || DEFAULT_SERVICE;
    
    // Validate the service code exists in our cache
    if (!VALIDATED_EBAY_SERVICES[serviceCode]) {
      this.logStep('⚠️ Selected service not in cache, using fallback', { 
        selectedService: serviceCode,
        availableServices: Object.keys(VALIDATED_EBAY_SERVICES)
      });
      
      // Find first available service
      const availableServices = Object.keys(VALIDATED_EBAY_SERVICES);
      if (availableServices.length > 0) {
        serviceCode = availableServices[0];
        this.logStep('✅ Using first available service', { serviceCode });
      } else {
        // Ultimate fallback to hardcoded
        serviceCode = DEFAULT_SERVICE;
        this.logStep('⚠️ No services available, using hardcoded default', { serviceCode });
      }
    }
    
    this.logStep('✅ Final service mapping result', {
      userPreference: userPreference || 'none',
      mappedService: serviceCode,
      isValidService: this.isValidService(serviceCode),
      serviceName: VALIDATED_EBAY_SERVICES[serviceCode]?.displayName || 'Unknown'
    });

    return serviceCode;
  }

  /**
   * Validates if a service code is in our list of confirmed working services
   */
  static isValidService(serviceCode: string): boolean {
    return serviceCode in VALIDATED_EBAY_SERVICES || serviceCode in HARDCODED_FALLBACK_SERVICES;
  }

  /**
   * Gets service configuration details
   */
  static getServiceConfig(serviceCode: string): ShippingServiceConfig | null {
    return VALIDATED_EBAY_SERVICES[serviceCode] || HARDCODED_FALLBACK_SERVICES[serviceCode] || null;
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
  static async createFulfillmentDetailsWithFallback(
    userProfile: any,
    options: {
      domesticCost?: number;
      handlingTimeDays?: number;
      attemptedService?: string;
      userId?: string;
    } = {}
  ): Promise<FulfillmentDetails> {
    const domesticCost = options.domesticCost || userProfile.shipping_cost_domestic || 9.95;
    const handlingTime = options.handlingTimeDays || userProfile.handling_time_days || 1;
    const preferredService = userProfile.preferred_shipping_service;
    
    let serviceCode: string;
    
    // If we've already attempted a service and it failed, try multiple fallback approaches
    if (options.attemptedService) {
      this.logStep('Attempting fallback service selection', { 
        failedService: options.attemptedService,
        userId: options.userId
      });
      
      // Try to get different service from eBay API
      if (options.userId) {
        try {
          const validServices = await this.fetchValidServices(options.userId);
          const alternativeService = validServices.find(s => 
            s.service_code !== options.attemptedService && s.is_domestic
          );
          
          if (alternativeService) {
            serviceCode = alternativeService.service_code;
            this.logStep('✅ Using alternative eBay service', { 
              selectedService: serviceCode,
              serviceName: alternativeService.service_name
            });
          } else {
            // Use hardcoded fallback
            serviceCode = Object.keys(HARDCODED_FALLBACK_SERVICES)[0];
            this.logStep('🔄 Using hardcoded fallback service', { selectedService: serviceCode });
          }
        } catch (error) {
          this.logStep('❌ Failed to fetch alternative service, using hardcoded fallback', { error: error.message });
          serviceCode = Object.keys(HARDCODED_FALLBACK_SERVICES)[0];
        }
      } else {
        // Use hardcoded fallback
        serviceCode = Object.keys(HARDCODED_FALLBACK_SERVICES)[0];
        this.logStep('🔄 Using hardcoded fallback service (no userId)', { selectedService: serviceCode });
      }
    } else {
      // Normal service selection with real-time eBay validation
      serviceCode = await this.mapUserPreferenceToEbayService(preferredService, options.userId);
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
    const services = Object.values(VALIDATED_EBAY_SERVICES);
    return services.length > 0 ? services : Object.values(HARDCODED_FALLBACK_SERVICES);
  }

  /**
   * Initializes the service system by fetching services from eBay
   */
  static async initialize(userId: string): Promise<void> {
    this.logStep('🚀 Initializing eBay shipping services', { userId });
    try {
      await this.fetchValidServices(userId, true); // Force refresh on init
      this.logStep('✅ eBay shipping services initialized', { 
        servicesCount: Object.keys(VALIDATED_EBAY_SERVICES).length 
      });
    } catch (error) {
      this.logStep('❌ Failed to initialize eBay services, using fallback', { error: error.message });
      VALIDATED_EBAY_SERVICES = { ...HARDCODED_FALLBACK_SERVICES };
    }
  }
}