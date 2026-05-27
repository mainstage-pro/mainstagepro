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
        {/* SW Kill Switch — borra caché roto y recarga */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', function(e) {
              if (e.data && e.data.type === 'SW_KILLED') {
                window.location.reload(true);
              }
            });
            navigator.serviceWorker.getRegistrations().then(function(regs) {
              regs.forEach(function(reg) { reg.update(); });
            });
          }
        ` }} />
        {children}
        <OfflineProvider />
      </body>
    </html>
  );
}
