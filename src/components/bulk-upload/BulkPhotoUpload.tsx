
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
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
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
        <div className="flex flex-col items-center space-y-4">
          <div className="p-6 bg-gray-100 rounded-full">
            <Upload className="w-12 h-12 text-gray-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Bulk Photo Upload
            </h3>
            <p className="text-gray-600 mb-4">
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
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Image className="w-4 h-4 mr-2" />
              Choose Photos
            </Button>
          </div>
          <p className="text-sm text-gray-500">
            Drag and drop photos here or click to browse
          </p>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading photos...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              Uploaded Photos ({photos.length}/{maxPhotos})
            </h3>
            <Button variant="outline" onClick={clearAll}>
              Clear All
            </Button>
          </div>
          
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
            {photos.map((photo, index) => (
              <Card key={index} className="relative group overflow-hidden aspect-square">
                <img
                  src={URL.createObjectURL(photo)}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {index + 1}
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
