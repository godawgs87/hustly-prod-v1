
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ListingData } from '@/types/CreateListing';

export const useListingSave = () => {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const saveListing = async (
    listingData: ListingData, 
    shippingCost: number, 
    status: string = 'active',
    existingListingId?: string
  ) => {
    setIsSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to save listings",
          variant: "destructive"
        });
        return { success: false, listingId: null };
      }

      console.log('💰 Saving enhanced listing with data:', {
        title: listingData.title,
        price: listingData.price,
        category: listingData.category,
        shipping_cost: shippingCost,
        status: status
      });

      // Ensure all required fields have valid values with better defaults
      const processedData = {
        title: listingData.title?.trim() || 'Untitled Listing',
        description: listingData.description?.trim() || 'Please add description for this item.',
        price: Number(listingData.price) || 0,
        category: listingData.category || 'Miscellaneous',
        condition: listingData.condition || 'Good',
        measurements: listingData.measurements || {},
        keywords: Array.isArray(listingData.keywords) ? listingData.keywords : [],
        photos: Array.isArray(listingData.photos) ? listingData.photos : [],
        purchase_price: listingData.purchase_price ? Number(listingData.purchase_price) : null,
        purchase_date: listingData.purchase_date || null,
        is_consignment: Boolean(listingData.is_consignment),
        consignment_percentage: listingData.consignment_percentage ? Number(listingData.consignment_percentage) : null,
        consignor_name: listingData.consignor_name?.trim() || null,
        consignor_contact: listingData.consignor_contact?.trim() || null,
        source_location: listingData.source_location?.trim() || null,
        source_type: listingData.source_type || null,
        price_research: listingData.priceResearch?.trim() || null,
        shipping_cost: typeof shippingCost === 'number' ? shippingCost : (shippingCost === 0 ? 0 : 9.95),
        status: status,
        user_id: user.id,
        clothing_size: listingData.clothing_size?.trim() || null,
        shoe_size: listingData.shoe_size?.trim() || null,
        gender: listingData.gender || null,
        age_group: listingData.age_group || null,
        // SKU fields - critical for preventing duplicate key errors
        sku: listingData.sku?.trim() || null,
        auto_generate_sku: listingData.auto_generate_sku ?? true,
        sku_prefix: listingData.sku_prefix?.trim() || 'SKU',
        // eBay category fields
        ebay_category_id: listingData.ebay_category_id?.trim() || null,
        ebay_category_path: listingData.ebay_category_path?.trim() || null
      };

      // Calculate financial metrics
      const costBasis = processedData.purchase_price || 0;
      let netProfit = null;
      let profitMargin = null;
      
      if (processedData.purchase_price && processedData.price) {
        netProfit = processedData.price - costBasis;
        profitMargin = costBasis > 0 ? (netProfit / costBasis) * 100 : 0;
      }

      const finalData = {
        ...processedData,
        cost_basis: costBasis,
        fees_paid: 0,
        net_profit: netProfit,
        profit_margin: profitMargin,
        listed_date: status === 'active' ? new Date().toISOString().split('T')[0] : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('💾 Enhanced data being saved:', finalData);

      let result;
      let listingId;

      if (existingListingId) {
        // Update existing listing
        result = await supabase
          .from('listings')
          .update(finalData)
          .eq('id', existingListingId)
          .eq('user_id', user.id)
          .select('id')
          .single();
        
        if (result.error) {
          console.error('❌ Update error:', result.error);
          throw result.error;
        }
        listingId = result.data.id;
      } else {
        // Insert new listing
        result = await supabase
          .from('listings')
          .insert([finalData])
          .select('id')
          .single();

        if (result.error) {
          console.error('❌ Insert error:', result.error);
          throw result.error;
        }
        listingId = result.data.id;
      }

      console.log('✅ Enhanced listing saved successfully:', listingId);

      if (status !== 'draft') {
        toast({
          title: "Success!",
          description: `Listing "${finalData.title}" ${existingListingId ? 'updated' : 'created'} successfully!`
        });
      }
      
      return { success: true, listingId };
    } catch (error: any) {
      console.error('❌ Save operation failed:', error);
      toast({
        title: "Error",
        description: `Failed to save listing: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
      return { success: false, listingId: null };
    } finally {
      setIsSaving(false);
    }
  };

  return { saveListing, isSaving };
};
