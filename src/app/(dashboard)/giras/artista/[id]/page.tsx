import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DatosArtistaClient from "./DatosArtistaClient";

export const dynamic = "force-dynamic";

export default async function ArtistaDatosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [artista, clientes] = await Promise.all([
    prisma.artista.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        genero: true,
        origen: true,
        contactoNombre: true,
        contactoTelefono: true,
        contactoEmail: true,
        instagram: true,
        sitioWeb: true,
        notas: true,
        clienteId: true,
        logoUrl: true,
        tipoFormacion: true,
        integrantesNum: true,
        activo: true,
        giras: {
          where: { activo: true },
          orderBy: { createdAt: "desc" },
          select: { id: true, nombre: true, estado: true, fechaInicio: true, fechaFin: true, _count: { select: { shows: true } } },
          take: 20,
        },
      },
    }),
    prisma.cliente.findMany({
      select: { id: true, nombre: true, empresa: true },
      orderBy: { nombre: "asc" },
      take: 400,
    }),
  ]);

  if (!artista || !artista.activo) notFound();

  return (
    <DatosArtistaClient
      artista={{
        id: artista.id,
        nombre: artista.nombre,
        genero: artista.genero,
        origen: artista.origen,
        contactoNombre: artista.contactoNombre,
        contactoTelefono: artista.contactoTelefono,
        contactoEmail: artista.contactoEmail,
        instagram: artista.instagram,
        sitioWeb: artista.sitioWeb,
        notas: artista.notas,
        clienteId: artista.clienteId,
        logoUrl: artista.logoUrl,
        tipoFormacion: artista.tipoFormacion,
        integrantesNum: artista.integrantesNum,
      }}
      clientes={clientes}
      giras={artista.giras.map((g) => ({
        id: g.id,
        nombre: g.nombre,
        estado: g.estado,
        fechaInicio: g.fechaInicio?.toISOString() ?? null,
        fechaFin: g.fechaFin?.toISOString() ?? null,
        shows: g._count.shows,
      }))}
    />
  );
}
