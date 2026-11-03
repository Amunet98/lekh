package np.com.bimeshpoudel.lekh.widget

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.BlendMode
import android.os.Build
import android.widget.RemoteViews
import androidx.annotation.RequiresApi
import np.com.bimeshpoudel.lekh.R

/**
 * The widget's Material You colours, picked in this process and handed to the
 * launcher as plain values.
 *
 * Why not leave them to the layout's @android:color/system_* references, as
 * before 1.9.113: a launcher can swap those references for colours of its own.
 * Launcher3's LocalColorExtractor, which Nothing Launcher carries (and Pixel
 * Launcher does the same), hands each widget a palette taken from the patch of
 * wallpaper *behind that widget* through RemoteViews.ColorResources. A widget
 * over a black patch has no hue to go on, so Monet falls back to its stock blue
 * seed. On the owner's A024 (2026-11-03) the system theme was brown, the app was
 * brown, the Google Calendar widget over the orange part of the wallpaper was
 * brown, and Lekh's widget over the black part was blue. Removing and re-adding
 * it, a fresh app process and a launcher restart did not change that.
 *
 * Colour *values* are not resources, so the launcher has nothing to swap. Light
 * and dark go over as a pair through the API 31 day/night overloads of
 * setColorInt and setColorStateList, and the launcher picks one against its own
 * configuration when it inflates. A dark-mode switch still flips the widget
 * without a redraw, which is what res/color/widget_day.xml exists to protect.
 *
 * The cost is that the values are fixed until the next redraw, where the
 * references followed the theme by themselves. ThemeWatchWorker redraws when
 * the theme changes, and so does opening the app (MainActivity.onResume).
 *
 * The system_* ramps do not depend on day or night, so one context can read
 * both halves of the pair. The shade for each role is the same table as
 * values-v31/colors.xml (light) and values-night-v31/colors.xml (dark). Those
 * files stay in place: the launcher still draws them until our actions apply,
 * and the widget picker's preview uses them.
 */
@RequiresApi(Build.VERSION_CODES.S)
internal object WidgetPalette {

    private class Pair(val light: Int, val dark: Int)

    private class Roles(private val context: Context) {
        private fun c(id: Int) = context.getColor(id)
        // Opaque, although the card is 90% opaque on purpose (see
        // drawable/widget_background.xml). The SRC_IN tint multiplies its own
        // alpha into the drawable's, and the drawable is already at 0.9. An
        // alpha here as well came out at 81%, visibly greyer (A024, light mode).
        val surface = Pair(c(android.R.color.system_neutral1_0), c(android.R.color.system_neutral1_800))
        val border = Pair(c(android.R.color.system_neutral2_100), c(android.R.color.system_neutral2_700))
        val text = Pair(c(android.R.color.system_neutral1_900), c(android.R.color.system_neutral1_50))
        val muted = Pair(c(android.R.color.system_neutral2_600), c(android.R.color.system_neutral2_300))
        val accent = Pair(c(android.R.color.system_accent1_700), c(android.R.color.system_accent1_200))
        val today = Pair(c(android.R.color.system_accent1_100), c(android.R.color.system_accent1_800))
        val head = Pair(c(android.R.color.system_accent1_600), c(android.R.color.system_accent1_200))
        val onHead = Pair(c(android.R.color.system_accent1_0), c(android.R.color.system_accent1_800))
        val leaf = Pair(c(android.R.color.system_neutral1_10), c(android.R.color.system_neutral1_700))
    }

    /**
     * A short fingerprint of the colours a redraw would use now. It is
     * compared with the one stored at the last draw to tell whether the theme
     * moved underneath a placed widget.
     */
    fun fingerprint(context: Context): String {
        val r = Roles(context)
        return listOf(r.surface, r.text, r.muted, r.accent, r.head, r.leaf)
            .joinToString(",") { "%08x:%08x".format(it.light, it.dark) }
    }

    private fun solid(color: Int) = ColorStateList.valueOf(color)

    /** Normal state [base], a day off (setEnabled(false)) [off]. Same states
     *  as res/color/widget_day.xml. */
    private fun dayList(off: Int, base: Int) = ColorStateList(
        arrayOf(intArrayOf(-android.R.attr.state_enabled), intArrayOf()),
        intArrayOf(off, base),
    )

    private fun RemoteViews.text(id: Int, p: Pair) =
        setColorStateList(id, "setTextColor", solid(p.light), solid(p.dark))

    private fun RemoteViews.dayText(id: Int, off: Pair, base: Pair) =
        setColorStateList(id, "setTextColor", dayList(off.light, base.light), dayList(off.dark, base.dark))

    /** Recolours a view's background drawable whatever colour it was drawn
     *  in. The default tint mode is SRC_IN, which keeps the drawable's shape
     *  and alpha and replaces its colour. */
    private fun RemoteViews.tint(id: Int, p: Pair) =
        setColorStateList(id, "setBackgroundTintList", solid(p.light), solid(p.dark))

    /** The same view list as WidgetTheme.applyStatic. Keep the two in step. */
    fun apply(context: Context, views: RemoteViews, layoutRes: Int) {
        val r = Roles(context)
        val small = layoutRes == R.layout.widget_patro_small
        val wide = layoutRes == R.layout.widget_patro_wide
        val xl = layoutRes == R.layout.widget_patro_xl
        val xlExpanded = layoutRes == R.layout.widget_patro_xl_expanded
        val square = layoutRes == R.layout.widget_patro

        views.tint(R.id.widget_root, r.surface)
        views.tint(R.id.widget_leaf_head, r.head)
        if (!square) {
            // The leaf has a fill and a 1dp outline, which one tint colour
            // would merge. widget_leaf_mask draws a white fill and a grey
            // outline, and MULTIPLY carries that difference over: the fill
            // comes out the leaf colour and the outline about a tone darker.
            views.setInt(R.id.widget_leaf, "setBackgroundResource", R.drawable.widget_leaf_mask)
            views.setBlendMode(R.id.widget_leaf, "setBackgroundTintBlendMode", BlendMode.MULTIPLY)
            views.tint(R.id.widget_leaf, r.leaf)
        }
        views.text(R.id.widget_leaf_head, r.onHead)
        views.dayText(R.id.widget_day, r.accent, r.text)
        views.text(R.id.widget_month, r.text)
        views.text(R.id.widget_ad, r.muted)
        if (small) return

        views.text(R.id.widget_weekday, r.muted)
        views.text(R.id.widget_tithi, r.muted)
        views.text(R.id.widget_note, r.accent)
        if (wide || xl || xlExpanded) {
            views.setColorInt(R.id.widget_divider1, "setBackgroundColor", r.border.light, r.border.dark)
            views.text(R.id.widget_next, r.muted)
        }
        if (xlExpanded) {
            views.setColorInt(R.id.widget_divider2, "setBackgroundColor", r.border.light, r.border.dark)
            for (i in 0..6) {
                views.dayText(WidgetRenderer.weekDayIds[i], r.accent, r.text)
                views.dayText(WidgetRenderer.weekLabelIds[i], r.accent, r.muted)
                // Only today's cell has a background (the pill); tinting the
                // six empty ones does nothing.
                views.tint(WidgetRenderer.weekCellIds[i], r.today)
            }
        }
    }
}
