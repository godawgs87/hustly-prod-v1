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
    userId: string  // Note: userId parameter no longer needed but kept for compatibility
  ): Promise<EbayOfferData> {
    EbayOfferManager.logStep('🔍 Building individual account offer WITHOUT policies', {
      sku,
      title: listing.title,
      accountType: 'INDIVIDUAL',
      note: 'Omitting listingPolicies - eBay will apply account defaults'
    });

    // For individual accounts, we DON'T send listingPolicies at all
    // eBay will automatically apply the account's default policies
    // The fake "INDIVIDUAL_DEFAULT_*" IDs were causing error 25709
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
      // NO listingPolicies field - let eBay apply defaults!
    };

    EbayOfferManager.logStep('✅ Individual account offer created WITHOUT policies', {
      sku,
      categoryId: offerData.categoryId,
      price: offerData.pricingSummary.price.value,
      note: 'eBay will apply account default policies automatically'
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
      listingDescription: listing.description || 'Quality item in great condition.',
      listingPolicies: {
        paymentPolicyId: userProfile.ebay_payment_policy_id,
        fulfillmentPolicyId: userProfile.ebay_fulfillment_policy_id,
        returnPolicyId: userProfile.ebay_return_policy_id
      }
    };

    EbayOfferManager.logStep('✅ Business account offer created', {
      sku,
      categoryId: offerData.categoryId,
      price: offerData.pricingSummary.price.value,
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
    // 🔍 CRITICAL DEBUG - Account type detection
    console.log('🔍 CRITICAL DEBUG - Account type detection:', {
      hasPaymentPolicy: !!userProfile.ebay_payment_policy_id,
      hasFulfillmentPolicy: !!userProfile.ebay_fulfillment_policy_id,
      hasReturnPolicy: !!userProfile.ebay_return_policy_id,
      paymentPolicyValue: userProfile.ebay_payment_policy_id,
      fulfillmentPolicyValue: userProfile.ebay_fulfillment_policy_id,
      returnPolicyValue: userProfile.ebay_return_policy_id,
      isIndividual: EbayOfferManager.isIndividualAccount(userProfile),
      codePath: EbayOfferManager.isIndividualAccount(userProfile) ? 'INDIVIDUAL_ACCOUNT' : 'BUSINESS_ACCOUNT'
    });

    if (EbayOfferManager.isIndividualAccount(userProfile)) {
      return await EbayOfferManager.buildIndividualAccountOffer(listing, sku, userProfile, ebayLocationKey, this.userId);
    } else {
      return EbayOfferManager.buildBusinessAccountOffer(listing, sku, userProfile, ebayLocationKey);
    }
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

    const requestHeaders = this.ebayHeaders(token);

    const response = await fetch(`${this.baseUrl}/sell/inventory/v1/offer/${offerId}/publish`, {
      method: 'POST',
      headers: requestHeaders
    });

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = await response.text();
      }
      EbayOfferManager.logStep('Offer publishing failed', { error: errorDetails, status: response.status });
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
