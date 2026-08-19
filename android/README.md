# Lekh Patro — Android app

A Capacitor-wrapped WebView pointed at the live site, plus a native
home-screen widget. One install does both, for the same reason it always
has: shipping the widget separately from the app would mean asking people to
install a PWA and then sideload an APK, which nobody does.

**This used to be a Trusted Web Activity.** It was migrated to a real
Capacitor WebView on 2026-08-17 (`5933620`); the old TWA project is kept at
`../android-twa-backup/` rather than deleted. If something here looks
unfamiliar next to that project, that migration is almost certainly why —
see "What changed from the TWA" below before assuming a claim from the old
docs still holds.

## What the app is

`capacitor.config.ts` at the repo root has one load-bearing line:

```ts
server: { url: 'https://lekh-gamma.vercel.app' }
```

The WebView loads the live site directly instead of a bundled copy of
`dist/`. That's what keeps "ship a web fix, it's live in minutes, no Play
re-review" true after leaving the TWA behind — the same property the TWA
had, kept on purpose through the migration. The Chromium WebView backing
this supports service workers and Cache Storage the same as Chrome did, so
offline behaviour (including the OCR background prefetch) is unaffected.

`MainActivity.java` is otherwise a stock `BridgeActivity` with two additions:
it turns off the WebView's own scrollbar (the Capacitor bridge re-enables it
after inflating the layout, so `index.css`'s styled one would otherwise sit
under a plain system one), and it hands any incoming intent's URL straight
to the WebView via `loadUrl`. That second part is how both the widget tap
and the long-press app shortcuts (`res/xml/shortcuts.xml`) navigate to a
specific tab — see "No assetlinks" below for why it's a raw `loadUrl` and not
Android App Links.

## What changed from the TWA

- **No more Digital Asset Links.** The TWA needed `assetlinks.json` on the
  live site to agree with the APK's signing certificate before Chrome would
  drop its address bar — and when they disagreed, the app still ran, it just
  silently showed a browser chrome instead of failing loudly. Capacitor
  doesn't have an address bar to hide, so that whole handshake — and its
  failure mode — is gone. `Capacitor.isNativePlatform()` is now the answer
  to "is this the app," and it's synchronous and always correct.
- **The widget's tap target changed from an implicit to an explicit intent.**
  `BaseLekhWidgetProvider.openPatro()` builds a `PendingIntent` that names
  `MainActivity` directly (`setClassName`) rather than a bare
  `ACTION_VIEW https://...` intent that would need App Links verification to
  resolve to the app instead of a browser tab — the same class of
  verification that already failed silently once, under the TWA's
  `assetlinks.json`. `MainActivity.handleIntent` reads the URL off the
  intent and loads it in the existing WebView.
- **The app declares `INTERNET` now.** The TWA's own APK didn't need it —
  Chrome did the networking, in its own process. A Capacitor WebView is this
  process, loading a remote URL, so `AndroidManifest.xml` carries the
  permission at the `<application>` level. The widget itself is unaffected:
  it still draws only from the bundled JSON assets (see "No network" below)
  and holds no permission of its own.
- **All six widget providers carried over unchanged.** Same Kotlin, same
  layouts, same manifest entries, byte-for-byte at the point of migration —
  confirmed by `git show --stat 5933620`. Nothing about the widget system
  described below is new; it predates the migration.
- **The long-press app shortcuts had to be re-added** (`3f3f0fd`) — they were
  dropped in the initial migration and restored to mirror the widget's
  explicit-intent pattern exactly.

## The widget

Six sizes, six separate `AppWidgetProvider` subclasses (`widget/LekhWidget*.kt`,
all extending `BaseLekhWidgetProvider`), each with its own `res/xml/widget_info*.xml`
and `res/layout/widget_patro_*.xml`:

| provider | cells | xml |
|---|---|---|
| `LekhWidgetSmallProvider` | 2×1 | `widget_info_small.xml` |
| `LekhWidgetProvider` | 2×2 | `widget_info.xml` |
| `LekhWidgetWideProvider` | 4×1 | `widget_info_wide.xml` |
| `LekhWidgetLargeProvider` | 4×2 | `widget_info_large.xml` |
| `LekhWidgetXlProvider` | 5×1 | `widget_info_xl.xml` |
| `LekhWidgetXlLargeProvider` | 5×2 | `widget_info_xl_large.xml` |

