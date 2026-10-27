package np.com.bimeshpoudel.lekh.widget

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit

/**
 * Once a day, while at least one widget is placed: fetch the festival table
 * from the site and hand it to [Panchang.install], which keeps it only if it
 * is valid and newer than what the widget already has.
 *
 * The file is `src/data/calendar/panchang.json`, published by every web
 * deploy (see the `calendar-feed` plugin in vite.config.ts), so it is the
 * exact table the Patro tab is showing — corrections included. It is a plain
 * download from the host the app itself is served from; nothing about the
 * phone or its owner goes with it.
 *
 * WorkManager rather than a fetch in onUpdate: a widget update runs on the
 * main thread and must never wait on a network. This runs in the background,
 * only on a connected network, and the OS batches it with other work.
 */
class PanchangRefreshWorker(context: Context, params: WorkerParameters) : Worker(context, params) {

    override fun doWork(): Result {
        val text = try {
            download()
        } catch (_: IOException) {
            return Result.retry()
        }
        if (Panchang.install(applicationContext, text)) WidgetTheme.refreshAll(applicationContext)
        return Result.success()
    }

    private fun download(): String {
        val connection = URL(FEED).openConnection() as HttpURLConnection
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
                    // The table is ~72 KB; anything this size is not it.
                    if (out.size() > MAX_BYTES) throw IOException("too large")
                }
            }
            return out.toString(Charsets.UTF_8.name())
        } finally {
            connection.disconnect()
        }
    }

    companion object {
        /* Versioned path: if the table's shape ever changes, it moves to v2
           and phones on an old APK keep reading the v1 they understand. */
        private const val FEED = "https://lekh-gamma.vercel.app/calendar/v1/panchang.json"
        private const val MAX_BYTES = 2 * 1024 * 1024
        private const val WORK_NAME = "panchang-refresh"

        /** Idempotent — KEEP leaves an already-scheduled job alone — so it is
         *  safe to call on every widget update. */
        fun schedule(context: Context) {
            try {
                val request = PeriodicWorkRequestBuilder<PanchangRefreshWorker>(1, TimeUnit.DAYS)
                    .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                    .build()
                WorkManager.getInstance(context)
                    .enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.KEEP, request)
            } catch (_: Throwable) {
                // A widget must never crash the app over a refresh; the bundled table still works.
            }
        }

        fun cancel(context: Context) {
            try {
                WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
            } catch (_: Throwable) {
            }
        }
    }
}
