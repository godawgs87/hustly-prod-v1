
import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ProgressiveLoadingOptions {
  initialLimit: number;
  incrementSize: number;
  maxLimit: number;
}

export const useProgressiveLoading = (options: ProgressiveLoadingOptions) => {
  // Increased safe maximum to 100 items for better usability
  const safeMaxLimit = Math.min(options.maxLimit, 100);
  const safeInitialLimit = Math.min(options.initialLimit, 50);
  
  const [currentLimit, setCurrentLimit] = useState(safeInitialLimit);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const lastLoadTimeRef = useRef<number>(0);
  const { toast } = useToast();

  const loadMore = useCallback(async () => {
    const now = Date.now();
    
    // Reduced debounce time to be more responsive
    if (now - lastLoadTimeRef.current < 1000) {
      console.log('⏸️ Debouncing load more requests');
      return false;
    }
    
    if (currentLimit >= safeMaxLimit) {
      toast({
        title: "Maximum items loaded",
        description: "Use filters to find specific items or try refreshing for better performance.",
        variant: "default"
      });
      return false;
    }

    setIsLoadingMore(true);
    lastLoadTimeRef.current = now;
    const newLimit = Math.min(currentLimit + options.incrementSize, safeMaxLimit);
    
    try {
      console.log(`🔽 Loading more: ${currentLimit} -> ${newLimit} (max: ${safeMaxLimit})`);
      setCurrentLimit(newLimit);
      return true;
    } catch (error) {
      console.error('Error loading more items:', error);
      toast({
        title: "Failed to load more",
        description: "There was an error loading additional items.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentLimit, options.incrementSize, safeMaxLimit, toast]);

  const reset = useCallback(() => {
    console.log('🔄 Resetting progressive loading to initial limit:', safeInitialLimit);
    setCurrentLimit(safeInitialLimit);
    setIsLoadingMore(false);
    lastLoadTimeRef.current = 0;
  }, [safeInitialLimit]);

  const canLoadMore = currentLimit < safeMaxLimit;

  return {
    currentLimit,
    isLoadingMore,
    canLoadMore,
    loadMore,
    reset
  };
};
