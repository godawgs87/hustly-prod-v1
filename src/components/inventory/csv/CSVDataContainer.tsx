import React from 'react';
import CSVExporter from './CSVExporter';
import CSVImporter from './CSVImporter';
import AIDataImportAssistant from '../AIDataImportAssistant';
import type { Listing } from '@/types/Listing';

interface CSVDataContainerProps {
  listings: Listing[];
  onImportComplete: () => void;
}

const CSVDataContainer = ({ listings, onImportComplete }: CSVDataContainerProps) => {
  return (
    <div className="space-y-6">
      <AIDataImportAssistant />
      <CSVExporter listings={listings} />
      <CSVImporter onImportComplete={onImportComplete} />
    </div>
  );
};

export default CSVDataContainer;