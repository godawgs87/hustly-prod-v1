
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, ArrowLeft, Package, Home, Plus, Loader2, BarChart3, Database } from 'lucide-react';

interface UnifiedMobileNavigationProps {
  currentView: string;
  onNavigate: (view: 'dashboard' | 'create' | 'inventory' | 'active-listings' | 'data-management') => void;
  showBack?: boolean;
  onBack?: () => void;
  title?: string;
  loading?: boolean;
  notifications?: {
    inventory?: number;
    listings?: number;
  };
}

const UnifiedMobileNavigation = ({ 
  currentView, 
  onNavigate, 
  showBack = false, 
  onBack,
  title,
  loading,
  notifications
}: UnifiedMobileNavigationProps) => {
  const navigate = useNavigate();
  
  const handleSettingsClick = () => {
    if (loading) return;
    navigate('/settings');
  };

  if (showBack && onBack) {
    return (
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600 px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            disabled={loading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowLeft className="w-5 h-5" />
            )}
          </Button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSettingsClick}
          disabled={loading}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  const navItems = [
    {
      view: 'dashboard',
      icon: Home,
      label: 'Home',
      action: () => onNavigate('dashboard')
    },
    {
      view: 'create',
      icon: Plus,
      label: 'Create',
      action: () => onNavigate('create'),
      primary: true
    },
    {
      view: 'active-listings',
      icon: BarChart3,
      label: 'Sales',
      action: () => onNavigate('active-listings')
    },
    {
      view: 'inventory',
      icon: Package,
      label: 'Inventory',
      action: () => onNavigate('inventory'),
      notification: notifications?.inventory
    },
    {
      view: 'data-management',
      icon: Database,
      label: 'Data',
      action: () => onNavigate('data-management')
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600 z-50 shadow-lg">
      <div className="flex justify-around items-center py-2 px-1">
        {navItems.map(({ view, icon: Icon, label, action, notification, primary }) => (
          <div key={view} className="relative">
            <Button
              variant={currentView === view ? 'default' : 'ghost'}
              size="sm"
              onClick={action}
              disabled={loading}
              className={`flex flex-col items-center p-2 min-h-14 min-w-12 ${
                primary ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
              }`}
            >
              {loading && currentView === view ? (
                <Loader2 className="w-4 h-4 mb-1 animate-spin" />
              ) : (
                <Icon className="w-4 h-4 mb-1" />
              )}
              <span className="text-xs">{label}</span>
            </Button>
            
            {notification && notification > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 px-1 py-0 text-xs h-4 min-w-4 flex items-center justify-center"
              >
                {notification > 99 ? '99+' : notification}
              </Badge>
            )}
          </div>
        ))}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSettingsClick}
          disabled={loading}
          className="flex flex-col items-center p-2 min-h-14 min-w-12"
        >
          <Settings className="w-4 h-4 mb-1" />
          <span className="text-xs">Settings</span>
        </Button>
      </div>
    </div>
  );
};

export default UnifiedMobileNavigation;
