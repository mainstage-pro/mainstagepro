import PaquetesClient from "./PaquetesClient";
import { getPresentationMetadata } from "@/lib/metadata";

export const metadata = getPresentationMetadata({
  title: "Paquetes",
  description: "Paquetes de producción técnica para bodas, XV años, conciertos y eventos corporativos. Todo lo que incluye cada paquete, listo para cotizar.",
  path: "/presentacion/paquetes",
});

export const dynamic = "force-static";

export default function PaquetesPage() {
  return <PaquetesClient />;
}
