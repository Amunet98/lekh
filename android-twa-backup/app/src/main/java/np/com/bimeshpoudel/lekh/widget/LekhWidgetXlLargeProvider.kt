package np.com.bimeshpoudel.lekh.widget

import np.com.bimeshpoudel.lekh.R

/**
 * The 5x2 widget: everything the 4x2 shows, plus the upcoming festival and a
 * strip of the current week with today marked. The largest size, and the only
 * one wide enough for seven columns.
 */
class LekhWidgetXlLargeProvider : BaseLekhWidgetProvider() {
    override val layoutRes = R.layout.widget_patro_xl_large
}
