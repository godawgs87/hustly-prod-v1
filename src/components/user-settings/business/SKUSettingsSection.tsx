import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSKUManagement } from '@/hooks/useSKUManagement';

interface SKUSettings {
  default_sku_prefix: string;
  auto_generate_sku: boolean;
}

const SKUSettingsSection = () => {
  const [settings, setSettings] = useState<SKUSettings>({
    default_sku_prefix: 'SKU',
    auto_generate_sku: true
  });
  const [isSaving, setSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { generateSKU, bulkGenerateSKUs } = useSKUManagement();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('sku_prefix')
        .eq('id', user.id)
        .single();

      if (profile) {
        setSettings({
          default_sku_prefix: profile.sku_prefix || 'SKU',
          auto_generate_sku: true // Default value since we removed this field from user_profiles
        });
      }
    } catch (error) {
      console.error('Error loading SKU settings:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_profiles')
        .update({
          sku_prefix: settings.default_sku_prefix
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "SKU settings have been updated successfully"
      });
    } catch (error) {
      console.error('Error saving SKU settings:', error);
      toast({
        title: "Save Failed",
        description: "Could not save SKU settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateForMissing = async () => {
    setIsGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find listings without SKUs
      const { data: listingsWithoutSKU } = await supabase
        .from('listings')
        .select('id')
        .eq('user_id', user.id)
        .is('sku', null);

      if (!listingsWithoutSKU || listingsWithoutSKU.length === 0) {
        toast({
          title: "All Set!",
          description: "All your listings already have SKUs"
        });
        return;
      }

      const listingIds = listingsWithoutSKU.map(l => l.id);
      const success = await bulkGenerateSKUs(listingIds, settings.default_sku_prefix);

      if (success) {
        toast({
          title: "SKUs Generated",
          description: `Generated SKUs for ${listingIds.length} listings`
        });
      }
    } catch (error) {
      console.error('Error generating SKUs:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate SKUs. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SKU Management</CardTitle>
        <CardDescription>
          Configure how SKUs (Stock Keeping Units) are generated and managed for your listings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="sku-prefix">Default SKU Prefix</Label>
          <Input
            id="sku-prefix"
            value={settings.default_sku_prefix}
            onChange={(e) => setSettings(prev => ({ 
              ...prev, 
              default_sku_prefix: e.target.value 
            }))}
            placeholder="SKU"
            className="w-32"
          />
          <p className="text-sm text-muted-foreground">
            This prefix will be used when auto-generating SKUs (e.g., "SKU-2024-000001")
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Auto-generate SKUs</Label>
            <p className="text-sm text-muted-foreground">
              Automatically generate unique SKUs for new listings
            </p>
          </div>
          <Switch
            checked={settings.auto_generate_sku}
            onCheckedChange={(checked) => setSettings(prev => ({ 
              ...prev, 
              auto_generate_sku: checked 
            }))}
          />
        </div>

        <div className="pt-4 space-y-4">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? 'Saving...' : 'Save SKU Settings'}
          </Button>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Bulk Operations</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Generate SKUs for existing listings that don't have them
            </p>
            <Button
              variant="outline"
              onClick={handleGenerateForMissing}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate SKUs for Missing
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SKUSettingsSection;