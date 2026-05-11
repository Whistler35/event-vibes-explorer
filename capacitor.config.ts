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
      scopes: ['profile', 'email'],
      iosClientId: '172064364995-jimhmvn5njc39u8rtm30qnfmf223o5es.apps.googleusercontent.com',
      serverClientId: '172064364995-rhjcdn4tdeg09omj46l2jpvur7j1eb8s.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    }
  }
};

export default config;
