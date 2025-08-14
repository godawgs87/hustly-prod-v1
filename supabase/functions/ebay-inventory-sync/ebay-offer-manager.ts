import { EbayShippingServices, FulfillmentDetails } from './ebay-shipping-services.ts';

export interface EbayOfferData {
  sku: string;
  marketplaceId: string;
  format: string;
  availableQuantity: number;
  categoryId: string;
  merchantLocationKey?: string;
  pricingSummary: {
    price: {
      value: string;
      currency: string;
    };
  };
  listingDescription?: string;
  fulfillmentDetails?: FulfillmentDetails;
  listingPolicies?: {
    paymentPolicyId: string;
    fulfillmentPolicyId: string;
    returnPolicyId: string;
  };
  paymentMethods?: {
    paymentMethodType: string;
    brands?: string[];
  }[];
  returnTerms?: {
    returnsAccepted: boolean;
    returnPeriod: {
      value: number;
      unit: string;
    };
    returnMethod: string;
    returnShippingCostPayer: string;
    restockingFeePercentage: string;
  };
}

export interface ExistingOffer {
  offerId: string;
  status: string;
  listing?: {
    listingId: string;
  };
  categoryId?: string;
}

export class EbayOfferManager {
  private baseUrl: string;
  private supabaseClient: any;
  private userId: string;

  constructor(baseUrl: string, supabaseClient: any, userId: string) {
    this.baseUrl = baseUrl;
    this.supabaseClient = supabaseClient;
    this.userId = userId;
  }

  private static logStep(step: string, details?: any) {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
    console.log(`[EBAY-OFFER-MANAGER] ${step}${detailsStr}`);
  }

  private ebayHeaders(token: string): Headers {
    const headers = new Headers();
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Language', 'en-US');
    headers.set('Accept-Language', 'en-US');
    return headers;
  }

