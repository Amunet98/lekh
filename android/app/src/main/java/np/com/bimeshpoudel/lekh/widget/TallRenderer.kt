package np.com.bimeshpoudel.lekh.widget

import android.app.PendingIntent
import android.content.Context
import android.os.Build
import android.view.View
import android.widget.RemoteViews
import np.com.bimeshpoudel.lekh.R
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * The tall widget (the 5x1 dragged to two rows or more), design D from the
 * owner's canvas (2.0.25): the month and today across the top, the week with
 * each day's tithi and today as a filled tile, and the next festivals as an
 * agenda underneath.
 *
 * It colours itself rather than going through WidgetTheme.applyStatic and
 * WidgetPalette.apply, because today's tile needs its text in the on-tile
 * colour, which only a per-view colour can give: WidgetPaint does that in
 * every mode (fixed palette resources or wallpaper values). Below Android 12
 * the layout's own colours stand and today is the quieter tonal pill, since
 * a colour set here would be resolved against the app's configuration rather
 * than the launcher's (see the note on context.getColor in the widget memory).
 */
internal object TallRenderer {

    private val cellIds = intArrayOf(
        R.id.widget_week_c0, R.id.widget_week_c1, R.id.widget_week_c2, R.id.widget_week_c3,
        R.id.widget_week_c4, R.id.widget_week_c5, R.id.widget_week_c6,
    )
    private val labelIds = intArrayOf(
        R.id.widget_week_l0, R.id.widget_week_l1, R.id.widget_week_l2, R.id.widget_week_l3,
        R.id.widget_week_l4, R.id.widget_week_l5, R.id.widget_week_l6,
    )
    private val dayIds = intArrayOf(
        R.id.widget_week_d0, R.id.widget_week_d1, R.id.widget_week_d2, R.id.widget_week_d3,
        R.id.widget_week_d4, R.id.widget_week_d5, R.id.widget_week_d6,
    )
    private val tithiIds = intArrayOf(
        R.id.widget_week_t0, R.id.widget_week_t1, R.id.widget_week_t2, R.id.widget_week_t3,
        R.id.widget_week_t4, R.id.widget_week_t5, R.id.widget_week_t6,
    )
    private val dotIds = intArrayOf(
        R.id.widget_week_f0, R.id.widget_week_f1, R.id.widget_week_f2, R.id.widget_week_f3,
        R.id.widget_week_f4, R.id.widget_week_f5, R.id.widget_week_f6,
    )
    private val rowIds = intArrayOf(R.id.widget_ag_row0, R.id.widget_ag_row1, R.id.widget_ag_row2)
    private val nameIds = intArrayOf(R.id.widget_ag_name0, R.id.widget_ag_name1, R.id.widget_ag_name2)
    private val whenIds = intArrayOf(R.id.widget_ag_when0, R.id.widget_ag_when1, R.id.widget_ag_when2)
    private val daysIds = intArrayOf(R.id.widget_ag_days0, R.id.widget_ag_days1, R.id.widget_ag_days2)

