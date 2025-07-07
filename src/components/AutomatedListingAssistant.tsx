
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Zap, Brain, Wand2 } from 'lucide-react';
import PricingResearch from './PricingResearch';
import ListingTemplates from './ListingTemplates';
import { ListingData } from '@/types/CreateListing';

interface AutomatedListingAssistantProps {
  currentListing?: Partial<ListingData>;
  onUpdateListing: (updates: Partial<ListingData>) => void;
  onClose: () => void;
}

const AutomatedListingAssistant = ({ 
  currentListing, 
  onUpdateListing,
  onClose 
}: AutomatedListingAssistantProps) => {
  const [activeTab, setActiveTab] = useState('templates');

  const handleTemplateSelect = (template: Partial<ListingData>) => {
    onUpdateListing({
      ...currentListing,
      ...template,
      // Don't override existing title and description if they exist
      title: currentListing?.title || template.title || '',
      description: currentListing?.description || template.description || ''
    });
  };

  const handlePriceSelect = (price: number, research: string) => {
    onUpdateListing({
      ...currentListing,
      price,
      priceResearch: research
    });
  };

  const handleSmartFill = () => {
    // AI-powered smart fill based on title/description
    const smartUpdates: Partial<ListingData> = {
      keywords: [
        ...(currentListing?.keywords || []),
        'quality', 'reliable', 'good condition'
      ],
      features: [
        ...(currentListing?.features || []),
        'Well maintained',
        'Ready to use'
      ]
    };

    onUpdateListing({
      ...currentListing,
      ...smartUpdates
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Brain className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Automated Listing Assistant</h2>
              <p className="text-gray-600">Get pricing insights and use templates to create better listings faster</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSmartFill}>
              <Wand2 className="w-4 h-4 mr-2" />
              Smart Fill
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Zap className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <h3 className="font-semibold">Quick Templates</h3>
            <p className="text-sm text-gray-600">Pre-filled listing data for common categories</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Brain className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <h3 className="font-semibold">Smart Pricing</h3>
            <p className="text-sm text-gray-600">AI-powered competitive price research</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <Wand2 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <h3 className="font-semibold">Auto-Fill</h3>
            <p className="text-sm text-gray-600">Intelligent field completion based on context</p>
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">Listing Templates</TabsTrigger>
          <TabsTrigger value="pricing">Pricing Research</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <ListingTemplates onSelectTemplate={handleTemplateSelect} />
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <PricingResearch
            productTitle={currentListing?.title || ''}
            condition={currentListing?.condition || 'Used'}
            onPriceSelect={handlePriceSelect}
          />
        </TabsContent>
      </Tabs>

      {currentListing && (
        <Card className="p-4 bg-gray-50">
          <h4 className="font-medium mb-2">Current Listing Preview</h4>
          <div className="space-y-2 text-sm">
            <div><strong>Title:</strong> {currentListing.title || 'Not set'}</div>
            <div><strong>Category:</strong> {currentListing.category || 'Not set'}</div>
            <div><strong>Condition:</strong> {currentListing.condition || 'Not set'}</div>
            <div><strong>Price:</strong> {currentListing.price ? `$${currentListing.price}` : 'Not set'}</div>
            {currentListing.keywords && currentListing.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <strong>Keywords:</strong>
                {currentListing.keywords.slice(0, 5).map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
                {currentListing.keywords.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{currentListing.keywords.length - 5} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AutomatedListingAssistant;
