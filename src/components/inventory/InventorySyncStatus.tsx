import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';
import { useInventorySync } from '@/hooks/useInventorySync';
import type { InventorySyncStatus } from '@/services/InventorySyncService';

interface InventorySyncStatusProps {
  listingId: string;
  className?: string;
}

const StatusIcon = ({ status }: { status: InventorySyncStatus['status'] }) => {
  switch (status) {
    case 'synced':
      return <CheckCircle className="w-4 h-4 text-success" />;
    case 'pending':
      return <Clock className="w-4 h-4 text-warning" />;
    case 'conflict':
      return <AlertTriangle className="w-4 h-4 text-destructive" />;
    case 'error':
      return <XCircle className="w-4 h-4 text-destructive" />;
    default:
      return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
};

const StatusBadge = ({ status }: { status: InventorySyncStatus['status'] }) => {
  const variants = {
    synced: 'default',
    pending: 'secondary',
    conflict: 'destructive',
    error: 'destructive'
  } as const;

  return (
    <Badge variant={variants[status] || 'outline'} className="gap-1">
      <StatusIcon status={status} />
      {status.replace('_', ' ')}
    </Badge>
  );
};

export function InventorySyncStatus({ listingId, className }: InventorySyncStatusProps) {
  const { getSyncStatus, syncListing, handleConflict, isLoading } = useInventorySync();
  const syncStatuses = getSyncStatus(listingId);

  const handleResync = async () => {
    await syncListing(listingId);
  };

  const handleResolveConflict = async () => {
    const conflictPlatforms = syncStatuses
      .filter(s => s.status === 'conflict')
      .map(s => s.platform);
    
    if (conflictPlatforms.length > 0) {
      await handleConflict(listingId, conflictPlatforms);
    }
  };

  const hasConflicts = syncStatuses.some(s => s.status === 'conflict');
  const hasErrors = syncStatuses.some(s => s.status === 'error');
  const allSynced = syncStatuses.length > 0 && syncStatuses.every(s => s.status === 'synced');

  if (syncStatuses.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Platform Sync</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              No platform syncs configured
            </p>
            <Button 
              size="sm" 
              onClick={handleResync}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Start Sync
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Platform Sync Status</CardTitle>
          <div className="flex gap-2">
            {hasConflicts && (
              <Button 
                size="sm" 
                variant="destructive"
                onClick={handleResolveConflict}
                disabled={isLoading}
              >
                Resolve Conflicts
              </Button>
            )}
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleResync}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Resync
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Overall Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Status:</span>
            {allSynced ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="w-4 h-4" />
                All Synced
              </Badge>
            ) : hasConflicts ? (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-4 h-4" />
                Conflicts
              </Badge>
            ) : hasErrors ? (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="w-4 h-4" />
                Errors
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Clock className="w-4 h-4" />
                In Progress
              </Badge>
            )}
          </div>

          <Separator />

          {/* Platform Details */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Platform Details:</h4>
            {syncStatuses.map((status) => (
              <div key={status.platform} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium capitalize">{status.platform}</span>
                  {status.conflicts && status.conflicts.length > 0 && (
                    <Badge variant="outline">
                      {status.conflicts.length} conflict{status.conflicts.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={status.status} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(status.lastSync).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Conflict Details */}
          {hasConflicts && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-destructive">Active Conflicts:</h4>
                {syncStatuses
                  .filter(s => s.conflicts && s.conflicts.length > 0)
                  .map(status => 
                    status.conflicts?.map(conflict => (
                      <div key={conflict.listingId + conflict.conflictType} className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                          <span className="text-sm font-medium text-destructive">
                            {conflict.conflictType.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Platforms: {conflict.platforms.join(', ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Time: {new Date(conflict.details.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )
                }
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}