  /**
   * Builds offer data for individual accounts WITHOUT listing policies
   * eBay will automatically apply the account's default policies
   */
  static async buildIndividualAccountOffer(
    listing: any,
    sku: string,
    userProfile: any,
    ebayLocationKey: string,
    userId: string,
    ebayPolicies?: { paymentPolicyId: string; returnPolicyId: string; fulfillmentPolicyId: string } | null
  ): Promise<EbayOfferData> {
    EbayOfferManager.logStep('🔍 Building individual account offer', {
      sku,
      title: listing.title,
      accountType: 'INDIVIDUAL',
      hasPolicies: !!ebayPolicies,
      note: ebayPolicies ? 'Using fetched eBay policies' : 'Using inline fulfillment details'
    });

    // Base offer data
    const offerData: EbayOfferData = {
      sku,
      marketplaceId: "EBAY_US",
      format: "FIXED_PRICE",
      availableQuantity: 1,
      categoryId: listing.ebay_category_id || "11450",
      merchantLocationKey: ebayLocationKey,
      pricingSummary: {
        price: {
          value: (listing.price || 10).toString(),
          currency: "USD"
        }
      },
      listingDescription: listing.description || 'Quality item in great condition.'
    };

    // Check if we have valid eBay policies (not null, not empty object)
    const hasValidPolicies = ebayPolicies && 
      ebayPolicies.paymentPolicyId && 
      ebayPolicies.returnPolicyId && 
      ebayPolicies.fulfillmentPolicyId;

    // If we have valid eBay policies, use them (should never happen for individual accounts)
    if (hasValidPolicies) {
      offerData.listingPolicies = {
        paymentPolicyId: ebayPolicies.paymentPolicyId,
        returnPolicyId: ebayPolicies.returnPolicyId,
        fulfillmentPolicyId: ebayPolicies.fulfillmentPolicyId
      };
      
      EbayOfferManager.logStep('⚠️ Unexpected: Individual account with business policies', {
        policies: offerData.listingPolicies
      });
    } else {
      // Fallback: Create fulfillment details for individual accounts
      EbayOfferManager.logStep('🚀 Entering inline details branch for individual account', {
        reason: 'No eBay policies provided, adding inline payment/return/fulfillment'
      });
      
      const { EbayShippingServices } = await import('./ebay-shipping-services.ts');
      const fulfillmentDetails = await EbayShippingServices.createFulfillmentDetails(
        userProfile,
        {
          domesticCost: listing.shipping_cost || 9.95,
          handlingTimeDays: listing.handling_time || 1,
          userId
        }
      );
      offerData.fulfillmentDetails = fulfillmentDetails;
      
      // Add inline payment methods (required for individual accounts)
      offerData.paymentMethods = [
        {
          paymentMethodType: "CREDIT_CARD",
          brands: ["VISA", "MASTERCARD", "AMERICAN_EXPRESS", "DISCOVER"]
        },
        {
          paymentMethodType: "PAYPAL"
        }
      ];
      
      EbayOfferManager.logStep('💳 Added payment methods', {
        count: offerData.paymentMethods.length,
        types: offerData.paymentMethods.map(pm => pm.paymentMethodType)
      });
      
      // Add inline return terms (required for individual accounts)
      offerData.returnTerms = {
        returnsAccepted: userProfile?.accepts_returns !== false, // Default to true if not specified
        returnPeriod: {
          value: userProfile?.return_period_days || 30,
          unit: "DAY"
        },
        returnMethod: "MONEY_BACK", // eBay individual accounts typically require MONEY_BACK
        returnShippingCostPayer: userProfile?.return_shipping_paid_by === 'seller' ? "SELLER" : "BUYER",
        restockingFeePercentage: userProfile?.restocking_fee_percentage || "0"
      };
      
      EbayOfferManager.logStep('↩️ Added return terms', {
        returnsAccepted: offerData.returnTerms.returnsAccepted,
        returnPeriod: `${offerData.returnTerms.returnPeriod.value} ${offerData.returnTerms.returnPeriod.unit}`,
        returnMethod: offerData.returnTerms.returnMethod,
        shippingPayer: offerData.returnTerms.returnShippingCostPayer
      });
      
      EbayOfferManager.logStep('✅ Added inline payment and return details for individual account', {
        paymentMethods: offerData.paymentMethods.length,
        returnsAccepted: offerData.returnTerms.returnsAccepted,
        returnPeriod: offerData.returnTerms.returnPeriod.value,
        fulfillmentAdded: !!offerData.fulfillmentDetails
      });
    }

    EbayOfferManager.logStep('✅ Individual account offer created', {
      sku,
      categoryId: offerData.categoryId,
      price: offerData.pricingSummary.price.value,
      hasPolicies: !!ebayPolicies,
      hasShipping: !!offerData.fulfillmentDetails,
      shippingService: offerData.fulfillmentDetails?.shippingOptions?.[0]?.shippingServices?.[0]?.serviceCode,
      note: ebayPolicies ? 'Using fetched eBay policies' : 'Using inline fulfillment details'
    });

    return offerData;
  }

