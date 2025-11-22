'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, AuthSession } from '@/lib/supabase-client';

interface AuthContextType {
  session: AuthSession | null;
  user: AuthSession['user'] | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithTwitter: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage and Supabase
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check localStorage first
        const storedSession = localStorage.getItem('authSession');
        if (storedSession) {
          const parsedSession = JSON.parse(storedSession);
          setSession(parsedSession);
        }

        // Check Supabase session
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();
        
        if (supabaseSession?.user) {
          // Get identity data from the user
          const identities = supabaseSession.user.identities || [];
          const identity = identities[0];
          
          const authSession: AuthSession = {
            user: {
              id: supabaseSession.user.id,
              email: supabaseSession.user.email || '',
              user_metadata: supabaseSession.user.user_metadata,
            },
            access_token: supabaseSession.access_token,
            refresh_token: supabaseSession.refresh_token,
            provider: (identity?.provider as 'google' | 'twitter' | 'meta') || 'google',
            socialAccountToken: supabaseSession.provider_token || supabaseSession.user.user_metadata?.socialAccountToken,
          };

          console.log('💾 Storing auth session:', {
            provider: authSession.provider,
            hasToken: !!authSession.socialAccountToken,
            email: authSession.user.email
          });

          setSession(authSession);
          // Save to localStorage
          localStorage.setItem('authSession', JSON.stringify(authSession));
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, supabaseSession: any) => {
      if (supabaseSession?.user) {
        const identities = supabaseSession.user.identities || [];
        const identity = identities[0];
        
        const authSession: AuthSession = {
          user: {
            id: supabaseSession.user.id,
            email: supabaseSession.user.email || '',
            user_metadata: supabaseSession.user.user_metadata,
          },
          access_token: supabaseSession.access_token,
          refresh_token: supabaseSession.refresh_token,
          provider: (identity?.provider as 'google' | 'twitter' | 'meta') || 'google',
          socialAccountToken: supabaseSession.provider_token || supabaseSession.user.user_metadata?.socialAccountToken,
        };
        
        console.log('🔄 Auth state changed:', {
          event,
          provider: authSession.provider,
          hasToken: !!authSession.socialAccountToken
        });
        
        setSession(authSession);
        localStorage.setItem('authSession', JSON.stringify(authSession));
      } else {
        setSession(null);
        localStorage.removeItem('authSession');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    console.log('🔵 Initiating Google sign-in...');
    console.log('📍 Redirect URL:', `${window.location.origin}/connect`);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/connect`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    console.log('📊 Google OAuth response:', { data, error });
    
    if (error) {
      console.error('❌ Google sign-in error:', error);
      throw error;
    }
  };

  const signInWithTwitter = async () => {
    console.log('🔵 Initiating Twitter sign-in...');
    console.log('📍 Redirect URL:', `${window.location.origin}/connect`);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: {
        redirectTo: `${window.location.origin}/connect`,
      },
    });

    console.log('📊 Twitter OAuth response:', { data, error });
    
    if (error) {
      console.error('❌ Twitter sign-in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    setSession(null);
    localStorage.removeItem('authSession');
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user || null,
        loading,
        signInWithGoogle,
        signInWithTwitter,
        signOut,
        isAuthenticated: !!session,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
