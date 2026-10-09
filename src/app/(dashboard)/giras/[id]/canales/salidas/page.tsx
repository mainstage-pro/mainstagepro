import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fechasConAjuste } from "@/lib/show-canales";
import OutputListClient, {
  type CanalOutput,
} from "@/app/(dashboard)/giras/artista/[id]/rider/[riderId]/outputs/OutputListClient";
import { origenesDeImportacion, riderEditableDeGira } from "../rider";

export const dynamic = "force-dynamic";

export default async function CanalesOutputGiraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const rider = await riderEditableDeGira(id);
  if (!rider) notFound();

  const canales = await prisma.artistaRiderCanal.findMany({
    where: { riderId: rider.id, tipo: "OUTPUT" },
    orderBy: { numero: "asc" },
    select: { id: true, numero: true, nombre: true, tipoSalida: true, estereo: true, personaId: true, notas: true },
  });

  const personas = await prisma.artistaPersona.findMany({
    where: { artistaId: rider.artistaId, activo: true },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    select: { id: true, nombre: true, rol: true, instrumento: true },
  });

  const origenes = await origenesDeImportacion(rider.artistaId, rider.id, "OUTPUT");

  return (
    <OutputListClient
      artistaId={rider.artistaId}
      riderId={rider.id}
      mixesMonitor={rider.mixesMonitor}
      canalesIniciales={canales as CanalOutput[]}
      personas={personas}
      origenes={origenes}
      divergenciasIniciales={await fechasConAjuste(rider.id)}
    />
  );
}
