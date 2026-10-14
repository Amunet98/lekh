package np.com.bimeshpoudel.lekh.widget

import android.app.Activity
import android.app.AlertDialog
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import np.com.bimeshpoudel.lekh.R

/**
 * The widget's settings screen: the launcher's long-press "Widget settings"
 * (widgetFeatures="reconfigurable", API 31+) opens it, and it asks one
 * thing — Nepali or English.
 *
 * The language is the same app-wide choice as the app's Settings →
 * Home-screen widget (see [WidgetTheme.isEnglish]), not a per-widget one, so
 * changing it here rewords every placed widget. The app reads it back from
 * here on launch (DynamicColorPlugin.getWidgetLanguage), so the two screens
 * never disagree.
 *
 * Android 11 and older have no reconfigure and no configuration_optional, so
 * there it opens once, on placement. A configuration activity launched for
 * placement must return RESULT_OK carrying the appWidgetId it was given or
 * the launcher throws the widget away — so the result is set up front, and
 * backing out of the question still keeps the widget (in Nepali, the
 * default). On reconfigure the launcher ignores the result.
 *
 * The activity itself draws nothing (a translucent theme); the question is a
 * plain DeviceDefault alert so it looks like the OEM's other dialogs.
 */
class LekhWidgetConfigActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val widgetId = intent?.extras?.getInt(
            AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID,
        ) ?: AppWidgetManager.INVALID_APPWIDGET_ID
        setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId))

        // Each option in its own script: a language picker is the one place
        // a name reads best written in itself.
        val labels = arrayOf("नेपाली", "English")
        val current = if (WidgetTheme.isEnglish(this)) 1 else 0

        AlertDialog.Builder(this, R.style.LekhConfigTheme)
            .setTitle(R.string.widget_config_title)
            .setSingleChoiceItems(labels, current) { dialog, which ->
                WidgetTheme.setEnglish(this, which == 1)
                dialog.dismiss()
            }
            .setNegativeButton(android.R.string.cancel, null)
            .setOnDismissListener { finish() }
            .show()
    }
}