    private val shortAd: DateTimeFormatter = DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH)

    /** How far ahead the agenda looks. Long enough that a quiet stretch of
     *  the year still fills three rows. */
    private const val AGENDA_DAYS = 120

    /**
     * Agenda rows by the placed height (dp). Measured in the debug harness:
     * one row fits Launcher3's 5x2 (~137dp) under the week, two from ~150dp,
     * three on One UI's 240dp. Unknown height: two.
     */
    internal fun rowsFor(heightDp: Int): Int = when {
        heightDp <= 0 -> 2
        heightDp < 156 -> 1
        heightDp < 200 -> 2
        else -> 3
    }

    /** One agenda line: days from today, the day, and the name to show. */
    internal data class Item(val days: Int, val date: BsDate, val name: String)

    /**
     * Today's festival, if it has one, then the next festival days, up to
     * [max]. In English only festivals with a checked English name count,
     * as on the other sizes, so a row never shows a name in Nepali.
     */
    internal fun agenda(today: BsDate, english: Boolean, max: Int): List<Item> {
        // One line per day, so at most two names, each without the almanac's
        // bracketed note ("विश्व अपाङ्ग दिवस (अपाङ्गता भएका …)").
        fun names(info: DayPanchang?): String {
            val majors = WidgetRenderer.majorOnly(info?.festivals ?: return "")
            val shown = if (english) FestivalsEn.forDay(majors).map { FestivalsEn.short(it) } else majors
            return shown.take(2).joinToString(" · ") { it.substringBefore("(").trim() }
        }
        val out = mutableListOf<Item>()
        names(Panchang.forDay(today)).takeIf { it.isNotEmpty() }?.let { out += Item(0, today, it) }
        val start = NepaliCalendar.toGregorian(today)
        for (offset in 1..AGENDA_DAYS) {
            if (out.size >= max) break
            val day = NepaliCalendar.fromGregorian(start.plusDays(offset.toLong()))
            val name = names(Panchang.forDay(day))
            if (name.isNotEmpty()) out += Item(offset, day, name)
        }
        return out
    }

    fun build(context: Context, onClick: PendingIntent?, heightDp: Int): RemoteViews {
        val english = WidgetTheme.isEnglish(context)
        if (english) FestivalsEn.load(context)
        fun num(n: Int) = if (english) n.toString() else NepaliCalendar.toDevanagari(n)
        val months = if (english) FestivalsEn.monthNames else NepaliCalendar.monthNames
        val shortDays = if (english) FestivalsEn.weekdayShort else NepaliCalendar.weekdayShort

        val today = NepaliCalendar.today()
        val todayIndex = NepaliCalendar.weekdayOf(today)
        val views = RemoteViews(context.packageName, R.layout.widget_patro_xl_expanded)
        val paint = WidgetPaint.of(context)

        views.setNepaliText(R.id.widget_month, "${months[today.month]} ${num(today.year)}")
        val ad = NepaliCalendar.toGregorian(today).format(shortAd)
        views.setNepaliText(R.id.widget_ad, "${shortDays[todayIndex]} ${num(today.day)} · $ad")
        paint.text(views, R.id.widget_month, Role.TEXT)
        paint.text(views, R.id.widget_ad, Role.MUTED)

        val week = NepaliCalendar.weekOf(today)
        for (i in 0..6) {
            val day = week[i]
            val info = Panchang.forDay(day)
            val isToday = i == todayIndex
            val off = NepaliCalendar.isWeeklyOff(day) || (info?.isHoliday == true)
            // "Purnima (full moon)" loses its gloss: the cell is ~48dp wide.
            val tithi = info?.tithi?.let { if (english) FestivalsEn.tithi(it).substringBefore(" (") else it } ?: ""
            views.setNepaliText(labelIds[i], shortDays[i])
            views.setNepaliText(dayIds[i], num(day.day))
            views.setNepaliText(tithiIds[i], tithi)
            // The state the off-day colour lists key on (res/color/widget_week_*.xml).
            views.setBoolean(labelIds[i], "setEnabled", !off)
            views.setBoolean(dayIds[i], "setEnabled", !off)
            val festive = info != null && WidgetRenderer.majorOnly(info.festivals).isNotEmpty()
            views.setViewVisibility(dotIds[i], if (festive) View.VISIBLE else View.INVISIBLE)
            views.setInt(
                cellIds[i], "setBackgroundResource",
                when {
                    !isToday -> 0
                    paint.isLegacy -> R.drawable.widget_pill
                    else -> R.drawable.widget_cell
                },
            )
            if (isToday && !paint.isLegacy) {
                paint.tint(views, cellIds[i], Role.HEAD)
                paint.text(views, labelIds[i], Role.ON_HEAD)
                paint.text(views, dayIds[i], Role.ON_HEAD)
                paint.text(views, tithiIds[i], Role.ON_HEAD)
                paint.imageTint(views, dotIds[i], Role.ON_HEAD)
            } else {
                paint.offText(views, labelIds[i], Role.MUTED)
                paint.offText(views, dayIds[i], Role.TEXT)
                paint.text(views, tithiIds[i], Role.MUTED)
                paint.imageTint(views, dotIds[i], Role.ACCENT)
            }
        }

        val rows = rowsFor(heightDp)
        val outOfRange = Panchang.forDay(today) == null && !Panchang.covers(today.year)
        val items = if (outOfRange) emptyList() else agenda(today, english, rows)
        for (r in 0..2) {
            val item = items.getOrNull(r)
            val shown = r < rows && (item != null || (r == 0 && outOfRange))
            views.setViewVisibility(rowIds[r], if (shown) View.VISIBLE else View.GONE)
            if (!shown) continue
            paint.tint(views, rowIds[r], Role.CHIP)
            paint.text(views, nameIds[r], Role.TEXT)
            if (item == null) {
                views.setNepaliText(
                    nameIds[r],
                    if (english) "Update Lekh for this year’s calendar" else "पात्रो अद्यावधिक गर्नुहोस्",
                )
                views.setViewVisibility(whenIds[r], View.GONE)
                views.setViewVisibility(daysIds[r], View.GONE)
                continue
            }
            views.setNepaliText(nameIds[r], item.name)
            val w = NepaliCalendar.weekdayOf(item.date)
            views.setNepaliText(
                whenIds[r],
                if (english) "${FestivalsEn.weekdayShort[w]}, ${FestivalsEn.monthNames[item.date.month]} ${item.date.day}"
                else "${NepaliCalendar.weekdayShort[w]}, ${NepaliCalendar.monthNames[item.date.month]} ${num(item.date.day)}",
            )
            views.setNepaliText(
                daysIds[r],
                when {
                    item.days == 0 -> if (english) "Today" else "आज"
                    item.days == 1 -> if (english) "Tomorrow" else "भोलि"
                    english -> "${item.days} days"
                    else -> "${num(item.days)} दिन"
                },
            )
            paint.text(views, whenIds[r], Role.MUTED)
            // The nearest one is filled, like today's tile; the rest are quiet.
            if (r == 0) {
                paint.tint(views, daysIds[r], Role.HEAD)
                paint.text(views, daysIds[r], Role.ON_HEAD)
            } else {
                paint.tint(views, daysIds[r], Role.TODAY)
                paint.text(views, daysIds[r], Role.TEXT)
            }
        }

        if (onClick != null) views.setOnClickPendingIntent(R.id.widget_root, onClick)
        if (WidgetTheme.useStatic(context)) {
            views.setInt(R.id.widget_root, "setBackgroundResource", R.drawable.widget_background_static)
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            paint.tint(views, R.id.widget_root, Role.SURFACE)
            WidgetTheme.rememberPalette(context)
        }
        return views
    }
}
