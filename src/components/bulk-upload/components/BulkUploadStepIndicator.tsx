
import React from 'react';
import { Upload, Grid3X3, CheckCircle, TrendingUp, Truck, BarChart } from 'lucide-react';

interface BulkUploadStepIndicatorProps {
  currentStep: string;
  photos: File[];
  photoGroups: any[];
  processingResults: any[];
}

const BulkUploadStepIndicator = ({ 
  currentStep, 
  photos, 
  photoGroups, 
  processingResults 
}: BulkUploadStepIndicatorProps) => {
  const getStepIcon = (step: string) => {
    switch (step) {
      case 'upload': return Upload;
      case 'grouping': return Grid3X3;
      case 'analysis': return CheckCircle;
      case 'priceResearch': return TrendingUp;
      case 'confirmation': return BarChart;
      case 'shipping': return Truck;
      case 'finalReview': return BarChart;
      default: return Upload;
    }
  };

  const steps = [
    { key: 'upload', label: 'Upload Photos', completed: photos.length > 0 },
    { key: 'grouping', label: 'Group Items', completed: photoGroups.length > 0 },
    { key: 'analysis', label: 'AI Analysis', completed: photoGroups.some(g => g.listingData?.title) },
    { key: 'priceResearch', label: 'Price Research', completed: photoGroups.some(g => g.listingData?.priceResearch) },
    { key: 'confirmation', label: 'Review Items', completed: photoGroups.length > 0 },
    { key: 'shipping', label: 'Configure Shipping', completed: photoGroups.every(g => g.selectedShipping) },
    { key: 'finalReview', label: 'Final Review', completed: false }
  ];

  return (
    <div className="flex items-center justify-center space-x-4 mb-8 overflow-x-auto">
      {steps.map((step, index) => {
        const Icon = getStepIcon(step.key);
        const isActive = currentStep === step.key || (currentStep === 'individual-review' && step.key === 'review');
        const isCompleted = step.completed;
        
        return (
          <div key={step.key} className="flex items-center flex-shrink-0">
            <div className={`flex items-center space-x-2 ${
              isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                isActive ? 'bg-blue-100 border-2 border-blue-600' : 
                isCompleted ? 'bg-green-100 border-2 border-green-600' : 
                'bg-gray-100 border-2 border-gray-300'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="font-medium text-sm">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-8 h-0.5 mx-2 ${
                isCompleted ? 'bg-green-600' : 'bg-gray-300'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BulkUploadStepIndicator;
