
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { ListingData } from '@/types/CreateListing';

interface FeaturesSectionProps {
  listingData: ListingData;
  onUpdate: (updates: Partial<ListingData>) => void;
}

const FeaturesSection = ({ listingData, onUpdate }: FeaturesSectionProps) => {
  const [newFeature, setNewFeature] = useState('');

  const addFeature = () => {
    if (newFeature.trim()) {
      const currentFeatures = listingData.features || [];
      onUpdate({ features: [...currentFeatures, newFeature.trim()] });
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    const currentFeatures = listingData.features || [];
    onUpdate({ features: currentFeatures.filter((_, i) => i !== index) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Features (Optional)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {(listingData.features || []).map((feature, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
              <span className="text-sm">{feature}</span>
              <X 
                className="w-4 h-4 cursor-pointer hover:text-red-500" 
                onClick={() => removeFeature(index)}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            placeholder="Add feature..."
            onKeyPress={(e) => e.key === 'Enter' && addFeature()}
          />
          <Button type="button" onClick={addFeature} size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeaturesSection;
