import type { Metadata } from "next";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Formularios — Mainstage Pro",
  description: "Formularios internos del equipo Mainstage Pro.",
  robots: { index: false, follow: false },
};

export default function FormsLayout({ children }: { children: React.ReactNode }) {
  // Sin sidebar, sin header de plataforma — landing page privada para el equipo
  return <Providers>{children}</Providers>;
}
