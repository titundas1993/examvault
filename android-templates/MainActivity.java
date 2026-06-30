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
import android.webkit.ValueCallback;
import android.widget.ProgressBar;
import android.widget.Toast;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.RequestConfiguration;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;

import com.razorpay.Checkout;
import com.razorpay.PaymentResultListener;

import org.json.JSONObject;

import java.util.Arrays;
import java.util.List;

public class MainActivity extends Activity implements PaymentResultListener {

    private static final String TAG = "ExamVault";
    private static final int RAZORPAY_REQUEST_CODE = 1001;

    private WebView webView;
    private ProgressBar progressBar;
    private String appUrl = "${APP_URL}";
    private String admobInterstitialId = "${ADMOB_INTERSTITIAL_ID}";
    private String admobBannerId = "${ADMOB_BANNER_ID}";

    // Interstitial ad
    private InterstitialAd mInterstitialAd;
    private AdView mAdView;
    private long lastAdShownTime = 0;
    private static final long MIN_AD_INTERVAL_MS = 90_000;
    private int actionCount = 0;
    private static final int ACTION_COUNT_FOR_AD = 2;

    // Payment data (saved for verification after Razorpay returns)
    private String pendingPaymentUserId = "";
    private String pendingPaymentPlanId = "";
    private String pendingPaymentPlanName = "";
    private String pendingPaymentType = "";
    private double pendingPaymentAmount = 0;
    private String pendingPaymentOrderId = "";

    // File chooser for <input type="file"> in WebView (profile photo upload)
    private ValueCallback<Uri[]> fileUploadCallback;
    private static final int FILE_CHOOSER_REQUEST = 1002;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep screen on
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Initialize Razorpay
        Checkout.preload(this);

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
            loadBannerAd();
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

