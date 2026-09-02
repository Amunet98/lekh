package np.com.bimeshpoudel.lekh;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.webkit.WebView;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * window.print(), for a WebView that does not have one.
 *
 * Android's WebView implements no print entry point at all — window.print() is
 * not "unsupported and throws", it is a silent no-op. The Translate tab's
 * "Save as PDF" therefore did nothing whatsoever inside the app while working
 * in the browser, and there was no way to tell from the JS side that the call
 * had gone nowhere.
 *
 * PrintManager with the WebView's own print adapter is the same rendering path
 * Chrome uses: it lays the page out for the print medium, so the print-only
 * sheet and the @media print rules in DownloadActions.css do their job
 * unchanged, and the system dialog's "Save as PDF" destination produces the
 * file. This is why the app renders the PDF through the browser engine at all
 * — jsPDF and pdf-lib cannot shape Devanagari (see printPdf in
 * DownloadActions.tsx).
 */
@CapacitorPlugin(name = "Print")
public class PrintPlugin extends Plugin {

    @PluginMethod
    public void print(PluginCall call) {
        String jobName = call.getString("name", "Lekh Patro");

        /* PrintManager touches the view hierarchy, so it has to be on the UI
         * thread — plugin methods arrive on the bridge's own thread. */
        getActivity()
            .runOnUiThread(() -> {
                try {
                    WebView webView = getBridge().getWebView();
                    PrintManager printManager = (PrintManager) getContext()
                        .getSystemService(Context.PRINT_SERVICE);
                    if (printManager == null) {
                        call.reject("Printing is not available on this device");
                        return;
                    }
                    printManager.print(
                        jobName,
                        webView.createPrintDocumentAdapter(jobName),
                        new PrintAttributes.Builder().build()
                    );
                    /* Resolves once the dialog is handed over, not once a file
                     * exists — the system owns everything after this point and
                     * reports nothing back. The caller must not claim a PDF was
                     * saved on the strength of this. */
                    call.resolve();
                } catch (Exception e) {
                    call.reject("Could not open the print dialog", e);
                }
            });
    }
}
