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

  // Immediate state update - no delays to prevent race conditions
  const updateAuthState = (newSession: Session | null, source: string) => {
    // Auth state change logged
    
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = undefined;
    }
    
    // Set state immediately - no delays
    setSession(newSession);
    setUser(newSession?.user ?? null);
    setLoading(false);
    
    // Track auth history for debugging
    const authEvent = {
      timestamp: Date.now(),
      source,
      hasSession: !!newSession,
      hasUser: !!newSession?.user
    };
    
    // Auth event tracked
  };

  useEffect(() => {
    // Setting up auth listener

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
        // Initial session checked
        updateAuthState(session, 'INITIAL_SESSION');
      } catch (error) {
        console.error('Failed to get initial session:', error);
        setLoading(false);
      }
    };

    getInitialSession();

    return () => {
      // Cleaning up subscription
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      // Signing out...
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