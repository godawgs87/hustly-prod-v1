import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Mail, Lock, User, Zap, Star, Crown, Rocket, Check } from 'lucide-react';
import { SUBSCRIPTION_TIERS } from '@/utils/constants';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionManagement } from '@/hooks/useSubscriptionManagement';

interface AuthPageProps {
  onAuthSuccess?: () => void;
}

const AuthPage = ({ onAuthSuccess }: AuthPageProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });

  const { toast } = useToast();
  const { createCheckout } = useSubscriptionManagement();

  // Authentication operation
  const { loading, execute: authenticate } = useAsyncOperation({
    successMessage: 'Authentication successful',
    errorMessage: 'Authentication failed',
    showSuccessToast: false // We'll handle navigation instead
  });

  // Plan upgrade operation
  const { loading: upgrading, execute: upgradePlan } = useAsyncOperation({
    successMessage: 'Plan upgraded successfully',
    errorMessage: 'Failed to upgrade plan'
  });

  const handleAuth = async () => {
    await authenticate(async () => {
      if (!formData.email || !formData.password) {
        throw new Error('Please enter both email and password');
      }

      let result;
      
      if (activeTab === 'signup') {
        result = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });
      } else {
        result = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });
      }

      if (result.error) {
        throw result.error;
      }

      onAuthSuccess?.();
    });
  };

  const handlePlanSelect = async (plan: 'starter' | 'professional' | 'enterprise' | 'founders') => {
    // For founders plan, redirect to founders pricing
    if (plan === 'founders') {
      await createCheckout('professional'); // Use professional as base
      return;
    }
    
    await createCheckout(plan);
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: '/mo',
      description: '7-day trial of Serious Seller features',
      features: [
        '10 listings with AI analysis/month',
        '1 marketplace integration',
        'AI listing generator',
        'Basic inventory tools'
      ],
      buttonText: 'Get Started',
      buttonVariant: 'outline' as const,
      popular: false
    },
    {
      id: 'starter',
      name: 'Side Hustler',
      price: '$19',
      period: '/mo',
      description: 'For new resellers testing the platform',
      features: [
        '100 listings with AI analysis/month',
        '2 marketplace connections',
        'Basic inventory management',
        'Standard email support'
      ],
      buttonText: 'Start Free Trial',
      buttonVariant: 'default' as const,
      popular: false
    },
    {
      id: 'professional',
      name: 'Serious Seller',
      price: '$49',
      period: '/mo',
      description: 'Save $240/year vs competitors',
      features: [
        '300 listings with AI analysis/month',
        '4 marketplace integrations (eBay, Poshmark, Mercari, Depop)',
        'Bulk upload and processing',
        'Profit tracking & sales analytics',
        'Priority support with live chat'
      ],
      buttonText: 'Start Free Trial',
      buttonVariant: 'default' as const,
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Full-Time Flipper',
      price: '$89',
      period: '/mo',
      description: 'Advanced tools for power sellers and reselling teams',
      features: [
        'Unlimited listings with AI analysis',
        'All marketplace integrations + future platforms',
        'Team collaboration features',
        'API access and webhooks',
        'Dedicated customer success manager'
      ],
      buttonText: 'Start Free Trial',
      buttonVariant: 'default' as const,
      popular: false
    },
    {
      id: 'founders',
      name: 'Founders Plan',
      price: '$39',
      period: '.99/mo',
      description: 'Lifetime pricing – first 100 users only',
      features: [
        'Everything in Serious Seller Plan',
        'Locked-in rate for life',
        'Exclusive early-adopter badge',
        'Direct product influence & feedback'
      ],
      buttonText: 'Claim Spot',
      buttonVariant: 'default' as const,
      popular: false,
      special: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="text-center py-12 px-6">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Welcome to <span className="text-blue-600">Hustly</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          AI-powered reselling platform that helps you maximize profits and streamline your business.
        </p>
      </div>

      {/* Features Overview */}
      <div className="max-w-6xl mx-auto px-6 mb-12">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">AI-Powered Analysis</h3>
            <p className="text-gray-600">Smart photo analysis and pricing suggestions</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Cross-Platform Listing</h3>
            <p className="text-gray-600">List on eBay, Poshmark, and Mercari simultaneously</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Performance Analytics</h3>
            <p className="text-gray-600">Track your profits and optimize your strategy</p>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-gray-600">No credits. No limits. Just powerful tools for resellers at every level.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-5 md:grid-cols-2 sm:grid-cols-1">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`border rounded-lg p-6 flex flex-col relative ${
                  plan.popular ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                } ${plan.special ? 'border-yellow-400 bg-yellow-50' : ''}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600">
                    Most Popular
                  </Badge>
                )}
                {plan.special && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black">
                    🔥 Founders
                  </Badge>
                )}
                
                <h3 className="text-xl font-semibold text-gray-800">{plan.name}</h3>
                <p className="text-3xl font-bold mt-2">
                  {plan.price}
                  <span className="text-base font-normal text-gray-500">{plan.period}</span>
                </p>
                <p className="mt-2 text-sm text-gray-500">{plan.description}</p>
                
                <ul className="mt-4 space-y-2 text-sm text-gray-700 flex-grow">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <Button
                  className={`mt-6 w-full ${
                    plan.id === 'free' 
                      ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      : plan.special
                      ? 'bg-yellow-500 text-black hover:bg-yellow-600'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                  variant={plan.buttonVariant}
                  onClick={() => {
                    if (plan.id === 'free') {
                      setActiveTab('signup');
                      document.getElementById('auth-form')?.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      handlePlanSelect(plan.id as any);
                    }
                  }}
                >
                  {plan.buttonText}
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center text-sm text-gray-500">
            All plans include AI analysis with every listing, mobile PWA access, and full inventory tools.
          </div>
        </div>
      </section>

      {/* Authentication Form */}
      <div id="auth-form" className="bg-gray-50 py-16 px-6">
        <div className="max-w-md mx-auto">
          <Card className="p-8">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Get Started</h3>
              <p className="text-gray-600">Sign in to your account or create a new one</p>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'signin' | 'signup')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
                <Button 
                  onClick={handleAuth} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
                <div className="text-center">
                  <Button
                    variant="link"
                    onClick={() => navigate('/reset-password')}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Forgot your password?
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
                <Button 
                  onClick={handleAuth} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;