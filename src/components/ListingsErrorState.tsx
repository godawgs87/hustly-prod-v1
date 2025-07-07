
import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ListingsErrorStateProps {
  error: string;
}

const ListingsErrorState = ({ error }: ListingsErrorStateProps) => {
  return (
    <div className="text-red-500 flex items-center bg-red-50 p-4 rounded-lg">
      <AlertCircle className="mr-2 h-4 w-4" />
      <div>
        <p className="font-medium">Connection timeout</p>
        <p className="text-sm">Please check your internet connection and try refreshing the page.</p>
      </div>
    </div>
  );
};

export default ListingsErrorState;
