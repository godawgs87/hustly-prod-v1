import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SKUValidationResult {
  isValid: boolean;
  isAvailable: boolean;
  error?: string;
}

export const useSKUManagement = () => {
  const { toast } = useToast();

  const validateSKU = (sku: string): { isValid: boolean; error?: string } => {
    if (!sku) {
      return { isValid: false, error: 'SKU is required' };
    }

    // eBay SKU requirements: alphanumeric, hyphens, underscores, max 50 chars
    const skuRegex = /^[a-zA-Z0-9\-_]+$/;
    
    if (!skuRegex.test(sku)) {
      return { isValid: false, error: 'SKU can only contain letters, numbers, hyphens, and underscores' };
    }

    if (sku.length > 50) {
      return { isValid: false, error: 'SKU must be 50 characters or less' };
    }

    if (sku.length < 3) {
      return { isValid: false, error: 'SKU must be at least 3 characters' };
    }

    return { isValid: true };
  };

  const checkSKUAvailability = async (sku: string, excludeId?: string): Promise<boolean> => {
    try {
      let query = supabase
        .from('listings')
        .select('id')
        .eq('sku', sku);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('Error checking SKU availability:', error);
        return false;
      }

      return !data; // Available if no existing record found
    } catch (error) {
      console.error('Error checking SKU availability:', error);
      return false;
    }
  };

  const validateSKUComplete = async (sku: string, excludeId?: string): Promise<SKUValidationResult> => {
    const validation = validateSKU(sku);
    if (!validation.isValid) {
      return { isValid: false, isAvailable: false, error: validation.error };
    }

    const isAvailable = await checkSKUAvailability(sku, excludeId);
    
    return {
      isValid: validation.isValid,
      isAvailable,
      error: !isAvailable ? 'SKU is already in use' : undefined
    };
  };

  const generateSKU = async (prefix: string = 'SKU'): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('generate_sku', { prefix });

      if (error) {
        console.error('Error generating SKU:', error);
        toast({
          title: "SKU Generation Failed",
          description: "Could not generate a unique SKU. Please try again.",
          variant: "destructive"
        });
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error generating SKU:', error);
      return null;
    }
  };

  const bulkGenerateSKUs = async (listingIds: string[], prefix: string = 'SKU'): Promise<boolean> => {
    try {
      const updates = [];
      
      for (const id of listingIds) {
        const sku = await generateSKU(prefix);
        if (sku) {
          updates.push({ id, sku });
        }
      }

      if (updates.length === 0) {
        return false;
      }

      // Update listings with new SKUs
      for (const update of updates) {
        const { error } = await supabase
          .from('listings')
          .update({ sku: update.sku })
          .eq('id', update.id);

        if (error) {
          console.error('Error updating SKU:', error);
          return false;
        }
      }

      toast({
        title: "SKUs Generated",
        description: `Successfully generated ${updates.length} SKUs`,
      });

      return true;
    } catch (error) {
      console.error('Error in bulk SKU generation:', error);
      return false;
    }
  };

  return {
    validateSKU,
    checkSKUAvailability,
    validateSKUComplete,
    generateSKU,
    bulkGenerateSKUs
  };
};