Six providers rather than one resizable widget so each shows as its own
entry in the launcher's widget picker — most people never think to drag a
corner on a placed widget. The 5-wide pair is offered on four-column
launchers too (measured on one: it lists and clamps them to four cells
rather than hiding them); 4×1/4×2 stay because they're the exact fit on that
grid.

**`WidgetRenderer.build()` populates all six from one function.** Every
layout declares the same view ids and hides whichever ones its shape has no
room for with `visibility="gone"` — a RemoteViews action that targets a
missing id just returns quietly, so writing to a hidden view is harmless.
The 5×2 week strip is the one exception, since its ids only exist in that
one layout.

**Nepali or English is one setting for the whole app**, not per widget id —
chosen from `LekhWidgetConfigActivity`, reached automatically on placement
below Android 12 (`configure` is mandatory pre-API-31) or via long-press →
settings on 12+ (`configuration_optional|reconfigurable`). It defaults to
Nepali and must keep defaulting to Nepali: that's what every already-placed
widget shows. `Roman.kt` covers months, weekdays, tithi, and digits — closed
vocabularies it gets exactly right.

**Festival names stay in Devanagari even in English mode** (`a1fe474`). The
Roman table is a plain, diacritic-free transliteration meant to be skimmed,
not a translation — तीज becomes "teeja" because no letter-by-letter mapping
knows the final vowel is silent, and lesser-known Newar/Tamang/Sherpa
festival names came out unrecognisable to a Nepali reader. `Roman.festival()`
still exists (exact table → component substitution → transliteration
fallback) but nothing in `WidgetRenderer` calls it for the festival line
anymore; only tithi still switches script with the toggle.

**RemoteViews forbids plain `<View>`.** It only inflates an allowlisted set
of widget classes, and `android.view.View` isn't one of them — every layout
that needs a spacer or divider uses an `ImageView` instead, with a comment
at the point of use. This will bite again if a new layout reaches for `<View>`
out of habit.

### No network

The widget reads only the bundled `assets/panchang.json` and
`assets/bs-calendar.json` — no permission, can't leak, can't stall the
launcher on a dead network mid-draw. The cost: new holidays land with an app
update rather than within a day the way the browser's live refresh does. If
that ever needs to change, use `WorkManager`, not a fetch inside `onUpdate`
— that runs on the main thread.

### Midnight, not `updatePeriodMillis`

`updatePeriodMillis` is clamped to 30 minutes and fires on Android's own
schedule, not a wall-clock boundary — a date widget driven by it would show
yesterday's date for up to half an hour after midnight, the one moment it
has to be right. Every provider's manifest entry sets
`updatePeriodMillis="0"` and `BaseLekhWidgetProvider.scheduleMidnight()`
instead arms an exact-time alarm for the next local midnight via
`setWindow()` — deliberately not `setExact()`. That distinction shipped a
crash once: `setExact()` needs `SCHEDULE_EXACT_ALARM`, not granted by
default from Android 13, and the `SecurityException` threw from inside
`onUpdate`, taking the whole process down the instant a widget was placed.
`setWindow()` needs no permission and is wrapped in a `try/catch` regardless
— the manifest's `DATE_CHANGED`/`TIME_SET`/`TIMEZONE_CHANGED` receivers are
the belt to the alarm's braces, so a widget must never be able to crash the
app over a cosmetic refresh.

## Versioning

`versionName`/`versionCode` in `app/build.gradle` are not hand-typed. They're
read from the root `package.json`'s `version` field at Gradle configure
time — the same field `CLAUDE.md` already requires bumping on every change —
so there is exactly one version number for the whole app. `versionCode` is
derived as `major*1_000_000 + minor*1_000 + patch`, since Play requires a
plain ever-increasing integer rather than a semver string (true for any
version this app will realistically reach — it breaks if a component ever
hits 1000).

## The widget's data is shared, not copied

```sh
npm run android:assets
```

