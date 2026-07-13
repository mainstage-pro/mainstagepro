import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { VISION_AREAS, isVisionArea } from "@/lib/vision-semanal";
import VisionSemanalClient from "./VisionSemanalClient";

export const dynamic = "force-dynamic";

export default async function VisionSemanalPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Con ?area= se abre directo el documento de esa área (link para compartir);
  // sin él, se muestra la portada con la lista de documentos.
  const sp = await searchParams;
  const areaInicial = isVisionArea(sp.area) ? sp.area : null;

  return (
    <VisionSemanalClient
      areas={[...VISION_AREAS]}
      areaInicial={areaInicial}
      userArea={session.area ?? null}
      isAdmin={session.role === "ADMIN"}
    />
  );
}
