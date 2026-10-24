import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.teachlink.app',
  appName: 'TeachLink',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#ffffff',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
