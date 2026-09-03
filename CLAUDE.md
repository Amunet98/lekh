# Lekh Patro — standing rules

- Bump the patch version in `package.json` on every app change, however minor, then run `npm install` to sync `package-lock.json`. The version is shown twice, both via `__APP_VERSION__`: as the subtitle of the About row in Settings (`src/components/SettingsScreen.tsx`) and at the foot of the About pane (`src/components/AboutScreen.tsx`). There is no footer — the app has no page furniture, and anything of this kind belongs in About, which is now a pane of the Settings screen rather than a sheet of its own (`src/components/Screen.tsx`).
