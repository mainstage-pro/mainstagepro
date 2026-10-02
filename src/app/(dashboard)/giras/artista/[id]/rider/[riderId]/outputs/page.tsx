import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OutputListClient, { type CanalOutput } from "./OutputListClient";

export const dynamic = "force-dynamic";

export default async function RiderOutputsPage({ params }: { params: Promise<{ id: string; riderId: string }> }) {
  const { id, riderId } = await params;

  const rider = await prisma.artistaRider.findFirst({
    where: { id: riderId, artistaId: id },
    select: {
      id: true,
      activo: true,
      mixesMonitor: true,
      canales: {
        where: { tipo: "OUTPUT" },
        orderBy: { numero: "asc" },
        select: {
          id: true,
          numero: true,
          nombre: true,
          tipoSalida: true,
          estereo: true,
          personaId: true,
          notas: true,
        },
      },
    },
  });

  if (!rider || !rider.activo) notFound();

  const personas = await prisma.artistaPersona.findMany({
    where: { artistaId: id, activo: true },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    select: { id: true, nombre: true, rol: true, instrumento: true },
  });

  return (
    <OutputListClient
      artistaId={id}
      riderId={riderId}
      mixesMonitor={rider.mixesMonitor}
      canalesIniciales={rider.canales as CanalOutput[]}
      personas={personas}
    />
  );
}
