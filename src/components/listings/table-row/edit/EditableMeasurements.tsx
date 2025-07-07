
import React from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface EditableMeasurementsProps {
  measurements: {
    length?: string;
    width?: string;
    height?: string;
    weight?: string;
  };
  onUpdate: (field: string, value: string) => void;
  isLoading?: boolean;
}

const EditableMeasurements = ({ measurements, onUpdate, isLoading }: EditableMeasurementsProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-1 min-w-[120px]">
      <Input
        placeholder="Length"
        value={measurements.length || ''}
        onChange={(e) => onUpdate('length', e.target.value)}
        className="text-xs h-6"
      />
      <Input
        placeholder="Width" 
        value={measurements.width || ''}
        onChange={(e) => onUpdate('width', e.target.value)}
        className="text-xs h-6"
      />
      <Input
        placeholder="Height"
        value={measurements.height || ''}
        onChange={(e) => onUpdate('height', e.target.value)}
        className="text-xs h-6"
      />
      <Input
        placeholder="Weight"
        value={measurements.weight || ''}
        onChange={(e) => onUpdate('weight', e.target.value)}
        className="text-xs h-6"
      />
    </div>
  );
};

export default EditableMeasurements;
