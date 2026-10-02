import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RiderEquipoClient, { type LineaRider } from "./RiderEquipoClient";

export const dynamic = "force-dynamic";

export default async function RiderEquipoPage({ params }: { params: Promise<{ id: string; riderId: string }> }) {
  const { id, riderId } = await params;

  const rider = await prisma.artistaRider.findFirst({
    where: { id: riderId, artistaId: id },
    select: {
      id: true,
      activo: true,
      lineas: {
        orderBy: { orden: "asc" },
        select: {
          id: true,
          disciplina: true,
          concepto: true,
          cantidad: true,
          unidad: true,
          equipoId: true,
          preferido: true,
          aceptables: true,
          noAceptable: true,
          prioridad: true,
          provistoPor: true,
          notas: true,
          orden: true,
        },
      },
    },
  });

  if (!rider || !rider.activo) notFound();

  const equipos = await prisma.equipo.findMany({
    where: { activo: true },
    select: { id: true, descripcion: true, marca: true, modelo: true },
    orderBy: { descripcion: "asc" },
  });

  return (
    <RiderEquipoClient
      riderId={riderId}
      lineasIniciales={rider.lineas as LineaRider[]}
      equipos={equipos}
    />
  );
}
