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
  manifest: "/manifest.json",
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
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="ExamVault" />
        {/* Google AdSense */}
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4856877072247042" crossOrigin="anonymous" data-ad-client="ca-pub-4856877072247042" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        {/* Debug error overlay — shown by global error handler */}
        <div
          id="__ev_error_debug"
          style={{
            display: "none",
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(0,0,0,0.85)",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div style={{
            maxWidth: "500px",
            width: "100%",
            background: "#1e1e1e",
            borderRadius: "16px",
            padding: "24px",
            border: "2px solid #ef4444",
            overflow: "auto",
            maxHeight: "80vh",
          }}>
            <p style={{ color: "#f87171", fontSize: "11px", fontWeight: 700, marginBottom: "4px", textTransform: "uppercase" }}>Error Detected</p>
            <p className="ev-error-msg" style={{ color: "#fbbf24", fontSize: "14px", fontWeight: 600, marginBottom: "12px", wordBreak: "break-word" }}></p>
            <pre className="ev-error-stack" style={{ color: "#9ca3af", fontSize: "11px", whiteSpace: "pre-wrap", wordBreak: "break-word", background: "#111", padding: "12px", borderRadius: "8px", maxHeight: "300px", overflow: "auto" }}></pre>
          </div>
        </div>
        <Toaster />
        {/* Service Worker Registration + BeforeUnload */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
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
                // Only show confirmation if user is logged in and in a test
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

              // Expose store for beforeunload
              (function() {
                var origCreate = null;
                var checkInterval = setInterval(function() {
                  if (window.__ZUSTAND_DEVS__) {
                    clearInterval(checkInterval);
                  }
                }, 1000);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
