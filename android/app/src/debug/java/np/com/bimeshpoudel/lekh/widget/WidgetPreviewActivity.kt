package np.com.bimeshpoudel.lekh.widget

import android.app.Activity
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
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
               widget's own text being cut, and is not. It is set on the
               ScrollView below, which is now the outermost view. */
        }

        /* Every size, at roughly the cell dimensions each declares, so a
           layout that only breaks at one shape cannot hide. The expanded xl
           form is what onAppWidgetOptionsChanged switches to once it's
           dragged tall — previewed here at that height since it is not
           reachable by placing a widget at its default size. */
        val sizes = listOf(
            Triple("2x1  small", np.com.bimeshpoudel.lekh.R.layout.widget_patro_small, 160 to 70),
            Triple("2x2  medium", np.com.bimeshpoudel.lekh.R.layout.widget_patro, 160 to 160),
            Triple("4x1  wide", np.com.bimeshpoudel.lekh.R.layout.widget_patro_wide, 330 to 70),
            Triple("5x1  xl", np.com.bimeshpoudel.lekh.R.layout.widget_patro_xl, 360 to 70),
            Triple("5x1  xl, expanded", np.com.bimeshpoudel.lekh.R.layout.widget_patro_xl_expanded, 360 to 170),
        )

        /* Both scripts, every size, in one scroll. The language is a stored
           preference the widget reads at draw time, so previewing it means
           flipping the preference around each render — which is fine here and
           would not be anywhere else. */
        val wasEnglish = WidgetPrefs.isEnglish(this)
        for (english in listOf(false, true)) {
            WidgetPrefs.setEnglish(this, english)
            root.addView(TextView(this).apply {
                text = if (english) "— ENGLISH —" else "— नेपाली —"
                textSize = 14f
                setPadding(0, dp(20), 0, dp(4))
            })
            for ((label, layout, dims) in sizes) {
                root.addView(TextView(this).apply {
                    text = label
                    textSize = 12f
                    setPadding(0, dp(14), 0, dp(6))
                })
                val host = FrameLayout(this)
                host.addView(WidgetRenderer.build(this, layout).apply(applicationContext, host))
                root.addView(host, ViewGroup.LayoutParams(dp(dims.first), dp(dims.second)))
            }
        }
        WidgetPrefs.setEnglish(this, wasEnglish)

        /* Six rows no longer fit on one screen, and a preview you cannot
           reach the bottom of hides exactly the size most likely to overflow. */
        setContentView(ScrollView(this).apply {
            addView(root)
            fitsSystemWindows = true
        })
    }
}
