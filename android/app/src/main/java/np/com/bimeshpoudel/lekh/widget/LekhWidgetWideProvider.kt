package np.com.bimeshpoudel.lekh.widget

import np.com.bimeshpoudel.lekh.R

/**
 * The 4x1 widget: a full-width strip — date, month, weekday, and the festival
 * filling whatever width is left. No Gregorian date or tithi; one cell of
 * height does not have the rows for them.
 */
class LekhWidgetWideProvider : BaseLekhWidgetProvider() {
    override val layoutRes = R.layout.widget_patro_wide
}
