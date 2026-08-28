package np.com.bimeshpoudel.lekh.widget

import np.com.bimeshpoudel.lekh.R

/**
 * The 5x1 widget: the 4x1 strip plus the upcoming festival and how far off it
 * is. A four-column launcher clamps it to four cells rather than hiding it,
 * which is why the 4x1 stays rather than being replaced by this.
 *
 * Dragged taller, it switches to [expandedLayoutRes] — the same detail the
 * 4x1 gains, plus a week strip — instead of just centering the same row in
 * more space. See BaseLekhWidgetProvider's EXPANDING ON RESIZE.
 */
class LekhWidgetXlProvider : BaseLekhWidgetProvider() {
    override val layoutRes = R.layout.widget_patro_xl
    override val expandedLayoutRes = R.layout.widget_patro_xl_expanded
}
