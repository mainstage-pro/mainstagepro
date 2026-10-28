import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DatosArtistaClient from "./DatosArtistaClient";

export const dynamic = "force-dynamic";

export default async function ArtistaDatosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [artista, clientes, representacion] = await Promise.all([
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
        tiktok: true,
        youtube: true,
        spotify: true,
        bio: true,
        notas: true,
        clienteId: true,
        logoUrl: true,
        tipoFormacion: true,
        integrantesNum: true,
        activo: true,
        enRosterGiras: true,
        rosterNivelServicio: true,
        rosterEstado: true,
        rosterFechaAlta: true,
        rosterNotas: true,
        giras: {
          where: { activo: true },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            nombre: true,
            tipo: true,
            estado: true,
            fechaInicio: true,
            fechaFin: true,
            _count: { select: { shows: true } },
          },
          take: 20,
        },
      },
    }),
    prisma.cliente.findMany({
      select: { id: true, nombre: true, empresa: true },
      orderBy: { nombre: "asc" },
      take: 400,
    }),
    prisma.artistaPersona.findMany({
      where: { artistaId: id, activo: true, rol: { in: ["PERSONAL_MANAGER", "BOOKING", "TOUR_MANAGER"] } },
      orderBy: { orden: "asc" },
      select: { id: true, nombre: true, rol: true, telefono: true, email: true },
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
        tiktok: artista.tiktok,
        youtube: artista.youtube,
        spotify: artista.spotify,
        bio: artista.bio,
        notas: artista.notas,
        clienteId: artista.clienteId,
        logoUrl: artista.logoUrl,
        tipoFormacion: artista.tipoFormacion,
        integrantesNum: artista.integrantesNum,
        enRosterGiras: artista.enRosterGiras,
        rosterNivelServicio: artista.rosterNivelServicio,
        rosterEstado: artista.rosterEstado,
        rosterFechaAlta: artista.rosterFechaAlta?.toISOString() ?? null,
        rosterNotas: artista.rosterNotas,
      }}
      clientes={clientes}
      representacion={representacion}
      giras={artista.giras.map((g) => ({
        id: g.id,
        nombre: g.nombre,
        tipo: g.tipo,
        estado: g.estado,
        fechaInicio: g.fechaInicio?.toISOString() ?? null,
        fechaFin: g.fechaFin?.toISOString() ?? null,
        shows: g._count.shows,
      }))}
    />
  );
}
