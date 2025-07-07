
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { DollarSign, Download, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const UserFinancialsTab = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  
  const [financialData, setFinancialData] = useState({
    account_type: 'individual',
    tax_id: '',
    business_name: ''
  });

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('account_type')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading financial data:', error);
        return;
      }

      if (data) {
        setFinancialData(prev => ({
          ...prev,
          account_type: data.account_type || 'individual'
        }));
      }
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Please sign in to save financial settings",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({
          account_type: financialData.account_type
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Financial settings saved successfully"
      });
    } catch (error: any) {
      console.error('Error saving financial data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save financial settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFinancialData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-3 mb-6">
        <DollarSign className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold">Financial Management</h3>
      </div>

      <div className="space-y-6">
        <div>
          <Label className="text-base font-medium">Account Type</Label>
          <p className="text-sm text-gray-600 mb-3">Select your account type for tax and marketplace purposes</p>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="individual"
                name="account_type"
                value="individual"
                checked={financialData.account_type === 'individual'}
                onChange={(e) => handleInputChange('account_type', e.target.value)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300"
              />
              <Label htmlFor="individual" className="text-sm font-medium">
                Individual / Personal Account
              </Label>
            </div>
            <p className="text-sm text-gray-500 ml-7">
              For personal reselling, hobby sales, or individual sellers
            </p>
            
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="business"
                name="account_type"
                value="business"
                checked={financialData.account_type === 'business'}
                onChange={(e) => handleInputChange('account_type', e.target.value)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300"
              />
              <Label htmlFor="business" className="text-sm font-medium">
                Business Account
              </Label>
            </div>
            <p className="text-sm text-gray-500 ml-7">
              For registered businesses, LLCs, corporations, or professional sellers
            </p>
          </div>
          
          <div className="mt-4">
            <Button 
              onClick={handleSave}
              disabled={saving}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Account Type'
              )}
            </Button>
          </div>
        </div>

        <Separator />
        <div>
          <Label className="text-base font-medium">Payment Methods</Label>
          <p className="text-sm text-gray-600 mb-3">Manage how you receive payments</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                  PP
                </div>
                <div>
                  <p className="font-medium">PayPal</p>
                  <p className="text-sm text-gray-600">user@email.com</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Edit</Button>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-6 bg-green-600 rounded flex items-center justify-center text-white text-xs font-bold">
                  BANK
                </div>
                <div>
                  <p className="font-medium">Bank Transfer</p>
                  <p className="text-sm text-gray-600">••••••••1234</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Edit</Button>
            </div>
            
            <Button variant="outline" className="w-full">
              + Add Payment Method
            </Button>
          </div>
        </div>

        <Separator />

        <div>
          <Label className="text-base font-medium">Tax Information</Label>
          <p className="text-sm text-gray-600 mb-3">Tax reporting and documentation</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tax-id">Tax ID / EIN</Label>
              <Input id="tax-id" placeholder="XX-XXXXXXX" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="business-name">Business Name</Label>
              <Input id="business-name" placeholder="Your business name" className="mt-1" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <Download className="w-4 h-4 mr-2" />
              Download Tax Summary (2024)
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <FileText className="w-4 h-4 mr-2" />
              Generate 1099 Forms
            </Button>
          </div>
        </div>

        <Separator />

        <div>
          <Label className="text-base font-medium">Fee Tracking</Label>
          <p className="text-sm text-gray-600 mb-3">Monitor platform fees and costs</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <p className="text-2xl font-bold text-green-600">$1,245</p>
              <p className="text-sm text-gray-600">Total Revenue</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-2xl font-bold text-red-600">$156</p>
              <p className="text-sm text-gray-600">Platform Fees</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-2xl font-bold text-orange-600">$89</p>
              <p className="text-sm text-gray-600">Shipping</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-2xl font-bold text-blue-600">$1,000</p>
              <p className="text-sm text-gray-600">Net Profit</p>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <Label className="text-base font-medium">Reports & Exports</Label>
          <p className="text-sm text-gray-600 mb-3">Download financial reports and statements</p>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <Download className="w-4 h-4 mr-2" />
              Profit & Loss Statement
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Download className="w-4 h-4 mr-2" />
              Sales Report (CSV)
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Download className="w-4 h-4 mr-2" />
              Fee Analysis Report
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default UserFinancialsTab;
