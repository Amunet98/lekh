package np.com.bimeshpoudel.lekh.widget

import android.content.Context
import android.os.Build
import android.provider.Settings
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.time.Duration

/**
 * Redraws the widgets when the system's wallpaper colours change, while one
 * is placed.
 *
 * Since 1.9.113 the widget's Material You colours are values picked at draw
 * time (see WidgetPalette), so nothing repaints them by itself. Android has
 * no broadcast for a theme change that a manifest receiver can hear.
 * SystemUI does record every change, including a new wallpaper when colours
 * come from it, in the Secure setting below. A content-URI trigger on that
 * setting wakes this worker without keeping a process alive.
 *
 * The delay is there because SystemUI writes the setting first and applies
 * the overlays after. Reading the colours too soon would read the old ones.
 *
 * Content-trigger work runs once, so each run queues the next one. If the
 * setting cannot be watched on some OEM build, nothing breaks: the widget
 * still catches up when the app is opened and at its midnight redraw.
 */
class ThemeWatchWorker(context: Context, params: WorkerParameters) : Worker(context, params) {

    override fun doWork(): Result {
        try {
            WidgetTheme.refreshIfPaletteChanged(applicationContext)
        } catch (_: Throwable) {
            // A failed redraw is not worth a crash; the next trigger tries again.
        }
        if (WidgetTheme.anyPlaced(applicationContext)) enqueue(applicationContext, ExistingWorkPolicy.APPEND_OR_REPLACE)
        return Result.success()
    }

    companion object {
        private const val WORK_NAME = "theme-watch"
        private const val SETTING = "theme_customization_overlay_packages"

        /** Idempotent (KEEP), so it is safe on every widget update. */
        fun schedule(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
            enqueue(context, ExistingWorkPolicy.KEEP)
        }

        private fun enqueue(context: Context, policy: ExistingWorkPolicy) {
            try {
                val constraints = Constraints.Builder()
                    .addContentUriTrigger(Settings.Secure.getUriFor(SETTING), false)
                    .setTriggerContentUpdateDelay(Duration.ofSeconds(5))
                    .setTriggerContentMaxDelay(Duration.ofSeconds(30))
                    .build()
                val request = OneTimeWorkRequestBuilder<ThemeWatchWorker>().setConstraints(constraints).build()
                WorkManager.getInstance(context).enqueueUniqueWork(WORK_NAME, policy, request)
            } catch (_: Throwable) {
                // Same rule as PanchangRefreshWorker: the widget must never crash over this.
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
