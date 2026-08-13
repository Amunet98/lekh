package np.com.bimeshpoudel.lekh.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.widget.RadioButton
import android.widget.RadioGroup
import np.com.bimeshpoudel.lekh.R

/**
 * The widget's configuration screen: Nepali or English.
 *
 * Reached two ways. Placing a widget on Android 11 or older opens it, because
 * `widgetFeatures` does not exist before API 31 and a declared `configure`
 * activity is therefore mandatory. From Android 12 the providers declare
 * `configuration_optional|reconfigurable`, so placing a widget just works with
 * the current setting and this screen is instead reached by long-pressing a
 * placed widget and tapping its settings affordance.
 *
 * Either way it must finish correctly:
 *
 * A configuration activity is launched *before* the widget exists, and the
 * launcher only commits it if the activity returns RESULT_OK carrying the same
 * appWidgetId it was given. Returning anything else — including the default
 * RESULT_CANCELED that a plain back press produces — makes the launcher throw
 * the widget away. So the id is captured up front and the result is set as soon
 * as a choice is made, and the cancelled case is left genuinely cancelled.
 */
class LekhWidgetConfigActivity : Activity() {

    private var widgetId = AppWidgetManager.INVALID_APPWIDGET_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        widgetId = intent?.extras?.getInt(
            AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID,
        ) ?: AppWidgetManager.INVALID_APPWIDGET_ID

        // Back-press before choosing drops a newly placed widget, which is the
        // correct behaviour for a first-time configure and harmless for a
        // reconfigure (the widget already exists and is not being re-created).
        setResult(RESULT_CANCELED, resultIntent())

        setContentView(R.layout.widget_config)
        setTitle(R.string.config_title)

        val group = findViewById<RadioGroup>(R.id.config_group)
        val english = WidgetPrefs.isEnglish(this)
        findViewById<RadioButton>(if (english) R.id.config_english else R.id.config_nepali)
            .isChecked = true

        group.setOnCheckedChangeListener { _, checked ->
            WidgetPrefs.setEnglish(this, checked == R.id.config_english)
            WidgetPrefs.refreshAll(this)
            setResult(RESULT_OK, resultIntent())
            finish()
        }
    }

    private fun resultIntent() =
        Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
}
