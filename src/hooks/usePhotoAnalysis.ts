
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ListingData } from '@/types/CreateListing';
import { convertFilesToBase64 } from '@/utils/photoUtils';

export const usePhotoAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const analyzePhotos = async (photos: File[]): Promise<ListingData | null> => {
    if (photos.length === 0) {
      toast({
        title: "No Photos",
        description: "Please upload at least one photo to analyze.",
        variant: "destructive"
      });
      return null;
    }
    
    setIsAnalyzing(true);
    
    try {
      console.log('=== PHOTO ANALYSIS START ===');
      console.log('Starting photo analysis with', photos.length, 'photos');
      
      // Limit to first 3 photos for faster processing
      const photosToAnalyze = photos.slice(0, 3);
      console.log('Analyzing first', photosToAnalyze.length, 'photos for speed');
      
      // Validate photos first
      const validPhotos = photosToAnalyze.filter(photo => {
        if (!photo || photo.size === 0) {
          console.error('Invalid photo found:', photo);
          return false;
        }
        if (!photo.type.startsWith('image/')) {
          console.error('Non-image file found:', photo.type);
          return false;
        }
        return true;
      });
      
      if (validPhotos.length === 0) {
        throw new Error('No valid image files found');
      }
      
      console.log('Valid photos count:', validPhotos.length);
      
      // Convert photos to base64 with compression
      let base64Photos;
      try {
        console.log('Converting and compressing photos...');
        base64Photos = await convertFilesToBase64(validPhotos);
        console.log('Photos converted successfully, count:', base64Photos.length);
        
        if (base64Photos.length === 0) {
          throw new Error('No photos could be processed');
        }
      } catch (conversionError) {
        console.error('Photo conversion failed:', conversionError);
        throw new Error('Failed to process photos. Please try uploading smaller images.');
      }
      
      console.log('Calling analyze-photos function...');
      
      // Prepare the request payload
      const requestPayload = { 
        photos: base64Photos 
      };
      
      console.log('Request payload prepared - Photos count:', requestPayload.photos.length);
      
      // Use longer timeout and better error handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Analysis request timed out after 90 seconds')), 90000);
      });
      
      const analysisPromise = supabase.functions.invoke('analyze-photos', {
        body: requestPayload
      });
      
      const { data, error } = await Promise.race([analysisPromise, timeoutPromise]) as any;

      console.log('Function response received');
      console.log('Function data:', data);
      console.log('Function error:', error);
      
      if (error) {
        console.error('Function call failed:', error);
        
        // Handle specific function errors
        if (error.message?.includes('FunctionsRelayError')) {
          throw new Error('Analysis service is temporarily unavailable. Please try again.');
        } else if (error.message?.includes('FunctionsFetchError')) {
          throw new Error('Network error. Please check your connection and try again.');
        } else if (error.message?.includes('timeout')) {
          throw new Error('Analysis timed out. Try using fewer or smaller photos.');
        } else {
          throw new Error(`Analysis failed: ${error.message}`);
        }
      }

      if (data?.success && data?.listing) {
        const analysisResult = data.listing;
        
        // Convert all photos to base64 for storage (including unused ones)
        const allBase64Photos = await convertFilesToBase64(photos);
        
        // Create listing data with the analyzed results
        const listingData = {
          ...analysisResult,
          photos: allBase64Photos
        };
        
        console.log('Analysis completed successfully');
        
        toast({
          title: "Analysis Complete! 🎯",
          description: `Listing generated with researched price: $${analysisResult.price}`
        });

        return listingData;
      } else {
        throw new Error(data?.error || 'Analysis failed - no data returned');
      }
    } catch (error) {
      console.error('=== ANALYSIS ERROR ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Full error:', error);
      
      // More specific error handling
      let errorMessage = 'Please try with smaller photos or fewer images.';
      if (error?.message?.includes('timeout')) {
        errorMessage = 'Analysis timed out. Try using 1-2 smaller photos.';
      } else if (error?.message?.includes('quota')) {
        errorMessage = 'Service quota exceeded. Please try again later.';
      } else if (error?.message?.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (error?.message?.includes('unavailable')) {
        errorMessage = 'Service temporarily unavailable. Please try again.';
      } else if (error?.message?.includes('Network error')) {
        errorMessage = 'Connection issue. Please check your internet and try again.';
      } else if (error?.message?.includes('process')) {
        errorMessage = 'Photo processing failed. Please try smaller images (under 2MB each).';
      }
      
      toast({
        title: "Analysis Failed",
        description: `${error?.message || 'Analysis error'}. ${errorMessage}`,
        variant: "destructive"
      });

      return null;
    } finally {
      setIsAnalyzing(false);
      console.log('=== PHOTO ANALYSIS END ===');
    }
  };

  return {
    isAnalyzing,
    analyzePhotos
  };
};
