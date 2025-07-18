import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { RotateCw, X } from 'lucide-react';
import { PhotoItem } from './PhotoManager';

interface SimplePhotoEditorProps {
  photo: PhotoItem;
  onSave: (editedPhoto: PhotoItem) => void;
  onCancel: () => void;
}

const SimplePhotoEditor = ({ photo, onSave, onCancel }: SimplePhotoEditorProps) => {
  const [edits, setEdits] = useState({
    rotation: photo.edits?.rotation || 0,
    brightness: photo.edits?.brightness || 0,
    contrast: photo.edits?.contrast || 0,
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

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
    const brightnessPercent = 100 + edits.brightness;
    const contrastPercent = 100 + edits.contrast;
    ctx.filter = `brightness(${brightnessPercent}%) contrast(${contrastPercent}%)`;

    // Draw image
    ctx.drawImage(image, 0, 0);

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
      contrast: 0
    });
  };

  return (
    <Dialog open onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Edit Photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview Area */}
          <div className="relative bg-gray-100 rounded-lg p-4 flex justify-center">
            <div className="relative max-w-full max-h-80 overflow-hidden">
              <img
                ref={imageRef}
                src={photo.preview}
                alt="Edit preview"
                className="hidden"
                onLoad={() => setImageLoaded(true)}
              />
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-80 object-contain border rounded"
              />
            </div>
          </div>

          {/* Edit Controls */}
          <div className="space-y-6">
            {/* Basic Controls */}
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

            {/* Adjustment Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Brightness</Label>
                <Slider
                  value={[edits.brightness]}
                  onValueChange={handleBrightnessChange}
                  min={-50}
                  max={50}
                  step={1}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 text-center">{edits.brightness}</div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Contrast</Label>
                <Slider
                  value={[edits.contrast]}
                  onValueChange={handleContrastChange}
                  min={-50}
                  max={50}
                  step={1}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 text-center">{edits.contrast}</div>
              </div>
            </div>
          </div>
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

export default SimplePhotoEditor;