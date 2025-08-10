import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Brain, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  Loader2, 
  Edit, 
  Eye,
  AlertTriangle, 
  ArrowLeft, 
  ArrowRight,
  Search
} from 'lucide-react';
import { PhotoGroup } from './BulkUploadManager';
import { EbayService } from '@/services/api/ebayService';
import { usePhotoAnalysis } from '@/hooks/usePhotoAnalysis';
import { validateEbayConnection } from '@/utils/ebayConnectionValidator';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/AuthProvider';
import { useListingSave } from '@/hooks/useListingSave';
import { supabase } from '@/integrations/supabase/client';
import PreviewDialog from './components/PreviewDialog';

interface BulkCombinedAnalysisStepProps {
  photoGroups: PhotoGroup[];
  onComplete: (groupsWithData: PhotoGroup[]) => void;
  onBack: () => void;
}

interface ProgressItem {
  groupId: string;
  aiStatus: 'pending' | 'processing' | 'completed' | 'error';
  priceStatus: 'pending' | 'processing' | 'completed' | 'error';
  saveStatus: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  priceData?: any;
}

export const BulkCombinedAnalysisStep: React.FC<BulkCombinedAnalysisStepProps> = ({
  photoGroups,
  onComplete,
  onBack
}) => {
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [completedGroups, setCompletedGroups] = useState<PhotoGroup[]>([]);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [previewGroup, setPreviewGroup] = useState<PhotoGroup | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { analyzePhotos } = usePhotoAnalysis();
  const { user } = useAuth();
  const { saveListing } = useListingSave();
  const userEmail = user?.email;

  // Check eBay connection with proper validation
  const { data: ebayConnection, isLoading: isCheckingEbay } = useQuery({
    queryKey: ['ebay-connection-status', user?.id],
    queryFn: validateEbayConnection,
    enabled: !!user,
    refetchInterval: 30 * 60 * 1000, // Check every 30 minutes
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
  });

  const isEbayConnected = ebayConnection?.isConnected && ebayConnection?.isTokenValid;

  // Initialize progress for all groups
  useEffect(() => {
    const initialProgress = photoGroups.map(group => ({
      groupId: group.id,
      aiStatus: 'pending' as const,
      priceStatus: 'pending' as const,
      saveStatus: 'pending' as const
    }));
    setProgress(initialProgress);
  }, [photoGroups]);

  const updateProgress = (groupId: string, updates: Partial<ProgressItem>) => {
    setProgress(prev => prev.map(p => 
      p.groupId === groupId ? { ...p, ...updates } : p
    ));
  };

  const processGroupAnalysis = async (group: PhotoGroup) => {
    try {
      console.log('🔍 Processing group:', group.name);
      
      // Call real AI analysis
      const aiResult = await analyzePhotos(group.photos);
      console.log('✅ AI Result:', aiResult);

      // Convert category object to string to prevent React error #31
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

      // Update group data with AI results FIRST
      const updatedGroupData = {
        ...group,
        listingData: {
          ...group.listingData,
          ...aiData,
          price: group.listingData?.price || 25 // Keep existing price or default
        },
        status: 'completed'
      };

      // Update state with new group data
      setCompletedGroups(prev => 
        prev.map(g => g.id === group.id ? updatedGroupData : g)
      );

      console.log('✅ AI Result:', aiData);

      // Auto-trigger price research with updated group data (no race condition)
      const hasValidTitle = aiData.title && 
                           aiData.title !== 'Needs Review - Listing Not Fully Generated' &&
                           aiData.title.trim().length > 0;

      if (isEbayConnected && hasValidTitle) {
        console.log('🚀 Auto-triggering price research for', group.name, 'with title:', aiData.title);
        
        // Force state synchronization before price research
        setTimeout(() => {
          console.log('🔄 Triggering price research after state sync for:', group.id);
          processPriceResearch(group.id, updatedGroupData);
        }, 100); // Minimal delay to ensure state update
      } else {
        console.log('⏸️ Skipping auto price research for', group.name, ':', {
          isEbayConnected,
          hasValidTitle,
          title: aiData.title
        });
      }

      updateProgress(group.id, { aiStatus: 'completed' });

      // Return the updated group data
      return updatedGroupData;
    } catch (error) {
      console.error('❌ Analysis failed for group:', group.name, error);
      
      // Create fallback data to prevent crashes
      const fallbackData = {
        title: `${group.name} - Manual Review Required`,
        description: 'AI analysis failed. Please edit this listing manually.',
        price: 25,
        category: 'Uncategorized',
        brand: 'Unknown',
        condition: 'Good',
        measurements: {}
      };
      
      // Update the group with fallback data so user can continue
      setCompletedGroups(prev => prev.map(g => 
        g.id === group.id 
          ? { ...g, listingData: fallbackData, status: 'completed' }
          : g
      ));
      
      updateProgress(group.id, { 
        aiStatus: 'error',
        error: error instanceof Error ? error.message : 'Analysis failed'
      });
      
      toast.error(`Analysis failed for ${group.name}. Fallback data created - please edit manually.`);
      
      // Return group with fallback data
      return {
        ...group,
        listingData: fallbackData
      };
    }
  };

  const processPriceResearch = async (groupId: string, updatedGroupData?: any) => {
    if (!isEbayConnected) {
      toast.error('eBay not connected. Please connect your eBay account in Settings to enable price research.');
      return;
    }

    updateProgress(groupId, { priceStatus: 'processing' });
    
    try {
      // Use updated group data if provided (from AI analysis), otherwise find existing group
      const group = updatedGroupData || 
                   completedGroups.find(g => g.id === groupId) || 
                   photoGroups.find(g => g.id === groupId);
      
      if (!group?.listingData?.title) {
        console.log('❌ No title available for price research, group data:', group);
        throw new Error('No title available for price research');
      }

      console.log('🔍 Starting price research for:', group.listingData.title);

      // Extract research parameters from AI analysis (same as single upload)
      const researchParams = EbayService.extractPriceResearchParams(group.listingData);
      
      // Perform price research (same as single upload)
      const result = await EbayService.researchItemPrice(researchParams);
      console.log('🔍 Price research result:', result);

      if (result.data) {
        const totalComps = result.data.searchResults?.total || 0;
        const suggestedPrice = result.data.priceAnalysis?.suggestedPrice || 0;
        
        console.log('💰 Found suggested price:', suggestedPrice, 'from', totalComps, 'comparables');

        // Create updated group with price data (whether we have a suggested price or not)
        const updatedGroup = {
          ...group,
          listingData: {
            ...group.listingData,
            price: suggestedPrice > 0 ? suggestedPrice : (group.listingData?.price || 25)
          }
        };

        // Auto-populate the price field with suggested price (same as single upload)
        if (suggestedPrice > 0) {
          console.log('💰 Updating price for group:', groupId, 'from', group.listingData?.price, 'to', suggestedPrice);
          console.log('💰 Updated group data:', updatedGroup);

          // Update the group with the new price
          setCompletedGroups(prev => {
            const existingGroupIndex = prev.findIndex(g => g.id === groupId);
            let newGroups;
            
            if (existingGroupIndex >= 0) {
              // Update existing group
              newGroups = prev.map(g => g.id === groupId ? updatedGroup : g);
            } else {
              // Add new group if it doesn't exist
              newGroups = [...prev, updatedGroup];
            }
            
            console.log('💰 Updated completedGroups:', newGroups);
            return newGroups;
          });

          // Force UI re-render by updating progress state
          setProgress(prev => 
            prev.map(p => p.groupId === groupId ? { ...p, priceUpdated: Date.now() } : p)
          );

          toast.success(`Price research complete: $${suggestedPrice} (from ${totalComps} comparables)`);
        } else {
          toast.info('No exact matches found, keeping current price');
        }

        updateProgress(groupId, { 
          priceStatus: 'completed',
          priceData: result.data 
        });
        
        // Auto-save item to inventory after successful AI analysis + price research
        // Pass the updated group data directly to avoid race condition
        await autoSaveItemToInventory(groupId, updatedGroup);
      } else {
        throw new Error('No price data received');
      }
    } catch (error: any) {
      console.error('❌ Price research failed:', error);
      
      // Enhanced error handling for eBay token issues
      if (error.message?.includes('invalid_scope') || error.message?.includes('token')) {
        toast.error('eBay connection expired. Please reconnect your eBay account in Settings.');
      } else {
        toast.error(`Price research failed: ${error.message}`);
      }
      
      updateProgress(groupId, { priceStatus: 'error' });
    }
  };

  // Auto-save item to inventory after successful AI analysis + price research
  const autoSaveItemToInventory = async (groupId: string, groupData?: PhotoGroup) => {
    let group: PhotoGroup | undefined;
    try {
      setSavingItems(prev => new Set([...prev, groupId]));
      
      // Use passed group data first, then search completedGroups as fallback
      group = groupData || completedGroups.find(g => g.id === groupId);
      if (!group?.listingData) {
        console.warn('⚠️ No listing data found for group:', groupId, 'completedGroups:', completedGroups.length);
        return;
      }

      // Skip saving if already saved
      if (savedItems.has(groupId)) {
        console.log('✅ Item already saved to inventory:', groupId);
        return;
      }

      console.log('💾 Auto-saving item to inventory:', group.listingData.title);

      // Upload photos to Supabase storage first (simplified version of handlePostItem)
      const uploadedPhotoUrls: string[] = [];
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('You must be logged in to auto-save items');
      }

      // Upload each photo to get permanent URLs
      for (let i = 0; i < group.photos.length; i++) {
        const file = group.photos[i];
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${currentUser.id}_${Date.now()}_${i}.${fileExt}`;
        const filePath = `listings/${currentUser.id}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('listing-photos')
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          throw new Error(`Failed to upload photo ${i + 1}: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from('listing-photos')
          .getPublicUrl(filePath);
        
        uploadedPhotoUrls.push(urlData.publicUrl);
      }

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
        photos: uploadedPhotoUrls, // Use permanent URLs
        measurements: {
          length: String(group.listingData.measurements?.length || ''),
          width: String(group.listingData.measurements?.width || ''),
          height: String(group.listingData.measurements?.height || ''),
          weight: String(group.listingData.measurements?.weight || '')
        },
        shipping_cost: 0,
        shipping_method: 'Not configured',
        shipping_days: 'Unknown',
        priceResearch: group.listingData.priceResearch ? JSON.stringify(group.listingData.priceResearch) : null,
      };

      // Use the correct saveListing function (same as final upload)
      const result = await saveListing(
        listingData as any,
        0, // shipping cost
        'draft', // save as draft
        undefined // no existing listing ID
      );
      
      if (!result) {
        throw new Error('Failed to save item to inventory');
      }

      console.log('✅ Item auto-saved to inventory:', result.listingId);
      
      setSavedItems(prev => new Set([...prev, groupId]));
      toast.success(`"${group.listingData.title}" saved to inventory`);
      
    } catch (error: any) {
      console.error('❌ Auto-save failed:', error);
      toast.error(`Failed to save "${group?.listingData?.title || 'item'}" to inventory`);
    } finally {
      setSavingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
    }
  };

  // Unified retry function for both AI analysis and price research
  const retryAnalysisAndPricing = async (groupId: string) => {
    try {
      console.log('🔄 Retrying AI analysis and price research for:', groupId);
      
      const group = photoGroups.find(g => g.id === groupId);
      if (!group) {
        toast.error('Group not found');
        return;
      }

      // Reset progress for this group
      updateProgress(groupId, { 
        aiStatus: 'processing', 
        priceStatus: 'pending',
        priceData: undefined 
      });

      // Run AI analysis
      const processedGroup = await processGroupAnalysis(group);
      
      // Update completedGroups immediately
      setCompletedGroups(prev => {
        const existingIndex = prev.findIndex(g => g.id === groupId);
        if (existingIndex >= 0) {
          const newGroups = [...prev];
          newGroups[existingIndex] = processedGroup;
          return newGroups;
        } else {
          return [...prev, processedGroup];
        }
      });

      // Auto-trigger price research if AI analysis succeeded
      if (processedGroup.listingData && processedGroup.listingData.title !== 'Needs Review - Listing Not Fully Generated') {
        console.log('🔄 Auto-triggering price research after retry...');
        setTimeout(() => {
          processPriceResearch(groupId, processedGroup);
        }, 1000);
      } else {
        toast.warning('AI analysis still failed. Please try again or edit manually.');
      }
      
    } catch (error: any) {
      console.error('❌ Retry failed:', error);
      toast.error(`Retry failed: ${error.message}`);
      updateProgress(groupId, { aiStatus: 'error', priceStatus: 'error' });
    }
  };

  const startAnalysis = async () => {
    setAnalysisStarted(true);
    setIsProcessing(true);
    
    try {
      const processedGroups = [];
      
      for (let i = 0; i < photoGroups.length; i++) {
        setCurrentIndex(i);
        updateProgress(photoGroups[i].id, { aiStatus: 'processing' });
        
        const processedGroup = await processGroupAnalysis(photoGroups[i]);
        processedGroups.push(processedGroup);
        
        // Update completedGroups immediately BEFORE any price research triggers
        setCompletedGroups(prev => {
          const newGroups = [...prev, processedGroup];
          console.log('🔄 Updated completedGroups immediately:', newGroups.length, 'groups');
          return newGroups;
        });
      }
      
      setIsProcessing(false);
      
    } catch (error) {
      console.error('Analysis process failed:', error);
      setIsProcessing(false);
      toast.error('Analysis process failed. Please try again.');
    }
  };

  const handleContinueToShipping = () => {
    onComplete(completedGroups.length > 0 ? completedGroups : photoGroups);
  };

  const handleBackToGrouping = () => {
    onBack();
  };

  const getProgressText = () => {
    if (!analysisStarted) return 'Ready to analyze';
    if (isProcessing) return `Processing item ${currentIndex + 1} of ${photoGroups.length}`;
    const completedCount = progress.filter(p => p.aiStatus === 'completed').length;
    return `Analysis complete (${completedCount}/${photoGroups.length})`;
  };

  const handleFieldEdit = (groupId: string, field: string, value: any) => {
    setCompletedGroups(prev => prev.map(group => 
      group.id === groupId 
        ? {
            ...group,
            listingData: {
              ...group.listingData,
              [field]: value
            }
          }
        : group
    ));
  };

  const handlePreviewItem = (groupId: string) => {
    const group = completedGroups.find(g => g.id === groupId);
    if (group) {
      setPreviewGroup(group);
      setIsPreviewOpen(true);
    }
  };

  const handlePreviewSave = (updatedGroup: PhotoGroup) => {
    setCompletedGroups(prev => prev.map(group => 
      group.id === updatedGroup.id ? updatedGroup : group
    ));
    setIsPreviewOpen(false);
  };

  const overallProgress = photoGroups.length > 0 
    ? Math.round(((currentIndex + (isProcessing ? 0 : 1)) / photoGroups.length) * 100)
    : 0;

  const allCompleted = progress.length > 0 && progress.every(p => p.aiStatus === 'completed' || p.aiStatus === 'error');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2 mb-2">
          <Brain className="w-6 h-6 text-blue-600" />
          <DollarSign className="w-6 h-6 text-green-600" />
          AI Analysis & Price Research
        </h2>
        <p className="text-gray-600">
          Review your {photoGroups.length} items - Click "Start Analysis" when ready
        </p>
      </div>

      {/* Top Action Buttons - Moved for better visibility */}
      <div className="flex justify-between items-center mb-6">
        <Button 
          variant="outline" 
          onClick={handleBackToGrouping}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Photo Grouping
        </Button>
        
        {(allCompleted || analysisStarted) && (
          <Button 
            onClick={handleContinueToShipping}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 text-lg font-semibold"
          >
            Continue to Shipping Configuration
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Progress Status */}
      {analysisStarted && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
              <span className="font-medium">{getProgressText()}</span>
            </div>
            <Progress value={overallProgress} className="w-32" />
          </div>
        </div>
      )}

      {/* ITEMS TABLE - ALWAYS VISIBLE */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Review & Edit Items ({photoGroups.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Item</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Title</th>
                  <th className="text-left p-3 font-medium">Price</th>
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-left p-3 font-medium">Measurements</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {photoGroups.map((group, index) => {
                  const groupProgress = progress.find(p => p.groupId === group.id);
                  const isEditing = editingGroup === group.id;
                  const completedGroup = completedGroups.find(cg => cg.id === group.id);
                  const displayGroup = completedGroup || group;
                  
                  return (
                    <tr key={group.id} className="hover:bg-gray-50">
                      {/* Item - Title + Thumbnail */}
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {/* Thumbnail */}
                          <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                            {group.photos && group.photos.length > 0 ? (
                              <img 
                                src={URL.createObjectURL(group.photos[0])} 
                                alt={displayGroup.listingData?.title || group.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                                No Image
                              </div>
                            )}
                          </div>
                          {/* Title */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate" title={displayGroup.listingData?.title || group.name}>
                              {displayGroup.listingData?.title || group.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {group.photos?.length || 0} photo{group.photos?.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Status */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {groupProgress?.aiStatus === 'completed' ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              AI
                            </Badge>
                          ) : groupProgress?.aiStatus === 'processing' ? (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Processing
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                          
                          {/* Price Research Status */}
                          {groupProgress?.priceStatus === 'completed' && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <DollarSign className="w-3 h-3 mr-1" />
                              Price
                            </Badge>
                          )}
                          {groupProgress?.priceStatus === 'processing' && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Pricing
                            </Badge>
                          )}
                          
                          {/* Auto-Save Status */}
                          {savingItems.has(group.id) && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Saving
                            </Badge>
                          )}
                          {savedItems.has(group.id) && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Saved
                            </Badge>
                          )}
                        </div>
                      </td>
                      
                      {/* Title */}
                      <td className="p-3">
                        {isEditing ? (
                          <Input
                            value={displayGroup.listingData?.title || ''}
                            onChange={(e) => handleFieldEdit(group.id, 'title', e.target.value)}
                            className="text-sm"
                          />
                        ) : (
                          <span className="text-sm font-medium">
                            {displayGroup.listingData?.title || group.name}
                          </span>
                        )}
                      </td>
                      
                      {/* Price */}
                      <td className="p-3">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={displayGroup.listingData?.price || ''}
                            onChange={(e) => handleFieldEdit(group.id, 'price', parseFloat(e.target.value) || 0)}
                            className="text-sm w-20"
                          />
                        ) : (
                          <span className="text-sm font-medium">
                            ${displayGroup.listingData?.price || 25}
                          </span>
                        )}
                      </td>
                      
                      {/* Category */}
                      <td className="p-3">
                        <span className="text-sm text-gray-600">
                          {displayGroup.listingData?.category || 'Clothing, Shoes & Accessories'}
                        </span>
                      </td>
                      
                      {/* Measurements */}
                      <td className="p-3">
                        <span className="text-sm text-gray-600">
                          {displayGroup.listingData?.measurements && Object.keys(displayGroup.listingData.measurements).length > 0
                            ? Object.entries(displayGroup.listingData.measurements)
                                .filter(([key, value]) => value && value !== '')
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(', ')
                            : '-'
                          }
                        </span>
                      </td>
                      
                      {/* Actions */}
                      <td className="p-3">
                        <div className="flex flex-col gap-2">
                          {/* Edit/Preview buttons stacked vertically */}
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingGroup(isEditing ? null : group.id)}
                              className="w-full justify-start"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              {isEditing ? 'Save' : 'Edit'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePreviewItem(group.id)}
                              className="w-full justify-start"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Preview
                            </Button>
                          </div>
                          
                          {/* Unified Retry Button for Failed Items */}
                          {(() => {
                            const aiStatus = groupProgress?.aiStatus;
                            const priceStatus = groupProgress?.priceStatus;
                            const hasFailed = displayGroup.listingData?.title === 'Needs Review - Listing Not Fully Generated' || 
                                            aiStatus === 'error' || priceStatus === 'error';
                            const isProcessing = aiStatus === 'processing' || priceStatus === 'processing';
                            const needsPriceResearch = aiStatus === 'completed' && 
                                                     isEbayConnected && 
                                                     priceStatus !== 'completed' &&
                                                     displayGroup.listingData?.title !== 'Needs Review - Listing Not Fully Generated';
                            
                            // Show unified retry button for failed items
                            if (hasFailed && !isProcessing) {
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => retryAnalysisAndPricing(group.id)}
                                  className="border-orange-300 text-orange-600 hover:bg-orange-50 bg-white"
                                  title="Retry AI Analysis and Price Research"
                                >
                                  <Brain className="w-4 h-4 mr-1" />
                                  Retry
                                </Button>
                              );
                            }
                            
                            // Show price research button for items that need pricing
                            if (needsPriceResearch) {
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => processPriceResearch(group.id)}
                                  disabled={priceStatus === 'processing'}
                                  title="Run Price Research"
                                  className="border-blue-300 text-blue-600 hover:bg-blue-50 bg-white"
                                >
                                  {priceStatus === 'processing' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Search className="w-4 h-4" />
                                  )}
                                </Button>
                              );
                            }
                            
                            // Show status for completed items
                            return (
                              <div className="text-xs text-gray-400 px-2">
                                {aiStatus !== 'completed' ? 'AI pending' : 
                                 priceStatus !== 'completed' ? 'Price pending' : 'Complete'}
                              </div>
                            );
                          })()}
                          {groupProgress?.error && (
                            <div title={groupProgress.error}>
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Start Analysis Button - Center when not started */}
      {!analysisStarted && (
        <div className="flex justify-center pt-6">
          <Button 
            onClick={startAnalysis}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-8 py-3 text-lg font-semibold"
          >
            <Brain className="w-4 h-4" />
            Start Analysis
          </Button>
        </div>
      )}

      {/* Preview Dialog */}
      <PreviewDialog
        group={previewGroup}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onSave={handlePreviewSave}
      />
    </div>
  );
};

export default BulkCombinedAnalysisStep;
