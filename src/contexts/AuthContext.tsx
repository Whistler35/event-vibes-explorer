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

    // Handle OAuth deep link callback on native iOS (com.evendle.app://login-callback).
    // Supports both PKCE (?code=) and implicit (#access_token=) flows.
    const handleOAuthUrl = async (url: string) => {
      if (!url.startsWith('com.evendle.app://')) return;

      const { toast } = await import('sonner');
      toast(`[3] appUrlOpen empfangen: ${url.slice(0, 80)}`, { duration: 15000 });

      const { Browser } = await import('@capacitor/browser');
      await Browser.close().catch(() => {});

      const urlObj = new URL(url);

      const code = urlObj.searchParams.get('code');
      if (code) {
        toast(`[4] PKCE code gefunden, stelle code_verifier wieder her…`, { duration: 15000 });
        const CODE_VERIFIER_KEY = 'sb-yhetszgeflsldahfuwen-auth-token-code-verifier';
        console.log('[AuthContext] Retrieving with key:', CODE_VERIFIER_KEY);
        const { Preferences } = await import('@capacitor/preferences');
        const { value: savedVerifier } = await Preferences.get({ key: CODE_VERIFIER_KEY });
        console.log('[AuthContext] Preferences.get result:', savedVerifier ? `FOUND (${savedVerifier.slice(0, 20)}...)` : 'NULL - not found');
        if (savedVerifier) {
          localStorage.setItem(CODE_VERIFIER_KEY, savedVerifier);
          const verify = localStorage.getItem(CODE_VERIFIER_KEY);
          console.log('[AuthContext] Written to localStorage, readback:', verify ? `OK (${verify.slice(0, 20)}...)` : 'FAILED');
          toast(`[4] code_verifier wiederhergestellt (${savedVerifier.slice(0, 12)}…)`, { duration: 15000 });
        } else {
          console.log('[AuthContext] PROBLEM: Preferences returned null. All Preferences keys cannot be listed directly.');
          toast.error('[4] code_verifier nicht in Preferences gefunden!', { duration: 15000 });
        }
        console.log('[AuthContext] Calling exchangeCodeForSession with code:', code.slice(0, 20) + '...');
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        console.log('[AuthContext] exchangeCodeForSession result — error:', error?.message ?? 'none', '| user:', data?.session?.user?.email ?? 'none');
        if (error) toast.error(`[4] exchangeCodeForSession Fehler: ${error.message}`, { duration: 15000 });
        else {
          await Preferences.remove({ key: CODE_VERIFIER_KEY });
          toast.success(`[4] Eingeloggt als: ${data.session?.user.email}`, { duration: 15000 });
        }
        return;
      }

      const hash = new URLSearchParams(urlObj.hash.replace('#', ''));
      const access_token = hash.get('access_token');
      const refresh_token = hash.get('refresh_token');
      if (access_token && refresh_token) {
        toast(`[4] Implicit tokens gefunden, setze Session…`, { duration: 15000 });
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) toast.error(`[4] setSession Fehler: ${error.message}`, { duration: 15000 });
        else toast.success('[4] Session gesetzt (implicit)', { duration: 15000 });
        return;
      }

      toast.error(`[4] Kein code/token in URL: ${url}`, { duration: 15000 });
    };

    let removeUrlListener: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/app').then(({ App: CapApp }) => {
        // Handle fresh app launch via URL scheme (app was killed by OS)
        CapApp.getLaunchUrl().then(({ url }) => {
          if (url) handleOAuthUrl(url);
        }).catch(() => {});

        // Handle URL while app is running/backgrounded
        CapApp.addListener('appUrlOpen', ({ url }) => handleOAuthUrl(url))
          .then((listener) => { removeUrlListener = () => listener.remove(); });
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
    // Clears the persisted React Query cache so a shared/handed-off device
    // can't briefly show the previous user's cached chats/feed on next login.
    localStorage.removeItem("evendle-query-cache");
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