package np.com.bimeshpoudel.lekh.widget

import android.app.PendingIntent
import android.content.Context
import android.widget.RemoteViews
import np.com.bimeshpoudel.lekh.R
import java.time.format.DateTimeFormatter

/**
 * Builds the widget's RemoteViews for a given layout.
 *
 * All four layouts declare the same view ids, and each hides the ones its shape
 * has no room for with `visibility="gone"`. That keeps this one function able
 * to populate any of them — RemoteViews resolves ids inside its own layout,
 * and writing to a hidden view is harmless. The alternative, branching per
 * size here, puts the decision about what fits in the code instead of in the
 * layout that actually knows.
 *
 * Split out of the provider so the debug preview activity renders the exact
 * same thing on screen. A widget is otherwise only visible by adding it to a
 * launcher home screen, which is awkward to automate and worse to iterate on —
 * and "awkward to look at" is how a widget ships with the Devanagari clipped.
 */
object WidgetRenderer {

    private val adFormat: DateTimeFormatter = DateTimeFormatter.ofPattern("d MMM yyyy")

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

        // Only the 5x1 has a widget_next row (see the XML: widget_next ships
        // visibility="gone" and empty text everywhere else). Computing
        // Panchang.upcoming()'s 60-day walk for a size that cannot show it is
        // pure waste.
        val showsUpcoming = layoutRes == R.layout.widget_patro_xl

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

        /* What is coming. Only the 5x1 has a row for this; on every other
           size the view is gone and the text goes nowhere. */
        if (showsUpcoming) {
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
        }

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

        if (onClick != null) views.setOnClickPendingIntent(R.id.widget_root, onClick)
        return views
    }
}
