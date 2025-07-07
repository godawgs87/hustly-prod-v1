
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Edit, Save, X } from 'lucide-react';
import type { PhotoGroup } from '../BulkUploadManager';

interface EnhancedPreviewDialogProps {
  group: PhotoGroup | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedGroup: PhotoGroup) => void;
}

const EnhancedPreviewDialog = ({ group, isOpen, onClose, onSave }: EnhancedPreviewDialogProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedGroup, setEditedGroup] = useState<PhotoGroup | null>(null);

  React.useEffect(() => {
    if (group) {
      setEditedGroup({ ...group });
      setIsEditing(false);
    }
  }, [group]);

  if (!group || !editedGroup) return null;

  const handleSave = () => {
    onSave(editedGroup);
    setIsEditing(false);
    onClose();
  };

  const updateField = (field: string, value: any) => {
    setEditedGroup(prev => prev ? {
      ...prev,
      listingData: {
        ...prev.listingData,
        [field]: value
      }
    } : null);
  };

  const updateMeasurement = (field: string, value: string) => {
    setEditedGroup(prev => prev ? {
      ...prev,
      listingData: {
        ...prev.listingData,
        measurements: {
          ...prev.listingData?.measurements,
          [field]: value
        }
      }
    } : null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {isEditing ? 'Edit Item' : 'Preview Item'}
            </DialogTitle>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} size="sm">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} size="sm">
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Photos */}
          <div>
            <h3 className="font-medium mb-3">Photos ({group.photos?.length || 0})</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {group.photos?.map((photo, index) => (
                <div key={index} className="aspect-square rounded-lg overflow-hidden border">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`${group.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-medium">Basic Information</h3>
            
            <div>
              <Label htmlFor="title">Title</Label>
              {isEditing ? (
                <Input
                  id="title"
                  value={editedGroup.listingData?.title || ''}
                  onChange={(e) => updateField('title', e.target.value)}
                />
              ) : (
                <p className="mt-1 text-sm bg-gray-50 p-2 rounded">
                  {group.listingData?.title || 'Not set'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price</Label>
                {isEditing ? (
                  <Input
                    id="price"
                    type="number"
                    value={editedGroup.listingData?.price || ''}
                    onChange={(e) => updateField('price', Number(e.target.value))}
                  />
                ) : (
                  <p className="mt-1 text-sm bg-gray-50 p-2 rounded">
                    ${group.listingData?.price || 'Not set'}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="condition">Condition</Label>
                {isEditing ? (
                  <Select 
                    value={editedGroup.listingData?.condition || ''} 
                    onValueChange={(value) => updateField('condition', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Like New">Like New</SelectItem>
                      <SelectItem value="Very Good">Very Good</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Fair">Fair</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="mt-1 text-sm bg-gray-50 p-2 rounded">
                    {group.listingData?.condition || 'Not set'}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              {isEditing ? (
                <Textarea
                  id="description"
                  value={editedGroup.listingData?.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                />
              ) : (
                <p className="mt-1 text-sm bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
                  {group.listingData?.description || 'Not set'}
                </p>
              )}
            </div>
          </div>

          {/* Measurements */}
          <div className="space-y-4">
            <h3 className="font-medium">Measurements</h3>
            <div className="grid grid-cols-2 gap-4">
              {['length', 'width', 'height', 'weight'].map((field) => (
                <div key={field}>
                  <Label htmlFor={field}>{field.charAt(0).toUpperCase() + field.slice(1)}</Label>
                  {isEditing ? (
                    <Input
                      id={field}
                      value={editedGroup.listingData?.measurements?.[field as keyof typeof editedGroup.listingData.measurements] || ''}
                      onChange={(e) => updateMeasurement(field, e.target.value)}
                      placeholder={field === 'weight' ? 'lbs' : 'inches'}
                    />
                  ) : (
                    <p className="mt-1 text-sm bg-gray-50 p-2 rounded">
                      {group.listingData?.measurements?.[field as keyof typeof group.listingData.measurements] || 'Not set'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Status and Category */}
          <div className="flex items-center gap-4">
            <Badge className={`${
              group.status === 'completed' ? 'bg-green-100 text-green-800' :
              group.status === 'processing' ? 'bg-blue-100 text-blue-800' :
              group.status === 'error' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {group.status}
            </Badge>
            <span className="text-sm text-gray-600">
              Category: {group.listingData?.category || 'Not set'}
            </span>
          </div>

          {/* Shipping Info */}
          {group.selectedShipping && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-1">Shipping Selected</h4>
              <p className="text-sm text-blue-700">
                {group.selectedShipping.name} - ${group.selectedShipping.cost}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedPreviewDialog;
