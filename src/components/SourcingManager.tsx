
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin, TrendingUp, Calendar, Edit, Trash2 } from 'lucide-react';

interface SourcingLocation {
  id: string;
  name: string;
  location_type: string;
  address?: string;
  notes?: string;
  success_rate?: number;
  average_profit?: number;
  visit_count: number;
  last_visit?: string;
  created_at: string;
}

interface SourcingManagerProps {
  locations: SourcingLocation[];
  onAddLocation: (location: Omit<SourcingLocation, 'id' | 'created_at'>) => void;
  onUpdateLocation: (id: string, updates: Partial<SourcingLocation>) => void;
  onDeleteLocation: (id: string) => void;
}

const SourcingManager = ({ 
  locations, 
  onAddLocation, 
  onUpdateLocation, 
  onDeleteLocation 
}: SourcingManagerProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location_type: 'thrift_store',
    address: '',
    notes: ''
  });

  const locationTypes = [
    { value: 'thrift_store', label: 'Thrift Store' },
    { value: 'estate_sale', label: 'Estate Sale' },
    { value: 'garage_sale', label: 'Garage Sale' },
    { value: 'flea_market', label: 'Flea Market' },
    { value: 'online', label: 'Online' },
    { value: 'wholesale', label: 'Wholesale' },
    { value: 'other', label: 'Other' }
  ];

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    
    onAddLocation({
      ...formData,
      visit_count: 0
    });
    
    setFormData({ name: '', location_type: 'thrift_store', address: '', notes: '' });
    setIsAdding(false);
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      thrift_store: 'bg-blue-100 text-blue-800',
      estate_sale: 'bg-purple-100 text-purple-800',
      garage_sale: 'bg-green-100 text-green-800',
      flea_market: 'bg-yellow-100 text-yellow-800',
      online: 'bg-indigo-100 text-indigo-800',
      wholesale: 'bg-red-100 text-red-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.other;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Sourcing Locations</h2>
        <Button onClick={() => setIsAdding(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Location
        </Button>
      </div>

      {/* Add Location Form */}
      {isAdding && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Add New Sourcing Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Location Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Goodwill Downtown"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <Select 
                value={formData.location_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, location_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locationTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Address (Optional)</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="123 Main St, City, State"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Notes</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Best days to visit, what to look for, etc."
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
              Add Location
            </Button>
          </div>
        </Card>
      )}

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((location) => (
          <Card key={location.id} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{location.name}</h3>
                <Badge className={`text-xs ${getTypeColor(location.location_type)}`}>
                  {locationTypes.find(t => t.value === location.location_type)?.label}
                </Badge>
              </div>
              <div className="flex space-x-1">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setEditingId(location.id)}
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button 
                  variant="destructive" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => onDeleteLocation(location.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {location.address && (
              <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                <MapPin className="w-3 h-3" />
                <span>{location.address}</span>
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Visits:</span>
                <span className="font-medium">{location.visit_count}</span>
              </div>
              
              {location.success_rate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Success Rate:</span>
                  <span className="font-medium text-green-600">{location.success_rate}%</span>
                </div>
              )}
              
              {location.average_profit && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Avg Profit:</span>
                  <span className="font-medium">${location.average_profit.toFixed(2)}</span>
                </div>
              )}
              
              {location.last_visit && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Visit:</span>
                  <span className="font-medium">
                    {new Date(location.last_visit).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {location.notes && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600">{location.notes}</p>
              </div>
            )}
          </Card>
        ))}
      </div>

      {locations.length === 0 && !isAdding && (
        <Card className="p-8 text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sourcing locations yet</h3>
          <p className="text-gray-500 mb-4">Start tracking where you find your best inventory</p>
          <Button onClick={() => setIsAdding(true)} className="bg-blue-600 hover:bg-blue-700">
            Add Your First Location
          </Button>
        </Card>
      )}
    </div>
  );
};

export default SourcingManager;
