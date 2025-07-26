
import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Download, FileText, Loader2, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useFormManager } from '@/hooks/useFormManager';
import { useSupabaseRecord } from '@/hooks/useSupabaseQuery';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';

interface FinancialData {
  account_type: string;
  tax_id: string;
  business_name: string;
  business_address: string;
  default_currency: string;
  fiscal_year_end: string;
}

const UserFinancialsTab = () => {
  const { user } = useAuth();

  // Load financial data
  const { data: financialData, loading: loadingFinancials } = useSupabaseRecord<FinancialData>(
    'user_profiles',
    user?.id || null,
    'account_type, tax_id, business_name, business_address, default_currency, fiscal_year_end',
    { showToasts: false }
  );

  // Form management for financial updates
  const form = useFormManager({
    initialData: {
      account_type: financialData?.account_type || 'individual',
      tax_id: financialData?.tax_id || '',
      business_name: financialData?.business_name || '',
      business_address: financialData?.business_address || '',
      default_currency: financialData?.default_currency || 'USD',
      fiscal_year_end: financialData?.fiscal_year_end || '12-31'
    },
    saveFunction: async (data: FinancialData) => {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user?.id,
          ...data,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
    },
    successMessage: 'Financial information updated successfully',
    errorMessage: 'Failed to update financial information'
  });

  // Export operation
  const { loading: exporting, execute: exportData } = useAsyncOperation({
    successMessage: 'Export completed successfully',
    errorMessage: 'Failed to export data'
  });

  // Update form data when financial data loads
  useEffect(() => {
    if (financialData) {
      form.updateMultipleFields({
        account_type: financialData.account_type || 'individual',
        tax_id: financialData.tax_id || '',
        business_name: financialData.business_name || '',
        business_address: financialData.business_address || '',
        default_currency: financialData.default_currency || 'USD',
        fiscal_year_end: financialData.fiscal_year_end || '12-31'
      });
    }
  }, [financialData]);

  const handleExportFinancials = async () => {
    await exportData(async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('account_type, tax_id, business_name, business_address, default_currency, fiscal_year_end')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      
      // Create and download CSV
      const csvContent = Object.entries(data || {})
        .map(([key, value]) => `${key},${value}`)
        .join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'financial-data.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  };

  if (loadingFinancials) {
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
                checked={form.formData.account_type === 'individual'}
                onChange={(e) => form.updateField('account_type', e.target.value)}
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
                checked={form.formData.account_type === 'business'}
                onChange={(e) => form.updateField('account_type', e.target.value)}
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
              onClick={form.save}
              disabled={!form.canSave}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {form.saving ? (
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
