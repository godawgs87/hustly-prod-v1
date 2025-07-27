import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, Plus, Settings } from 'lucide-react';

interface SimplifiedMobileNavProps {
  currentView?: string;
  onNavigate?: (view: string) => void;
  title?: string;
}

const SimplifiedMobileNav: React.FC<SimplifiedMobileNavProps> = ({
  currentView = 'dashboard',
  onNavigate,
  title = 'Dashboard'
}) => {
  const navigate = useNavigate();

  const handleDefaultNavigation = (view: string) => {
    console.log('🔥 MOBILE NAV: Navigating to', view);
    switch (view) {
      case 'dashboard':
        navigate('/');
        break;
      case 'create':
        navigate('/create-listing');
        break;
      case 'settings':
        navigate('/settings');
        break;
      default:
        navigate('/');
    }
  };

  const handleSettingsClick = () => {
    if (onNavigate) {
      onNavigate('settings');
    } else {
      handleDefaultNavigation('settings');
    }
  };

  // FORCE ONLY 3 ITEMS - BYPASS CACHING ISSUE
  console.log('🔥 SIMPLIFIED MOBILE NAV: Rendering ONLY 3 items - Home, Create, Settings');
  
  const navItems = [
    {
      view: 'dashboard',
      icon: Home,
      label: 'Home',
      action: () => onNavigate ? onNavigate('dashboard') : handleDefaultNavigation('dashboard')
    },
    {
      view: 'create',
      icon: Plus,
      label: 'Create',
      action: () => onNavigate ? onNavigate('create') : handleDefaultNavigation('create'),
      primary: true
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600 z-50 shadow-lg">
      <div className="flex justify-around items-center py-2 px-1">
        {navItems.map(({ view, icon: Icon, label, action, primary }) => (
          <div key={view} className="relative">
            <Button
              variant={currentView === view ? 'default' : 'ghost'}
              size="sm"
              onClick={action}
              className={`flex flex-col items-center p-2 min-h-14 min-w-12 ${
                primary ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
              }`}
            >
              <Icon className="w-4 h-4 mb-1" />
              <span className="text-xs">{label}</span>
            </Button>
          </div>
        ))}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSettingsClick}
          className="flex flex-col items-center p-2 min-h-14 min-w-12"
        >
          <Settings className="w-4 h-4 mb-1" />
          <span className="text-xs">Settings</span>
        </Button>
      </div>
    </div>
  );
};

export default SimplifiedMobileNav;
