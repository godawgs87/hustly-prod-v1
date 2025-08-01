import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Edit, CheckCircle, AlertTriangle, DollarSign } from 'lucide-react';
import type { PhotoGroup } from '../BulkUploadManager';

interface BulkFinalReviewStepProps {
  photoGroups: PhotoGroup[];
  onEditItem: (groupId: string) => void;
  onPreviewItem: (groupId: string) => void;
  onPostAll: () => void;
  onBackToShipping: () => void;
}

const BulkFinalReviewStep = ({
  photoGroups,
  onEditItem,
  onPreviewItem,
  onPostAll,
  onBackToShipping
}: BulkFinalReviewStepProps) => {
  
  // Calculate ready items (items with AI analysis completed)
  const readyItems = photoGroups.filter(group => 
    group.listingData?.title && 
    group.listingData?.title !== 'Needs Review - Listing Not Fully Generated'
  );
  
  const totalEstimatedValue = readyItems.reduce((sum, group) => 
    sum + (group.listingData?.price || 0), 0
  );

  // Platform fee calculations (rough estimates)
  const ebayPayout = totalEstimatedValue * 0.87; // ~13% fees
  const poshmarkPayout = totalEstimatedValue * 0.80; // ~20% fees
  const mercariPayout = totalEstimatedValue * 0.90; // ~10% fees

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={onBackToShipping}
            className="flex items-center gap-2"
          >
            ← Back to Shipping
          </Button>
          <h2 className="text-2xl font-bold text-gray-900">Final Review & Upload</h2>
        </div>
        <Button
          onClick={onPostAll}
          disabled={readyItems.length === 0}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-lg font-semibold"
        >
          📦 Upload All to Inventory ({readyItems.length})
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ready Items</p>
                <p className="text-2xl font-bold text-green-600">{readyItems.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-blue-600">${totalEstimatedValue}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Estimated Payouts</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>eBay:</span>
                  <span className="font-medium">${ebayPayout.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Poshmark:</span>
                  <span className="font-medium">${poshmarkPayout.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mercari:</span>
                  <span className="font-medium">${mercariPayout.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Needs Review</p>
                <p className="text-2xl font-bold text-orange-600">{photoGroups.length - readyItems.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Items Ready for Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Item</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Title</th>
                  <th className="text-left p-3 font-medium">Price</th>
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-left p-3 font-medium">Measurements</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {photoGroups.map((group) => {
                  const isReady = group.listingData?.title && 
                    group.listingData?.title !== 'Needs Review - Listing Not Fully Generated';
                  
                  return (
                    <tr key={group.id} className="border-b hover:bg-gray-50">
                      {/* Thumbnail + Name */}
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {group.photos[0] && (
                            <img
                              src={URL.createObjectURL(group.photos[0])}
                              alt={group.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div>
                            <p className="font-medium text-sm">{group.name}</p>
                            <p className="text-xs text-gray-500">{group.photos.length} photos</p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        {isReady ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Ready
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-800">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Review
                          </Badge>
                        )}
                      </td>

                      {/* Title */}
                      <td className="p-3">
                        <span className="text-sm">
                          {group.listingData?.title || 'No title generated'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="p-3">
                        <span className="text-sm font-medium">
                          ${group.listingData?.price || 25}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="p-3">
                        <span className="text-sm text-gray-600">
                          {group.listingData?.category || 'Uncategorized'}
                        </span>
                      </td>

                      {/* Measurements */}
                      <td className="p-3">
                        <span className="text-sm text-gray-600">
                          {group.listingData?.measurements && Object.keys(group.listingData.measurements).length > 0
                            ? Object.entries(group.listingData.measurements)
                                .filter(([key, value]) => value && value !== '')
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(', ')
                            : '-'
                          }
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditItem(group.id)}
                            className="flex items-center gap-1"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onPreviewItem(group.id)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            Preview
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Upload Warning */}
      {readyItems.length === 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">No Items Ready</p>
                <p className="text-sm text-orange-700">
                  Complete analysis for items before posting. Use the "Edit" button to manually complete any missing information.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkFinalReviewStep;
