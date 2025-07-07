import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EBAY-INVENTORY-OPS] ${step}${detailsStr}`);
};

// eBay Inventory Operations Service
class EbayInventoryService {
  private supabaseClient: any;
  private userId: string;
  private ebayClient: any;

  constructor(supabaseClient: any, userId: string) {
    this.supabaseClient = supabaseClient;
    this.userId = userId;
  }

  async createInventoryItem(sku: string, itemData: any): Promise<void> {
    logStep('Creating inventory item', { sku, title: itemData.product.title });

    const response = await this.supabaseClient.functions.invoke('ebay-api-client', {
      body: {
        action: 'make_request',
        endpoint: `/sell/inventory/v1/inventory_item/${sku}`,
        options: {
          method: 'PUT',
          body: JSON.stringify(itemData)
        }
      }
    });

    if (response.error) {
      throw new Error(`Failed to create inventory item: ${response.error.message}`);
    }

    logStep('Inventory item created successfully', { sku });
  }

  async getExistingOffers(sku: string): Promise<any[]> {
    logStep('Checking for existing offers', { sku });

    const response = await this.supabaseClient.functions.invoke('ebay-api-client', {
      body: {
        action: 'make_request',
        endpoint: `/sell/inventory/v1/offer?sku=${sku}`,
        options: { method: 'GET' }
      }
    });

    if (response.error) {
      throw new Error(`Failed to check existing offers: ${response.error.message}`);
    }

    const offers = response.data.data.offers || [];
    logStep('Found existing offers', { count: offers.length });
    return offers;
  }

  async createOffer(offerData: any): Promise<string> {
    logStep('Creating offer', { sku: offerData.sku, price: offerData.pricingSummary.price.value });
    logStep('Full offer data', { offerData: JSON.stringify(offerData, null, 2) });

    const response = await this.supabaseClient.functions.invoke('ebay-api-client', {
      body: {
        action: 'make_request',
        endpoint: '/sell/inventory/v1/offer',
        options: {
          method: 'POST',
          body: JSON.stringify(offerData)
        }
      }
    });

    if (response.error) {
      throw new Error(`Failed to create offer: ${response.error.message}`);
    }

    const offerId = response.data.data.offerId;
    logStep('Offer created successfully', { offerId });
    return offerId;
  }

  async publishOffer(offerId: string): Promise<string> {
    logStep('Publishing offer', { offerId });

    const response = await this.supabaseClient.functions.invoke('ebay-api-client', {
      body: {
        action: 'make_request',
        endpoint: `/sell/inventory/v1/offer/${offerId}/publish`,
        options: { method: 'POST' }
      }
    });

    if (response.error) {
      throw new Error(`Failed to publish offer: ${response.error.message}`);
    }

    const listingId = response.data.data.listingId;
    logStep('Offer published successfully', { listingId });
    return listingId;
  }
}

// Data mapping utilities
function mapListingToEbayInventory(listing: any, photos: any[]): any {
  let imageUrls: string[] = [];
  
  if (photos && photos.length > 0) {
    imageUrls = photos
      .sort((a, b) => a.photo_order - b.photo_order)
      .map(photo => `https://ekzaaptxfwixgmbrooqr.supabase.co/storage/v1/object/public/listing-photos/${photo.storage_path}`)
      .filter(url => url && url.includes('http'));
  } else if (listing.photos && listing.photos.length > 0) {
    imageUrls = listing.photos
      .filter((photo: string) => photo && photo.trim().length > 0)
      .map((photo: string, index: number) => {
        if (photo.startsWith('http')) return photo;
        if (photo.startsWith('data:image')) {
          return `https://via.placeholder.com/400x400/CCCCCC/666666?text=Item+Photo+${index + 1}`;
        }
        return null;
      })
      .filter((url: string | null) => url !== null);
  }

  if (imageUrls.length === 0) {
    imageUrls = ['https://via.placeholder.com/400x400/CCCCCC/666666?text=No+Image'];
  }

  return {
    sku: listing.id,
    product: {
      title: listing.title || 'Untitled Item',
      description: listing.description || 'No description provided',
      imageUrls: imageUrls.slice(0, 12),
      brand: listing.brand || undefined,
      aspects: buildItemAspects(listing)
    },
    condition: mapConditionToEbay(listing.condition),
    availability: {
      shipToLocationAvailability: {
        quantity: 1
      }
    }
  };
}

function buildItemAspects(listing: any): Record<string, string[]> {
  const aspects: Record<string, string[]> = {};
  
  if (listing.color_primary) aspects["Color"] = [listing.color_primary];
  if (listing.size_value) aspects["Size"] = [listing.size_value];
  if (listing.material) aspects["Material"] = [listing.material];
  if (listing.brand) aspects["Brand"] = [listing.brand];
  if (listing.gender) aspects["Department"] = [listing.gender];
  if (listing.pattern) aspects["Pattern"] = [listing.pattern];
  
  return aspects;
}

function mapConditionToEbay(hustlyCondition: string): string {
  const mapping: Record<string, string> = {
    'new_with_tags': 'NEW_WITH_TAGS',
    'new_without_tags': 'NEW_WITHOUT_TAGS', 
    'new': 'NEW_WITHOUT_TAGS',
    'excellent': 'USED_EXCELLENT',
    'very_good': 'USED_VERY_GOOD',
    'good': 'USED_GOOD',
    'fair': 'USED_ACCEPTABLE',
    'poor': 'FOR_PARTS_OR_NOT_WORKING'
  };
  return mapping[hustlyCondition] || 'USED_GOOD';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("eBay inventory operations started");

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
    const { action, ...params } = requestData;

    const inventoryService = new EbayInventoryService(supabaseClient, user.id);

    switch (action) {
      case 'create_inventory_item':
        const inventoryData = mapListingToEbayInventory(params.listing, params.photos);
        await inventoryService.createInventoryItem(params.sku, inventoryData);
        return new Response(JSON.stringify({ status: 'success' }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      case 'get_existing_offers':
        const offers = await inventoryService.getExistingOffers(params.sku);
        return new Response(JSON.stringify({ status: 'success', offers }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      case 'create_offer':
        const offerId = await inventoryService.createOffer(params.offerData);
        return new Response(JSON.stringify({ status: 'success', offerId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      case 'publish_offer':
        const listingId = await inventoryService.publishOffer(params.offerId);
        return new Response(JSON.stringify({ status: 'success', listingId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      default:
        throw new Error(`Unknown action: ${action}`);
    }

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