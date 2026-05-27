import type { Metadata, Viewport } from "next";
import "./globals.css";
import OfflineProvider from "@/components/OfflineProvider";

export const metadata: Metadata = {
  title: "Mainstage Pro",
  description: "Sistema operativo Mainstage Pro",
  manifest: "/manifest.json",
  icons: {
    icon: "/pwa-icon-192.png",
    apple: "/pwa-apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mainstage Pro",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full antialiased">
        {/* Force SW update — clears old JS chunks cache on new deploy */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(regs) {
              regs.forEach(function(reg) {
                // Send skipWaiting to activate the new SW immediately
                if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                if (reg.installing) reg.installing.postMessage({ type: 'SKIP_WAITING' });
                // If SW cache version is old, unregister completely so fresh SW installs
                var swUrl = reg.active && reg.active.scriptURL;
                if (swUrl && swUrl.includes('/sw.js')) {
                  reg.update();
                }
              });
            });
            navigator.serviceWorker.addEventListener('controllerchange', function() {
              // New SW took control — reload once to get fresh chunks
              if (!sessionStorage.getItem('sw-reloaded')) {
                sessionStorage.setItem('sw-reloaded', '1');
                window.location.reload();
              }
            });
          }
        ` }} />
        {children}
        <OfflineProvider />
      </body>
    </html>
  );
}
