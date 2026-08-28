package np.com.bimeshpoudel.lekh.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle

/**
 * The widget's configure activity: exists only to satisfy Android 11 and
 * older, which require a declared `configure` activity before a widget can
 * be placed at all (`widgetFeatures` — the way newer Android skips this
 * screen when there is nothing to ask — does not exist before API 31).
 *
 * There used to be a real question here (Nepali or English), removed along
 * with the rest of the widget's English mode — see [WidgetRenderer]'s doc
 * comment for why. With nothing left to ask, this just confirms placement
 * immediately and finishes.
 *
 * A configuration activity is launched *before* the widget exists, and the
 * launcher only commits it if the activity returns RESULT_OK carrying the
 * same appWidgetId it was given. Returning anything else — including the
 * default RESULT_CANCELED — makes the launcher throw the widget away.
 */
class LekhWidgetConfigActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val widgetId = intent?.extras?.getInt(
            AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID,
        ) ?: AppWidgetManager.INVALID_APPWIDGET_ID

        setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId))
        finish()
    }
}
