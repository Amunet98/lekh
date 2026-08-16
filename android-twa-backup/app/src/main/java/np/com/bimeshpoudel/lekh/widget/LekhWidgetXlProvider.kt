package np.com.bimeshpoudel.lekh.widget

import np.com.bimeshpoudel.lekh.R

/**
 * The 5x1 widget: the 4x1 strip plus the upcoming festival and how far off it
 * is. A four-column launcher clamps it to four cells rather than hiding it,
 * which is why the 4x1 stays rather than being replaced by this.
 */
class LekhWidgetXlProvider : BaseLekhWidgetProvider() {
    override val layoutRes = R.layout.widget_patro_xl
}
