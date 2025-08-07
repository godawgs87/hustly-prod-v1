import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  DollarSign, 
  Save, 
  CheckCircle, 
  Clock, 
  Loader2, 
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Zap
} from 'lucide-react';

interface CascadeProgress {
  groupId: string;
  stage: 'queued' | 'ai-processing' | 'ai-completed' | 'price-processing' | 'price-completed' | 'save-processing' | 'save-completed' | 'error';
  aiStatus: 'pending' | 'processing' | 'completed' | 'error';
  priceStatus: 'pending' | 'processing' | 'completed' | 'error';
  saveStatus: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  progress: number;
}

interface CascadeQueues {
  aiQueue: any[];
  priceQueue: any[];
  saveQueue: any[];
}

interface CascadeProgressIndicatorProps {
  progress: CascadeProgress[];
  queues: CascadeQueues;
  isProcessing: boolean;
  onRetryItem: (groupId: string) => void;
  completedGroups: any[];
}

const getStageIcon = (stage: CascadeProgress['stage']) => {
  switch (stage) {
    case 'queued':
      return <Clock className="w-4 h-4 text-gray-400" />;
    case 'ai-processing':
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    case 'ai-completed':
      return <Brain className="w-4 h-4 text-blue-600" />;
    case 'price-processing':
      return <Loader2 className="w-4 h-4 animate-spin text-green-500" />;
    case 'price-completed':
      return <DollarSign className="w-4 h-4 text-green-600" />;
    case 'save-processing':
      return <Loader2 className="w-4 h-4 animate-spin text-purple-500" />;
    case 'save-completed':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'error':
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
};

const getStageColor = (stage: CascadeProgress['stage']) => {
  switch (stage) {
    case 'queued':
      return 'bg-gray-100 text-gray-600';
    case 'ai-processing':
      return 'bg-blue-100 text-blue-700';
    case 'ai-completed':
      return 'bg-blue-50 text-blue-600';
    case 'price-processing':
      return 'bg-green-100 text-green-700';
    case 'price-completed':
      return 'bg-green-50 text-green-600';
    case 'save-processing':
      return 'bg-purple-100 text-purple-700';
    case 'save-completed':
      return 'bg-green-100 text-green-700';
    case 'error':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

const getStageName = (stage: CascadeProgress['stage']) => {
  switch (stage) {
    case 'queued':
      return 'Queued';
    case 'ai-processing':
      return 'AI Analysis';
    case 'ai-completed':
      return 'AI Complete';
    case 'price-processing':
      return 'Price Research';
    case 'price-completed':
      return 'Price Complete';
    case 'save-processing':
      return 'Auto-Saving';
    case 'save-completed':
      return 'Completed';
    case 'error':
      return 'Error';
    default:
      return 'Unknown';
  }
};

export const CascadeProgressIndicator: React.FC<CascadeProgressIndicatorProps> = ({
  progress,
  queues,
  isProcessing,
  onRetryItem,
  completedGroups
}) => {
  // Calculate overall statistics
  const totalItems = progress.length;
  const completedItems = progress.filter(p => p.stage === 'save-completed').length;
  const errorItems = progress.filter(p => p.stage === 'error').length;
  const processingItems = progress.filter(p => 
    p.stage.includes('processing') || p.stage === 'queued'
  ).length;

  const overallProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  // Group items by stage for pipeline visualization
  const stageGroups = {
    queued: progress.filter(p => p.stage === 'queued'),
    aiProcessing: progress.filter(p => p.stage === 'ai-processing'),
    priceProcessing: progress.filter(p => p.stage === 'price-processing'),
    saveProcessing: progress.filter(p => p.stage === 'save-processing'),
    completed: progress.filter(p => p.stage === 'save-completed'),
    error: progress.filter(p => p.stage === 'error')
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            Cascade Processing Pipeline
            {isProcessing && (
              <Badge variant="secondary" className="ml-2">
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                Processing
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Overall Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{Math.round(overallProgress)}% ({completedItems}/{totalItems})</span>
              </div>
              <Progress value={overallProgress} className="w-full h-2" />
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-green-600">{completedItems}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-blue-600">{processingItems}</div>
                <div className="text-sm text-gray-600">Processing</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-red-600">{errorItems}</div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-gray-600">{totalItems}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Pipeline Stages */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <div className="font-medium">Queue</div>
                  <div className="text-sm text-gray-600">{stageGroups.queued.length} items</div>
                </div>
              </div>
              
              <ArrowRight className="w-4 h-4 text-gray-400" />
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">AI Analysis</div>
                  <div className="text-sm text-gray-600">{stageGroups.aiProcessing.length} processing</div>
                </div>
              </div>
              
              <ArrowRight className="w-4 h-4 text-gray-400" />
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium">Price Research</div>
                  <div className="text-sm text-gray-600">{stageGroups.priceProcessing.length} processing</div>
                </div>
              </div>
              
              <ArrowRight className="w-4 h-4 text-gray-400" />
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Save className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium">Auto-Save</div>
                  <div className="text-sm text-gray-600">{stageGroups.saveProcessing.length} processing</div>
                </div>
              </div>
              
              <ArrowRight className="w-4 h-4 text-gray-400" />
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium">Complete</div>
                  <div className="text-sm text-gray-600">{stageGroups.completed.length} done</div>
                </div>
              </div>
            </div>

            {/* Queue Status */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="font-medium text-blue-700">AI Queue</div>
                <div className="text-blue-600">{queues.aiQueue.length} items</div>
              </div>
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="font-medium text-green-700">Price Queue</div>
                <div className="text-green-600">{queues.priceQueue.length} items</div>
              </div>
              <div className="text-center p-2 bg-purple-50 rounded">
                <div className="font-medium text-purple-700">Save Queue</div>
                <div className="text-purple-600">{queues.saveQueue.length} items</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Item Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Item Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {progress.map((item, index) => {
              const group = completedGroups.find(g => g.id === item.groupId);
              const itemName = group?.name || group?.listingData?.title || `Item ${index + 1}`;
              
              return (
                <div key={item.groupId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStageIcon(item.stage)}
                    <div>
                      <div className="font-medium">{itemName}</div>
                      <div className="text-sm text-gray-600">
                        {getStageName(item.stage)}
                        {item.error && ` - ${item.error}`}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Progress Bar */}
                    <div className="w-24">
                      <Progress value={item.progress} className="h-1" />
                    </div>
                    
                    {/* Stage Badge */}
                    <Badge className={`text-xs ${getStageColor(item.stage)}`}>
                      {getStageName(item.stage)}
                    </Badge>
                    
                    {/* Retry Button for Errors */}
                    {item.stage === 'error' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRetryItem(item.groupId)}
                        className="flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      {isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">2x</div>
                <div className="text-gray-600">AI Concurrent</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">3x</div>
                <div className="text-gray-600">Price Concurrent</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">4x</div>
                <div className="text-gray-600">Save Concurrent</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">3x</div>
                <div className="text-gray-600">Speed Boost</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
