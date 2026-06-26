package com.examvault.education;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.webkit.WebChromeClient;
import android.webkit.ValueCallback;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.net.Uri;
import android.graphics.Color;
import android.os.Build;
import android.util.Log;
import android.content.BroadcastReceiver;
import android.content.IntentFilter;
import android.os.Handler;
import android.os.Looper;

public class MainActivity extends Activity {
    private static final String TAG = "ExamVault";
    private WebView webView;
    private View splashScreen;
    private static final String PREFS_NAME = "examvault_prefs";
    private static final String KEY_URL = "last_url";
    private String appUrl = "${APP_URL}";
    private boolean webViewReady = false;
    private Handler handler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            requestWindowFeature(Window.FEATURE_NO_TITLE);
            getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);

            // === SPLASH SCREEN ===
            splashScreen = new View(this) {
                @Override
                protected void onDraw(android.graphics.Canvas canvas) {
                    super.onDraw(canvas);
                    canvas.drawColor(Color.parseColor("#001A4B"));
                    android.graphics.Paint paint = new android.graphics.Paint();
                    paint.setColor(Color.WHITE);
                    paint.setTextSize(80);
                    paint.setTypeface(android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD));
                    paint.setTextAlign(android.graphics.Paint.Align.CENTER);
                    int cx = getWidth() / 2;
                    int cy = getHeight() / 2 - 40;
                    canvas.drawText("EXAM", cx, cy, paint);
                    paint.setColor(Color.parseColor("#EB6301"));
                    canvas.drawText("VAULT", cx, cy + 90, paint);
                    paint.setColor(Color.parseColor("#FEA216"));
                    paint.setTextSize(28);
                    paint.setTypeface(android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.NORMAL));
                    canvas.drawText("Loading...", cx, cy + 150, paint);
                }
            };

            FrameLayout webContainer = new FrameLayout(this);
            webContainer.addView(splashScreen, new FrameLayout.LayoutParams(-1, -1));

            webView = new WebView(this);
            webContainer.addView(webView, new FrameLayout.LayoutParams(-1, -1));
            webView.setVisibility(View.GONE);
            webView.setBackgroundColor(Color.parseColor("#001A4B"));

            setContentView(webContainer);

            // === ADMOB INIT — deferred to avoid crash on startup ===
            handler.postDelayed(new Runnable() {
                @Override
                public void run() {
                    try {
                        com.google.android.gms.ads.MobileAds.initialize(MainActivity.this, new com.google.android.gms.ads.initialization.OnInitializationCompleteListener() {
                            @Override
                            public void onInitializationComplete(com.google.android.gms.ads.initialization.InitializationStatus status) {
                                Log.d(TAG, "AdMob initialized");
                                loadInterstitialAd();
                            }
                        });
                    } catch (Exception e) {
                        Log.e(TAG, "AdMob init error: " + e.getMessage());
                    }
                }
            }, 1000);

            // === WEBVIEW SETTINGS ===
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setAllowFileAccess(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setSupportZoom(false);
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            settings.setDatabasePath(getFilesDir().getPath() + "/databases");
            android.webkit.CookieManager cookieManager = android.webkit.CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(webView, true);

            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    String host = Uri.parse(url).getHost();
                    // Allow all HTTPS URLs inside WebView — let the web app handle navigation
                    if (url.startsWith("https://")) {
                        return false;
                    }
                    // Block non-https, open externally
                    try {
                        view.getContext().startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                    } catch (Exception e) {}
                    return true;
                }

                @Override
                public void onPageFinished(WebView view, String url) {
                    super.onPageFinished(view, url);
                    webViewReady = true;
                    splashScreen.setVisibility(View.GONE);
                    webView.setVisibility(View.VISIBLE);
                    view.evaluateJavascript("if(!window.__EV_WEBVIEW){window.__EV_WEBVIEW=true;}", null);
                    checkPremiumAndToggleAds();
                    SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                    prefs.edit().putString(KEY_URL, url).apply();
                }

                @Override
                public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                    super.onReceivedError(view, request, error);
                }
            });

            webView.setWebChromeClient(new WebChromeClient());

            // === OTP Auto-Fill: JS Interface ===
            try {
                webView.addJavascriptInterface(new OtpWebInterface(), "AndroidOtp");
                webView.addJavascriptInterface(new AdWebInterface(), "AndroidBridge");
                startSmsRetriever();
            } catch (Exception e) {
                Log.e(TAG, "JS Interface init error: " + e.getMessage());
            }

            String urlToLoad = appUrl;
            if (savedInstanceState != null) {
                String savedUrl = savedInstanceState.getString(KEY_URL);
                if (savedUrl != null && !savedUrl.isEmpty()) {
                    urlToLoad = savedUrl;
                }
            } else {
                Uri data = getIntent().getData();
                if (data != null) {
                    urlToLoad = data.toString();
                }
            }
            webView.loadUrl(urlToLoad);

        } catch (Exception e) {
            Log.e(TAG, "FATAL onCreate error: " + e.getMessage(), e);
            try {
                new AlertDialog.Builder(this)
                    .setTitle("Error")
                    .setMessage("App failed to start: " + e.getMessage())
                    .setPositiveButton("OK", new DialogInterface.OnClickListener() {
                        @Override public void onClick(DialogInterface d, int w) { finish(); }
                    })
                    .show();
            } catch (Exception e2) {
                finish();
            }
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null && webView.getUrl() != null) {
            outState.putString(KEY_URL, webView.getUrl());
        }
    }

    @Override
    public void onBackPressed() {
        if (webView == null) { super.onBackPressed(); return; }
        webView.evaluateJavascript("(function(){ try { var s = window.__ZUSTAND_STORE__; if(s && s.getState) { var st = s.getState(); if(st.currentView === 'exam') { st.setExamBackWarning(true); return 'exam_warning'; } else if(st.canGoBack && st.canGoBack()) { return 'can_go_back'; } else if(st.currentView === 'home' || st.currentView === 'login') { return 'at_home'; } else { return 'can_go_back'; } } return 'no_store'; } catch(e) { return 'error'; } })()", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String result) {
                result = result != null ? result.replace("\"", "") : "";
                if ("exam_warning".equals(result)) {
                    // Warning dialog shown in JS, do nothing
                } else if ("can_go_back".equals(result)) {
                    // Go back in the web app's state management (not WebView history)
                    webView.evaluateJavascript("(function(){ try { var s = window.__ZUSTAND_STORE__; if(s && s.getState) { s.getState().goBack(); } } catch(e) {} })()", null);
                    onNavigationEvent();
                } else if ("at_home".equals(result)) {
                    showExitDialog();
                } else {
                    if (webView.canGoBack()) { webView.goBack(); }
                    else { showExitDialog(); }
                }
            }
        });
    }

    private void showExitDialog() {
        new AlertDialog.Builder(this)
            .setTitle("Exit ExamVault?")
            .setMessage("Are you sure you want to close the app?")
            .setPositiveButton("Exit", new DialogInterface.OnClickListener() {
                @Override public void onClick(DialogInterface d, int w) { finish(); }
            })
            .setNegativeButton("Cancel", null)
            .show();
    }

    // === ADMOB INTERSTITIAL AD ===
    private com.google.android.gms.ads.interstitial.InterstitialAd interstitialAd;
    private String admobInterstitialId = "${ADMOB_INTERSTITIAL_ID}";
    private int navCount = 0;
    private static final int INTERSTITIAL_INTERVAL = 2;
    private boolean isPremiumUser = false;
    private boolean adLoadPending = false;

    private void loadInterstitialAd() {
        if (adLoadPending) return; // prevent duplicate loads
        if (admobInterstitialId == null || admobInterstitialId.isEmpty() ||
            admobInterstitialId.contains("${")) {
            Log.w(TAG, "AdMob Interstitial ID not set, skipping ad load");
            return;
        }
        adLoadPending = true;
        try {
            com.google.android.gms.ads.AdRequest adRequest = new com.google.android.gms.ads.AdRequest.Builder().build();
            com.google.android.gms.ads.interstitial.InterstitialAd.load(this, admobInterstitialId, adRequest,
                new com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback() {
                    @Override
                    public void onAdLoaded(com.google.android.gms.ads.interstitial.InterstitialAd ad) {
                        interstitialAd = ad;
                        adLoadPending = false;
                        interstitialAd.setFullScreenContentCallback(new com.google.android.gms.ads.FullScreenContentCallback() {
                            @Override
                            public void onAdDismissedFullScreenContent() {
                                interstitialAd = null;
                                adLoadPending = false;
                                loadInterstitialAd(); // preload next ad
                            }
                            @Override
                            public void onAdFailedToShowFullScreenContent(com.google.android.gms.ads.AdError adError) {
                                interstitialAd = null;
                                adLoadPending = false;
                                loadInterstitialAd();
                            }
                        });
                        Log.d(TAG, "Interstitial ad loaded successfully");
                    }
                    @Override
                    public void onAdFailedToLoad(com.google.android.gms.ads.LoadAdError error) {
                        interstitialAd = null;
                        adLoadPending = false;
                        Log.w(TAG, "Ad load failed: " + error.getMessage());
                        // Retry after delay
                        handler.postDelayed(new Runnable() {
                            @Override public void run() { loadInterstitialAd(); }
                        }, 30000); // retry in 30 seconds
                    }
                });
        } catch (Exception e) {
            adLoadPending = false;
            Log.e(TAG, "AdMob load error: " + e.getMessage());
        }
    }

    private void showInterstitialAd() {
        if (isPremiumUser) {
            Log.d(TAG, "Premium user, skipping ad");
            return;
        }
        try {
            if (interstitialAd != null) {
                Log.d(TAG, "Showing interstitial ad");
                interstitialAd.show(this);
            } else {
                Log.d(TAG, "No ad ready, loading...");
                loadInterstitialAd();
            }
        } catch (Exception e) {
            Log.e(TAG, "Ad show error: " + e.getMessage());
            interstitialAd = null;
            adLoadPending = false;
        }
    }

    private void onNavigationEvent() {
        if (isPremiumUser) return;
        navCount++;
        Log.d(TAG, "Navigation event #" + navCount + " (interval: " + INTERSTITIAL_INTERVAL + ")");
        if (navCount >= INTERSTITIAL_INTERVAL) {
            navCount = 0;
            showInterstitialAd();
        }
    }

    // === PREMIUM CHECK ===
    private void checkPremiumAndToggleAds() {
        if (webView == null) return;
        webView.evaluateJavascript("(function(){ try { return window.__EV_PREMIUM === true; } catch(e) { return false; } })()", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String result) {
                boolean premium = "true".equals(result);
                if (premium != isPremiumUser) {
                    isPremiumUser = premium;
                }
            }
        });
    }

    // === SMS AUTO-READ FOR OTP ===
    private SmsBroadcastReceiver smsReceiver;
    private boolean smsReceiverRegistered = false;

    // === JS INTERFACE for AdMob navigation events ===
    private class AdWebInterface {
        @android.webkit.JavascriptInterface
        public void onNavigate() {
            handler.post(new Runnable() {
                @Override public void run() {
                    onNavigationEvent();
                }
            });
        }

        @android.webkit.JavascriptInterface
        public void showAd() {
            handler.post(new Runnable() {
                @Override public void run() {
                    showInterstitialAd();
                }
            });
        }

        @android.webkit.JavascriptInterface
        public boolean isAdReady() {
            return interstitialAd != null;
        }
    }

    private void startSmsRetriever() {
        try {
            com.google.android.gms.auth.api.phone.SmsRetrieverClient client =
                com.google.android.gms.auth.api.phone.SmsRetriever.getClient(this);
            com.google.android.gms.tasks.Task<Void> task = client.startSmsRetriever();
            task.addOnSuccessListener(new com.google.android.gms.tasks.OnSuccessListener<Void>() {
                @Override
                public void onSuccess(Void aVoid) {
                    Log.d(TAG, "SMS Retriever started");
                    registerSmsReceiver();
                }
            });
            task.addOnFailureListener(new com.google.android.gms.tasks.OnFailureListener() {
                @Override
                public void onFailure(Exception e) {
                    Log.e(TAG, "SMS Retriever failed: " + e.getMessage());
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "startSmsRetriever error: " + e.getMessage());
        }
    }

    private void registerSmsReceiver() {
        try {
            if (smsReceiver != null && smsReceiverRegistered) {
                try { unregisterReceiver(smsReceiver); } catch (Exception e) {}
                smsReceiverRegistered = false;
            }
            smsReceiver = new SmsBroadcastReceiver();
            IntentFilter filter = new IntentFilter(com.google.android.gms.auth.api.phone.SmsRetriever.SMS_RETRIEVED_ACTION);
            if (Build.VERSION.SDK_INT >= 33) {
                registerReceiver(smsReceiver, filter, Context.RECEIVER_EXPORTED);
            } else {
                registerReceiver(smsReceiver, filter);
            }
            smsReceiverRegistered = true;
        } catch (Exception e) {
            Log.e(TAG, "registerSmsReceiver error: " + e.getMessage());
        }
    }

    private void deliverOtpToWebView(final String otp) {
        handler.post(new Runnable() {
            @Override
            public void run() {
                if (webView != null) {
                    String js = "if(window.__EV_OTP_CALLBACK){window.__EV_OTP_CALLBACK('" + otp + "');}";
                    webView.evaluateJavascript(js, null);
                    Log.d(TAG, "OTP delivered to WebView: " + otp);
                }
            }
        });
    }

    private class OtpWebInterface {
        @android.webkit.JavascriptInterface
        public void requestOtp() {
            startSmsRetriever();
        }
    }

    private class SmsBroadcastReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(android.content.Context context, Intent intent) {
            if (com.google.android.gms.auth.api.phone.SmsRetriever.SMS_RETRIEVED_ACTION.equals(intent.getAction())) {
                android.os.Bundle extras = intent.getExtras();
                if (extras == null) return;
                String message = (String) extras.get(com.google.android.gms.auth.api.phone.SmsRetriever.EXTRA_SMS_MESSAGE);
                if (message != null) {
                    java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("(\\d{6})");
                    java.util.regex.Matcher matcher = pattern.matcher(message);
                    if (matcher.find()) {
                        String otp = matcher.group(1);
                        deliverOtpToWebView(otp);
                    }
                }
            }
        }
    }

    private int recoveryAttemptCount = 0;

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
            if (!webViewReady) {
                recoveryAttemptCount = 0;
                scheduleRecoveryCheck(1500);
            }
            splashScreen.setVisibility(View.GONE);
            webView.setVisibility(View.VISIBLE);
        }
    }

    private void scheduleRecoveryCheck(final long delayMs) {
        if (webView == null || splashScreen == null) return;
        webView.postDelayed(new Runnable() {
            @Override public void run() {
                if (webView == null) return;
                if (webView.getContentHeight() == 0) {
                    recoveryAttemptCount++;
                    SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                    String lastUrl = prefs.getString(KEY_URL, appUrl);
                    webView.loadUrl(lastUrl);
                    if (recoveryAttemptCount < 3) {
                        scheduleRecoveryCheck(3000);
                    }
                }
                splashScreen.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);
            }
        }, delayMs);
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (smsReceiver != null && smsReceiverRegistered) {
            try { unregisterReceiver(smsReceiver); } catch (Exception e) {}
            smsReceiverRegistered = false;
        }
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent != null && intent.getData() != null) {
            String url = intent.getData().toString();
            if (webView != null) {
                webView.loadUrl(url);
            }
        }
    }
}
