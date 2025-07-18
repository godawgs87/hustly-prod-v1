import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RotateCw, Crop, Palette, Download, X } from 'lucide-react';
import { PhotoItem } from './PhotoManager';

interface PhotoEditorProps {
  photo: PhotoItem;
  onSave: (editedPhoto: PhotoItem) => void;
  onCancel: () => void;
}

const PhotoEditor = ({ photo, onSave, onCancel }: PhotoEditorProps) => {
  const [edits, setEdits] = useState({
    rotation: photo.edits?.rotation || 0,
    brightness: photo.edits?.brightness || 0,
    contrast: photo.edits?.contrast || 0,
    crop: photo.edits?.crop || null
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (imageLoaded) {
      applyEdits();
    }
  }, [edits, imageLoaded]);

  const applyEdits = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    
    // Move to center for rotation
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((edits.rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Apply brightness and contrast
    ctx.filter = `brightness(${100 + edits.brightness}%) contrast(${100 + edits.contrast}%)`;

    // Draw image
    if (edits.crop) {
      ctx.drawImage(
        image,
        edits.crop.x,
        edits.crop.y,
        edits.crop.width,
        edits.crop.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
    } else {
      ctx.drawImage(image, 0, 0);
    }

    ctx.restore();
  };

  const handleRotate = () => {
    setEdits(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360
    }));
  };

  const handleBrightnessChange = (value: number[]) => {
    setEdits(prev => ({
      ...prev,
      brightness: value[0]
    }));
  };

  const handleContrastChange = (value: number[]) => {
    setEdits(prev => ({
      ...prev,
      contrast: value[0]
    }));
  };

  const handleCropStart = (e: React.MouseEvent) => {
    if (!cropMode) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCropStart({ x, y });
  };

  const handleCropEnd = (e: React.MouseEvent) => {
    if (!cropMode || !cropStart) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCropEnd({ x, y });

    // Calculate crop area in image coordinates
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const cropX = Math.min(cropStart.x, x) * scaleX;
    const cropY = Math.min(cropStart.y, y) * scaleY;
    const cropWidth = Math.abs(x - cropStart.x) * scaleX;
    const cropHeight = Math.abs(y - cropStart.y) * scaleY;

    setEdits(prev => ({
      ...prev,
      crop: {
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight
      }
    }));

    setCropMode(false);
    setCropStart(null);
    setCropEnd(null);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert canvas to blob and create new file
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const newFile = new File([blob], photo.file.name, { type: 'image/jpeg' });
      const newPreview = URL.createObjectURL(newFile);

      const editedPhoto: PhotoItem = {
        ...photo,
        file: newFile,
        preview: newPreview,
        edits
      };

      onSave(editedPhoto);
    }, 'image/jpeg', 0.9);
  };

  const handleReset = () => {
    setEdits({
      rotation: 0,
      brightness: 0,
      contrast: 0,
      crop: null
    });
  };

  return (
    <Dialog open onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Edit Photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview Area */}
          <div className="relative bg-gray-100 rounded-lg p-4 flex justify-center">
            <div className="relative max-w-full max-h-96 overflow-hidden">
              <img
                ref={imageRef}
                src={photo.preview}
                alt="Edit preview"
                className="hidden"
                onLoad={() => setImageLoaded(true)}
              />
              <canvas
                ref={canvasRef}
                className={`max-w-full max-h-96 object-contain ${cropMode ? 'cursor-crosshair' : ''}`}
                onMouseDown={handleCropStart}
                onMouseUp={handleCropEnd}
              />
              
              {/* Crop overlay */}
              {cropMode && cropStart && cropEnd && (
                <div
                  className="absolute border-2 border-blue-500 bg-blue-500/20"
                  style={{
                    left: Math.min(cropStart.x, cropEnd.x),
                    top: Math.min(cropStart.y, cropEnd.y),
                    width: Math.abs(cropEnd.x - cropStart.x),
                    height: Math.abs(cropEnd.y - cropStart.y)
                  }}
                />
              )}
            </div>
          </div>

          {/* Edit Controls */}
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="adjust">Adjust</TabsTrigger>
              <TabsTrigger value="crop">Crop</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <Button
                  variant="outline"
                  onClick={handleRotate}
                  className="flex items-center space-x-2"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>Rotate 90°</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex items-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Reset All</span>
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="adjust" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Brightness</Label>
                  <div className="mt-2">
                    <Slider
                      value={[edits.brightness]}
                      onValueChange={handleBrightnessChange}
                      min={-50}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{edits.brightness}</div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Contrast</Label>
                  <div className="mt-2">
                    <Slider
                      value={[edits.contrast]}
                      onValueChange={handleContrastChange}
                      min={-50}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{edits.contrast}</div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="crop" className="space-y-4">
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600">
                  Click and drag on the image to select crop area
                </p>
                <div className="flex justify-center space-x-3">
                  <Button
                    variant={cropMode ? "default" : "outline"}
                    onClick={() => setCropMode(!cropMode)}
                    className="flex items-center space-x-2"
                  >
                    <Crop className="w-4 h-4" />
                    <span>{cropMode ? 'Cancel Crop' : 'Start Crop'}</span>
                  </Button>
                  {edits.crop && (
                    <Button
                      variant="outline"
                      onClick={() => setEdits(prev => ({ ...prev, crop: null }))}
                    >
                      Clear Crop
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoEditor;