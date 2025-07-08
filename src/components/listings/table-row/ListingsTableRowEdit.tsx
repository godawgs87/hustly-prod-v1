
import React, { useState, useEffect } from 'react';
import { TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListingService } from '@/services/ListingService';
import EditableFields from './edit/EditableFields';
import EditableMeasurements from './edit/EditableMeasurements';
import EditActionButtons from './edit/EditActionButtons';
import EditableCategoryCell from './cells/EditableCategoryCell';
import type { Listing } from '@/types/Listing';

interface VisibleColumns {
  image: boolean;
  title: boolean;
  price: boolean;
  status: boolean;
  category: boolean;
  condition: boolean;
  shipping: boolean;
  measurements: boolean;
  keywords: boolean;
  description: boolean;
  purchasePrice: boolean;
  purchaseDate: boolean;
  consignmentStatus: boolean;
  sourceType: boolean;
  sourceLocation: boolean;
  costBasis: boolean;
  netProfit: boolean;
  profitMargin: boolean;
  daysToSell: boolean;
  performanceNotes: boolean;
  sku: boolean;
}

interface ListingsTableRowEditProps {
  listing: Listing;
  visibleColumns: VisibleColumns;
  onSave: (updates: Partial<Listing>) => void;
  onCancel: () => void;
}

