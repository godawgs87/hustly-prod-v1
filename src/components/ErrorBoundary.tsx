
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  error: string | Error;
  retry?: () => void;
  goHome?: () => void;
  fullPage?: boolean;
}

const ErrorBoundary = ({ error, retry, goHome, fullPage = false }: ErrorBoundaryProps) => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  const containerClasses = fullPage 
    ? 'min-h-screen flex items-center justify-center bg-gray-50 p-4'
    : '';

  const cardContent = (
    <Card className="p-8 text-center max-w-md mx-auto">
      <div className="flex flex-col items-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Something went wrong
          </h3>
          <p className="text-gray-600 text-sm mb-4">{errorMessage}</p>
        </div>
        
        <div className="flex gap-2">
          {retry && (
            <Button onClick={retry} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
          
          {goHome && (
            <Button onClick={goHome}>
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  return fullPage ? (
    <div className={containerClasses}>
      {cardContent}
    </div>
  ) : cardContent;
};

export default ErrorBoundary;
