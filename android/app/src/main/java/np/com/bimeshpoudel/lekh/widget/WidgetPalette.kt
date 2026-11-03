package np.com.bimeshpoudel.lekh.widget

import android.content.Context
import android.content.res.ColorStateList
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

    /**
     * A short fingerprint of the colours a redraw would use now. It is
     * compared with the one stored at the last draw to tell whether the theme
     * moved underneath a placed widget.
     */
    fun fingerprint(context: Context): String = WidgetPaint.Roles(context).fingerprint()

    /** The same view list as WidgetTheme.applyStatic. Keep the two in step. */
    fun apply(context: Context, views: RemoteViews, layoutRes: Int, paint: WidgetPaint) {
        val small = layoutRes == R.layout.widget_patro_small
        val wide = layoutRes == R.layout.widget_patro_wide
        val xl = layoutRes == R.layout.widget_patro_xl
        val xlExpanded = layoutRes == R.layout.widget_patro_xl_expanded
        val square = layoutRes == R.layout.widget_patro

        paint.tint(views, R.id.widget_root, Role.SURFACE)
        paint.tint(views, R.id.widget_leaf_head, Role.HEAD)
        if (!square) paint.tint(views, R.id.widget_leaf, Role.LEAF)
        paint.text(views, R.id.widget_leaf_head, Role.ON_HEAD)
        paint.offText(views, R.id.widget_day, Role.TEXT)
        paint.text(views, R.id.widget_month, Role.TEXT)
        paint.text(views, R.id.widget_ad, Role.MUTED)
        if (small) return

        paint.text(views, R.id.widget_weekday, Role.MUTED)
        paint.text(views, R.id.widget_tithi, Role.MUTED)
        paint.text(views, R.id.widget_note, Role.ACCENT)
        if (wide || xl || xlExpanded) {
            paint.line(views, R.id.widget_divider1)
            paint.text(views, R.id.widget_next, Role.TEXT)
        }
        if (xlExpanded) {
            paint.line(views, R.id.widget_divider2)
            for (i in 0..6) {
                paint.offText(views, WidgetRenderer.weekDayIds[i], Role.TEXT)
                paint.offText(views, WidgetRenderer.weekLabelIds[i], Role.MUTED)
                // Only today's cell has a background (the pill); tinting the
                // six empty ones does nothing.
                paint.tint(views, WidgetRenderer.weekCellIds[i], Role.TODAY)
            }
        }
    }
}

/** What a colour is for. Each maps to one Material You shade and one fixed one. */
internal enum class Role { TEXT, MUTED, ACCENT, ON_HEAD, HEAD, TODAY, LEAF, BORDER, SURFACE }

/**
 * Colours for one render, in whichever of three modes is in force:
 *
 * - LEGACY, below Android 12: nothing to do. The layouts' own @color
 *   references resolve to the fixed palette in values/ and values-night/,
 *   and the launcher flips them with the phone's dark mode.
 * - STATIC, "Wallpaper colours" off: the fixed palette, passed as resource
 *   ids (the API 31 setColorStateList overload), which the launcher resolves
 *   against its own configuration, so light and dark still flip.
 * - DYNAMIC: Material You, as day/night value pairs; see WidgetPalette.
 *
 * Built once per render, so the twenty-odd colour reads happen once rather
 * than once per view (the month widget has forty-two cells).
 */
internal class WidgetPaint private constructor(private val mode: Mode, private val roles: Roles?) {

    enum class Mode { LEGACY, STATIC, DYNAMIC }

    val isLegacy: Boolean get() = mode == Mode.LEGACY
    val isDynamic: Boolean get() = mode == Mode.DYNAMIC

    class Pair(val light: Int, val dark: Int)

    @RequiresApi(Build.VERSION_CODES.S)
    class Roles(private val context: Context) {
        private fun c(id: Int) = context.getColor(id)
        private fun alpha(color: Int, a: Float) = (color and 0x00FFFFFF) or ((a * 255).toInt() shl 24)

