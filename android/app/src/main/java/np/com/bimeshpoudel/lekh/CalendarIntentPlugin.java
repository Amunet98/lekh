package np.com.bimeshpoudel.lekh;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.provider.CalendarContract;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Calendar;

/**
 * "add to calendar", for a button that could not.
 *
 * The Patro detail panel used to write a .ics file and hand it to saveFile(),
 * which inside the app means the system share sheet. Measured on a phone: that
 * sheet offered Bluetooth, Discord, Drive, Gmail, Messages, Quick Share,
 * Telegram, Viber and WhatsApp — and no calendar app at all. Nothing on the
 * device had registered for text/calendar, so the one thing the button is
 * named after was the one thing it could not do.
 *
 * ACTION_INSERT on CalendarContract.Events is the intent Android actually
 * defines for this. It opens the calendar app's own new-event screen with the
 * fields filled in, the user saves it there, and it needs no calendar
 * permission precisely because the write happens in their app, not ours.
 *
 * The date arrives as a plain "YYYY-MM-DD" string rather than epoch millis on
 * purpose. Nepal is UTC+05:45, and an all-day event wants *local* midnight —
 * building the instant here from calendar fields is the same reason
 * CalendarPage.icsDate reads getFullYear/getMonth/getDate instead of
 * toISOString.
 */
@CapacitorPlugin(name = "CalendarIntent")
public class CalendarIntentPlugin extends Plugin {

    @PluginMethod
    public void addEvent(PluginCall call) {
        String title = call.getString("title", "");
        String date = call.getString("date");
        if (date == null) {
            call.reject("No date given");
            return;
        }

        long begin;
        long end;
        try {
            String[] parts = date.split("-");
            Calendar cal = Calendar.getInstance();
            cal.clear();
            cal.set(
                Integer.parseInt(parts[0]),
                Integer.parseInt(parts[1]) - 1,
                Integer.parseInt(parts[2])
            );
            begin = cal.getTimeInMillis();
            cal.add(Calendar.DAY_OF_MONTH, 1);
            end = cal.getTimeInMillis();
        } catch (Exception e) {
            call.reject("Could not read the date", e);
            return;
        }

        final long beginAt = begin;
        final long endAt = end;

        /* startActivity touches the activity, so it belongs on the UI thread —
         * plugin methods arrive on the bridge's own thread. */
        getActivity()
            .runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_INSERT)
                    .setData(CalendarContract.Events.CONTENT_URI)
                    .putExtra(CalendarContract.Events.TITLE, title)
                    .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, beginAt)
                    .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, endAt)
                    .putExtra(CalendarContract.EXTRA_EVENT_ALL_DAY, true);
                try {
                    getActivity().startActivity(intent);
                    call.resolve();
                } catch (ActivityNotFoundException e) {
                    /* No calendar app on the device. Rejecting rather than
                     * swallowing is what lets the JS side fall back to the
                     * .ics file, which at least reaches a calendar on another
                     * machine. resolveActivity() is deliberately not used to
                     * pre-check: Android 11+ package visibility would need a
                     * <queries> entry to answer honestly, and catching the
                     * throw needs no manifest change to stay correct. */
                    call.reject("No calendar app", "NO_CALENDAR_APP", e);
                }
            });
    }
}
