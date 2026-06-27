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
    private long lastAdShownTime = 0;
    private static final long MIN_AD_INTERVAL_MS = 90_000; // Minimum 90 seconds between ads
    private int actionCount = 0;
    private static final int ACTION_COUNT_FOR_AD = 3; // Show ad after every 3 actions

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep screen on
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Initialize layout
        setupUI();

        // Initialize AdMob
        MobileAds.initialize(this, initializationStatus -> {
            loadInterstitialAd();
        });

        // Setup WebView
        setupWebView();

        // Load the app URL — works offline too via WebView cache
        webView.loadUrl(appUrl);
    }

    private void setupUI() {
        android.widget.RelativeLayout layout = new android.widget.RelativeLayout(this);

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setId(View.generateViewId());
        progressBar.setMax(100);
        android.widget.RelativeLayout.LayoutParams pbParams =
            new android.widget.RelativeLayout.LayoutParams(
                android.widget.RelativeLayout.LayoutParams.MATCH_PARENT,
                8);
        pbParams.addRule(android.widget.RelativeLayout.ALIGN_PARENT_TOP);
        layout.addView(progressBar, pbParams);

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

        // Enable caching for offline support
        // LOAD_DEFAULT = use cache if available, fetch from network otherwise
        // When offline, WebView will serve from cache automatically
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Note: setAppCacheEnabled/setAppCachePath were removed in API 33.
        // DOM storage + LOAD_DEFAULT cache mode is sufficient for offline.

        // Responsive
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.TEXT_AUTOSIZING);

        // Allow file access
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        // Mixed content
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }

        // Register JavaScript interface for ad bridge and back button
        webView.addJavascriptInterface(new AdWebInterface(), "AndroidBridge");

        // WebViewClient with offline cache support
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();

                if (url.startsWith(appUrl) || url.contains("firebaseio.com") ||
                    url.contains("googleapis.com") || url.contains("google.com") ||
                    url.contains("razorpay.com")) {
                    return false;
                }

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

                // Set WebView flag so web app knows it's inside Android
                webView.evaluateJavascript(
                    "window.__EV_ANDROID_WEBVIEW = true; window.__EV_WEBVIEW = true;", null);
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                // Don't show error for offline — WebView cache will serve cached pages
                super.onReceivedError(view, errorCode, description, failingUrl);
            }
        });

        // WebChromeClient
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
                android.util.Log.d("ExamVault-Web", consoleMessage.message());
                return true;
            }
        });
    }

    // ==================== AdMob Interstitial ====================

    private void loadInterstitialAd() {
        if (!isNetworkAvailable()) {
            // Don't try to load ads when offline — will retry when back online
            return;
        }
        AdRequest adRequest = new AdRequest.Builder().build();
        InterstitialAd.load(this, admobInterstitialId, adRequest,
            new InterstitialAdLoadCallback() {
                @Override
                public void onAdLoaded(InterstitialAd interstitialAd) {
                    mInterstitialAd = interstitialAd;
                    mInterstitialAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                        @Override
                        public void onAdDismissedFullScreenContent() {
                            mInterstitialAd = null;
                            lastAdShownTime = System.currentTimeMillis();
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
                    // Retry after 60 seconds
                    if (webView != null) {
                        webView.postDelayed(() -> loadInterstitialAd(), 60000);
                    }
                }
            });
    }

    private void showInterstitialAd() {
        long now = System.currentTimeMillis();
        // Enforce minimum time gap between ads (90 seconds)
        if (now - lastAdShownTime < MIN_AD_INTERVAL_MS) {
            return; // Too soon to show another ad
        }

        if (mInterstitialAd != null) {
            mInterstitialAd.show(this);
        } else {
            loadInterstitialAd();
        }
    }

    // Called from JavaScript when user completes an action (not on every navigation)
    private void onActionComplete(String actionType) {
        // Only count meaningful actions, not every view change
        // actionType values: "exam_end", "result_view", "note_read", "paper_read", "back_to_home"
        actionCount++;

        // Check if user is premium
        webView.post(() -> {
            webView.evaluateJavascript(
                "window.__EV_PREMIUM === true ? 'premium' : 'free'",
                result -> {
                    String trimmed = result != null ? result.replace("\"", "").trim() : "free";
                    if (!"premium".equals(trimmed) && actionCount >= ACTION_COUNT_FOR_AD) {
                        actionCount = 0; // Reset counter
                        showInterstitialAd();
                    }
                });
        });
    }

    // ==================== JavaScript Interface ====================

    public class AdWebInterface {
        // Called when user completes an action — triggers ad check
        @JavascriptInterface
        public void onActionComplete(String actionType) {
            onActionComplete(actionType);
        }

        // Legacy method — kept for backward compat but now no-ops
        @JavascriptInterface
        public void onNavigate() {
            // No longer triggers ads on every navigation
        }

        // Check if network is available
        @JavascriptInterface
        public boolean isNetworkAvailable() {
            return MainActivity.this.isNetworkAvailable();
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
            .setPositiveButton("Exit", (dialog, which) -> finish())
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

    // ==================== Lifecycle ====================

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
        // Try loading ad if not already loaded
        if (mInterstitialAd == null && isNetworkAvailable()) {
            loadInterstitialAd();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) webView.onPause();
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
