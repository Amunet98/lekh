package np.com.bimeshpoudel.lekh.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.view.View
import android.widget.RemoteViews
import np.com.bimeshpoudel.lekh.R
import org.json.JSONArray
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * The Tools widget (2.0.25): four tools behind tabs, one 4x2. See
 * layout/widget_tools.xml for what each tab holds and LekhToolsProvider for
 * the taps.
 *
 * Its state is per placed widget, in SharedPreferences: which tab is open,
 * which currency the Money tab shows, and how far the Phrase tab has been
 * stepped past the phrase of the day.
 */
internal object ToolsRenderer {

    const val TAB_MONEY = 0
    const val TAB_PHRASE = 1
    const val TAB_PREETI = 2
    const val TAB_DATE = 3

    private const val PREFS = "lekh_tools"
    private val tabIds = intArrayOf(R.id.widget_tab0, R.id.widget_tab1, R.id.widget_tab2, R.id.widget_tab3)
    private val panelIds = intArrayOf(
        R.id.widget_panel_money, R.id.widget_panel_phrase, R.id.widget_panel_preeti, R.id.widget_panel_date,
    )
    private val amtIds = intArrayOf(R.id.widget_amt0, R.id.widget_amt1, R.id.widget_amt2)
    private val amtFromIds = intArrayOf(R.id.widget_amt_from0, R.id.widget_amt_from1, R.id.widget_amt_from2)
    private val amtToIds = intArrayOf(R.id.widget_amt_to0, R.id.widget_amt_to1, R.id.widget_amt_to2)

    /** Under this placed height (dp) the Money tab drops its note line:
     *  Launcher3's 4x2 is ~137dp and the full tab needs ~150. */
    private const val NOTE_MIN_HEIGHT_DP = 150

