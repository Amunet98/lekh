package np.com.bimeshpoudel.lekh.widget

import android.app.PendingIntent
import android.content.Context
import android.widget.RemoteViews
import np.com.bimeshpoudel.lekh.R
import java.time.format.DateTimeFormatter

/**
 * Builds the widget's RemoteViews for a given layout.
 *
 * All three layouts declare the same view ids, and each hides the ones its
 * shape has no room for with `visibility="gone"`. That keeps this one function
 * able to populate any of them — RemoteViews resolves ids inside its own
 * layout, and writing to a hidden view is harmless. The alternative, branching
 * per size here, puts the decision about what fits in the code instead of in
 * the layout that actually knows.
 *
 * Split out of the provider so the debug preview activity renders the exact
 * same thing on screen. A widget is otherwise only visible by adding it to a
 * launcher home screen, which is awkward to automate and worse to iterate on —
 * and "awkward to look at" is how a widget ships with the Devanagari clipped.
 */
object WidgetRenderer {

    private val adFormat: DateTimeFormatter = DateTimeFormatter.ofPattern("d MMM yyyy")

    /** Every layout this renderer can populate, largest first. */
    val layouts = intArrayOf(
        R.layout.widget_patro_large,
        R.layout.widget_patro,
        R.layout.widget_patro_small,
    )

    fun build(
        context: Context,
        layoutRes: Int = R.layout.widget_patro,
        onClick: PendingIntent? = null,
    ): RemoteViews {
        NepaliCalendar.load(context)
        Panchang.load(context)

        val today = NepaliCalendar.today()
        val info = Panchang.forDay(today)
        val weekday = NepaliCalendar.weekdayOf(today)
        val views = RemoteViews(context.packageName, layoutRes)

        views.setTextViewText(R.id.widget_day, NepaliCalendar.toDevanagari(today.day))
        views.setTextViewText(
            R.id.widget_month,
            "${NepaliCalendar.monthNames[today.month]} ${NepaliCalendar.toDevanagari(today.year)}",
        )
        views.setTextViewText(R.id.widget_weekday, NepaliCalendar.weekdayNames[weekday])
        views.setTextViewText(
            R.id.widget_ad,
            NepaliCalendar.toGregorian(today).format(adFormat),
        )
        views.setTextViewText(R.id.widget_tithi, info?.tithi ?: "")

        /* The festival line. A festival is what someone actually wants from a
           calendar widget, so it wins; tithi is the fallback on the sizes with
           no separate tithi row; and past the tabulated range the widget says
           so rather than looking like a day with nothing on it. */
        val subtitle = when {
            info == null && !Panchang.covers(today.year) -> "पात्रो अद्यावधिक गर्नुहोस्"
            info != null && info.festivals.isNotEmpty() -> info.festivals.joinToString(" · ")
            info != null && info.tithi.isNotEmpty() -> info.tithi
            else -> ""
        }
        views.setTextViewText(R.id.widget_note, subtitle)

        // Holidays and weekly days off share one accent, as in the web app.
        val isOff = NepaliCalendar.isWeeklyOff(today) || (info?.isHoliday == true)
        views.setTextColor(
            R.id.widget_day,
            context.getColor(if (isOff) R.color.widget_accent else R.color.widget_text),
        )

        if (onClick != null) views.setOnClickPendingIntent(R.id.widget_root, onClick)
        return views
    }
}
