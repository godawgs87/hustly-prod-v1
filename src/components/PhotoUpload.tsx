
import React, { useState } from 'react';
import { Camera, Image, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PhotoUploadProps {
  onPhotosChange: (photos: File[]) => void;
  maxPhotos?: number;
}

const PhotoUpload = ({ onPhotosChange, maxPhotos = 24 }: PhotoUploadProps) => {
  const [photos, setPhotos] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = [...photos, ...files].slice(0, maxPhotos);
    setPhotos(newPhotos);
    onPhotosChange(newPhotos);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const newPhotos = [...photos, ...imageFiles].slice(0, maxPhotos);
    setPhotos(newPhotos);
    onPhotosChange(newPhotos);
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    onPhotosChange(newPhotos);
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
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
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-gray-100 rounded-full">
            <Camera className="w-8 h-8 text-gray-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Upload Item Photos
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Include photos with rulers for accurate measurements
            </p>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="photo-upload"
            />
            <label htmlFor="photo-upload">
              <Button asChild className="cursor-pointer">
                <span className="flex items-center space-x-2">
                  <Image className="w-4 h-4" />
                  <span>Choose Photos</span>
                </span>
              </Button>
            </label>
          </div>
          <p className="text-xs text-gray-400">
            {photos.length}/{maxPhotos} photos uploaded
          </p>
        </div>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo, index) => (
            <Card key={index} className="relative group overflow-hidden">
              <img
                src={URL.createObjectURL(photo)}
                alt={`Upload ${index + 1}`}
                className="w-full h-24 object-cover"
              />
              <button
                onClick={() => removePhoto(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </Card>
          ))}
          {photos.length < maxPhotos && (
            <label htmlFor="photo-upload">
              <Card className="h-24 flex items-center justify-center border-dashed border-2 border-gray-300 hover:border-gray-400 cursor-pointer transition-colors">
                <Plus className="w-6 h-6 text-gray-400" />
              </Card>
            </label>
          )}
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
