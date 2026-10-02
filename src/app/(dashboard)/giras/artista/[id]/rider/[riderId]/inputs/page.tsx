import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import InputListClient, { type CanalInput } from "./InputListClient";

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

  return (
    <InputListClient
      riderId={riderId}
      canalesMinimos={rider.canalesMinimos}
      canalesIniciales={rider.canales as CanalInput[]}
    />
  );
}
