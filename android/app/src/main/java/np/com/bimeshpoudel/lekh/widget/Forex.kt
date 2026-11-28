package np.com.bimeshpoudel.lekh.widget

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate
import java.time.ZoneId
import java.util.concurrent.TimeUnit

/**
 * Nepal Rastra Bank's exchange rates for the Tools widget's Money tab
 * (2.0.25), the native twin of src/lib/forex.ts: the same public API, the
 * same week-long look-back, the same field-by-field checks, the same
 * "newest sheet wins". The request carries a date range and nothing else.
 *
 * The last good sheet is kept in SharedPreferences, so the widget shows a
 * dated rate offline rather than nothing, as the app does.
 */
internal object Forex {

    data class Rate(val iso3: String, val unit: Int, val buy: Double, val sell: Double)
    data class Sheet(val date: String, val rates: List<Rate>)

    private const val PREFS = "lekh_forex"
    private const val KEY_SHEET = "sheet"
    private const val API = "https://www.nrb.org.np/api/forex/v1/rates"
    private const val LOOKBACK_DAYS = 7L
    private const val MAX_BYTES = 512 * 1024
    private val NEPAL: ZoneId = ZoneId.of("Asia/Kathmandu")

    /** The cycle the widget's currency button steps through: the ones people
     *  in Nepal most often send or receive first, then NRB's own order. */
    private val PREFERRED = listOf("USD", "INR", "EUR", "GBP", "AUD", "CAD", "QAR", "AED", "SAR", "MYR", "KRW", "JPY", "CNY")

    fun cached(context: Context): Sheet? = try {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_SHEET, null)?.let { parseCache(it) }
    } catch (_: Exception) {
        null
    }

    /** The rates in the order the widget cycles them. */
    fun ordered(sheet: Sheet): List<Rate> {
        val byCode = sheet.rates.associateBy { it.iso3 }
        val first = PREFERRED.mapNotNull { byCode[it] }
        return first + sheet.rates.filter { it.iso3 !in PREFERRED }
    }

    /** Fetches the newest sheet and caches it. Throws when NRB cannot be
     *  reached or answers with nothing usable. */
    fun refresh(context: Context): Sheet {
        val today = LocalDate.now(NEPAL)
        val from = today.minusDays(LOOKBACK_DAYS)
        val url = "$API?from=$from&to=$today&per_page=${LOOKBACK_DAYS + 1}&page=1"
        val sheet = parseNrb(JSONObject(download(url))) ?: throw IOException("no usable sheet")
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_SHEET, toCache(sheet)).apply()
        return sheet
    }

    private fun download(url: String): String {
        val connection = URL(url).openConnection() as HttpURLConnection
        try {
            connection.connectTimeout = 15_000
            connection.readTimeout = 15_000
            if (connection.responseCode != HttpURLConnection.HTTP_OK) throw IOException("HTTP ${connection.responseCode}")
            val out = ByteArrayOutputStream()
            connection.inputStream.use { input ->
                val buffer = ByteArray(16 * 1024)
                while (true) {
                    val n = input.read(buffer)
                    if (n < 0) break
                    out.write(buffer, 0, n)
                    if (out.size() > MAX_BYTES) throw IOException("too large")
                }
            }
            return out.toString(Charsets.UTF_8.name())
        } finally {
            connection.disconnect()
        }
    }

    /** The newest usable sheet in an NRB answer, validated as forex.ts does:
     *  a rate that parsed to nothing would become a confident wrong number. */
    internal fun parseNrb(json: JSONObject): Sheet? {
        val payload = json.optJSONObject("data")?.optJSONArray("payload") ?: return null
        val sheets = mutableListOf<Sheet>()
        for (i in 0 until payload.length()) {
            val day = payload.optJSONObject(i) ?: continue
            val date = day.optString("date").takeIf { it.matches(Regex("[0-9]{4}-[0-9]{2}-[0-9]{2}")) } ?: continue
            val list = day.optJSONArray("rates") ?: continue
            val rates = mutableListOf<Rate>()
            for (j in 0 until list.length()) {
                val r = list.optJSONObject(j) ?: continue
                val cur = r.optJSONObject("currency") ?: continue
                val iso3 = cur.optString("iso3")
                val unit = cur.optString("unit").toIntOrNull() ?: cur.optInt("unit", 0)
                val buy = r.optString("buy").toDoubleOrNull() ?: 0.0
                val sell = r.optString("sell").toDoubleOrNull() ?: 0.0
                if (!iso3.matches(Regex("[A-Z]{3}")) || unit <= 0 || buy <= 0 || sell <= 0) continue
                rates += Rate(iso3, unit, buy, sell)
            }
            if (rates.isNotEmpty()) sheets += Sheet(date, rates)
        }
        return sheets.maxByOrNull { it.date }
    }

    private fun toCache(sheet: Sheet): String = JSONObject()
        .put("date", sheet.date)
        .put("rates", JSONArray().apply {
            sheet.rates.forEach {
                put(JSONObject().put("iso3", it.iso3).put("unit", it.unit).put("buy", it.buy).put("sell", it.sell))
            }
        }).toString()

    private fun parseCache(text: String): Sheet? {
        val json = JSONObject(text)
        val list = json.getJSONArray("rates")
        val rates = (0 until list.length()).map {
            val r = list.getJSONObject(it)
            Rate(r.getString("iso3"), r.getInt("unit"), r.getDouble("buy"), r.getDouble("sell"))
        }
        return if (rates.isEmpty()) null else Sheet(json.getString("date"), rates)
    }

    /** Rupees the Indian way, as Nepal writes them: 1,48,220. */
    fun rupees(amount: Double, decimals: Boolean): String {
        val paisa = Math.round(amount * 100)
        val whole = if (decimals) paisa / 100 else Math.round(amount)
        val digits = whole.toString()
        val grouped = if (digits.length <= 3) digits else {
            val head = digits.dropLast(3)
            val tail = digits.takeLast(3)
            head.reversed().chunked(2).joinToString(",").reversed() + "," + tail
        }
        if (!decimals) return grouped
        return "$grouped.${(paisa % 100).toString().padStart(2, '0')}"
    }

    /** A whole amount of a foreign currency, grouped as Nepal groups any
     *  number (1,00,000), so the two sides of a row read the same way. */
    fun units(amount: Int): String = rupees(amount.toDouble(), decimals = false)
}

/** Keeps the cached sheet fresh for the Tools widget: twice a day on any
 *  network, then redraws the widget. */
class ForexRefreshWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result = try {
        Forex.refresh(applicationContext)
        ToolsRenderer.refreshAll(applicationContext)
        Result.success()
    } catch (_: Exception) {
        if (runAttemptCount < 3) Result.retry() else Result.failure()
    }

    companion object {
        private const val PERIODIC = "forex-refresh"
        private const val NOW = "forex-refresh-now"
        private val network = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

        /** Idempotent, like PanchangRefreshWorker.schedule. */
        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<ForexRefreshWorker>(12, TimeUnit.HOURS)
                .setConstraints(network).build()
            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP, request)
        }

        /** One fetch as soon as there is a network: the first placement, when
         *  there is no sheet yet to show. */
        fun now(context: Context) {
            val request = OneTimeWorkRequestBuilder<ForexRefreshWorker>().setConstraints(network).build()
            WorkManager.getInstance(context).enqueueUniqueWork(NOW, ExistingWorkPolicy.KEEP, request)
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(PERIODIC)
        }
    }
}