    private val adLong: DateTimeFormatter = DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy", Locale.ENGLISH)
    private val sheetDate: DateTimeFormatter = DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH)

    data class Phrase(val en: String, val ne: String, val say: String)

    private var phrases: List<Phrase>? = null

    private fun phrases(context: Context): List<Phrase> = phrases ?: run {
        val list = try {
            val json = JSONArray(context.assets.open("phrases.json").bufferedReader().use { it.readText() })
            (0 until json.length()).map {
                val p = json.getJSONObject(it)
                Phrase(p.getString("en"), p.getString("ne"), p.getString("say"))
            }
        } catch (_: Exception) {
            emptyList()
        }
        phrases = list
        list
    }

    // ---- per-widget state ----

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    fun tab(context: Context, id: Int) = prefs(context).getInt("tab_$id", TAB_MONEY)
    fun setTab(context: Context, id: Int, tab: Int) = prefs(context).edit().putInt("tab_$id", tab).apply()
    private fun currency(context: Context, id: Int) = prefs(context).getString("cur_$id", "USD") ?: "USD"
    private fun phraseStep(context: Context, id: Int) = prefs(context).getInt("ph_$id", 0)

    fun nextCurrency(context: Context, id: Int) {
        val sheet = Forex.cached(context) ?: return
        val codes = Forex.ordered(sheet).map { it.iso3 }
        val at = codes.indexOf(currency(context, id))
        prefs(context).edit().putString("cur_$id", codes[(at + 1).mod(codes.size)]).apply()
    }

    fun nextPhrase(context: Context, id: Int) =
        prefs(context).edit().putInt("ph_$id", phraseStep(context, id) + 1).apply()

    fun forget(context: Context, ids: IntArray) {
        val edit = prefs(context).edit()
        for (id in ids) edit.remove("tab_$id").remove("cur_$id").remove("ph_$id")
        edit.apply()
    }

    /** Today's phrase, stepped on by however many times "next" was tapped. */
    fun currentPhrase(context: Context, id: Int): Phrase? {
        val list = phrases(context)
        if (list.isEmpty()) return null
        val index = (LocalDate.now().toEpochDay() + phraseStep(context, id)).mod(list.size.toLong()).toInt()
        return list[index]
    }

    // ---- drawing ----

    fun refreshAll(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, LekhToolsProvider::class.java))
        for (id in ids) manager.updateAppWidget(id, build(context, id, LekhToolsProvider.heightOf(manager.getAppWidgetOptions(id))))
    }

    fun build(context: Context, id: Int, heightDp: Int): RemoteViews {
        NepaliCalendar.load(context)
        val views = RemoteViews(context.packageName, R.layout.widget_tools)
        val paint = WidgetPaint.of(context)
        val english = WidgetTheme.isEnglish(context)
        val selected = tab(context, id)

        // Tabs: the open one filled, the others quiet.
        for (i in 0..3) {
            val on = i == selected
            views.setInt(
                tabIds[i], "setBackgroundResource",
                when {
                    !on -> R.drawable.widget_row
                    paint.isLegacy -> R.drawable.widget_count_quiet
                    else -> R.drawable.widget_count
                },
            )
            if (!paint.isLegacy) {
                paint.tint(views, tabIds[i], if (on) Role.HEAD else Role.CHIP)
                paint.text(views, tabIds[i], if (on) Role.ON_HEAD else Role.TEXT)
            }
            views.setOnClickPendingIntent(tabIds[i], LekhToolsProvider.action(context, id, LekhToolsProvider.OP_TAB, i))
            views.setViewVisibility(panelIds[i], if (on) View.VISIBLE else View.GONE)
        }

        when (selected) {
            TAB_MONEY -> money(context, views, id, paint, heightDp)
            TAB_PHRASE -> phrase(context, views, id, paint)
            TAB_PREETI -> preeti(context, views, paint)
            else -> date(context, views, paint, english)
        }

        if (WidgetTheme.useStatic(context)) {
            views.setInt(R.id.widget_root, "setBackgroundResource", R.drawable.widget_background_static)
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            paint.tint(views, R.id.widget_root, Role.SURFACE)
            WidgetTheme.rememberPalette(context)
        }
        views.setOnClickPendingIntent(R.id.widget_root, openApp(context, id, toolFor(selected)))
        return views
    }

    private fun toolFor(tab: Int) = when (tab) {
        TAB_MONEY -> "money"
        TAB_PHRASE -> "phrases"
        TAB_PREETI -> "preeti"
        else -> "date"
    }

    private fun money(context: Context, views: RemoteViews, id: Int, paint: WidgetPaint, heightDp: Int) {
        val sheet = Forex.cached(context)
        paint.tint(views, R.id.widget_cur, Role.CHIP)
        paint.text(views, R.id.widget_cur_code, Role.TEXT)
        paint.imageTint(views, R.id.widget_cur_more, Role.TEXT)
        paint.text(views, R.id.widget_rate, Role.TEXT)
        paint.text(views, R.id.widget_money_note, Role.MUTED)
        for (i in 0..2) {
            paint.tint(views, amtIds[i], Role.CHIP)
            paint.text(views, amtFromIds[i], Role.MUTED)
            paint.text(views, amtToIds[i], Role.TEXT)
        }
        val rates = sheet?.let { Forex.ordered(it) }.orEmpty()
        val rate = rates.firstOrNull { it.iso3 == currency(context, id) } ?: rates.firstOrNull()
        if (sheet == null || rate == null) {
            // First placement, before the first fetch lands (or with no
            // network yet): say so on the widget, as the quality guide asks.
            views.setTextViewText(R.id.widget_cur_code, "NRB")
            views.setTextViewText(R.id.widget_rate, "…")
            for (i in 0..2) views.setViewVisibility(amtIds[i], View.INVISIBLE)
            views.setTextViewText(R.id.widget_money_note, "Getting today’s rates. Tap to open Money.")
            views.setViewVisibility(R.id.widget_money_note, View.VISIBLE)
            views.setOnClickPendingIntent(R.id.widget_cur, openApp(context, id, "money"))
            ForexRefreshWorker.now(context)
            return
        }
        views.setTextViewText(R.id.widget_cur_code, "${rate.iso3} ${rate.unit}")
        views.setTextViewText(R.id.widget_rate, "रु ${Forex.rupees(rate.sell, decimals = true)}")
        val base = 100 * rate.unit
        listOf(base, base * 5, base * 10).forEachIndexed { i, amount ->
            views.setViewVisibility(amtIds[i], View.VISIBLE)
            views.setTextViewText(amtFromIds[i], "${rate.iso3} ${Forex.units(amount)}")
            views.setTextViewText(amtToIds[i], "रु ${Forex.rupees(amount / rate.unit.toDouble() * rate.sell, decimals = false)}")
            views.setOnClickPendingIntent(amtIds[i], openApp(context, id, "money", rate.iso3))
        }
        val dated = try {
            LocalDate.parse(sheet.date).format(sheetDate)
        } catch (_: Exception) {
            sheet.date
        }
        views.setTextViewText(R.id.widget_money_note, "NRB sell rate · $dated · buy ${Forex.rupees(rate.buy, decimals = true)}")
        val roomy = heightDp <= 0 || heightDp >= NOTE_MIN_HEIGHT_DP
        views.setViewVisibility(R.id.widget_money_note, if (roomy) View.VISIBLE else View.GONE)
        views.setOnClickPendingIntent(R.id.widget_cur, LekhToolsProvider.action(context, id, LekhToolsProvider.OP_CURRENCY, 0))
        views.setOnClickPendingIntent(R.id.widget_rate, openApp(context, id, "money", rate.iso3))
    }

    private fun phrase(context: Context, views: RemoteViews, id: Int, paint: WidgetPaint) {
        paint.text(views, R.id.widget_ph_en, Role.MUTED)
        paint.text(views, R.id.widget_ph_ne, Role.TEXT)
        paint.text(views, R.id.widget_ph_say, Role.MUTED)
        paint.tint(views, R.id.widget_ph_listen, Role.HEAD)
        paint.imageTint(views, R.id.widget_ph_listen_icon, Role.ON_HEAD)
        paint.tint(views, R.id.widget_ph_next, Role.CHIP)
        paint.imageTint(views, R.id.widget_ph_next_icon, Role.TEXT)
        val p = currentPhrase(context, id) ?: return
        views.setTextViewText(R.id.widget_ph_en, p.en)
        views.setNepaliText(R.id.widget_ph_ne, p.ne)
        views.setTextViewText(R.id.widget_ph_say, p.say)
        views.setOnClickPendingIntent(R.id.widget_ph_listen, LekhToolsProvider.action(context, id, LekhToolsProvider.OP_SPEAK, 0))
        views.setOnClickPendingIntent(R.id.widget_ph_next, LekhToolsProvider.action(context, id, LekhToolsProvider.OP_NEXT, 0))
    }

    private fun preeti(context: Context, views: RemoteViews, paint: WidgetPaint) {
        paint.text(views, R.id.widget_pr_title, Role.TEXT)
        paint.text(views, R.id.widget_pr_body, Role.MUTED)
        paint.tint(views, R.id.widget_pr_go, Role.HEAD)
        paint.text(views, R.id.widget_pr_go, Role.ON_HEAD)
        views.setOnClickPendingIntent(R.id.widget_pr_go, openApp(context, 0, "preeti"))
    }

    private fun date(context: Context, views: RemoteViews, paint: WidgetPaint, english: Boolean) {
        paint.text(views, R.id.widget_dt_bs, Role.TEXT)
        paint.text(views, R.id.widget_dt_ad, Role.MUTED)
        paint.tint(views, R.id.widget_dt_go, Role.HEAD)
        paint.text(views, R.id.widget_dt_go, Role.ON_HEAD)
        val today = NepaliCalendar.today()
        val weekday = NepaliCalendar.weekdayOf(today)
        val ad = NepaliCalendar.toGregorian(today).format(adLong)
        if (english) {
            FestivalsEn.load(context)
            views.setTextViewText(R.id.widget_dt_bs, "${FestivalsEn.monthNames[today.month]} ${today.day}, ${today.year}")
            views.setTextViewText(R.id.widget_dt_ad, ad)
        } else {
            val d = NepaliCalendar.toDevanagari(today.day)
            val y = NepaliCalendar.toDevanagari(today.year)
            views.setNepaliText(R.id.widget_dt_bs, "${NepaliCalendar.monthNames[today.month]} $d, $y")
            views.setNepaliText(R.id.widget_dt_ad, "${NepaliCalendar.weekdayNames[weekday]} · $ad")
        }
        views.setOnClickPendingIntent(R.id.widget_dt_go, openApp(context, 0, "date"))
    }

    /** Opens the app on one of its tools. The page reads `tool` and opens it. */
    private fun openApp(context: Context, id: Int, tool: String, currency: String? = null): PendingIntent =
        PendingIntent.getActivity(
            context,
            ("tools-open-$id-$tool").hashCode(),
            Intent(
                Intent.ACTION_VIEW,
                Uri.parse("https://lekh-gamma.vercel.app/?tab=tools&tool=$tool" + (currency?.let { "&currency=$it" } ?: "")),
            )
                .setClassName(context, "np.com.bimeshpoudel.lekh.MainActivity"),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
}
