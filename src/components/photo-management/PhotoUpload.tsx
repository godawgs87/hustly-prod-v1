import React, { useState, useEffect } from 'react';
import PhotoManager, { PhotoItem } from './PhotoManager';

interface PhotoUploadProps {
  onPhotosChange: (photos: File[]) => void;
  maxPhotos?: number;
  initialPhotos?: File[];
  showEditor?: boolean;
}

const PhotoUpload = ({ 
  onPhotosChange, 
  maxPhotos = 24, 
  initialPhotos = [],
  showEditor = true 
}: PhotoUploadProps) => {
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);

  // Convert initial photos to PhotoItems
  useEffect(() => {
    const convertInitialPhotos = async () => {
      if (initialPhotos.length === 0) return;

      const items: PhotoItem[] = await Promise.all(
        initialPhotos.map(async (file, index) => ({
          id: `initial-${index}-${Date.now()}`,
          file,
          preview: URL.createObjectURL(file),
          isPrimary: index === 0,
          thumbnail: await generateThumbnail(file)
        }))
      );

      setPhotoItems(items);
    };

    convertInitialPhotos();
  }, [initialPhotos]);

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

  const handlePhotosChange = (items: PhotoItem[]) => {
    setPhotoItems(items);
    
    // Convert PhotoItems back to File[] for backward compatibility
    const files = items.map(item => item.file);
    onPhotosChange(files);
  };

  return (
    <PhotoManager
      photos={photoItems}
      onPhotosChange={handlePhotosChange}
      maxPhotos={maxPhotos}
      showEditor={showEditor}
    />
  );
};

export default PhotoUpload;