import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fechasConAjuste } from "@/lib/show-canales";
import InputListClient, {
  type CanalInput,
} from "@/app/(dashboard)/giras/artista/[id]/rider/[riderId]/inputs/InputListClient";
import { origenesDeImportacion, riderEditableDeGira } from "./rider";

export const dynamic = "force-dynamic";

export default async function CanalesInputGiraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const rider = await riderEditableDeGira(id);
  if (!rider) notFound();

  const canales = await prisma.artistaRiderCanal.findMany({
    where: { riderId: rider.id, tipo: "INPUT" },
    orderBy: { numero: "asc" },
    select: {
      id: true,
      numero: true,
      nombre: true,
      instrumento: true,
      microfono: true,
      alternativas: true,
      soporte: true,
      phantom: true,
      inserto: true,
      notas: true,
    },
  });

  const origenes = await origenesDeImportacion(rider.artistaId, rider.id, "INPUT");

  return (
    <InputListClient
      riderId={rider.id}
      canalesMinimos={rider.canalesMinimos}
      canalesIniciales={canales as CanalInput[]}
      origenes={origenes}
      divergenciasIniciales={await fechasConAjuste(rider.id)}
    />
  );
}
