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
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
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
