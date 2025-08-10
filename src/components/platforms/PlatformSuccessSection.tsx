import React from 'react';
import { Button } from '@/components/ui/button';
import { PlatformRegistry } from '@/services/platforms/PlatformRegistry';

interface PlatformSuccessSectionProps {
  platformId: string;
  onImportTrainingData?: () => void;
  importing?: boolean;
}

export const PlatformSuccessSection: React.FC<PlatformSuccessSectionProps> = ({
  platformId,
  onImportTrainingData,
  importing = false
}) => {
  const platform = PlatformRegistry.getInstance().get(platformId);
  const platformName = platform?.name || platformId;
  
  // Platform-specific features
  const getPlatformFeatures = () => {
    switch (platformId) {
      case 'ebay':
        return [
          'AI will analyze your successful sales patterns',
          'Auto-generate listings that match your style',
          'Sync inventory and pricing across platforms',
          'Track performance and optimize listings'
        ];
      case 'poshmark':
        return [
          'Share listings to Poshmark parties',
          'Auto-follow and share community listings',
          'Optimize pricing based on market trends',
          'Track offers and bundle opportunities'
        ];
      case 'mercari':
        return [
          'Smart pricing recommendations',
          'Automated relisting for unsold items',
          'Track shipping discounts and promotions',
          'Monitor competitor pricing'
        ];
      case 'whatnot':
        return [
          'Schedule live show listings',
          'Manage auction and buy-now formats',
          'Track viewer engagement metrics',
          'Optimize show timing and categories'
        ];
      case 'depop':
        return [
          'Style-based listing recommendations',
          'Hashtag optimization for discovery',
          'Track trending items and styles',
          'Engage with buyer community'
        ];
      default:
        return [
          'Sync inventory across platforms',
          'Track sales performance',
          'Optimize listing strategies',
          'Manage cross-platform operations'
        ];
    }
  };

  const features = getPlatformFeatures();
  const showImportButton = platformId === 'ebay' && onImportTrainingData;

  return (
    <div className="mt-4 pl-11 space-y-4">
      <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg border border-green-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            ✓
          </div>
          <div>
            <p className="font-medium text-green-900">{platformName} Connected</p>
            <p className="text-sm text-green-700">Ready to sync listings and manage inventory</p>
          </div>
        </div>
        {showImportButton && (
          <Button 
            onClick={onImportTrainingData}
            disabled={importing}
            size="sm"
            variant="outline"
            className="border-green-300 text-green-700 hover:bg-green-100"
          >
            {importing ? 'Importing...' : 'Import Training Data'}
          </Button>
        )}
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h5 className="font-medium text-blue-900 mb-2">What happens next:</h5>
        <ul className="text-sm text-blue-800 space-y-1">
          {features.map((feature, index) => (
            <li key={index}>• {feature}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
