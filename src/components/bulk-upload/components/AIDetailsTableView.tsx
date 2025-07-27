import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Edit, Upload, Play, Clock, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import type { PhotoGroup } from '../BulkUploadManager';

interface AIDetailsTableViewProps {
  photoGroups: PhotoGroup[];
  onEditItem: (groupId: string) => void;
  onPreviewItem: (groupId: string) => void;
  onPostItem: (groupId: string) => void;
  onRunAI: (groupId: string) => void;
  onStartBulkAnalysis?: () => void;
  onProceedToShipping?: () => void;
  onUpdateGroup?: (group: PhotoGroup) => void;
  isAnalyzing?: boolean;
}

const AIDetailsTableView = ({
  photoGroups,
  onEditItem,
  onPreviewItem,
  onPostItem,
  onRunAI,
  onStartBulkAnalysis,
  onProceedToShipping,
  onUpdateGroup,
  isAnalyzing
}: AIDetailsTableViewProps) => {
  const getStatusIcon = (group: PhotoGroup) => {
    if (group.isPosted) return <CheckCircle className="w-4 h-4 text-green-600" />;
    
    switch (group.status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (group: PhotoGroup) => {
    if (group.isPosted) {
      return <Badge className="bg-green-100 text-green-800">Posted</Badge>;
    }
    
    switch (group.status) {
      case 'completed':
        return group.selectedShipping 
          ? <Badge className="bg-green-100 text-green-800">Ready</Badge>
          : <Badge className="bg-yellow-100 text-yellow-800">Needs Shipping</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800 animate-pulse">Processing AI...</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Pending AI</Badge>;
    }
  };

  const pendingCount = photoGroups.filter(g => g.status === 'pending').length;
  const processingCount = photoGroups.filter(g => g.status === 'processing').length;
  const completedCount = photoGroups.filter(g => g.status === 'completed').length;

  return (
    <div className="space-y-4">
      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Analysis</p>
                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Processing</p>
                <p className="text-2xl font-bold text-blue-900">{processingCount}</p>
              </div>
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Completed</p>
                <p className="text-2xl font-bold text-green-900">{completedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {pendingCount > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-900">Ready to start AI analysis</p>
                <p className="text-sm text-blue-700">{pendingCount} items waiting for analysis</p>
              </div>
              <Button 
                onClick={() => {
                  photoGroups.filter(g => g.status === 'pending').forEach(g => onRunAI(g.id));
                }}
                disabled={isAnalyzing}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running AI...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run AI for All Pending
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">📊 AI Analysis Details</span>
            {!isAnalyzing && photoGroups.some(g => g.status === 'pending') && (
              <Button 
                onClick={() => {
                  console.log('🚀 Start AI Analysis button clicked!');
                  const pendingGroups = photoGroups.filter(g => g.status === 'pending');
                  console.log('📋 Pending groups to analyze:', pendingGroups.length);
                  pendingGroups.forEach(g => {
                    console.log('🤖 Starting AI analysis for group:', g.id, g.name);
                    onRunAI(g.id);
                  });
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Start AI Analysis
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 px-2 py-2">Status</TableHead>
                  <TableHead className="w-16 px-2 py-2">Photo</TableHead>
                  <TableHead className="min-w-[180px] px-2 py-2">Title</TableHead>
                  <TableHead className="w-20 px-2 py-2">Price</TableHead>
                  <TableHead className="w-28 px-2 py-2">Category</TableHead>
                  <TableHead className="w-20 px-2 py-2">Condition</TableHead>
                  <TableHead className="w-28 px-2 py-2">Measurements</TableHead>
                  <TableHead className="min-w-[120px] px-2 py-2">Keywords</TableHead>
                  <TableHead className="min-w-[160px] px-2 py-2">Description</TableHead>
                  <TableHead className="w-28 px-2 py-2">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {photoGroups.map((group) => (
                  <TableRow key={group.id} className="hover:bg-gray-50">
                    <TableCell className="px-2 py-2">
                      <div className="flex flex-col items-center gap-1">
                        {getStatusIcon(group)}
                        <div className="text-xs">{getStatusBadge(group)}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-2 py-2">
                      <div className="w-12 h-12 rounded overflow-hidden bg-gray-100">
                        {group.photos && group.photos.length > 0 ? (
                          <img
                            src={URL.createObjectURL(group.photos[0])}
                            alt={group.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                            No Photo
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-2 py-2">
                      <div className="space-y-1">
                        <div className="font-medium text-xs leading-tight">
                          {group.status === 'processing' ? (
                            <div className="text-blue-600 animate-pulse">Analyzing...</div>
                          ) : (
                            <div className="line-clamp-2">{group.listingData?.title || group.name}</div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {group.photos?.length || 0} photos
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-2 py-2">
                      <div className="text-right font-medium text-xs">
                        {group.status === 'processing' ? (
                          <div className="text-blue-600 animate-pulse">...</div>
                        ) : (
                          group.listingData?.price ? `$${group.listingData.price}` : '-'
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-2 py-2">
                      <div className="text-xs">
                        {group.status === 'processing' ? (
                          <div className="text-blue-600 animate-pulse">...</div>
                        ) : group.listingData?.category ? (
                          typeof group.listingData.category === 'object' && group.listingData.category !== null ? (
                            <div>
                              <div className="font-medium leading-tight">{(group.listingData.category as any)?.primary || ''}</div>
                              {(group.listingData.category as any)?.subcategory && (
                                <div className="text-xs text-gray-500 leading-tight">{(group.listingData.category as any).subcategory}</div>
                              )}
                            </div>
                          ) : (
                            <div className="leading-tight">{String(group.listingData.category)}</div>
                          )
                        ) : (
                          '-'
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-2 py-2">
                      <div className="text-xs">
                        {group.status === 'processing' ? (
                          <div className="text-blue-600 animate-pulse">...</div>
                        ) : (
                          group.listingData?.condition || '-'
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-2 py-2">
                      <div className="text-xs space-y-1">
                        {group.status === 'processing' ? (
                          <div className="text-blue-600 animate-pulse">...</div>
                        ) : group.listingData?.measurements ? (
                          (() => {
                            const measurements = group.listingData.measurements;
                            const validMeasurements = Object.entries(measurements)
                              .filter(([key, value]) => value !== null && value !== undefined && value !== '')
                              .slice(0, 3); // Show max 3 measurements to save space
                            
                            if (validMeasurements.length === 0) {
                              return <span className="text-gray-400">-</span>;
                            }
                            
                            return validMeasurements.map(([key, value]) => {
                              const shortKey = {
                                'chest': 'C',
                                'length': 'L', 
                                'sleeve': 'S',
                                'width': 'W',
                                'height': 'H',
                                'weight': 'Wt',
                                'shoulder': 'Sh',
                                'waist': 'Wa',
                                'diameter': 'D'
                              }[key] || key.charAt(0).toUpperCase();
                              
                              return (
                                <div key={key} title={`${key}: ${value}`} className="leading-tight">
                                  {shortKey}: {value}
                                </div>
                              );
                            });
                          })()
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-2 py-2">
                      <div className="space-y-1">
                        {group.status === 'processing' ? (
                          <div className="text-blue-600 animate-pulse">...</div>
                        ) : group.listingData?.keywords && group.listingData.keywords.length > 0 ? (
                          group.listingData.keywords.slice(0, 2).map((keyword, index) => (
                            <Badge key={index} variant="outline" className="text-xs mr-1 px-1 py-0">
                              {keyword}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                        {group.listingData?.keywords && group.listingData.keywords.length > 2 && (
                          <div className="text-xs text-gray-500">
                            +{group.listingData.keywords.length - 2} more
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-2 py-2">
                      <div className="text-xs text-gray-600 max-w-[140px]">
                        {group.status === 'processing' ? (
                          <div className="text-blue-600 animate-pulse">Generating...</div>
                        ) : group.listingData?.description ? (
                          <div className="line-clamp-2 leading-tight">
                            {group.listingData.description.length > 60 
                              ? `${group.listingData.description.substring(0, 60)}...`
                              : group.listingData.description
                            }
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="px-2 py-2">
                      <div className="flex flex-col gap-1">
                        {group.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => onRunAI(group.id)}
                            disabled={isAnalyzing}
                            className="bg-blue-600 hover:bg-blue-700 text-xs disabled:opacity-50"
                          >
                            {isAnalyzing ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Running...
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 mr-1" />
                                Run AI
                              </>
                            )}
                          </Button>
                        )}
                        
                        {group.status === 'processing' && (
                          <Button
                            size="sm"
                            disabled
                            className="text-xs"
                          >
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Processing...
                          </Button>
                        )}
                        
                        {group.status === 'completed' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onPreviewItem(group.id)}
                              className="text-xs"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Preview
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEditItem(group.id)}
                              className="text-xs"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            
                            {group.selectedShipping && !group.isPosted && (
                              <Button
                                size="sm"
                                onClick={() => onPostItem(group.id)}
                                className="bg-green-600 hover:bg-green-700 text-xs"
                              >
                                <Upload className="w-3 h-3 mr-1" />
                                Post
                              </Button>
                            )}
                          </>
                        )}
                        
                        {group.status === 'error' && (
                          <Button
                            size="sm"
                            onClick={() => onRunAI(group.id)}
                            disabled={isAnalyzing}
                            className="bg-red-600 hover:bg-red-700 text-xs disabled:opacity-50"
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Retry
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Show completion status when all items are analyzed */}
      {completedCount > 0 && completedCount === photoGroups.length && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-center">
              <div>
                <p className="font-medium text-green-900">AI Analysis Complete</p>
                <p className="text-sm text-green-700">{completedCount} items ready for shipping</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIDetailsTableView;
