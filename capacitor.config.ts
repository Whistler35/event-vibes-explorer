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
      // 'native' asks iOS to resize the WKWebView's own frame when the
      // keyboard opens — in practice unreliable (confirmed: identical CSS
      // works correctly on the web build, only breaks inside the native
      // WebView). 'body' instead has the Keyboard plugin explicitly set
      // document.body's height via JS on keyboardWillShow/Hide, which is
      // the more consistently-working mode for this exact symptom.
      resize: 'body',
      resizeOnFullScreen: true,
    }
  }
};

export default config;
