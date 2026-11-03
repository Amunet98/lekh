package np.com.bimeshpoudel.lekh.widget

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.PI

/**
 * The moon beside the tithi (since 1.9.114), drawn at today's phase.
 *
 * The almanac gives each day's tithi by name but not its paksha, and नवमी
 * comes round twice a month. So the phase is counted from the nearest full
 * or new moon behind today, looked up in the same table: days since पुर्णिमा
 * put it in the waning half, days since औशी in the waxing one. Counting days
 * rather than tithis is off by one now and then (a tithi can be skipped or
 * repeated), which an icon this size cannot show anyway.
 *
 * The bitmap is drawn white: the lit part opaque, the dark part faint. The
 * widget tints it (ImageView.setImageTintList, API 31+), which keeps that
 * alpha and so keeps the shape, and the tint can follow light and dark mode.
 * Below API 31 there is no tint and the white is drawn grey, which reads on
 * either card.
 */
object MoonPhase {

    private val FULL = setOf("पुर्णिमा", "पूर्णिमा")
    private val NEW = setOf("औशी", "औंसी", "औँसी", "अमावस्या")

    /** Days since the last new moon, 0..29, or null outside the table. */
    fun age(date: BsDate): Int? {
        val start = NepaliCalendar.toGregorian(date)
        for (back in 0..17) {
            val day = if (back == 0) date else NepaliCalendar.fromGregorian(start.minusDays(back.toLong()))
            val tithi = Panchang.forDay(day)?.tithi?.trim() ?: return null
            if (tithi in FULL) return (15 + back) % 30
            if (tithi in NEW) return back % 30
        }
        return null
    }

    /** Waxing (शुक्ल) for the first half of the month, waning (कृष्ण) after. */
    fun isWaxing(age: Int): Boolean = age < 15

    fun paksha(age: Int, english: Boolean): String = when {
        english && isWaxing(age) -> "Shukla paksha"
        english -> "Krishna paksha"
        isWaxing(age) -> "शुक्ल पक्ष"
        else -> "कृष्ण पक्ष"
    }

    fun bitmap(sizePx: Int, age: Int, tinted: Boolean): Bitmap {
        val bmp = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val r = sizePx / 2f * 0.92f
        val cx = sizePx / 2f
        val cy = sizePx / 2f
        val lit = if (tinted) Color.WHITE else Color.rgb(0x9A, 0x9A, 0x9A)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)

        paint.color = lit
        paint.alpha = 64
        canvas.drawCircle(cx, cy, r, paint)

        // Illuminated fraction, 0 at new moon and 1 at full.
        val k = ((1 - cos(2 * PI * age / 30.0)) / 2).toFloat()
        if (k < 0.02f) return bmp
        paint.alpha = 255
        if (k > 0.98f) {
            canvas.drawCircle(cx, cy, r, paint)
            return bmp
        }
        val rx = r * abs(1 - 2 * k)
        val disc = RectF(cx - r, cy - r, cx + r, cy + r)
        val terminator = RectF(cx - rx, cy - r, cx + rx, cy + r)
        val path = Path()
        // Android angles: 0° is 3 o'clock, positive sweeps clockwise.
        // The lit limb runs from the top to the bottom on the lit side, and the
        // terminator comes back up, bulging toward the lit side for a crescent
        // and away from it for a gibbous moon.
        val waxing = isWaxing(age)
        val crescent = k < 0.5f
        path.arcTo(disc, 270f, if (waxing) 180f else -180f, false)
        val back = if (waxing == crescent) -180f else 180f
        path.arcTo(terminator, 90f, back, false)
        path.close()
        canvas.drawPath(path, paint)
        return bmp
    }
}
