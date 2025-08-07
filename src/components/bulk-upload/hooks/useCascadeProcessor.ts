import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { PhotoGroup } from '../BulkUploadManager';
import { usePhotoAnalysis } from '@/hooks/usePhotoAnalysis';
import { useListingSave } from '@/hooks/useListingSave';
import { EbayService } from '@/services/api/ebayService';

interface CascadeProgress {
  groupId: string;
  stage: 'queued' | 'ai-processing' | 'ai-completed' | 'price-processing' | 'price-completed' | 'save-processing' | 'save-completed' | 'error';
  aiStatus: 'pending' | 'processing' | 'completed' | 'error';
  priceStatus: 'pending' | 'processing' | 'completed' | 'error';
  saveStatus: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  progress: number; // 0-100
}

interface CascadeQueues {
  aiQueue: PhotoGroup[];
  priceQueue: PhotoGroup[];
  saveQueue: PhotoGroup[];
}

export const useCascadeProcessor = (isEbayConnected: boolean) => {
  const [progress, setProgress] = useState<CascadeProgress[]>([]);
  const [completedGroups, setCompletedGroups] = useState<PhotoGroup[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [queues, setQueues] = useState<CascadeQueues>({
    aiQueue: [],
    priceQueue: [],
    saveQueue: []
  });

  const { analyzePhotos } = usePhotoAnalysis();
  const { saveListing } = useListingSave();

  const updateProgress = useCallback((groupId: string, updates: Partial<CascadeProgress>) => {
    setProgress(prev => prev.map(p => 
      p.groupId === groupId ? { ...p, ...updates } : p
    ));
  }, []);

  // Stage 1: AI Analysis (2 concurrent)
  const processAIStage = useCallback(async (group: PhotoGroup): Promise<PhotoGroup | null> => {
    try {
      console.log('🤖 [AI Stage] Processing:', group.name);
      updateProgress(group.id, { 
        stage: 'ai-processing',
        aiStatus: 'processing',
        progress: 25
      });

      const aiResult = await analyzePhotos(group.photos);
      
      const aiData = {
        title: aiResult.title || `${group.name} - Premium Quality`,
        description: aiResult.description || `High-quality ${group.name.toLowerCase()} in excellent condition.`,
        category: typeof aiResult.category === 'object' && aiResult.category
          ? `${(aiResult.category as any).primary}${(aiResult.category as any).subcategory ? ' > ' + (aiResult.category as any).subcategory : ''}`
          : aiResult.category || 'Clothing, Shoes & Accessories',
        condition: aiResult.condition || 'Used',
        keywords: aiResult.keywords || [group.name.toLowerCase()],
        measurements: aiResult.measurements || {}
      };

      const updatedGroup: PhotoGroup = {
        ...group,
        listingData: {
          ...group.listingData,
          ...aiData,
          price: group.listingData?.price || 25
        },
        status: 'completed'
      };

      // Update completed groups immediately
      setCompletedGroups(prev => {
        const existingIndex = prev.findIndex(g => g.id === group.id);
        if (existingIndex >= 0) {
          return prev.map(g => g.id === group.id ? updatedGroup : g);
        }
        return [...prev, updatedGroup];
      });

      updateProgress(group.id, { 
        stage: 'ai-completed',
        aiStatus: 'completed',
        progress: 50
      });
      
      console.log('✅ [AI Stage] Completed:', group.name);
      return updatedGroup;
    } catch (error) {
      console.error('❌ [AI Stage] Failed:', group.name, error);
      updateProgress(group.id, { 
        stage: 'error',
        aiStatus: 'error', 
        error: 'AI analysis failed',
        progress: 0
      });
      return null;
    }
  }, [analyzePhotos, updateProgress, setCompletedGroups]);

  // Stage 2: Price Research (3 concurrent)
  const processPriceStage = useCallback(async (group: PhotoGroup): Promise<PhotoGroup | null> => {
    try {
      if (!group.listingData?.title || group.listingData.title.includes('Needs Review') || !isEbayConnected) {
        console.log('⏸️ [Price Stage] Skipping price research for:', group.name);
        updateProgress(group.id, { 
          stage: 'price-completed',
          priceStatus: 'completed',
          progress: 75
        });
        return group;
      }

      console.log('💰 [Price Stage] Processing:', group.name);
      updateProgress(group.id, { 
        stage: 'price-processing',
        priceStatus: 'processing',
        progress: 60
      });

      const result = await EbayService.researchItemPrice({
        title: group.listingData.title,
        brand: group.listingData.brand || '',
        category: group.listingData.category || '',
        condition: group.listingData.condition || 'Used'
      });

      if (result.status === 'success' && result.data) {
        const suggestedPrice = result.data.priceAnalysis?.suggestedPrice || 0;
        
        if (suggestedPrice > 0) {
          const updatedGroup: PhotoGroup = {
            ...group,
            listingData: {
              ...group.listingData,
              price: suggestedPrice,
              priceResearch: result.data
            }
          };

          // Update completed groups with price
          setCompletedGroups(prev => prev.map(g => 
            g.id === group.id ? updatedGroup : g
          ));

          updateProgress(group.id, { 
            stage: 'price-completed',
            priceStatus: 'completed',
            progress: 75
          });
          
          console.log('✅ [Price Stage] Completed:', group.name, '$' + suggestedPrice);
          return updatedGroup;
        }
      }

      updateProgress(group.id, { 
        stage: 'price-completed',
        priceStatus: 'completed',
        progress: 75
      });
      return group;
    } catch (error) {
      console.error('❌ [Price Stage] Failed:', group.name, error);
      updateProgress(group.id, { 
        priceStatus: 'error', 
        error: 'Price research failed'
      });
      return group;
    }
  }, [isEbayConnected, updateProgress, setCompletedGroups]);

  // Stage 3: Auto-Save (4 concurrent)
  const processSaveStage = useCallback(async (group: PhotoGroup): Promise<void> => {
    try {
      if (!group.listingData?.title || group.listingData.title.includes('Needs Review')) {
        console.log('⏸️ [Save Stage] Skipping auto-save for invalid item:', group.name);
        updateProgress(group.id, { 
          stage: 'save-completed',
          saveStatus: 'completed',
          progress: 100
        });
        return;
      }

      console.log('💾 [Save Stage] Processing:', group.name);
      updateProgress(group.id, { 
        stage: 'save-processing',
        saveStatus: 'processing',
        progress: 85
      });

      // Prepare listing data for saveListing function
      const listingData = {
        ...group.listingData,
        title: group.listingData.title || 'Untitled Item',
        description: group.listingData.description || 'No description available',
        price: group.listingData.price || 0,
        category: typeof group.listingData.category === 'string' 
          ? group.listingData.category 
          : group.listingData.category?.name || 'Uncategorized',
        condition: group.listingData.condition || 'Used',
        photos: group.photos, // Will be uploaded by saveListing
        measurements: {
          length: String(group.listingData.measurements?.length || ''),
          width: String(group.listingData.measurements?.width || ''),
          height: String(group.listingData.measurements?.height || ''),
          weight: String(group.listingData.measurements?.weight || '')
        },
        shipping_cost: 0,
        shipping_method: 'Not configured',
        status: 'draft',
        priceResearch: group.listingData.priceResearch ? JSON.stringify(group.listingData.priceResearch) : null,
      };

      const result = await saveListing(listingData);
      
      if (result.success) {
        updateProgress(group.id, { 
          stage: 'save-completed',
          saveStatus: 'completed',
          progress: 100
        });
        console.log('✅ [Save Stage] Completed:', group.name);
        toast.success(`"${group.listingData.title}" saved to inventory`);
      } else {
        throw new Error(result.error || 'Save failed');
      }
    } catch (error) {
      console.error('❌ [Save Stage] Failed:', group.name, error);
      updateProgress(group.id, { 
        stage: 'error',
        saveStatus: 'error', 
        error: 'Auto-save failed'
      });
      toast.error(`Failed to save "${group.listingData?.title || 'item'}" to inventory`);
    }
  }, [saveListing, updateProgress]);

  // Main cascade processing controller
  const startCascadeProcessing = useCallback(async (photoGroups: PhotoGroup[]) => {
    console.log('🚀 Starting cascade processing for', photoGroups.length, 'items');
    setIsProcessing(true);

    // Initialize progress for all groups
    const initialProgress = photoGroups.map(group => ({
      groupId: group.id,
      stage: 'queued' as const,
      aiStatus: 'pending' as const,
      priceStatus: 'pending' as const,
      saveStatus: 'pending' as const,
      progress: 0
    }));
    setProgress(initialProgress);

    // Initialize queues
    let aiQueue = [...photoGroups];
    let priceQueue: PhotoGroup[] = [];
    let saveQueue: PhotoGroup[] = [];

    // Process items in cascade fashion with controlled concurrency
    const processNext = async () => {
      const promises: Promise<void>[] = [];

      // Stage 1: AI Analysis (up to 2 concurrent)
      const aiItems = aiQueue.splice(0, 2);
      aiItems.forEach(group => {
        promises.push(
          processAIStage(group).then(processedGroup => {
            if (processedGroup) {
              priceQueue.push(processedGroup);
            }
          })
        );
      });

      // Stage 2: Price Research (up to 3 concurrent)
      const priceItems = priceQueue.splice(0, 3);
      priceItems.forEach(group => {
        promises.push(
          processPriceStage(group).then(processedGroup => {
            if (processedGroup) {
              saveQueue.push(processedGroup);
            }
          })
        );
      });

      // Stage 3: Auto-Save (up to 4 concurrent)
      const saveItems = saveQueue.splice(0, 4);
      saveItems.forEach(group => {
        promises.push(processSaveStage(group));
      });

      // Wait for current batch to complete
      await Promise.allSettled(promises);

      // Continue if there are more items to process
      if (aiQueue.length > 0 || priceQueue.length > 0 || saveQueue.length > 0) {
        setQueues({ aiQueue: [...aiQueue], priceQueue: [...priceQueue], saveQueue: [...saveQueue] });
        setTimeout(processNext, 200); // Small delay to prevent overwhelming
      } else {
        console.log('✅ Cascade processing complete!');
        setIsProcessing(false);
      }
    };

    processNext();
  }, [processAIStage, processPriceStage, processSaveStage]);

  // Retry function for failed items
  const retryItem = useCallback(async (groupId: string) => {
    const group = completedGroups.find(g => g.id === groupId);
    if (!group) return;

    console.log('🔄 Retrying item:', group.name);
    
    // Reset progress
    updateProgress(groupId, {
      stage: 'queued',
      aiStatus: 'pending',
      priceStatus: 'pending',
      saveStatus: 'pending',
      progress: 0,
      error: undefined
    });

    // Process through the cascade again
    const processedGroup = await processAIStage(group);
    if (processedGroup) {
      const pricedGroup = await processPriceStage(processedGroup);
      if (pricedGroup) {
        await processSaveStage(pricedGroup);
      }
    }
  }, [completedGroups, updateProgress, processAIStage, processPriceStage, processSaveStage]);

  return {
    progress,
    completedGroups,
    isProcessing,
    queues,
    startCascadeProcessing,
    retryItem
  };
};
