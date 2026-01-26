import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import {
  supabase,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOut as supabaseSignOut,
  getSession,
} from '../services/supabase';
import { setUser as setSentryUser } from '../services/sentry';
import {
  identifyUser,
  resetUser,
  trackSignIn,
  trackSignUp,
  trackSignOut,
} from '../services/analytics';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Update Sentry user context
      if (session?.user) {
        setSentryUser({
          id: session.user.id,
          email: session.user.email,
        });
      } else {
        setSentryUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await signInWithEmail(email, password);
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
      // Track successful sign in
      trackSignIn('email');
      identifyUser(data.session.user.id, { email: data.session.user.email });
    }
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await signUpWithEmail(email, password, fullName);
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
      // Track successful sign up
      trackSignUp('email');
      identifyUser(data.session.user.id, { email: data.session.user.email, name: fullName });
    }
    return { error };
  };

  const handleSignInWithGoogle = async (): Promise<{ error: AuthError | Error | null }> => {
    const { error } = await signInWithGoogle();
    return { error: error as AuthError | Error | null };
  };

  const signOut = async () => {
    // Track sign out before clearing session
    trackSignOut();
    resetUser();

    await supabaseSignOut();
    setSession(null);
    setUser(null);
  };

  const value = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle: handleSignInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
