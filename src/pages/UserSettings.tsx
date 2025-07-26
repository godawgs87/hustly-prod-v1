import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/components/AuthProvider';
import StreamlinedHeader from '@/components/StreamlinedHeader';
import UnifiedMobileNavigation from '@/components/UnifiedMobileNavigation';
import UserSettingsTabs from '@/components/user-settings/UserSettingsTabs';

const UserSettings = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isMobile ? 'pb-20' : ''}`}>
      <StreamlinedHeader
        title="Account Settings"
        userEmail={user?.email}
        showBack
        onBack={handleBack}
      />
      
      <div className="max-w-4xl mx-auto p-4">
        <UserSettingsTabs user={user} />
      </div>

      {isMobile && (
        <UnifiedMobileNavigation
          currentView="settings"
          onNavigate={() => {}}
          showBack
          onBack={handleBack}
          title="Settings"
        />
      )}
    </div>
  );
};

export default UserSettings;
