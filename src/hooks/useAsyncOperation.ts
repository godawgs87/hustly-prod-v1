import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseAsyncOperationOptions {
  successMessage?: string;
  errorMessage?: string;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
}

export const useAsyncOperation = <T = any>(options: UseAsyncOperationOptions = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    successMessage,
    errorMessage,
    showSuccessToast = true,
    showErrorToast = true
  } = options;

  const execute = async (
    operation: () => Promise<T>,
    customSuccessMessage?: string,
    customErrorMessage?: string
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await operation();
      
      if (showSuccessToast && (customSuccessMessage || successMessage)) {
        toast({
          title: "Success",
          description: customSuccessMessage || successMessage
        });
      }
      
      return result;
    } catch (err: any) {
      const errorMsg = customErrorMessage || errorMessage || err?.message || 'An error occurred';
      setError(errorMsg);
      
      if (showErrorToast) {
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive"
        });
      }
      
      console.error('Async operation failed:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setError(null);
  };

  return {
    loading,
    error,
    execute,
    reset
  };
};
