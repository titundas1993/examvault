package com.examvault.education;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;

public class MainActivity extends Activity {

    private WebView webView;
    private ProgressBar progressBar;
    private String appUrl = "${APP_URL}";
    private String admobInterstitialId = "${ADMOB_INTERSTITIAL_ID}";

    // Interstitial ad
    private InterstitialAd mInterstitialAd;
    private int navigationCount = 0;
    private static final int INTERSTITIAL_INTERVAL = 2; // Show ad every N navigations

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep screen on
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Initialize layout
        setupUI();

        // Initialize AdMob
        MobileAds.initialize(this, initializationStatus -> {
            // AdMob initialized, load first interstitial
            loadInterstitialAd();
        });

        // Setup WebView
        setupWebView();

        // Load the app URL
        if (isNetworkAvailable()) {
            webView.loadUrl(appUrl);
        } else {
            showErrorDialog("No Internet Connection",
                "Please check your internet connection and try again.");
        }
    }

    private void setupUI() {
        // Create a simple layout with progress bar and WebView
        android.widget.RelativeLayout layout = new android.widget.RelativeLayout(this);

        // Progress bar
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setId(View.generateViewId());
        progressBar.setMax(100);
        android.widget.RelativeLayout.LayoutParams pbParams =
            new android.widget.RelativeLayout.LayoutParams(
                android.widget.RelativeLayout.LayoutParams.MATCH_PARENT,
                8);
        pbParams.addRule(android.widget.RelativeLayout.ALIGN_PARENT_TOP);
        layout.addView(progressBar, pbParams);

        // WebView
        webView = new WebView(this);
        android.widget.RelativeLayout.LayoutParams wvParams =
            new android.widget.RelativeLayout.LayoutParams(
                android.widget.RelativeLayout.LayoutParams.MATCH_PARENT,
                android.widget.RelativeLayout.LayoutParams.MATCH_PARENT);
        wvParams.addRule(android.widget.RelativeLayout.BELOW, progressBar.getId());
        layout.addView(webView, wvParams);

        setContentView(layout);
    }

    private void setupWebView() {
        WebSettings settings = webView.getSettings();

        // Enable JavaScript
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);

        // Enable caching
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAppCacheEnabled(true);
        settings.setAppCachePath(getCacheDir().getAbsolutePath());

        // Responsive
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.TEXT_AUTOSIZING);

        // Allow file access for service worker
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        // Mixed content
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }

        // Register JavaScript interface for ad bridge and back button
        webView.addJavascriptInterface(new AdWebInterface(), "AndroidBridge");

        // WebViewClient
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();

                // Only allow our app URLs
                if (url.startsWith(appUrl) || url.contains("firebaseio.com") ||
                    url.contains("googleapis.com") || url.contains("google.com") ||
                    url.contains("razorpay.com")) {
                    return false; // Load in WebView
                }

                // Open external links in browser
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                startActivity(intent);
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                progressBar.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                progressBar.setVisibility(View.GONE);

                // Inject a small JS to set a flag so the web app knows it's inside Android WebView
                webView.evaluateJavascript(
                    "window.__EV_ANDROID_WEBVIEW = true;", null);
            }
        });

        // WebChromeClient for progress and console
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
                if (newProgress == 100) {
                    progressBar.setVisibility(View.GONE);
                }
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                // Log console messages for debugging
                android.util.Log.d("ExamVault-Web", consoleMessage.message());
                return true;
            }
        });
    }

    // ==================== AdMob Interstitial ====================

    private void loadInterstitialAd() {
        AdRequest adRequest = new AdRequest.Builder().build();
        InterstitialAd.load(this, admobInterstitialId, adRequest,
            new InterstitialAdLoadCallback() {
                @Override
                public void onAdLoaded(InterstitialAd interstitialAd) {
                    mInterstitialAd = interstitialAd;
                    mInterstitialAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                        @Override
                        public void onAdDismissedFullScreenContent() {
                            // Ad dismissed, load the next one
                            mInterstitialAd = null;
                            loadInterstitialAd();
                        }

                        @Override
                        public void onAdFailedToShowFullScreenContent(AdError adError) {
                            mInterstitialAd = null;
                            loadInterstitialAd();
                        }

                        @Override
                        public void onAdShowedFullScreenContent() {
                            // Ad shown
                        }
                    });
                }

                @Override
                public void onAdFailedToLoad(LoadAdError loadAdError) {
                    mInterstitialAd = null;
                    // Retry after a delay
                    webView.postDelayed(() -> loadInterstitialAd(), 30000);
                }
            });
    }

    private void showInterstitialAd() {
        if (mInterstitialAd != null) {
            mInterstitialAd.show(this);
        } else {
            // Ad not ready, try loading
            loadInterstitialAd();
        }
    }

    // Called from JavaScript when user navigates between views
    private void onNavigationEvent() {
        navigationCount++;
        if (navigationCount % INTERSTITIAL_INTERVAL == 0) {
            // Check if user is premium before showing ad
            webView.post(() -> {
                webView.evaluateJavascript(
                    "window.__EV_PREMIUM === true ? 'premium' : 'free'",
                    result -> {
                        String trimmed = result != null ? result.replace("\"", "").trim() : "free";
                        if (!"premium".equals(trimmed)) {
                            showInterstitialAd();
                        }
                    });
            });
        }
    }

    // ==================== JavaScript Interface ====================

    public class AdWebInterface {
        @JavascriptInterface
        public void onNavigate() {
            onNavigationEvent();
        }
    }

    // ==================== Back Button Handling ====================

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            handleBackPressed();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    private void handleBackPressed() {
        // Use the Zustand store to handle back navigation
        webView.post(() -> {
            webView.evaluateJavascript(
                "(function() {" +
                "  var store = window.__ZUSTAND_STORE__;" +
                "  if (!store) return 'no_store';" +
                "  var state = store.getState();" +
                "  if (state.examBackWarning !== undefined && state.currentView === 'exam') {" +
                "    state.setExamBackWarning(true);" +
                "    return 'exam_warning';" +
                "  }" +
                "  if (state.canGoBack()) {" +
                "    state.goBack();" +
                "    return 'went_back';" +
                "  }" +
                "  if (state.currentView === 'home') {" +
                "    state.setExitConfirmVisible(true);" +
                "    return 'exit_confirm';" +
                "  }" +
                "  state.setView('home');" +
                "  return 'to_home';" +
                "})()",
                result -> {
                    String trimmed = result != null ? result.replace("\"", "").trim() : "";
                    if ("no_store".equals(trimmed)) {
                        // Store not available, use WebView history as fallback
                        if (webView.canGoBack()) {
                            webView.goBack();
                        } else {
                            showExitDialog();
                        }
                    }
                });
        });
    }

    private void showExitDialog() {
        new AlertDialog.Builder(this)
            .setTitle("Exit ExamVault?")
            .setMessage("Are you sure you want to exit?")
            .setPositiveButton("Exit", (dialog, which) -> {
                finish();
            })
            .setNegativeButton("Cancel", null)
            .show();
    }

    // ==================== Network Check ====================

    private boolean isNetworkAvailable() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        if (cm != null) {
            NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
            return activeNetwork != null && activeNetwork.isConnected();
        }
        return false;
    }

    private void showErrorDialog(String title, String message) {
        new AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton("Retry", (dialog, which) -> {
                if (isNetworkAvailable()) {
                    webView.loadUrl(appUrl);
                } else {
                    showErrorDialog(title, message);
                }
            })
            .setCancelable(false)
            .show();
    }

    // ==================== Lifecycle ====================

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            webView.onPause();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
