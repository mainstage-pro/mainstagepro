import type { Metadata } from "next";
import GaleriaClient from "./GaleriaClient";

export const metadata: Metadata = {
  title: "Galería de Eventos — Mainstage Pro",
  description: "Nuestro trabajo en imágenes: musicales, sociales y empresariales. Producción audiovisual profesional en Querétaro.",
  openGraph: {
    title: "Galería de Eventos — Mainstage Pro",
    description: "Producción técnica para eventos musicales, sociales y empresariales.",
    images: [{ url: "/images/presentacion/musicales/Musicales-076.jpg" }],
  },
};

export default function GaleriaPage() {
  return <GaleriaClient />;
}
