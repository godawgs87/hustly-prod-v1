
import { useToast } from '@/hooks/use-toast';
import { useListingSave } from '@/hooks/useListingSave';
import type { PhotoGroup } from '../../BulkUploadManager';
import type { ListingData } from '@/types/CreateListing';
import { sanitizeListingData } from '@/utils/listingDataValidator';
import { useBulkValidation } from '../validation/useBulkValidation';

type StepType = 'upload' | 'grouping' | 'processing' | 'shipping' | 'review' | 'individual-review';

export const useBulkItemActions = (
  photoGroups: PhotoGroup[],
  setCurrentStep: (step: StepType) => void,
  setCurrentReviewIndex: (index: number) => void,
  setPhotoGroups: (groups: PhotoGroup[] | ((prev: PhotoGroup[]) => PhotoGroup[])) => void
) => {
  const { toast } = useToast();
  const { saveListing } = useListingSave();
  const { validateGroupForSave } = useBulkValidation();

  const ensureListingData = (listingData?: PhotoGroup['listingData']): ListingData => {
    const baseData = listingData || {};
    
    return {
      title: baseData.title || '',
      description: baseData.description || '',
      price: baseData.price || 0,
      category: baseData.category || '',
      category_id: baseData.category_id || null,
      condition: baseData.condition || '',
      measurements: {
        length: baseData.measurements?.length ? String(baseData.measurements.length) : '',
        width: baseData.measurements?.width ? String(baseData.measurements.width) : '',
        height: baseData.measurements?.height ? String(baseData.measurements.height) : '',
        weight: baseData.measurements?.weight ? String(baseData.measurements.weight) : '1' // Default weight
      },
      photos: baseData.photos || [],
      keywords: baseData.keywords || [],
      priceResearch: baseData.priceResearch || '',
      purchase_price: baseData.purchase_price,
      purchase_date: baseData.purchase_date,
      source_location: baseData.source_location,
      source_type: baseData.source_type,
      is_consignment: baseData.is_consignment || false,
      consignment_percentage: baseData.consignment_percentage,
      consignor_name: baseData.consignor_name,
      consignor_contact: baseData.consignor_contact,
      clothing_size: baseData.clothing_size,
      shoe_size: baseData.shoe_size,
      gender: baseData.gender,
      age_group: baseData.age_group,
      features: baseData.features || [],
      includes: baseData.includes || [],
      defects: baseData.defects || []
    };
  };

  const handleEditItem = (groupId: string) => {
    const groupIndex = photoGroups.findIndex(g => g.id === groupId);
    if (groupIndex >= 0) {
      setCurrentReviewIndex(groupIndex);
      setCurrentStep('individual-review');
    }
  };

  const handlePreviewItem = (groupId: string) => {
    return groupId;
  };

  const handlePostItem = async (groupId: string) => {
    const groupToPost = photoGroups.find(g => g.id === groupId);
    if (!groupToPost) {
      toast({
        title: "Error",
        description: "Item not found.",
        variant: "destructive"
      });
      return;
    }

    const validation = validateGroupForSave(groupToPost);
    if (!validation.isValid) {
      toast({
        title: "Cannot post item",
        description: validation.errors.join(', '),
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Posting single item:', groupToPost.listingData?.title);
      const completeListingData = ensureListingData(groupToPost.listingData);
      const listingData = sanitizeListingData(completeListingData);
      
      const result = await saveListing(
        listingData,
        groupToPost.selectedShipping?.cost || 0,
        'active'
      );

      if (result.success) {
        setPhotoGroups(prev => prev.map(g => 
          g.id === groupId 
            ? { ...g, isPosted: true, listingId: result.listingId, status: 'completed' as const }
            : g
        ));
        
        toast({
          title: "Success!",
          description: `${groupToPost.listingData?.title || groupToPost.name} posted successfully!`,
        });
      }
    } catch (error) {
      console.error('Failed to post item:', error);
      toast({
        title: "Error",
        description: `Failed to post item: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  return {
    handleEditItem,
    handlePreviewItem,
    handlePostItem,
    ensureListingData
  };
};
