import BrandbookClient from "./BrandbookClient";
import { getPresentationMetadata } from "@/lib/metadata";

export const metadata = getPresentationMetadata({
  title: "Brandbook y Manual de Identidad",
  description: "Manual oficial de identidad de marca, logotipos, colores, tipografías y recursos de diseño de Mainstage Pro.",
  path: "/presentacion/brandbook",
});

export const dynamic = "force-static";
export default function BrandbookPage() { return <BrandbookClient />; }
