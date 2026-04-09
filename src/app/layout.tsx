import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mainstage Pro",
  description: "Sistema operativo Mainstage Pro",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
