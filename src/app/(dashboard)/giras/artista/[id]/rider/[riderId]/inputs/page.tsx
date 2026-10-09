import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fechasConAjuste } from "@/lib/show-canales";
import InputListClient, { type CanalInput } from "./InputListClient";
import type { RiderOrigen } from "../ImportarCanales";

export const dynamic = "force-dynamic";

export default async function RiderInputsPage({ params }: { params: Promise<{ id: string; riderId: string }> }) {
  const { id, riderId } = await params;

  const rider = await prisma.artistaRider.findFirst({
    where: { id: riderId, artistaId: id },
    select: {
      id: true,
      activo: true,
      canalesMinimos: true,
      canales: {
        where: { tipo: "INPUT" },
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
      },
    },
  });

  if (!rider || !rider.activo) notFound();

  const otras = await prisma.artistaRider.findMany({
    where: { artistaId: id, activo: true, id: { not: riderId }, canales: { some: { tipo: "INPUT" } } },
    orderBy: { version: "desc" },
    select: {
      id: true,
      nombre: true,
      version: true,
      contexto: true,
      _count: { select: { canales: { where: { tipo: "INPUT" } } } },
    },
  });
  const origenes: RiderOrigen[] = otras.map((o) => ({
    id: o.id,
    nombre: o.nombre,
    version: o.version,
    contexto: o.contexto,
    canales: o._count.canales,
  }));

  return (
    <InputListClient
      riderId={riderId}
      canalesMinimos={rider.canalesMinimos}
      canalesIniciales={rider.canales as CanalInput[]}
      origenes={origenes}
      divergenciasIniciales={await fechasConAjuste(riderId)}
    />
  );
}
