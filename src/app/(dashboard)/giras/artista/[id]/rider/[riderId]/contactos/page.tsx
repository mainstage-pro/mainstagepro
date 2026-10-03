import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ContactosRiderClient, { type ContactoFila, type PersonaDisponible } from "./ContactosRiderClient";

export const dynamic = "force-dynamic";

export default async function RiderContactosPage({
  params,
}: {
  params: Promise<{ id: string; riderId: string }>;
}) {
  const { id, riderId } = await params;

  const rider = await prisma.artistaRider.findFirst({
    where: { id: riderId, artistaId: id },
    select: {
      id: true,
      activo: true,
      contactos: {
        orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          personaId: true,
          nombre: true,
          rol: true,
          telefono: true,
          email: true,
          notas: true,
          enPdf: true,
          orden: true,
        },
      },
    },
  });
  if (!rider || !rider.activo) notFound();

  const personas = await prisma.artistaPersona.findMany({
    where: { artistaId: id, activo: true },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    select: { id: true, nombre: true, rol: true, instrumento: true, telefono: true, email: true },
  });

  return (
    <ContactosRiderClient
      artistaId={id}
      riderId={riderId}
      contactosIniciales={rider.contactos as ContactoFila[]}
      personas={personas as PersonaDisponible[]}
    />
  );
}
