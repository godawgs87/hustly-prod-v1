import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EBAY-LISTING-SYNC] ${step}${detailsStr}`);
};

// Focused listing sync service
class EbayListingSyncService {
  private supabaseClient: any;
  private userId: string;

  constructor(supabaseClient: any, userId: string) {
    this.supabaseClient = supabaseClient;
    this.userId = userId;
  }

  async syncListing(listingId: string, dryRun: boolean = false) {
    logStep("Starting listing sync", { listingId, dryRun });

    // 1. Fetch listing with photos
    const listing = await this.fetchListingData(listingId);
    
    // 2. Fetch user profile
    const userProfile = await this.fetchUserProfile();
    
    // 3. Validate listing
    const validation = await this.validateListing(listing, userProfile);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // 4. Check if already synced
    const existingSync = await this.checkExistingSync(listingId);
    if (existingSync?.status === 'active') {
      return {
        status: 'already_synced',
        platform_listing_id: existingSync.platform_listing_id,
        platform_url: existingSync.platform_url
      };
    }

    if (dryRun) {
      return {
        status: 'dry_run_success',
        validation,
        simulatedData: {
          sku: listingId,
          title: listing.title,
          price: listing.price
        }
      };
    }

    // 5. Create inventory item
    await this.supabaseClient.functions.invoke('ebay-inventory-operations', {
      body: {
        action: 'create_inventory_item',
        sku: listingId,
        listing,
        photos: listing.listing_photos
      }
    });

    // 6. Handle offers
    const offerId = await this.handleOffers(listingId, listing, userProfile);
    
    // 7. Publish offer
    const ebayListingId = await this.publishOffer(offerId);
    
    // 8. Save sync record
    await this.saveSyncRecord(listingId, ebayListingId, offerId);

    return {
      status: 'success',
      platform_listing_id: ebayListingId,
      platform_url: `https://www.ebay.com/itm/${ebayListingId}`,
      offer_id: offerId
    };
  }

  private async fetchListingData(listingId: string) {
    const { data: listing, error } = await this.supabaseClient
      .from('listings')
      .select('*, listing_photos(*)')
      .eq('id', listingId)
      .eq('user_id', this.userId)
      .single();

    if (error || !listing) {
      throw new Error(`Listing not found: ${error?.message}`);
    }

    return listing;
  }

  private async fetchUserProfile() {
    const { data: profile, error } = await this.supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('id', this.userId)
      .single();

    if (error || !profile) {
      throw new Error(`User profile not found: ${error?.message}`);
    }

    return profile;
  }

  private async validateListing(listing: any, userProfile: any) {
    const errors: string[] = [];
    
    if (!listing.title || listing.title.length < 10) {
      errors.push('Title must be at least 10 characters');
    }
    if (!listing.price || listing.price <= 0) {
      errors.push('Price must be greater than $0');
    }
    if (!listing.condition) {
      errors.push('Condition is required');
    }
    
    const hasPhotos = (listing.listing_photos && listing.listing_photos.length > 0) ||
                      (listing.photos && listing.photos.length > 0);
    
    if (!hasPhotos) {
      errors.push('At least one photo is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async checkExistingSync(listingId: string) {
    const { data } = await this.supabaseClient
      .from('platform_listings')
      .select('*')
      .eq('listing_id', listingId)
      .eq('platform', 'ebay')
      .eq('user_id', this.userId)
      .maybeSingle();

    return data;
  }

  private async handleOffers(listingId: string, listing: any, userProfile: any) {
    // Check for existing offers
    const existingOffersResult = await this.supabaseClient.functions.invoke('ebay-inventory-operations', {
      body: { action: 'get_existing_offers', sku: listingId }
    });

    if (existingOffersResult.data?.offers?.length > 0) {
      const existingOffer = existingOffersResult.data.offers[0];
      logStep('Using existing offer', { offerId: existingOffer.offerId });
      return existingOffer.offerId;
    }

    // Create new offer
    const offerData = this.buildOfferData(listing, listingId, userProfile);
    const createResult = await this.supabaseClient.functions.invoke('ebay-inventory-operations', {
      body: { action: 'create_offer', offerData }
    });

    if (createResult.error) {
      throw new Error(`Failed to create offer: ${createResult.error.message}`);
    }

    return createResult.data.offerId;
  }

  private async publishOffer(offerId: string) {
    const result = await this.supabaseClient.functions.invoke('ebay-inventory-operations', {
      body: { action: 'publish_offer', offerId }
    });

    if (result.error) {
      throw new Error(`Failed to publish offer: ${result.error.message}`);
    }

    return result.data.listingId;
  }

  private async saveSyncRecord(listingId: string, ebayListingId: string, offerId: string) {
    await this.supabaseClient.from('platform_listings').upsert({
      listing_id: listingId,
      user_id: this.userId,
      platform: 'ebay',
      platform_listing_id: ebayListingId,
      platform_url: `https://www.ebay.com/itm/${ebayListingId}`,
      status: 'active',
      last_synced_at: new Date().toISOString(),
      platform_data: {
        offer_id: offerId,
        sku: listingId
      }
    });
  }

  private buildOfferData(listing: any, sku: string, userProfile: any) {
    return {
      sku,
      marketplaceId: "EBAY_US",
      format: "FIXED_PRICE",
      availableQuantity: 1,
      categoryId: listing.ebay_category_id || "11450",
      pricingSummary: {
        price: {
          value: listing.price.toString(),
          currency: "USD"
        }
      },
      listingDescription: listing.description || 'Quality item in great condition.',
      // Use eBay default policies for individual accounts
      listingPolicies: {
        paymentPolicyId: userProfile.ebay_payment_policy_id || 'EBAY_DEFAULT_PAYMENT',
        fulfillmentPolicyId: userProfile.ebay_fulfillment_policy_id || 'EBAY_DEFAULT_FULFILLMENT',
        returnPolicyId: userProfile.ebay_return_policy_id || 'EBAY_DEFAULT_RETURN'
      }
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    const requestData = await req.json();
    const { listingId, dryRun = false } = requestData;
    
    if (!listingId) throw new Error('Listing ID required');

    const syncService = new EbayListingSyncService(supabaseClient, user.id);
    const result = await syncService.syncListing(listingId, dryRun);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      status: 'error',
      error: errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});