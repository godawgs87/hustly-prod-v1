import { toast } from '@/hooks/use-toast';

export interface ErrorHandlingOptions {
  showToast?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
  context?: string;
  onError?: (error: Error) => void;
}

export class AppError extends Error {
  public readonly code?: string;
  public readonly context?: string;
  public readonly originalError?: Error;

  constructor(
    message: string,
    code?: string,
    context?: string,
    originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.context = context;
    this.originalError = originalError;
  }
}

export const handleError = (
  error: unknown,
  options: ErrorHandlingOptions = {}
): AppError => {
  const {
    showToast = true,
    logError = true,
    fallbackMessage = 'An unexpected error occurred',
    context,
    onError
  } = options;

  // Convert unknown error to AppError
  let appError: AppError;
  
  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Error) {
    appError = new AppError(
      error.message || fallbackMessage,
      undefined,
      context,
      error
    );
  } else if (typeof error === 'string') {
    appError = new AppError(error, undefined, context);
  } else {
    appError = new AppError(fallbackMessage, undefined, context);
  }

  // Log error if enabled
  if (logError) {
    console.error(`Error${context ? ` in ${context}` : ''}:`, {
      message: appError.message,
      code: appError.code,
      context: appError.context,
      originalError: appError.originalError,
      stack: appError.stack
    });
  }

  // Show toast notification if enabled
  if (showToast) {
    toast({
      title: "Error",
      description: appError.message,
      variant: "destructive"
    });
  }

  // Call custom error handler if provided
  if (onError) {
    onError(appError);
  }

  return appError;
};

// Specialized error handlers for common scenarios
export const handleSupabaseError = (
  error: unknown,
  operation: string,
  options: Omit<ErrorHandlingOptions, 'context'> = {}
) => {
  return handleError(error, {
    ...options,
    context: `Supabase ${operation}`,
    fallbackMessage: `Failed to ${operation.toLowerCase()}`
  });
};

export const handleAPIError = (
  error: unknown,
  endpoint: string,
  options: Omit<ErrorHandlingOptions, 'context'> = {}
) => {
  return handleError(error, {
    ...options,
    context: `API ${endpoint}`,
    fallbackMessage: `API request to ${endpoint} failed`
  });
};

export const handleValidationError = (
  errors: string[],
  options: Omit<ErrorHandlingOptions, 'context'> = {}
) => {
  const message = errors.length === 1 
    ? errors[0] 
    : `Validation failed: ${errors.join(', ')}`;
    
  return handleError(message, {
    ...options,
    context: 'Validation'
  });
};

// Async wrapper that automatically handles errors
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  options: ErrorHandlingOptions = {}
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    handleError(error, options);
    return null;
  }
};

// React error boundary helper
export const createErrorBoundaryHandler = (
  componentName: string,
  onError?: (error: Error, errorInfo: any) => void
) => {
  return (error: Error, errorInfo: any) => {
    handleError(error, {
      context: `React Error Boundary (${componentName})`,
      logError: true,
      showToast: false, // Don't show toast in error boundary
      onError: onError ? () => onError(error, errorInfo) : undefined
    });
  };
};
