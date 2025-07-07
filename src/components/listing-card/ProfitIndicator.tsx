
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ProfitIndicatorProps {
  purchasePrice?: number;
  price: number;
  netProfit?: number;
  profitMargin?: number;
}

const ProfitIndicator = ({ purchasePrice, price, netProfit, profitMargin }: ProfitIndicatorProps) => {
  // Calculate estimated profit if we have purchase price
  const estimatedProfit = purchasePrice ? price - purchasePrice : netProfit;
  const estimatedMargin = purchasePrice ? ((price - purchasePrice) / price) * 100 : profitMargin;

  if (!estimatedProfit && estimatedProfit !== 0) {
    return null;
  }

  const getIndicatorData = () => {
    if (estimatedProfit > 0) {
      return {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: TrendingUp,
        text: `+$${estimatedProfit.toFixed(2)}`
      };
    } else if (estimatedProfit < 0) {
      return {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: TrendingDown,
        text: `-$${Math.abs(estimatedProfit).toFixed(2)}`
      };
    } else {
      return {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: Minus,
        text: 'Break even'
      };
    }
  };

  const { color, icon: Icon, text } = getIndicatorData();

  return (
    <div className="flex items-center gap-1">
      <Badge className={`${color} text-xs flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {text}
      </Badge>
      {estimatedMargin && (
        <span className="text-xs text-gray-500">
          ({estimatedMargin > 0 ? '+' : ''}{estimatedMargin.toFixed(1)}%)
        </span>
      )}
    </div>
  );
};

export default ProfitIndicator;
