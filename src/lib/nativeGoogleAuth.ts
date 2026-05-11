import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

/**
 * Native Google Sign-In for iOS (Capacitor).
 * Uses @codetrix-studio/capacitor-google-auth to obtain an idToken
 * directly from the native Google SDK, then exchanges it with Supabase
 * via signInWithIdToken. Avoids PKCE/cookie-isolation issues of
 * SFSafariViewController-based web OAuth flows.
 *
 * Requires:
 *  - capacitor.config.ts → plugins.GoogleAuth.clientId / iosClientId set
 *  - iOS: REVERSED_CLIENT_ID URL scheme added to Info.plist
 *  - Supabase: Google provider configured with the iOS client ID
 *    listed under "Authorized Client IDs" so signInWithIdToken accepts it
 */
export async function signInWithGoogleNative(): Promise<{ error: Error | null }> {
  if (!Capacitor.isNativePlatform()) {
    return { error: new Error('Native Google Sign-In is only available on native platforms') };
  }

  try {
    const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');

    // Initialize is safe to call multiple times.
    try { await GoogleAuth.initialize(); } catch { /* noop */ }

    const result = await GoogleAuth.signIn();
    const idToken = result?.authentication?.idToken;
    if (!idToken) {
      return { error: new Error('No idToken returned from Google') };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    return { error: error ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}
