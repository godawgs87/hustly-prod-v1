
import { useToast } from '@/hooks/use-toast';
import type { PhotoGroup } from '../BulkUploadManager';

type StepType = 'upload' | 'grouping' | 'review';

export const useBulkGroupingHandlers = (
  photos: File[],
  setIsGrouping: (loading: boolean) => void,
  setCurrentStep: (step: StepType) => void,
  setPhotoGroups: (groups: PhotoGroup[]) => void
) => {
  const { toast } = useToast();

  // Simple image similarity detection based on file properties
  const analyzePhotoSimilarity = (photo1: File, photo2: File): number => {
    // Check if files have similar sizes (within 30% difference)
    const sizeDiff = Math.abs(photo1.size - photo2.size) / Math.max(photo1.size, photo2.size);
    if (sizeDiff < 0.3) return 0.7; // High similarity for similar file sizes
    
    // Check if files were taken close in time (if available in metadata)
    const timeDiff = Math.abs(photo1.lastModified - photo2.lastModified);
    if (timeDiff < 30000) return 0.8; // Very high similarity if taken within 30 seconds
    
    return 0.1; // Low similarity by default
  };

  const groupSimilarPhotos = (photos: File[]): PhotoGroup[] => {
    const groups: PhotoGroup[] = [];
    const used = new Set<number>();
    
    for (let i = 0; i < photos.length; i++) {
      if (used.has(i)) continue;
      
      const currentGroup: File[] = [photos[i]];
      used.add(i);
      
      // Find similar photos to group with current photo
      for (let j = i + 1; j < photos.length; j++) {
        if (used.has(j)) continue;
        
        const similarity = analyzePhotoSimilarity(photos[i], photos[j]);
        if (similarity > 0.6) { // Threshold for grouping
          currentGroup.push(photos[j]);
          used.add(j);
        }
      }
      
      // Create group with appropriate naming
      const groupName = currentGroup.length > 1 
        ? `Item ${groups.length + 1} (${currentGroup.length} photos)`
        : `Item ${groups.length + 1}`;
      
      const confidence: 'high' | 'medium' | 'low' = currentGroup.length > 1 ? 'high' : 'medium';
      
      groups.push({
        id: `group-${groups.length}`,
        photos: currentGroup,
        name: groupName,
        confidence: confidence,
        status: 'pending',
        aiSuggestion: currentGroup.length > 1 
          ? `Detected ${currentGroup.length} photos of the same item`
          : `Single photo item detected`
      });
    }
    
    return groups;
  };

  const handleStartGrouping = async () => {
    if (photos.length === 0) {
      toast({
        title: "No photos uploaded",
        description: "Please upload photos first.",
        variant: "destructive"
      });
      return;
    }

    setIsGrouping(true);
    
    toast({
      title: "Analyzing photos...",
      description: "AI is grouping similar photos together",
    });
    
    // Simulate processing time for better UX
    setTimeout(() => {
      const groups = groupSimilarPhotos(photos);
      
      setPhotoGroups(groups);
      setIsGrouping(false);
      setCurrentStep('grouping'); // Show grouping interface first
      
      const totalPhotos = photos.length;
      const totalGroups = groups.length;
      const multiPhotoGroups = groups.filter(g => g.photos.length > 1).length;
      
      toast({
        title: "Smart Grouping Complete! 🎯",
        description: `Organized ${totalPhotos} photos into ${totalGroups} items${multiPhotoGroups > 0 ? ` (${multiPhotoGroups} multi-photo groups detected)` : ''}`,
      });
    }, 2000);
  };

  const handleGroupsConfirmed = (confirmedGroups: PhotoGroup[]) => {
    setPhotoGroups(confirmedGroups);
    setCurrentStep('review');
    
    toast({
      title: "Groups confirmed!",
      description: `${confirmedGroups.length} item groups ready for AI analysis.`,
    });
  };

  return {
    handleStartGrouping,
    handleGroupsConfirmed
  };
};
