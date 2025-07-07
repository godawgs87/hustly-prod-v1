
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class SafeErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="p-6 m-4 border-red-200 bg-red-50">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
          </div>
          
          <p className="text-red-700 mb-4">
            An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
          </p>
          
          {this.state.error && (
            <details className="mb-4">
              <summary className="text-sm text-red-600 cursor-pointer">Error details</summary>
              <pre className="text-xs text-red-500 mt-2 bg-red-100 p-2 rounded overflow-auto">
                {this.state.error.message}
              </pre>
            </details>
          )}
          
          <div className="flex space-x-3">
            <Button onClick={this.handleRetry} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={() => window.location.reload()} variant="default" size="sm">
              Refresh Page
            </Button>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default SafeErrorBoundary;
