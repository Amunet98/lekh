package np.com.bimeshpoudel.lekh.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId

/**
 * Everything the widgets share; the subclasses differ only in which layout
 * they draw.
 *
 * There are four separate providers rather than one resizable widget because
 * that is what shows up as four entries in the launcher's widget picker.
 * A single resizable widget is one entry that most people never think to drag
 * a corner on, and the four shapes want genuinely different layouts anyway —
 * a 2x1 has no room for a festival name, a 5x1 has room for what's next.
 *
 * The 5x1 is offered on four-column launchers too — measured on one: it
 * lists it and clamps it to four cells rather than hiding it. 4x1 still
 * exists because on that grid it is the shape that fits exactly, and 5x1 is
 * the denser alternative.
 *
 * EXPANDING ON RESIZE
 *
 * 4x1 and 5x1 both declare vertical resizeMode. Dragged tall enough, they
 * switch to a second, denser layout instead of just centering the same row
 * in more space — see [expandedLayoutRes] and [layoutFor]. This is what
 * replaced the old dedicated 4x2/5x2 providers: those left a bare column of
 * wallpaper on a launcher whose grid was wider than four or five columns,
 * because a fixed-size widget only ever claims exactly the columns it
 * declares. Reading the *actual* placed size at draw time and choosing the
 * layout from that has no such gap.
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

    private companion object {
        const val EXPAND_MIN_HEIGHT_DP = 90
    }

    /** The layout this size draws. */
    protected abstract val layoutRes: Int

    /**
     * What to draw instead of [layoutRes] once a placed instance has been
     * dragged tall enough — null for sizes with nothing to expand into.
     *
     * Set per instance, not per provider: two placed widgets of the same
     * size can be resized to different heights independently, so [render]
     * looks this up per id via [AppWidgetManager.getAppWidgetOptions] rather
     * than building one RemoteViews for the whole batch.
     */
    protected open val expandedLayoutRes: Int? = null

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        render(context, manager, ids)
        scheduleMidnight(context)
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        manager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle,
    ) {
        super.onAppWidgetOptionsChanged(context, manager, appWidgetId, newOptions)
        if (expandedLayoutRes == null) return
        manager.updateAppWidget(
            appWidgetId,
            WidgetRenderer.build(context, layoutFor(newOptions), openPatro(context)),
        )
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
            render(context, manager, ids)
            scheduleMidnight(context)
        }
    }

    override fun onDisabled(context: Context) {
        // Last widget of this size removed — stop waking the device for it.
        alarmManager(context).cancel(midnightIntent(context))
    }

    /* Placed instances of a size with nothing to expand into render
       identically — same date, same layout, same click target — so this
       builds the RemoteViews and its PendingIntent once and hands them to
       AppWidgetManager's batch overload, rather than rebuilding both per id.
       A size with an expandedLayoutRes can have differently-sized instances,
       so those go one at a time instead. */
    private fun render(context: Context, manager: AppWidgetManager, ids: IntArray) {
        if (ids.isEmpty()) return
        if (expandedLayoutRes == null) {
            manager.updateAppWidget(ids, WidgetRenderer.build(context, layoutRes, openPatro(context)))
            return
        }
        val onClick = openPatro(context)
        for (id in ids) {
            manager.updateAppWidget(
                id,
                WidgetRenderer.build(context, layoutFor(manager.getAppWidgetOptions(id)), onClick),
            )
        }
    }

    /**
     * Compact by default; the expanded layout once the host reports enough
     * height for it.
     *
     * OPTION_APPWIDGET_MAX_HEIGHT is checked over MIN_HEIGHT because a
     * portrait-locked launcher reports the same value in both, but a launcher
     * that allows landscape reports the taller one there — and this widget
     * should expand if it has the room in either orientation.
     *
     * The threshold sits between this provider's compact minHeight (40dp) and
     * the old dedicated tall providers' minHeight (110dp): comfortably past
     * "barely resized" but well short of "deliberately dragged taller".
     */
    private fun layoutFor(options: Bundle): Int {
        val expanded = expandedLayoutRes ?: return layoutRes
        val height = maxOf(
            options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0),
            options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0),
        )
        return if (height >= EXPAND_MIN_HEIGHT_DP) expanded else layoutRes
    }

    // Explicit intent naming MainActivity directly, not a bare ACTION_VIEW
    // https intent — that would depend on Android App Links/Digital Asset
    // Links verification succeeding to resolve to the app instead of a
    // browser tab, the same verification that has already failed silently
    // once for this project (see assetlinks.json's history). MainActivity
    // reads the data URI itself and points the WebView at it.
    private fun openPatro(context: Context): PendingIntent =
        PendingIntent.getActivity(
            context,
            requestCode(),
            Intent(Intent.ACTION_VIEW, Uri.parse("https://lekh-gamma.vercel.app/?tab=calendar"))
                .setClassName(context, "np.com.bimeshpoudel.lekh.MainActivity"),
            // FLAG_IMMUTABLE is required from Android 12 (S); without it the
            // PendingIntent constructor throws at runtime.
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

    private fun alarmManager(context: Context) =
        context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    /* Per-subclass action and request code. Without them the four providers
       would share one PendingIntent: whichever registered last would own the
       alarm, and removing that size would cancel the other sizes' refresh
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

    /**
     * Ask to be woken shortly after the next local midnight.
     *
     * NOT setExact, and this crashed a real phone before it was inexact.
     * From Android 12 an app targeting S+ must hold SCHEDULE_EXACT_ALARM to
     * call setExact(), and on 13+ that permission is not granted by default —
     * measured on a live device: `canScheduleExactAlarms=false` and setExact
     * throwing SecurityException. Since this runs inside onUpdate, the throw
     * took the whole process down the moment a widget was placed on a home
     * screen: "Lekh has stopped".
     *
     * setWindow is inexact and needs no permission. A calendar widget does not
     * need millisecond precision at midnight, and it is not the only signal
     * anyway — the manifest also listens for ACTION_DATE_CHANGED, which the
     * system broadcasts when the date actually rolls. This alarm is the belt
     * to that braces, with a ten-minute window so the OS can batch it.
     *
     * The whole thing is wrapped regardless. A widget must never be able to
     * crash the app it belongs to over a cosmetic refresh; the worst case
     * without an alarm is a date that updates on the next interaction.
     */
    private fun scheduleMidnight(context: Context) {
        try {
            val nextMidnight = LocalDate.now()
                .plusDays(1)
                .atTime(LocalTime.MIDNIGHT)
                .atZone(ZoneId.systemDefault())
                .toInstant()
                .toEpochMilli()

            alarmManager(context).setWindow(
                AlarmManager.RTC,
                nextMidnight,
                10 * 60 * 1000L,
                midnightIntent(context),
            )
        } catch (_: Throwable) {
            // No alarm this time; ACTION_DATE_CHANGED and the next interaction
            // both still redraw.
        }
    }
}
