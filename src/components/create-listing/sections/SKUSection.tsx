import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Check, X, AlertCircle } from 'lucide-react';
import { useSKUManagement } from '@/hooks/useSKUManagement';
import { ListingData } from '@/types/CreateListing';

interface SKUSectionProps {
  listingData: ListingData;
  onUpdate: (updates: Partial<ListingData>) => void;
}

const SKUSection = ({ listingData, onUpdate }: SKUSectionProps) => {
  const [isChecking, setIsChecking] = useState(false);
  const [skuStatus, setSKUStatus] = useState<'unknown' | 'valid' | 'invalid' | 'taken'>('unknown');
  const [error, setError] = useState<string>('');
  const { validateSKUComplete, generateSKU } = useSKUManagement();

  const checkSKU = async (sku: string) => {
    if (!sku) {
      setSKUStatus('unknown');
      setError('');
      return;
    }

    setIsChecking(true);
    try {
      const result = await validateSKUComplete(sku);
      
      if (!result.isValid) {
        setSKUStatus('invalid');
        setError(result.error || 'Invalid SKU format');
      } else if (!result.isAvailable) {
        setSKUStatus('taken');
        setError('SKU is already in use');
      } else {
        setSKUStatus('valid');
        setError('');
      }
    } catch (err) {
      setSKUStatus('invalid');
      setError('Error validating SKU');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (listingData.sku) {
      const timer = setTimeout(() => checkSKU(listingData.sku!), 500);
      return () => clearTimeout(timer);
    } else {
      setSKUStatus('unknown');
      setError('');
    }
  }, [listingData.sku]);

  const handleAutoGenerateToggle = async (enabled: boolean) => {
    onUpdate({ auto_generate_sku: enabled });
    
    if (enabled && !listingData.sku) {
      const newSKU = await generateSKU(listingData.sku_prefix || 'SKU');
      if (newSKU) {
        onUpdate({ sku: newSKU });
      }
    }
  };

  const handleGenerateNew = async () => {
    const newSKU = await generateSKU(listingData.sku_prefix || 'SKU');
    if (newSKU) {
      onUpdate({ sku: newSKU });
    }
  };

  const getStatusIcon = () => {
    if (isChecking) return <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />;
    
    switch (skuStatus) {
      case 'valid':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'invalid':
      case 'taken':
        return <X className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    switch (skuStatus) {
      case 'valid':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Available</Badge>;
      case 'invalid':
        return <Badge variant="destructive">Invalid</Badge>;
      case 'taken':
        return <Badge variant="destructive">Taken</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">SKU Management</h3>
          <div className="flex items-center space-x-2">
            <Switch
              checked={listingData.auto_generate_sku ?? true}
              onCheckedChange={handleAutoGenerateToggle}
            />
            <label className="text-sm font-medium">Auto-generate</label>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SKU Prefix
            </label>
            <Input
              value={listingData.sku_prefix || 'SKU'}
              onChange={(e) => onUpdate({ sku_prefix: e.target.value })}
              placeholder="SKU"
              className="w-32"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used for auto-generated SKUs
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SKU
            </label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Input
                  value={listingData.sku || ''}
                  onChange={(e) => onUpdate({ sku: e.target.value })}
                  placeholder="Enter SKU or let it auto-generate"
                  disabled={listingData.auto_generate_sku}
                  className="pr-8"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  {getStatusIcon()}
                </div>
              </div>
              
              {getStatusBadge()}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateNew}
                disabled={isChecking}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            
            {error && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
            
            <p className="text-xs text-muted-foreground mt-1">
              SKU must be unique and contain only letters, numbers, hyphens, and underscores (max 50 characters)
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SKUSection;