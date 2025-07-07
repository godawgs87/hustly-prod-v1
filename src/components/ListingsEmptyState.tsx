
import React from 'react';

interface ListingsEmptyStateProps {
  message?: string;
}

const ListingsEmptyState = ({ message = "No listings found. Create your first listing to get started!" }: ListingsEmptyStateProps) => {
  return (
    <div className="text-center py-12 text-gray-500">
      {message}
    </div>
  );
};

export default ListingsEmptyState;
