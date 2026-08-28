package np.com.bimeshpoudel.lekh.widget

import np.com.bimeshpoudel.lekh.R

/**
 * The 4x1 widget: a full-width strip — date, month, weekday, and the festival
 * filling whatever width is left. No Gregorian date or tithi; one cell of
 * height does not have the rows for them.
 *
 * Dragged taller, it switches to [expandedLayoutRes] instead — see
 * BaseLekhWidgetProvider's EXPANDING ON RESIZE.
 */
class LekhWidgetWideProvider : BaseLekhWidgetProvider() {
    override val layoutRes = R.layout.widget_patro_wide
    override val expandedLayoutRes = R.layout.widget_patro_wide_expanded
}
