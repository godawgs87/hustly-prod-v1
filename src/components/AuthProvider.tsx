import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {}
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const lastAuthEventRef = useRef<string | null>(null);

  // Debounced state update to prevent rapid API calls
  const updateAuthState = (newSession: Session | null, source: string) => {
    const eventKey = `${source}-${!!newSession}`;
    
    // Skip duplicate events within short timeframe
    if (lastAuthEventRef.current === eventKey) {
      return;
    }
    
    console.log(`Auth state change: ${source}`, !!newSession);
    lastAuthEventRef.current = eventKey;
    
    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Debounce auth state updates by 200ms to batch rapid changes
    debounceTimerRef.current = setTimeout(() => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
      
      // Reset event tracking after update
      setTimeout(() => {
        lastAuthEventRef.current = null;
      }, 1000);
    }, 200);
  };

  useEffect(() => {
    console.log('AuthProvider: Setting up auth listener');

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        updateAuthState(session, event);
      }
    );

    // THEN check for existing session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting initial session:', error);
        }
        console.log('Initial session:', !!session);
        updateAuthState(session, 'INITIAL_SESSION');
      } catch (error) {
        console.error('Failed to get initial session:', error);
        setLoading(false);
      }
    };

    getInitialSession();

    return () => {
      console.log('AuthProvider: Cleaning up subscription');
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log('Signing out...');
      setLoading(true);
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};