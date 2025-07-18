import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Image, 
  RotateCw, 
  Palette, 
  Crop, 
  Download, 
  Trash2,
  CheckCircle,
  Loader2,
  Star
} from 'lucide-react';
import { PhotoItem } from './PhotoManager';

interface BulkPhotoOperationsProps {
  photos: PhotoItem[];
  selectedPhotos: string[];
  onPhotosChange: (photos: PhotoItem[]) => void;
  onSelectionChange: (selectedIds: string[]) => void;
}

type BulkOperation = 
  | 'resize'
  | 'rotate'
  | 'brightness'
  | 'contrast'
  | 'compress'
  | 'delete'
  | 'set_primary';

interface OperationConfig {
  resize?: { width: number; height: number };
  rotate?: number;
  brightness?: number;
  contrast?: number;
  compress?: number;
}

const BulkPhotoOperations = ({ 
  photos, 
  selectedPhotos, 
  onPhotosChange, 
  onSelectionChange 
}: BulkPhotoOperationsProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [operation, setOperation] = useState<BulkOperation | null>(null);
  const [config, setConfig] = useState<OperationConfig>({});
  const { toast } = useToast();

  const selectedCount = selectedPhotos.length;
  const selectedPhotoItems = photos.filter(p => selectedPhotos.includes(p.id));

  const handleSelectAll = () => {
    if (selectedPhotos.length === photos.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(photos.map(p => p.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCount === 0) return;

    const remainingPhotos = photos.filter(p => !selectedPhotos.includes(p.id));
    
    // If we deleted the primary photo, make the first remaining photo primary
    if (remainingPhotos.length > 0 && !remainingPhotos.find(p => p.isPrimary)) {
      remainingPhotos[0].isPrimary = true;
    }

    onPhotosChange(remainingPhotos);
    onSelectionChange([]);
    
    toast({
      title: "Photos deleted",
      description: `Removed ${selectedCount} photo${selectedCount > 1 ? 's' : ''}`
    });
  };

  const handleSetPrimary = () => {
    if (selectedCount !== 1) {
      toast({
        title: "Select one photo",
        description: "Please select exactly one photo to set as primary",
        variant: "destructive"
      });
      return;
    }

    const updatedPhotos = photos.map(photo => ({
      ...photo,
      isPrimary: photo.id === selectedPhotos[0]
    }));

    onPhotosChange(updatedPhotos);
    onSelectionChange([]);
    
    toast({
      title: "Primary photo updated",
      description: "Selected photo is now the main listing image"
    });
  };

  const applyBulkOperation = async (operation: BulkOperation, config: OperationConfig) => {
    if (selectedCount === 0) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const processedPhotos = [...photos];
      
      for (let i = 0; i < selectedPhotoItems.length; i++) {
        const photo = selectedPhotoItems[i];
        const photoIndex = photos.findIndex(p => p.id === photo.id);
        
        if (photoIndex === -1) continue;

        switch (operation) {
          case 'rotate':
            processedPhotos[photoIndex] = await rotatePhoto(photo, config.rotate || 90);
            break;
          case 'brightness':
            processedPhotos[photoIndex] = await adjustBrightness(photo, config.brightness || 0);
            break;
          case 'contrast':
            processedPhotos[photoIndex] = await adjustContrast(photo, config.contrast || 0);
            break;
          case 'compress':
            processedPhotos[photoIndex] = await compressPhoto(photo, config.compress || 0.8);
            break;
        }

        setProgress(((i + 1) / selectedPhotoItems.length) * 100);
        
        // Small delay to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      onPhotosChange(processedPhotos);
      onSelectionChange([]);
      
      toast({
        title: "Bulk operation completed",
        description: `Applied ${operation} to ${selectedCount} photo${selectedCount > 1 ? 's' : ''}`
      });
    } catch (error) {
      toast({
        title: "Operation failed",
        description: "Some photos could not be processed",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setOperation(null);
    }
  };

  const rotatePhoto = async (photo: PhotoItem, degrees: number): Promise<PhotoItem> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');

      img.onload = () => {
        const radians = (degrees * Math.PI) / 180;
        
        if (degrees === 90 || degrees === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        ctx?.save();
        ctx?.translate(canvas.width / 2, canvas.height / 2);
        ctx?.rotate(radians);
        ctx?.drawImage(img, -img.width / 2, -img.height / 2);
        ctx?.restore();

        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], photo.file.name, { type: 'image/jpeg' });
            const newPreview = URL.createObjectURL(newFile);
            
            resolve({
              ...photo,
              file: newFile,
              preview: newPreview,
              edits: {
                ...photo.edits,
                rotation: (photo.edits?.rotation || 0) + degrees
              }
            });
          }
        }, 'image/jpeg', 0.9);
      };

      img.src = photo.preview;
    });
  };

  const adjustBrightness = async (photo: PhotoItem, brightness: number): Promise<PhotoItem> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        ctx?.save();
        if (ctx) ctx.filter = `brightness(${100 + brightness}%)`;
        ctx?.drawImage(img, 0, 0);
        ctx?.restore();

        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], photo.file.name, { type: 'image/jpeg' });
            const newPreview = URL.createObjectURL(newFile);
            
            resolve({
              ...photo,
              file: newFile,
              preview: newPreview,
              edits: {
                ...photo.edits,
                brightness: (photo.edits?.brightness || 0) + brightness
              }
            });
          }
        }, 'image/jpeg', 0.9);
      };

      img.src = photo.preview;
    });
  };

  const adjustContrast = async (photo: PhotoItem, contrast: number): Promise<PhotoItem> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        ctx?.save();
        if (ctx) ctx.filter = `contrast(${100 + contrast}%)`;
        ctx?.drawImage(img, 0, 0);
        ctx?.restore();

        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], photo.file.name, { type: 'image/jpeg' });
            const newPreview = URL.createObjectURL(newFile);
            
            resolve({
              ...photo,
              file: newFile,
              preview: newPreview,
              edits: {
                ...photo.edits,
                contrast: (photo.edits?.contrast || 0) + contrast
              }
            });
          }
        }, 'image/jpeg', 0.9);
      };

      img.src = photo.preview;
    });
  };

  const compressPhoto = async (photo: PhotoItem, quality: number): Promise<PhotoItem> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], photo.file.name, { type: 'image/jpeg' });
            const newPreview = URL.createObjectURL(newFile);
            
            resolve({
              ...photo,
              file: newFile,
              preview: newPreview
            });
          }
        }, 'image/jpeg', quality);
      };

      img.src = photo.preview;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="w-5 h-5" />
          Bulk Photo Operations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selection Summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedPhotos.length === photos.length ? 'Deselect All' : 'Select All'}
            </Button>
            <Badge variant="secondary">
              {selectedCount} of {photos.length} selected
            </Badge>
          </div>
        </div>

        {/* Quick Actions */}
        {selectedCount > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyBulkOperation('rotate', { rotate: 90 })}
                disabled={isProcessing}
                className="flex items-center gap-1"
              >
                <RotateCw className="w-4 h-4" />
                Rotate 90°
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSetPrimary}
                disabled={isProcessing || selectedCount !== 1}
                className="flex items-center gap-1"
              >
                <Star className="w-4 h-4" />
                Set Primary
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isProcessing}
                className="flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </Button>
            </div>

            {/* Advanced Operations */}
            <div className="space-y-3 pt-3 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Brightness Adjustment</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Slider
                      value={[config.brightness || 0]}
                      onValueChange={(value) => setConfig(prev => ({ ...prev, brightness: value[0] }))}
                      min={-50}
                      max={50}
                      step={5}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => applyBulkOperation('brightness', config)}
                      disabled={isProcessing}
                    >
                      Apply
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Contrast Adjustment</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Slider
                      value={[config.contrast || 0]}
                      onValueChange={(value) => setConfig(prev => ({ ...prev, contrast: value[0] }))}
                      min={-50}
                      max={50}
                      step={5}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => applyBulkOperation('contrast', config)}
                      disabled={isProcessing}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <Label>Compression Quality</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Slider
                    value={[config.compress || 0.8]}
                    onValueChange={(value) => setConfig(prev => ({ ...prev, compress: value[0] }))}
                    min={0.3}
                    max={1}
                    step={0.1}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-500 w-12">
                    {Math.round((config.compress || 0.8) * 100)}%
                  </span>
                  <Button
                    size="sm"
                    onClick={() => applyBulkOperation('compress', config)}
                    disabled={isProcessing}
                  >
                    Compress
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Processing Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Processing {selectedCount} photos...</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BulkPhotoOperations;