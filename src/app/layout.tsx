import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#001A4B",
};

export const metadata: Metadata = {
  title: "EXAMVAULT - Mock Tests, PYQs & Exam Updates",
  description: "Practice mock tests, solve previous year questions, and stay updated with upcoming exams. Your complete exam preparation companion.",
  keywords: ["EXAMVAULT", "Mock Test", "PYQ", "Exam Updates", "WBCS", "SSC", "Railway", "Banking", "UPSC", "JEXPO"],
  authors: [{ name: "EXAMVAULT" }],
  icons: {
    icon: "/logo.svg",
    apple: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ExamVault",
  },
  openGraph: {
    title: "EXAMVAULT - Mock Tests, PYQs & Exam Updates",
    description: "Your complete exam preparation companion",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="ExamVault" />
        {/* Google AdSense */}
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1742730064755213" crossOrigin="anonymous" data-ad-client="ca-pub-1742730064755213" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* ===== CSS-ONLY SPLASH SCREEN ===== */
              #ev-splash {
                position: fixed; inset: 0; z-index: 999999;
                background: #001A4B;
                display: flex; flex-direction: column;
                align-items: center; justify-content: center;
                transition: opacity 0.4s ease-out, visibility 0.4s ease-out;
              }
              #ev-splash.ev-hide {
                opacity: 0; visibility: hidden; pointer-events: none;
              }
              #ev-splash .ev-logo {
                width: 7rem; height: 7rem; border-radius: 1.5rem;
                background: linear-gradient(135deg, #EB6301, #FEA216);
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 25px 50px -12px rgba(235,99,1,0.4);
                animation: ev-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
                font-size: 3rem;
              }
              #ev-splash .ev-title {
                color: white; font-size: 2.25rem; font-weight: 900;
                letter-spacing: -0.02em; margin-top: 1.5rem;
                animation: ev-fade-up 0.5s ease-out 0.3s both;
              }
              #ev-splash .ev-title span { color: #EB6301; }
              #ev-splash .ev-sub {
                color: rgba(254,162,22,0.8); font-size: 0.875rem;
                margin-top: 0.5rem; letter-spacing: 0.025em;
                animation: ev-fade-up 0.5s ease-out 0.5s both;
              }
              #ev-splash .ev-bar {
                position: absolute; bottom: 0; left: 0;
                width: 100%; height: 4px;
                background: linear-gradient(90deg, #EB6301, #FEA216, #EB6301);
                transform-origin: left; animation: ev-bar 2s ease-out 0.2s both;
              }
              @keyframes ev-pop {
                from { transform: scale(0) rotate(-180deg); }
                to { transform: scale(1) rotate(0deg); }
              }
              @keyframes ev-fade-up {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }
              @keyframes ev-bar {
                from { transform: scaleX(0); }
                to { transform: scaleX(1); }
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {/* CSS-ONLY Splash Overlay — auto-removes after React hydrates */}
        <div id="ev-splash">
          <div className="ev-logo">📚</div>
          <h1 className="ev-title">EXAM<span>VAULT</span></h1>
          <p className="ev-sub">Mock Tests, PYQs &amp; Exam Updates</p>
          <div className="ev-bar"></div>
        </div>

        {children}
        <Toaster />

        {/* Remove splash after React hydrates & app is ready */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Remove splash screen after a short delay to let React hydrate
              setTimeout(function() {
                var splash = document.getElementById('ev-splash');
                if (splash) {
                  splash.classList.add('ev-hide');
                  // Remove from DOM after fade animation completes
                  setTimeout(function() {
                    if (splash.parentNode) splash.parentNode.removeChild(splash);
                  }, 500);
                }
              }, 2200);

              // Register Service Worker
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('SW registered:', reg.scope);
                  }).catch(function(err) {
                    console.log('SW registration failed:', err);
                  });
                });
              }

              // Prevent accidental back navigation exit in PWA
              window.addEventListener('beforeunload', function(e) {
                var store = window.__ZUSTAND_STORE__;
                if (store) {
                  try {
                    var state = store.getState();
                    if (state && state.currentView === 'exam') {
                      e.preventDefault();
                      e.returnValue = 'Your test progress will be lost. Are you sure you want to leave?';
                      return e.returnValue;
                    }
                  } catch(err) {}
                }
              });
            `,
          }}
        />
      </body>
    </html>
  );
}