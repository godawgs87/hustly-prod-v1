
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface ListingFeaturesProps {
  features?: string[];
  includes?: string[];
  defects?: string[];
}

const ListingFeatures = ({ features, includes, defects }: ListingFeaturesProps) => {
  return (
    <>
      {/* Features */}
      {features && features.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-900 mb-2">Key Features</h3>
          <div className="flex flex-wrap gap-1">
            {features.map((feature, index) => (
              <Badge key={index} variant="outline" className="text-xs bg-green-50">
                ✓ {feature}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* What's Included */}
      {includes && includes.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-900 mb-2">What's Included</h3>
          <div className="text-sm text-gray-700">
            {includes.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Defects/Issues */}
      {defects && defects.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-900 mb-2 text-red-700">Issues/Defects</h3>
          <div className="text-sm text-red-600">
            {defects.map((defect, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                {defect}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default ListingFeatures;
