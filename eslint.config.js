import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  /* android/ and android-twa-backup/ are native Gradle projects, not part of
     the web app — android/ in particular has a build/ tree of Capacitor's
     own generated/vendored JS (native-bridge.js and friends), which is not
     ours to lint and doesn't share this config's TS-only ruleset. */
  globalIgnores(['dist', 'android', 'android-twa-backup']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
