
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AuthFormProps {
  onAuthSuccess: () => void;
}

const AuthForm = ({ onAuthSuccess }: AuthFormProps) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    console.log('Auth form submit:', isSignUp ? 'signup' : 'signin', email);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });

        if (error) {
          console.error('Sign up error:', error);
          toast({
            title: "Sign Up Failed",
            description: error.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Check Your Email",
            description: "We've sent you a confirmation link to complete your registration."
          });
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          console.error('Sign in error:', error);
          toast({
            title: "Sign In Failed", 
            description: error.message,
            variant: "destructive"
          });
        } else if (data.user) {
          console.log('Sign in successful:', data.user.id);
          toast({
            title: "Welcome Back!",
            description: "You've successfully signed in."
          });
          onAuthSuccess();
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: "Authentication Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold text-center mb-6">
        {isSignUp ? 'Create Account' : 'Sign In'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        
        <div>
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
        </Button>
      </form>
      
      <div className="text-center mt-4">
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-sm text-blue-600 hover:underline"
          disabled={isLoading}
        >
          {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
        </button>
      </div>
    </Card>
  );
};

export default AuthForm;