writes `app/src/main/assets/panchang.json` (byte-identical to the web app's)
and `bs-calendar.json` (the BS month-length table and epoch, lifted from
`nepali-date-converter`), and renders `ic_launcher.png` at five densities
from `design/app-icon.html` — the same source the PWA's icons come from.
**Re-run it after `npm run calendar:data`.** A second, hand-written
month-length table in Kotlin would drift the first time either side got
corrected, and the symptom would be a wrong date rather than a build
failure — which is why the script verifies its own epoch and walks the
table forward against the library before writing anything, and aborts
rather than exporting if either check fails.

## Build

```sh
npm run android:assets
cd android
./gradlew assembleDebug        # or open android/ in Android Studio
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

The debug build's only launcher activity is `WidgetPreviewActivity`
("Lekh Patro preview", `src/debug/`) — it calls `WidgetRenderer.build()`
directly and draws every size's real RemoteViews at roughly its cell
dimensions on a normal screen. It's faster to iterate on than placing a
widget, but it is a preview, not a substitute: it never goes through
`onUpdate`, so it can't catch anything in the provider itself — exactly how
the `setExact()` crash above shipped despite the harness looking fine. Place
a widget on a real home screen before releasing a widget change. (A debug
build has no launcher icon other than the preview; the release build's
launcher is the app itself.)

**Samsung's Auto Blocker** will silently block both sideloading and USB
debugging on some devices — if `adb install` or even `adb devices` isn't
seeing a Samsung phone, that's the first thing to check, not a cable or a
missing `adb` permission dialog.

## Release and publish

```sh
npm run android:release   # assembleRelease -> app/build/outputs/apk/release/app-release.apk
npm run android:bundle    # bundleRelease   -> app/build/outputs/bundle/release/app-release.aab
npm run play:publish      # android:bundle, then uploads the AAB to Play's internal testing track
```

All three run `android:assets` and `npm run build` first, then
`npx cap sync android` to refresh the bundled web assets Capacitor ships
inside the APK/AAB (`app/src/main/assets/public/`) before invoking Gradle.

**Signing** comes from `android/keystore.properties` — gitignored, not
present in a fresh clone, and points at a keystore kept **outside** the repo
(`~/.keystores/`, alongside the Play service-account key below). It needs
four properties: `storeFile`, `storePassword`, `keyAlias`, `keyPassword`.
Without the file, release builds are simply unsigned rather than failing, so
a fresh clone can still build. **Back the keystore up** — lose it and no
future build can update an installed copy, and a Play listing signed with it
can never be updated again.

**Publishing is automated** (`scripts/play-publish.mjs`, added 2026-08-17).
It authenticates as a service account
(`lekh-play-publisher@lekh-play-publish.iam.gserviceaccount.com`) invited to
this app specifically with only "Release apps to testing tracks" — no
production access, no other apps. Its key lives at
`~/.keystores/lekh-play-publish-sa.json` (override with
`PLAY_SERVICE_ACCOUNT_KEY`), next to the signing keystore, same reasoning.
The script expects the AAB already built at
`android/app/build/outputs/bundle/release/app-release.aab` — it uploads,
doesn't rebuild — and defaults to the `internal` track
(`npm run play:publish -- closed` for another one).

**Play Store, not GitHub Releases, is the live distribution channel now.**
The `android-v*` GitHub releases (`android-v1.0.0` through `android-v1.5.2`,
asset `lekh-patro.apk`) predate both the version-unification with
`package.json` and the Play automation — they're the pre-Play-Store history,
not a channel still being updated. Don't add a new one for a routine release;
`npm run play:publish` is the current path.

## Deliberate choices worth not undoing

- **`android:exported="true"` on every widget receiver.** A widget provider
  receives `APPWIDGET_UPDATE` from the *system*; `false` means the broadcast
  never arrives and the widget silently never draws. Android 12+ also
  requires the attribute stated explicitly whenever a receiver has an
  intent-filter.
- **`android:exported="true"` on `LekhWidgetConfigActivity`.** The *launcher*
  starts it, not this app — an unexported configure activity means the
  launcher silently refuses to place the widget. It takes no input beyond a
  widget id and writes one boolean, so there's nothing here for another app
  to abuse by starting it.
- **Explicit-intent navigation from both the widget and the app shortcuts**,
  not `ACTION_VIEW` on a bare URL — see "No assetlinks" above. This is a
  correctness property now, not just a convenience: unlike the TWA, there is
  no verification step that could silently fall back to a browser tab.
- **`minSdk = 26`**, because the widget's date logic uses `java.time`.
  Desugaring could lower it; a calendar widget on Android 7 isn't worth the
  build complexity.
- **Saturday *and* Sunday.** Nepal's two-day weekend took effect Chaitra 23,
  2082 (6 April 2026); the widget's weekend rule is dated, matching the web
  app, not unconditional. Don't make it unconditional.

## Coverage

Festivals cover **BS 2081–2083** — the same limit as the web app, and for
the same reason: most Nepali festivals fall on a lunar tithi that can't be
derived from the date, so they're tabulated by hand from the upstream
almanac rather than computed. Past that range the widget says the app needs
updating rather than showing a day with nothing on it.
