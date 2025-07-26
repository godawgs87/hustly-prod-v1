import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useListingSave } from '@/hooks/useListingSave';
import { supabase } from '@/integrations/supabase/client';
import type { PhotoGroup } from '../BulkUploadManager';
import type { ListingData } from '@/types/CreateListing';

type StepType = 'upload' | 'grouping' | 'analysis' | 'confirmation' | 'shipping' | 'finalReview';

// Helper function to extract measurements from AI response with category awareness
const extractMeasurements = (analysisResult: any) => {
  const aiMeasurements = analysisResult.measurements || {};
  const description = analysisResult.description || '';
  const category = analysisResult.category;
  
  // Determine if this is a clothing item
  const isClothing = category && (
    (typeof category === 'string' && category.toLowerCase().includes('clothing')) ||
    (typeof category === 'object' && (
      category.primary?.toLowerCase().includes('clothing') ||
      category.subcategory?.toLowerCase().includes('hoodie') ||
      category.subcategory?.toLowerCase().includes('shirt') ||
      category.subcategory?.toLowerCase().includes('sweatshirt')
    ))
  );
  
  console.log('🔍 Category analysis:', { category, isClothing });
  console.log('🔍 Raw AI measurements received:', aiMeasurements);
  console.log('🔍 AI measurements type:', typeof aiMeasurements);
  console.log('🔍 AI measurements keys:', Object.keys(aiMeasurements || {}));
  console.log('🔍 AI measurements values:', Object.values(aiMeasurements || {}));
  
  // Check if AI measurements have actual values (not null/undefined)
  const hasValidMeasurements = Object.values(aiMeasurements).some(value => 
    value !== null && value !== undefined && value !== ''
  );
  
  console.log('🔍 Has valid measurements?', hasValidMeasurements);
  
  if (hasValidMeasurements) {
    console.log('✅ Using AI measurements:', aiMeasurements);
    return aiMeasurements;
  }
  
  // If AI measurements are empty/null, try to extract from description
  const extractedMeasurements: any = {};
  
  if (isClothing) {
    // Clothing-specific measurement patterns
    const clothingPatterns = [
      { pattern: /chest[:\s-]*([0-9.]+)\s*(inches?|in)/i, field: 'chest' },
      { pattern: /length[:\s-]*([0-9.]+)\s*(inches?|in)/i, field: 'length' },
      { pattern: /sleeve[:\s-]*([0-9.]+)\s*(inches?|in)/i, field: 'sleeve' },
      { pattern: /shoulder[:\s-]*([0-9.]+)\s*(inches?|in)/i, field: 'shoulder' },
      { pattern: /waist[:\s-]*([0-9.]+)\s*(inches?|in)/i, field: 'waist' }
    ];
    
    clothingPatterns.forEach(({ pattern, field }) => {
      const match = description.match(pattern);
      if (match) {
        extractedMeasurements[field] = `${match[1]} ${match[2]}`;
      }
    });
  } else {
    // Non-clothing measurement patterns (general dimensions)
    const generalPatterns = [
      { pattern: /length[:\s-]*([0-9.]+)\s*(inches?|in|cm)/i, field: 'length' },
      { pattern: /width[:\s-]*([0-9.]+)\s*(inches?|in|cm)/i, field: 'width' },
      { pattern: /height[:\s-]*([0-9.]+)\s*(inches?|in|cm)/i, field: 'height' },
      { pattern: /diameter[:\s-]*([0-9.]+)\s*(inches?|in|cm)/i, field: 'diameter' },
      { pattern: /weight[:\s-]*([0-9.]+)\s*(lbs?|pounds?|oz|ounces?)/i, field: 'weight' },
      { pattern: /dimensions?[:\s-]*([0-9.]+)\s*[x×]\s*([0-9.]+)\s*[x×]\s*([0-9.]+)\s*(inches?|in)/i, field: 'dimensions' }
    ];
    
    generalPatterns.forEach(({ pattern, field }) => {
      const match = description.match(pattern);
      if (match) {
        if (field === 'dimensions') {
          extractedMeasurements.length = `${match[1]} ${match[4]}`;
          extractedMeasurements.width = `${match[2]} ${match[4]}`;
          extractedMeasurements.height = `${match[3]} ${match[4]}`;
        } else {
          extractedMeasurements[field] = `${match[1]} ${match[2]}`;
        }
      }
    });
  }
  
  console.log('🔍 Extracted measurements:', extractedMeasurements);
  
  // Return extracted measurements or fallback to AI measurements
  return Object.keys(extractedMeasurements).length > 0 ? extractedMeasurements : aiMeasurements;
};

