import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RidersArtistaClient, { type RiderFila } from "./RidersArtistaClient";

export const dynamic = "force-dynamic";

export default async function ArtistaRidersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const artista = await prisma.artista.findUnique({
    where: { id },
    select: { id: true, nombre: true, activo: true, tipoFormacion: true },
  });
  if (!artista || !artista.activo) notFound();

  const riders = await prisma.artistaRider.findMany({
    where: { artistaId: id, activo: true },
    orderBy: { version: "desc" },
    select: {
      id: true,
      nombre: true,
      version: true,
      esActivo: true,
      formacion: true,
      canalesMinimos: true,
      mixesMonitor: true,
      updatedAt: true,
      _count: { select: { canales: true, lineas: true, giras: true } },
    },
  });

  const filas: RiderFila[] = riders.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    version: r.version,
    esActivo: r.esActivo,
    formacion: r.formacion,
    canalesMinimos: r.canalesMinimos,
    mixesMonitor: r.mixesMonitor,
    actualizado: r.updatedAt.toISOString(),
    canales: r._count.canales,
    lineas: r._count.lineas,
    giras: r._count.giras,
  }));

  return (
    <RidersArtistaClient
      artistaId={id}
      artistaNombre={artista.nombre}
      tipoFormacion={artista.tipoFormacion}
      ridersIniciales={filas}
    />
  );
}
