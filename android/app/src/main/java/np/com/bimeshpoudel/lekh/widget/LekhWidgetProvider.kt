package np.com.bimeshpoudel.lekh.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId

/**
 * The home-screen widget: today's Bikram Sambat date, weekday, tithi and
 * whatever festival falls on it.
 *
 * Tapping it opens the Patro tab of the web app.
 *
 * REFRESHING AT MIDNIGHT
 *
 * `updatePeriodMillis` in the widget XML cannot do this. Android clamps it to
 * a minimum of 30 minutes and, more importantly, fires it on its own schedule
 * rather than on a wall-clock boundary — so a date widget driven by it shows
 * yesterday's date for up to half an hour after midnight, which is the one
 * moment a calendar widget must be right. An exact alarm scheduled for the
 * next local midnight is the only way to flip the date when the date actually
 * flips; each firing schedules the following one.
 */
class LekhWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        for (id in ids) render(context, manager, id)
        scheduleMidnight(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        // Fired by our own midnight alarm, and by the system on time/timezone
        // changes — all three mean "the date may have moved, redraw".
        if (intent.action == ACTION_MIDNIGHT ||
            intent.action == Intent.ACTION_TIME_CHANGED ||
            intent.action == Intent.ACTION_TIMEZONE_CHANGED ||
            intent.action == Intent.ACTION_DATE_CHANGED
        ) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, LekhWidgetProvider::class.java))
            for (id in ids) render(context, manager, id)
            scheduleMidnight(context)
        }
    }

    override fun onDisabled(context: Context) {
        // Last widget removed — stop waking the device for it.
        alarmManager(context).cancel(midnightIntent(context))
    }

    private fun render(context: Context, manager: AppWidgetManager, id: Int) {
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

        val gregorian = NepaliCalendar.toGregorian(today)
        views.setTextViewText(R.id.widget_ad, gregorian.format(AD_FORMAT))

        /* One line of context under the date. A festival is what someone
           actually wants from a calendar widget, so it wins; tithi is the
           fallback; and if the year is past the tabulated range the widget
           says so rather than looking like a day with nothing on it. */
        val subtitle = when {
            info == null && !Panchang.covers(today.year) ->
                "पात्रो अद्यावधिक गर्नुहोस्" // "update the app for this year"
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

        views.setOnClickPendingIntent(R.id.widget_root, openPatro(context))
        manager.updateAppWidget(id, views)
    }

    private fun openPatro(context: Context): PendingIntent {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://lekh-gamma.vercel.app/?tab=calendar"))
        return PendingIntent.getActivity(
            context,
            0,
            intent,
            // FLAG_IMMUTABLE is required from Android 12 (S); without it the
            // PendingIntent constructor throws at runtime.
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun alarmManager(context: Context) =
        context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    private fun midnightIntent(context: Context): PendingIntent {
        val intent = Intent(context, LekhWidgetProvider::class.java).setAction(ACTION_MIDNIGHT)
        return PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun scheduleMidnight(context: Context) {
        val nextMidnight = LocalDate.now()
            .plusDays(1)
            .atTime(LocalTime.MIDNIGHT)
            .atZone(ZoneId.systemDefault())
            .toInstant()
            .toEpochMilli()

        /* setExact, not setExactAndAllowWhileIdle: this is cosmetic, so it is
           not worth an exact-alarm permission or waking a dozing device. If
           Doze delays it, the next interaction redraws anyway. */
        alarmManager(context).setExact(AlarmManager.RTC, nextMidnight, midnightIntent(context))
    }

    companion object {
        private const val ACTION_MIDNIGHT = "np.com.bimeshpoudel.lekh.widget.MIDNIGHT"
        private val AD_FORMAT: java.time.format.DateTimeFormatter =
            java.time.format.DateTimeFormatter.ofPattern("d MMM yyyy")
    }
}
