import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.evendle.app',
  appName: 'EVENDLE',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
    GoogleAuth: {
      // Web/Server OAuth Client ID from Google Cloud Console (the one configured in Supabase as Google provider client ID)
      clientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
      // iOS-specific OAuth Client ID (type: iOS) from Google Cloud Console
      iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      forceCodeForRefreshToken: false,
    },
  },
};

export default config;
