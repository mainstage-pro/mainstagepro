import PresentacionProClient from "./PresentacionProClient";
import { getPresentationMetadata } from "@/lib/metadata";

export const metadata = getPresentationMetadata({
  title: "Producción técnica de eventos",
  description: "Renta de equipo y producción técnica integral — audio, iluminación y video — para eventos musicales, sociales y empresariales.",
  path: "/presentacion/pro",
});

export const dynamic = "force-static";
export default function PresentacionProPage() { return <PresentacionProClient />; }
