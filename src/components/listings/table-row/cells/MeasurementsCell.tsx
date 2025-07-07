
import React from 'react';
import { TableCell } from '@/components/ui/table';

interface MeasurementData {
  length?: string;
  width?: string;
  height?: string;
  weight?: string;
}

interface MeasurementsCellProps {
  measurements: MeasurementData | null;
}

const MeasurementsCell = ({ measurements }: MeasurementsCellProps) => {
  console.log('🔧 MeasurementsCell received:', measurements, 'Type:', typeof measurements);

  if (!measurements || typeof measurements !== 'object') {
    console.log('🔧 MeasurementsCell: No measurements or invalid type');
    return <span className="text-gray-400">-</span>;
  }

  // Check if measurements object has any values
  const hasValues = Object.values(measurements).some(value => value && value.trim() !== '');
  console.log('🔧 MeasurementsCell: Has values?', hasValues, 'Values:', Object.values(measurements));
  
  if (!hasValues) {
    console.log('🔧 MeasurementsCell: No valid measurement values');
    return <span className="text-gray-400">-</span>;
  }

  console.log('🔧 MeasurementsCell: Rendering measurements');
  return (
    <div className="space-y-1">
      {measurements.length && <div>L: {measurements.length}</div>}
      {measurements.width && <div>W: {measurements.width}</div>}
      {measurements.height && <div>H: {measurements.height}</div>}
      {measurements.weight && <div>Wt: {measurements.weight}</div>}
    </div>
  );
};

export default MeasurementsCell;