        // Opaque, although the card is translucent on purpose (milky glass
        // since 1.9.115; see drawable/widget_background.xml). The SRC_IN tint
        // multiplies its own alpha into the drawable's, and the drawable
        // already carries it. An alpha here as well came out visibly greyer
        // (A024, light mode, 1.9.113).
        val surface = Pair(c(android.R.color.system_neutral1_0), c(android.R.color.system_neutral1_800))
        val border = Pair(c(android.R.color.system_neutral2_100), c(android.R.color.system_neutral2_700))
        val text = Pair(c(android.R.color.system_neutral1_900), c(android.R.color.system_neutral1_50))
        val muted = Pair(c(android.R.color.system_neutral2_600), c(android.R.color.system_neutral2_300))
        val accent = Pair(c(android.R.color.system_accent1_700), c(android.R.color.system_accent1_200))
        val today = Pair(c(android.R.color.system_accent1_100), c(android.R.color.system_accent1_800))
        val head = Pair(c(android.R.color.system_accent1_600), c(android.R.color.system_accent1_200))
        val onHead = Pair(c(android.R.color.system_accent1_0), c(android.R.color.system_accent1_800))
        // The leaf's page: a faint layer on the card, with no outline since
        // 1.9.114. In light mode a tinted grey, because a white page on the
        // near-white card vanished; in dark a lighter wash. The leaf drawable
        // is opaque, so this alpha is the one that shows.
        val leaf = Pair(
            alpha(c(android.R.color.system_neutral2_100), 0.7f),
            alpha(c(android.R.color.system_neutral1_600), 0.45f),
        )

        fun of(role: Role): Pair = when (role) {
            Role.TEXT -> text
            Role.MUTED -> muted
            Role.ACCENT -> accent
            Role.ON_HEAD -> onHead
            Role.HEAD -> head
            Role.TODAY -> today
            Role.LEAF -> leaf
            Role.BORDER -> border
            Role.SURFACE -> surface
        }

        fun fingerprint(): String = listOf(surface, text, muted, accent, head, leaf)
            .joinToString(",") { "%08x:%08x".format(it.light, it.dark) }
    }

    companion object {
        fun of(context: Context): WidgetPaint = when {
            Build.VERSION.SDK_INT < Build.VERSION_CODES.S -> WidgetPaint(Mode.LEGACY, null)
            !WidgetTheme.isDynamic(context) -> WidgetPaint(Mode.STATIC, null)
            else -> WidgetPaint(Mode.DYNAMIC, Roles(context))
        }

        private fun staticRes(role: Role): Int = when (role) {
            Role.TEXT -> R.color.widget_static_text
            Role.MUTED -> R.color.widget_static_muted
            Role.ACCENT -> R.color.widget_static_accent
            Role.ON_HEAD -> R.color.widget_static_on_head
            Role.HEAD -> R.color.widget_static_head
            Role.TODAY -> R.color.widget_static_today
            Role.LEAF -> R.color.widget_static_leaf
            Role.BORDER -> R.color.widget_static_border
            Role.SURFACE -> R.color.widget_surface
        }

        private fun solid(color: Int) = ColorStateList.valueOf(color)

        /** Normal state [base], a day off (setEnabled(false)) [off]. Same
         *  states as res/color/widget_day.xml. */
        private fun dayList(off: Int, base: Int) = ColorStateList(
            arrayOf(intArrayOf(-android.R.attr.state_enabled), intArrayOf()),
            intArrayOf(off, base),
        )
    }

    private fun set(views: RemoteViews, id: Int, method: String, role: Role) {
        when (mode) {
            Mode.LEGACY -> Unit
            Mode.STATIC -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                views.setColorStateList(id, method, staticRes(role))
            }
            Mode.DYNAMIC -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val p = roles!!.of(role)
                views.setColorStateList(id, method, solid(p.light), solid(p.dark))
            }
        }
    }

    fun text(views: RemoteViews, id: Int, role: Role) = set(views, id, "setTextColor", role)

    /** Recolours a view's background drawable whatever colour it was drawn
     *  in. The default tint mode is SRC_IN, which keeps the drawable's shape
     *  and alpha and replaces its colour. */
    fun tint(views: RemoteViews, id: Int, role: Role) = set(views, id, "setBackgroundTintList", role)

    fun imageTint(views: RemoteViews, id: Int, role: Role) = set(views, id, "setImageTintList", role)

    /** A text colour that turns accent on a day off (setEnabled(false)). */
    fun offText(views: RemoteViews, id: Int, base: Role) {
        when (mode) {
            Mode.LEGACY -> Unit
            Mode.STATIC -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val res = if (base == Role.MUTED) R.color.widget_static_week_label else R.color.widget_static_day
                views.setColorStateList(id, "setTextColor", res)
            }
            Mode.DYNAMIC -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val r = roles!!
                val b = r.of(base)
                views.setColorStateList(
                    id, "setTextColor",
                    dayList(r.accent.light, b.light), dayList(r.accent.dark, b.dark),
                )
            }
        }
    }

    /** A divider line. */
    fun line(views: RemoteViews, id: Int) {
        when (mode) {
            Mode.LEGACY -> Unit
            Mode.STATIC -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                views.setColor(id, "setBackgroundColor", R.color.widget_static_border)
            }
            Mode.DYNAMIC -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val p = roles!!.border
                views.setColorInt(id, "setBackgroundColor", p.light, p.dark)
            }
        }
    }
}
