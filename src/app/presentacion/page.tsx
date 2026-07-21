import PresentacionIndexClient from "./PresentacionIndexClient";
import { getPresentationMetadata } from "@/lib/metadata";

export const metadata = getPresentationMetadata({
  title: "Presentaciones",
  description: "Todo lo que necesitas saber de Mainstage Pro: servicios, eventos musicales, sociales y empresariales, galería e inventario de equipo.",
  path: "/presentacion",
});

export const dynamic = "force-static";

export default function PresentacionIndexPage() {
  return <PresentacionIndexClient />;
}
