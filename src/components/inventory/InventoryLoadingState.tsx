
import React from 'react';
import { Card } from '@/components/ui/card';

const InventoryLoadingState = () => {
  return (
    <Card className="p-8 text-center">
      <div className="flex items-center justify-center space-x-2">
        <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        <div className="text-gray-500">Loading inventory...</div>
      </div>
    </Card>
  );
};

export default InventoryLoadingState;
