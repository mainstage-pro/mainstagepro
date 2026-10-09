import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fechasConAjuste } from "@/lib/show-canales";
import OutputListClient, { type CanalOutput } from "./OutputListClient";
import type { RiderOrigen } from "../ImportarCanales";

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
          rigId: true,
          rigPuerto: true,
          notas: true,
        },
      },
      rigs: {
        orderBy: { orden: "asc" },
        select: { id: true, nombre: true, equipo: true, cadena: true, conexion: true, notas: true },
      },
    },
  });

  if (!rider || !rider.activo) notFound();

  const personas = await prisma.artistaPersona.findMany({
    where: { artistaId: id, activo: true },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    select: { id: true, nombre: true, rol: true, instrumento: true },
  });

  const otras = await prisma.artistaRider.findMany({
    where: { artistaId: id, activo: true, id: { not: riderId }, canales: { some: { tipo: "OUTPUT" } } },
    orderBy: { version: "desc" },
    select: {
      id: true,
      nombre: true,
      version: true,
      contexto: true,
      _count: { select: { canales: { where: { tipo: "OUTPUT" } } } },
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
    <OutputListClient
      artistaId={id}
      riderId={riderId}
      mixesMonitor={rider.mixesMonitor}
      canalesIniciales={rider.canales as CanalOutput[]}
      rigsIniciales={rider.rigs}
      personas={personas}
      origenes={origenes}
      divergenciasIniciales={await fechasConAjuste(riderId)}
    />
  );
}
