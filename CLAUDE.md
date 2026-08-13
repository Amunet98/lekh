# Lekh — standing rules

- Bump the patch version in `package.json` on every app change, however minor, then run `npm install` to sync `package-lock.json`. The version is shown in the About sheet (`src/components/AboutSheet.tsx`) via `__APP_VERSION__` — the footer stopped carrying it in 1.3.1 and now holds only the privacy link.
