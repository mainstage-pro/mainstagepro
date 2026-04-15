import type { Metadata } from "next";
import "./globals.css";
import OfflineProvider from "@/components/OfflineProvider";

export const metadata: Metadata = {
  title: "Mainstage Pro",
  description: "Sistema operativo Mainstage Pro",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo-icon.png",
    apple: "/logo-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mainstage Pro",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full antialiased">
        {children}
        <OfflineProvider />
      </body>
    </html>
  );
}
