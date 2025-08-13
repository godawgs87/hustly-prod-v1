import React from 'react';
import { TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { Listing } from '@/types/Listing';

interface EditableCellProps {
  field: keyof Listing;
  value: any;
  isEditing: boolean;
  onUpdate: (field: keyof Listing, value: any) => void;
  className?: string;
  listing?: Listing;
}

const EditableTableCell = ({ field, value, isEditing, onUpdate, className, listing }: EditableCellProps) => {
  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case 'active': return 'default';
      case 'sold': return 'secondary';
      case 'draft': return 'outline';
      default: return 'outline';
    }
  };

  const renderEditableContent = () => {
    switch (field) {
      case 'title':
        return isEditing ? (
          <Input
            value={value || ''}
            onChange={(e) => {
              console.log('📝 EditableTableCell title change:', { field, oldValue: value, newValue: e.target.value });
              onUpdate(field, e.target.value);
            }}
            className="w-full"
          />
        ) : (
          <>
            <div className="truncate font-medium">{value}</div>
            <div className="text-xs text-gray-500 truncate">
              {/* Created date would be passed separately if needed */}
            </div>
          </>
        );

      case 'price':
        return isEditing ? (
          <Input
            type="number"
            step="0.01"
            value={value || 0}
            onChange={(e) => {
              console.log('📝 EditableTableCell price change:', { field, oldValue: value, newValue: e.target.value });
              onUpdate(field, parseFloat(e.target.value) || 0);
            }}
            className="w-full"
          />
        ) : (
          <span className="font-semibold text-green-600">
            ${value?.toFixed(2)}
          </span>
        );

      case 'status':
        return isEditing ? (
          <Select value={value || 'draft'} onValueChange={(newValue) => {
            console.log('📝 EditableTableCell status change:', { field, oldValue: value, newValue });
            onUpdate(field, newValue);
          }}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border shadow-lg z-50">
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          field === 'status' && (
            <Badge variant={
              listing?.ebay_item_id ? 'default' : 
              value === 'active' ? 'default' : 'secondary'
            } className={listing?.ebay_item_id ? 'bg-green-500 hover:bg-green-600' : ''}>
              {listing?.ebay_item_id ? 'Published' : value}
            </Badge>
          )
        );

      case 'category':
        // Category editing is now handled by dedicated EbayCategorySelector component
        // This cell only displays the category text
        return <span className="text-sm">{value || '-'}</span>;

      case 'condition':
        return isEditing ? (
          <Select value={value || ''} onValueChange={(newValue) => {
            console.log('📝 EditableTableCell condition change:', { field, oldValue: value, newValue });
            onUpdate(field, newValue);
          }}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border shadow-lg z-50">
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Like New">Like New</SelectItem>
              <SelectItem value="Used">Used</SelectItem>
              <SelectItem value="Fair">Fair</SelectItem>
              <SelectItem value="Poor">Poor</SelectItem>
              <SelectItem value="For Parts">For Parts</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm">{value || '-'}</span>
        );

      case 'shipping_cost':
        return isEditing ? (
          <Input
            type="number"
            step="0.01"
            value={value || 0}
            onChange={(e) => {
              console.log('📝 EditableTableCell shipping change:', { field, oldValue: value, newValue: e.target.value });
              onUpdate(field, parseFloat(e.target.value) || 0);
            }}
            className="w-full"
          />
        ) : (
          <span className="text-sm">
            {value === 0 ? (
              <span className="text-green-600 font-medium">Free</span>
            ) : value ? (
              `$${value.toFixed(2)}`
            ) : (
              '-'
            )}
          </span>
        );

      default:
        return <span className="text-sm">{value || '-'}</span>;
    }
  };

  return (
    <TableCell className={className}>
      {renderEditableContent()}
    </TableCell>
  );
};

export default EditableTableCell;