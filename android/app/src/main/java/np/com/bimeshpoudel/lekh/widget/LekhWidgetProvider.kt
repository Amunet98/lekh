package np.com.bimeshpoudel.lekh.widget

import np.com.bimeshpoudel.lekh.R

/**
 * The 2x2 widget: day, month, weekday, Gregorian date, festival.
 *
 * The class name is deliberately unchanged from when this was the only
 * widget. A widget already placed on a home screen is bound to its provider's
 * component name, so renaming this class would orphan every existing instance
 * — they would vanish on update rather than migrate.
 */
class LekhWidgetProvider : BaseLekhWidgetProvider() {
    override val layoutRes = R.layout.widget_patro
}
