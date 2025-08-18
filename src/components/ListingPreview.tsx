import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Settings, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import ListingEditor from './ListingEditor';
import ListingDetails from './listing-preview/ListingDetails';
import ListingFeatures from './listing-preview/ListingFeatures';
import UnifiedPlatformMapping from './create-listing/UnifiedPlatformMapping';
import { ListingData } from '@/types/CreateListing';

interface ListingPreviewProps {
  listing: ListingData;
  onEdit: () => void;
  onExport: () => void;
}

const ListingPreview = ({ listing, onEdit, onExport }: ListingPreviewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentListing, setCurrentListing] = useState(listing);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPlatformMapping, setShowPlatformMapping] = useState(false);

  const handleAdminClick = () => {
    window.location.href = '/admin';
  };

  const handleSaveEdit = (updatedListing: ListingData) => {
    setCurrentListing(updatedListing);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <ListingEditor
        listing={currentListing}
        onSave={handleSaveEdit}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <ListingDetails
              title={currentListing.title}
              price={currentListing.price}
              category={currentListing.category}
              condition={currentListing.condition}
              keywords={currentListing.keywords}
              description={currentListing.description}
              measurements={currentListing.measurements}
            />
          </div>
          <div className="flex space-x-2 ml-4">
            <Button variant="outline" size="sm" onClick={handleAdminClick}>
              <Settings className="w-4 h-4 mr-2" />
              Admin
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
        
        <div className="space-y-4">
          <ListingFeatures
            features={currentListing.features}
            includes={currentListing.includes}
            defects={currentListing.defects}
          />

          {/* Advanced Details Toggle */}
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm"
            >
              {showAdvanced ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showAdvanced ? 'Hide' : 'Show'} Advanced Details
            </Button>
            
            {showAdvanced && currentListing.priceResearch && (
              <div className="mt-3 p-3 bg-gray-50 rounded">
                <h4 className="font-medium text-gray-900 mb-2">Price Research</h4>
                <div className="text-sm text-gray-600">
                  {currentListing.priceResearch.priceAnalysis && (
                    <div>
                      <p>Suggested Price: ${currentListing.priceResearch.priceAnalysis.suggestedPrice}</p>
                      <p>Confidence: {currentListing.priceResearch.priceAnalysis.confidence}</p>
                      <p>Sample Size: {currentListing.priceResearch.priceAnalysis.analysis?.sampleSize || 'N/A'}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Platform-Specific Mapping Section */}
          <div className="mt-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowPlatformMapping(!showPlatformMapping)}
              className="text-sm mb-3"
            >
              {showPlatformMapping ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
              {showPlatformMapping ? 'Hide' : 'Show'} Platform-Specific Fields
            </Button>
            
            {showPlatformMapping && (
              <UnifiedPlatformMapping 
                listingData={currentListing} 
                basePrice={currentListing.price || 0}
                selectedPlatforms={['ebay', 'mercari', 'poshmark', 'depop', 'facebook', 'whatnot']}
                onPlatformToggle={(platform, selected) => {
                  console.log(`Platform ${platform} ${selected ? 'selected' : 'deselected'}`);
                }}
              />
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        {currentListing.photos.slice(0, 6).map((photo, index) => (
          <img
            key={index}
            src={photo}
            alt={`Product ${index + 1}`}
            className="w-full h-20 object-cover rounded-lg"
          />
        ))}
      </div>

      <Button onClick={onExport} className="w-full gradient-bg text-white">
        Continue to Shipping
      </Button>
    </div>
  );
};

export default ListingPreview;
