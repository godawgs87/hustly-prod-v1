
import React from 'react';
import StreamlinedHeader from '@/components/StreamlinedHeader';

interface ListingsLoadingStateProps {
  title: string;
  userEmail?: string;
  onBack: () => void;
  isMobile: boolean;
}

const ListingsLoadingState = ({ title, userEmail, onBack, isMobile }: ListingsLoadingStateProps) => {
  return (
    <div className={`min-h-screen bg-gray-50 ${isMobile ? 'pb-20' : ''}`}>
      <StreamlinedHeader
        title={title}
        userEmail={userEmail}
        showBack
        onBack={onBack}
      />
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="ml-2">Loading listings...</span>
      </div>
    </div>
  );
};

export default ListingsLoadingState;
