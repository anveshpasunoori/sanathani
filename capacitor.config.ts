import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.anveshpasunoori.nitya',
  appName: 'Nitya',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_nitya',
      iconColor: '#7a1f2b',
    },
  },
};

export default config;
