import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { usePhotoAnalysis } from '@/hooks/usePhotoAnalysis';
import { PhotoGroup } from './BulkUploadManager';
import { EbayService } from '@/services/api/ebayService';
import {
  Loader2,
  Brain,
  DollarSign,
  Edit,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

interface BulkCombinedAnalysisStepProps {
  photoGroups: PhotoGroup[];
  onComplete: (groupsWithData: PhotoGroup[]) => void;
  onBack: () => void;
}

interface AnalysisProgress {
  groupId: string;
  aiStatus: 'pending' | 'processing' | 'completed' | 'error';
  priceStatus: 'pending' | 'processing' | 'completed' | 'error' | 'skipped';
  error?: string;
}

const BulkCombinedAnalysisStep: React.FC<BulkCombinedAnalysisStepProps> = ({
  photoGroups,
  onComplete,
  onBack
}) => {
  const { user } = useAuth();
  const { analyzePhotos } = usePhotoAnalysis();

  // Check for token expiry
  const isTokenExpired = (account: any) => {
    if (!account?.expires_at) return false;
    return new Date(account.expires_at) <= new Date();
  };

  // Fetch marketplace accounts with proper cache invalidation
  const { data: marketplaceAccounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['marketplace-accounts', user?.id],
    queryFn: async () => {
      console.log('🔍 BULK UPLOAD: Fetching fresh eBay connection data for user:', user?.id);
      const { data, error } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('user_id', user?.id);
      
      if (error) throw error;
      console.log('✅ BULK UPLOAD: Fresh eBay account data:', data);
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });

  const ebayAccount = marketplaceAccounts?.find(acc => acc.platform === 'ebay' && acc.is_connected);
  const isEbayConnected = !!ebayAccount && ebayAccount.oauth_token && !isTokenExpired(ebayAccount);

  // State management
  const [analysisStarted, setAnalysisStarted] = useState<boolean>(false);
  const [showEbayWarning, setShowEbayWarning] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress[]>([]);
  const [completedGroups, setCompletedGroups] = useState<PhotoGroup[]>([]);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Update eBay warning when connection status changes
  useEffect(() => {
    if (isEbayConnected) {
      setShowEbayWarning(false);
    } else {
      setShowEbayWarning(true);
    }
  }, [isEbayConnected]);

  // Initialize progress tracking and auto-start analysis
  useEffect(() => {
    const initialProgress = photoGroups.map(group => ({
      groupId: group.id,
      aiStatus: group.listingData?.title ? 'completed' as const : 'pending' as const,
      priceStatus: 'pending' as const,
      error: undefined
    }));
    setProgress(initialProgress);
    setCompletedGroups([...photoGroups]);
    
    // Auto-start analysis if not already done
    const needsAnalysis = photoGroups.some(group => !group.listingData?.title);
    if (needsAnalysis) {
      setTimeout(() => {
        startAnalysis();
      }, 500);
    } else {
      setAnalysisStarted(true);
    }
  }, [photoGroups]);

  const updateProgress = (groupId: string, update: Partial<AnalysisProgress>) => {
    setProgress(prev => prev.map(p => 
      p.groupId === groupId ? { ...p, ...update } : p
    ));
  };

  const processGroupAnalysis = async (group: PhotoGroup): Promise<PhotoGroup> => {
    console.log(`🤖 Starting REAL AI analysis for group: ${group.name}`);
    
    try {
      const aiResult = await analyzePhotos(group.photos);
      
      if (!aiResult) {
        throw new Error('AI analysis failed - no result returned');
      }

      // Convert category object to string if needed
      const aiData = {
        title: aiResult.title || `${group.name} - Premium Quality`,
        description: aiResult.description || `High-quality ${group.name.toLowerCase()} in excellent condition.`,
        category: typeof aiResult.category === 'object' && aiResult.category
          ? `${(aiResult.category as any).primary}${(aiResult.category as any).subcategory ? ' > ' + (aiResult.category as any).subcategory : ''}`
          : aiResult.category || 'Clothing, Shoes & Accessories',
        condition: aiResult.condition || 'Used',
        keywords: aiResult.keywords || [group.name.toLowerCase()]
      };

      console.log(`✅ AI analysis completed for ${group.name}:`, aiData);
      
      // Update the group with AI data
      const updatedGroup = {
        ...group,
        listingData: {
          ...group.listingData,
          ...aiData,
          price: group.listingData?.price || 25
        }
      };
      
      // Update progress
      updateProgress(group.id, { aiStatus: 'completed' });
      
      return updatedGroup;
    } catch (error) {
      console.error(`AI analysis failed:`, error);
      
      let errorMessage = 'Analysis failed';
      let suggestion = '';
      
      if (error instanceof Error) {
        if (error.message.includes('504') || error.message.includes('key validation')) {
          errorMessage = 'OpenAI API timeout';
          suggestion = 'Try with smaller photos or fewer images';
        } else if (error.message.includes('500')) {
          errorMessage = 'Server error';
          suggestion = 'Please try again in a moment';
        } else {
          errorMessage = error.message;
        }
      }
      
      updateProgress(group.id, { 
        aiStatus: 'error',
        error: `${errorMessage}${suggestion ? '. ' + suggestion : ''}`
      });
      
      if (suggestion) {
        toast.error(`Analysis failed: ${errorMessage}. ${suggestion}`, {
          duration: 6000
        });
      }
      
      return {
        ...group,
        listingData: {
          ...group.listingData,
          title: group.listingData?.title || group.name,
          description: group.listingData?.description || `High-quality ${group.name.toLowerCase()} in excellent condition.`,
          category: group.listingData?.category || 'Uncategorized',
          condition: group.listingData?.condition || 'Used',
          keywords: group.listingData?.keywords || [group.name.toLowerCase()],
          price: group.listingData?.price || 25
        }
      };
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
      }
      
      setCompletedGroups(processedGroups);
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

  const overallProgress = photoGroups.length > 0 
    ? Math.round(((currentIndex + (isProcessing ? 0 : 1)) / photoGroups.length) * 100)
    : 0;

  const allCompleted = progress.length > 0 && progress.every(p => p.aiStatus === 'completed' || p.aiStatus === 'error');

  // FORCE TABLE VIEW - NO SPLASH SCREEN EVER
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

      {/* eBay Warning */}
      {showEbayWarning && !isEbayConnected && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-orange-800 font-medium">
              eBay not connected - price research will be skipped, but you can set prices manually
            </p>
          </div>
        </div>
      )}

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

      {/* Items Table - Always Show */}
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
                      
                      {/* Actions */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingGroup(isEditing ? null : group.id)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
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
          
          {/* Continue Button */}
          {analysisStarted && allCompleted && (
            <div className="flex justify-between items-center pt-6 border-t">
              <Button variant="outline" onClick={handleBackToGrouping}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Photo Grouping
              </Button>
              <Button onClick={handleContinueToShipping} className="bg-blue-600 hover:bg-blue-700 px-6">
                Continue to Shipping Configuration
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="flex justify-between pt-6">
        <Button 
          variant="outline" 
          onClick={handleBackToGrouping}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Photo Grouping
        </Button>
        
        <div className="flex gap-3">
          {!analysisStarted && (
            <Button 
              onClick={startAnalysis}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Brain className="w-4 h-4" />
              Start Analysis
            </Button>
          )}
          
          {(allCompleted || analysisStarted) && (
            <Button 
              onClick={handleContinueToShipping}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              Continue to Shipping Configuration
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkCombinedAnalysisStep;
