import GaleriaClient from "./GaleriaClient";
import { getPresentationMetadata } from "@/lib/metadata";
import { getGaleriaData } from "@/lib/tipos-evento";

export const metadata = getPresentationMetadata({
  title: "Galería de Eventos y Producciones",
  description: "Nuestro trabajo en imágenes: musicales, sociales y empresariales. Producción audiovisual profesional en Querétaro.",
  path: "/presentacion/galeria",
  image: "/images/presentacion/musicales/Musicales-076.jpg",
});

// Dinámica para sembrar las fotos elegidas en la primera pintura desde el servidor
// y evitar el parpadeo/cambio de portada al hidratar en el cliente.
export const dynamic = "force-dynamic";

export default async function GaleriaPage() {
  const { categorias, heroSlides } = await getGaleriaData();
  return <GaleriaClient initialCategorias={categorias} initialHeroSlides={heroSlides} />;
}
