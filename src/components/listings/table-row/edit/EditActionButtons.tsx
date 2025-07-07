
import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2 } from 'lucide-react';

interface EditActionButtonsProps {
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  isLoadingData: boolean;
}

const EditActionButtons = ({ onSave, onCancel, isSaving, isLoadingData }: EditActionButtonsProps) => {
  return (
    <div className="flex space-x-1">
      <Button 
        size="sm" 
        onClick={onSave} 
        className="bg-green-600 hover:bg-green-700" 
        disabled={isSaving || isLoadingData}
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
      </Button>
      <Button size="sm" variant="outline" onClick={onCancel} disabled={isSaving}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default EditActionButtons;
