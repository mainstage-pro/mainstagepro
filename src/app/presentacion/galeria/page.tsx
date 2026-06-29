import GaleriaClient from "./GaleriaClient";
import { getPresentationMetadata } from "@/lib/metadata";

export const metadata = getPresentationMetadata({
  title: "Galería de Eventos y Producciones",
  description: "Nuestro trabajo en imágenes: musicales, sociales y empresariales. Producción audiovisual profesional en Querétaro.",
  path: "/presentacion/galeria",
  image: "/images/presentacion/musicales/Musicales-076.jpg",
});

export default function GaleriaPage() {
  return <GaleriaClient />;
}
