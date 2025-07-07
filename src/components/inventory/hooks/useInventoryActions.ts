import { useCallback } from 'react';
import { useInventoryStore } from '@/stores/inventoryStore';
import type { Listing } from '@/types/Listing';

export const useInventoryActions = () => {
  const {
    selectedIds,
    setSelectedIds,
    updateListing,
    deleteListing,
    duplicateListing
  } = useInventoryStore();

  const handleSelectListing = useCallback((listingId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, listingId]);
    } else {
      setSelectedIds(selectedIds.filter(id => id !== listingId));
    }
  }, [selectedIds, setSelectedIds]);

  const handleSelectAll = useCallback((checked: boolean, listings: Listing[]) => {
    setSelectedIds(checked ? listings.map(l => l.id) : []);
  }, [setSelectedIds]);

  const handleUpdateListing = useCallback(async (listingId: string, updates: any): Promise<boolean> => {
    console.log('🔄 useInventoryActions.handleUpdateListing called:', { 
      listingId, 
      updates,
      updateKeys: Object.keys(updates)
    });
    
    try {
      console.log('🔄 Calling store.updateListing');
      const success = await updateListing(listingId, updates);
      console.log('📥 updateListing result:', success);
      
      if (success) {
        console.log('✅ Listing updated successfully');
        return true;
      } else {
        console.error('❌ Update operation returned false');
        return false;
      }
    } catch (error) {
      console.error('❌ useInventoryActions update exception:', error);
      return false;
    }
  }, [updateListing]);

  const handleDeleteListing = useCallback(async (listingId: string): Promise<void> => {
    try {
      const success = await deleteListing(listingId);
      if (success) {
        setSelectedIds(selectedIds.filter(id => id !== listingId));
      }
    } catch (error) {
      console.error('Failed to delete listing:', error);
      throw error;
    }
  }, [deleteListing, selectedIds, setSelectedIds]);

  const handleDuplicateListing = useCallback(async (listing: any) => {
    try {
      const result = await duplicateListing(listing);
      return result;
    } catch (error) {
      console.error('Failed to duplicate listing:', error);
      return null;
    }
  }, [duplicateListing]);

  const handleBulkDelete = useCallback(async (selectedIds: string[]): Promise<void> => {
    try {
      // Delete all selected items
      const deletePromises = selectedIds.map(id => deleteListing(id));
      await Promise.all(deletePromises);
      
      // Clear selection
      setSelectedIds([]);
    } catch (error) {
      console.error('Failed to delete listings:', error);
      throw error;
    }
  }, [deleteListing, setSelectedIds]);

  return {
    handleSelectListing,
    handleSelectAll,
    handleUpdateListing,
    handleDeleteListing,
    handleDuplicateListing,
    handleBulkDelete
  };
};