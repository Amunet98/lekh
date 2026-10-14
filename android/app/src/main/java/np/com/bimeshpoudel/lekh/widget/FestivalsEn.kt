package np.com.bimeshpoudel.lekh.widget

import android.content.Context
import org.json.JSONObject

/**
 * English for the widget's English mode: festival names from
 * `assets/festivals-en.json`, plus the closed sets (months, weekdays, tithi).
 *
 * The festival names are NOT generated here. They are the hand-checked list
 * from the web app's `src/lib/calendar/festivalsEn.ts`, copied in by
 * `npm run android:assets` — the same list the Patro tab shows. A festival
 * with no entry has no English, and the widget shows the tithi instead.
 *
 * That is the whole lesson of the first English mode (removed 2026-08-29):
 * it gave every one of ~450 almanac names an English form, by table and then
 * letter by letter, and too many came out wrong ("Naaga", "Panchamee").
 * Never put a transliteration fallback back in here. A missing name is
 * better than a wrong one.
 */
object FestivalsEn {

    private var names: Map<String, String> = emptyMap()
    /* Each English name's position in festivalsEn.ts, which lists a
       festival's main day before its side observances (Fulpati before
       Navapatrika Pravesh, Tika before Kalratri). The JSON keeps that order —
       JSONObject iterates in insertion order on Android — so it is read off
       here and used to put the name that matters first. */
    private var rank: Map<String, Int> = emptyMap()
    private var loaded = false

    @Synchronized
    fun load(context: Context) {
        if (loaded) return
        names = try {
            val json = JSONObject(
                context.assets.open("festivals-en.json").bufferedReader().use { it.readText() },
            )
            json.keys().asSequence().associateWith { json.getString(it) }
        } catch (_: Exception) {
            // No table means no English festival names; the widget still draws.
            emptyMap()
        }
        rank = names.values.distinct().withIndex().associate { (i, en) -> en to i }
        loaded = true
    }

    /* The almanac's spacing drifts ("काय  अष्टमी" next to "काय अष्टमी"), so
       lookups collapse whitespace — the same normalize() as festivalsEn.ts. */
    private fun normalize(name: String) = name.replace(Regex("\\s+"), " ").trim()

    private val trailingNote = Regex("\\([^()]*\\)\\s*$")

    /** English for one almanac name, or null. Tries the name as it stands,
     *  then without a trailing parenthetical — festivalInfo()'s two steps. */
    fun lookup(name: String): String? {
        val key = normalize(name)
        return names[key] ?: names[normalize(key.replace(trailingNote, ""))]
    }

    /** The English for a day's festivals, main one first (see [rank]), with
     *  repeats dropped (two spellings can share one name). */
    fun forDay(festivals: List<String>): List<String> =
        festivals.mapNotNull { lookup(it) }.distinct().sortedBy { rank[it] ?: Int.MAX_VALUE }

    /** "Ghatasthapana — Dashain begins" → "Ghatasthapana": the name alone,
     *  for the one-line "Next" row where the gloss does not fit. */
    fun short(en: String): String = en.substringBefore(" — ")

    /* The closed sets, which a table CAN get right. Months use the web app's
       own spellings (NP_MONTHS_EN in src/lib/calendar/nepaliDate.ts), so the
       widget and the date converter agree; keep the two in step. */
    val monthNames = arrayOf(
        "Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Aswin",
        "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
    )
    val weekdayNames = arrayOf(
        "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
    )
    val weekdayShort = arrayOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")

    /* The sixteen tithi, keyed by the almanac's own spellings — including its
       द्दितीया (with द्द, not द्व) and पुर्णिमा, which are what the data says. */
    private val tithi = mapOf(
        "प्रतिपदा" to "Pratipada",
        "द्दितीया" to "Dwitiya",
        "द्वितीया" to "Dwitiya",
        "तृतीया" to "Tritiya",
        "चतुर्थी" to "Chaturthi",
        "पञ्चमी" to "Panchami",
        "षष्ठी" to "Shashthi",
        "सप्तमी" to "Saptami",
        "अष्टमी" to "Ashtami",
        "नवमी" to "Navami",
        "दशमी" to "Dashami",
        "एकादशी" to "Ekadashi",
        "द्वादशी" to "Dwadashi",
        "त्रयोदशी" to "Trayodashi",
        "चतुर्दशी" to "Chaturdashi",
        "औशी" to "Aunsi (new moon)",
        "औंसी" to "Aunsi (new moon)",
        "पुर्णिमा" to "Purnima (full moon)",
        "पूर्णिमा" to "Purnima (full moon)",
    )

    /** English for a tithi, or "" for one this table does not know. */
    fun tithi(name: String): String = tithi[name.trim()] ?: ""
}
