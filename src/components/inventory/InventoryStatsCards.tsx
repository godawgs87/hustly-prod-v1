
import React from 'react';
import { Card } from '@/components/ui/card';

interface InventoryStats {
  totalItems: number;
  totalValue: number;
  activeItems: number;
  draftItems: number;
}

interface InventoryStatsCardsProps {
  stats: InventoryStats;
}

const InventoryStatsCards = ({ stats }: InventoryStatsCardsProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.totalItems}</div>
          <div className="text-sm text-blue-700">Total Items</div>
        </div>
      </Card>
      <Card className="p-4 bg-gradient-to-r from-green-50 to-green-100 border-green-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">${stats.totalValue.toFixed(0)}</div>
          <div className="text-sm text-green-700">Total Value</div>
        </div>
      </Card>
      <Card className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.activeItems}</div>
          <div className="text-sm text-purple-700">Active</div>
        </div>
      </Card>
      <Card className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.draftItems}</div>
          <div className="text-sm text-orange-700">Drafts</div>
        </div>
      </Card>
    </div>
  );
};

export default InventoryStatsCards;
