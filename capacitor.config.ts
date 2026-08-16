import type { CapacitorConfig } from '@capacitor/cli'

/* server.url points the WebView straight at the live site instead of a
 * locally-bundled copy of dist/ — this is what keeps "ship a web fix, it's
 * live in minutes, no Play re-review" true after leaving the TWA behind.
 * The Chromium WebView backing this supports service workers/Cache Storage
 * the same as Chrome did, so offline behavior (including the OCR
 * background-prefetch) is unaffected by the move away from TWA. */
const config: CapacitorConfig = {
  appId: 'np.com.bimeshpoudel.lekh',
  appName: 'Lekh Patro',
  webDir: 'dist',
  server: {
    url: 'https://lekh-gamma.vercel.app',
  },
}

export default config
