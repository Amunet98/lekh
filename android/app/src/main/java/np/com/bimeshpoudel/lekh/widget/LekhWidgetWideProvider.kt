package np.com.bimeshpoudel.lekh.widget

import np.com.bimeshpoudel.lekh.R

/**
 * The 4x1 widget: a full-width strip — date, month, weekday, and the festival
 * filling whatever width is left. No Gregorian date or tithi; one cell of
 * height does not have the rows for them.
 *
 * Vertical resize is still allowed (see widget_info_wide.xml) but there is no
 * [expandedLayoutRes]: this row's root already centers vertically in
 * whatever height it is given, and there is nothing this size can gain from
 * extra height that the 5x1's expanded form does not already cover — so
 * dragging it taller just gives the same row more breathing room instead of
 * switching to a second, denser layout.
 */
class LekhWidgetWideProvider : BaseLekhWidgetProvider() {
    override val layoutRes = R.layout.widget_patro_wide
}
