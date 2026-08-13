package np.com.bimeshpoudel.lekh.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent

/**
 * The widget's one setting: which script it draws in.
 *
 * Stored once for the whole app rather than per widget id. A per-widget setting
 * is what the AppWidget configuration API is shaped for, but "this widget in
 * Nepali and that one in English" is not a thing anybody wants, and it would
 * mean the answer depends on which of six shapes you happened to long-press.
 *
 * The default is Nepali, and must stay Nepali: it is what every already-placed
 * widget shows, and an update that silently switched people's home screens to
 * English would be a bug no matter how nice English mode is.
 */
object WidgetPrefs {

    private const val FILE = "lekh_widget"
    private const val KEY_ENGLISH = "english"

    fun isEnglish(context: Context): Boolean =
        context.getSharedPreferences(FILE, Context.MODE_PRIVATE).getBoolean(KEY_ENGLISH, false)

    fun setEnglish(context: Context, english: Boolean) {
        context.getSharedPreferences(FILE, Context.MODE_PRIVATE)
            .edit().putBoolean(KEY_ENGLISH, english).apply()
    }

    /** Every widget provider this app registers. */
    private val PROVIDERS = listOf(
        LekhWidgetProvider::class.java,
        LekhWidgetSmallProvider::class.java,
        LekhWidgetWideProvider::class.java,
        LekhWidgetLargeProvider::class.java,
        LekhWidgetXlProvider::class.java,
        LekhWidgetXlLargeProvider::class.java,
    )

    /**
     * Redraw everything currently on a home screen.
     *
     * Sending each provider its own APPWIDGET_UPDATE with the ids it actually
     * owns, rather than a bare broadcast: a widget that is not asked by id does
     * not redraw, and the setting would appear not to have worked until the
     * next midnight.
     */
    fun refreshAll(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        for (provider in PROVIDERS) {
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