        // CRITICAL: Disable overscroll/rubber-band effect at WebView level.
        // CSS overscroll-behavior:none does NOT work in Android WebView.
        // This Java setting is the ONLY way to stop rubber-band in WebView.
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);

        // Register JavaScript interface
        webView.addJavascriptInterface(new AdWebInterface(), "AndroidBridge");

        // WebViewClient
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();

                // Handle UPI intent URLs
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
                    return true;
                }

                // Handle tel: (phone call) and mailto: (email) URLs
                if (url.startsWith("tel:") || url.startsWith("mailto:")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        Log.w(TAG, "Cannot open tel/mailto: " + e.getMessage());
                        return true;
                    }
                }

                // Whitelist of URLs that should load inside WebView
                if (url.startsWith(appUrl) || url.contains("firebaseio.com") ||
                    url.contains("googleapis.com") || url.contains("razorpay.com") ||
                    url.contains("checkout.razorpay.com") ||
                    url.startsWith("https://examvault") ||
                    url.startsWith("https://api.razorpay.com")) {
                    return false; // Load in WebView
                }

                // Block ALL other URLs from opening external browser
                // This prevents app from opening Chrome/Edge when user exits
                Log.w(TAG, "Blocked external URL: " + url);
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

            // Handle <input type="file"> — needed for profile photo upload in WebView
            @Override
            public boolean onShowFileChooser(WebView webView,
                                             ValueCallback<Uri[]> filePathCallback,
                                             FileChooserParams fileChooserParams) {
                // Cancel any previous callback
                if (fileUploadCallback != null) {
                    fileUploadCallback.onReceiveValue(null);
                }
                fileUploadCallback = filePathCallback;

                // Create intent to pick an image
                Intent intent = fileChooserParams.createIntent();
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("image/*");

                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                } catch (Exception e) {
                    Log.e(TAG, "Cannot start file chooser: " + e.getMessage());
                    fileUploadCallback = null;
                    Toast.makeText(MainActivity.this, "Cannot open file picker", Toast.LENGTH_SHORT).show();
                    return false;
                }
                return true;
            }
        });
    }

    // ==================== File Upload Result ====================

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (fileUploadCallback == null) return;

            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && data != null) {
                String dataString = data.getDataString();
                if (dataString != null) {
                    results = new Uri[]{Uri.parse(dataString)};
                }
            } else if (resultCode == Activity.RESULT_CANCELED) {
                // User cancelled — pass null to clear the callback
                results = null;
            }

            fileUploadCallback.onReceiveValue(results);
            fileUploadCallback = null;
        }
    }

    // ==================== Razorpay Native Payment ====================
    // এটা সরাসরি app-এর মধ্যে Razorpay checkout খোলে
    // UPI (GPay, PhonePe, BHIM), Card, NetBanking — সব কাজ করে
    // Header-এ "ExamVault" দেখায়, কোনো URL বা browser নয়

    public void startRazorpayPayment(String keyId, String orderId, String amountStr,
                                      String currency, String planName, String userName,
                                      String userEmail, String userPhone,
                                      String userId, String planId, String type) {
        try {
            Checkout checkout = new Checkout();
            checkout.setKeyID(keyId);

            // Save payment data for verification after Razorpay returns
            pendingPaymentUserId = userId;
            pendingPaymentPlanId = planId;
            pendingPaymentPlanName = planName;
            pendingPaymentType = type;
            pendingPaymentAmount = Double.parseDouble(amountStr) / 100.0; // paise to rupees
            pendingPaymentOrderId = orderId;

            JSONObject options = new JSONObject();
            options.put("name", "ExamVault");
            options.put("description", planName);
            options.put("image", appUrl + "/logo.png");
            options.put("order_id", orderId);
            options.put("currency", currency);
            options.put("amount", amountStr); // in paise

            // Prefill user details
            JSONObject prefill = new JSONObject();
            prefill.put("name", userName);
            prefill.put("email", userEmail);
            prefill.put("contact", userPhone);
            options.put("prefill", prefill);

            // Notes for reference
            JSONObject notes = new JSONObject();
            notes.put("userId", userId);
            notes.put("planId", planId);
            options.put("notes", notes);

            // Theme color matching app
            JSONObject theme = new JSONObject();
            theme.put("color", "#1e3a5f");
            options.put("theme", theme);

            // UPI settings
            JSONObject upi = new JSONObject();
            upi.put("flow", "intent");
            options.put("upi", upi);

            Log.d(TAG, "Opening Razorpay native checkout — Order: " + orderId);
            checkout.open(this, options);

        } catch (Exception e) {
            Log.e(TAG, "Razorpay checkout error: " + e.getMessage(), e);
            // Notify WebView about the error
            notifyWebViewPaymentError("Failed to open payment: " + e.getMessage());
        }
    }

    @Override
    public void onPaymentSuccess(String razorpayPaymentId) {
        Log.d(TAG, "Payment SUCCESS! PaymentId: " + razorpayPaymentId + " OrderId: " + pendingPaymentOrderId);

        // Notify WebView — let JavaScript handle verification
        webView.post(() -> {
            String js = String.format(
                "window.__EV_PAYMENT_SUCCESS && window.__EV_PAYMENT_SUCCESS(%s, %s, %s, %s, %s, %s, %s, %s);",
                JSONObject.quote(razorpayPaymentId),
                JSONObject.quote(pendingPaymentOrderId),
                JSONObject.quote(""), // signature not available in this API, server will verify
                JSONObject.quote(pendingPaymentUserId),
                JSONObject.quote(pendingPaymentPlanId),
                JSONObject.quote(pendingPaymentPlanName),
                String.valueOf(pendingPaymentAmount),
                JSONObject.quote(pendingPaymentType)
            );
            webView.evaluateJavascript(js, result -> {
                Log.d(TAG, "Payment success notification sent to WebView: " + result);
            });
        });
    }

    @Override
    public void onPaymentError(int code, String response) {
        Log.e(TAG, "Payment FAILED! Code: " + code + " Response: " + response);

        String errorMsg = "Payment failed";
        try {
            if (response != null) {
                JSONObject errorObj = new JSONObject(response);
                JSONObject errorData = errorObj.optJSONObject("error");
                if (errorData != null) {
                    errorMsg = errorData.optString("description", errorMsg);
                }
            }
        } catch (Exception e) {
            errorMsg = "Payment cancelled or failed";
        }

        if (code == Checkout.PAYMENT_CANCELED) {
            errorMsg = "Payment was cancelled";
        }

        notifyWebViewPaymentError(errorMsg);
    }

    private void notifyWebViewPaymentError(String errorMsg) {
        webView.post(() -> {
            String js = String.format(
                "window.__EV_PAYMENT_ERROR && window.__EV_PAYMENT_ERROR(%s);",
                JSONObject.quote(errorMsg)
            );
            webView.evaluateJavascript(js, result -> {
                Log.d(TAG, "Payment error notification sent to WebView");
            });
        });
    }

    // ==================== AdMob Banner ====================

    private void loadBannerAd() {
        try {
            runOnUiThread(() -> {
                if (mAdView != null) return; // already loaded
                mAdView = new AdView(this);
                mAdView.setId(View.generateViewId());
                mAdView.setAdSize(AdSize.BANNER);
                mAdView.setAdUnitId(admobBannerId);

                android.widget.RelativeLayout rootLayout =
                    (android.widget.RelativeLayout) webView.getParent();

                android.widget.RelativeLayout.LayoutParams adParams =
                    new android.widget.RelativeLayout.LayoutParams(
                        android.widget.RelativeLayout.LayoutParams.MATCH_PARENT,
                        android.widget.RelativeLayout.LayoutParams.WRAP_CONTENT);
                // Banner ad BELOW progress bar (top area), ABOVE webview content
                adParams.addRule(android.widget.RelativeLayout.BELOW, progressBar.getId());
                rootLayout.addView(mAdView, adParams);

                // Re-layout webview so it sits BELOW the banner ad
                android.widget.RelativeLayout.LayoutParams wvParams =
                    new android.widget.RelativeLayout.LayoutParams(
                        android.widget.RelativeLayout.LayoutParams.MATCH_PARENT,
                        android.widget.RelativeLayout.LayoutParams.MATCH_PARENT);
                wvParams.addRule(android.widget.RelativeLayout.BELOW, mAdView.getId());
                webView.setLayoutParams(wvParams);

                AdRequest adRequest = new AdRequest.Builder().build();
                mAdView.loadAd(adRequest);
                Log.d(TAG, "Banner ad loading with unit ID: " + admobBannerId + " (position: top, below progress bar)");
            });
        } catch (Exception e) {
            Log.e(TAG, "Banner ad load error: " + e.getMessage());
        }
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

        // Razorpay Native Payment — called from JavaScript
        // This opens Razorpay's native checkout UI inside the app
        // UPI (GPay, PhonePe, BHIM), Cards, NetBanking all work
        @JavascriptInterface
        public void startPayment(String keyId, String orderId, String amount,
                                  String currency, String planName, String userName,
                                  String userEmail, String userPhone,
                                  String userId, String planId, String type) {
            Log.d(TAG, "JS requested native Razorpay payment — Order: " + orderId);
            MainActivity.this.startRazorpayPayment(keyId, orderId, amount, currency,
                planName, userName, userEmail, userPhone, userId, planId, type);
        }

        // Legacy — kept for compatibility
        @JavascriptInterface
        public void openInBrowser(String url) {
            Log.d(TAG, "openInBrowser is deprecated — using native Razorpay SDK instead");
            // No longer needed — native SDK handles payment directly
        }

        // Exit app — called from JavaScript when user confirms exit
        @JavascriptInterface
        public void exitApp() {
            Log.d(TAG, "JS requested app exit");
            runOnUiThread(() -> {
                finishAffinity(); // Close the app properly
            });
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
        if (mAdView != null) mAdView.resume();
        if (mInterstitialAd == null && isNetworkAvailable()) {
            loadInterstitialAd();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) webView.onPause();
        if (mAdView != null) mAdView.pause();
    }

    @Override
    protected void onDestroy() {
        if (mAdView != null) {
            mAdView.destroy();
            mAdView = null;
        }
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
