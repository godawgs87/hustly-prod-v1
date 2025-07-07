
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Settings } from 'lucide-react';

interface ErrorRetryCardProps {
  onRetry: () => void;
  onSkip: () => void;
  onManualEntry: () => void;
  isRetrying?: boolean;
  errorMessage?: string;
}

const ErrorRetryCard = ({ 
  onRetry, 
  onSkip, 
  onManualEntry, 
  isRetrying = false,
  errorMessage = "Analysis failed. This might be due to image size or connectivity issues."
}: ErrorRetryCardProps) => {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-medium text-red-900 mb-1">Analysis Failed</h3>
            <p className="text-sm text-red-700 mb-4">
              {errorMessage}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={onRetry}
                disabled={isRetrying}
                size="sm"
                className="bg-red-600 hover:bg-red-700"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Retry Analysis
                  </>
                )}
              </Button>
              
              <Button
                onClick={onManualEntry}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <Settings className="w-4 h-4 mr-1" />
                Manual Entry
              </Button>
              
              <Button
                onClick={onSkip}
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-100"
              >
                Skip Item
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ErrorRetryCard;
