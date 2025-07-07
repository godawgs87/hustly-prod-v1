import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Check } from 'lucide-react';

interface OnboardingPlatformSelectionProps {
  selectedPlatforms: string[];
  onChange: (platforms: string[]) => void;
}

const platforms = [
  {
    id: 'ebay',
    name: 'eBay',
    icon: '🛒',
    description: 'Global marketplace with auction and fixed price listings',
    features: ['Direct API integration', 'Business policies', 'Promoted listings'],
    tier: 'starter'
  },
  {
    id: 'poshmark',
    name: 'Poshmark',
    icon: '👗',
    description: 'Social marketplace focused on fashion and lifestyle',
    features: ['Social sharing', 'Fashion focused', 'Community features'],
    tier: 'professional'
  },
  {
    id: 'mercari',
    name: 'Mercari',
    icon: '📦',
    description: 'Mobile-first marketplace for everything',
    features: ['Mobile optimized', 'Quick listings', 'Instant shipping'],
    tier: 'professional'
  },
  {
    id: 'depop',
    name: 'Depop',
    icon: '🎨',
    description: 'Creative marketplace for unique and vintage items',
    features: ['Social commerce', 'Trend focused', 'Young audience'],
    tier: 'professional'
  }
];

const OnboardingPlatformSelection = ({ selectedPlatforms, onChange }: OnboardingPlatformSelectionProps) => {
  const togglePlatform = (platformId: string) => {
    if (selectedPlatforms.includes(platformId)) {
      onChange(selectedPlatforms.filter(id => id !== platformId));
    } else {
      onChange([...selectedPlatforms, platformId]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Settings className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Choose Your Marketplace</h2>
        <p className="text-gray-600">
          Select which platform you want to start with. You can add more later based on your plan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platforms.map((platform) => {
          const isSelected = selectedPlatforms.includes(platform.id);
          const isEbay = platform.id === 'ebay';
          
          return (
            <Card
              key={platform.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => togglePlatform(platform.id)}
            >
              <CardContent className="p-4 relative">
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
                
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">{platform.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-gray-900">{platform.name}</h3>
                      {isEbay && (
                        <Badge variant="secondary" className="text-xs">
                          All Plans
                        </Badge>
                      )}
                      {!isEbay && (
                        <Badge variant="outline" className="text-xs">
                          Pro+
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{platform.description}</p>
                    
                    <ul className="space-y-1">
                      {platform.features.map((feature, index) => (
                        <li key={index} className="text-xs text-gray-500 flex items-center">
                          <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedPlatforms.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Selected Platforms:</h4>
          <div className="flex flex-wrap gap-2">
            {selectedPlatforms.map(platformId => {
              const platform = platforms.find(p => p.id === platformId);
              return (
                <Badge key={platformId} variant="default" className="bg-blue-600">
                  {platform?.icon} {platform?.name}
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingPlatformSelection;