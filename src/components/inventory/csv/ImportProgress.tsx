import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface ImportProgressProps {
  isImporting: boolean;
  importProgress: number;
  importSuccess: string | null;
  importErrors: string[];
}

const ImportProgress = ({
  isImporting,
  importProgress,
  importSuccess,
  importErrors
}: ImportProgressProps) => {
  return (
    <>
      {isImporting && (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Importing listings...</div>
          <Progress value={importProgress} className="w-full" />
          <div className="text-xs text-muted-foreground">{importProgress}% complete</div>
        </div>
      )}

      {importSuccess && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{importSuccess}</AlertDescription>
        </Alert>
      )}

      {importErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">Import Errors:</div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {importErrors.slice(0, 10).map((error, index) => (
                <li key={index}>{error}</li>
              ))}
              {importErrors.length > 10 && (
                <li className="text-muted-foreground">... and {importErrors.length - 10} more errors</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};

export default ImportProgress;