package np.com.bimeshpoudel.lekh.widget

import android.content.Context
import org.json.JSONObject

/**
 * Festivals, holidays and tithi, read from `assets/panchang.json` — the same
 * file the web app bundles, copied in by `npm run android:assets`.
 *
 * Why this is data and not a calculation is explained at length in the web
 * app's `src/lib/calendar/panchang.ts`; the short version is that Dashain,
 * Tihar, Teej and the rest fall on a lunar tithi that cannot be derived from
 * the date. The table therefore has a hard end, and `coverageTo` is it.
 *
 * The widget deliberately does not fetch anything. It has no INTERNET
 * permission, so it cannot leak and cannot stall on a dead network at draw
 * time; the trade is that new holidays arrive when the app is updated rather
 * than within a day as they do in the browser. If that becomes worth changing,
 * add a WorkManager job rather than fetching from onUpdate — a widget update
 * runs on the main thread and must not block.
 */
data class DayPanchang(
    val festivals: List<String>,
    val isHoliday: Boolean,
    val tithi: String,
)

object Panchang {

    private var years: JSONObject? = null
    var coverageFrom = 0
        private set
    var coverageTo = 0
        private set
    private var loaded = false

    @Synchronized
    fun load(context: Context) {
        if (loaded) return
        val raw = context.assets.open("panchang.json").bufferedReader().use { it.readText() }
        val json = JSONObject(raw)
        val coverage = json.getJSONObject("coverage")
        coverageFrom = coverage.getInt("from")
        coverageTo = coverage.getInt("to")
        years = json.getJSONObject("years")
        loaded = true
    }

    fun covers(year: Int): Boolean = year in coverageFrom..coverageTo

    /** Null when the year is outside the tabulated range — callers must say so. */
    fun forDay(date: BsDate): DayPanchang? {
        val yearObj = years?.optJSONObject(date.year.toString()) ?: return null
        // The file is keyed 1–12; BsDate.month is 0-based.
        val monthObj = yearObj.optJSONObject((date.month + 1).toString()) ?: return null

        val tithis = monthObj.optJSONArray("t")
        val tithi = tithis?.optString(date.day - 1) ?: ""

        val festivalText = monthObj.optJSONObject("f")?.optString(date.day.toString()) ?: ""
        val festivals = if (festivalText.isBlank()) {
            emptyList()
        } else {
            // The source packs several festivals into one comma-separated
            // string, in rough significance order — so the first one is the
            // one to show when there is only room for one.
            festivalText.split(",").map { it.trim() }.filter { it.isNotEmpty() }
        }

        val holidays = monthObj.optJSONArray("h")
        var isHoliday = false
        if (holidays != null) {
            for (i in 0 until holidays.length()) {
                if (holidays.optInt(i) == date.day) {
                    isHoliday = true
                    break
                }
            }
        }

        return DayPanchang(festivals, isHoliday, tithi)
    }
}
