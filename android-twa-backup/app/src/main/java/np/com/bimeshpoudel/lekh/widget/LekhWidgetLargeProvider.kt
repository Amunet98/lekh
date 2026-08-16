package np.com.bimeshpoudel.lekh.widget

import np.com.bimeshpoudel.lekh.R

/**
 * The 4x2 widget: the date on the left, and the room the others do not have
 * for tithi and a festival name that is not truncated.
 */
class LekhWidgetLargeProvider : BaseLekhWidgetProvider() {
    override val layoutRes = R.layout.widget_patro_large
}
