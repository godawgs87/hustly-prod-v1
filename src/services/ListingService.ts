import { supabase } from '@/integrations/supabase/client';
import type { Listing } from '@/types/Listing';

export class ListingService {
  static async updateListing(id: string, updates: Partial<Listing>): Promise<boolean> {
    try {
      console.log('🔄 ListingService.updateListing called:', { id, updates });
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ Auth error:', authError);
        throw new Error('Authentication required');
      }

      console.log('✅ User authenticated:', user.id);
      
      // Add updated_at timestamp to all updates
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      console.log('🔄 Final update data:', updateData);
      
      const { data, error } = await supabase
        .from('listings')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select();

      console.log('📥 Update response:', { data, error });

      if (error) {
        console.error('❌ Update error:', error);
        throw new Error(`Failed to update listing: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.error('❌ No data returned - listing may not exist or belong to user');
        throw new Error('Listing not found or you don\'t have permission to update it');
      }

      console.log('✅ Listing updated successfully:', data[0]);
      return true;
    } catch (error: any) {
      console.error('❌ ListingService.updateListing failed:', error);
      throw error;
    }
  }

  static async deleteListing(id: string): Promise<boolean> {
    try {
      console.log('🗑️ ListingService.deleteListing called:', id);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }

      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Delete error:', error);
        throw new Error(`Failed to delete listing: ${error.message}`);
      }

      console.log('✅ Listing deleted successfully');
      return true;
      
    } catch (error: any) {
      console.error('❌ ListingService.deleteListing failed:', error);
      throw error;
    }
  }

  static async duplicateListing(item: Listing): Promise<Listing> {
    try {
      console.log('📋 ListingService.duplicateListing called:', item.id);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }

      const { data, error } = await supabase
        .from('listings')
        .insert({
          title: `${item.title} (Copy)`,
          description: item.description,
          price: item.price,
          category: item.category,
          condition: item.condition,
          measurements: item.measurements,
          keywords: item.keywords,
          photos: item.photos,
          shipping_cost: item.shipping_cost,
          status: 'draft',
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Duplicate error:', error);
        throw new Error(`Failed to duplicate listing: ${error.message}`);
      }

      console.log('✅ Listing duplicated successfully');
      return data as Listing;
    } catch (error: any) {
      console.error('❌ ListingService.duplicateListing failed:', error);
      throw error;
    }
  }

  static async createListing(listingData: Partial<Listing> & { price: number }): Promise<Listing> {
    try {
      console.log('📝 ListingService.createListing called');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }

      const { data, error } = await supabase
        .from('listings')
        .insert({
          title: listingData.title || 'Untitled',
          price: listingData.price,
          user_id: user.id,
          status: listingData.status || 'draft',
          description: listingData.description,
          category: listingData.category,
          condition: listingData.condition,
          measurements: listingData.measurements,
          keywords: listingData.keywords,
          photos: listingData.photos,
          shipping_cost: listingData.shipping_cost
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Create error:', error);
        throw new Error(`Failed to create listing: ${error.message}`);
      }

      console.log('✅ Listing created successfully');
      return data as Listing;
    } catch (error: any) {
      console.error('❌ ListingService.createListing failed:', error);
      throw error;
    }
  }

  static async getListingById(id: string): Promise<Listing | null> {
    try {
      console.log('🔍 ListingService.getListingById called:', id);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }

      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('❌ Get listing error:', error);
        throw new Error(`Failed to get listing: ${error.message}`);
      }

      return data as Listing;
    } catch (error: any) {
      console.error('❌ ListingService.getListingById failed:', error);
      throw error;
    }
  }

  static async bulkUpdateListings(updates: Array<{ id: string; data: Partial<Listing> }>): Promise<void> {
    try {
      console.log('📊 ListingService.bulkUpdateListings called with', updates.length, 'updates');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }

      // Process updates in parallel
      const updatePromises = updates.map(update => 
        this.updateListing(update.id, update.data)
      );

      await Promise.all(updatePromises);
      console.log('✅ Bulk update completed successfully');
    } catch (error: any) {
      console.error('❌ ListingService.bulkUpdateListings failed:', error);
      throw error;
    }
  }

  static async bulkDeleteListings(ids: string[]): Promise<void> {
    try {
      console.log('🗑️ ListingService.bulkDeleteListings called with', ids.length, 'IDs');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }

      // Process deletions in parallel
      const deletePromises = ids.map(id => this.deleteListing(id));
      await Promise.all(deletePromises);
      
      console.log('✅ Bulk delete completed successfully');
    } catch (error: any) {
      console.error('❌ ListingService.bulkDeleteListings failed:', error);
      throw error;
    }
  }
}