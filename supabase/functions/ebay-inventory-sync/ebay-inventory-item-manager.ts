// eBay Inventory Item Management - Handles inventory item creation and data mapping

export interface EbayInventoryItem {
  sku: string;
  product: {
    title: string;
    description: string;
    imageUrls: string[];
    brand?: string;
    aspects: Record<string, string[]>;
  };
  condition: string;
  availability: {
    shipToLocationAvailability: {
      quantity: number;
    };
  };
}

export class EbayInventoryItemManager {
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
    console.log(`[EBAY-INVENTORY-ITEM-MGR] ${step}${detailsStr}`);
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
   * Maps Hustly listing to eBay inventory item format
   */
  static mapListingToEbayInventory(listing: any, photos: any[]): EbayInventoryItem {
    let imageUrls: string[] = [];
    
    EbayInventoryItemManager.logStep('Image processing - input data', { 
      newPhotosCount: photos?.length || 0, 
      legacyPhotosCount: listing.photos?.length || 0,
      hasNewPhotos: !!photos?.length,
      hasLegacyPhotos: !!listing.photos?.length
    });
    
    // Handle new listing_photos format
    if (photos && photos.length > 0) {
      imageUrls = photos
        .sort((a, b) => a.photo_order - b.photo_order)
        .map(photo => `https://ekzaaptxfwixgmbrooqr.supabase.co/storage/v1/object/public/listing-photos/${photo.storage_path}`)
        .filter(url => url && url.includes('http'));
      
      EbayInventoryItemManager.logStep('Used new photos format', { count: imageUrls.length });
    }
    // Handle legacy photos format
    else if (listing.photos && listing.photos.length > 0) {
      EbayInventoryItemManager.logStep('Processing legacy photos', { 
        count: listing.photos.length,
        types: listing.photos.map((photo: string) => {
          if (photo.startsWith('http')) return 'URL';
          if (photo.startsWith('data:image')) return 'Base64';
          return 'Unknown';
        })
      });
      
      // For Base64 images, create placeholder URLs since eBay requires actual URLs
      imageUrls = listing.photos
        .filter((photo: string) => photo && photo.trim().length > 0)
        .map((photo: string, index: number) => {
          if (photo.startsWith('http')) {
            return photo;
          }
          // For Base64 images, use placeholder service
          if (photo.startsWith('data:image')) {
            return `https://via.placeholder.com/400x400/CCCCCC/666666?text=Item+Photo+${index + 1}`;
          }
          return null;
        })
        .filter((url: string | null) => url !== null);
        
      EbayInventoryItemManager.logStep('Processed legacy photos', { resultCount: imageUrls.length });
    }

    EbayInventoryItemManager.logStep('Final image processing result', { 
      finalImageUrls: imageUrls.length,
      imageUrls: imageUrls.slice(0, 2) // Log first 2 URLs for debugging
    });

    // Ensure we have at least one image URL
    if (imageUrls.length === 0) {
      EbayInventoryItemManager.logStep('No images found - adding placeholder');
      imageUrls = ['https://via.placeholder.com/400x400/CCCCCC/666666?text=No+Image'];
    }

    return {
      sku: listing.id,
      product: {
        title: listing.title || 'Untitled Item',
        description: listing.description || 'No description provided',
        imageUrls: imageUrls.slice(0, 12), // eBay allows max 12 images
        brand: listing.brand || undefined,
        aspects: this.buildItemAspects(listing)
      },
      condition: this.mapConditionToEbay(listing.condition),
      availability: {
        shipToLocationAvailability: {
          quantity: 1
        }
      }
    };
  }

  /**
   * Builds eBay item aspects from listing data
   */
  private static buildItemAspects(listing: any): Record<string, string[]> {
    const aspects: Record<string, string[]> = {};
    
    if (listing.color_primary) aspects["Color"] = [listing.color_primary];
    if (listing.size_value) aspects["Size"] = [listing.size_value];
    if (listing.material) aspects["Material"] = [listing.material];
    if (listing.brand) aspects["Brand"] = [listing.brand];
    if (listing.gender) aspects["Department"] = [listing.gender];
    if (listing.pattern) aspects["Pattern"] = [listing.pattern];
    
    return aspects;
  }

  /**
   * Maps Hustly condition to eBay condition format
   */
  private static mapConditionToEbay(hustlyCondition: string): string {
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

  /**
   * Creates inventory item on eBay
   */
  async createInventoryItem(token: string, sku: string, itemData: EbayInventoryItem): Promise<void> {
    EbayInventoryItemManager.logStep('Creating inventory item', { sku, title: itemData.product.title });

    const requestHeaders = this.ebayHeaders(token);
    
    EbayInventoryItemManager.logStep('Request headers for inventory item', { 
      headers: Object.fromEntries(requestHeaders.entries()),
      url: `${this.baseUrl}/sell/inventory/v1/inventory_item/${sku}`
    });

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
      EbayInventoryItemManager.logStep('Inventory item creation failed', { error: errorDetails, status: response.status });
      throw new Error(`Failed to create inventory item: ${JSON.stringify(errorDetails)}`);
    }

    EbayInventoryItemManager.logStep('✅ Inventory item created successfully', { sku });
  }

  /**
   * Gets inventory item from eBay
   */
  async getInventoryItem(token: string, sku: string): Promise<any> {
    const requestHeaders = this.ebayHeaders(token);
    
    const response = await fetch(`${this.baseUrl}/sell/inventory/v1/inventory_item/${sku}`, {
      method: 'GET',
      headers: requestHeaders
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Item doesn't exist
      }
      throw new Error(`Failed to get inventory item: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Deletes inventory item from eBay
   */
  async deleteInventoryItem(token: string, sku: string): Promise<void> {
    EbayInventoryItemManager.logStep('Deleting inventory item', { sku });

    const requestHeaders = this.ebayHeaders(token);
    
    const response = await fetch(`${this.baseUrl}/sell/inventory/v1/inventory_item/${sku}`, {
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
      EbayInventoryItemManager.logStep('Inventory item deletion failed', { error: errorDetails, status: response.status });
      throw new Error(`Failed to delete inventory item: ${JSON.stringify(errorDetails)}`);
    }

    EbayInventoryItemManager.logStep('✅ Inventory item deleted successfully', { sku });
  }
}