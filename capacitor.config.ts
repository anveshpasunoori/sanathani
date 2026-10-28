import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.anveshpasunoori.sanathani',
  appName: 'Sanathani',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_sanathani',
      iconColor: '#7a1f2b',
    },
  },
};

export default config;
