import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.castlink.app',
  appName: 'CastLink',
  webDir: 'dist',
  backgroundColor: '#04060b',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      showSpinner: false,
      backgroundColor: '#04040c',
    },
    StatusBar: {
      style: 'DARK',
      overlaysWebView: false,
      backgroundColor: '#04060b',
    },
  },
  ios: {
    scheme: 'CastLink',
    contentInset: 'automatic',
    backgroundColor: '#04060b',
  },
}

export default config