  /**
   * Builds offer data for business accounts using listingPolicies
   */
  static buildBusinessAccountOffer(
    listing: any,
    sku: string,
    userProfile: any,
    ebayLocationKey: string
  ): EbayOfferData {
    EbayOfferManager.logStep('🔍 CRITICAL DEBUG - Business account using policies', {
      ebay_payment_policy_id: userProfile.ebay_payment_policy_id,
      ebay_fulfillment_policy_id: userProfile.ebay_fulfillment_policy_id,
      ebay_return_policy_id: userProfile.ebay_return_policy_id,
      preferred_shipping_service: userProfile.preferred_shipping_service
    });
    
    // Check if we have valid policy IDs
    const hasValidPolicies = userProfile.ebay_payment_policy_id && 
                            userProfile.ebay_fulfillment_policy_id && 
                            userProfile.ebay_return_policy_id;
    
    const offerData: EbayOfferData = {
      sku,
      marketplaceId: "EBAY_US",
      format: "FIXED_PRICE",
      availableQuantity: 1,
      categoryId: listing.ebay_category_id || "11450",
      merchantLocationKey: ebayLocationKey,
      pricingSummary: {
        price: {
          value: (listing.price || 10).toString(),
          currency: "USD"
        }
      },
      listingDescription: listing.description || 'Quality item in great condition.'
    };
    
    // If we have valid policy IDs, use them
    if (hasValidPolicies) {
      offerData.listingPolicies = {
        paymentPolicyId: userProfile.ebay_payment_policy_id,
        fulfillmentPolicyId: userProfile.ebay_fulfillment_policy_id,
        returnPolicyId: userProfile.ebay_return_policy_id
      };
    } else {
      // Otherwise, include inline fulfillment details (required for publish)
      const shippingService = EbayShippingServices.getServiceConfig(
        userProfile.preferred_shipping_service || 'usps_priority'
      ) || { serviceCode: 'USPSPriority', displayName: 'USPS Priority Mail', estimatedDays: { min: 1, max: 3 }, isValid: true };
      
      offerData.fulfillmentDetails = {
        handlingTime: {
          value: userProfile.handling_time_days || 1,
          unit: "DAY"
        },
        shippingOptions: [{
          optionType: "DOMESTIC",
          costType: "FLAT_RATE",
          shippingServices: [{
            serviceCode: shippingService.serviceCode,
            shippingCost: {
              value: (listing.shipping_cost || userProfile.shipping_cost_domestic || 10.45).toString(),
              currency: "USD"
            },
            additionalShippingCost: {
              value: (userProfile.shipping_cost_additional || 2.00).toString(),
              currency: "USD"
            }
          }]
        }]
      };
      
      EbayOfferManager.logStep('⚠️ No valid policy IDs, using inline fulfillment details', {
        serviceCode: shippingService.serviceCode,
        shippingCost: offerData.fulfillmentDetails.shippingOptions[0].shippingServices[0].shippingCost.value
      });
    }

    EbayOfferManager.logStep('✅ Business account offer created', {
      sku,
      categoryId: offerData.categoryId,
      price: offerData.pricingSummary.price.value,
      hasListingPolicies: !!offerData.listingPolicies,
      hasFulfillmentDetails: !!offerData.fulfillmentDetails,
      paymentPolicyId: userProfile.ebay_payment_policy_id,
      fulfillmentPolicyId: userProfile.ebay_fulfillment_policy_id,
      returnPolicyId: userProfile.ebay_return_policy_id
    });

    return offerData;
  }

  /**
   * Determines if user has individual account (no custom business policies)
   */
  static isIndividualAccount(userProfile: any): boolean {
    // Individual accounts are identified by:
    // 1. Null/undefined policy IDs
    // 2. Empty string policy IDs
    // 3. Policy IDs that are too short to be real eBay policy IDs (< 15 chars)
    
    const hasNullPolicies = !userProfile.ebay_payment_policy_id || 
                           !userProfile.ebay_fulfillment_policy_id || 
                           !userProfile.ebay_return_policy_id;
    
    // Check for invalid/placeholder policy IDs
    const hasInvalidPolicies = 
      (userProfile.ebay_payment_policy_id && userProfile.ebay_payment_policy_id.length < 15) ||
      (userProfile.ebay_fulfillment_policy_id && userProfile.ebay_fulfillment_policy_id.length < 15) ||
      (userProfile.ebay_return_policy_id && userProfile.ebay_return_policy_id.length < 15);
    
    // Check for known fake policy IDs (for backwards compatibility)
    const fakeIndividualPolicyIds = [
      'INDIVIDUAL_DEFAULT_PAYMENT',
      'INDIVIDUAL_DEFAULT_RETURN',
      'INDIVIDUAL_DEFAULT_FULFILLMENT',
      'DEFAULT_PAYMENT_POLICY',
      'DEFAULT_RETURN_POLICY',
      'DEFAULT_FULFILLMENT_POLICY'
    ];
    
    const hasFakePolicy = 
      fakeIndividualPolicyIds.includes(userProfile.ebay_payment_policy_id) ||
      fakeIndividualPolicyIds.includes(userProfile.ebay_return_policy_id) ||
      fakeIndividualPolicyIds.includes(userProfile.ebay_fulfillment_policy_id);
           
    const isIndividual = hasNullPolicies || hasInvalidPolicies || hasFakePolicy;
           
    EbayOfferManager.logStep('Account type check', {
      paymentPolicy: userProfile.ebay_payment_policy_id,
      returnPolicy: userProfile.ebay_return_policy_id,
      fulfillmentPolicy: userProfile.ebay_fulfillment_policy_id,
      hasNullPolicies,
      hasFakePolicy,
      isIndividual
    });
    
    return isIndividual;
  }

