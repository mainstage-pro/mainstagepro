import PresentacionLiveClient from "./PresentacionLiveClient";
import { getPresentationMetadata } from "@/lib/metadata";

export const metadata = getPresentationMetadata({
  title: "Mainstage Live — Producción de gira",
  description: "Production Management, Tour Management y Stage Management para artistas emergentes que están construyendo algo real.",
  path: "/presentacion/live",
});

export const dynamic = "force-static";
export default function PresentacionLivePage() { return <PresentacionLiveClient />; }
