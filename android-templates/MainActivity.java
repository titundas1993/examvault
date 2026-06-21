package com.examvault.app;

import android.app.Activity;
import android.app.AlertDialog;
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
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.initialization.InitializationStatus;
import com.google.android.gms.ads.initialization.OnInitializationCompleteListener;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.FullScreenContentCallback;

public class MainActivity extends Activity {
    private WebView webView;
    private View splashScreen;
    private InterstitialAd interstitialAd;
    private static final String PREFS_NAME = "examvault_prefs";
    private static final String KEY_URL = "last_url";
    private String appUrl = "${APP_URL}";
    private String admobInterstitialId = "${ADMOB_INTERSTITIAL_ID}";
    private boolean webViewReady = false;
    private int navCount = 0;
    private static final int INTERSTITIAL_INTERVAL = 3;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
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

        // Container for WebView + splash (overlapping) — full screen, no banner
        FrameLayout webContainer = new FrameLayout(this);
        webContainer.addView(splashScreen, new FrameLayout.LayoutParams(-1, -1));

        // === WEBVIEW ===
        webView = new WebView(this);
        webContainer.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        webView.setVisibility(View.GONE);
        webView.setBackgroundColor(Color.parseColor("#001A4B"));

        // Full screen WebView — no banner ad
        setContentView(webContainer);

        // === ADMOB INIT (for interstitial only, no banner) ===
        MobileAds.initialize(this, new OnInitializationCompleteListener() {
            @Override
            public void onInitializationComplete(InitializationStatus status) {
                Log.d("ExamVault", "AdMob initialized");
            }
        });

        // Load interstitial ad
        loadInterstitialAd();

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
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
                if (host != null &&
                    (host.contains("examvault") ||
                     host.contains("vercel.app") ||
                     host.contains("firebaseio.com") ||
                     host.contains("googleapis.com") ||
                     host.contains("firebaseapp.com"))) {
                    return false;
                }
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
        webView.evaluateJavascript("(function(){ try { var s = window.__ZUSTAND_STORE__; if(s && s.getState) { var st = s.getState(); if(st.currentView === 'exam') { st.setExamBackWarning(true); return 'exam_warning'; } else if(st.canGoBack && st.canGoBack()) { st.goBack(); return 'went_back'; } else if(st.currentView === 'home') { return 'at_home'; } else { st.goBack(); return 'went_back'; } } return 'no_store'; } catch(e) { return 'error'; } })()", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String result) {
                result = result != null ? result.replace("\"", "") : "";
                if ("exam_warning".equals(result)) {
                    // Warning dialog shown in JS
                    onNavigationEvent();
                } else if ("went_back".equals(result)) {
                    // done
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
    private void loadInterstitialAd() {
        AdRequest adRequest = new AdRequest.Builder().build();
        InterstitialAd.load(this, admobInterstitialId, adRequest,
            new InterstitialAdLoadCallback() {
                @Override
                public void onAdLoaded(InterstitialAd ad) {
                    interstitialAd = ad;
                    interstitialAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                        @Override
                        public void onAdDismissedFullScreenContent() {
                            interstitialAd = null;
                            loadInterstitialAd(); // preload next
                        }
                    });
                }
                @Override
                public void onAdFailedToLoad(LoadAdError error) {
                    interstitialAd = null;
                }
            });
    }

    private void showInterstitialAd() {
        if (isPremiumUser) return; // No interstitial for premium users
        if (interstitialAd != null) {
            interstitialAd.show(this);
        } else {
            loadInterstitialAd();
        }
    }

    private void onNavigationEvent() {
        navCount++;
        if (navCount >= INTERSTITIAL_INTERVAL) {
            navCount = 0;
            showInterstitialAd();
        }
    }

    // === PREMIUM CHECK — skip interstitial for premium users ===
    private boolean isPremiumUser = false;

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
