import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Image as ImageIcon, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Compress,
  Eye,
  EyeOff
} from 'lucide-react';
import { PhotoGroup } from '../BulkUploadManager';

interface OptimizedPhotoGroupingProps {
  photos: File[];
  onGroupingComplete: (groups: PhotoGroup[]) => void;
  onBack: () => void;
}

interface PhotoProcessingState {
  file: File;
  id: string;
  isLoaded: boolean;
  isCompressed: boolean;
  thumbnail?: string;
  error?: string;
}

interface GroupingProgress {
  totalPhotos: number;
  processedPhotos: number;
  compressedPhotos: number;
  groupsCreated: number;
  stage: 'loading' | 'compressing' | 'grouping' | 'complete';
}

// Image compression utility
const compressImage = async (file: File, maxSizeMB: number = 5): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions to keep under maxSizeMB
      const maxWidth = 1920;
      const maxHeight = 1080;
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(compressedFile);
        } else {
          resolve(file); // Fallback to original if compression fails
        }
      }, 'image/jpeg', 0.8);
    };
    
    img.onerror = () => resolve(file); // Fallback to original if loading fails
    img.src = URL.createObjectURL(file);
  });
};

// Generate thumbnail for lazy loading
const generateThumbnail = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      const size = 150; // Thumbnail size
      canvas.width = size;
      canvas.height = size;
      
      // Calculate crop dimensions for square thumbnail
      const minDim = Math.min(img.width, img.height);
      const x = (img.width - minDim) / 2;
      const y = (img.height - minDim) / 2;
      
      ctx?.drawImage(img, x, y, minDim, minDim, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

// Smart grouping algorithm based on file names and metadata
const smartGroupPhotos = (photos: PhotoProcessingState[]): PhotoGroup[] => {
  const groups: { [key: string]: PhotoProcessingState[] } = {};
  
  photos.forEach(photo => {
    // Extract base name without numbers/extensions for grouping
    const baseName = photo.file.name
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[-_]\d+$/, '') // Remove trailing numbers
      .replace(/\s+\d+$/, '') // Remove trailing space + numbers
      .toLowerCase()
      .trim();
    
    if (!groups[baseName]) {
      groups[baseName] = [];
    }
    groups[baseName].push(photo);
  });
  
  // Convert to PhotoGroup format
  return Object.entries(groups).map(([baseName, groupPhotos], index) => ({
    id: `group-${index}-${Date.now()}`,
    name: baseName.charAt(0).toUpperCase() + baseName.slice(1) || `Item ${index + 1}`,
    photos: groupPhotos.map(p => p.file),
    confidence: groupPhotos.length > 1 ? 'high' : 'medium',
    status: 'pending' as const,
    aiSuggestion: `Grouped ${groupPhotos.length} photo${groupPhotos.length > 1 ? 's' : ''} based on filename similarity`
  }));
};

