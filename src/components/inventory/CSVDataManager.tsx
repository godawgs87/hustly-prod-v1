import React from 'react';
import CSVDataContainer from './csv/CSVDataContainer';
import type { Listing } from '@/types/Listing';

interface CSVDataManagerProps {
  listings: Listing[];
  onImportComplete: () => void;
}

const CSVDataManager = ({ listings, onImportComplete }: CSVDataManagerProps) => {
  return <CSVDataContainer listings={listings} onImportComplete={onImportComplete} />;
};

export default CSVDataManager;
