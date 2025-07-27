
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle, Plus, Merge, Split, Grid3X3, Move } from 'lucide-react';
import type { PhotoGroup } from './BulkUploadManager';

interface PhotoGroupingInterfaceProps {
  photoGroups: PhotoGroup[];
  onGroupsConfirmed: (groups: PhotoGroup[]) => void;
  onBack: () => void;
}

const PhotoGroupingInterface: React.FC<PhotoGroupingInterfaceProps> = ({
  photoGroups: initialGroups,
  onGroupsConfirmed,
  onBack
}) => {
  console.log('🔍 PHOTO GROUPING INTERFACE: Rendering with', initialGroups?.length || 0, 'groups');

  const [groups, setGroups] = useState<PhotoGroup[]>(initialGroups);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [draggedPhoto, setDraggedPhoto] = useState<{ photo: File; fromGroupId: string; photoIndex: number } | null>(null);

  const getConfidenceIcon = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'medium': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'low': return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getConfidenceText = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high': return 'High Confidence';
      case 'medium': return 'Review Suggested';
      case 'low': return 'Needs Review';
    }
  };

  const handleGroupNameChange = (groupId: string, newName: string) => {
    setGroups(prev => prev.map(group => 
      group.id === groupId ? { ...group, name: newName } : group
    ));
  };

  const createNewGroup = () => {
    const newGroup: PhotoGroup = {
      id: `group-${Date.now()}`,
      photos: [],
      name: `New Group ${groups.length + 1}`,
      confidence: 'high',
      status: 'pending'
    };
    setGroups(prev => [...prev, newGroup]);
  };

  const mergeSelectedGroups = () => {
    if (selectedGroups.size < 2) return;
    
    const groupsToMerge = groups.filter(g => selectedGroups.has(g.id));
    const mergedPhotos = groupsToMerge.flatMap(g => g.photos);
    const firstGroup = groupsToMerge[0];
    
    const mergedGroup: PhotoGroup = {
      ...firstGroup,
      photos: mergedPhotos,
      name: `Merged ${firstGroup.name}`,
      confidence: 'medium'
    };
    
    const remainingGroups = groups.filter(g => !selectedGroups.has(g.id));
    setGroups([...remainingGroups, mergedGroup]);
    setSelectedGroups(new Set());
  };

  const splitGroup = (groupId: string) => {
    const groupToSplit = groups.find(g => g.id === groupId);
    if (!groupToSplit || groupToSplit.photos.length < 2) return;
    
    const midPoint = Math.ceil(groupToSplit.photos.length / 2);
    const firstHalf = groupToSplit.photos.slice(0, midPoint);
    const secondHalf = groupToSplit.photos.slice(midPoint);
    
    const newGroup1: PhotoGroup = {
      ...groupToSplit,
      photos: firstHalf,
      name: `${groupToSplit.name} (1)`
    };
    
    const newGroup2: PhotoGroup = {
      ...groupToSplit,
      id: `${groupToSplit.id}-split`,
      photos: secondHalf,
      name: `${groupToSplit.name} (2)`
    };
    
    setGroups(prev => prev.filter(g => g.id !== groupId).concat([newGroup1, newGroup2]));
  };

  const deleteGroup = (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const handleGroupSelection = (groupId: string) => {
    setSelectedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleDragStart = (photo: File, fromGroupId: string, photoIndex: number) => {
    setDraggedPhoto({ photo, fromGroupId, photoIndex });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, toGroupId: string) => {
    e.preventDefault();
    if (!draggedPhoto) return;

    const { photo, fromGroupId, photoIndex } = draggedPhoto;
    
    if (fromGroupId === toGroupId) {
      setDraggedPhoto(null);
      return;
    }

    setGroups(prev => prev.map(group => {
      if (group.id === fromGroupId) {
        // Remove photo from source group
        return {
          ...group,
          photos: group.photos.filter((_, index) => index !== photoIndex)
        };
      } else if (group.id === toGroupId) {
        // Add photo to target group
        return {
          ...group,
          photos: [...group.photos, photo],
          confidence: 'medium' // Lower confidence when manually moved
        };
      }
      return group;
    }));

    setDraggedPhoto(null);
  };

  const movePhotoToNewGroup = (photo: File, fromGroupId: string, photoIndex: number) => {
    const newGroup: PhotoGroup = {
      id: `group-${Date.now()}`,
      photos: [photo],
      name: `Item ${groups.length + 1}`,
      confidence: 'high',
      status: 'pending'
    };

    setGroups(prev => [
      ...prev.map(group => 
        group.id === fromGroupId 
          ? { ...group, photos: group.photos.filter((_, index) => index !== photoIndex) }
          : group
      ),
      newGroup
    ]);
  };

  const getHighConfidenceCount = () => groups.filter(g => g.confidence === 'high').length;
  const getNeedsReviewCount = () => groups.filter(g => g.confidence !== 'high').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-2">
              <Grid3X3 className="w-5 h-5" />
              <span className="text-lg sm:text-xl">Review AI Grouping</span>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline" className="bg-green-50 text-green-700">
                ✅ {getHighConfidenceCount()} Ready
              </Badge>
              {getNeedsReviewCount() > 0 && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                  ⚠️ {getNeedsReviewCount()} Review
                </Badge>
              )}
            </div>
          </CardTitle>
          <p className="text-sm text-gray-600">
            <span className="hidden sm:inline">💡 Tip: Select any photos from any group by clicking them, then "Combine Selected" to merge them together, or "New Group" to move them. Photos are automatically removed from their original groups.</span>
            <span className="sm:hidden">💡 Tap any photos from any group, then "Combine" to merge them or "New Group" to move them. Photos are automatically moved.</span>
          </p>
        </CardHeader>
        <CardContent>
          {/* Photo Selection Actions - Show when photos are selected */}
          {(() => {
            console.log('🔍 PHOTO SELECTION DEBUG:', {
              selectedPhotosSize: selectedPhotos.size,
              selectedPhotosArray: Array.from(selectedPhotos),
              shouldShowCombineButton: selectedPhotos.size > 1
            });
            return null;
          })()}
          {selectedPhotos.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-sm font-medium text-blue-900">
                  {selectedPhotos.size} photo{selectedPhotos.size > 1 ? 's' : ''} selected from {new Set(Array.from(selectedPhotos).map(key => key.split('-')[0])).size} group{new Set(Array.from(selectedPhotos).map(key => key.split('-')[0])).size > 1 ? 's' : ''}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  {selectedPhotos.size > 1 && (
                    <Button 
                      onClick={() => {
                        console.log('🔥 COMBINE SELECTED CLICKED! selectedPhotos:', Array.from(selectedPhotos));
                        // Combine selected photos into one group
                        const selectedPhotoData: { photo: File; fromGroupId: string; photoIndex: number }[] = [];
                        selectedPhotos.forEach(photoKey => {
                          // Photo key format: "group-{timestamp}-{groupIndex}-{photoIndex}"
                          // Split from the right to get the last two parts as groupIndex and photoIndex
                          const parts = photoKey.split('-');
                          const photoIndex = parseInt(parts[parts.length - 1]); // Last part is photo index
                          const groupIndex = parseInt(parts[parts.length - 2]); // Second to last is group index
                          const groupId = parts.slice(0, -2).join('-'); // Everything before the last two parts
                          console.log('🔍 Processing photo key:', photoKey, 'groupId:', groupId, 'photoIndex:', photoIndex);
                          const group = groups.find(g => g.id === groupId);
                          console.log('🔍 Found group:', group?.id, 'photo exists:', !!group?.photos[photoIndex]);
                          if (group && group.photos[photoIndex]) {
                            selectedPhotoData.push({
                              photo: group.photos[photoIndex],
                              fromGroupId: groupId,
                              photoIndex
                            });
                          }
                        });
                        console.log('🔍 Selected photo data:', selectedPhotoData.length, 'photos');
                        
                        if (selectedPhotoData.length > 1) {
                          console.log('🔥 Creating new combined group with', selectedPhotoData.length, 'photos');
                          const newGroup: PhotoGroup = {
                            id: `group-${Date.now()}`,
                            photos: selectedPhotoData.map(p => p.photo),
                            name: `Combined Group ${groups.length + 1}`,
                            confidence: 'medium', // Medium confidence for manually combined
                            status: 'pending'
                          };
                          console.log('🔥 New group created:', newGroup.id, newGroup.name);
                          
                          // Remove photos from original groups and clean up empty groups
                          setGroups(prev => {
                            console.log('🔥 Updating groups, current count:', prev.length);
                            const updatedGroups = prev.map(group => ({
                              ...group,
                              photos: group.photos.filter((_, index) => 
                                !selectedPhotoData.some(p => p.fromGroupId === group.id && p.photoIndex === index)
                              )
                            })).filter(group => group.photos.length > 0);
                            console.log('🔥 Updated groups count:', updatedGroups.length, 'adding new group');
                            
                            return [...updatedGroups, newGroup];
                          });
                          
                          console.log('🔥 Clearing selected photos');
                          setSelectedPhotos(new Set());
                        } else {
                          console.log('⚠️ Not enough photos to combine:', selectedPhotoData.length);
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                    >
                      <Merge className="w-4 h-4 mr-2" />
                      Combine Selected
                    </Button>
                  )}
                  <Button 
                    onClick={() => {
                      console.log('🔥 NEW GROUP CLICKED! selectedPhotos:', Array.from(selectedPhotos));
                      // Move selected photos to new group
                      const selectedPhotoData: { photo: File; fromGroupId: string; photoIndex: number }[] = [];
                      selectedPhotos.forEach(photoKey => {
                        // Photo key format: "group-{timestamp}-{groupIndex}-{photoIndex}"
                        const parts = photoKey.split('-');
                        const photoIndex = parseInt(parts[parts.length - 1]);
                        const groupId = parts.slice(0, -2).join('-');
                        const group = groups.find(g => g.id === groupId);
                        if (group && group.photos[photoIndex]) {
                          selectedPhotoData.push({
                            photo: group.photos[photoIndex],
                            fromGroupId: groupId,
                            photoIndex
                          });
                        }
                      });
                      
                      if (selectedPhotoData.length > 0) {
                        const newGroup: PhotoGroup = {
                          id: `group-${Date.now()}`,
                          photos: selectedPhotoData.map(p => p.photo),
                          name: selectedPhotoData.length === 1 ? `Item ${groups.length + 1}` : `New Group ${groups.length + 1}`,
                          confidence: 'high',
                          status: 'pending'
                        };
                        
                        // Remove photos from original groups and clean up empty groups
                        setGroups(prev => {
                          const updatedGroups = prev.map(group => ({
                            ...group,
                            photos: group.photos.filter((_, index) => 
                              !selectedPhotoData.some(p => p.fromGroupId === group.id && p.photoIndex === index)
                            )
                          })).filter(group => group.photos.length > 0);
                          
                          return [...updatedGroups, newGroup];
                        });
                        
                        setSelectedPhotos(new Set());
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Group
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedPhotos(new Set())}
                    className="w-full sm:w-auto"
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Group Management Actions */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Button variant="outline" onClick={createNewGroup} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              New Empty Group
            </Button>
            <Button 
              variant="outline" 
              onClick={mergeSelectedGroups}
              disabled={selectedGroups.size < 2}
              className="w-full sm:w-auto"
            >
              <Merge className="w-4 h-4 mr-2" />
              Merge Groups ({selectedGroups.size})
            </Button>
            <Button variant="outline" onClick={() => setSelectedGroups(new Set())} className="w-full sm:w-auto">
              Clear Group Selection
            </Button>
          </div>

          <div className="space-y-4">
            {groups.map((group) => (
              <Card 
                key={group.id} 
                className={`transition-all duration-200 ${selectedGroups.has(group.id) ? 'ring-2 ring-blue-500' : ''}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, group.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedGroups.has(group.id)}
                        onChange={() => handleGroupSelection(group.id)}
                        className="rounded w-4 h-4 flex-shrink-0"
                      />
                      <Input
                        value={group.name}
                        onChange={(e) => handleGroupNameChange(group.id, e.target.value)}
                        className="font-semibold bg-transparent border-none p-0 h-auto text-sm sm:text-base flex-1 min-w-0"
                      />
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getConfidenceIcon(group.confidence)}
                        <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                          {getConfidenceText(group.confidence)}
                        </Badge>
                        <Badge variant="outline" className="text-xs sm:hidden">
                          {group.confidence === 'high' ? '✅' : group.confidence === 'medium' ? '⚠️' : '❌'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => splitGroup(group.id)}
                        disabled={group.photos.length < 2}
                        className="flex-1 sm:flex-none"
                      >
                        <Split className="w-3 h-3 mr-1 sm:mr-0" />
                        <span className="sm:hidden">Split</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteGroup(group.id)}
                        className="flex-1 sm:flex-none text-red-600 hover:text-red-700"
                      >
                        <XCircle className="w-3 h-3 mr-1 sm:mr-0" />
                        <span className="sm:hidden">Delete</span>
                      </Button>
                    </div>
                  </div>
                  {group.aiSuggestion && (
                    <p className="text-sm text-gray-600 mt-2">AI suggests: {group.aiSuggestion}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-2">
                    {group.photos.map((photo, photoIndex) => (
                      <div 
                        key={photoIndex} 
                        className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group cursor-pointer hover:shadow-lg transition-all"
                        draggable
                        onDragStart={() => handleDragStart(photo, group.id, photoIndex)}
                        onClick={() => {
                          const photoKey = `${group.id}-${photoIndex}`;
                          console.log('Photo clicked:', photoKey, 'Currently selected:', selectedPhotos.has(photoKey));
                          if (selectedPhotos.has(photoKey)) {
                            setSelectedPhotos(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(photoKey);
                              console.log('Deselected photo, new selection:', Array.from(newSet));
                              return newSet;
                            });
                          } else {
                            setSelectedPhotos(prev => {
                              const newSet = new Set([...prev, photoKey]);
                              console.log('Selected photo, new selection:', Array.from(newSet));
                              return newSet;
                            });
                          }
                        }}
                      >
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`${group.name} photo ${photoIndex + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {/* Mobile-friendly selection overlay */}
                        <div className="absolute inset-0 bg-black/30 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 text-xs bg-blue-500 hover:bg-blue-600 text-white shadow-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                const photoKey = `${group.id}-${photoIndex}`;
                                console.log('Mobile button clicked:', photoKey, 'Currently selected:', selectedPhotos.has(photoKey));
                                if (selectedPhotos.has(photoKey)) {
                                  setSelectedPhotos(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(photoKey);
                                    console.log('Mobile deselected photo, new selection:', Array.from(newSet));
                                    return newSet;
                                  });
                                } else {
                                  setSelectedPhotos(prev => {
                                    const newSet = new Set([...prev, photoKey]);
                                    console.log('Mobile selected photo, new selection:', Array.from(newSet));
                                    return newSet;
                                  });
                                }
                              }}
                            >
                              {selectedPhotos.has(`${group.id}-${photoIndex}`) ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  <span className="sm:hidden">Selected</span>
                                  <span className="hidden sm:inline">Selected</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3 mr-1" />
                                  <span className="sm:hidden">Select</span>
                                  <span className="hidden sm:inline">Select</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                        {/* Selection indicator */}
                        {selectedPhotos.has(`${group.id}-${photoIndex}`) && (
                          <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4" />
                          </div>
                        )}
                        {/* Photo number indicator */}
                        <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                          {photoIndex + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    <span className="font-medium">{group.photos.length} photos</span>
                    <span className="hidden sm:inline"> • Select photos to reorganize them</span>
                    <span className="sm:hidden"> • Tap photos to select them</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={onBack} className="w-full sm:w-auto order-2 sm:order-1">
              Back to Upload
            </Button>
            <Button 
              onClick={() => onGroupsConfirmed(groups)}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto order-1 sm:order-2 text-base py-3"
              size="lg"
            >
              ✅ Process All Groups ({groups.length})
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PhotoGroupingInterface;
