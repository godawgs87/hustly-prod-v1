
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  Package, 
  PlusCircle, 
  BarChart3, 
  Settings,
  List,
  Loader2
} from 'lucide-react';

interface UnifiedNavigationProps {
  loading?: boolean;
  notifications?: {
    inventory?: number;
    listings?: number;
  };
}

const UnifiedNavigation = ({ loading, notifications }: UnifiedNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { 
      path: '/', 
      icon: Home, 
      label: 'Dashboard',
      description: 'Overview & quick actions'
    },
    { 
      path: '/inventory', 
      icon: Package, 
      label: 'Inventory',
      description: 'Manage your items',
      notification: notifications?.inventory
    },
    { 
      path: '/create-listing', 
      icon: PlusCircle, 
      label: 'Create',
      description: 'Add new listing',
      primary: true
    },
    { 
      path: '/listings', 
      icon: List, 
      label: 'Listings',
      description: 'Manage listings',
      notification: notifications?.listings
    },
    { 
      path: '/active-listings', 
      icon: BarChart3, 
      label: 'Active',
      description: 'Track performance'
    },
    { 
      path: '/settings', 
      icon: Settings, 
      label: 'Settings',
      description: 'Configure app'
    },
  ];

  const handleNavigation = (path: string) => {
    if (loading) return;
    navigate(path);
  };

  return (
    <nav className="hidden md:flex items-center space-x-1">
      {navItems.map(({ path, icon: Icon, label, description, notification, primary }) => {
        const isActive = location.pathname === path;
        
        return (
          <div key={path} className="relative group">
            <Button
              variant={isActive ? "default" : primary ? "outline" : "ghost"}
              size="sm"
              onClick={() => handleNavigation(path)}
              disabled={loading}
              className={`flex items-center space-x-2 transition-all duration-200 ${
                primary ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
              } ${isActive ? 'shadow-sm' : ''}`}
            >
              {loading && isActive ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
              <span className="hidden lg:inline">{label}</span>
              {notification && notification > 0 && (
                <Badge variant="destructive" className="ml-1 px-1 py-0 text-xs h-4 min-w-4">
                  {notification > 99 ? '99+' : notification}
                </Badge>
              )}
            </Button>
            
            {/* Tooltip */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              {description}
            </div>
          </div>
        );
      })}
    </nav>
  );
};

export default UnifiedNavigation;
