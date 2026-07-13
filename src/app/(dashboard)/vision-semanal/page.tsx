import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { VISION_AREAS, isVisionArea, type VisionAreaKey } from "@/lib/vision-semanal";
import VisionSemanalClient from "./VisionSemanalClient";

export const dynamic = "force-dynamic";

export default async function VisionSemanalPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Área inicial: la del usuario si es una de las cubiertas; si no, la primera.
  const areaInicial: VisionAreaKey = isVisionArea(session.area)
    ? session.area
    : VISION_AREAS[0];

  return (
    <VisionSemanalClient
      areas={[...VISION_AREAS]}
      areaInicial={areaInicial}
      userArea={session.area ?? null}
      isAdmin={session.role === "ADMIN"}
    />
  );
}
