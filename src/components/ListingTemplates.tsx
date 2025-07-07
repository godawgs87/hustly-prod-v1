
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  File, 
  Plus, 
  Edit, 
  Trash2, 
  Copy,
  Star,
  Wrench,
  Laptop,
  Home,
  Car,
  Shirt
} from 'lucide-react';
import { ListingData } from '@/types/CreateListing';

interface ListingTemplate {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
  template: Partial<ListingData>;
  isCustom?: boolean;
}

interface ListingTemplatesProps {
  onSelectTemplate: (template: Partial<ListingData>) => void;
  onCreateTemplate?: (template: ListingTemplate) => void;
}

const ListingTemplates = ({ onSelectTemplate, onCreateTemplate }: ListingTemplatesProps) => {
  const [templates] = useState<ListingTemplate[]>([
    {
      id: '1',
      name: 'Power Tools',
      category: 'Tools & Hardware',
      icon: <Wrench className="w-5 h-5" />,
      template: {
        category: 'Tools & Hardware',
        condition: 'Used',
        keywords: ['tool', 'professional', 'DIY', 'construction'],
        features: ['Corded/Cordless', 'Variable Speed', 'LED Light'],
        includes: ['Tool', 'Case/Bag', 'Manual'],
        measurements: {
          weight: '3-5 lbs'
        }
      }
    },
    {
      id: '2',
      name: 'Electronics',
      category: 'Electronics',
      icon: <Laptop className="w-5 h-5" />,
      template: {
        category: 'Electronics',
        condition: 'Like New',
        keywords: ['electronics', 'gadget', 'tech', 'digital'],
        features: ['Original Packaging', 'Warranty', 'All Accessories'],
        includes: ['Device', 'Charger', 'Manual', 'Original Box'],
        defects: []
      }
    },
    {
      id: '3',
      name: 'Home & Garden',
      category: 'Home & Garden',
      icon: <Home className="w-5 h-5" />,
      template: {
        category: 'Home & Garden',
        condition: 'Used',
        keywords: ['home', 'garden', 'decor', 'furniture'],
        features: ['Good Condition', 'Clean', 'Functional'],
        includes: ['Item', 'Hardware (if applicable)']
      }
    },
    {
      id: '4',
      name: 'Automotive',
      category: 'Automotive',
      icon: <Car className="w-5 h-5" />,
      template: {
        category: 'Automotive',
        condition: 'Used',
        keywords: ['auto', 'car', 'truck', 'vehicle', 'parts'],
        features: ['Compatible with', 'OEM Quality', 'Easy Installation'],
        includes: ['Part', 'Hardware', 'Instructions']
      }
    },
    {
      id: '5',
      name: 'Mens Clothing',
      category: 'Clothing & Accessories',
      icon: <Shirt className="w-5 h-5" />,
      template: {
        category: 'Clothing & Accessories',
        condition: 'Like New',
        gender: 'Men',
        age_group: 'Adult',
        keywords: ['clothing', 'mens', 'fashion', 'apparel'],
        features: ['No stains', 'No tears', 'Like new condition'],
        includes: ['Garment only'],
        measurements: {
          length: 'See size chart',
          width: 'See size chart'
        }
      }
    },
    {
      id: '6',
      name: 'Womens Clothing',
      category: 'Clothing & Accessories',
      icon: <Shirt className="w-5 h-5" />,
      template: {
        category: 'Clothing & Accessories',
        condition: 'Like New',
        gender: 'Women',
        age_group: 'Adult',
        keywords: ['clothing', 'womens', 'fashion', 'apparel'],
        features: ['No stains', 'No tears', 'Like new condition'],
        includes: ['Garment only'],
        measurements: {
          length: 'See size chart',
          width: 'See size chart'
        }
      }
    },
    {
      id: '7',
      name: 'Kids Clothing',
      category: 'Clothing & Accessories',
      icon: <Shirt className="w-5 h-5" />,
      template: {
        category: 'Clothing & Accessories',
        condition: 'Good',
        gender: 'Kids',
        age_group: 'Youth',
        keywords: ['clothing', 'kids', 'children', 'apparel'],
        features: ['Gently used', 'No major wear', 'Clean'],
        includes: ['Garment only'],
        measurements: {
          length: 'Age appropriate sizing'
        }
      }
    }
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  const handleUseTemplate = (template: ListingTemplate) => {
    onSelectTemplate(template.template);
  };

  const handleCreateCustomTemplate = () => {
    if (!newTemplateName.trim()) return;
    
    const customTemplate: ListingTemplate = {
      id: Date.now().toString(),
      name: newTemplateName,
      category: 'Custom',
      icon: <Star className="w-5 h-5" />,
      template: {
        title: '',
        description: '',
        category: '',
        condition: 'Used',
        keywords: [],
        features: [],
        includes: [],
        measurements: {}
      },
      isCustom: true
    };
    
    onCreateTemplate?.(customTemplate);
    setNewTemplateName('');
    setShowCreateForm(false);
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <File className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Listing Templates</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </div>

        {showCreateForm && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <h4 className="font-medium">Create Custom Template</h4>
            <div className="flex gap-2">
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Template name..."
                className="flex-1"
              />
              <Button onClick={handleCreateCustomTemplate}>
                Create
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => handleUseTemplate(template)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                    {template.icon}
                  </div>
                  <div>
                    <h4 className="font-medium">{template.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {template.category}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Copy className="w-3 h-3" />
                  </Button>
                  {template.isCustom && (
                    <>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Keywords:</span>{' '}
                  {template.template.keywords?.slice(0, 3).join(', ')}
                  {(template.template.keywords?.length || 0) > 3 && '...'}
                </div>
                <div>
                  <span className="font-medium">Features:</span>{' '}
                  {template.template.features?.slice(0, 2).join(', ')}
                  {(template.template.features?.length || 0) > 2 && '...'}
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="font-medium">Condition:</span>
                  <Badge variant="outline" className="text-xs">
                    {template.template.condition}
                  </Badge>
                  {template.template.gender && (
                    <Badge variant="outline" className="text-xs">
                      {template.template.gender}
                    </Badge>
                  )}
                  {template.template.age_group && (
                    <Badge variant="outline" className="text-xs">
                      {template.template.age_group}
                    </Badge>
                  )}
                </div>
              </div>

              <Button className="w-full mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                Use This Template
              </Button>
            </div>
          ))}
        </div>

        <div className="text-center text-sm text-gray-500 mt-4">
          Templates help you create consistent listings faster by pre-filling common fields, keywords, and size information.
        </div>
      </div>
    </Card>
  );
};

export default ListingTemplates;
