
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Package, BarChart3 } from "lucide-react";
import CreateListing from "./CreateListing";
import AuthForm from "@/components/AuthForm";
import StreamlinedHeader from "@/components/StreamlinedHeader";
import UnifiedMobileNavigation from "@/components/UnifiedMobileNavigation";
import LoadingState from "@/components/LoadingState";
import { useAuth } from "@/components/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { UsageTracker } from "@/components/layout/UsageTracker";

type ViewType = 'dashboard' | 'create' | 'inventory' | 'active-listings' | 'data-management';

const Index = () => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();

  console.log('Index render - loading:', loading, 'user:', !!user, 'view:', currentView);

  const navigate = useNavigate();

  const handleNavigation = useCallback((view: ViewType) => {
    console.log('Navigating to:', view);
    const pageMap = {
      inventory: '/inventory',
      'active-listings': '/active-listings',
      'data-management': '/data-management'
    };

    if (view in pageMap) {
      navigate(pageMap[view as keyof typeof pageMap]);
    } else {
      setCurrentView(view);
    }
  }, [navigate]);

  // Handle auth redirect in useEffect to avoid render-time navigation
  useEffect(() => {
    if (!loading && !user) {
      console.log('Redirecting to auth - no user');
      navigate('/auth');
    }
  }, [loading, user, navigate]);

  // Show loading state during initial auth check
  if (loading) {
    console.log('Showing loading state');
    return <LoadingState message="Loading..." fullPage />;
  }

  // Show loading while redirecting to auth
  if (!user) {
    console.log('Showing loading - redirecting to auth');
    return <LoadingState message="Redirecting..." fullPage />;
  }

  // Show create listing view
  if (currentView === 'create') {
    console.log('Showing create listing view');
    return (
      <CreateListing 
      onBack={() => handleNavigation('dashboard')}
        onViewListings={() => navigate('/inventory')}
      />
    );
  }

  // Main dashboard view
  console.log('Showing main dashboard');

  const dashboardCards = [
    {
      icon: Camera,
      title: 'Create Listing',
      description: 'Upload photos and create professional listings with AI assistance.',
      action: () => handleNavigation('create'),
      buttonText: 'Start Creating',
      buttonClass: 'bg-blue-600 hover:bg-blue-700',
      iconColor: 'text-blue-600'
    },
    {
      icon: Package,
      title: 'Inventory Manager',
      description: 'Track purchases, calculate profits, and manage your reseller inventory.',
      action: () => navigate('/inventory'),
      buttonText: 'Manage Inventory',
      buttonClass: 'border hover:bg-green-50',
      iconColor: 'text-green-600',
      variant: 'outline' as const
    },
    {
      icon: BarChart3,
      title: 'Sales Operations',
      description: 'Monitor active listings, track performance, and optimize sales.',
      action: () => navigate('/active-listings'),
      buttonText: 'View Operations',
      buttonClass: 'border hover:bg-orange-50',
      iconColor: 'text-orange-600',
      variant: 'outline' as const
    }
  ];

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isMobile ? 'pb-20' : ''}`}>
      <StreamlinedHeader
        title="Hustly"
        userEmail={user.email}
        notifications={{
          inventory: 3,
          listings: 1
        }}
      />

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8">
        <UsageTracker sticky={true} />
        
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Your Reseller Business Hub
          </h2>
          <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Manage inventory, create listings, track profits, and grow your reselling business.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {dashboardCards.map((card, index) => (
            <Card 
              key={index}
              className="p-6 md:p-8 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" 
              onClick={card.action}
            >
              <div className="text-center">
                <card.icon className={`w-12 md:w-16 h-12 md:h-16 mx-auto ${card.iconColor} mb-4`} />
                <h3 className="text-lg md:text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  {card.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm md:text-base">
                  {card.description}
                </p>
                <Button 
                  variant={card.variant || 'default'}
                  className={`w-full ${card.buttonClass}`}
                >
                  {card.buttonText}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 md:p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            How Hustly works:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800 dark:text-blue-200">
            <div>
              <strong>1. Track Inventory:</strong> Log purchases with cost basis, source, and photos
            </div>
            <div>
              <strong>2. Create Listings:</strong> AI-powered descriptions and optimized pricing
            </div>
            <div>
              <strong>3. Monitor Sales:</strong> Track active listings and optimize performance
            </div>
          </div>
        </div>
      </div>

      {isMobile && (
        <UnifiedMobileNavigation
          currentView={currentView}
          onNavigate={handleNavigation}
          loading={false}
          notifications={{
            inventory: 3,
            listings: 1
          }}
        />
      )}
    </div>
  );
};

export default Index;
