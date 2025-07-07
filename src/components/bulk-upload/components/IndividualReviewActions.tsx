
import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, X, Save, ArrowLeft, ArrowRight } from 'lucide-react';

interface IndividualReviewActionsProps {
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onApprove: () => void;
  onReject: () => void;
  onSaveDraft: () => void;
  currentIndex: number;
  totalItems: number;
  canApprove: boolean;
}

const IndividualReviewActions = ({
  onBack,
  onNext,
  onSkip,
  onApprove,
  onReject,
  onSaveDraft,
  currentIndex,
  totalItems,
  canApprove
}: IndividualReviewActionsProps) => {
  const isLastItem = currentIndex === totalItems - 1;

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          onClick={onBack}
          size="sm"
          disabled={currentIndex === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        
        <span className="text-sm text-gray-500">
          {currentIndex + 1} of {totalItems}
        </span>
        
        {!isLastItem && (
          <Button 
            variant="outline" 
            onClick={onSkip}
            size="sm"
          >
            <span className="hidden sm:inline">Skip</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pt-4 border-t gap-3">
        <Button 
          variant="destructive" 
          onClick={onReject}
          className="w-full sm:w-auto"
        >
          <X className="w-4 h-4 mr-2" />
          Reject
        </Button>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={onSaveDraft}
            className="w-full sm:w-auto"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button 
            onClick={onApprove}
            disabled={!canApprove}
            className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {isLastItem ? 'Complete & Save All' : 'Approve & Next'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IndividualReviewActions;
