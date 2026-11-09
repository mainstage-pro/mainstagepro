import PresentacionCreativeClient from "./PresentacionCreativeClient";
import { getPresentationMetadata } from "@/lib/metadata";

export const metadata = getPresentationMetadata({
  title: "Mainstage Creative — Diseño de iluminación y renders",
  description: "Diseño de iluminación, renders 3D y documentación técnica para shows que se pueden montar igual en cualquier escenario.",
  path: "/presentacion/creative",
});

export const dynamic = "force-static";
export default function PresentacionCreativePage() { return <PresentacionCreativeClient />; }
