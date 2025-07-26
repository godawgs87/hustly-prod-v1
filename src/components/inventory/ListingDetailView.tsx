import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit, X, DollarSign, Package, Calendar, User, MapPin, TrendingUp, Clock, FileText } from 'lucide-react';
import { ListingService } from '@/services/ListingService';
import ListingImagePreview from '@/components/ListingImagePreview';
import type { Listing } from '@/types/Listing';

interface ListingDetailViewProps {
  listing: Listing;
  onClose: () => void;
  onEdit?: () => void;
}

const ListingDetailView = ({ listing, onClose, onEdit }: ListingDetailViewProps) => {
  const [detailedListing, setDetailedListing] = useState<Listing>(listing);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const loadListingDetails = async () => {
      try {
        setIsLoading(true);
        const details = await ListingService.getListingById(listing.id);
        if (details && isMounted) {
          setDetailedListing(details);
        }
      } catch (error) {
        console.error('Error loading listing details:', error);
        // Use the passed listing as fallback
        if (isMounted) {
          setDetailedListing(listing);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadListingDetails();
    
    return () => {
      isMounted = false;
    };
  }, [listing.id, listing]);

  const renderSizeInfo = () => {
    const sizeFields = [
      { label: 'Gender', value: detailedListing.gender, color: 'blue' },
      { label: 'Age Group', value: detailedListing.age_group, color: 'purple' },
      { label: 'Clothing Size', value: detailedListing.clothing_size, color: 'green' },
      { label: 'Shoe Size', value: detailedListing.shoe_size, color: 'orange' }
    ].filter(field => field.value);

    if (sizeFields.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Size Information</h3>
        <div className="flex flex-wrap gap-2">
          {sizeFields.map((field, index) => (
            <Badge key={index} variant="outline">
              {field.label}: {field.value}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  const renderMeasurements = () => {
    if (!detailedListing.measurements || Object.keys(detailedListing.measurements).length === 0) {
      return null;
    }

    const measurements = detailedListing.measurements;
    const validMeasurements = Object.entries(measurements).filter(([_, value]) => value && value.toString().trim() !== '');

    if (validMeasurements.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Measurements</h3>
        <div className="grid grid-cols-2 gap-3">
          {validMeasurements.map(([key, value]) => (
            <div key={key} className="bg-gray-50 p-2 rounded">
              <span className="text-sm font-medium capitalize">{key}:</span>
              <span className="ml-2 text-sm">{value}"</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFinancialInfo = () => {
    const financialData = [
      { icon: DollarSign, label: 'Purchase Price', value: detailedListing.purchase_price ? `$${detailedListing.purchase_price}` : null },
      { icon: TrendingUp, label: 'Net Profit', value: detailedListing.net_profit ? `$${detailedListing.net_profit}` : null },
      { icon: TrendingUp, label: 'Profit Margin', value: detailedListing.profit_margin ? `${detailedListing.profit_margin}%` : null },
      { icon: DollarSign, label: 'Cost Basis', value: detailedListing.cost_basis ? `$${detailedListing.cost_basis}` : null },
      { icon: DollarSign, label: 'Fees Paid', value: detailedListing.fees_paid ? `$${detailedListing.fees_paid}` : null }
    ].filter(item => item.value);

    if (financialData.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Financial Information</h3>
        <div className="grid grid-cols-2 gap-3">
          {financialData.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-center space-x-2 bg-green-50 p-2 rounded">
                <Icon className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">{item.label}:</span>
                <span className="text-sm">{item.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderConsignmentInfo = () => {
    if (!detailedListing.is_consignment) return null;

    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Consignment Information</h3>
        <div className="bg-blue-50 p-3 rounded space-y-2">
          <Badge variant="outline" className="bg-blue-100 text-blue-800">Consignment Item</Badge>
          {detailedListing.consignor_name && (
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Consignor:</span>
              <span className="text-sm">{detailedListing.consignor_name}</span>
            </div>
          )}
          {detailedListing.consignor_contact && (
            <div className="text-sm text-gray-600">
              Contact: {detailedListing.consignor_contact}
            </div>
          )}
          {detailedListing.consignment_percentage && (
            <div className="text-sm">
              <span className="font-medium">Commission:</span> {detailedListing.consignment_percentage}%
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSourceInfo = () => {
    const sourceData = [
      { icon: MapPin, label: 'Source Type', value: detailedListing.source_type },
      { icon: MapPin, label: 'Source Location', value: detailedListing.source_location },
      { icon: Calendar, label: 'Purchase Date', value: detailedListing.purchase_date }
    ].filter(item => item.value);

    if (sourceData.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Source Information</h3>
        <div className="space-y-2">
          {sourceData.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <Icon className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{item.label}:</span>
                <span>{item.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPerformanceInfo = () => {
    const performanceData = [
      { icon: Calendar, label: 'Listed Date', value: detailedListing.listed_date },
      { icon: Calendar, label: 'Sold Date', value: detailedListing.sold_date },
      { icon: DollarSign, label: 'Sold Price', value: detailedListing.sold_price ? `$${detailedListing.sold_price}` : null },
      { icon: Clock, label: 'Days to Sell', value: detailedListing.days_to_sell ? `${detailedListing.days_to_sell} days` : null },
      { icon: FileText, label: 'Performance Notes', value: detailedListing.performance_notes }
    ].filter(item => item.value);

    if (performanceData.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Performance Tracking</h3>
        <div className="space-y-2">
          {performanceData.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <Icon className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{item.label}:</span>
                <span>{item.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{detailedListing.title}</h2>
            <p className="text-sm text-gray-600">View detailed information about this listing</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Badge variant={detailedListing.status === 'active' ? 'default' : 'secondary'}>
              {detailedListing.status}
            </Badge>
            <Badge variant="outline">{(() => {
              const category = detailedListing.category;
              if (category && typeof category === 'object' && 'primary' in category) {
                return String((category as any).primary || 'Uncategorized');
              }
              return String(category || 'Uncategorized');
            })()}</Badge>
            <Badge variant="outline">{detailedListing.condition}</Badge>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit} className="ml-auto">
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
          </div>

          <div className="space-y-6">
            {/* Image and Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <ListingImagePreview 
                  photos={detailedListing.photos} 
                  title={detailedListing.title}
                  className="w-full h-48"
                />
              </div>
              <div className="md:col-span-2 space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Pricing</h3>
                  <div className="flex items-center space-x-4">
                    <div className="bg-green-100 px-3 py-2 rounded">
                      <span className="text-lg font-bold text-green-600">${detailedListing.price}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      + ${detailedListing.shipping_cost || 9.95} shipping
                    </div>
                  </div>
                </div>
                
                {detailedListing.description && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{detailedListing.description}</p>
                  </div>
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

            {/* Consignment Information */}
            {renderConsignmentInfo()}
            
            {renderConsignmentInfo() && <Separator />}

            {/* Source Information */}
            {renderSourceInfo()}
            
            {renderSourceInfo() && <Separator />}

            {/* Performance Information */}
            {renderPerformanceInfo()}

            {/* Keywords */}
            {detailedListing.keywords && detailedListing.keywords.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {detailedListing.keywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingDetailView;
