package np.com.bimeshpoudel.lekh.widget

import android.app.PendingIntent
import android.content.Context
import android.widget.RemoteViews
import np.com.bimeshpoudel.lekh.R
import java.time.format.DateTimeFormatter

/**
 * Builds the widget's RemoteViews.
 *
 * Split out of LekhWidgetProvider so the debug preview activity can render the
 * exact same thing on screen. A widget is otherwise only visible by adding it
 * to a launcher home screen, which makes it painful to look at while working
 * on it — and "painful to look at" is how a widget ends up shipping with the
 * Devanagari clipped.
 */
object WidgetRenderer {

    private val adFormat: DateTimeFormatter = DateTimeFormatter.ofPattern("d MMM yyyy")

    fun build(context: Context, onClick: PendingIntent? = null): RemoteViews {
        NepaliCalendar.load(context)
        Panchang.load(context)

        val today = NepaliCalendar.today()
        val info = Panchang.forDay(today)
        val weekday = NepaliCalendar.weekdayOf(today)
        val views = RemoteViews(context.packageName, R.layout.widget_patro)

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

        /* One line of context under the date. A festival is what someone
           actually wants from a calendar widget, so it wins; tithi is the
           fallback; and past the tabulated range the widget says so rather
           than looking like a day with nothing on it. */
        val subtitle = when {
            info == null && !Panchang.covers(today.year) -> "पात्रो अद्यावधिक गर्नुहोस्"
            info != null && info.festivals.isNotEmpty() -> info.festivals.first()
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
