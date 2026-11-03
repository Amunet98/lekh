package np.com.bimeshpoudel.lekh.widget

import android.app.PendingIntent
import android.content.Context
import android.view.View
import android.widget.RemoteViews
import np.com.bimeshpoudel.lekh.R
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * The month widget (1.9.114): a whole Bikram Sambat month as a patro sheet.
 *
 * [offset] is months away from the current one, set by the widget's own
 * previous and next buttons (see LekhWidgetMonthProvider). Today is marked
 * only in the month it falls in.
 *
 * Each day is its own small RemoteViews (widget_month_cell) added to a row
 * with addView, so the cell is defined once instead of forty-two times in
 * XML. Rows are cleared first: a widget redrawn without being reinflated
 * keeps the children added last time otherwise.
 */
object MonthRenderer {

    class Nav(val prev: PendingIntent, val next: PendingIntent, val today: PendingIntent)

    private val rowIds = intArrayOf(
        R.id.widget_m_row0, R.id.widget_m_row1, R.id.widget_m_row2,
        R.id.widget_m_row3, R.id.widget_m_row4, R.id.widget_m_row5,
    )
    private val headIds = intArrayOf(
        R.id.widget_m_h0, R.id.widget_m_h1, R.id.widget_m_h2, R.id.widget_m_h3,
        R.id.widget_m_h4, R.id.widget_m_h5, R.id.widget_m_h6,
    )

