import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import StreamlinedHeader from '@/components/StreamlinedHeader';
import UnifiedMobileNavigation from '@/components/UnifiedMobileNavigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Camera, 
  Upload, 
  Package, 
  Zap,
  FileImage,
  FolderOpen,
  ArrowRight,
  Plus,
  Sparkles
} from 'lucide-react';

type ListingMode = 'single' | 'bulk' | null;

const CreateListingPage = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<ListingMode>(null);

  const handleBack = () => {
    if (selectedMode) {
      setSelectedMode(null);
    } else {
      navigate('/');
    }
  };

  const handleModeSelect = (mode: ListingMode) => {
    setSelectedMode(mode);
  };

  const handleStartListing = () => {
    // This would integrate with existing CreateListing component
    // For now, show a placeholder
    console.log(`Starting ${selectedMode} listing process`);
  };

  if (selectedMode) {
    return (
      <div className={`min-h-screen bg-gray-50 ${isMobile ? 'pb-20' : ''}`}>
        <StreamlinedHeader
          title={`${selectedMode === 'single' ? 'Single' : 'Bulk'} Listing Creator`}
          showBack
          onBack={handleBack}
        />
        
        <div className="max-w-4xl mx-auto p-4">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {selectedMode === 'single' ? (
                <Camera className="w-8 h-8 text-blue-600" />
              ) : (
                <Upload className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {selectedMode === 'single' ? 'Single Item Listing' : 'Bulk Upload Process'}
            </h2>
            <p className="text-gray-600 mb-8">
              {selectedMode === 'single' 
                ? 'Create a professional listing with AI assistance'
                : 'Upload multiple items at once for efficient listing creation'
              }
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 text-sm">
                🚧 This feature is being enhanced. The existing CreateListing component will be integrated here.
              </p>
            </div>

            <div className="space-y-4">
              <Button 
                size="lg" 
                onClick={handleStartListing}
                className="w-full max-w-md"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Start {selectedMode === 'single' ? 'Creating' : 'Bulk Upload'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleBack}
                className="w-full max-w-md"
              >
                Choose Different Mode
              </Button>
            </div>
          </div>
        </div>

        {isMobile && (
          <UnifiedMobileNavigation
            currentView="create"
            onNavigate={() => {}}
            showBack
            onBack={handleBack}
            title="Create Listing"
          />
        )}
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isMobile ? 'pb-20' : ''}`}>
      <StreamlinedHeader
        title="Create Listing"
        subtitle="Choose your listing method"
        showBack
        onBack={handleBack}
      />
      
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">How would you like to create listings?</h2>
          <p className="text-gray-600">Choose the method that works best for your workflow</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Single Item Listing */}
          <Card 
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 hover:border-blue-300"
            onClick={() => handleModeSelect('single')}
          >
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Single Item</h3>
              <p className="text-gray-600 mb-4">
                Create one listing at a time with AI assistance and detailed customization
              </p>
              <div className="space-y-2 text-sm text-left">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>AI-powered photo analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Smart title & description generation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Cross-platform optimization</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Pricing recommendations</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <Badge variant="secondary" className="mb-2">Recommended for beginners</Badge>
                <div className="flex items-center justify-center gap-1 text-blue-600">
                  <span className="font-medium">Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Upload */}
          <Card 
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 hover:border-purple-300"
            onClick={() => handleModeSelect('bulk')}
          >
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Bulk Upload</h3>
              <p className="text-gray-600 mb-4">
                Upload multiple items at once for efficient high-volume listing creation
              </p>
              <div className="space-y-2 text-sm text-left">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Upload multiple photos at once</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Batch AI processing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Template-based listings</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Mass platform distribution</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <Badge variant="secondary" className="mb-2">Perfect for power sellers</Badge>
                <div className="flex items-center justify-center gap-1 text-purple-600">
                  <span className="font-medium">Start Bulk Upload</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">📊 Your Listing Stats</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">127</div>
              <div className="text-sm text-gray-600">Total Listings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">2.3 min</div>
              <div className="text-sm text-gray-600">Avg. Creation Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">94%</div>
              <div className="text-sm text-gray-600">AI Accuracy Rate</div>
            </div>
          </div>
        </div>
      </div>

      {isMobile && (
        <UnifiedMobileNavigation
          currentView="create"
          onNavigate={() => {}}
          showBack
          onBack={handleBack}
          title="Create Listing"
        />
      )}
    </div>
  );
};

export default CreateListingPage;
