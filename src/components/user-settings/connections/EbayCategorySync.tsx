import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Download, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const EbayCategorySync = () => {
  const [syncing, setSyncing] = useState(false);
  const [categoryCount, setCategoryCount] = useState<number | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    checkCategoryCount();
  }, []);

  const checkCategoryCount = async () => {
    try {
      const { count } = await supabase
        .from('ebay_categories')
        .select('*', { count: 'exact', head: true });
      setCategoryCount(count || 0);
    } catch (error) {
      console.error('Failed to check category count:', error);
    }
  };

  const syncCategories = async () => {
    try {
      setSyncing(true);
      const { data, error } = await supabase.functions.invoke('ebay-category-sync', {
        body: { fullSync: true }
      });

      if (error) throw error;

      if (data?.status === 'success') {
        toast({
          title: "Categories Synced Successfully! 🎉",
          description: `Downloaded ${data.categories_synced} eBay categories`
        });
        await checkCategoryCount();
      } else {
        throw new Error(data?.error || 'Sync failed');
      }
    } catch (error: any) {
      console.error('Failed to sync categories:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const needsSync = categoryCount !== null && categoryCount < 1000;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {needsSync ? (
            <Download className="w-5 h-5 text-yellow-600" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-600" />
          )}
          eBay Categories
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {needsSync ? (
          <>
            <Alert>
              <Download className="w-4 h-4" />
              <AlertDescription>
                {categoryCount === 0 
                  ? "No eBay categories found. Categories are needed for listing creation."
                  : `Only ${categoryCount} categories found. Full sync will download ~30,000 categories.`
                }
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-medium">What will be downloaded:</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• All eBay US marketplace categories (~30,000)</li>
                <li>• Category hierarchy and relationships</li>
                <li>• Required item specifics for each category</li>
              </ul>
            </div>

            <Button 
              onClick={syncCategories}
              disabled={syncing}
              className="w-full"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Downloading Categories...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download eBay Categories
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>
                {categoryCount} eBay categories are available. Categories are up to date!
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={checkCategoryCount}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Count
              </Button>
              
              <Button 
                variant="outline" 
                onClick={syncCategories}
                disabled={syncing}
              >
                {syncing ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Re-sync Categories
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EbayCategorySync;