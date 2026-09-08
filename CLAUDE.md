# Lekh Patro — standing rules

- Bump the patch version in `package.json` on every app change, however minor, then run `npm install` to sync `package-lock.json`. The version is shown twice, both via `__APP_VERSION__`: as the subtitle of the About row in Settings (`src/components/SettingsScreen.tsx`) and at the foot of the About pane (`src/components/AboutScreen.tsx`). There is no footer — the app has no page furniture, and anything of this kind belongs in About, which is now a pane of the Settings screen rather than a sheet of its own (`src/components/Screen.tsx`).

- The romanization layout is the Nepali Unicode **Romanized** scheme, not one of
  our own, and case is meaningful in it rather than a bug to fix: `t`/`T` is
  dental/retroflex (same for `d`/`D`, `n`/`N`), `A`/`I`/`U` are the long vowels,
  `M`/`H` the anusvara and visarga. Those eight capitals plus the digraphs `Th`,
  `Dh` and `Sh` are the whole of it — every other capital is just its lowercase
  letter, and a word never opens with a bare combining mark. Before changing
  anything about capitals, read `src/lib/engine/maps.ts` and the cases in
  `src/lib/engine/engine.test.ts`; they are the record of what is deliberate.
