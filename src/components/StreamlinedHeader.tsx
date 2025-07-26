import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Menu, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import UnifiedNavigation from './UnifiedNavigation';

interface StreamlinedHeaderProps {
  title: string;
  userEmail?: string;
  showBack?: boolean;
  onBack?: () => void;
  loading?: boolean;
  notifications?: {
    inventory?: number;
    listings?: number;
  };
  isLoading?: boolean; // Add loading prop
}

const StreamlinedHeader = ({ 
  title, 
  userEmail, 
  showBack = false, 
  onBack,
  loading,
  notifications,
  isLoading = false // Add loading prop
}: StreamlinedHeaderProps) => {
  const { signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Debug logging
  console.log('🔍 StreamlinedHeader - userEmail:', userEmail, 'type:', typeof userEmail, 'isLoading:', isLoading);

  const handleSignOut = async () => {
    if (loading) return;
    try {
      await signOut();
      // Redirect to auth page after successful sign out
      window.location.href = '/auth';
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Show loading state while authentication is being determined
  if (isLoading) {
    return (
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side */}
            <div className="flex items-center space-x-4">
              {showBack && onBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  disabled={loading}
                  className="hover:bg-gray-100 transition-colors"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowLeft className="w-4 h-4" />
                  )}
                </Button>
              )}
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                {loading && (
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    Loading...
                  </div>
                )}
              </div>
            </div>

            {/* Center - Navigation */}
            <UnifiedNavigation loading={loading} notifications={notifications} />

            {/* Right side */}
            <div className="flex items-center space-x-3">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden"
                disabled={loading}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>

              {/* Authentication controls */}
              {userEmail ? (
                <div className="flex items-center space-x-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">
                      {userEmail.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    disabled={loading}
                    className="text-sm hover:bg-gray-100 hidden md:inline-flex"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign out'}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => window.location.href = '/auth'}
                  disabled={loading}
                  className="text-sm hidden md:inline-flex"
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)}>
          <div className="fixed top-16 left-0 right-0 bg-white border-b shadow-lg p-4" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-2">
              {userEmail ? (
                <Button 
                  variant="ghost" 
                  className="w-full justify-start" 
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }} 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Signing out...
                    </>
                  ) : (
                    'Sign out'
                  )}
                </Button>
              ) : (
                <Button 
                  variant="default" 
                  className="w-full justify-start" 
                  onClick={() => {
                    window.location.href = '/auth';
                    setMobileMenuOpen(false);
                  }} 
                  disabled={loading}
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StreamlinedHeader;
