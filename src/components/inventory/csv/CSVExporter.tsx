import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportListingsToCSV, downloadCSV } from '@/utils/csvUtils';
import type { Listing } from '@/types/Listing';

interface CSVExporterProps {
  listings: Listing[];
}

const CSVExporter = ({ listings }: CSVExporterProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const csvContent = exportListingsToCSV(listings);
      const filename = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(csvContent, filename);
      
      toast({
        title: "Export Successful",
        description: `Exported ${listings.length} listings to ${filename}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export listings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          Export Data
        </CardTitle>
        <CardDescription>
          Download your inventory as a CSV file for backup or analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleExport} 
          disabled={isExporting || listings.length === 0}
          className="w-full sm:w-auto"
        >
          {isExporting ? 'Exporting...' : `Export ${listings.length} Listings`}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CSVExporter;