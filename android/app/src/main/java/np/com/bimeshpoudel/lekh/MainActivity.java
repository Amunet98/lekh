package np.com.bimeshpoudel.lekh;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

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
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
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

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        Uri data = intent.getData();
        if (data != null) {
            getBridge().getWebView().loadUrl(data.toString());
        }
    }
}
