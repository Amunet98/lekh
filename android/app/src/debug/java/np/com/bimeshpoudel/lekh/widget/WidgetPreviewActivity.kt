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
        /* The 2x2 is drawn three times. 160 is a roomy launcher; 138 is what
           the Nothing launcher on the test phone (A024) actually gives two
           cells, measured off a screenshot; 110 is the minHeight the provider
           declares, the least any launcher may give. Previewing only at 160
           is how a clipped tithi line shipped (2026-10-27): it fit here and
           not on the phone. Every size has to fit at its declared minimum. */
        val sizes = listOf(
            Triple("2x1  small", np.com.bimeshpoudel.lekh.R.layout.widget_patro_small, 160 to 70),
            Triple("2x2  medium", np.com.bimeshpoudel.lekh.R.layout.widget_patro, 160 to 160),
            Triple("2x2  medium, A024 launcher (138dp)", np.com.bimeshpoudel.lekh.R.layout.widget_patro, 138 to 138),
            Triple("2x2  medium, declared minimum (110dp)", np.com.bimeshpoudel.lekh.R.layout.widget_patro, 110 to 110),
            Triple("2x2  medium (160dp), long festival day", np.com.bimeshpoudel.lekh.R.layout.widget_patro, 160 to 160),
            Triple("2x2  medium (138dp), long festival day", np.com.bimeshpoudel.lekh.R.layout.widget_patro, 138 to 138),
            Triple("2x2  medium (110dp), long festival day", np.com.bimeshpoudel.lekh.R.layout.widget_patro, 110 to 110),
            // One row on the A024's Nothing launcher is ~61dp, under the 70 above.
            /* Not previewed at its declared 110x40: that is the pre-Android-12
               cell formula's floor for one row, which no real launcher gives
               (rows run ~60dp and up), and the leaf alone needs ~45dp of it.
               Raising minHeight to fit would make old launchers reserve two
               rows. The 2x1 is honest from ~57dp. */
            Triple("2x1  small, A024 launcher (138x61dp)", np.com.bimeshpoudel.lekh.R.layout.widget_patro_small, 138 to 61),
            Triple("4x1  wide", np.com.bimeshpoudel.lekh.R.layout.widget_patro_wide, 330 to 70),
            Triple("4x1  wide, A024 launcher (61dp)", np.com.bimeshpoudel.lekh.R.layout.widget_patro_wide, 330 to 61),
            Triple("5x1  xl", np.com.bimeshpoudel.lekh.R.layout.widget_patro_xl, 360 to 70),
            Triple("5x1  xl, A024 launcher (61dp)", np.com.bimeshpoudel.lekh.R.layout.widget_patro_xl, 360 to 61),
            Triple("5x1  xl, expanded", np.com.bimeshpoudel.lekh.R.layout.widget_patro_xl_expanded, 360 to 170),
        )

        for ((label, layout, dims) in sizes) {
            root.addView(TextView(this).apply {
                text = label
                textSize = 12f
                setPadding(0, dp(14), 0, dp(6))
            })
            val host = FrameLayout(this)
            // Built for the height it is shown at, as the provider builds it.
            val views = WidgetRenderer.build(this, layout, heightDp = dims.second)
            /* Kartik 22, 2083 — three festivals, the longest line the 2x2
               shows that year — so the two-line case is always on screen. */
            if (label.endsWith("long festival day")) {
                views.setTextViewText(np.com.bimeshpoudel.lekh.R.id.widget_note, "लक्ष्मी पूजा · कुकुर तिहार · नरक चतुर्दशी")
            }
            host.addView(views.apply(applicationContext, host))
            root.addView(host, ViewGroup.LayoutParams(dp(dims.first), dp(dims.second)))
        }

        /* Six rows no longer fit on one screen, and a preview you cannot
           reach the bottom of hides exactly the size most likely to overflow. */
        setContentView(ScrollView(this).apply {
            addView(root)
            fitsSystemWindows = true
        })
    }
}
