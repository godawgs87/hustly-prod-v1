
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ListingData } from '@/types/CreateListing';

interface MeasurementsSectionProps {
  listingData: ListingData;
  onUpdate: (updates: Partial<ListingData>) => void;
}

const MeasurementsSection = ({ listingData, onUpdate }: MeasurementsSectionProps) => {
  const handleMeasurementChange = (field: string, value: string) => {
    onUpdate({
      measurements: {
        ...listingData.measurements,
        [field]: value
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Measurements (Optional)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="length">Length</Label>
            <Input
              id="length"
              value={listingData.measurements?.length || ''}
              onChange={(e) => handleMeasurementChange('length', e.target.value)}
              placeholder="e.g., 12 inches"
            />
          </div>
          <div>
            <Label htmlFor="width">Width</Label>
            <Input
              id="width"
              value={listingData.measurements?.width || ''}
              onChange={(e) => handleMeasurementChange('width', e.target.value)}
              placeholder="e.g., 8 inches"
            />
          </div>
          <div>
            <Label htmlFor="height">Height</Label>
            <Input
              id="height"
              value={listingData.measurements?.height || ''}
              onChange={(e) => handleMeasurementChange('height', e.target.value)}
              placeholder="e.g., 6 inches"
            />
          </div>
          <div>
            <Label htmlFor="weight">Weight</Label>
            <Input
              id="weight"
              value={listingData.measurements?.weight || ''}
              onChange={(e) => handleMeasurementChange('weight', e.target.value)}
              placeholder="e.g., 2 lbs"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MeasurementsSection;
