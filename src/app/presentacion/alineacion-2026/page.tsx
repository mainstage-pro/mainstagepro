import PresentacionEquipoClient from "./PresentacionEquipoClient";
import { getPresentationMetadata } from "@/lib/metadata";

export const metadata = getPresentationMetadata({
  title: "Alineación Estratégica 2026",
  description: "Presentación interna del equipo, metas operativas y alineación estratégica de Mainstage Pro para la temporada 2026.",
  path: "/presentacion/alineacion-2026",
});

export default function Page() {
  return <PresentacionEquipoClient />;
}