  /**
   * Creates the appropriate offer data based on account type
   */
  async createOfferData(
    listing: any,
    sku: string,
    userProfile: any,
    ebayLocationKey: string
  ): Promise<EbayOfferData> {
    EbayOfferManager.logStep('🔍 Creating offer data', {
      sku,
      accountType: userProfile.account_type,
      hasBusinessPolicies: userProfile.has_business_policies,
      paymentPolicyValue: userProfile.ebay_payment_policy_id,
      fulfillmentPolicyValue: userProfile.ebay_fulfillment_policy_id,
      returnPolicyValue: userProfile.ebay_return_policy_id,
      isIndividual: EbayOfferManager.isIndividualAccount(userProfile),
      codePath: 'ALWAYS_USE_POLICIES'
    });

    // CRITICAL: eBay Inventory API requires business policy IDs for ALL accounts
    // Individual accounts cannot use inline details - they must have policy IDs
    // The getUserBusinessPolicies method will create policies if needed
    return EbayOfferManager.buildBusinessAccountOffer(listing, sku, userProfile, ebayLocationKey);
  }

  /**
   * Gets existing offers for a SKU
   */
  async getExistingOffers(token: string, sku: string): Promise<ExistingOffer[]> {
    EbayOfferManager.logStep('Checking for existing offers', { sku });

    const requestHeaders = this.ebayHeaders(token);

    const response = await fetch(`${this.baseUrl}/sell/inventory/v1/offer?sku=${sku}`, {
      method: 'GET',
      headers: requestHeaders
    });

    if (!response.ok) {
      // Handle 404 gracefully - no offers exist for this SKU yet
      if (response.status === 404) {
        EbayOfferManager.logStep('No existing offers found (404)', { sku, status: response.status });
        return [];
      }
      
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = await response.text();
      }
      EbayOfferManager.logStep('Failed to check existing offers', { error: errorDetails, status: response.status });
      throw new Error(`Failed to check existing offers: ${JSON.stringify(errorDetails)}`);
    }

