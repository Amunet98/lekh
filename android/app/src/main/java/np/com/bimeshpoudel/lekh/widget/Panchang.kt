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
    // Read only by covers() below; the widget asks that question, never the
    // bounds themselves.
    private var coverageFrom = 0
    private var coverageTo = 0
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

    /**
     * The next day after [after] that carries a festival, as a
     * (days-away, panchang) pair, or null if there is none within [withinDays].
     *
     * The wider widgets have room for what is coming as well as what is here,
     * and "what is coming" is the actual reason people keep a patro on a home
     * screen. Sixty days is a compromise: far enough that the answer is almost
     * never empty (Nepal does not go two months without a festival), near
     * enough that a match is still worth reading.
     *
     * Walking Gregorian days and converting each one back is deliberate — it
     * cannot run off the end of a BS month, and `fromGregorian` is a few
     * integer sums, so sixty of them at draw time is nothing.
     */
    fun upcoming(after: BsDate, withinDays: Int = 60): Pair<Int, DayPanchang>? {
        val start = NepaliCalendar.toGregorian(after)
        for (offset in 1..withinDays) {
            val bs = NepaliCalendar.fromGregorian(start.plusDays(offset.toLong()))
            val info = forDay(bs) ?: continue
            if (info.festivals.isNotEmpty()) return offset to info
        }
        return null
    }
}
