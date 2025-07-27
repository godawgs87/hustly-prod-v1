
import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Image } from 'lucide-react';

interface BulkPhotoUploadProps {
  onPhotosUploaded: (photos: File[]) => void;
  maxPhotos?: number;
}

const BulkPhotoUpload = ({ onPhotosUploaded, maxPhotos = 100 }: BulkPhotoUploadProps) => {
  const [photos, setPhotos] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    processFiles(imageFiles);
  };

  const processFiles = async (newFiles: File[]) => {
    const totalFiles = [...photos, ...newFiles].slice(0, maxPhotos);
    
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      setUploadProgress(i);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    setPhotos(totalFiles);
    onPhotosUploaded(totalFiles);
    setUploadProgress(0);
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    onPhotosUploaded(newPhotos);
  };

  const clearAll = () => {
    setPhotos([]);
    onPhotosUploaded([]);
  };

  return (
    <div className="space-y-6">
      {/* Upload Area - Mobile Optimized */}
      <div
        className={`border-2 border-dashed rounded-xl p-6 sm:p-12 text-center transition-colors ${
          dragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-3 sm:space-y-4">
          <div className="p-4 sm:p-6 bg-gray-100 rounded-full">
            <Upload className="w-8 h-8 sm:w-12 sm:h-12 text-gray-600" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              Bulk Photo Upload
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 px-2">
              Upload photos for multiple items at once (up to {maxPhotos} photos)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700 text-base py-3 px-6"
              size="lg"
            >
              <Image className="w-5 h-5 mr-2" />
              Choose Photos
            </Button>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 px-4">
            <span className="hidden sm:inline">Drag and drop photos here or </span>
            <span className="sm:hidden">Tap button above to </span>
            <span className="sm:hidden">browse photos</span>
            <span className="hidden sm:inline">click to browse</span>
          </p>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between text-sm font-medium">
            <span>Uploading photos...</span>
            <span className="text-blue-600">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full h-2" />
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <h3 className="text-base sm:text-lg font-semibold">
              Uploaded Photos ({photos.length}/{maxPhotos})
            </h3>
            <Button 
              variant="outline" 
              onClick={clearAll}
              className="w-full sm:w-auto"
              size="sm"
            >
              Clear All
            </Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 sm:gap-2">
            {photos.map((photo, index) => (
              <Card key={index} className="relative group overflow-hidden aspect-square hover:shadow-lg transition-shadow">
                <img
                  src={URL.createObjectURL(photo)}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {/* Mobile-friendly remove button */}
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-7 h-7 sm:w-5 sm:h-5 flex items-center justify-center text-sm sm:text-xs opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-lg"
                  aria-label={`Remove photo ${index + 1}`}
                >
                  <X className="w-4 h-4 sm:w-3 sm:h-3" />
                </button>
                {/* Photo number indicator - always visible on mobile */}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs sm:text-xs p-1.5 sm:p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  Photo {index + 1}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkPhotoUpload;
