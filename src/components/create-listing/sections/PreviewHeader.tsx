
import React from 'react';
import { Badge } from '@/components/ui/badge';
import InlineEditableField from './InlineEditableField';
import { ListingData } from '@/types/CreateListing';

interface PreviewHeaderProps {
  listingData: ListingData;
  onUpdate: (updates: Partial<ListingData>) => void;
}

const PreviewHeader = ({ listingData, onUpdate }: PreviewHeaderProps) => {
  const conditionOptions = ['New', 'Like New', 'Used', 'Fair', 'Poor'];

  return (
    <div className="space-y-4 p-6 border-b">
      <InlineEditableField
        label="Title"
        value={listingData.title}
        onSave={(value) => onUpdate({ title: value as string })}
        displayClassName="text-xl font-bold text-gray-900"
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InlineEditableField
          label="Price"
          value={listingData.price}
          type="number"
          onSave={(value) => onUpdate({ price: value as number })}
          displayClassName="text-2xl font-bold text-green-600"
        />
        
        <InlineEditableField
          label="Condition"
          value={listingData.condition}
          type="select"
          options={conditionOptions}
          onSave={(value) => onUpdate({ condition: value as string })}
          displayClassName="text-lg font-semibold"
        />
        
        <div>
          <div className="text-sm text-gray-500 mb-1">Category</div>
          <Badge variant="secondary" className="text-sm">
            {listingData.category}
          </Badge>
        </div>
      </div>
      
      <InlineEditableField
        label="Description"
        value={listingData.description}
        type="textarea"
        onSave={(value) => onUpdate({ description: value as string })}
        displayClassName="text-gray-700 leading-relaxed"
      />
    </div>
  );
};

export default PreviewHeader;
