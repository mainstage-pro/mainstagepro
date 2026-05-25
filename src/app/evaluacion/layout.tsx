import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Evaluación de servicio — Mainstage Pro",
  description: "Comparte tu experiencia y ayúdanos a mejorar.",
  robots: { index: false, follow: false },
};

export default function EvaluacionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No sidebar, no header, no auth — página pública
  return <>{children}</>;
}
