package com.examvault.education;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
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
import android.widget.Toast;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.RequestConfiguration;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;

import java.util.Arrays;
import java.util.List;

import androidx.browser.customtabs.CustomTabsIntent;
import androidx.core.content.ContextCompat;

public class MainActivity extends Activity {

    private static final String TAG = "ExamVault";

    private WebView webView;
    private ProgressBar progressBar;
    private String appUrl = "${APP_URL}";
    private String admobInterstitialId = "${ADMOB_INTERSTITIAL_ID}";

    // Interstitial ad
    private InterstitialAd mInterstitialAd;
    private long lastAdShownTime = 0;
    private static final long MIN_AD_INTERVAL_MS = 90_000; // Minimum 90 seconds between ads
    private int actionCount = 0;
    private static final int ACTION_COUNT_FOR_AD = 2; // Show ad after every 2 actions

    // Track if user went to Custom Tab for payment
    private boolean waitingForPaymentReturn = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep screen on
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Initialize layout
        setupUI();

        // Initialize AdMob
        MobileAds.initialize(this, initializationStatus -> {
            Log.d(TAG, "AdMob initialized successfully");

            List<String> testDeviceIds = Arrays.asList(
                AdRequest.DEVICE_ID_EMULATOR,
                "YOUR_TEST_DEVICE_ID"
            );
            RequestConfiguration requestConfiguration = new RequestConfiguration.Builder()
                .setTestDeviceIds(testDeviceIds)
                .build();
            MobileAds.setRequestConfiguration(requestConfiguration);

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
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

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

        // Register JavaScript interface for ad bridge, back button, and payment
        webView.addJavascriptInterface(new AdWebInterface(), "AndroidBridge");

        // WebViewClient with offline cache support + payment URL handling
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();

                // Handle UPI intent URLs — launch UPI apps (GPay, PhonePe, BHIM, Paytm)
                if (url.startsWith("upi://") || url.startsWith("intent://")) {
                    try {
                        Intent upiIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        upiIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(upiIntent);
                        return true;
                    } catch (Exception e) {
                        Log.w(TAG, "Cannot open UPI intent: " + e.getMessage());
                        return false;
                    }
                }

                // Handle examvault:// deep link (payment return)
                if (url.startsWith("examvault://")) {
                    Log.d(TAG, "Deep link received: " + url);
                    waitingForPaymentReturn = false;
                    checkPaymentStatusInWebView();
                    return true;
                }

                // Payment page URLs — open in Chrome Custom Tab for UPI support
                // Custom Tab looks like in-app, but uses Chrome underneath so UPI works
                if (url.contains("/payment?") && url.contains("orderId=")) {
                    openInCustomTab(url);
                    waitingForPaymentReturn = true;
                    return true;
                }

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

                // Set WebView flags so web app knows it's inside Android
                webView.evaluateJavascript(
                    "window.__EV_ANDROID_WEBVIEW = true; window.__EV_WEBVIEW = true;", null);
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
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
                Log.d("ExamVault-Web", consoleMessage.message());
                return true;
            }
        });
    }

    // ==================== Chrome Custom Tab for Payment ====================
    // Custom Tab = app-এর মধ্যেই Chrome খোলে, পুরো browser নয়
    // দেখতে app-এর মতো (toolbar আছে app-এর রঙে), কিন্তু ভিতরে Chrome
    // তাই UPI Intent (GPay, PhonePe, BHIM) কাজ করে ✅

    private void openInCustomTab(String url) {
        try {
            CustomTabsIntent.Builder builder = new CustomTabsIntent.Builder();
            // App-এর theme color দিচ্ছি — দেখতে app-এর মতো লাগবে
            builder.setToolbarColor(Color.parseColor("#1e3a5f"));
            builder.setShowTitle(true);
            // Close button icon — back arrow feel
            builder.setCloseButtonIcon(Bitmap.createScaledBitmap(
                getBitmapFromVectorDrawable(android.R.drawable.ic_menu_close_clear_cancel),
                24, 24, true));
            // Instant loading with white background
            builder.setStartAnimations(this, android.R.anim.slide_in_left, android.R.anim.slide_out_right);
            builder.setExitAnimations(this, android.R.anim.slide_in_left, android.R.anim.slide_out_right);

            CustomTabsIntent customTabsIntent = builder.build();
            // Force open in Chrome (best Razorpay compatibility)
            customTabsIntent.intent.setPackage("com.android.chrome");
            customTabsIntent.intent.addFlags(Intent.FLAG_ACTIVITY_NO_HISTORY);
            customTabsIntent.launchUrl(this, Uri.parse(url));
            Log.d(TAG, "Opened payment in Chrome Custom Tab: " + url);
        } catch (Exception e) {
            Log.w(TAG, "Custom Tab failed, trying regular browser: " + e.getMessage());
            // Fallback: open in any browser
            openInExternalBrowser(url);
        }
    }

    private void openInExternalBrowser(String url) {
        try {
            Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            browserIntent.setPackage("com.android.chrome");
            browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(browserIntent);
            Log.d(TAG, "Opened payment URL in Chrome: " + url);
        } catch (Exception e) {
            Log.w(TAG, "Chrome not available, opening in default browser: " + e.getMessage());
            try {
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(browserIntent);
            } catch (Exception e2) {
                Log.e(TAG, "Cannot open browser: " + e2.getMessage());
                Toast.makeText(this, "Please install Chrome browser to make payment", Toast.LENGTH_LONG).show();
            }
        }
    }

    private Bitmap getBitmapFromVectorDrawable(int drawableId) {
        try {
            android.graphics.drawable.Drawable drawable = ContextCompat.getDrawable(this, drawableId);
            if (drawable == null) {
                return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888);
            }
            Bitmap bitmap = Bitmap.createBitmap(drawable.getIntrinsicWidth() > 0 ? drawable.getIntrinsicWidth() : 24,
                drawable.getIntrinsicHeight() > 0 ? drawable.getIntrinsicHeight() : 24,
                Bitmap.Config.ARGB_8888);
            android.graphics.Canvas canvas = new android.graphics.Canvas(bitmap);
            drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
            drawable.draw(canvas);
            return bitmap;
        } catch (Exception e) {
            return Bitmap.createBitmap(24, 24, Bitmap.Config.ARGB_8888);
        }
    }

    private void checkPaymentStatusInWebView() {
        // Inject JS to trigger payment status check in the web app
        webView.post(() -> {
            webView.evaluateJavascript(
                "(function() {" +
                "  if (window.__ZUSTAND_STORE__) {" +
                "    var state = window.__ZUSTAND_STORE__.getState();" +
                "    if (state.firebaseUser && state.firebaseUser.uid) {" +
                "      console.log('Checking payment status after returning from Custom Tab...');" +
                "    }" +
                "  }" +
                "  // Dispatch events that PaymentModal listens to" +
                "  window.dispatchEvent(new Event('focus'));" +
                "  window.dispatchEvent(new Event('visibilitychange'));" +
                "})()", null);
        });
    }

    // ==================== AdMob Interstitial ====================

    private void loadInterstitialAd() {
        if (!isNetworkAvailable()) {
            Log.w(TAG, "No network — skipping ad load");
            return;
        }

        Log.d(TAG, "Loading interstitial ad: " + admobInterstitialId);

        AdRequest adRequest = new AdRequest.Builder().build();
        InterstitialAd.load(this, admobInterstitialId, adRequest,
            new InterstitialAdLoadCallback() {
                @Override
                public void onAdLoaded(InterstitialAd interstitialAd) {
                    mInterstitialAd = interstitialAd;
                    Log.d(TAG, "Interstitial ad loaded successfully!");
                    mInterstitialAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                        @Override
                        public void onAdDismissedFullScreenContent() {
                            mInterstitialAd = null;
                            lastAdShownTime = System.currentTimeMillis();
                            Log.d(TAG, "Ad dismissed — loading next ad");
                            loadInterstitialAd();
                        }

                        @Override
                        public void onAdFailedToShowFullScreenContent(AdError adError) {
                            mInterstitialAd = null;
                            Log.e(TAG, "Ad failed to show: " + adError.getMessage());
                            loadInterstitialAd();
                        }

                        @Override
                        public void onAdShowedFullScreenContent() {
                            Log.d(TAG, "Ad shown successfully!");
                        }
                    });
                }

                @Override
                public void onAdFailedToLoad(LoadAdError loadAdError) {
                    mInterstitialAd = null;
                    Log.w(TAG, "Ad failed to load: " + loadAdError.getMessage() +
                        " (code: " + loadAdError.getCode() + ")");
                    // Retry after 60 seconds
                    if (webView != null) {
                        webView.postDelayed(() -> loadInterstitialAd(), 60000);
                    }
                }
            });
    }

    private void showInterstitialAd() {
        long now = System.currentTimeMillis();
        if (now - lastAdShownTime < MIN_AD_INTERVAL_MS) {
            Log.d(TAG, "Too soon for ad — " + ((MIN_AD_INTERVAL_MS - (now - lastAdShownTime)) / 1000) + "s remaining");
            return;
        }

        if (mInterstitialAd != null) {
            Log.d(TAG, "Showing interstitial ad NOW");
            mInterstitialAd.show(this);
        } else {
            Log.w(TAG, "Ad not ready — loading...");
            loadInterstitialAd();
        }
    }

    // Called from JavaScript when user completes an action
    private void onActionComplete(String actionType) {
        actionCount++;
        Log.d(TAG, "Action complete: " + actionType + " (count: " + actionCount + "/" + ACTION_COUNT_FOR_AD + ")");

        webView.post(() -> {
            webView.evaluateJavascript(
                "window.__EV_PREMIUM === true ? 'premium' : 'free'",
                result -> {
                    String trimmed = result != null ? result.replace("\"", "").trim() : "free";
                    Log.d(TAG, "User type: " + trimmed);
                    if (!"premium".equals(trimmed) && actionCount >= ACTION_COUNT_FOR_AD) {
                        actionCount = 0;
                        showInterstitialAd();
                    }
                });
        });
    }

    // ==================== JavaScript Interface ====================

    public class AdWebInterface {
        @JavascriptInterface
        public void onActionComplete(String actionType) {
            MainActivity.this.onActionComplete(actionType);
        }

        @JavascriptInterface
        public void onNavigate() {
            // Legacy — no longer triggers ads on every navigation
        }

        @JavascriptInterface
        public boolean isNetworkAvailable() {
            return MainActivity.this.isNetworkAvailable();
        }

        // Open payment URL in Chrome Custom Tab — looks like in-app, supports UPI
        @JavascriptInterface
        public void openInBrowser(String url) {
            Log.d(TAG, "JS requested to open payment in Custom Tab: " + url);
            waitingForPaymentReturn = true;
            openInCustomTab(url);
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
        if (mInterstitialAd == null && isNetworkAvailable()) {
            loadInterstitialAd();
        }

        // If returning from Custom Tab after payment, check payment status
        if (waitingForPaymentReturn) {
            Log.d(TAG, "Returning from Custom Tab — checking payment status");
            waitingForPaymentReturn = false;
            // Small delay to let the WebView regain focus and web app reconnect
            webView.postDelayed(() -> checkPaymentStatusInWebView(), 1500);
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