export const useBulkUploadHandlers = (
  photos: File[],
  photoGroups: PhotoGroup[],
  setIsGrouping: (loading: boolean) => void,
  setCurrentStep: (step: StepType) => void,
  setPhotoGroups: (groups: PhotoGroup[] | ((prev: PhotoGroup[]) => PhotoGroup[])) => void,
  onComplete: (results: any[]) => void,
  onEditItem: (groupId: string) => void,
  onPreviewItem: (groupId: string) => void
) => {
  const { toast } = useToast();
  const { saveListing } = useListingSave();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Simple photo grouping based on file properties
  const groupSimilarPhotos = useCallback((photos: File[]): PhotoGroup[] => {
    const groups: PhotoGroup[] = [];
    const used = new Set<number>();

    photos.forEach((photo, index) => {
      if (used.has(index)) return;

      const group: PhotoGroup = {
        id: `group-${Date.now()}-${index}`,
        photos: [photo],
        name: `Item ${groups.length + 1}`,
        confidence: 'medium',
        status: 'pending',
        aiSuggestion: `Potential item from ${photo.name}`
      };

      // Look for similar photos (simple similarity based on file size and name)
      for (let i = index + 1; i < photos.length; i++) {
        if (used.has(i)) continue;
        
        const otherPhoto = photos[i];
        const sizeDiff = Math.abs(photo.size - otherPhoto.size) / Math.max(photo.size, otherPhoto.size);
        const timeDiff = Math.abs(photo.lastModified - otherPhoto.lastModified);
        
        // Group photos with similar size or taken close in time
        if (sizeDiff < 0.3 || timeDiff < 30000) {
          group.photos.push(otherPhoto);
          used.add(i);
        }
      }

      used.add(index);
      groups.push(group);
    });

    return groups;
  }, []);

  const handleStartGrouping = useCallback(async () => {
    if (photos.length === 0) {
      toast({
        title: "No Photos",
        description: "Please upload photos first.",
        variant: "destructive"
      });
      return;
    }

    setIsGrouping(true);
    
    try {
      // Simulate processing time for initial grouping
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate initial groups based on photo properties
      const groups = groupSimilarPhotos(photos);
      
      // Set the groups in state
      setPhotoGroups(groups);
      
      // Navigate to the grouping step for user review and adjustments
      setCurrentStep('grouping');
      
      toast({
        title: "Initial Grouping Complete!",
        description: `Created ${groups.length} initial item groups from ${photos.length} photos. Review and adjust as needed.`
      });
    } catch (error) {
      console.error('Grouping failed:', error);
      toast({
        title: "Grouping Failed",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGrouping(false);
    }
  }, [photos, groupSimilarPhotos, setIsGrouping, setCurrentStep, setPhotoGroups, toast]);

  // Move handleRetryAnalysis above all usages to fix hoisting bug
  const handleRetryAnalysis = useCallback(async (groupId: string) => {
    console.log('🔍 handleRetryAnalysis called for:', groupId);
    const group = photoGroups.find(g => g.id === groupId);
    if (!group) {
      console.error('❌ Group not found for ID:', groupId);
      return;
    }

    console.log('🤖 Starting AI analysis for group:', groupId, group.name);
    console.log('📊 Current group status:', group.status);
    
    console.log('🔄 Setting status to processing...');
    setPhotoGroups(prev => {
      const updated = prev.map(g => 
        g.id === groupId ? { ...g, status: 'processing' as const } : g
      );
      console.log('📋 Updated photoGroups:', updated.map(g => ({ id: g.id, status: g.status })));
      return updated;
    });

    try {
      // Convert photos to base64 for API call (same as single listing)
      const convertFilesToBase64 = async (files: File[]): Promise<string[]> => {
        const promises = files.map(file => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = reader.result as string;
              // Remove data URL prefix to get just the base64 data
              const base64Data = base64.split(',')[1];
              resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        });
        return Promise.all(promises);
      };

      // Limit to first 3 photos for faster processing (same as single listing)
      const photosToAnalyze = group.photos.slice(0, 3);
      console.log('Analyzing first', photosToAnalyze.length, 'photos for group:', group.name);
      
      // Convert photos to base64 using the SAME method as single item (which works)
      const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const base64Photos = await Promise.all(photosToAnalyze.map(toBase64));
      console.log('✅ Photos converted to base64, count:', base64Photos.length);
      
      // Call the real AI analysis API (same as single listing)
      console.log('📡 Calling AI analysis API...');
      const response = await fetch('https://ekzaaptxfwixgmbrooqr.supabase.co/functions/v1/analyze-photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photos: base64Photos }),
      });

      console.log('📡 API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI analysis failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('🎯 AI analysis response:', data);
      
      if (data?.success && data?.listing) {
        const analysisResult = data.listing;
        console.log('✅ Analysis successful, updating group with results');
        
        // Log the complete raw response structure
        console.log('🔍 FULL AI Response Structure:', JSON.stringify(analysisResult, null, 2));
        
        // Log specific fields we're looking for
        console.log('📊 Field Analysis:');
        console.log('  - measurements:', analysisResult.measurements, typeof analysisResult.measurements);
        console.log('  - keywords:', analysisResult.keywords, typeof analysisResult.keywords);
        console.log('  - shipping_weight:', analysisResult.shipping_weight, typeof analysisResult.shipping_weight);
        console.log('  - flaws:', analysisResult.flaws, typeof analysisResult.flaws);
        console.log('  - confidence_score:', analysisResult.confidence_score, typeof analysisResult.confidence_score);
        
        // Map the actual AI response structure to our expected fields
        const mappedData = {
          title: analysisResult.title,
          description: analysisResult.description,
          // Extract price from nested pricing object
          price: analysisResult.pricing?.suggested_price || analysisResult.price,
          category: analysisResult.category,
          condition: analysisResult.condition,
          // Improve measurement extraction for different item types
          measurements: extractMeasurements(analysisResult),
          // Use seo_keywords if keywords is empty
          keywords: analysisResult.keywords?.length > 0 ? analysisResult.keywords : (analysisResult.seo_keywords || []),
          brand: analysisResult.brand,
          size: analysisResult.size,
          color: analysisResult.color,
          material: analysisResult.material,
          // Extract shipping weight from nested shipping object
          shipping_weight: analysisResult.shipping?.weight_oz ? `${analysisResult.shipping.weight_oz} oz` : analysisResult.shipping_weight,
          // Extract flaws/defects
          flaws: analysisResult.flaws || analysisResult.defects || [],
          confidence_score: analysisResult.confidence_score
        };
        
        console.log('📊 Mapped AI listing data structure:', mappedData);
        
        // Update the group with mapped AI analysis results
        setPhotoGroups(prev => prev.map(g => 
          g.id === groupId 
            ? { 
                ...g, 
                status: 'completed' as const,
                listingData: {
                  ...g.listingData,
                  // Core fields that exist in the interface
                  title: mappedData.title || g.listingData?.title || 'Untitled Item',
                  description: mappedData.description || g.listingData?.description || '',
                  category: mappedData.category || g.listingData?.category || 'Uncategorized',
                  condition: mappedData.condition || g.listingData?.condition || 'Good',
                  measurements: mappedData.measurements || g.listingData?.measurements || {},
                  keywords: mappedData.keywords || g.listingData?.keywords || [],
                  price: mappedData.price || g.listingData?.price,
                  // Use type assertion for additional fields not in interface
                  ...(mappedData as any)
                }
              } 
            : g
        ));

        console.log('✅ AI Analysis complete for:', group.name, 'Auto-saving as draft...');
        
        // Auto-save as DRAFT after AI analysis to preserve credits and prevent data loss
        try {
          await handlePostItem(group.id, true); // true = save as draft
          console.log('💾 Draft saved for:', group.name);
        } catch (error) {
          console.error('❌ Failed to save draft for:', group.name, error);
          // Continue even if draft save fails
        }
        
        toast({
          title: "AI Analysis Complete",
          description: `Successfully analyzed ${group.name}. Draft saved to inventory.`,
        });
        
      } else {
        throw new Error('Invalid response from AI analysis service');
      }
      
    } catch (error) {
      console.error('❌ AI analysis failed for group:', groupId, error);
      setPhotoGroups(prev => prev.map(g => 
        g.id === groupId ? { ...g, status: 'error' as const } : g
      ));
      
      toast({
        title: "AI Analysis Failed",
        description: `Failed to analyze ${group.name}: ${error.message}`,
        variant: "destructive"
      });
    }
  }, [photoGroups, setPhotoGroups, toast]);

  const handleGroupsConfirmed = useCallback(async (confirmedGroups: PhotoGroup[]) => {
    // Just set the groups and move directly to confirmation/table view - skip analysis step
    setPhotoGroups(confirmedGroups);
    setCurrentStep('confirmation');
    toast({
      title: "Groups Confirmed!",
      description: "Review your items and click 'Start AI Analysis' when ready.",
    });
  }, [setPhotoGroups, setCurrentStep, toast]);

  const handlePreviewItem = useCallback((groupId: string) => {
    console.log('🔍 Preview item called for:', groupId);
    if (onPreviewItem) {
      onPreviewItem(groupId);
    } else {
      console.warn('⚠️ onPreviewItem handler not provided');
    }
  }, [onPreviewItem]);

  const handleEditItem = useCallback((groupId: string) => {
    console.log('✏️ Edit item called for:', groupId);
    if (onEditItem) {
      onEditItem(groupId);
    } else {
      console.warn('⚠️ onEditItem handler not provided');
    }
  }, [onEditItem]);

  const handlePostItem = useCallback(async (groupId: string, saveAsDraft: boolean = false) => {
    console.log('🚀 handlePostItem called for:', groupId, saveAsDraft ? '(as draft)' : '(as active)');
    const group = photoGroups.find(g => g.id === groupId);
    if (!group || !group.listingData) {
      console.log('❌ No group or listing data found for:', groupId);
      return;
    }

    if (group.isPosted && !saveAsDraft) {
      console.log('⚠️ Item already posted, skipping:', groupId);
      return;
    }

    console.log('📝 Marking item as being posted:', groupId);
    // Mark as being posted to prevent duplicate calls
    setPhotoGroups(prev => prev.map(g => 
      g.id === groupId ? { ...g, isPosted: true } : g
    ));

    try {
      // Upload photos to Supabase storage first to get permanent URLs
      const uploadedPhotoUrls: string[] = [];
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to upload photos');
      }

      // Upload each photo to Supabase storage with retry logic
      for (let i = 0; i < group.photos.length; i++) {
        const file = group.photos[i];
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}_${Date.now()}_${i}.${fileExt}`;
        const filePath = `listings/${user.id}/${fileName}`;
        
        console.log(`📤 Uploading photo ${i + 1}/${group.photos.length} to ${filePath}`);
        
        let uploadSuccess = false;
        let retryCount = 0;
        const maxRetries = 3;
        let finalPublicUrl = '';
        
        // Retry upload up to 3 times
        while (!uploadSuccess && retryCount < maxRetries) {
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('listing-photos')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: retryCount > 0, // Allow overwrite on retry
              contentType: file.type || 'image/jpeg'
            });
          
          if (uploadError) {
            retryCount++;
            console.error(`❌ Photo upload failed (attempt ${retryCount}/${maxRetries}):`, uploadError);
            
            if (retryCount < maxRetries) {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          } else {
            // Get permanent public URL
            const { data: urlData } = supabase.storage
              .from('listing-photos')
              .getPublicUrl(filePath);
            
            finalPublicUrl = urlData.publicUrl;
            uploadSuccess = true;
            console.log('✅ Photo uploaded successfully:', finalPublicUrl);
          }
        }
        
        if (!uploadSuccess) {
          // If all retries failed, throw error to prevent saving with broken images
          throw new Error(`Failed to upload photo ${i + 1} after ${maxRetries} attempts. Cannot save listing with broken images.`);
        }
        
        uploadedPhotoUrls.push(finalPublicUrl);
      }

      // Actually save the listing with permanent image URLs
      const listingData = {
        ...group.listingData,
        title: group.listingData.title || 'Untitled Item',
        description: group.listingData.description || 'No description available',
        price: group.listingData.price || 0,
        // Use category as string for consistency with Final Review display
        // Properly handle AI-detected categories to prevent fallback to 'Uncategorized'
        category: (() => {
          const cat = group.listingData?.category;
          if (typeof cat === 'string' && cat.trim() && cat !== 'Uncategorized') {
            console.log('✅ Using string category:', cat);
            return cat;
          }
          if (typeof cat === 'object' && cat !== null) {
            const categoryName = (cat as any).name || (cat as any).primary || (cat as any).category;
            if (categoryName && typeof categoryName === 'string' && categoryName.trim() && categoryName !== 'Uncategorized') {
              console.log('✅ Using object category:', categoryName);
              return categoryName;
            }
          }
          console.log('⚠️ Falling back to Uncategorized for category:', cat);
          return 'Uncategorized';
        })(),
        condition: group.listingData.condition || 'Used',
        photos: uploadedPhotoUrls, // Use permanent URLs from Supabase storage
        measurements: {
          length: String(group.listingData.measurements?.length || ''),
          width: String(group.listingData.measurements?.width || ''),
          height: String(group.listingData.measurements?.height || ''),
          weight: String(group.listingData.measurements?.weight || '')
        },
        // Include shipping information if available
        shipping_cost: group.selectedShipping?.cost || 0,
        shipping_method: group.selectedShipping?.name || 'Not configured',
        shipping_days: group.selectedShipping?.estimatedDays || 'Unknown',
      };

      const result = await saveListing(
        listingData,
        group.selectedShipping?.cost || 0, // Use actual shipping cost from configuration
        saveAsDraft ? 'draft' : 'active', // Draft after AI analysis, active after final upload
        undefined // No existing listing ID for new saves
      );
      
      if (result) {
        setPhotoGroups(prev => prev.map(g => 
          g.id === groupId ? { 
            ...g, 
            isPosted: true, 
            listingId: result.listingId || `listing-${Date.now()}` 
          } : g
        ));

        const statusMessage = saveAsDraft ? 'saved as draft' : 'posted to inventory';
        toast({
          title: saveAsDraft ? "Draft Saved!" : "Item Posted!",
          description: `${group.listingData.title} has been ${statusMessage} successfully.`,
        });
      } else {
        throw new Error('Failed to save listing');
      }
    } catch (error) {
      console.error('Post failed:', error);
      toast({
        title: "Post Failed",
        description: "Could not post item to inventory. Please try again.",
        variant: "destructive"
      });
    }
  }, [photoGroups, setPhotoGroups, toast, saveListing]);

  const handlePostAll = useCallback(async () => {
    console.log('🔄 handlePostAll called, checking ready groups...');
    const readyGroups = photoGroups.filter(g => 
      g.status === 'completed' && g.listingData && !g.isPosted
    );
    
    console.log('📊 Ready groups found:', readyGroups.length, readyGroups.map(g => ({ id: g.id, isPosted: g.isPosted })));
    
    if (readyGroups.length === 0) {
      toast({
        title: "No Items Ready",
        description: "Complete analysis for items before posting.",
        variant: "destructive"
      });
      return;
    }

    console.log('🚀 Starting to post', readyGroups.length, 'items...');
    
    // Mark ALL items as being posted BEFORE starting to prevent race conditions
    setPhotoGroups(prev => prev.map(g => 
      readyGroups.some(rg => rg.id === g.id) ? { ...g, isPosted: true } : g
    ));
    
    for (const group of readyGroups) {
      console.log('📤 Posting group:', group.id);
      await handlePostItem(group.id);
    }

    toast({
      title: "Bulk Post Complete!",
      description: `Successfully posted ${readyGroups.length} items to inventory.`,
    });

    // Redirect to inventory page after successful upload
    setTimeout(() => {
      window.location.href = '/inventory';
    }, 1500); // Small delay to let user see the success message
  }, [photoGroups, setPhotoGroups, handlePostItem, toast]);

  const handleUpdateGroup = useCallback((updatedGroup: PhotoGroup) => {
    setPhotoGroups(prev => prev.map(g => 
      g.id === updatedGroup.id ? updatedGroup : g
    ));
  }, [setPhotoGroups]);

  const handleConfirmItems = useCallback(() => {
    setCurrentStep('shipping');
  }, [setCurrentStep]);

  const handleShippingConfirmed = useCallback(() => {
    setCurrentStep('finalReview');
  }, [setCurrentStep]);

  const handleBack = useCallback((targetStep: StepType) => {
    console.log('⬅️ Going back to step:', targetStep);
    setCurrentStep(targetStep);
  }, [setCurrentStep]);

  const handleStartAnalysis = useCallback(async () => {
    console.log('🚀 Starting bulk AI analysis...');
    setIsAnalyzing(true);
    
    try {
      const incompleteGroups = photoGroups.filter(g => g.status !== 'completed');
      
      for (const group of incompleteGroups) {
        console.log('🔍 Analyzing group:', group.name);
        await handleRetryAnalysis(group.id);
      }
      
      setCurrentStep('confirmation');
      toast({
        title: "AI Analysis Complete!",
        description: "Review and confirm the AI-generated details for each item.",
      });
    } catch (error) {
      toast({
        title: "Analysis Error",
        description: "There was an error analyzing your items.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [photoGroups, setIsAnalyzing, setPhotoGroups, setCurrentStep, handleRetryAnalysis, toast]);

  return {
    handleStartGrouping,
    handleGroupsConfirmed,
    handleEditItem,
    handlePreviewItem,
    handlePostItem,
    handlePostAll,
    handleUpdateGroup,
    handleRetryAnalysis,
    handleConfirmItems,
    handleShippingConfirmed,
    handleBack,
    handleStartAnalysis,
    isAnalyzing
  };
};
