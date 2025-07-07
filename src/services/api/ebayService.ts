import { supabase } from '@/integrations/supabase/client';

export class EbayService {
  private static async makeApiCall(action: string, params: any = {}) {
    const { data, error } = await supabase.functions.invoke('ebay-api-client', {
      body: { action, ...params }
    });

    if (error) {
      throw new Error(`eBay API Error: ${error.message}`);
    }

    return data;
  }

  private static async makeInventoryCall(action: string, params: any = {}) {
    const { data, error } = await supabase.functions.invoke('ebay-inventory-operations', {
      body: { action, ...params }
    });

    if (error) {
      throw new Error(`eBay Inventory Error: ${error.message}`);
    }

    return data;
  }

  static async testConnection() {
    return await this.makeApiCall('test_connection');
  }

  static async createInventoryItem(sku: string, listing: any, photos: any[]) {
    return await this.makeInventoryCall('create_inventory_item', { sku, listing, photos });
  }

  static async getExistingOffers(sku: string) {
    return await this.makeInventoryCall('get_existing_offers', { sku });
  }

  static async createOffer(offerData: any) {
    return await this.makeInventoryCall('create_offer', { offerData });
  }

  static async publishOffer(offerId: string) {
    return await this.makeInventoryCall('publish_offer', { offerId });
  }

  static async syncListing(listingId: string, options: { dryRun?: boolean } = {}) {
    const { data, error } = await supabase.functions.invoke('ebay-listing-sync', {
      body: { listingId, ...options }
    });

    if (error) {
      throw new Error(`eBay Sync Error: ${error.message}`);
    }

    return data;
  }
}