package np.com.bimeshpoudel.lekh.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.RemoteViews
import np.com.bimeshpoudel.lekh.R

/**
 * The month widget (1.9.114): the whole month as a patro sheet, with its own
 * previous and next buttons.
 *
 * Which month an instance shows is kept per widget id, as months away from
 * the current one, so two placed month widgets can be paging independently.
 * Tapping the title comes back to this month, and so does the date changing:
 * a sheet left on some other month overnight would read as the wrong today.
 */
class LekhWidgetMonthProvider : BaseLekhWidgetProvider() {
    override val layoutRes = R.layout.widget_patro_month
    override val perInstance = true

    override fun buildFor(context: Context, appWidgetId: Int, options: Bundle, onClick: PendingIntent): RemoteViews =
        MonthRenderer.build(
            context,
            offsetOf(context, appWidgetId),
            onClick,
            MonthRenderer.Nav(
                prev = navIntent(context, appWidgetId, -1),
                next = navIntent(context, appWidgetId, +1),
                today = navIntent(context, appWidgetId, 0),
            ),
        )

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            ACTION_NAV -> {
                val id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
                if (id == AppWidgetManager.INVALID_APPWIDGET_ID) return
                val delta = intent.getIntExtra(EXTRA_DELTA, 0)
                val target = if (delta == 0) 0 else offsetOf(context, id) + delta
                // Never page past the end of the calendar table.
                if (!MonthRenderer.exists(context, target)) return
                prefs(context).edit().putInt(key(id), target).apply()
                render(context, AppWidgetManager.getInstance(context), intArrayOf(id))
                return
            }
            midnightAction(), Intent.ACTION_DATE_CHANGED, Intent.ACTION_TIME_CHANGED, Intent.ACTION_TIMEZONE_CHANGED -> {
                val editor = prefs(context).edit()
                prefs(context).all.keys.filter { it.startsWith(KEY_PREFIX) }.forEach { editor.remove(it) }
                editor.apply()
            }
        }
        super.onReceive(context, intent)
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        super.onDeleted(context, appWidgetIds)
        val editor = prefs(context).edit()
        appWidgetIds.forEach { editor.remove(key(it)) }
        editor.apply()
    }

    private fun navIntent(context: Context, id: Int, delta: Int): PendingIntent =
        PendingIntent.getBroadcast(
            context,
            // One request code per widget and button, or the three buttons
            // (and every placed month widget) would share one PendingIntent.
            id * 3 + delta + 1,
            Intent(context, LekhWidgetMonthProvider::class.java)
                .setAction(ACTION_NAV)
                .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
                .putExtra(EXTRA_DELTA, delta),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

    private companion object {
        const val ACTION_NAV = "np.com.bimeshpoudel.lekh.widget.MONTH_NAV"
        const val EXTRA_DELTA = "delta"
        const val KEY_PREFIX = "month_offset_"

        fun prefs(context: Context) = context.getSharedPreferences("lekh_widget", Context.MODE_PRIVATE)
        fun key(id: Int) = KEY_PREFIX + id
        fun offsetOf(context: Context, id: Int) = prefs(context).getInt(key(id), 0)
    }
}
