
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface SizeInformationProps {
  gender?: string;
  ageGroup?: string;
  clothingSize?: string;
  shoeSize?: string;
}

const SizeInformation = ({ gender, ageGroup, clothingSize, shoeSize }: SizeInformationProps) => {
  if (!gender && !clothingSize && !shoeSize) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-gray-900">Size Information</h3>
      <div className="flex flex-wrap gap-2">
        {gender && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {gender}'s
          </Badge>
        )}
        {ageGroup && (
          <Badge variant="outline" className="bg-purple-50 text-purple-700">
            {ageGroup}
          </Badge>
        )}
        {clothingSize && (
          <Badge variant="outline" className="bg-green-50 text-green-700">
            Size {clothingSize}
          </Badge>
        )}
        {shoeSize && (
          <Badge variant="outline" className="bg-orange-50 text-orange-700">
            Size {shoeSize}
          </Badge>
        )}
      </div>
    </div>
  );
};

export default SizeInformation;
