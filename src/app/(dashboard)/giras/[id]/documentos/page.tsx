import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DocumentosClient, { type ArchivoFila, type ShowDoc } from "./DocumentosClient";

export const dynamic = "force-dynamic";

/**
 * Los papeles del show o la gira en una sola página: lo que emitimos nosotros (day
 * sheet, rider, advance, listas de canales) y lo que nos llega de afuera (rider
 * de la casa, contrato, plano del foro).
 *
 * El rider se resuelve igual que en los generadores: el enganchado a la gira o,
 * si no hay, el activo del artista. Si no hay ninguno, la página lo dice en vez
 * de ofrecer un botón que va a tronar.
 */
export default async function DocumentosGiraPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const gira = await prisma.gira.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      portalToken: true,
      artistaId: true,
      artista: { select: { nombre: true } },
      rider: { select: { id: true, nombre: true, version: true, esActivo: true } },
      shows: {
        orderBy: { fecha: "asc" },
        select: {
          id: true,
          fecha: true,
          ciudad: true,
          estado: true,
          docsToken: true,
          venue: { select: { nombre: true } },
          _count: { select: { bloques: true, riderLineas: true } },
        },
      },
    },
  });

  if (!gira) notFound();

  // Mismo fallback que `riderDeGira`: si la gira no trae rider enganchado, el
  // documento sale del rider activo del artista.
  const riderFallback = gira.rider
    ? null
    : await prisma.artistaRider.findFirst({
        where: { artistaId: gira.artistaId, activo: true, esActivo: true },
        orderBy: { version: "desc" },
        select: { id: true, nombre: true, version: true, esActivo: true },
      });

  const rider = gira.rider ?? riderFallback;

  const archivos = await prisma.giraArchivo.findMany({
    where: { giraId: id },
    orderBy: { createdAt: "desc" },
    include: { show: { select: { id: true, fecha: true, ciudad: true } } },
  });

  const shows: ShowDoc[] = gira.shows.map((s) => ({
    id: s.id,
    fecha: s.fecha.toISOString(),
    ciudad: s.ciudad,
    venueNombre: s.venue?.nombre ?? null,
    estado: s.estado,
    docsToken: s.docsToken,
    bloques: s._count.bloques,
    renglonesAdvance: s._count.riderLineas,
  }));

  const filas: ArchivoFila[] = archivos.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    url: a.url,
    tipo: a.tipo ?? "OTRO",
    tamanoBytes: a.tamanoBytes,
    createdAt: a.createdAt.toISOString(),
    show: a.show ? { id: a.show.id, fecha: a.show.fecha.toISOString(), ciudad: a.show.ciudad } : null,
  }));

  return (
    <div className="ms-page space-y-5 pb-16">
      <div>
        <h1 className="ms-h1">Documentos</h1>
        <p className="ms-subtitle mt-1">
          Lo que emitimos y lo que nos llega. Los documentos se generan al momento, así que el enlace que compartes
          hoy sigue bueno mañana: no hay que reenviar nada cuando algo cambia.
        </p>
      </div>

      <DocumentosClient
        giraId={id}
        giraNombre={gira.nombre}
        artistaNombre={gira.artista.nombre}
        portalToken={gira.portalToken}
        rider={rider}
        riderHeredado={!gira.rider && !!riderFallback}
        shows={shows}
        archivosIniciales={filas}
      />
    </div>
  );
}
