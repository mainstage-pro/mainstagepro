import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AnexosRiderClient, { type AnexoFila } from "./AnexosRiderClient";

export const dynamic = "force-dynamic";

export default async function RiderAnexosPage({ params }: { params: Promise<{ id: string; riderId: string }> }) {
  const { id, riderId } = await params;

  const rider = await prisma.artistaRider.findFirst({
    where: { id: riderId, artistaId: id },
    select: {
      id: true,
      activo: true,
      stagePlotUrl: true,
      archivos: {
        orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          nombre: true,
          url: true,
          tipo: true,
          mime: true,
          tamanoBytes: true,
          incluirEnPdf: true,
          notas: true,
          orden: true,
        },
      },
    },
  });
  if (!rider || !rider.activo) notFound();

  return (
    <AnexosRiderClient
      riderId={riderId}
      stagePlotUrl={rider.stagePlotUrl}
      anexosIniciales={rider.archivos as AnexoFila[]}
    />
  );
}
