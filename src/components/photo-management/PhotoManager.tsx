import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Camera, Image, Plus, Star, Edit3, Trash2, RotateCw, Crop, Palette } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import SimplePhotoEditor from './SimplePhotoEditor';

export interface PhotoItem {
  id: string;
  file: File;
  preview: string;
  isPrimary: boolean;
  thumbnail?: string;
  edits?: {
    crop?: { x: number; y: number; width: number; height: number };
    rotation?: number;
    brightness?: number;
    contrast?: number;
  };
}

interface PhotoManagerProps {
  photos: PhotoItem[];
  onPhotosChange: (photos: PhotoItem[]) => void;
  maxPhotos?: number;
  showEditor?: boolean;
}

const PhotoManager = ({ 
  photos, 
  onPhotosChange, 
  maxPhotos = 24,
  showEditor = true 
}: PhotoManagerProps) => {
  const [dragOver, setDragOver] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<PhotoItem | null>(null);
  const { toast } = useToast();

  const createPhotoItem = useCallback(async (file: File): Promise<PhotoItem> => {
    const preview = URL.createObjectURL(file);
    const thumbnail = await generateThumbnail(file);
    
    return {
      id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview,
      isPrimary: photos.length === 0, // First photo is primary by default
      thumbnail
    };
  }, [photos.length]);

  const generateThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');
      
      img.onload = () => {
        const size = 150;
        canvas.width = size;
        canvas.height = size;
        
        // Calculate crop to center
        const aspectRatio = img.width / img.height;
        let drawWidth, drawHeight, drawX, drawY;
        
        if (aspectRatio > 1) {
          drawHeight = size;
          drawWidth = size * aspectRatio;
          drawX = -(drawWidth - size) / 2;
          drawY = 0;
        } else {
          drawWidth = size;
          drawHeight = size / aspectRatio;
          drawX = 0;
          drawY = -(drawHeight - size) / 2;
        }
        
        ctx?.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (photos.length + files.length > maxPhotos) {
      toast({
        title: "Too many photos",
        description: `You can only upload ${maxPhotos} photos maximum.`,
        variant: "destructive"
      });
      return;
    }

    try {
      const newPhotoItems = await Promise.all(files.map(createPhotoItem));
      onPhotosChange([...photos, ...newPhotoItems]);
      
      toast({
        title: "Photos uploaded",
        description: `Added ${files.length} photo${files.length > 1 ? 's' : ''}`
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Some photos could not be processed",
        variant: "destructive"
      });
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) return;
    
    if (photos.length + imageFiles.length > maxPhotos) {
      toast({
        title: "Too many photos",
        description: `You can only upload ${maxPhotos} photos maximum.`,
        variant: "destructive"
      });
      return;
    }

    try {
      const newPhotoItems = await Promise.all(imageFiles.map(createPhotoItem));
      onPhotosChange([...photos, ...newPhotoItems]);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Some photos could not be processed",
        variant: "destructive"
      });
    }
  };

  const removePhoto = (photoId: string) => {
    const updatedPhotos = photos.filter(p => p.id !== photoId);
    
    // If removed photo was primary, make first photo primary
    if (updatedPhotos.length > 0 && !updatedPhotos.find(p => p.isPrimary)) {
      updatedPhotos[0].isPrimary = true;
    }
    
    onPhotosChange(updatedPhotos);
  };

  const setPrimaryPhoto = (photoId: string) => {
    const updatedPhotos = photos.map(photo => ({
      ...photo,
      isPrimary: photo.id === photoId
    }));
    onPhotosChange(updatedPhotos);
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const reorderedPhotos = Array.from(photos);
    const [reorderedItem] = reorderedPhotos.splice(result.source.index, 1);
    reorderedPhotos.splice(result.destination.index, 0, reorderedItem);

    onPhotosChange(reorderedPhotos);
  };

  const handlePhotoEdit = (photo: PhotoItem) => {
    setEditingPhoto(photo);
  };

  const handleEditSave = (editedPhoto: PhotoItem) => {
    const updatedPhotos = photos.map(p => 
      p.id === editedPhoto.id ? editedPhoto : p
    );
    onPhotosChange(updatedPhotos);
    setEditingPhoto(null);
    
    toast({
      title: "Photo updated",
      description: "Your edits have been saved"
    });
  };

  return (
    <>
      <div className="space-y-4">
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
            dragOver 
              ? 'border-primary bg-primary/5' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 bg-gray-100 rounded-full">
              <Camera className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">
                Upload Item Photos
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                Drag and drop or click to select photos
              </p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="photo-upload-enhanced"
              />
              <label htmlFor="photo-upload-enhanced">
                <Button asChild className="cursor-pointer" size="sm">
                  <span className="flex items-center space-x-2">
                    <Image className="w-4 h-4" />
                    <span>Choose Photos</span>
                  </span>
                </Button>
              </label>
            </div>
            <p className="text-xs text-gray-400">
              {photos.length}/{maxPhotos} photos • First photo will be your main listing image
            </p>
          </div>
        </div>

        {/* Photo Grid */}
        {photos.length > 0 && (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="photos" direction="horizontal">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"
                >
                  {photos.map((photo, index) => (
                    <Draggable key={photo.id} draggableId={photo.id} index={index}>
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`relative group overflow-hidden cursor-move transition-all ${
                            snapshot.isDragging ? 'rotate-3 scale-105 shadow-xl' : ''
                          } ${photo.isPrimary ? 'ring-2 ring-primary' : ''}`}
                        >
                          <div className="aspect-square relative">
                            <img
                              src={photo.thumbnail || photo.preview}
                              alt={`Photo ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            
                            {/* Primary badge */}
                            {photo.isPrimary && (
                              <Badge className="absolute top-1 left-1 bg-primary text-white text-xs px-1">
                                <Star className="w-3 h-3 mr-1" />
                                Main
                              </Badge>
                            )}
                            
                            {/* Action buttons */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1">
                              {!photo.isPrimary && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="p-1 h-auto"
                                  onClick={() => setPrimaryPhoto(photo.id)}
                                  title="Set as main photo"
                                >
                                  <Star className="w-3 h-3" />
                                </Button>
                              )}
                              
                              {showEditor && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="p-1 h-auto"
                                  onClick={() => handlePhotoEdit(photo)}
                                  title="Edit photo"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                              )}
                              
                              <Button
                                size="sm"
                                variant="destructive"
                                className="p-1 h-auto"
                                onClick={() => removePhoto(photo.id)}
                                title="Remove photo"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  
                  {/* Add more photos button */}
                  {photos.length < maxPhotos && (
                    <label htmlFor="photo-upload-enhanced">
                      <Card className="aspect-square flex items-center justify-center border-dashed border-2 border-gray-300 hover:border-gray-400 cursor-pointer transition-colors group">
                        <div className="text-center">
                          <Plus className="w-6 h-6 text-gray-400 group-hover:text-gray-600 mx-auto mb-1" />
                          <span className="text-xs text-gray-400 group-hover:text-gray-600">Add More</span>
                        </div>
                      </Card>
                    </label>
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Photo Editor Modal */}
      {editingPhoto && showEditor && (
        <SimplePhotoEditor
          photo={editingPhoto}
          onSave={handleEditSave}
          onCancel={() => setEditingPhoto(null)}
        />
      )}
    </>
  );
};

export default PhotoManager;