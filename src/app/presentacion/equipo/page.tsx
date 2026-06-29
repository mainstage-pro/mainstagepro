import EquipoClient from "./EquipoClient";
import { getPresentationMetadata } from "@/lib/metadata";

export const metadata = getPresentationMetadata({
  title: "Nuestro Equipo y Staff Técnico",
  description: "Conoce al equipo de ingenieros, productores, diseñadores de iluminación y staff técnico especializado detrás de cada evento de Mainstage Pro.",
  path: "/presentacion/equipo",
});

export const dynamic = "force-static";

export default function EquipoPage() {
  return <EquipoClient />;
}
