
import React from 'react';
import type { Listing } from '@/types/Listing';

interface InventoryStatsProps {
  listings: Listing[];
}

const InventoryStats = ({ listings }: InventoryStatsProps) => {
  const stats = {
    totalItems: listings?.length || 0,
    totalValue: listings?.reduce((sum, item) => sum + (item?.price || 0), 0) || 0,
    activeItems: listings?.filter(item => item?.status === 'active')?.length || 0,
    draftItems: listings?.filter(item => item?.status === 'draft')?.length || 0
  };

  return (
    <div className="grid grid-cols-2 gap-3 w-full sm:max-w-md">
      <div className="flex flex-col items-center p-3 bg-blue-50 rounded-lg aspect-square justify-center">
        <div className="w-2 h-2 bg-blue-500 rounded-full mb-1"></div>
        <span className="font-bold text-blue-600 text-lg">{stats.totalItems}</span>
        <span className="text-gray-600 text-xs text-center">Items</span>
      </div>
      <div className="flex flex-col items-center p-3 bg-green-50 rounded-lg aspect-square justify-center">
        <div className="w-2 h-2 bg-green-500 rounded-full mb-1"></div>
        <span className="font-bold text-green-600 text-lg">${stats.totalValue.toFixed(0)}</span>
        <span className="text-gray-600 text-xs text-center">Value</span>
      </div>
      <div className="flex flex-col items-center p-3 bg-purple-50 rounded-lg aspect-square justify-center">
        <div className="w-2 h-2 bg-purple-500 rounded-full mb-1"></div>
        <span className="font-bold text-purple-600 text-lg">{stats.activeItems}</span>
        <span className="text-gray-600 text-xs text-center">Active</span>
      </div>
      <div className="flex flex-col items-center p-3 bg-orange-50 rounded-lg aspect-square justify-center">
        <div className="w-2 h-2 bg-orange-500 rounded-full mb-1"></div>
        <span className="font-bold text-orange-600 text-lg">{stats.draftItems}</span>
        <span className="text-gray-600 text-xs text-center">Drafts</span>
      </div>
    </div>
  );
};

export default InventoryStats;
