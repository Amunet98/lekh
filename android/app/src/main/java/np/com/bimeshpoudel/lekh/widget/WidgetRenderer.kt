package np.com.bimeshpoudel.lekh.widget

import android.app.PendingIntent
import android.content.Context
import android.widget.RemoteViews
import np.com.bimeshpoudel.lekh.R
import java.time.format.DateTimeFormatter

/**
 * Builds the widget's RemoteViews for a given layout.
 *
 * All six layouts declare the same view ids, and each hides the ones its shape
 * has no room for with `visibility="gone"`. That keeps this one function able
 * to populate any of them — RemoteViews resolves ids inside its own layout,
 * and writing to a hidden view is harmless. The alternative, branching per
 * size here, puts the decision about what fits in the code instead of in the
 * layout that actually knows.
 *
 * The week strip is the one exception: its ids exist only in the 5x2 layout.
 * That is still safe — every RemoteViews action starts with a findViewById and
 * returns quietly when the id is not in the layout it was applied to — but it
 * is the reason the strip is written last and in its own block rather than
 * mixed in with the fields every size shares.
 *
 * Split out of the provider so the debug preview activity renders the exact
 * same thing on screen. A widget is otherwise only visible by adding it to a
 * launcher home screen, which is awkward to automate and worse to iterate on —
 * and "awkward to look at" is how a widget ships with the Devanagari clipped.
 */
object WidgetRenderer {

    private val adFormat: DateTimeFormatter = DateTimeFormatter.ofPattern("d MMM yyyy")

    private val weekDayIds = intArrayOf(
        R.id.widget_week_d0, R.id.widget_week_d1, R.id.widget_week_d2, R.id.widget_week_d3,
        R.id.widget_week_d4, R.id.widget_week_d5, R.id.widget_week_d6,
    )
    private val weekLabelIds = intArrayOf(
        R.id.widget_week_l0, R.id.widget_week_l1, R.id.widget_week_l2, R.id.widget_week_l3,
        R.id.widget_week_l4, R.id.widget_week_l5, R.id.widget_week_l6,
    )
    private val weekCellIds = intArrayOf(
        R.id.widget_week_c0, R.id.widget_week_c1, R.id.widget_week_c2, R.id.widget_week_c3,
        R.id.widget_week_c4, R.id.widget_week_c5, R.id.widget_week_c6,
    )

    private fun num(en: Boolean, value: Int) =
        if (en) Roman.digits(value) else NepaliCalendar.toDevanagari(value)

    private fun monthName(en: Boolean, month: Int) =
        if (en) Roman.monthNames[month] else NepaliCalendar.monthNames[month]

