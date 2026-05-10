import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { applyLanguageFromCountry } from '@/i18n';
import { Capacitor } from '@capacitor/core';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, metadata: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const applyLangForUser = async (uid?: string) => {
      if (!uid) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('country')
          .eq('user_id', uid)
          .maybeSingle();
        applyLanguageFromCountry(data?.country);
      } catch { /* noop */ }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          // defer to avoid deadlocks
          setTimeout(() => applyLangForUser(session.user.id), 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) setTimeout(() => applyLangForUser(session.user.id), 0);
    });

    // Handle OAuth deep link callback on native iOS
    let removeUrlListener: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/app').then(({ App: CapApp }) => {
        import('@capacitor/browser').then(({ Browser }) => {
          const p = CapApp.addListener('appUrlOpen', async ({ url }) => {
            if (!url.startsWith('com.evendle.app://')) return;
            await Browser.close().catch(() => {});
            const code = new URL(url).searchParams.get('code');
            if (code) {
              await supabase.auth.exchangeCodeForSession(code);
            }
          });
          p.then((listener) => { removeUrlListener = () => listener.remove(); });
        });
      });
    }

    return () => {
      subscription.unsubscribe();
      removeUrlListener?.();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, metadata: any) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    signIn,
    signUp,
    signOut,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};