# Lekh Patro — Android home-screen widget

A small native widget showing today's Bikram Sambat date, weekday, tithi and
festival. Tapping it opens the Patro tab of the web app.

**This exists because a PWA cannot provide one.** The `widgets` manifest member
is Microsoft's PWA-driven Widgets for the Windows 11 Widgets Board, not the
Android home screen; there is no web API for an Android widget. A native
`AppWidgetProvider` is the only route, which is why there is Kotlin in a repo
that is otherwise a web app.

## Status: released — six widget sizes, signed, on GitHub Releases

Eight releases since the first build, `android-v1.0.0` through the current
`android-v1.5.2` (`versionCode` 10). `compileSdk`/`targetSdk` are 36 (Android
16), which Google Play requires; `minSdk` is still 26. Widget sizes grew from
the original three to six — 2x1, 2x2, 4x1, 4x2, 5x1, 5x2 — and rendering now
follows Nepali or English by a widget-settings screen rather than being fixed.
Distributed as a signed APK on GitHub Releases (asset name `lekh-patro.apk`);
a Play Store listing is in progress, currently in internal testing.

Two bugs only a real device placement could have caught, both fixed and
shipped:

- **v1.2.0 crashed on placement.** `scheduleMidnight()` called `setExact()`,
  which needs `SCHEDULE_EXACT_ALARM` from Android 12 and is not granted by
  default on 13+. Measured on a device: `canScheduleExactAlarms() == false`,
  and the `SecurityException` threw from inside `onUpdate`, taking the whole
  process down the moment a widget was placed. Fixed by switching to
  `setWindow()`, which needs no permission. The debug preview activity calls
  the renderer directly and never runs `onUpdate`, so no amount of previewing
  could have caught this — it took an actual widget on an actual home screen.
- **The date could go invisible on a theme change.** Colours were resolved
  from the app's own light/dark idea rather than the launcher's; placing a
  widget in one theme and switching the phone to the other left the date
  (and, on 5x2, the weekend dates and weekday letters) nearly unreadable until
  the next redraw. Now follows the launcher's theme live, Android 8 and up.

What the original Android-15-emulator session verified still holds — both
implementations agreeing on a given date, the weekend rule flipping the
numeral crimson, dark mode picking up `values-night`, the provider registering
with `AppWidgetService`, and the signed release's TWA opening with no address
bar — and target-36 behaviour (system bars, widget, calendar) has since been
re-verified on a device. What is still not specifically documented as tested:
waiting through an actual real-time midnight rollover rather than advancing
the clock or letting the app run past it incidentally.

**A note on the emulator, if you try it headless:** `-no-window` crashes here.
`qemu-system-x86_64` segfaults and dumps core about eight seconds into guest
boot under both `-gpu swiftshader_indirect` and `-gpu off`. Running it
*windowed* on the desktop session works fine. Nothing about it implicates the
widget.

**On your own phone**, which is the better target anyway:

```sh
npm run android:assets && cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

The debug build also installs a **preview activity** ("Lekh Patro preview")
that draws every size's real RemoteViews at roughly its cell dimensions in a
normal screen — quicker to iterate on than adding a widget to a home screen,
and it never reaches a release build because it lives in `src/debug/`.

It is a preview, not a substitute. The harness calls the renderer directly and
never goes through `onUpdate`, so it cannot catch anything in the provider —
which is exactly how a `setExact()` SecurityException shipped in 1.2.0 and
crashed the app the moment a widget was placed. Place one on a real home
screen before releasing.

### Nepali or English

`Roman.kt` turns the calendar into Latin script, and it is three layers rather
than one table for a reason. Months, weekdays, tithis and digits are closed
sets written out by hand, so they are simply correct. Festival names are not:
the bundled data alone holds 452 distinct fragments and the web app refreshes
the table daily from the upstream almanac, so a name nobody has seen can arrive
tomorrow. A hand table can never be complete and a mechanical transliterator
gets the famous names wrong — तीज comes out "teeja", because no letter-by-letter
mapping can know the final vowel is silent.

So the known festivals are spelled out, the components that recur across the
rest (पूजा, जयन्ती, दिवस, पर्व…) are substituted, and anything still unmatched
is transliterated. An unknown name reads approximately instead of not at all.

The setting is one boolean for the whole app, not per widget id — "this widget
in Nepali and that one in English" is not a thing anyone wants. It defaults to
Nepali and must keep defaulting to Nepali: that is what every already-placed
widget shows.

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

RemoteViews rendering Devanagari on a real device, the alarm surviving in
practice, and how it looks on a home screen are no longer open questions —
see Status above. What remains untested specifically is a real-time midnight
rollover rather than one produced by advancing the clock.

## What the APK is

**One install, two things.** It is a Trusted Web Activity — it opens
lekh-gamma.vercel.app full-screen in the user's own Chrome, with no address bar
— *and* it registers the home-screen widget. Shipping the widget separately
from the web app would have meant asking people to install the PWA and then
sideload an APK, which nobody does.

The address bar disappears only if the Digital Asset Links handshake succeeds:
`res/values/twa.xml` declares the site this app claims, and
`public/.well-known/assetlinks.json` on that site lists this APK's signing
certificate. **If they disagree the app still runs — it just shows Chrome's
address bar**, so this fails quietly and has to be checked by looking.
Regenerate the site half with `npm run assetlinks` after any signing change;
it reads the fingerprint out of the built APK rather than trusting a keystore.

## Build

```sh
npm run android:assets        # from the repo root, first — see below
cd android
./gradlew assembleDebug        # or open this folder in Android Studio
adb install app/build/outputs/apk/debug/app-debug.apk
```

For a signed release build, copy `keystore.properties.example` to
`keystore.properties` (gitignored) and point it at a keystore kept **outside**
the repo, then `npm run android:release`. Without that file, release builds
are simply unsigned rather than failing, so a fresh clone still works.

**Back the keystore up.** It is the identity of the app: lose it and no future
build can update an installed copy, and a Play listing signed with it can never
be updated again.

Then long-press the home screen → Widgets → **Lekh Patro**.

A debug build's only launcher activity is the "Lekh Patro preview" screen
(`src/debug/`) — there is no widget-only, drawer-invisible variant. A signed
release build launches the TWA instead (see "What the APK is" above), which
is the one that ships.

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
- **A midnight alarm, not `updatePeriodMillis`, and `updatePeriodMillis="0"`
  in the manifest.** `updatePeriodMillis` is clamped to 30 minutes and fires
  on Android's schedule, not on a wall-clock boundary — so a date widget
  driven by it shows yesterday's date for up to half an hour after midnight,
  which is the one moment it must be right. The alarm itself is scheduled with
  `setWindow()`, not `setExact()` — see Status above for why.
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
