package com.example.drivequest;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup.LayoutParams;
import android.webkit.JsResult;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;
import androidx.webkit.WebViewAssetLoader;

public final class MainActivity extends Activity {
    private static final Uri DEMO_URL =
            Uri.parse("https://appassets.androidplatform.net/assets/moa/index.html");
    private static final int BACKGROUND = Color.rgb(243, 248, 255);

    private FrameLayout content;
    private WebView demo;
    private TextView parkedNotice;
    private ParkingRestrictions parkingRestrictions;
    private AlertDialog confirmation;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        demo = createDemoView();
        parkedNotice = new TextView(this);
        parkedNotice.setGravity(Gravity.CENTER);
        parkedNotice.setTextSize(24);
        parkedNotice.setTextColor(Color.rgb(36, 60, 86));
        parkedNotice.setBackgroundColor(BACKGROUND);
        parkedNotice.setText(R.string.parked_notice);
        parkedNotice.setVisibility(View.GONE);

        content = new FrameLayout(this);
        content.addView(demo, LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT);
        content.addView(parkedNotice, LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT);
        setContentView(content);

        if (getPackageManager().hasSystemFeature(PackageManager.FEATURE_AUTOMOTIVE)) {
            showRestriction(true);
            parkingRestrictions = new ParkingRestrictions(this, this::showRestriction);
        }
        demo.loadUrl(DEMO_URL.toString());
    }

    @SuppressLint("SetJavaScriptEnabled")
    private WebView createDemoView() {
        WebViewAssetLoader assets = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        WebView webView = new WebView(this);
        webView.setBackgroundColor(BACKGROUND);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assets.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !DEMO_URL.equals(request.getUrl().buildUpon().fragment(null).build());
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                if (parkedNotice.getVisibility() == View.VISIBLE) {
                    result.cancel();
                    return true;
                }

                confirmation = new AlertDialog.Builder(MainActivity.this)
                        .setMessage(message)
                        .setPositiveButton(R.string.confirm, (dialog, which) -> result.confirm())
                        .setNegativeButton(android.R.string.cancel, (dialog, which) -> result.cancel())
                        .setOnCancelListener(dialog -> result.cancel())
                        .create();
                confirmation.setOnDismissListener(dialog -> confirmation = null);
                confirmation.show();
                return true;
            }
        });
        return webView;
    }

    private void showRestriction(boolean restricted) {
        if (restricted) {
            if (confirmation != null) {
                confirmation.cancel();
            }
            demo.evaluateJavascript("pauseSimulation()", null);
        }
        demo.setVisibility(restricted ? View.GONE : View.VISIBLE);
        parkedNotice.setVisibility(restricted ? View.VISIBLE : View.GONE);
    }

    @Override
    protected void onResume() {
        super.onResume();
        demo.onResume();
    }

    @Override
    protected void onPause() {
        demo.evaluateJavascript("pauseSimulation()", null);
        demo.onPause();
        super.onPause();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (parkedNotice.getVisibility() == View.VISIBLE) {
            finish();
            return;
        }
        demo.evaluateJavascript("handleDemoBack()", handled -> {
            if (!"true".equals(handled)) {
                finish();
            }
        });
    }

    @Override
    protected void onDestroy() {
        if (parkingRestrictions != null) {
            parkingRestrictions.close();
        }
        if (confirmation != null) {
            confirmation.cancel();
        }
        content.removeView(demo);
        demo.destroy();
        super.onDestroy();
    }
}
