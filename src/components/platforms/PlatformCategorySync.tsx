import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Download, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { platformRegistry } from '@/services/platforms/PlatformRegistry';

interface PlatformCategorySyncProps {
  platformId: string;
}

const PlatformCategorySync: React.FC<PlatformCategorySyncProps> = ({ platformId }) => {
  const [syncing, setSyncing] = useState(false);
  const [categoryCount, setCategoryCount] = useState<number | null>(null);
  const { toast } = useToast();

  const platform = platformRegistry.get(platformId);
  const platformName = platform?.name || platformId;

  useEffect(() => {
    checkCategoryCount();
  }, [platformId]);

  const checkCategoryCount = async () => {
    try {
      // For now, we'll use eBay-specific table, but this should be generalized
      // to support multiple platforms in the future
      if (platformId === 'ebay') {
        const { count } = await supabase
          .from('ebay_categories')
          .select('*', { count: 'exact', head: true });
        setCategoryCount(count || 0);
      } else {
        // For other platforms, we might need different tables or approaches
        setCategoryCount(0);
      }
    } catch (error) {
      console.error(`Failed to check ${platformName} category count:`, error);
    }
  };

  const syncCategories = async () => {
    try {
      setSyncing(true);
      
      // Platform-specific sync endpoints
      const syncEndpoint = platformId === 'ebay' ? 'ebay-category-sync' : `${platformId}-category-sync`;
      
      const { data, error } = await supabase.functions.invoke(syncEndpoint, {
        body: { fullSync: true }
      });

      if (error) throw error;

      if (data?.status === 'success') {
        toast({
          title: "Categories Synced Successfully! 🎉",
          description: `Downloaded ${data.categories_synced} ${platformName} categories`
        });
        await checkCategoryCount();
      } else {
        throw new Error(data?.error || 'Sync failed');
      }
    } catch (error: any) {
      console.error(`Failed to sync ${platformName} categories:`, error);
      toast({
        title: "Sync Failed",
        description: error.message || `Failed to sync ${platformName} categories`,
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const downloadCategories = async () => {
    try {
      setSyncing(true);
      
      // Platform-specific download endpoints
      const downloadEndpoint = platformId === 'ebay' ? 'ebay-category-download' : `${platformId}-category-download`;
      
      const { data, error } = await supabase.functions.invoke(downloadEndpoint);

      if (error) throw error;

      if (data?.status === 'success') {
        toast({
          title: "Categories Downloaded! 📥",
          description: `Fetched ${data.categories_downloaded} ${platformName} categories`
        });
        await checkCategoryCount();
      } else {
        throw new Error(data?.error || 'Download failed');
      }
    } catch (error: any) {
      console.error(`Failed to download ${platformName} categories:`, error);
      toast({
        title: "Download Failed",
        description: error.message || `Failed to download ${platformName} categories`,
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{platformName} Category Database</span>
          {categoryCount !== null && categoryCount > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              {categoryCount.toLocaleString()} categories
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {categoryCount === 0 ? (
          <>
            <Alert>
              <AlertDescription>
                No {platformName} categories found in the database. Download categories to enable category selection features.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={downloadCategories} 
              disabled={syncing}
              className="w-full"
            >
              {syncing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Downloading Categories...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download {platformName} Categories
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {platformName} categories are available. You can sync to get the latest updates.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={syncCategories} 
              disabled={syncing}
              variant="outline"
              className="w-full"
            >
              {syncing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing Categories...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Latest Categories
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PlatformCategorySync;
