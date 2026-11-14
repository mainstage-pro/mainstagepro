import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import OfflineProvider from "@/components/OfflineProvider";
import { DescargaProvider } from "@/components/DescargaProvider";

// Space Grotesk servida desde el repo (src/app/fonts, licencia OFL). Con
// next/font/google cada build la descargaba de Google y, si esa descarga fallaba,
// el deploy completo se caía.
const heading = localFont({
  src: [
    { path: "./fonts/space-grotesk-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/space-grotesk-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/space-grotesk-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mainstage Pro — Sistema Operativo",
  description: "Sistema Operativo de Mainstage Pro",
  manifest: "/manifest.json",
  icons: {
    icon: "/pwa-icon-192.png",
    apple: "/pwa-apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mainstage Pro — Sistema Operativo",
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
    <html lang="es" className={`h-full ${heading.variable}`}>
      <body className="h-full antialiased">
        <DescargaProvider>{children}</DescargaProvider>
        <OfflineProvider />
      </body>
    </html>
  );
}
