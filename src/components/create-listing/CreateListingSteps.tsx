
import React from 'react';
import { Check } from 'lucide-react';
import { Step } from '@/types/CreateListing';

interface CreateListingStepsProps {
  currentStep: Step;
  photos: File[];
  listingData: any;
}

const CreateListingSteps = ({ currentStep, photos, listingData }: CreateListingStepsProps) => {
  const steps = [
    { id: 'photos', title: 'Photos', completed: photos.length > 0 },
    { id: 'analysis', title: 'Analysis', completed: listingData !== null },
    { id: 'preview', title: 'Preview', completed: currentStep === 'shipping' },
    { id: 'shipping', title: 'Ship', completed: false }
  ];

  return (
    <div className="bg-white border-b border-gray-200 p-3 sticky top-[60px] z-40">
      <div className="flex justify-between items-center max-w-full overflow-x-auto">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center min-w-0 flex-1">
            <div className="flex items-center justify-center min-w-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                step.completed 
                  ? 'bg-green-500 text-white' 
                  : currentStep === step.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}>
                {step.completed ? <Check className="w-3 h-3" /> : index + 1}
              </div>
              <span className="ml-1.5 text-xs font-medium text-gray-900 truncate">{step.title}</span>
            </div>
            {index < steps.length - 1 && (
              <div className="w-4 h-0.5 bg-gray-300 mx-1.5 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CreateListingSteps;
