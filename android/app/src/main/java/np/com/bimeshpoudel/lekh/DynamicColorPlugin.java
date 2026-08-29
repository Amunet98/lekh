package np.com.bimeshpoudel.lekh;

import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;

/**
 * Hands the WebView the wallpaper-derived Material You palette.
 *
 * The web app is the same build on the phone and on the website (server.url in
 * capacitor.config.ts), so it cannot read Android resources itself — this is
 * the only route across. It returns the five system ramps whole rather than a
 * finished set of theme colours, because which shade of each ramp is safe to
 * put text on depends on the wallpaper: a blue tone-40 carries white at 7:1
 * and a yellow tone-40 carries it at 3.5:1. The choosing is done in
 * src/lib/dynamicColor.ts, by measured contrast, in one place.
 *
 * Everything is a plain constant lookup, so it resolves against the app
 * process's configuration safely: system_* colours are the wallpaper palette
 * itself and do not change between light and dark. (Light/dark is expressed by
 * *which shade* you pick — which is exactly why the widgets, whose colours are
 * resolved by the launcher and not by us, do their own light/dark split in
 * values-v31/ and values-night-v31/ instead of calling this.)
 *
 * Names are looked up by identifier rather than by the android.R.color.*
 * constants: it is 65 of them, and this way the whole thing is one loop.
 */
@CapacitorPlugin(name = "DynamicColor")
public class DynamicColorPlugin extends Plugin {
    /* accent2 is left out on purpose: nothing on the other side maps to it —
     * the app has one accent, one companion hue (accent3, for the wordmark)
     * and the two neutral ramps. See the note in dynamicColor.ts. */
    private static final String[] FAMILIES = {
        "accent1", "accent3", "neutral1", "neutral2"
    };
    /* Android's shade numbering runs the opposite way to Material's tone
     * numbering: shade 0 is white and shade 1000 is black, so shade N is
     * roughly tone (1000 - N) / 10. The JS side works in these shade numbers,
     * not tones, to keep one vocabulary end to end. */
    private static final int[] SHADES = {
        0, 10, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000
    };

    @PluginMethod
    public void getPalette(PluginCall call) {
        JSObject ret = new JSObject();

        /* Dynamic colour is Android 12 (API 31). minSdk here is 26, so this is
         * a real branch, not a formality — and the caller treats "no palette"
         * and "no plugin at all" (an older APK against a newer site) the same
         * way, by staying on Crimson & Paper. */
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            ret.put("available", false);
            call.resolve(ret);
            return;
        }

        JSObject palette = new JSObject();
        for (String family : FAMILIES) {
            JSObject ramp = new JSObject();
            for (int shade : SHADES) {
                @SuppressWarnings("DiscouragedApi")
                int id = getContext()
                    .getResources()
                    .getIdentifier("system_" + family + "_" + shade, "color", "android");
                if (id == 0) continue;
                ramp.put(String.valueOf(shade), toHex(getContext().getColor(id)));
            }
            palette.put(family, ramp);
        }

        ret.put("available", true);
        ret.put("palette", palette);
        call.resolve(ret);
    }

    /** Locale.ROOT, not the default: %X uppercases through the locale's rules. */
    private static String toHex(int color) {
        return String.format(Locale.ROOT, "#%06X", 0xFFFFFF & color);
    }
}
