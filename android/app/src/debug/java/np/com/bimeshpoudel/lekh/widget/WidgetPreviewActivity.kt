package np.com.bimeshpoudel.lekh.widget

import android.app.Activity
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Debug-only harness that renders the widget's RemoteViews into a normal
 * Activity, at roughly the size a 2x2 home-screen cell gives it.
 *
 * It lives in `src/debug/` so it is compiled into the debug APK and cannot
 * reach a release build. A widget is otherwise only visible by adding it to a
 * launcher home screen, which is awkward to automate and awkward to iterate
 * on — this makes the thing screenshot-able.
 *
 * It is a harness, not a feature: nothing here is used by the widget itself.
 */
class WidgetPreviewActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val dp = { v: Int ->
            TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), resources.displayMetrics
            ).toInt()
        }

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(16), dp(32), dp(16), dp(16))
            /* Android 15 (API 35) enforces edge-to-edge for apps targeting 35,
               so content draws *under* the status bar and action bar unless it
               insets itself. Without this the first widget renders behind the
               title bar with its top clipped off — which looks exactly like the
               widget's own text being cut, and is not. */
            fitsSystemWindows = true
        }

        root.addView(TextView(this).apply {
            text = "widget preview — debug only"
            textSize = 12f
            setPadding(0, 0, 0, dp(12))
        })

        // The real RemoteViews, inflated exactly as the launcher would.
        val host = FrameLayout(this)
        val views = WidgetRenderer.build(this)
        host.addView(views.apply(applicationContext, host))
        root.addView(host, ViewGroup.LayoutParams(dp(160), dp(160)))

        // A second copy at a wider cell, to catch text that only clips when the
        // festival name is long and the box is short.
        root.addView(TextView(this).apply {
            text = "4x2 cell"
            textSize = 12f
            setPadding(0, dp(20), 0, dp(8))
        })
        val wide = FrameLayout(this)
        wide.addView(WidgetRenderer.build(this).apply(applicationContext, wide))
        root.addView(wide, ViewGroup.LayoutParams(dp(320), dp(150)))

        setContentView(root)
    }
}
