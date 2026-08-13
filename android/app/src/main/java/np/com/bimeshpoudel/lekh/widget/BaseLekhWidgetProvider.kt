package np.com.bimeshpoudel.lekh.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId

/**
 * Everything the widgets share; the subclasses differ only in which layout
 * they draw.
 *
 * There are three separate providers rather than one resizable widget because
 * that is what shows up as three entries in the launcher's widget picker.
 * A single resizable widget is one entry that most people never think to drag
 * a corner on, and the three shapes want genuinely different layouts anyway —
 * a 2x1 has no room for a festival name, a 4x2 has room for several.
 *
 * REFRESHING AT MIDNIGHT
 *
 * `updatePeriodMillis` cannot do this. Android clamps it to a 30-minute
 * minimum and fires it on its own schedule rather than on a wall-clock
 * boundary, so a date widget driven by it shows yesterday's date for up to
 * half an hour after midnight — the one moment it must be right. An exact
 * alarm for the next local midnight is the only way to flip the date when the
 * date actually flips; each firing schedules the following one.
 */
abstract class BaseLekhWidgetProvider : AppWidgetProvider() {

    /** The layout this size draws. */
    protected abstract val layoutRes: Int

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        for (id in ids) render(context, manager, id)
        scheduleMidnight(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        // Our own midnight alarm, plus the system's time/timezone changes —
        // all of them mean "the date may have moved, redraw".
        if (intent.action == midnightAction() ||
            intent.action == Intent.ACTION_TIME_CHANGED ||
            intent.action == Intent.ACTION_TIMEZONE_CHANGED ||
            intent.action == Intent.ACTION_DATE_CHANGED
        ) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, javaClass))
            for (id in ids) render(context, manager, id)
            scheduleMidnight(context)
        }
    }

    override fun onDisabled(context: Context) {
        // Last widget of this size removed — stop waking the device for it.
        alarmManager(context).cancel(midnightIntent(context))
    }

    private fun render(context: Context, manager: AppWidgetManager, id: Int) {
        manager.updateAppWidget(id, WidgetRenderer.build(context, layoutRes, openPatro(context)))
    }

    private fun openPatro(context: Context): PendingIntent =
        PendingIntent.getActivity(
            context,
            requestCode(),
            Intent(Intent.ACTION_VIEW, Uri.parse("https://lekh-gamma.vercel.app/?tab=calendar")),
            // FLAG_IMMUTABLE is required from Android 12 (S); without it the
            // PendingIntent constructor throws at runtime.
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

    private fun alarmManager(context: Context) =
        context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    /* Per-subclass action and request code. Without them the three providers
       would share one PendingIntent: whichever registered last would own the
       alarm, and removing that size would cancel the other two sizes' refresh
       as well. */
    private fun midnightAction() = "np.com.bimeshpoudel.lekh.widget.MIDNIGHT.${javaClass.simpleName}"

    private fun requestCode() = javaClass.name.hashCode()

    private fun midnightIntent(context: Context): PendingIntent =
        PendingIntent.getBroadcast(
            context,
            requestCode(),
            Intent(context, javaClass).setAction(midnightAction()),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

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
}