    private val monthOnly: DateTimeFormatter = DateTimeFormatter.ofPattern("MMM", Locale.ENGLISH)
    private val monthYear: DateTimeFormatter = DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH)

    /** The BS (year, month) [offset] months from [from]'s, month 0-based. */
    fun shift(from: BsDate, offset: Int): kotlin.Pair<Int, Int> {
        val index = from.year * 12 + from.month + offset
        return Math.floorDiv(index, 12) to Math.floorMod(index, 12)
    }

    /** Whether the calendar table has the month [offset] months from today. */
    fun exists(context: Context, offset: Int): Boolean {
        NepaliCalendar.load(context)
        val (y, m) = shift(NepaliCalendar.today(), offset)
        return NepaliCalendar.monthLength(y, m) != null
    }

    fun build(context: Context, offset: Int, onClick: PendingIntent?, nav: Nav?): RemoteViews {
        NepaliCalendar.load(context)
        Panchang.load(context)
        val english = WidgetTheme.isEnglish(context)
        if (english) FestivalsEn.load(context)
        fun num(n: Int) = if (english) n.toString() else NepaliCalendar.toDevanagari(n)

        val paint = WidgetPaint.of(context)
        val today = NepaliCalendar.today()
        var (year, month) = shift(today, offset)
        var length = NepaliCalendar.monthLength(year, month)
        if (length == null) {
            // Off the end of the table (an old offset, or a phone with an old
            // calendar): show this month rather than nothing.
            year = today.year
            month = today.month
            length = NepaliCalendar.monthLength(year, month) ?: 30
        }

        val views = RemoteViews(context.packageName, R.layout.widget_patro_month)
        val months = if (english) FestivalsEn.monthNames else NepaliCalendar.monthNames
        views.setTextViewText(R.id.widget_m_title, "${months[month]} ${num(year)}")

        val first = BsDate(year, month, 1)
        val start = NepaliCalendar.toGregorian(first)
        val end = NepaliCalendar.toGregorian(BsDate(year, month, length))
        views.setTextViewText(
            R.id.widget_m_sub,
            if (start.year == end.year) "${start.format(monthOnly)}–${end.format(monthYear)}"
            else "${start.format(monthYear)} – ${end.format(monthYear)}",
        )

        val firstWeekday = NepaliCalendar.weekdayOf(first)
        val labels = if (english) FestivalsEn.weekdayShort else NepaliCalendar.weekdayShort
        for (col in 0..6) {
            views.setTextViewText(headIds[col], labels[col])
            // A weekday column is a day off if its first date in this month
            // is one; the Sunday rule is dated (see NepaliCalendar).
            val sample = BsDate(year, month, 1 + Math.floorMod(col - firstWeekday, 7))
            views.setBoolean(headIds[col], "setEnabled", !NepaliCalendar.isWeeklyOff(sample))
            paint.offText(views, headIds[col], Role.MUTED)
        }

        val rows = (firstWeekday + length + 6) / 7
        val isThisMonth = year == today.year && month == today.month
        for (r in 0..5) {
            views.removeAllViews(rowIds[r])
            views.setViewVisibility(rowIds[r], if (r < rows) View.VISIBLE else View.GONE)
            if (r >= rows) continue
            for (col in 0..6) {
                val day = r * 7 + col - firstWeekday + 1
                views.addView(rowIds[r], cell(context, paint, year, month, day, length, isThisMonth && day == today.day, english))
            }
        }

        // The footer: today's tithi and paksha, and today's festival or the
        // next one, whichever month is on show.
        val info = Panchang.forDay(today)
        val tithi = info?.tithi?.let { if (english) FestivalsEn.tithi(it) else it } ?: ""
        val age = MoonPhase.age(today)
        val paksha = age?.let { MoonPhase.paksha(it, english) }
        views.setTextViewText(R.id.widget_tithi, listOfNotNull(tithi.ifEmpty { null }, paksha).joinToString(" · "))
        WidgetRenderer.drawMoon(context, views, today, tithi.isNotEmpty(), paint)

        val todays = info?.festivals?.let { WidgetRenderer.majorOnly(it) }
            ?.let { if (english) FestivalsEn.forDay(it).map(FestivalsEn::short) else it }
            ?: emptyList()
        val note = if (todays.isNotEmpty()) {
            (if (english) "Today · " else "आज · ") + todays.joinToString(" · ")
        } else {
            WidgetRenderer.nextFestival(today, english)?.let { (days, name) ->
                val shown = if (english) FestivalsEn.short(name) else name
                when {
                    english && days == 1 -> "$shown tomorrow"
                    english -> "$shown in $days days"
                    days == 1 -> "$shown भोलि"
                    else -> "$shown ${num(days)} दिनमा"
                }
            } ?: ""
        }
        views.setTextViewText(R.id.widget_note, note)

        if (onClick != null) views.setOnClickPendingIntent(R.id.widget_root, onClick)
        if (nav != null) {
            views.setOnClickPendingIntent(R.id.widget_m_prev, nav.prev)
            views.setOnClickPendingIntent(R.id.widget_m_next, nav.next)
            views.setOnClickPendingIntent(R.id.widget_m_title_box, nav.today)
        }

        if (WidgetTheme.useStatic(context)) {
            views.setInt(R.id.widget_root, "setBackgroundResource", R.drawable.widget_background_static)
        } else {
            paint.tint(views, R.id.widget_root, Role.SURFACE)
        }
        paint.text(views, R.id.widget_m_title, Role.TEXT)
        paint.text(views, R.id.widget_m_sub, Role.MUTED)
        for (id in intArrayOf(R.id.widget_m_prev, R.id.widget_m_next)) {
            paint.tint(views, id, Role.TODAY)
            paint.imageTint(views, id, Role.TEXT)
        }
        paint.line(views, R.id.widget_divider1)
        paint.text(views, R.id.widget_tithi, Role.MUTED)
        paint.text(views, R.id.widget_note, Role.ACCENT)
        if (paint.isDynamic) WidgetTheme.rememberPalette(context)
        return views
    }

    private fun cell(
        context: Context,
        paint: WidgetPaint,
        year: Int,
        month: Int,
        day: Int,
        length: Int,
        isToday: Boolean,
        english: Boolean,
    ): RemoteViews {
        val cell = RemoteViews(context.packageName, R.layout.widget_month_cell)
        if (day < 1 || day > length) {
            cell.setTextViewText(R.id.widget_mc_bs, "")
            cell.setTextViewText(R.id.widget_mc_ad, "")
            return cell
        }
        val date = BsDate(year, month, day)
        val info = Panchang.forDay(date)
        val off = NepaliCalendar.isWeeklyOff(date) || info?.isHoliday == true
        cell.setTextViewText(R.id.widget_mc_bs, if (english) day.toString() else NepaliCalendar.toDevanagari(day))
        cell.setTextViewText(R.id.widget_mc_ad, NepaliCalendar.toGregorian(date).dayOfMonth.toString())
        cell.setBoolean(R.id.widget_mc_bs, "setEnabled", !off)
        cell.setBoolean(R.id.widget_mc_ad, "setEnabled", !off)
        paint.offText(cell, R.id.widget_mc_ad, Role.MUTED)

        if (isToday) {
            cell.setInt(R.id.widget_mc_bs, "setBackgroundResource", R.drawable.widget_month_today)
            if (paint.isLegacy) {
                // Below API 31 there is no resource overload; on-head is white
                // in both fixed palettes, so a resolved colour is safe here.
                cell.setTextColor(R.id.widget_mc_bs, context.getColor(R.color.widget_on_head))
            } else {
                paint.tint(cell, R.id.widget_mc_bs, Role.HEAD)
                paint.text(cell, R.id.widget_mc_bs, Role.ON_HEAD)
            }
        } else {
            paint.offText(cell, R.id.widget_mc_bs, Role.TEXT)
        }

        val festive = info != null && WidgetRenderer.majorOnly(info.festivals).isNotEmpty()
        if (festive) {
            cell.setViewVisibility(R.id.widget_mc_dot, View.VISIBLE)
            paint.imageTint(cell, R.id.widget_mc_dot, Role.ACCENT)
        }
        return cell
    }
}
