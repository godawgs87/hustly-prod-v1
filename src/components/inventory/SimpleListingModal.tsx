import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { X, Edit, DollarSign, Package, Calendar, User, MapPin, TrendingUp, Clock, FileText } from 'lucide-react';
import ListingImagePreview from '@/components/ListingImagePreview';
import SimpleListingEditModal from './SimpleListingEditModal';
import type { Listing } from '@/types/Listing';

interface SimpleListingModalProps {
  listing: Listing;
  onClose: () => void;
  onSave?: () => void;
}

const SimpleListingModal = ({ listing, onClose, onSave }: SimpleListingModalProps) => {
  const [showEditModal, setShowEditModal] = useState(false);
  
  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleEditClose = () => {
    setShowEditModal(false);
  };

  const handleEditSave = () => {
    setShowEditModal(false);
    onSave?.(); // This will trigger inventory refresh
  };

  // Use listing data directly - no async loading to prevent browser lockups

  const renderSizeInfo = () => {
    const sizeFields = [
      { label: 'Gender', value: listing.gender },
      { label: 'Age Group', value: listing.age_group },
      { label: 'Clothing Size', value: listing.clothing_size },
      { label: 'Shoe Size', value: listing.shoe_size }
    ].filter(field => field.value);

    if (sizeFields.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <User className="w-4 h-4" />
          Size Information
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {sizeFields.map((field, index) => (
            <div key={index} className="flex justify-between">
              <span className="text-sm text-gray-600">{field.label}:</span>
              <Badge variant="outline" className="text-xs">{field.value}</Badge>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMeasurements = () => {
    if (!listing.measurements || typeof listing.measurements !== 'object') {
      return null;
    }

    const measurements = listing.measurements as Record<string, any>;
    const measurementEntries = Object.entries(measurements).filter(([_, value]) => value);

    if (measurementEntries.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Package className="w-4 h-4" />
          Measurements
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {measurementEntries.map(([key, value], index) => (
            <div key={index} className="flex justify-between">
              <span className="text-sm text-gray-600 capitalize">{key.replace('_', ' ')}:</span>
              <span className="text-sm font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFinancialInfo = () => {
    const hasFinancialData = listing.purchase_price || listing.cost_basis || listing.profit_margin;
    if (!hasFinancialData) return null;

    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Financial Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {listing.purchase_price && (
            <div className="text-center p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Purchase Price</p>
              <p className="text-lg font-semibold">${listing.purchase_price}</p>
            </div>
          )}
          {listing.profit_margin && (
            <div className="text-center p-3 bg-green-50 rounded">
              <p className="text-sm text-gray-600">Profit Margin</p>
              <p className="text-lg font-semibold text-green-600">{listing.profit_margin}%</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSourceInfo = () => {
    const hasSourceData = listing.source_type || listing.source_location || listing.purchase_date;
    if (!hasSourceData) return null;

    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Source Information
        </h3>
        <div className="space-y-2">
          {listing.source_type && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Source Type:</span>
              <Badge variant="secondary">{listing.source_type}</Badge>
            </div>
          )}
          {listing.source_location && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Location:</span>
              <span className="text-sm">{listing.source_location}</span>
            </div>
          )}
          {listing.purchase_date && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Purchase Date:</span>
              <span className="text-sm">{new Date(listing.purchase_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex-1 pr-4">
            <h2 className="text-xl font-semibold mb-2">{listing.title}</h2>
            <div className="flex flex-wrap gap-2">
              <Badge variant={listing.status === 'active' ? 'default' : 'secondary'}>
                {listing.status}
              </Badge>
              <Badge variant="outline">{(() => {
                const category = listing.category;
                if (category && typeof category === 'object' && 'primary' in category) {
                  return String((category as any).primary || 'No category');
                }
                return String(category || 'No category');
              })()}</Badge>
              <Badge variant="outline">{listing.condition || 'No condition'}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Image and Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <ListingImagePreview 
                  photos={listing.photos} 
                  title={listing.title}
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>
              <div className="md:col-span-2 space-y-4">
                {/* Pricing */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Pricing
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">List Price</p>
                        <p className="text-2xl font-bold text-green-600">${listing.price}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Shipping</p>
                        <p className="text-lg font-medium">
                          {listing.shipping_cost === 0 ? (
                            <span className="text-green-600">Free</span>
                          ) : (
                            `$${listing.shipping_cost ?? 9.95}`
                          )}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Total</p>
                        <p className="text-lg font-semibold">
                          ${(listing.price + (listing.shipping_cost ?? 9.95)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Description */}
                {listing.description && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Description
                      </h3>
                      <p className="text-gray-700 leading-relaxed">{listing.description}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <Separator />

            {/* Size Information */}
            {renderSizeInfo()}
            
            {renderSizeInfo() && <Separator />}

            {/* Measurements */}
            {renderMeasurements()}
            
            {renderMeasurements() && <Separator />}

            {/* Financial Information */}
            {renderFinancialInfo()}
            
            {renderFinancialInfo() && <Separator />}

            {/* Source Information */}
            {renderSourceInfo()}
            
            {renderSourceInfo() && <Separator />}

            {/* Keywords */}
            {listing.keywords && listing.keywords.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {listing.keywords.map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <SimpleListingEditModal
          listing={listing}
          onClose={handleEditClose}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
};

export default SimpleListingModal;