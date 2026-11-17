package np.com.bimeshpoudel.lekh;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.speech.tts.TextToSpeech;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Where a phone with no Nepali voice gets one (2.0.3, read aloud).
 *
 * The text-to-speech plugin's own openInstall() fires ACTION_CHECK_TTS_DATA,
 * which asks the engine to check its data and, on Google's, shows nothing
 * a person can act on. Two screens actually fix it, depending on which
 * engine the phone speaks with:
 *
 * - Google's Speech Services is the default: its own "Install voice data"
 *   list (ACTION_INSTALL_TTS_DATA, aimed at its package), where Nepali (Nepal)
 *   is one tap to download. Checked on the emulator, 2026-11-17.
 * - Another engine is the default (Samsung ships its own, without Nepali):
 *   the system Text-to-speech settings, where the preferred engine is chosen.
 *   Installing a Google voice would not help while Samsung's is the one
 *   speaking.
 *
 * Starting an activity in a named package needs no <queries> entry; only
 * looking packages up would.
 */
@CapacitorPlugin(name = "VoiceSettings")
public class VoiceSettingsPlugin extends Plugin {

    private static final String GOOGLE_TTS = "com.google.android.tts";

    @PluginMethod
    public void open(PluginCall call) {
        getActivity()
            .runOnUiThread(() -> {
                String engine = defaultEngine();
                Intent install = new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA).setPackage(GOOGLE_TTS);
                Intent settings = new Intent("com.android.settings.TTS_SETTINGS");
                Intent first = GOOGLE_TTS.equals(engine) ? install : settings;
                Intent second = first == install ? settings : install;
                for (Intent intent : new Intent[] { first, second }) {
                    try {
                        getActivity().startActivity(intent);
                        call.resolve();
                        return;
                    } catch (ActivityNotFoundException ignored) {
                        // try the other screen
                    }
                }
                call.reject("No voice settings on this phone", "NO_VOICE_SETTINGS");
            });
    }

    /** The engine this phone speaks with by default, or null. getDefaultEngine
     *  reads the setting directly and needs no initialised engine, so the
     *  instance is shut down straight away. */
    private String defaultEngine() {
        TextToSpeech tts = null;
        try {
            tts = new TextToSpeech(getContext(), status -> {});
            return tts.getDefaultEngine();
        } catch (Exception e) {
            return null;
        } finally {
            if (tts != null) tts.shutdown();
        }
    }
}
