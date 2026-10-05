import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MontajeRiderClient, { type BloqueRider } from "./MontajeRiderClient";

export const dynamic = "force-dynamic";

export default async function RiderMontajePage({ params }: { params: Promise<{ id: string; riderId: string }> }) {
  const { id, riderId } = await params;

  const rider = await prisma.artistaRider.findFirst({
    where: { id: riderId, artistaId: id },
    select: {
      id: true,
      activo: true,
      bloques: {
        orderBy: { orden: "asc" },
        select: {
          id: true,
          titulo: true,
          tipo: true,
          duracionMin: true,
          responsable: true,
          contenido: true,
          orden: true,
        },
      },
    },
  });

  if (!rider || !rider.activo) notFound();

  return <MontajeRiderClient riderId={riderId} bloquesIniciales={rider.bloques as BloqueRider[]} />;
}
