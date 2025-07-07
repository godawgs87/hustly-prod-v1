import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ListingService } from '@/services/ListingService';
import { 
  parseCSV, 
  validateCSVRow, 
  convertCSVRowToListing,
  downloadCSV,
  type CSVImportRow 
} from '@/utils/csvUtils';
import ImportProgress from './ImportProgress';

interface CSVImporterProps {
  onImportComplete: () => void;
}

const CSVImporter = ({ onImportComplete }: CSVImporterProps) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportErrors([]);
    setImportSuccess(null);
    setImportProgress(0);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      if (rows.length === 0) {
        throw new Error('No valid data found in CSV file');
      }

      // Validate all rows first
      const allErrors: string[] = [];
      const validRows: CSVImportRow[] = [];
      
      rows.forEach((row, index) => {
        const validation = validateCSVRow(row, index);
        if (validation.isValid) {
          validRows.push(row);
        } else {
          allErrors.push(...validation.errors);
        }
      });

      if (allErrors.length > 0) {
        setImportErrors(allErrors);
        setIsImporting(false);
        return;
      }

      // Import valid rows in batches
      let successCount = 0;
      const batchSize = 10;
      
      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);
        
        try {
          const listings = batch.map(row => {
            const listing = convertCSVRowToListing(row);
            return {
              ...listing,
              price: listing.price || 0 // Ensure price is always a number
            };
          });
          await Promise.all(listings.map(listing => ListingService.createListing(listing)));
          successCount += batch.length;
        } catch (error) {
          console.error('Batch import error:', error);
          allErrors.push(`Failed to import batch starting at row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        setImportProgress(Math.round(((i + batch.length) / validRows.length) * 100));
      }

      if (successCount > 0) {
        setImportSuccess(`Successfully imported ${successCount} listings`);
        onImportComplete();
        toast({
          title: "Import Successful",
          description: `Imported ${successCount} listings`,
        });
      }

      if (allErrors.length > 0) {
        setImportErrors(allErrors);
      }

    } catch (error) {
      console.error('Import error:', error);
      setImportErrors([`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsImporting(false);
      setImportProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplate = () => {
    const templateHeaders = [
      'Title', 'Description', 'Price', 'Category', 'Condition', 'Status',
      'Purchase Price', 'Purchase Date', 'Cost Basis', 'Shipping Cost',
      'Is Consignment', 'Consignment Percentage', 'Consignor Name', 'Consignor Contact',
      'Source Type', 'Source Location', 'Keywords',
      'Measurements Length', 'Measurements Width', 'Measurements Height', 'Measurements Weight',
      'Clothing Size', 'Shoe Size', 'Gender', 'Age Group'
    ];
    
    const templateRow = [
      'Sample Item Title', 'Sample description', '25.00', 'Electronics', 'Good', 'draft',
      '15.00', '2024-01-01', '18.00', '9.95', 'false', '', '', '',
      'Thrift Store', 'Local Store', 'electronics;vintage;tested',
      '10', '8', '2', '1.5', 'L', '9.5', 'Men', 'Adult'
    ];

    const csvContent = [templateHeaders.join(','), templateRow.join(',')].join('\n');
    downloadCSV(csvContent, 'inventory_import_template.csv');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Import CSV Data
        </CardTitle>
        <CardDescription>
          Upload a properly formatted CSV file to bulk import listings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={downloadTemplate}
            className="w-full sm:w-auto"
          >
            Download Template
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImport}
            disabled={isImporting}
            className="hidden"
          />
          
          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="w-full sm:w-auto"
          >
            {isImporting ? 'Importing...' : 'Choose CSV File'}
          </Button>
        </div>

        <ImportProgress
          isImporting={isImporting}
          importProgress={importProgress}
          importSuccess={importSuccess}
          importErrors={importErrors}
        />
      </CardContent>
    </Card>
  );
};

export default CSVImporter;