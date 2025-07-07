
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QATestSuite from '@/components/QATestSuite';
import MultiPlatformCategoryQA from '@/components/qa/MultiPlatformCategoryQA';

const QATestPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General QA</TabsTrigger>
            <TabsTrigger value="categories">Multi-Platform Categories</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general">
            <QATestSuite />
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
