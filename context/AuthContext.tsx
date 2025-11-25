'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, AuthSession } from '@/lib/supabase-client';

// Import token manager functions only when needed (server-side calls)

interface AuthContextType {
  session: AuthSession | null;
  user: AuthSession['user'] | null;
  userId: string | null; // Our internal user ID for token management
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithTwitter: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  hasMetaTokens: boolean; // Track if user has connected Meta accounts
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasMetaTokens, setHasMetaTokens] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from Supabase and our database
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check Supabase session
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();
        
        if (supabaseSession?.user) {
          // Generate our internal user ID based on Supabase user
          const internalUserId = `auth_${supabaseSession.user.id}`;
          
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

          console.log('🔐 Initializing auth session:', {
            userId: internalUserId,
            provider: authSession.provider,
            email: authSession.user.email
          });

          setSession(authSession);
          setUserId(internalUserId);
          
          // Sync user profile to our MongoDB database
          try {
            await fetch('/api/user/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: internalUserId,
                email: authSession.user.email,
                userName: authSession.user.user_metadata?.name,
                provider: authSession.provider
              })
            });
            
            console.log('✅ User profile synced to database');
          } catch (error) {
            console.warn('Could not sync user profile:', error);
          }
          
          // Check if user has Meta tokens in our database
          try {
            const response = await fetch(`/api/user/check-meta-tokens?userId=${internalUserId}`);
            if (response.ok) {
              const { hasTokens } = await response.json();
              setHasMetaTokens(hasTokens);
            }
          } catch (error) {
            console.warn('Could not check Meta tokens:', error);
          }
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
        const internalUserId = `auth_${supabaseSession.user.id}`;
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
          userId: internalUserId,
          provider: authSession.provider
        });
        
        setSession(authSession);
        setUserId(internalUserId);
        
        // Sync user profile to our MongoDB database
        try {
          await fetch('/api/user/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: internalUserId,
              email: authSession.user.email,
              userName: authSession.user.user_metadata?.name,
              provider: authSession.provider
            })
          });
          
          console.log('✅ User profile synced to database');
        } catch (error) {
          console.warn('Could not sync user profile:', error);
        }
        
        // Check Meta tokens status
        try {
          const response = await fetch(`/api/user/check-meta-tokens?userId=${internalUserId}`);
          if (response.ok) {
            const { hasTokens } = await response.json();
            setHasMetaTokens(hasTokens);
          }
        } catch (error) {
          console.warn('Could not check Meta tokens:', error);
        }
      } else {
        setSession(null);
        setUserId(null);
        setHasMetaTokens(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const getRedirectUrl = () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    return `${siteUrl || window.location.origin}/connect`;
  };

  const signInWithGoogle = async () => {
    const redirectUrl = getRedirectUrl();
    console.log('🔵 Initiating Google sign-in...');
    console.log('📍 Redirect URL:', redirectUrl);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
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
    const redirectUrl = getRedirectUrl();
    console.log('🔵 Initiating Twitter sign-in...');
    console.log('📍 Redirect URL:', redirectUrl);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: {
        redirectTo: redirectUrl,
      },
    });

    console.log('📊 Twitter OAuth response:', { data, error });
    
    if (error) {
      console.error('❌ Twitter sign-in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Clean up Meta tokens from our database if userId exists
      if (userId) {
        try {
          // Call API to clean up user tokens instead of direct import
          const response = await fetch('/api/user/cleanup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
          });
          
          if (response.ok) {
            console.log('🧹 Cleaned up user tokens from database');
          } else {
            console.warn('Could not clean up user tokens via API');
          }
        } catch (error) {
          console.warn('Could not clean up user tokens:', error);
        }
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear local state
      setSession(null);
      setUserId(null);
      setHasMetaTokens(false);
      
      console.log('✅ User signed out successfully');
    } catch (error) {
      console.error('❌ Sign out error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user || null,
        userId,
        loading,
        signInWithGoogle,
        signInWithTwitter,
        signOut,
        isAuthenticated: !!session,
        hasMetaTokens,
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