const ListingsTableRowEdit = ({ listing, visibleColumns, onSave, onCancel }: ListingsTableRowEditProps) => {
  const [detailedListing, setDetailedListing] = useState<any>(listing);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [editData, setEditData] = useState({
    title: listing.title,
    price: listing.price,
    category: listing.category || '',
    ebay_category_id: listing.ebay_category_id || '',
    condition: listing.condition || '',
    status: listing.status || 'draft',
    shipping_cost: listing.shipping_cost !== null ? listing.shipping_cost : 0,
    purchase_price: listing.purchase_price || 0,
    purchase_date: listing.purchase_date || '',
    source_type: listing.source_type || '',
    source_location: listing.source_location || '',
    consignor_name: listing.consignor_name || '',
    consignor_contact: listing.consignor_contact || '',
    consignment_percentage: listing.consignment_percentage || 0,
    clothing_size: listing.clothing_size || '',
    shoe_size: listing.shoe_size || '',
    gender: listing.gender || '' as '' | 'Men' | 'Women' | 'Kids' | 'Unisex',
    age_group: listing.age_group || '' as '' | 'Adult' | 'Youth' | 'Toddler' | 'Baby',
    performance_notes: listing.performance_notes || '',
    sku: listing.sku || '',
    measurements: listing.measurements || { length: '', width: '', height: '', weight: '' }
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadListingDetails = async () => {
      try {
        setLoadingDetails(true);
        const details = await ListingService.getListingById(listing.id);
        if (details) {
          const mergedListing = { ...listing, ...details };
          setDetailedListing(mergedListing);
          
          setEditData(prev => ({
            ...prev,
            shipping_cost: details.shipping_cost !== null ? details.shipping_cost : 0,
            measurements: details.measurements || { length: '', width: '', height: '', weight: '' },
            clothing_size: details.clothing_size || '',
            shoe_size: details.shoe_size || '',
            gender: details.gender || '',
            age_group: details.age_group || '',
            purchase_date: details.purchase_date || '',
            consignor_name: details.consignor_name || '',
            consignor_contact: details.consignor_contact || '',
            performance_notes: details.performance_notes || ''
          }));
        }
      } finally {
        setLoadingDetails(false);
      }
    };

    loadListingDetails();
  }, [listing.id]);

  const handleFieldUpdate = (field: string, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleMeasurementUpdate = (field: string, value: string) => {
    setEditData(prev => ({
      ...prev,
      measurements: { ...prev.measurements, [field]: value }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Partial<Listing> = {};
      
      // Copy all fields except gender and age_group first
      Object.entries(editData).forEach(([key, value]) => {
        if (key !== 'gender' && key !== 'age_group') {
          if (value === '') {
            (updates as any)[key] = null;
          } else {
            (updates as any)[key] = value;
          }
        }
      });
      
      // Handle gender field - convert empty string to null for type safety
      if (editData.gender === '') {
        updates.gender = null;
      } else {
        updates.gender = editData.gender as 'Men' | 'Women' | 'Kids' | 'Unisex';
      }
      
      // Handle age_group field - convert empty string to null for type safety
      if (editData.age_group === '') {
        updates.age_group = null;
      } else {
        updates.age_group = editData.age_group as 'Adult' | 'Youth' | 'Toddler' | 'Baby';
      }
      
      if (editData.measurements) {
        updates.measurements = editData.measurements;
      }
      
      await onSave(updates);
    } finally {
      setIsSaving(false);
    }
  };

  const isLoadingData = loadingDetails;

  return (
    <>
      {visibleColumns.image && (
        <TableCell className="sticky left-12 bg-white z-10 border-r">
          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
            {detailedListing.photos && detailedListing.photos.length > 0 ? (
              <img 
                src={detailedListing.photos[0]} 
                alt={detailedListing.title}
                className="w-full h-full object-cover rounded"
              />
            ) : (
              <span className="text-xs text-gray-400">No image</span>
            )}
          </div>
        </TableCell>
      )}

      {visibleColumns.title && (
        <TableCell className="sticky left-28 bg-white z-10 border-r min-w-[250px]">
          <EditableFields 
            editData={editData} 
            onUpdate={handleFieldUpdate}
          />
        </TableCell>
      )}

      {visibleColumns.category && (
        <TableCell className="min-w-48">
          <EditableCategoryCell
            category={editData.category}
            ebayCategory={editData.ebay_category_id}
            ebayPath={detailedListing.ebay_category_path}
            onSave={async (categoryId, categoryPath) => {
              console.log('🔄 ListingsTableRowEdit: Category selected', { categoryId, categoryPath });
              handleFieldUpdate('ebay_category_id', categoryId);
              handleFieldUpdate('ebay_category_path', categoryPath);
              // Also update the legacy category field for backward compatibility
              const firstCategory = categoryPath.split(' > ')[0] || '';
              handleFieldUpdate('category', firstCategory);
              
              // Auto-save the category selection
              setIsSaving(true);
              try {
                const updates: Partial<Listing> = {
                  ebay_category_id: categoryId,
                  ebay_category_path: categoryPath,
                  category: firstCategory
                };
                await onSave(updates);
                console.log('✅ ListingsTableRowEdit: Category auto-saved');
              } catch (error) {
                console.error('❌ Failed to auto-save category:', error);
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={isSaving}
          />
        </TableCell>
      )}

      {visibleColumns.measurements && (
        <TableCell>
          <EditableMeasurements
            measurements={editData.measurements}
            onUpdate={handleMeasurementUpdate}
            isLoading={loadingDetails}
          />
        </TableCell>
      )}

      {visibleColumns.keywords && (
        <TableCell>
          <div className="text-sm text-gray-600">
            {detailedListing.keywords?.join(', ') || '-'}
          </div>
        </TableCell>
      )}

      {visibleColumns.description && (
        <TableCell>
          <div className="text-sm text-gray-600 max-w-[200px] truncate">
            {detailedListing.description || '-'}
          </div>
        </TableCell>
      )}

      {visibleColumns.purchasePrice && (
        <TableCell>
          <Input
            type="number"
            value={editData.purchase_price}
            onChange={(e) => handleFieldUpdate('purchase_price', Number(e.target.value))}
            className="w-20 text-sm"
            placeholder="0"
          />
        </TableCell>
      )}

      {visibleColumns.purchaseDate && (
        <TableCell>
          <Input
            type="date"
            value={editData.purchase_date}
            onChange={(e) => handleFieldUpdate('purchase_date', e.target.value)}
            className="w-32 text-sm"
          />
        </TableCell>
      )}

      {visibleColumns.consignmentStatus && (
        <TableCell>
          <div className="space-y-1">
            <Input
              placeholder="Consignor"
              value={editData.consignor_name}
              onChange={(e) => handleFieldUpdate('consignor_name', e.target.value)}
              className="w-24 text-xs"
            />
            <Input
              type="number"
              placeholder="%"
              value={editData.consignment_percentage}
              onChange={(e) => handleFieldUpdate('consignment_percentage', Number(e.target.value))}
              className="w-16 text-xs"
            />
          </div>
        </TableCell>
      )}

      {visibleColumns.sourceType && (
        <TableCell>
          <Select value={editData.source_type} onValueChange={(value) => handleFieldUpdate('source_type', value)}>
            <SelectTrigger className="w-24 text-xs">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Thrift Store">Thrift Store</SelectItem>
              <SelectItem value="Estate Sale">Estate Sale</SelectItem>
              <SelectItem value="Garage Sale">Garage Sale</SelectItem>
              <SelectItem value="Online">Online</SelectItem>
              <SelectItem value="Auction">Auction</SelectItem>
              <SelectItem value="Consignment">Consignment</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
      )}

      {visibleColumns.sourceLocation && (
        <TableCell>
          <Input
            value={editData.source_location}
            onChange={(e) => handleFieldUpdate('source_location', e.target.value)}
            className="w-32 text-sm"
            placeholder="Location"
          />
        </TableCell>
      )}

      {visibleColumns.costBasis && <TableCell>-</TableCell>}
      {visibleColumns.netProfit && <TableCell>-</TableCell>}
      {visibleColumns.profitMargin && <TableCell>-</TableCell>}
      {visibleColumns.daysToSell && <TableCell>-</TableCell>}

      {visibleColumns.performanceNotes && (
        <TableCell>
          <Input
            value={editData.performance_notes}
            onChange={(e) => handleFieldUpdate('performance_notes', e.target.value)}
            className="w-32 text-sm"
            placeholder="Notes"
          />
        </TableCell>
      )}

      {visibleColumns.sku && (
        <TableCell>
          <Input
            value={editData.sku}
            onChange={(e) => handleFieldUpdate('sku', e.target.value)}
            className="w-32 text-sm"
            placeholder="SKU"
          />
        </TableCell>
      )}

      <TableCell className="sticky right-0 bg-white z-10 border-l">
        <EditActionButtons
          onSave={handleSave}
          onCancel={onCancel}
          isSaving={isSaving}
          isLoadingData={isLoadingData}
        />
      </TableCell>
    </>
  );
};

export default ListingsTableRowEdit;
