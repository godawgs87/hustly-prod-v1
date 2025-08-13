import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EbayService } from '@/services/api/ebayService';
import { validateEbayPolicies, cleanupInvalidPolicies } from '@/utils/ebayPolicyValidator';
import type { Listing } from '@/types/Listing';

export const useEbaySyncOperation = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSetupNotification, setShowSetupNotification] = useState(false);
  const { toast } = useToast();

  const syncToEbay = async (listing: Listing) => {
    setIsSyncing(true);
    try {
      console.log('🔄 Starting eBay sync for listing:', listing.id, 'Title:', listing.title);

      // Check if eBay account is connected and token is valid
      const { data: ebayAccount, error: accountError } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('platform', 'ebay')
        .eq('is_connected', true)
        .eq('is_active', true)
        .single();

      // Additional token validation
      if (ebayAccount && ebayAccount.oauth_expires_at) {
        const expiryTime = new Date(ebayAccount.oauth_expires_at);
        const now = new Date();
        if (expiryTime <= now) {
          console.error('❌ eBay token expired:', { 
            expiresAt: ebayAccount.oauth_expires_at, 
            now: now.toISOString(),
            accountUsername: ebayAccount.account_username 
          });
          
          // Mark account as disconnected due to expired token
          await supabase
            .from('marketplace_accounts')
            .update({ is_connected: false, is_active: false })
            .eq('id', ebayAccount.id);
          
          toast({
            title: "eBay Token Expired",
            description: "Your eBay connection has expired. Please reconnect your account in Settings.",
            variant: "destructive"
          });
          
          setShowSetupNotification(true);
          return { success: false, error: 'eBay token expired - reconnection required' };
        }
      }

      if (accountError || !ebayAccount) {
        console.error('❌ eBay account not connected:', accountError);
        setShowSetupNotification(true);
        return { success: false, error: 'eBay account not connected' };
      }

      console.log('✅ eBay account found:', ebayAccount.account_username);

      // Get current user to filter profile query
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ Failed to get current user:', userError);
        toast({
          title: "Authentication Error",
          description: "Unable to verify user identity",
          variant: "destructive"
        });
        return { success: false, error: 'Authentication failed' };
      }

      // Check user profile and determine account type
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('ebay_payment_policy_id, ebay_return_policy_id, ebay_fulfillment_policy_id')
        .eq('id', user.id)
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

      // Validate eBay policies using the centralized validator
      const policyValidation = await validateEbayPolicies(user.id);
      
      // Clean up any invalid/fake policy IDs
      if (policyValidation.warnings.some(w => w.includes('placeholder'))) {
        await cleanupInvalidPolicies(user.id);
      }
      
      const isIndividualAccount = policyValidation.isIndividualAccount;

      console.log('🔍 Policy validation result:', {
        isValid: policyValidation.isValid,
        isIndividualAccount: policyValidation.isIndividualAccount,
        errors: policyValidation.errors,
        warnings: policyValidation.warnings,
        accountType: isIndividualAccount ? 'Individual' : 'Business',
        syncPath: isIndividualAccount ? 'INDIVIDUAL_INLINE_FULFILLMENT' : 'BUSINESS_POLICIES'
      });
      
      // Show any validation errors or warnings
      if (policyValidation.errors.length > 0) {
        policyValidation.errors.forEach(error => {
          console.error('Policy validation error:', error);
        });
      }
      if (policyValidation.warnings.length > 0) {
        policyValidation.warnings.forEach(warning => {
          console.warn('Policy validation warning:', warning);
        });
      }

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

      // Call the proven eBay inventory sync service through EbayService
      console.log('📤 Calling EbayService.syncListing with listing:', listing.id);
      const data = await EbayService.syncListing(listing.id, { dryRun: false });

      console.log('📥 EbayService sync response:', { data, listingId: listing.id });

      if (data?.status !== 'success') {
        const errorMsg = data?.error || 'Unknown error occurred';
        console.error('❌ eBay sync failed:', errorMsg, { 
          fullResponse: data,
          listingId: listing.id,
          timestamp: new Date().toISOString()
        });
        
        // Enhanced error feedback with specific guidance
        let userMessage = `Failed to sync to eBay: ${errorMsg}`;
        if (errorMsg.includes('401') || errorMsg.includes('403') || errorMsg.includes('authentication')) {
          userMessage = 'eBay authentication failed. Please reconnect your eBay account in Settings.';
          setShowSetupNotification(true);
        } else if (errorMsg.includes('25007') || errorMsg.includes('shipping')) {
          userMessage = 'eBay shipping service error. Please check your shipping preferences in Settings.';
        } else if (errorMsg.includes('25002') || errorMsg.includes('SKU')) {
          userMessage = 'This item already exists in your eBay inventory. Please use a different SKU or update the existing listing.';
        }
        
        toast({
          title: "Sync Failed",
          description: userMessage,
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
        .eq('is_active', true)
        .single();

      // Validate token for bulk sync
      if (ebayAccount && ebayAccount.oauth_expires_at) {
        const expiryTime = new Date(ebayAccount.oauth_expires_at);
        const now = new Date();
        if (expiryTime <= now) {
          console.error('❌ Bulk sync: eBay token expired:', { 
            expiresAt: ebayAccount.oauth_expires_at, 
            now: now.toISOString() 
          });
          
          await supabase
            .from('marketplace_accounts')
            .update({ is_connected: false, is_active: false })
            .eq('id', ebayAccount.id);
          
          toast({
            title: "eBay Token Expired",
            description: "Your eBay connection has expired. Please reconnect your account in Settings.",
            variant: "destructive"
          });
          
          setShowSetupNotification(true);
          return { success: false, error: 'eBay token expired - reconnection required' };
        }
      }

      if (accountError || !ebayAccount) {
        console.error('❌ eBay account not connected:', accountError);
        setShowSetupNotification(true);
        return { success: false, error: 'eBay account not connected' };
      }

      // Use EbayService for bulk operations with proper batching
      console.log('📤 Calling EbayService.bulkSyncListings...');
      const result = await EbayService.bulkSyncListings(listings, { batchSize: 3 });
      
      // Show summary toast
      toast({
        title: `Bulk Sync ${result.success ? 'Completed' : 'Failed'}`,
        description: `${result.successCount}/${result.totalProcessed} listings synced successfully`,
        variant: result.success && result.errorCount === 0 ? "default" : "destructive"
      });

      return result;
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