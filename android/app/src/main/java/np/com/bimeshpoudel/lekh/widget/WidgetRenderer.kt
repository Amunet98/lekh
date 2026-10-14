package np.com.bimeshpoudel.lekh.widget

import android.app.PendingIntent
import android.content.Context
import android.widget.RemoteViews
import np.com.bimeshpoudel.lekh.R
import android.view.View
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Builds the widget's RemoteViews for a given layout.
 *
 * All layouts declare the same view ids, and each hides the ones its shape
 * has no room for with `visibility="gone"`. That keeps this one function able
 * to populate any of them — RemoteViews resolves ids inside its own layout,
 * and writing to a hidden view is harmless. The alternative, branching per
 * size here, puts the decision about what fits in the code instead of in the
 * layout that actually knows.
 *
 * The week strip is the one exception: its ids exist only in the expanded xl
 * layout. That is still safe — every RemoteViews action starts with a
 * findViewById and returns quietly when the id is not in the layout it was
 * applied to — but it is the reason the strip is written last and in its own
 * block rather than mixed in with the fields every size shares.
 *
 * Split out of the provider so the debug preview activity renders the exact
 * same thing on screen. A widget is otherwise only visible by adding it to a
 * launcher home screen, which is awkward to automate and worse to iterate on —
 * and "awkward to look at" is how a widget ships with the Devanagari clipped.
 *
 * Nepali by default, English on request (Settings → Home-screen widget,
 * since 1.9.60). The first English mode, removed 2026-08-29, transliterated
 * every festival name and too many came out garbled. This one uses only the
 * hand-checked names from the web app's festivalsEn.ts (see [FestivalsEn]):
 * a festival without one is simply not named in English, and the line falls
 * back to the tithi, which is a closed set a table gets right.
 */
object WidgetRenderer {

