
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MultiPlatformCategoryQA from '@/components/qa/MultiPlatformCategoryQA';
import EbaySyncDebugDashboard from '@/components/debug/EbaySyncDebugDashboard';

const QATestPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <Tabs defaultValue="ebay-debug" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ebay-debug">eBay Debug</TabsTrigger>
            <TabsTrigger value="categories">Multi-Platform Categories</TabsTrigger>
          </TabsList>
          
          <TabsContent value="ebay-debug">
            <EbaySyncDebugDashboard />
          </TabsContent>
          
          <TabsContent value="categories">
            <MultiPlatformCategoryQA />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default QATestPage;
