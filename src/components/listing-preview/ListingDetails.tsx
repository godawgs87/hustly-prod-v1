
import React from 'react';
import { Badge } from '@/components/ui/badge';
import SizeInformation from './SizeInformation';

interface ListingDetailsProps {
  title: string;
  price: number;
  shippingCost?: number;
  category: string;
  condition: string;
  brand?: string;
  model?: string;
  keywords?: string[];
  description: string;
  measurements: {
    length?: string;
    width?: string;
    height?: string;
    weight?: string;
  };
  gender?: string;
  ageGroup?: string;
  clothingSize?: string;
  shoeSize?: string;
}

const ListingDetails = ({
  title,
  price,
  shippingCost,
  category,
  condition,
  brand,
  model,
  keywords,
  description,
  measurements,
  gender,
  ageGroup,
  clothingSize,
  shoeSize
}: ListingDetailsProps) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 pr-4">{title}</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-sm text-gray-500">Price</span>
          <p className="text-2xl font-bold text-green-600">${price}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Shipping</span>
          <p className="text-lg font-semibold">${shippingCost?.toFixed(2) || '9.95'}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{category}</Badge>
        <Badge variant="outline">{condition}</Badge>
        {brand && (
          <Badge variant="outline" className="bg-blue-50">{brand}</Badge>
        )}
        {model && (
          <Badge variant="outline" className="bg-purple-50">{model}</Badge>
        )}
        {keywords?.slice(0, 3).map((keyword, index) => (
          <Badge key={index} variant="outline" className="text-xs">
            {keyword}
          </Badge>
        ))}
      </div>

      <SizeInformation 
        gender={gender}
        ageGroup={ageGroup}
        clothingSize={clothingSize}
        shoeSize={shoeSize}
      />

      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-900 mb-2">Description</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            {description || 'No description available'}
          </p>
        </div>

        <div>
          <h3 className="font-medium text-gray-900 mb-2">Measurements</h3>
          {measurements && (Object.values(measurements).some(v => v && v.trim())) ? (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {measurements.length && (
                <span>Length: {measurements.length}</span>
              )}
              {measurements.width && (
                <span>Width: {measurements.width}</span>
              )}
              {measurements.height && (
                <span>Height: {measurements.height}</span>
              )}
              {measurements.weight && (
                <span>Weight: {measurements.weight}</span>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No measurements available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListingDetails;
