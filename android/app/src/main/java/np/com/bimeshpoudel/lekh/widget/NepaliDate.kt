package np.com.bimeshpoudel.lekh.widget

import android.content.Context
import org.json.JSONObject
import java.time.LocalDate

/**
 * Bikram Sambat dates, ported from the web app's calendar.
 *
 * The month-length table and the epoch anchor are NOT written out here — they
 * are read from `assets/bs-calendar.json`, which `npm run android:assets`
 * generates from the same `nepali-date-converter` table the browser uses. A
 * second hand-copied table in Kotlin would drift the first time either side
 * was corrected, and the failure would be a silently wrong date rather than a
 * crash.
 *
 * BS months run 29–32 days on a pattern set by solar transits, so there is no
 * formula to implement: everything below is counting days from a known anchor.
 */
data class BsDate(val year: Int, val month: Int, val day: Int) // month is 0-based

object NepaliCalendar {

    val monthNames = arrayOf(
        "बैशाख", "जेठ", "असार", "श्रावण", "भदौ", "असोज",
        "कार्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत"
    )
    val weekdayNames = arrayOf(
        "आइतबार", "सोमबार", "मङ्गलबार", "बुधबार", "बिहिबार", "शुक्रबार", "शनिबार"
    )
    /** For the 5x2 week strip, where seven full names would not fit. */
    val weekdayShort = arrayOf("आइत", "सोम", "मङ्गल", "बुध", "बिहि", "शुक्र", "शनि")

    private const val SUNDAY = 0
    private const val SATURDAY = 6

    /**
     * Nepal's two-day weekend. Saturday has always been the weekly day off;
     * Sunday was added by cabinet decision effective Chaitra 23, 2082
     * (6 April 2026). Dated, not global — the same rule as the web app, and
     * for the same reason: applying it to earlier dates would be wrong.
     */
    private val twoDayWeekendFrom = BsDate(2082, 11, 23)

    private var months: Map<Int, IntArray> = emptyMap()
    private var epochYear = 2000
    private var epochAd: LocalDate = LocalDate.of(1943, 4, 14)
    private var loaded = false

    @Synchronized
    fun load(context: Context) {
        if (loaded) return
        val raw = context.assets.open("bs-calendar.json").bufferedReader().use { it.readText() }
        val json = JSONObject(raw)
        epochYear = json.getInt("epochBsYear")
        epochAd = LocalDate.parse(json.getString("epochAd"))

        val table = json.getJSONObject("months")
        val parsed = HashMap<Int, IntArray>()
        for (key in table.keys()) {
            val arr = table.getJSONArray(key)
            parsed[key.toInt()] = IntArray(arr.length()) { arr.getInt(it) }
        }
        months = parsed
        loaded = true
    }

    fun daysInMonth(year: Int, month: Int): Int = months[year]?.getOrNull(month) ?: 30

    fun isSupported(year: Int): Boolean = months.containsKey(year)

    /** Days from the BS epoch to the given BS date. */
    private fun daysFromEpoch(date: BsDate): Int {
        var total = 0
        for (y in epochYear until date.year) total += months[y]?.sum() ?: 365
        val lengths = months[date.year] ?: return total
        for (m in 0 until date.month) total += lengths[m]
        return total + (date.day - 1)
    }

    fun toGregorian(date: BsDate): LocalDate = epochAd.plusDays(daysFromEpoch(date).toLong())

    fun fromGregorian(date: LocalDate): BsDate {
        var remaining = java.time.temporal.ChronoUnit.DAYS.between(epochAd, date).toInt()
        var year = epochYear
        while (true) {
            val lengths = months[year] ?: return BsDate(year, 0, 1)
            val inYear = lengths.sum()
            if (remaining < inYear) break
            remaining -= inYear
            year++
        }
        val lengths = months[year]!!
        var month = 0
        while (month < 12 && remaining >= lengths[month]) {
            remaining -= lengths[month]
            month++
        }
        return BsDate(year, month, remaining + 1)
    }

    fun today(): BsDate = fromGregorian(LocalDate.now())

    /** 0 = Sunday. */
    fun weekdayOf(date: BsDate): Int = toGregorian(date).dayOfWeek.value % 7

    /**
     * The seven days of the week containing [date], Sunday first — what the
     * 5x2 widget draws as a strip.
     *
     * Built by walking Gregorian days rather than BS ones on purpose: a week
     * routinely straddles a BS month boundary, and BS months are 29–32 days on
     * no pattern, so "day - weekday" arithmetic in BS would fall off the start
     * of the month several times a year.
     */
    fun weekOf(date: BsDate): List<BsDate> {
        val sunday = toGregorian(date).minusDays(weekdayOf(date).toLong())
        return (0..6).map { fromGregorian(sunday.plusDays(it.toLong())) }
    }

    private fun compare(a: BsDate, b: BsDate): Int = when {
        a.year != b.year -> a.year.compareTo(b.year)
        a.month != b.month -> a.month.compareTo(b.month)
        else -> a.day.compareTo(b.day)
    }

    /** A weekly day off, as opposed to a festival or declared holiday. */
    fun isWeeklyOff(date: BsDate): Boolean = when (weekdayOf(date)) {
        SATURDAY -> true
        SUNDAY -> compare(date, twoDayWeekendFrom) >= 0
        else -> false
    }

    private val devanagariDigits = charArrayOf('०', '१', '२', '३', '४', '५', '६', '७', '८', '९')

    /** 2083 → २०८३. Digits only; anything else passes through. */
    fun toDevanagari(value: Any): String = buildString {
        for (ch in value.toString()) {
            if (ch in '0'..'9') append(devanagariDigits[ch - '0']) else append(ch)
        }
    }
}
