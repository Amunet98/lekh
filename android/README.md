# Lekh Patro — Android home-screen widget

A small native widget showing today's Bikram Sambat date, weekday, tithi and
festival. Tapping it opens the Patro tab of the web app.

**This exists because a PWA cannot provide one.** The `widgets` manifest member
is Microsoft's PWA-driven Widgets for the Windows 11 Widgets Board, not the
Android home screen; there is no web API for an Android widget. A native
`AppWidgetProvider` is the only route, which is why there is Kotlin in a repo
that is otherwise a web app.

## Status: it compiles; it has not been seen on a screen

`./gradlew assembleDebug` produces a working 856 KB APK (`np.com.bimeshpoudel.lekh`,
minSdk 26, target 35). Building it immediately caught one real bug — `R` is
generated into the *namespace* package, not this file's package, so every
`R.layout`/`R.id`/`R.color` reference was unresolved until an explicit
`import np.com.bimeshpoudel.lekh.R` was added. That is exactly the class of
error "never compiled" was warning about.

**It has still never been rendered on a screen.** The Android emulator does
not run on this machine: `qemu-system-x86_64` segfaults and dumps core about
eight seconds into guest boot, with both `-gpu swiftshader_indirect` and
`-gpu off`, so it is not the renderer. KVM is present and usable and there is
ample RAM and disk; it looks like an incompatibility between the bundled
emulator QEMU and this Fedora kernel. Nothing about it implicates the widget.

**The fastest way to actually see it is your own phone**, which is a better
test target than an emulator anyway:

```sh
npm run android:assets && cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

The debug build also installs a **preview activity** ("Lekh Patro preview")
that draws the widget's real RemoteViews at 2x2 and 4x2 cell sizes in a normal
screen — quicker to iterate on than adding a widget to a home screen, and it
never reaches a release build because it lives in `src/debug/`.

What *was* verified, beyond the build:

- **The date algorithm.** `NepaliDate.kt` was ported line-for-line back into
  JavaScript and run against `nepali-date-converter` over **3,970
  conversions** — the 1st, 15th and last day of every month across BS
  2000–2089, each round-tripped, plus a 730-day consecutive sweep to catch
  month-boundary errors. Every one matched.
- **The epoch.** `npm run android:assets` asserts BS 2000-01-01 = AD
  1943-04-14 and then walks the month table forward to confirm it agrees with
  the library at a date far from the anchor. It aborts rather than exporting if
  either check fails.
- **Resources.** Every XML file parses, and every `@color`/`@layout`/`@drawable`
  /`@mipmap` and `R.*` reference resolves to something that exists.

What was **not** verified: that RemoteViews renders the Devanagari on a real
device, that the midnight alarm fires, or how it looks on a home screen.

## Build

```sh
npm run android:assets        # from the repo root, first — see below
cd android
./gradlew assembleDebug        # or open this folder in Android Studio
adb install app/build/outputs/apk/debug/app-debug.apk
```

Then long-press the home screen → Widgets → **Lekh Patro**.

The app has **no launcher activity** — it is a widget and nothing else, so it
will not appear in the app drawer. That is intentional.

## The data is shared, not copied

`npm run android:assets` writes into `app/src/main/assets/`:

| file | what |
|---|---|
| `panchang.json` | festivals, holidays and tithi — byte-identical to the web app's |
| `bs-calendar.json` | the BS month-length table and epoch, lifted from `nepali-date-converter` |

It also renders `ic_launcher.png` at five densities from `design/app-icon.html`,
the same source the PWA's icons come from.

**Re-run it after `npm run calendar:data`.** The widget and the browser must
never disagree about what day it is; the alternative — a second month-length
table hand-written in Kotlin — would drift the first time either side was
corrected, and the symptom would be a wrong date rather than a crash.

## Deliberate choices worth not undoing

- **No `INTERNET` permission.** The widget reads bundled assets only, so it
  cannot leak and cannot stall the launcher on a dead network while it draws.
  The cost is that new holidays arrive with an app update rather than within a
  day as they do in the browser. If that becomes worth changing, add a
  `WorkManager` job — never fetch from `onUpdate`, which runs on the main
  thread.
- **`android:exported="true"` on the receiver.** A widget provider receives
  `APPWIDGET_UPDATE` from the *system*; `false` means the broadcast never
  arrives and the widget silently never draws.
- **An exact alarm at midnight, and `updatePeriodMillis="0"`.**
  `updatePeriodMillis` is clamped to 30 minutes and fires on Android's
  schedule, not on a wall-clock boundary — so a date widget driven by it shows
  yesterday's date for up to half an hour after midnight, which is the one
  moment it must be right.
- **Saturday *and* Sunday.** Nepal's two-day weekend took effect Chaitra 23,
  2082 (6 April 2026), and `isWeeklyOff` encodes that as a dated rule, matching
  the web app. Do not make it unconditional.
- **`minSdk = 26`**, because the date logic uses `java.time`. Desugaring could
  lower it; a calendar widget on Android 7 is not worth the build complexity.

## Coverage

Festivals cover **BS 2081–2083** — the same limit as the web app, and for the
same reason: most Nepali festivals fall on a lunar tithi that cannot be
derived from the date, so they are tabulated. Past that the widget shows the
date and says the app needs updating, rather than showing a day with nothing
on it.
