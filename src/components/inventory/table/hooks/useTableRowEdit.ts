import { useState } from 'react';
import type { Listing } from '@/types/Listing';

export const useTableRowEdit = (listing: Listing, onUpdateListing?: (listingId: string, updates: Partial<Listing>) => Promise<boolean>) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Listing>>({});

  const isEditing = editingId === listing.id;

  const handleEdit = () => {
    console.log('🔄 Starting edit for listing:', listing.id);
    setEditingId(listing.id);
    const initialEditData = {
      title: listing.title,
      price: listing.price,
      status: listing.status,
      category: listing.category,
      condition: listing.condition,
      shipping_cost: listing.shipping_cost,
      ebay_category_id: listing.ebay_category_id,
      ebay_category_path: listing.ebay_category_path
    };
    console.log('📝 Initial edit data set:', initialEditData);
    setEditData(initialEditData);
  };

  const handleSave = async () => {
    console.log('💾 handleSave called:', { listingId: listing.id, editData, hasUpdateFn: !!onUpdateListing });
    
    if (!onUpdateListing) {
      console.error('❌ No update function provided');
      return;
    }

    if (Object.keys(editData).length === 0) {
      console.warn('⚠️ No edit data to save');
      return;
    }

    try {
      console.log('🔄 Calling onUpdateListing with:', { listingId: listing.id, editData });
      const success = await onUpdateListing(listing.id, editData);
      console.log('📥 Update result:', success);
      
      if (success) {
        console.log('✅ Save successful, clearing edit state immediately');
        // Clear edit state immediately to force re-render with fresh data
        setEditingId(null);
        setEditData({});
      } else {
        console.error('❌ Update returned false');
      }
    } catch (error) {
      console.error('❌ Save exception:', error);
    }
  };

  const handleCancel = () => {
    console.log('❌ Edit cancelled for listing:', listing.id);
    setEditingId(null);
    setEditData({});
  };

  const updateEditData = (field: keyof Listing, value: any) => {
    console.log('🔄 updateEditData called:', { 
      listingId: listing.id,
      field, 
      value, 
      valueType: typeof value,
      currentEditData: editData 
    });
    
    setEditData(prev => {
      const newData = { ...prev, [field]: value };
      console.log('📝 Updated edit data:', newData);
      return newData;
    });
  };

  return {
    isEditing,
    editData,
    handleEdit,
    handleSave,
    handleCancel,
    updateEditData
  };
};