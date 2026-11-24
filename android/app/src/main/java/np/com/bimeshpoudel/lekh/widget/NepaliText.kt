package np.com.bimeshpoudel.lekh.widget

import android.text.SpannableString
import android.text.Spanned
import android.text.style.LocaleSpan
import android.widget.RemoteViews
import java.util.Locale

/*
 * Nepali numerals in the widgets, matching the app (2.0.21).
 *
 * The app draws every Devanagari numeral in Noto Sans Devanagari's NEPALI
 * forms: the flat-topped ८ and the Nepali ५ (see 'Lekh Digits' in
 * src/index.css). Widgets are drawn by the launcher in the system font. On
 * Android that is the same Noto Sans Devanagari, but it picks the Nepali
 * forms only when the text's locale is Nepali, and with the phone in English
 * the widget showed the Hindi ८ beside an app that had stopped using it.
 *
 * So each run of digits carries a LocaleSpan(ne-NP). LocaleSpan is a
 * ParcelableSpan, so it survives RemoteViews to the launcher, which shapes
 * those runs with the Nepali forms.
 *
 * Digits only, not the whole string. Tagging the whole text also switched
 * Noto's conjuncts to their Nepali forms: मङ्गल lost its stacked ङ्ग and
 * showed a visible halant (measured on the emulator). The owner asked for the
 * numerals to change, not the letters.
 *
 * A bundled font was tried first and does not work: android:fontFamily
 * pointing at res/font is ignored when the launcher inflates the widget (the
 * placed widget kept the Hindi ८ with the font alone, API 36 emulator). The
 * widget picker's previews are static XML, so they cannot carry a span
 * either. They keep the system ८ until a widget is placed.
 */
private val NEPALI: Locale = Locale.forLanguageTag("ne-NP")

private fun isDigit(c: Char) = c in '\u0966'..'\u096F'

internal fun nepali(text: CharSequence): CharSequence {
    if (text.none(::isDigit)) return text
    val out = SpannableString(text)
    var i = 0
    while (i < text.length) {
        if (!isDigit(text[i])) { i++; continue }
        val start = i
        while (i < text.length && isDigit(text[i])) i++
        out.setSpan(LocaleSpan(NEPALI), start, i, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
    }
    return out
}

/** setTextViewText with its digits tagged as Nepali — see [nepali]. */
internal fun RemoteViews.setNepaliText(viewId: Int, text: CharSequence) =
    setTextViewText(viewId, nepali(text))
