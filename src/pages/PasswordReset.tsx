import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';

const PasswordReset = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [mode, setMode] = useState<'request' | 'reset'>('request');
  const [isValidSession, setIsValidSession] = useState(false);

  // Check if this is a password reset callback with valid session
  useEffect(() => {
    const checkSession = async () => {
      // Check for hash fragments (Supabase uses # for auth redirects)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');
      
      // Also check query params as fallback
      const queryAccessToken = searchParams.get('access_token');
      const queryRefreshToken = searchParams.get('refresh_token');
      const queryType = searchParams.get('type');
      
      const finalAccessToken = accessToken || queryAccessToken;
      const finalRefreshToken = refreshToken || queryRefreshToken;
      const finalType = type || queryType;
      
      console.log('🔐 Password reset params:', { finalType, hasAccessToken: !!finalAccessToken, hasRefreshToken: !!finalRefreshToken });
      
      if (finalType === 'recovery' && finalAccessToken && finalRefreshToken) {
        try {
          // Set the session with the tokens from the magic link
          const { data, error } = await supabase.auth.setSession({
            access_token: finalAccessToken,
            refresh_token: finalRefreshToken
          });
          
          if (error) {
            console.error('Session set error:', error);
            setMode('request');
            setIsValidSession(false);
          } else {
            console.log('✅ Session set successfully for password reset');
            setMode('reset');
            setIsValidSession(true);
            // Clear the URL of tokens for security
            window.history.replaceState({}, document.title, '/reset-password');
          }
        } catch (error) {
          console.error('Error setting session:', error);
          setMode('request');
          setIsValidSession(false);
        }
      } else {
        // Only check for existing session if we're not starting fresh
        // If user navigates directly to /reset-password, always start with email request
        const isDirectNavigation = !finalAccessToken && !finalRefreshToken && !finalType;
        
        if (isDirectNavigation) {
          // Direct navigation to reset password - always start with email request
          setMode('request');
          setIsValidSession(false);
        } else {
          // Check if we already have a valid session from a previous magic link
          const { data: { session } } = await supabase.auth.getSession();
          if (session && finalType === 'recovery') {
            setMode('reset');
            setIsValidSession(true);
          } else {
            setMode('request');
            setIsValidSession(false);
          }
        }
      }
    };

    checkSession();
  }, [searchParams]);

  // Request password reset operation
  const { loading: requesting, execute: requestReset } = useAsyncOperation({
    successMessage: 'Password reset email sent! Check your inbox.',
    errorMessage: 'Failed to send password reset email'
  });

  // Update password operation
  const { loading: updating, execute: updatePassword } = useAsyncOperation({
    successMessage: 'Password updated successfully!',
    errorMessage: 'Failed to update password',
    showSuccessToast: false // We'll handle navigation
  });

  const handleRequestReset = async () => {
    await requestReset(async () => {
      if (!formData.email) {
        throw new Error('Please enter your email address');
      }

      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      console.log('🔄 Password reset email requested for:', formData.email);

      if (error) {
        console.error('Password reset email error:', error);
        throw error;
      }
      
      console.log('✅ Password reset email sent successfully');
    });
  };

  const handleUpdatePassword = async () => {
    await updatePassword(async () => {
      if (!formData.password || !formData.confirmPassword) {
        throw new Error('Please fill in both password fields');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      console.log('🔄 Attempting to update password...');
      
      const { data, error } = await supabase.auth.updateUser({
        password: formData.password
      });
      
      console.log('📊 Password update response:', { data, error });

      if (error) {
        console.error('❌ Password update failed:', error);
        
        // Provide specific error messages based on error type
        let userMessage = 'Password update failed. Please try again.';
        
        if (error.message?.includes('session_not_found')) {
          userMessage = 'Your reset link has expired. Please request a new password reset email.';
        } else if (error.message?.includes('invalid_session')) {
          userMessage = 'Invalid session. Please click the reset link in your email again.';
        } else if (error.message?.includes('weak_password')) {
          userMessage = 'Password is too weak. Please use a stronger password with at least 8 characters.';
        } else if (error.message?.includes('same_password')) {
          userMessage = 'New password must be different from your current password.';
        } else if (error.message) {
          userMessage = `Password update failed: ${error.message}`;
        }
        
        throw new Error(userMessage);
      }
      
      console.log('✅ Password updated successfully');
      
      // Verify the session is still valid
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔍 Session after password update:', !!session);

      // Success - redirect to dashboard
      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully. You are now logged in.",
        variant: "default"
      });

      navigate('/');
    });
  };

  const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  if (mode === 'reset' && isValidSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle>Set New Password</CardTitle>
            <CardDescription>
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  placeholder="Enter new password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange('confirmPassword')}
                  placeholder="Confirm new password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button
              onClick={handleUpdatePassword}
              disabled={updating || !formData.password || !formData.confirmPassword}
              className="w-full"
            >
              {updating ? 'Updating...' : 'Update Password'}
            </Button>

            <div className="text-center">
              <Button
                variant="link"
                onClick={() => navigate('/auth')}
                className="text-sm text-gray-600"
              >
                Back to Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              placeholder="Enter your email"
            />
          </div>

          <Button
            onClick={handleRequestReset}
            disabled={requesting || !formData.email}
            className="w-full"
          >
            {requesting ? 'Sending...' : 'Send Reset Link'}
          </Button>

          <div className="text-center">
            <Button
              variant="link"
              onClick={() => navigate('/auth')}
              className="text-sm text-gray-600"
            >
              Back to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PasswordReset;
