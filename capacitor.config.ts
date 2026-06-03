import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'me.gy6.watchmen',
  appName: 'Watchmen GY6',
  webDir: 'out',
  // Without this the WebView paints a flash of white between the iOS
  // launch storyboard disappearing and the first frame of the page
  // rendering. Black matches the launch screen + app theme so the
  // transition reads as one continuous boot.
  backgroundColor: '#0a0a0b',
  server: {
    url: 'https://watchmen-six.vercel.app',
    cleartext: false,
  },
  ios: {
    // 'never' lets the WebView extend edge-to-edge and lets the web app
    // handle the iOS status-bar / home-indicator insets via CSS
    // env(safe-area-inset-*) — which it already does. 'always' added a
    // second layer of inset on top of the CSS padding, producing the
    // chunky black gap between the status bar and the page header.
    contentInset: 'never',
    backgroundColor: '#0a0a0b',
  },
};

export default config;
