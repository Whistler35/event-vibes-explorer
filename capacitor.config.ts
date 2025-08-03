import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.19807b4840c04e949e68b82e61ddb804',
  appName: 'event-vibes-explorer',
  webDir: 'dist',
  server: {
    url: 'https://19807b48-40c0-4e94-9e68-b82e61ddb804.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;