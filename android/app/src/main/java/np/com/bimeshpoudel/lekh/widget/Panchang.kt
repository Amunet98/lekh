package np.com.bimeshpoudel.lekh.widget

import android.content.Context
import org.json.JSONObject
import java.io.File

/**
 * Festivals, holidays and tithi, read from `assets/panchang.json` — the same
 * file the web app bundles, copied in by `npm run android:assets`.
 *
 * Why this is data and not a calculation is explained at length in the web
 * app's `src/lib/calendar/panchang.ts`; the short version is that Dashain,
 * Tihar, Teej and the rest fall on a lunar tithi that cannot be derived from
 * the date. The table therefore has a hard end, and `coverageTo` is it.
 *
 * TWO COPIES, THE NEWER ONE WINS
 *
 * The asset is what this APK shipped with. Once a day
 * [PanchangRefreshWorker] downloads the same file from the site, where every
 * web deploy publishes it, and hands it to [install]. So a corrected festival
 * reaches the widget the day it is deployed, without a Play release (Laxmi
 * Puja 2083 had to wait for one — that is why this exists).
 *
 * Drawing never touches the network: the download happens in the worker, and
 * the widget only ever reads a file already on the phone. A download is
 * checked before it is kept ([isValid]) and again whenever it is read, and it
 * is only used while its `generated` stamp is newer than the asset's — so
 * updating the app to a build with newer data can never be overruled by an
 * older download, and a damaged file just means the asset is used.
 */
data class DayPanchang(
    val festivals: List<String>,
    val isHoliday: Boolean,
    val tithi: String,
)

object Panchang {

    private const val DOWNLOADED = "panchang-v1.json"
    /* "2026-10-27T15:04:05Z" since 1.9.66; a plain date before that. Both
       compare correctly as strings, the date sorting first. */
    private val ISO_DATE = Regex("[0-9]{4}-[0-9]{2}-[0-9]{2}(T[0-9]{2}:[0-9]{2}:[0-9]{2}Z)?")

    private var years: JSONObject? = null
    // Read only by covers() below; the widget asks that question, never the
    // bounds themselves.
    private var coverageFrom = 0
    private var coverageTo = 0
    /** The `generated` stamp of the copy in use. */
    private var generated = ""
    private var loaded = false

    @Synchronized
    fun load(context: Context) {
        if (loaded) return
        val bundled = JSONObject(context.assets.open("panchang.json").bufferedReader().use { it.readText() })
        val downloaded = readDownloaded(context)
        val json =
            if (downloaded != null && downloaded.optString("generated") > bundled.optString("generated")) {
                downloaded
            } else {
                bundled
            }
        val coverage = json.getJSONObject("coverage")
        coverageFrom = coverage.getInt("from")
        coverageTo = coverage.getInt("to")
        generated = json.optString("generated")
        years = json.getJSONObject("years")
        loaded = true
    }

    /**
     * Keeps a freshly downloaded copy if it is valid and newer than the one
     * in use, and switches to it. Returns whether anything changed, so the
     * caller knows to redraw.
     */
    @Synchronized
    fun install(context: Context, text: String): Boolean {
        load(context)
        val json = try { JSONObject(text) } catch (_: Exception) { return false }
        if (!isValid(context, json) || json.optString("generated") <= generated) return false
        // Written beside the target, then renamed over it: a reader never sees half a file.
        val target = File(context.filesDir, DOWNLOADED)
        val temp = File(context.filesDir, "$DOWNLOADED.tmp")
        temp.writeText(text)
        if (!temp.renameTo(target)) {
            temp.delete()
            return false
        }
        loaded = false
        load(context)
        return true
    }

    private fun readDownloaded(context: Context): JSONObject? = try {
        val file = File(context.filesDir, DOWNLOADED)
        if (!file.exists()) null else JSONObject(file.readText()).takeIf { isValid(context, it) }
    } catch (_: Exception) {
        null
    }

    /**
     * The rules the web app's generator holds upstream to, applied to what
     * came over the network: every month of every covered year present, and
     * every month exactly as long as the conversion table says — the check
     * that stops festivals landing on the wrong squares. It must also cover
     * this year, so a broken feed can never blank the widget's today. (The
     * tithi alignment check already ran at build time, before the site
     * published the file.)
     */
    private fun isValid(context: Context, json: JSONObject): Boolean = try {
        NepaliCalendar.load(context)
        val coverage = json.getJSONObject("coverage")
        val from = coverage.getInt("from")
        val to = coverage.getInt("to")
        val years = json.getJSONObject("years")
        ISO_DATE.matches(json.getString("generated")) &&
            from <= to && to - from < 20 &&
            NepaliCalendar.today().year in from..to &&
            (from..to).all { year ->
                val months = years.getJSONObject(year.toString())
                (1..12).all { month ->
                    val m = months.getJSONObject(month.toString())
                    val length = NepaliCalendar.monthLength(year, month - 1)
                    val holidays = m.getJSONArray("h")
                    length != null &&
                        m.getJSONArray("t").length() == length &&
                        m.getJSONObject("f").keys().asSequence().all { (it.toIntOrNull() ?: 0) in 1..length } &&
                        (0 until holidays.length()).all { holidays.getInt(it) in 1..length }
                }
            }
    } catch (_: Exception) {
        false
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
            // one to show when there is only room for one. A few entries have
            // a comma *inside* a parenthetical note (e.g. "...होली(हिमाली,
            // पहाडी तथा भित्री मधेशका ५६ जिल्लाहरूमा बिदा)"), so a plain split
            // on "," would cut that note in half — split only at top level.
            splitTopLevel(festivalText).map { it.trim() }.filter { it.isNotEmpty() }
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
     *
     * [accept] narrows what counts: the English widget passes "has a festival
     * with an English name", so "Next" never names a festival it would then
     * have to show in Nepali.
     */
    fun upcoming(
        after: BsDate,
        withinDays: Int = 60,
        accept: (DayPanchang) -> Boolean = { it.festivals.isNotEmpty() },
    ): Pair<Int, DayPanchang>? {
        val start = NepaliCalendar.toGregorian(after)
        for (offset in 1..withinDays) {
            val bs = NepaliCalendar.fromGregorian(start.plusDays(offset.toLong()))
            val info = forDay(bs) ?: continue
            if (accept(info)) return offset to info
        }
        return null
    }

    /**
     * Splits on "," except while inside "(...)". An unclosed paren (a couple
     * of entries in the bundled data run off the end of the string without
     * ever closing one) just means depth never returns to zero, so the rest
     * of the text stays one fragment instead of being cut at the next comma —
     * still better than splitting mid-note.
     */
    private fun splitTopLevel(text: String): List<String> {
        val parts = mutableListOf<String>()
        val current = StringBuilder()
        var depth = 0
        for (ch in text) {
            when {
                ch == '(' -> { depth++; current.append(ch) }
                ch == ')' -> { depth--; current.append(ch) }
                ch == ',' && depth <= 0 -> { parts.add(current.toString()); current.clear() }
                else -> current.append(ch)
            }
        }
        parts.add(current.toString())
        return parts
    }
}
