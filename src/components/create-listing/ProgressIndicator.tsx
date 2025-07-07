
import React from 'react';
import { Check } from 'lucide-react';
import { Step } from '@/types/CreateListing';

interface ProgressIndicatorProps {
  currentStep: Step;
}

const ProgressIndicator = ({ currentStep }: ProgressIndicatorProps) => {
  const steps = [
    { key: 'photos', label: 'Upload Photos' },
    { key: 'preview', label: 'Review & Edit' },
    { key: 'shipping', label: 'Configure Shipping' },
    { key: 'published', label: 'Published' }
  ];

  const getCurrentStepIndex = () => {
    return steps.findIndex(step => step.key === currentStep);
  };

  const currentIndex = getCurrentStepIndex();

  return (
    <div className="flex items-center justify-center mb-4 md:mb-8 px-2">
      <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-0 w-full max-w-2xl">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className="flex items-center w-full md:w-auto">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0
                ${index < currentIndex 
                  ? 'bg-green-500 text-white' 
                  : index === currentIndex 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300'
                }
              `}>
                {index < currentIndex ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span className={`
                ml-2 text-sm font-medium
                ${index <= currentIndex ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}
              `}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`
                hidden md:block w-12 h-0.5 mx-4
                ${index < currentIndex ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'}
              `} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ProgressIndicator;
