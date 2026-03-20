import type { CapacitorConfig } from '@capacitor/cli';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env.capacitor for CAPACITOR_SERVER_URL (keeps secrets in .env.local separate)
dotenv.config({ path: path.resolve(__dirname, '.env.capacitor') });

const config: CapacitorConfig = {
  appId: 'org.cpchurch.gospelpresentation',
  appName: 'Gospel Presentation',
  webDir: 'public',
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2500,
    },
  },
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://cp-church.org',
    cleartext: true,  // Only for dev if using http://; remove for production
    errorPath: '/capacitor-offline.html'
  }
};

export default config;
