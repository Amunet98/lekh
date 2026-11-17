package np.com.bimeshpoudel.lekh;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import org.json.JSONObject;
import np.com.bimeshpoudel.lekh.widget.WidgetTheme;

/**
 * Handles the widget's explicit-intent deep link (see
 * BaseLekhWidgetProvider.openPatro) by pointing the WebView at the intent's
 * URL directly, rather than relying on Android App Links/Digital Asset Links
 * verification succeeding — the exact fragility already hit once with
 * assetlinks.json under the old TWA. launchMode="singleTask" means a tap
 * while already running arrives in onNewIntent, not onCreate, so both are
 * handled the same way.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        /* Before super.onCreate — that is where the Bridge is built, and it
         * only picks up plugins registered ahead of it. */
        registerPlugin(DynamicColorPlugin.class);
        registerPlugin(PrintPlugin.class);
        registerPlugin(CalendarIntentPlugin.class);
        registerPlugin(VoiceSettingsPlugin.class);
        super.onCreate(savedInstanceState);
        handleIntent(getIntent(), false);
        /* activity_main.xml's android:scrollbars="none" is not enough — the
         * Bridge re-touches the WebView's own scrollbar settings after
         * inflating that layout, so it has to be turned off again here,
         * after the bridge exists. Without this Android draws its own plain
         * View-level scroll indicator on top of the page's styled one
         * (index.css) on every scroll; the TWA never showed this because
         * that WebView instance belonged to Chrome, not this app. */
        getBridge().getWebView().setVerticalScrollBarEnabled(false);
        getBridge().getWebView().setHorizontalScrollBarEnabled(false);
    }

    /* The widget's wallpaper colours are fixed values since 1.9.113 (see
     * widget/WidgetPalette.kt). Opening the app after a theme change is the
     * surest moment to bring them up to date. ThemeWatchWorker usually got
     * there first, and then this costs twelve colour reads. */
    @Override
    public void onResume() {
        super.onResume();
        try {
            WidgetTheme.INSTANCE.refreshIfPaletteChanged(this);
        } catch (Throwable ignored) {
            // Never let a widget redraw take the app down with it.
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent, true);
    }

    /**
     * Cold: load the intent's URL. Warm (the app already running, a widget or
     * shortcut tapped): hand the URL to the page, which switches section in
     * place — loadUrl here used to restart the whole page for what is only a
     * tab change. The page answers false if it predates window.lekhOpen, and
     * then this falls back to the old reload.
     */
    private void handleIntent(Intent intent, boolean warm) {
        Uri data = intent.getData();
        if (data == null) return;
        String url = data.toString();
        WebView webView = getBridge().getWebView();
        String current = webView.getUrl();
        Uri showing = current != null ? Uri.parse(current) : null;
        if (warm && showing != null && data.getHost() != null && data.getHost().equals(showing.getHost())) {
            String js = "(function(){try{return !!(window.lekhOpen&&window.lekhOpen(" + JSONObject.quote(url) + "))}catch(e){return false}})()";
            webView.evaluateJavascript(js, result -> {
                if (!"true".equals(result)) webView.loadUrl(url);
            });
            return;
        }
        webView.loadUrl(url);
    }
}
