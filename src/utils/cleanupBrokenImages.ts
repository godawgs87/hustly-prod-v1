import { supabase } from '@/integrations/supabase/client';

/**
 * Utility to clean up broken blob URLs in the database
 * This fixes existing listings that have temporary blob URLs stored
 */
export async function cleanupBrokenImageUrls(): Promise<{
  success: boolean;
  fixed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let fixedCount = 0;

  try {
    console.log('🧹 Starting cleanup of broken image URLs...');

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Fetch all listings for the current user
    const { data: listings, error: fetchError } = await supabase
      .from('listings')
      .select('id, photos, title')
      .eq('user_id', user.id);

    if (fetchError) {
      throw new Error(`Failed to fetch listings: ${fetchError.message}`);
    }

    if (!listings || listings.length === 0) {
      console.log('📝 No listings found to clean up');
      return { success: true, fixed: 0, errors: [] };
    }

    console.log(`🔍 Checking ${listings.length} listings for broken image URLs...`);

    // Process each listing
    for (const listing of listings) {
      try {
        if (!listing.photos || !Array.isArray(listing.photos)) {
          continue;
        }

        // Check if any photos are blob URLs
        const hasBlobUrls = listing.photos.some((photo: string) => 
          typeof photo === 'string' && photo.startsWith('blob:')
        );

        if (hasBlobUrls) {
          console.log(`🔧 Fixing broken images for listing: ${listing.title} (${listing.id})`);
          
          // Filter out blob URLs and keep only valid URLs
          const cleanedPhotos = listing.photos.filter((photo: string) => 
            typeof photo === 'string' && !photo.startsWith('blob:')
          );

          // Update the listing with cleaned photos
          const { error: updateError } = await supabase
            .from('listings')
            .update({ photos: cleanedPhotos.length > 0 ? cleanedPhotos : null })
            .eq('id', listing.id);

          if (updateError) {
            errors.push(`Failed to update listing ${listing.id}: ${updateError.message}`);
          } else {
            fixedCount++;
            console.log(`✅ Fixed listing: ${listing.title}`);
          }
        }
      } catch (error) {
        const errorMsg = `Error processing listing ${listing.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error('❌', errorMsg);
      }
    }

    console.log(`🎉 Cleanup completed! Fixed ${fixedCount} listings with broken images.`);
    
    return {
      success: true,
      fixed: fixedCount,
      errors
    };

  } catch (error) {
    const errorMsg = `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('❌', errorMsg);
    return {
      success: false,
      fixed: fixedCount,
      errors: [errorMsg, ...errors]
    };
  }
}

/**
 * Check if there are any listings with broken blob URLs
 */
export async function checkForBrokenImages(): Promise<{
  hasBrokenImages: boolean;
  brokenCount: number;
  totalListings: number;
}> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { hasBrokenImages: false, brokenCount: 0, totalListings: 0 };
    }

    const { data: listings, error: fetchError } = await supabase
      .from('listings')
      .select('id, photos')
      .eq('user_id', user.id);

    if (fetchError || !listings) {
      return { hasBrokenImages: false, brokenCount: 0, totalListings: 0 };
    }

    const brokenCount = listings.filter(listing => {
      if (!listing.photos || !Array.isArray(listing.photos)) {
        return false;
      }
      return listing.photos.some((photo: string) => 
        typeof photo === 'string' && photo.startsWith('blob:')
      );
    }).length;

    return {
      hasBrokenImages: brokenCount > 0,
      brokenCount,
      totalListings: listings.length
    };
  } catch (error) {
    console.error('Error checking for broken images:', error);
    return { hasBrokenImages: false, brokenCount: 0, totalListings: 0 };
  }
}