export const OptimizedPhotoGrouping: React.FC<OptimizedPhotoGroupingProps> = ({
  photos,
  onGroupingComplete,
  onBack
}) => {
  const [photoStates, setPhotoStates] = useState<PhotoProcessingState[]>([]);
  const [progress, setProgress] = useState<GroupingProgress>({
    totalPhotos: photos.length,
    processedPhotos: 0,
    compressedPhotos: 0,
    groupsCreated: 0,
    stage: 'loading'
  });
  const [isProcessing, setIsProcessing] = useState(true);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [groups, setGroups] = useState<PhotoGroup[]>([]);

  // Initialize photo states
  useEffect(() => {
    const initialStates = photos.map((file, index) => ({
      file,
      id: `photo-${index}-${Date.now()}`,
      isLoaded: false,
      isCompressed: false
    }));
    setPhotoStates(initialStates);
  }, [photos]);

  // Batch process photos with controlled concurrency
  const processPhotosInBatches = useCallback(async () => {
    console.log('📸 Starting optimized photo processing for', photos.length, 'photos');
    setProgress(prev => ({ ...prev, stage: 'loading' }));

    const batchSize = 4; // Process 4 photos at a time
    const processedStates: PhotoProcessingState[] = [];

    for (let i = 0; i < photoStates.length; i += batchSize) {
      const batch = photoStates.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (photoState) => {
        try {
          // Generate thumbnail first (fast)
          const thumbnail = await generateThumbnail(photoState.file);
          
          // Check if compression is needed (>5MB)
          const needsCompression = photoState.file.size > 5 * 1024 * 1024;
          let processedFile = photoState.file;
          
          if (needsCompression) {
            setProgress(prev => ({ ...prev, stage: 'compressing' }));
            processedFile = await compressImage(photoState.file);
            console.log(`🗜️ Compressed ${photoState.file.name}: ${(photoState.file.size / 1024 / 1024).toFixed(1)}MB → ${(processedFile.size / 1024 / 1024).toFixed(1)}MB`);
            
            setProgress(prev => ({ 
              ...prev, 
              compressedPhotos: prev.compressedPhotos + 1 
            }));
          }
          
          const updatedState: PhotoProcessingState = {
            ...photoState,
            file: processedFile,
            thumbnail,
            isLoaded: true,
            isCompressed: needsCompression
          };
          
          setProgress(prev => ({ 
            ...prev, 
            processedPhotos: prev.processedPhotos + 1 
          }));
          
          return updatedState;
        } catch (error) {
          console.error('❌ Failed to process photo:', photoState.file.name, error);
          return {
            ...photoState,
            isLoaded: true,
            error: 'Failed to process'
          };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.allSettled(batchPromises);
      const successfulResults = batchResults
        .filter((result): result is PromiseFulfilledResult<PhotoProcessingState> => 
          result.status === 'fulfilled')
        .map(result => result.value);
      
      processedStates.push(...successfulResults);
      
      // Update UI with batch progress
      setPhotoStates(prev => {
        const updated = [...prev];
        successfulResults.forEach(result => {
          const index = updated.findIndex(p => p.id === result.id);
          if (index >= 0) {
            updated[index] = result;
          }
        });
        return updated;
      });

      // Small delay to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Start smart grouping
    console.log('🔗 Starting smart photo grouping...');
    setProgress(prev => ({ ...prev, stage: 'grouping' }));
    
    const smartGroups = smartGroupPhotos(processedStates);
    setGroups(smartGroups);
    
    setProgress(prev => ({ 
      ...prev, 
      groupsCreated: smartGroups.length,
      stage: 'complete'
    }));
    
    setIsProcessing(false);
    
    console.log('✅ Photo processing complete:', {
      totalPhotos: processedStates.length,
      compressedPhotos: processedStates.filter(p => p.isCompressed).length,
      groupsCreated: smartGroups.length
    });
    
    toast.success(`Processed ${processedStates.length} photos into ${smartGroups.length} groups`);
  }, [photoStates, photos.length]);

  // Start processing when component mounts
  useEffect(() => {
    if (photoStates.length > 0 && isProcessing) {
      processPhotosInBatches();
    }
  }, [photoStates.length, processPhotosInBatches, isProcessing]);

  // Calculate overall progress percentage
  const overallProgress = useMemo(() => {
    const { totalPhotos, processedPhotos, stage } = progress;
    if (totalPhotos === 0) return 0;
    
    const baseProgress = (processedPhotos / totalPhotos) * 80; // 80% for processing
    const stageProgress = stage === 'complete' ? 20 : 0; // 20% for grouping
    
    return Math.min(baseProgress + stageProgress, 100);
  }, [progress]);

  const handleContinue = () => {
    onGroupingComplete(groups);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Optimized Photo Processing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Overview */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing {progress.totalPhotos} photos</span>
                <span>{Math.round(overallProgress)}% complete</span>
              </div>
              <Progress value={overallProgress} className="w-full" />
            </div>

            {/* Stage Indicators */}
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                {progress.stage === 'loading' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                <span>Loading: {progress.processedPhotos}/{progress.totalPhotos}</span>
              </div>
              
              {progress.compressedPhotos > 0 && (
                <div className="flex items-center gap-2">
                  <Compress className="w-4 h-4 text-orange-500" />
                  <span>Compressed: {progress.compressedPhotos}</span>
                </div>
              )}
              
              {progress.groupsCreated > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Groups: {progress.groupsCreated}</span>
                </div>
              )}
            </div>

            {/* Thumbnail Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowThumbnails(!showThumbnails)}
                className="flex items-center gap-2"
              >
                {showThumbnails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showThumbnails ? 'Hide' : 'Show'} Thumbnails
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Grid with Lazy Loading */}
      {showThumbnails && (
        <Card>
          <CardHeader>
            <CardTitle>Photo Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {photoStates.map((photoState) => (
                <div key={photoState.id} className="relative aspect-square">
                  {photoState.thumbnail ? (
                    <img
                      src={photoState.thumbnail}
                      alt={photoState.file.name}
                      className="w-full h-full object-cover rounded border"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 rounded border flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  )}
                  
                  {/* Status Indicators */}
                  {photoState.isCompressed && (
                    <Badge className="absolute top-1 right-1 text-xs bg-orange-500">
                      Compressed
                    </Badge>
                  )}
                  
                  {photoState.error && (
                    <div className="absolute inset-0 bg-red-100 bg-opacity-90 rounded flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Groups Preview */}
      {groups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Smart Groups Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <div key={group.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{group.name}</h4>
                    <Badge variant={group.confidence === 'high' ? 'default' : 'secondary'}>
                      {group.photos.length} photo{group.photos.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{group.aiSuggestion}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to Upload
        </Button>
        
        <Button 
          onClick={handleContinue}
          disabled={isProcessing || groups.length === 0}
          className="flex items-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Continue with {groups.length} Groups
              <CheckCircle className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
