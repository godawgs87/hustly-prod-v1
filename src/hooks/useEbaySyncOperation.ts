import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Listing } from '@/types/Listing';
import PlatformSetupNotifications from '@/components/notifications/PlatformSetupNotifications';

export const useEbaySyncOperation = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSetupNotification, setShowSetupNotification] = useState(false);
  const { toast } = useToast();

  const syncToEbay = async (listing: Listing) => {
    setIsSyncing(true);
    try {
      console.log('🔄 Starting eBay sync for listing:', listing.id, 'Title:', listing.title);

      // Check if eBay account is connected
      const { data: ebayAccount, error: accountError } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('platform', 'ebay')
        .eq('is_connected', true)
        .single();

      if (accountError || !ebayAccount) {
        console.error('❌ eBay account not connected:', accountError);
        setShowSetupNotification(true);
        return { success: false, error: 'eBay account not connected' };
      }

      console.log('✅ eBay account found:', ebayAccount.account_username);

      // Check user profile and determine account type
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('ebay_payment_policy_id, ebay_return_policy_id, ebay_fulfillment_policy_id')
        .single();

      if (profileError || !userProfile) {
        console.error('❌ Failed to fetch user profile:', profileError);
        toast({
          title: "Profile Error",
          description: "Unable to verify account settings",
          variant: "destructive"
        });
        return { success: false, error: 'Failed to fetch user profile' };
      }

      // Determine account type using same logic as eBay offer manager
      const isIndividualAccount = !userProfile.ebay_payment_policy_id || 
                                  !userProfile.ebay_fulfillment_policy_id || 
                                  !userProfile.ebay_return_policy_id ||
                                  ['INDIVIDUAL_DEFAULT_PAYMENT', 'INDIVIDUAL_DEFAULT_RETURN', 'INDIVIDUAL_DEFAULT_FULFILLMENT'].includes(userProfile.ebay_payment_policy_id) ||
                                  ['INDIVIDUAL_DEFAULT_PAYMENT', 'INDIVIDUAL_DEFAULT_RETURN', 'INDIVIDUAL_DEFAULT_FULFILLMENT'].includes(userProfile.ebay_return_policy_id) ||
                                  ['INDIVIDUAL_DEFAULT_PAYMENT', 'INDIVIDUAL_DEFAULT_RETURN', 'INDIVIDUAL_DEFAULT_FULFILLMENT'].includes(userProfile.ebay_fulfillment_policy_id);

      console.log('🔍 Account type detection:', {
        paymentPolicy: userProfile.ebay_payment_policy_id,
        fulfillmentPolicy: userProfile.ebay_fulfillment_policy_id,
        returnPolicy: userProfile.ebay_return_policy_id,
        isIndividualAccount,
        accountType: isIndividualAccount ? 'Individual' : 'Business'
      });

      // Only verify/create policies for business accounts
      if (!isIndividualAccount) {
        // Check if policies exist and are valid (not placeholders)
        const hasValidPolicies = !!(
          userProfile.ebay_payment_policy_id && 
          userProfile.ebay_return_policy_id && 
          userProfile.ebay_fulfillment_policy_id &&
          userProfile.ebay_payment_policy_id !== 'DEFAULT_PAYMENT_POLICY' &&
          userProfile.ebay_return_policy_id !== 'DEFAULT_RETURN_POLICY' &&
          userProfile.ebay_fulfillment_policy_id !== 'DEFAULT_FULFILLMENT_POLICY'
        );

        if (!hasValidPolicies) {
          console.log('🔧 Business account: eBay policies missing or invalid - automatically creating/fixing...');
          
          // Show progress feedback to user
          toast({
            title: "Setting up eBay policies...",
            description: "Configuring your eBay business account for seamless listing. This will take a moment.",
          });

          try {
            // Automatically create/fix eBay policies
          const { data: policyData, error: policyError } = await supabase.functions.invoke('ebay-policy-manager', {
            body: {}
          });

          if (policyError) throw policyError;
          if (policyData?.error) throw new Error(policyData.error);

          console.log('✅ eBay policies created/fixed automatically');
          
          // Show success message based on account type
          if (policyData?.isPersonalAccount) {
            toast({
              title: "eBay Account Ready! ✅",
              description: "Your personal eBay account is configured. Continuing with sync...",
            });
          } else {
            toast({
              title: "eBay Policies Created! 🎉",
              description: "Business policies are ready. Continuing with sync...",
            });
          }

          // Small delay to let policies propagate
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          } catch (policyError: any) {
          console.error('❌ Failed to create eBay policies automatically:', policyError);
          toast({
            title: "Policy Setup Failed",
            description: policyError.message || "Unable to configure eBay policies automatically. Please check your eBay connection.",
            variant: "destructive"
          });
          return { success: false, error: `Policy setup failed: ${policyError.message}` };
          }
        } else {
          console.log('✅ Business policies verified');
        }
      } else {
        console.log('✅ Individual account - using inline fulfillment');
      }

      // Validate listing data
      const validationErrors = [];
      if (!listing.title) validationErrors.push('title');
      if (!listing.price) validationErrors.push('price');
      if (!listing.description) validationErrors.push('description');
      if (!listing.condition) validationErrors.push('condition');
      if (!listing.ebay_category_id) validationErrors.push('eBay-specific category (required for eBay sync)');
      
      // Check for photos - Check BOTH storage locations for compatibility
      console.log('🔍 Checking photos for listing:', listing.id);
      console.log('📸 Photos in listing.photos field:', listing.photos?.length || 0);
      
      const { data: photosFromTable } = await supabase
        .from('listing_photos')
        .select('id')
        .eq('listing_id', listing.id)
        .limit(1);
      
      console.log('📸 Photos in listing_photos table:', photosFromTable?.length || 0);
      
      // Consider listing valid if it has photos in EITHER location
      const hasPhotosInField = listing.photos && listing.photos.length > 0;
      const hasPhotosInTable = photosFromTable && photosFromTable.length > 0;
      const hasPhotos = hasPhotosInField || hasPhotosInTable;
      
      if (!hasPhotos) {
        validationErrors.push('at least one photo');
        console.log('❌ No photos found in either location');
      } else {
        console.log('✅ Photos found:', hasPhotosInField ? 'in listing.photos field' : 'in listing_photos table');
      }

      if (validationErrors.length > 0) {
        const error = `Missing required fields: ${validationErrors.join(', ')}`;
        console.error('❌ Invalid listing data:', error);
        toast({
          title: "Invalid Listing",
          description: error,
          variant: "destructive"
        });
        return { success: false, error };
      }

      console.log('✅ Listing validation passed');

      // Call the proven eBay inventory sync service
      console.log('📤 Calling ebay-inventory-sync with listing:', listing.id);
      const { data, error } = await supabase.functions.invoke('ebay-inventory-sync', {
        body: {
          listingId: listing.id,
          dryRun: false
        }
      });

      console.log('📥 eBay inventory sync response:', { data, error, listingId: listing.id });

      if (error) {
        console.error('❌ eBay sync error:', error);
        toast({
          title: "Sync Failed",
          description: `Failed to sync to eBay: ${error.message}`,
          variant: "destructive"
        });
        return { success: false, error: error.message };
      }

      if (data?.status !== 'success') {
        const errorMsg = data?.error || 'Unknown error occurred';
        console.error('❌ eBay sync failed:', errorMsg);
        toast({
          title: "Sync Failed",
          description: `Failed to sync to eBay: ${errorMsg}`,
          variant: "destructive"
        });
        return { success: false, error: errorMsg };
      }

      console.log('✅ eBay sync successful:', data);
      toast({
        title: "Sync Successful",
        description: `Successfully synced "${listing.title}" to eBay`,
      });
      
      return { success: true, data };

    } catch (error: any) {
      console.error('❌ eBay sync exception:', error);
      const errorMsg = error.message || 'Unexpected error occurred';
      toast({
        title: "Sync Failed",
        description: `Failed to sync to eBay: ${errorMsg}`,
        variant: "destructive"
      });
      return { success: false, error: errorMsg };
    } finally {
      setIsSyncing(false);
    }
  };

  const bulkSyncToEbay = async (listings: Listing[]) => {
    setIsSyncing(true);
    
    try {
      console.log('🔄 Starting bulk eBay sync for', listings.length, 'listings');

      // Check eBay connection and policies before bulk sync
      const { data: ebayAccount, error: accountError } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('platform', 'ebay')
        .eq('is_connected', true)
        .single();

      if (accountError || !ebayAccount) {
        console.error('❌ eBay account not connected:', accountError);
        setShowSetupNotification(true);
        return { success: false, error: 'eBay account not connected' };
      }

      // Check user profile and determine account type
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('ebay_payment_policy_id, ebay_return_policy_id, ebay_fulfillment_policy_id')
        .single();

      if (profileError || !userProfile) {
        toast({
          title: "Profile Error",
          description: "Unable to verify account settings",
          variant: "destructive"
        });
        return { success: false, error: 'Failed to fetch user profile' };
      }

      // Determine account type using same logic as eBay offer manager
      const isIndividualAccount = !userProfile.ebay_payment_policy_id || 
                                  !userProfile.ebay_fulfillment_policy_id || 
                                  !userProfile.ebay_return_policy_id ||
                                  ['INDIVIDUAL_DEFAULT_PAYMENT', 'INDIVIDUAL_DEFAULT_RETURN', 'INDIVIDUAL_DEFAULT_FULFILLMENT'].includes(userProfile.ebay_payment_policy_id) ||
                                  ['INDIVIDUAL_DEFAULT_PAYMENT', 'INDIVIDUAL_DEFAULT_RETURN', 'INDIVIDUAL_DEFAULT_FULFILLMENT'].includes(userProfile.ebay_return_policy_id) ||
                                  ['INDIVIDUAL_DEFAULT_PAYMENT', 'INDIVIDUAL_DEFAULT_RETURN', 'INDIVIDUAL_DEFAULT_FULFILLMENT'].includes(userProfile.ebay_fulfillment_policy_id);

      console.log('🔍 Bulk sync account type detection:', {
        paymentPolicy: userProfile.ebay_payment_policy_id,
        fulfillmentPolicy: userProfile.ebay_fulfillment_policy_id,
        returnPolicy: userProfile.ebay_return_policy_id,
        isIndividualAccount,
        accountType: isIndividualAccount ? 'Individual' : 'Business'
      });

      // Only verify/create policies for business accounts
      if (!isIndividualAccount) {
        const hasValidPolicies = !!(
          userProfile.ebay_payment_policy_id && 
          userProfile.ebay_return_policy_id && 
          userProfile.ebay_fulfillment_policy_id &&
          userProfile.ebay_payment_policy_id !== 'DEFAULT_PAYMENT_POLICY' &&
          userProfile.ebay_return_policy_id !== 'DEFAULT_RETURN_POLICY' &&
          userProfile.ebay_fulfillment_policy_id !== 'DEFAULT_FULFILLMENT_POLICY'
        );

        if (!hasValidPolicies) {
          console.log('🔧 Bulk sync: Business account eBay policies missing or invalid - automatically creating/fixing...');
          
          toast({
            title: "Setting up eBay policies...",
            description: "Configuring your eBay business account for bulk sync. This will take a moment.",
          });

          try {
            const { data: policyData, error: policyError } = await supabase.functions.invoke('ebay-policy-manager', {
              body: {}
            });

            if (policyError) throw policyError;
            if (policyData?.error) throw new Error(policyData.error);

            console.log('✅ Bulk sync: eBay business policies ready');
            toast({
              title: "eBay Business Policies Created! 🎉",
              description: "Starting bulk sync now...",
            });

            await new Promise(resolve => setTimeout(resolve, 1000));
            
          } catch (policyError: any) {
            console.error('❌ Bulk sync policy setup failed:', policyError);
            toast({
              title: "Bulk Sync Failed",
              description: `Policy setup failed: ${policyError.message}`,
              variant: "destructive"
            });
            return { success: false, error: `Policy setup failed: ${policyError.message}` };
          }
        } else {
          console.log('✅ Bulk sync: Business policies verified');
        }
      } else {
        console.log('✅ Bulk sync: Individual account - using inline fulfillment');
      }
      
      // Implement bulk sync using individual ebay-inventory-sync calls
      console.log('🔄 Processing', listings.length, 'listings individually...');
      
      let successCount = 0;
      let failureCount = 0;
      const results = [];
      
      for (let i = 0; i < listings.length; i++) {
        const listing = listings[i];
        console.log(`📤 Processing listing ${i + 1}/${listings.length}: ${listing.title}`);
        
        try {
          const { data: syncResult, error: syncError } = await supabase.functions.invoke('ebay-inventory-sync', {
            body: {
              listingId: listing.id,
              dryRun: false
            }
          });

          if (syncError || syncResult?.status === 'error') {
            throw new Error(syncError?.message || syncResult?.error || 'Sync failed');
          }

          successCount++;
          results.push({
            listingId: listing.id,
            status: 'success',
            data: syncResult
          });
          
          console.log(`✅ Successfully synced: ${listing.title}`);
          
          // Add delay between requests to avoid rate limiting
          if (i < listings.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
        } catch (error: any) {
          failureCount++;
          results.push({
            listingId: listing.id,
            status: 'failed',
            error: error.message
          });
          console.error(`❌ Failed to sync: ${listing.title} - ${error.message}`);
        }
      }
      
      toast({
        title: "Bulk Sync Complete",
        description: `${successCount}/${listings.length} items synced successfully`,
        variant: successCount === listings.length ? "default" : "destructive"
      });
      
      return { 
        success: true, 
        results: results,
        successCount: successCount,
        failureCount: failureCount,
        batchId: `bulk_${Date.now()}`
      };
      
    } catch (error: any) {
      console.error('❌ Bulk sync exception:', error);
      toast({
        title: "Bulk Sync Failed",
        description: error.message || "An error occurred during bulk sync",
        variant: "destructive"
      });
      return { success: false, error: error.message };
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    syncToEbay,
    bulkSyncToEbay,
    isSyncing,
    showSetupNotification,
    setShowSetupNotification
  };
};