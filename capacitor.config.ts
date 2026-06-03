import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'me.gy6.watchmen',
  appName: 'Watchmen GY6',
  webDir: 'out',
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
  },
};

export default config;
