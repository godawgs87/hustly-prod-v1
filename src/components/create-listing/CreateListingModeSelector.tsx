
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Camera } from 'lucide-react';

interface CreateListingModeSelectorProps {
  onModeSelect: (mode: 'single' | 'bulk') => void;
}

const CreateListingModeSelector = ({ onModeSelect }: CreateListingModeSelectorProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Choose Upload Method</h2>
        <p className="text-gray-600">Select how you'd like to create your listings</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onModeSelect('single')}>
          <CardHeader className="text-center">
            <Camera className="w-12 h-12 mx-auto text-blue-600 mb-4" />
            <CardTitle>Single Item Upload</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              Create one listing at a time with detailed customization and AI assistance.
            </p>
            <Button className="w-full">
              Create Single Listing
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onModeSelect('bulk')}>
          <CardHeader className="text-center">
            <Upload className="w-12 h-12 mx-auto text-green-600 mb-4" />
            <CardTitle>Bulk Upload</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              Upload multiple items at once. AI will group photos and create listings automatically.
            </p>
            <Button variant="outline" className="w-full">
              Start Bulk Upload
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateListingModeSelector;
