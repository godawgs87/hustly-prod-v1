
import React from 'react';
import { Button } from '@/components/ui/button';
import { TrendingUp, ExternalLink } from 'lucide-react';

interface PricingTipProps {
  onOpenPricingResearch?: () => void;
}

const PricingTip = ({ onOpenPricingResearch }: PricingTipProps) => {
  return (
    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            💡 Pricing Tip
          </h4>
          <p className="text-sm text-yellow-700 mb-3">
            For used items, research "sold listings" on eBay to find competitive prices. 
            Items in "Used - Good" condition typically sell for 60-75% of retail price.
          </p>
        </div>
      </div>
      
      {onOpenPricingResearch && (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onOpenPricingResearch}
            className="bg-white border-yellow-300 text-yellow-800 hover:bg-yellow-50"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Research Pricing
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            className="text-yellow-700 hover:bg-yellow-100"
            onClick={() => window.open('https://www.ebay.com/sch/ebayadvsearch', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            eBay Advanced Search
          </Button>
        </div>
      )}
    </div>
  );
};

export default PricingTip;
