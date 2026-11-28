package np.com.bimeshpoudel.lekh.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.SizeF
import java.util.Locale

/**
 * The Tools widget (2.0.25). Drawn by ToolsRenderer; this class handles the
 * taps, which arrive as explicit broadcasts to itself (no intent filter
 * needed): a tab, the currency button, the next phrase, and Listen.
 *
 * Listen speaks from here, without opening the app. A broadcast receiver
 * may keep working for ~10 seconds after goAsync(), which is plenty to bind
 * the system text-to-speech engine and say one short phrase; a guard ends it
 * at nine seconds whatever happens. Nepali when the phone has that voice,
 * as the app's own read-aloud does; Hindi otherwise, which reads Devanagari.
 */
class LekhToolsProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        for (id in ids) manager.updateAppWidget(id, ToolsRenderer.build(context, id, heightOf(manager.getAppWidgetOptions(id))))
        ForexRefreshWorker.schedule(context)
        if (Forex.cached(context) == null) ForexRefreshWorker.now(context)
        ThemeWatchWorker.schedule(context)
    }

    override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: Bundle) {
        super.onAppWidgetOptionsChanged(context, manager, id, options)
        manager.updateAppWidget(id, ToolsRenderer.build(context, id, heightOf(options)))
    }

    override fun onDeleted(context: Context, ids: IntArray) = ToolsRenderer.forget(context, ids)

    override fun onDisabled(context: Context) {
        ForexRefreshWorker.cancel(context)
        if (!WidgetTheme.anyPlaced(context)) ThemeWatchWorker.cancel(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        when (intent.action) {
            ACTION -> handle(context, intent)
            // The Date tab and the phrase of the day both change at midnight.
            Intent.ACTION_DATE_CHANGED, Intent.ACTION_TIME_CHANGED, Intent.ACTION_TIMEZONE_CHANGED ->
                ToolsRenderer.refreshAll(context)
        }
    }

    private fun handle(context: Context, intent: Intent) {
        val id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        if (id == AppWidgetManager.INVALID_APPWIDGET_ID) return
        val arg = intent.getIntExtra(EXTRA_ARG, 0)
        when (intent.getStringExtra(EXTRA_OP)) {
            OP_TAB -> ToolsRenderer.setTab(context, id, arg.coerceIn(0, 3))
            OP_CURRENCY -> ToolsRenderer.nextCurrency(context, id)
            OP_NEXT -> ToolsRenderer.nextPhrase(context, id)
            OP_SPEAK -> {
                ToolsRenderer.currentPhrase(context, id)?.let { speak(context, it.ne) }
                return
            }
            else -> return
        }
        val manager = AppWidgetManager.getInstance(context)
        manager.updateAppWidget(id, ToolsRenderer.build(context, id, heightOf(manager.getAppWidgetOptions(id))))
    }

    private fun speak(context: Context, text: String) {
        val pending = goAsync()
        val main = Handler(Looper.getMainLooper())
        var tts: TextToSpeech? = null
        var finished = false
        fun done() {
            if (finished) return
            finished = true
            try {
                tts?.shutdown()
            } catch (_: Exception) {
            }
            pending.finish()
        }
        main.postDelayed({ done() }, 9_000)
        try {
            tts = TextToSpeech(context.applicationContext) { status ->
                val engine = tts
                if (status != TextToSpeech.SUCCESS || engine == null) {
                    done()
                    return@TextToSpeech
                }
                val nepali = Locale("ne", "NP")
                engine.language =
                    if (engine.isLanguageAvailable(nepali) >= TextToSpeech.LANG_AVAILABLE) nepali else Locale("hi", "IN")
                engine.setSpeechRate(0.9f)
                engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) {}
                    override fun onDone(utteranceId: String?) {
                        main.post { done() }
                    }
                    @Deprecated("Deprecated in Java")
                    override fun onError(utteranceId: String?) {
                        main.post { done() }
                    }
                })
                if (engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, "lekh-widget") != TextToSpeech.SUCCESS) done()
            }
        } catch (_: Exception) {
            done()
        }
    }

    companion object {
        const val ACTION = "np.com.bimeshpoudel.lekh.widget.TOOLS"
        const val EXTRA_OP = "op"
        const val EXTRA_ARG = "arg"
        const val OP_TAB = "tab"
        const val OP_CURRENCY = "currency"
        const val OP_NEXT = "next"
        const val OP_SPEAK = "speak"

        /** A tap on the widget, delivered back to this provider. The data URI
         *  makes every (widget, op, arg) its own PendingIntent: extras alone do
         *  not, and the tabs would all end up sending the last one built. */
        fun action(context: Context, id: Int, op: String, arg: Int): PendingIntent =
            PendingIntent.getBroadcast(
                context,
                0,
                Intent(context, LekhToolsProvider::class.java)
                    .setAction(ACTION)
                    .setData(Uri.parse("lekh-tools://$id/$op/$arg"))
                    .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
                    .putExtra(EXTRA_OP, op)
                    .putExtra(EXTRA_ARG, arg),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )

        /** The smallest height this instance is drawn at, as
         *  BaseLekhWidgetProvider.heightOf. */
        fun heightOf(options: Bundle): Int {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                @Suppress("DEPRECATION")
                val sizes = options.getParcelableArrayList<SizeF>(AppWidgetManager.OPTION_APPWIDGET_SIZES)
                val least = sizes?.minOfOrNull { it.height }
                if (least != null && least > 0f) return least.toInt()
            }
            return listOf(
                options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0),
                options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0),
            ).filter { it > 0 }.minOrNull() ?: 0
        }
    }
}