    fun build(
        context: Context,
        layoutRes: Int = R.layout.widget_patro,
        onClick: PendingIntent? = null,
    ): RemoteViews {
        NepaliCalendar.load(context)
        Panchang.load(context)

        val en = WidgetPrefs.isEnglish(context)
        val today = NepaliCalendar.today()
        val info = Panchang.forDay(today)
        val weekday = NepaliCalendar.weekdayOf(today)
        val views = RemoteViews(context.packageName, layoutRes)

        views.setTextViewText(R.id.widget_day, num(en, today.day))
        views.setTextViewText(
            R.id.widget_month,
            "${monthName(en, today.month)} ${num(en, today.year)}",
        )
        views.setTextViewText(
            R.id.widget_weekday,
            if (en) Roman.weekdayNames[weekday] else NepaliCalendar.weekdayNames[weekday],
        )
        views.setTextViewText(
            R.id.widget_ad,
            NepaliCalendar.toGregorian(today).format(adFormat),
        )
        views.setTextViewText(
            R.id.widget_tithi,
            info?.tithi?.let { if (en) Roman.tithi(it) else it } ?: "",
        )

        /* The festival line. A festival is what someone actually wants from a
           calendar widget, so it wins; tithi is the fallback on the sizes with
           no separate tithi row; and past the tabulated range the widget says
           so rather than looking like a day with nothing on it. */
        val subtitle = when {
            info == null && !Panchang.covers(today.year) ->
                if (en) "Update Lekh for new dates" else "पात्रो अद्यावधिक गर्नुहोस्"
            info != null && info.festivals.isNotEmpty() ->
                info.festivals.joinToString(" · ") { if (en) Roman.festival(it) else it }
            info != null && info.tithi.isNotEmpty() ->
                if (en) Roman.tithi(info.tithi) else info.tithi
            else -> ""
        }
        views.setTextViewText(R.id.widget_note, subtitle)

        /* What is coming. Only the 5x1 and 5x2 have a row for this; on every
           other size the view is gone and the text goes nowhere. */
        val upcoming = Panchang.upcoming(today)
        views.setTextViewText(
            R.id.widget_next,
            if (upcoming == null) "" else {
                val (days, next) = upcoming
                val name = next.festivals.first()
                if (en) {
                    "Next · ${Roman.festival(name)} · ${if (days == 1) "tomorrow" else "in $days days"}"
                } else {
                    val away =
                        if (days == 1) "भोलि" else "${NepaliCalendar.toDevanagari(days)} दिनमा"
                    "आगामी · $name · $away"
                }
            },
        )

        /* Holidays and weekly days off share one accent, as in the web app.
         *
         * Driven by a selection STATE, not a colour. The colour itself lives in
         * res/color/widget_day.xml and is named by the layout, so the launcher
         * resolves it against its own theme every time it inflates.
         *
         * This replaces a context.getColor() call, which resolved against *our*
         * process's configuration rather than the launcher's: a widget placed
         * while the phone was light kept a near-black date after the phone went
         * dark, invisible on the dark surface, and the baked value survived a
         * redraw. Every other colour in the widget comes from the layout and was
         * always correct, which is exactly why this one was hard to spot.
         *
         * setEnabled is @RemotableViewMethod on View and always has been, so
         * this needs no API-level branch — one mechanism from Android 8 to 16.
         */
        val isOff = NepaliCalendar.isWeeklyOff(today) || (info?.isHoliday == true)
        views.setBoolean(R.id.widget_day, "setEnabled", !isOff)

        renderWeek(views, today, en)

        if (onClick != null) views.setOnClickPendingIntent(R.id.widget_root, onClick)
        return views
    }

    /**
     * The 5x2 week strip: Sunday to Saturday around [today], today marked.
     *
     * The marker is a background applied through setInt rather than a
     * visibility toggle on seven pre-placed shapes, because which cell is today
     * changes daily and there is no layout answer to that. `setBackgroundResource`
     * is one of the @RemotableViewMethod methods RemoteViews will call by name;
     * the six other cells are cleared with 0, which is "no background" — not
     * doing that leaves yesterday's marker behind when the widget redraws
     * across midnight without being reinflated.
     */
    private fun renderWeek(views: RemoteViews, today: BsDate, en: Boolean) {
        val week = NepaliCalendar.weekOf(today)

        for (i in 0..6) {
            val day = week[i]
            // A day off is accented in the strip too, so Saturday and Sunday read
            // as the weekend at a glance rather than needing to be counted to.
            // Set as a state, not a colour, for the same reason as the date above:
            // res/color/widget_week_*.xml is resolved by the launcher, a colour
            // resolved here would be resolved against the wrong configuration.
            val off = NepaliCalendar.isWeeklyOff(day) || (Panchang.forDay(day)?.isHoliday == true)
            views.setTextViewText(weekDayIds[i], num(en, day.day))
            views.setBoolean(weekDayIds[i], "setEnabled", !off)
            views.setBoolean(weekLabelIds[i], "setEnabled", !off)
            // The weekday letters are in the layout as Devanagari, so English
            // mode has to overwrite them; Nepali mode rewrites the same value
            // rather than branching, which keeps the two paths identical.
            views.setTextViewText(
                weekLabelIds[i],
                if (en) Roman.weekdayShort[i] else NepaliCalendar.weekdayShort[i],
            )
            views.setInt(
                weekCellIds[i],
                "setBackgroundResource",
                if (i == NepaliCalendar.weekdayOf(today)) R.drawable.widget_pill else 0,
            )
        }
    }
}