    const data = await response.json();
    const offers = data.offers || [];
    EbayOfferManager.logStep('Found existing offers', { 
      count: offers.length, 
      offers: offers.map((o: any) => ({ id: o.offerId, status: o.status })) 
    });
    return offers;
  }

  /**
   * Deletes an existing offer
   */
  async deleteOffer(token: string, offerId: string): Promise<void> {
    EbayOfferManager.logStep('🗑️ Deleting invalid offer', { offerId });

    const requestHeaders = this.ebayHeaders(token);

    const response = await fetch(`${this.baseUrl}/sell/inventory/v1/offer/${offerId}`, {
      method: 'DELETE',
      headers: requestHeaders
    });

    if (!response.ok && response.status !== 404) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = await response.text();
      }
      EbayOfferManager.logStep('Offer deletion failed', { error: errorDetails, status: response.status });
      throw new Error(`Failed to delete offer: ${JSON.stringify(errorDetails)}`);
    }

    EbayOfferManager.logStep('✅ Offer deleted successfully', { offerId });
  }

  /**
   * Creates a new offer
   */
  async createOffer(token: string, offerData: EbayOfferData): Promise<string> {
    EbayOfferManager.logStep('Creating offer', { 
      sku: offerData.sku, 
      price: offerData.pricingSummary.price.value 
    });
    
    // 🔍 CRITICAL DEBUG - Final offer data verification
    console.log('🔍 FINAL OFFER - Exact data being sent to eBay:', {
      hasFulfillmentDetails: !!offerData.fulfillmentDetails,
      hasListingPolicies: !!offerData.listingPolicies,
      serviceCode: offerData.fulfillmentDetails?.shippingOptions[0]?.shippingServices[0]?.serviceCode,
      policyIds: offerData.listingPolicies ? {
        payment: offerData.listingPolicies.paymentPolicyId,
        fulfillment: offerData.listingPolicies.fulfillmentPolicyId,
        return: offerData.listingPolicies.returnPolicyId
      } : 'NO_POLICIES',
      fullOfferData: JSON.stringify(offerData, null, 2)
    });

    EbayOfferManager.logStep('🚀 CRITICAL DEBUG - Full offer data being sent to eBay', { 
      offerData: JSON.stringify(offerData, null, 2),
      fulfillmentDetails: offerData.fulfillmentDetails ? JSON.stringify(offerData.fulfillmentDetails, null, 2) : 'No fulfillmentDetails',
      listingPolicies: offerData.listingPolicies ? JSON.stringify(offerData.listingPolicies, null, 2) : 'No listingPolicies'
    });

    const requestHeaders = this.ebayHeaders(token);

    const response = await fetch(`${this.baseUrl}/sell/inventory/v1/offer`, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(offerData)
    });

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = await response.text();
      }
      EbayOfferManager.logStep('🔥 OFFER CREATION FAILED - eBay Response', { 
        error: errorDetails, 
        status: response.status,
        offerDataSent: JSON.stringify(offerData, null, 2)
      });
      throw new Error(`Failed to create offer: ${JSON.stringify(errorDetails)}`);
    }

    const data = await response.json();
    EbayOfferManager.logStep('✅ Offer created successfully', { offerId: data.offerId });
    return data.offerId;
  }

  /**
   * Publishes an offer
   */
  async publishOffer(token: string, offerId: string): Promise<string> {
    EbayOfferManager.logStep('Publishing offer', { offerId });

    // First, let's verify the offer exists and get its details
    EbayOfferManager.logStep('🔍 DEBUG - Verifying offer before publish', { offerId });
    
    try {
      const verifyHeaders = new Headers();
      verifyHeaders.set('Authorization', `Bearer ${token}`);
      verifyHeaders.set('Accept-Language', 'en-US');
      verifyHeaders.set('Content-Type', 'application/json');
      
      const verifyResponse = await fetch(`${this.baseUrl}/sell/inventory/v1/offer/${offerId}`, {
        method: 'GET',
        headers: verifyHeaders
      });
      
      if (verifyResponse.ok) {
        const offerDetails = await verifyResponse.json();
        EbayOfferManager.logStep('📋 DEBUG - Offer details before publish', {
          offerId: offerDetails.offerId,
          sku: offerDetails.sku,
          status: offerDetails.status,
          merchantLocationKey: offerDetails.merchantLocationKey,
          hasListingPolicies: !!offerDetails.listingPolicies,
          listingPolicies: offerDetails.listingPolicies,
          hasFulfillmentPolicy: !!offerDetails.listingPolicies?.fulfillmentPolicyId,
          hasPaymentMethods: !!offerDetails.paymentMethods,
          hasReturnTerms: !!offerDetails.returnTerms,
          categoryId: offerDetails.categoryId
        });
      } else {
        EbayOfferManager.logStep('⚠️ DEBUG - Could not verify offer', { 
          status: verifyResponse.status,
          offerId 
        });
      }
    } catch (verifyError) {
      EbayOfferManager.logStep('⚠️ DEBUG - Error verifying offer', { 
        error: verifyError,
        offerId 
      });
    }

    // For publishOffer, we need special headers without Content-Type
    // since we're not sending a body
    const requestHeaders = new Headers();
    requestHeaders.set('Authorization', `Bearer ${token}`);
    requestHeaders.set('Accept-Language', 'en-US');
    // DO NOT set Content-Type for publishOffer - no body is sent

    EbayOfferManager.logStep('🚀 DEBUG - Publishing offer with headers', {
      offerId,
      url: `${this.baseUrl}/sell/inventory/v1/offer/${offerId}/publish`,
      headers: {
        'Authorization': 'Bearer [token]',
        'Accept-Language': 'en-US'
      }
    });

    // IMPORTANT: publishOffer API does NOT accept a request body
    // Sending any payload causes error 2004 "Invalid request"
    const response = await fetch(`${this.baseUrl}/sell/inventory/v1/offer/${offerId}/publish`, {
      method: 'POST',
      headers: requestHeaders
      // NO BODY - the API doesn't accept any payload
    });

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = await response.text();
      }
      
      // Enhanced error logging for debugging
      EbayOfferManager.logStep('❌ CRITICAL - Offer publishing failed with detailed error', { 
        offerId,
        status: response.status,
        errorDetails: errorDetails,
        errorCode: errorDetails?.errors?.[0]?.errorId,
        errorMessage: errorDetails?.errors?.[0]?.message,
        errorLongMessage: errorDetails?.errors?.[0]?.longMessage,
        errorParameters: errorDetails?.errors?.[0]?.parameters,
        fullError: JSON.stringify(errorDetails, null, 2)
      });
      
      throw new Error(`Failed to publish offer: ${JSON.stringify(errorDetails)}`);
    }

    const data = await response.json();
    EbayOfferManager.logStep('✅ Offer published successfully', { listingId: data.listingId });
    return data.listingId;
  }

  /**
   * Handles existing offers - deletes invalid UNPUBLISHED offers that would cause eBay error 25007
   */
  async handleExistingOffers(token: string, sku: string): Promise<{ offerId?: string; shouldCreateNew: boolean; alreadyPublished?: { listingId: string; offerId: string } }> {
    const existingOffers = await this.getExistingOffers(token, sku);
    
    if (existingOffers.length === 0) {
      EbayOfferManager.logStep('No existing offers found - will create new', { sku });
      return { shouldCreateNew: true };
    }

    const publishedOffer = existingOffers.find(offer => offer.status === 'PUBLISHED');
    if (publishedOffer) {
      EbayOfferManager.logStep('Found published offer - sync complete', { 
        offerId: publishedOffer.offerId, 
        listingId: publishedOffer.listing?.listingId 
      });
      return { 
        shouldCreateNew: false, 
        alreadyPublished: { 
          listingId: publishedOffer.listing?.listingId || publishedOffer.offerId,
          offerId: publishedOffer.offerId 
        }
      };
    }

    // Handle UNPUBLISHED offers - these likely have invalid shipping data causing error 25007
    const unpublishedOffers = existingOffers.filter(offer => offer.status === 'UNPUBLISHED');
    for (const offer of unpublishedOffers) {
      EbayOfferManager.logStep('⚠️ Found UNPUBLISHED offer - likely invalid shipping data, deleting', { 
        offerId: offer.offerId,
        status: offer.status 
      });
      
      try {
        await this.deleteOffer(token, offer.offerId);
        EbayOfferManager.logStep('✅ Deleted invalid UNPUBLISHED offer', { offerId: offer.offerId });
      } catch (deleteError) {
        EbayOfferManager.logStep('⚠️ Failed to delete offer, will try to create new anyway', { 
          offerId: offer.offerId, 
          error: deleteError.message 
        });
      }
    }

    EbayOfferManager.logStep('Cleaned up invalid offers - will create new', { sku, deletedCount: unpublishedOffers.length });
    return { shouldCreateNew: true };
  }
}
