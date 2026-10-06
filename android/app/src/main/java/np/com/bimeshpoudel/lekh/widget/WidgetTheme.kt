package np.com.bimeshpoudel.lekh.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.widget.RemoteViews
import np.com.bimeshpoudel.lekh.R

/**
 * Whether the widgets wear the wallpaper's colours or Lekh's own Crimson &
 * Paper, following the app's "Wallpaper colours" setting.
 *
 * The setting lives in the WebView's localStorage, which native code cannot
 * read, so the web side hands it over through DynamicColorPlugin's
 * setWidgetDynamic and it is kept here in SharedPreferences. Default on, the
 * same default the app has.
 *
 * The layouts are written for Material You (their -v31 colour resources are
 * the wallpaper palette), so "off" is applied at draw time by pointing every
 * coloured view at the widget_static_* twins. Those are passed as resource IDs
 * with the API 31 RemoteViews.setColorStateList/setColor overloads, which the
 * launcher resolves when it inflates the widget, against its own
 * configuration — so light and dark mode still flip correctly, the property
 * res/color/widget_day.xml exists to protect. Below Android 12 there is no
 * Material You and nothing to swap.
 */
object WidgetTheme {
    private const val PREFS = "lekh_widget"
    private const val KEY_DYNAMIC = "dynamic"

    fun isDynamic(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_DYNAMIC, true)

    /** Stores the setting and redraws every placed widget if it changed. */
    fun setDynamic(context: Context, dynamic: Boolean) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (prefs.contains(KEY_DYNAMIC) && prefs.getBoolean(KEY_DYNAMIC, true) == dynamic) return
        prefs.edit().putBoolean(KEY_DYNAMIC, dynamic).apply()
        refreshAll(context)
    }

    /** True when the fixed palette has to be applied over the layout's own. */
    fun useStatic(context: Context): Boolean =
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !isDynamic(context)

    /** The week strip's today marker, in whichever palette is in force. */
    fun pill(context: Context): Int =
        if (useStatic(context)) R.drawable.widget_pill_static else R.drawable.widget_pill

    fun applyStatic(views: RemoteViews, layoutRes: Int) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
        /* Only views this layout really has. RemoteViews is meant to skip an
           action whose view is missing, but a widget that fails to draw only
           shows itself on a real home screen ("Can't load widget"), so this
           does not lean on that. Matches the five layouts' XML. */
        val small = layoutRes == R.layout.widget_patro_small
        val wide = layoutRes == R.layout.widget_patro_wide
        val xl = layoutRes == R.layout.widget_patro_xl
        val xlExpanded = layoutRes == R.layout.widget_patro_xl_expanded

        views.setInt(R.id.widget_root, "setBackgroundResource", R.drawable.widget_background_static)
        views.setColorStateList(R.id.widget_day, "setTextColor", R.color.widget_static_day)
        views.setColorStateList(R.id.widget_month, "setTextColor", R.color.widget_static_text)
        views.setColorStateList(R.id.widget_ad, "setTextColor", R.color.widget_static_muted)
        if (small) return

        views.setColorStateList(R.id.widget_weekday, "setTextColor", R.color.widget_static_muted)
        views.setColorStateList(R.id.widget_tithi, "setTextColor", R.color.widget_static_muted)
        views.setColorStateList(R.id.widget_note, "setTextColor", R.color.widget_static_accent)
        if (wide || xl || xlExpanded) {
            views.setColor(R.id.widget_divider1, "setBackgroundColor", R.color.widget_static_border)
        }
        if (xl || xlExpanded) {
            views.setColorStateList(R.id.widget_next, "setTextColor", R.color.widget_static_muted)
        }
        if (xlExpanded) {
            views.setColor(R.id.widget_divider2, "setBackgroundColor", R.color.widget_static_border)
            for (i in 0..6) {
                views.setColorStateList(WidgetRenderer.weekDayIds[i], "setTextColor", R.color.widget_static_week_day)
                views.setColorStateList(WidgetRenderer.weekLabelIds[i], "setTextColor", R.color.widget_static_week_label)
            }
        }
    }

    private fun refreshAll(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        for (provider in listOf(
            LekhWidgetProvider::class.java,
            LekhWidgetSmallProvider::class.java,
            LekhWidgetWideProvider::class.java,
            LekhWidgetXlProvider::class.java,
        )) {
            val ids = manager.getAppWidgetIds(ComponentName(context, provider))
            if (ids.isEmpty()) continue
            context.sendBroadcast(
                Intent(context, provider)
                    .setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
                    .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids),
            )
        }
    }
}