    /* Locale pinned: the default locale's MMM is "अक्टो" on a phone set to
       Nepali, and this line is the one place the widget promises English. */
    private val adFormat: DateTimeFormatter = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH)

    internal val weekDayIds = intArrayOf(
        R.id.widget_week_d0, R.id.widget_week_d1, R.id.widget_week_d2, R.id.widget_week_d3,
        R.id.widget_week_d4, R.id.widget_week_d5, R.id.widget_week_d6,
    )
    internal val weekLabelIds = intArrayOf(
        R.id.widget_week_l0, R.id.widget_week_l1, R.id.widget_week_l2, R.id.widget_week_l3,
        R.id.widget_week_l4, R.id.widget_week_l5, R.id.widget_week_l6,
    )
    private val weekCellIds = intArrayOf(
        R.id.widget_week_c0, R.id.widget_week_c1, R.id.widget_week_c2, R.id.widget_week_c3,
        R.id.widget_week_c4, R.id.widget_week_c5, R.id.widget_week_c6,
    )

    fun build(
        context: Context,
        layoutRes: Int = R.layout.widget_patro,
        onClick: PendingIntent? = null,
    ): RemoteViews {
        NepaliCalendar.load(context)
        Panchang.load(context)

        // Only the one-row sizes have a widget_next row, and only the expanded
        // 5x1 has the week strip; the 60-day upcoming() walk and the strip's
        // seven lookups are skipped for sizes that cannot show them.
        val english = WidgetTheme.isEnglish(context)
        if (english) FestivalsEn.load(context)
        fun num(n: Int) = if (english) n.toString() else NepaliCalendar.toDevanagari(n)

        val square = layoutRes == R.layout.widget_patro
        // The one-row sizes: leaf, month over "AD · tithi", festival over next.
        val row = layoutRes == R.layout.widget_patro_wide ||
            layoutRes == R.layout.widget_patro_xl ||
            layoutRes == R.layout.widget_patro_xl_expanded
        val showsWeek = layoutRes == R.layout.widget_patro_xl_expanded

        val today = NepaliCalendar.today()
        val info = Panchang.forDay(today)
        val weekday = NepaliCalendar.weekdayOf(today)
        val views = RemoteViews(context.packageName, layoutRes)

        val months = if (english) FestivalsEn.monthNames else NepaliCalendar.monthNames
        val weekdayFull = if (english) FestivalsEn.weekdayNames[weekday] else NepaliCalendar.weekdayNames[weekday]
        val weekdayShort = if (english) FestivalsEn.weekdayShort[weekday] else NepaliCalendar.weekdayShort[weekday]
        val tithi = info?.tithi?.let { if (english) FestivalsEn.tithi(it) else it } ?: ""
        val festivals = info?.festivals?.let { if (english) FestivalsEn.forDay(it) else it } ?: emptyList()
        val ad = NepaliCalendar.toGregorian(today).format(adFormat)

        views.setTextViewText(R.id.widget_day, num(today.day))
        views.setTextViewText(R.id.widget_month, "${months[today.month]} ${num(today.year)}")
        // The leaf's strip: the whole weekday across the 2x2's band, the
        // short form on the small leaf of every other size.
        views.setTextViewText(R.id.widget_leaf_head, if (square) weekdayFull else weekdayShort)
        views.setTextViewText(R.id.widget_weekday, weekdayFull)
        views.setTextViewText(R.id.widget_tithi, tithi)
        // On the one-row sizes the tithi rides on the AD line (see the layout).
        views.setTextViewText(R.id.widget_ad, if (row && tithi.isNotEmpty()) "$ad · $tithi" else ad)

        /* The festival line. A festival is what someone actually wants from a
           calendar widget, so it wins. On the 2x2 the tithi is the fallback;
           on the one-row sizes the tithi is already on the left, so a day
           with no festival hides the line instead of repeating it. Past the
           tabulated range the widget says so rather than looking like a day
           with nothing on it. */
        val outOfRange = info == null && !Panchang.covers(today.year)
        val note = when {
            outOfRange -> if (english) "Update Lekh for this year’s calendar" else "पात्रो अद्यावधिक गर्नुहोस्"
            // One line on the row sizes, so the English names lose their gloss
            // there ("Vijaya Dashami — Dashain Tika" → "Vijaya Dashami"); the
            // 2x2 has two lines and keeps it.
            festivals.isNotEmpty() && english && row -> festivals.joinToString(" · ") { FestivalsEn.short(it) }
            festivals.isNotEmpty() -> festivals.joinToString(" · ")
            square -> tithi
            else -> ""
        }
        views.setTextViewText(R.id.widget_note, note)
        if (row) views.setViewVisibility(R.id.widget_note, if (note.isEmpty()) View.GONE else View.VISIBLE)

        /* What is coming. Only the one-row sizes have a row for this. In
           English only festivals with an English name count, so "Next" never
           names one it would have to show in Nepali. */
        if (row) {
            val upcoming = if (english) {
                Panchang.upcoming(today) { FestivalsEn.forDay(it.festivals).isNotEmpty() }
            } else {
                Panchang.upcoming(today)
            }
            views.setTextViewText(
                R.id.widget_next,
                if (upcoming == null) "" else {
                    val (days, next) = upcoming
                    if (english) {
                        val name = FestivalsEn.short(FestivalsEn.forDay(next.festivals).first())
                        // "Fulpati in 3 days": the name first, and no "Next"
                        // label, which cost the name its last word on a 4x1.
                        "$name ${if (days == 1) "tomorrow" else "in $days days"}"
                    } else {
                        val away = if (days == 1) "भोलि" else "${num(days)} दिनमा"
                        "आगामी · ${next.festivals.first()} · $away"
                    }
                },
            )
        }

        /* Holidays and weekly days off share one accent, as in the web app.
         *
         * Driven by a selection STATE, not a colour. The colour itself lives in
         * res/color/widget_day.xml and is named by the layout, so the launcher
         * resolves it against its own theme every time it inflates.
         *
         * This replaces a context.getColor() call, which resolved against *our*
         * process's configuration rather than the launcher's: a widget placed
         * while the phone was light kept a near-black date after the phone went
         * dark, invisible on the dark surface, and the baked value survived a
         * redraw. Every other colour in the widget comes from the layout and was
         * always correct, which is exactly why this one was hard to spot.
         *
         * setEnabled is @RemotableViewMethod on View and always has been, so
         * this needs no API-level branch — one mechanism from Android 8 to 16.
         */
        val isOff = NepaliCalendar.isWeeklyOff(today) || (info?.isHoliday == true)
        views.setBoolean(R.id.widget_day, "setEnabled", !isOff)

        if (showsWeek) renderWeek(views, today, WidgetTheme.pill(context), english)

        if (onClick != null) views.setOnClickPendingIntent(R.id.widget_root, onClick)
        // The app's "Wallpaper colours" setting, carried over — see WidgetTheme.
        if (WidgetTheme.useStatic(context)) WidgetTheme.applyStatic(views, layoutRes)
        return views
    }

    /**
     * The expanded xl week strip: Sunday to Saturday around [today], today
     * marked.
     *
     * The marker is a background applied through setInt rather than a
     * visibility toggle on seven pre-placed shapes, because which cell is today
     * changes daily and there is no layout answer to that. `setBackgroundResource`
     * is one of the @RemotableViewMethod methods RemoteViews will call by name;
     * the six other cells are cleared with 0, which is "no background" — not
     * doing that leaves yesterday's marker behind when the widget redraws
     * across midnight without being reinflated.
     */
    private fun renderWeek(views: RemoteViews, today: BsDate, pill: Int, english: Boolean) {
        val week = NepaliCalendar.weekOf(today)

        for (i in 0..6) {
            val day = week[i]
            // A day off is accented in the strip too, so Saturday and Sunday read
            // as the weekend at a glance rather than needing to be counted to.
            // Set as a state, not a colour, for the same reason as the date above:
            // res/color/widget_week_*.xml is resolved by the launcher, a colour
            // resolved here would be resolved against the wrong configuration.
            val off = NepaliCalendar.isWeeklyOff(day) || (Panchang.forDay(day)?.isHoliday == true)
            views.setTextViewText(
                weekDayIds[i],
                if (english) day.day.toString() else NepaliCalendar.toDevanagari(day.day),
            )
            views.setBoolean(weekDayIds[i], "setEnabled", !off)
            views.setBoolean(weekLabelIds[i], "setEnabled", !off)
            // The layout XML holds the Devanagari labels as placeholders; the
            // language decides what is actually drawn.
            views.setTextViewText(
                weekLabelIds[i],
                if (english) FestivalsEn.weekdayShort[i] else NepaliCalendar.weekdayShort[i],
            )
            views.setInt(
                weekCellIds[i],
                "setBackgroundResource",
                if (i == NepaliCalendar.weekdayOf(today)) pill else 0,
            )
        }
    }
}
