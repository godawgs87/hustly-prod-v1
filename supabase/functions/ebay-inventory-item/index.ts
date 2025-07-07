import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EBAY-INVENTORY-ITEM] ${step}${detailsStr}`);
};

// eBay Inventory Item Management - Focused on item creation and updates
class EbayInventoryItemManager {
  private accessToken: string = '';
  baseUrl: string;
  private supabaseClient: any;
  private userId: string;

  constructor(isSandbox: boolean = false, supabaseClient: any, userId: string) {
    this.baseUrl = isSandbox 
      ? 'https://api.sandbox.ebay.com'
      : 'https://api.ebay.com';
    this.supabaseClient = supabaseClient;
    this.userId = userId;
  }

  ebayHeaders(token: string): Headers {
    const headers = new Headers();
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Language', 'en-US');
    headers.set('Accept-Language', 'en-US');
    return headers;
  }

  async getAccessToken(): Promise<string> {
    const { data: account, error } = await this.supabaseClient
      .from('marketplace_accounts')
      .select('oauth_token')
      .eq('platform', 'ebay')
      .eq('user_id', this.userId)
      .eq('is_active', true)
      .single();

    if (error || !account) {
      throw new Error('No active eBay account found');
    }

    this.accessToken = account.oauth_token;
    return this.accessToken;
  }

  async createInventoryItem(sku: string, itemData: any): Promise<void> {
    if (!this.accessToken) await this.getAccessToken();

    logStep('Creating inventory item', { sku, title: itemData.product.title });

    const requestHeaders = this.ebayHeaders(this.accessToken);
    
    const response = await fetch(`${this.baseUrl}/sell/inventory/v1/inventory_item/${sku}`, {
      method: 'PUT',
      headers: requestHeaders,
      body: JSON.stringify(itemData)
    });

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = await response.text();
      }
      logStep('Inventory item creation failed', { error: errorDetails, status: response.status });
      throw new Error(`Failed to create inventory item: ${JSON.stringify(errorDetails)}`);
    }

    logStep('Inventory item created successfully', { sku });
  }

  async getInventoryItem(sku: string): Promise<any> {
    if (!this.accessToken) await this.getAccessToken();

    const requestHeaders = this.ebayHeaders(this.accessToken);
    
    const response = await fetch(`${this.baseUrl}/sell/inventory/v1/inventory_item/${sku}`, {
      method: 'GET',
      headers: requestHeaders
    });

    if (!response.ok) {
      throw new Error(`Failed to get inventory item: ${response.status}`);
    }

    return await response.json();
  }
}

// Helper function to map listing data to eBay inventory format
function mapListingToEbayInventory(listing: any, photos: any[]): any {
  let imageUrls: string[] = [];
  
  // Handle new listing_photos format
  if (photos && photos.length > 0) {
    imageUrls = photos
      .sort((a, b) => a.photo_order - b.photo_order)
      .map(photo => `https://ekzaaptxfwixgmbrooqr.supabase.co/storage/v1/object/public/listing-photos/${photo.storage_path}`)
      .filter(url => url && url.includes('http'));
  }
  // Handle legacy photos format
  else if (listing.photos && listing.photos.length > 0) {
    imageUrls = listing.photos
      .filter((photo: string) => photo && photo.startsWith('http'))
      .slice(0, 12);
  }

  // Ensure we have at least one image
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
    const { action, listingId, sku, itemData } = requestData;

    const inventoryManager = new EbayInventoryItemManager(false, supabaseClient, user.id);

    switch (action) {
      case 'create_from_listing':
        // Fetch listing data
        const { data: listing, error: listingError } = await supabaseClient
          .from('listings')
          .select(`*, listing_photos(*)`)
          .eq('id', listingId)
          .eq('user_id', user.id)
          .single();

        if (listingError || !listing) {
          throw new Error(`Listing not found: ${listingError?.message}`);
        }

        const inventoryItemData = mapListingToEbayInventory(listing, listing.listing_photos);
        await inventoryManager.createInventoryItem(listing.id, inventoryItemData);
        
        return new Response(JSON.stringify({
          status: 'success',
          sku: listing.id,
          message: 'Inventory item created successfully'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      case 'create_custom':
        await inventoryManager.createInventoryItem(sku, itemData);
        
        return new Response(JSON.stringify({
          status: 'success',
          sku: sku,
          message: 'Custom inventory item created successfully'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });

      case 'get_item':
        const item = await inventoryManager.getInventoryItem(sku);
        
        return new Response(JSON.stringify({
          status: 'success',
          item: item,
          message: 'Inventory item retrieved successfully'
        }), {
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
      status: 'failed',
      error: errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});