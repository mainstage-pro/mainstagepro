import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { avanceGira, esGira } from "@/lib/giras";
import ListaGirasClient, { type GiraFila } from "./ListaGirasClient";

export const dynamic = "force-dynamic";

export default async function GirasListaPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [giras, artistas, clientes, venues] = await Promise.all([
    prisma.gira.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        tipo: true,
        estado: true,
        fechaInicio: true,
        fechaFin: true,
        artista: { select: { id: true, nombre: true } },
        cliente: { select: { id: true, nombre: true, empresa: true } },
        shows: {
          orderBy: { fecha: "asc" },
          select: {
            id: true,
            fecha: true,
            ciudad: true,
            venue: { select: { nombre: true } },
            riderLineas: { select: { prioridad: true, estado: true, cubiertoPor: true } },
          },
        },
      },
      orderBy: [{ fechaInicio: "desc" }, { createdAt: "desc" }],
    }),
    prisma.artista.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    prisma.cliente.findMany({ select: { id: true, nombre: true, empresa: true }, orderBy: { nombre: "asc" }, take: 400 }),
    prisma.venue.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, ciudad: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const filas: GiraFila[] = giras.map((g) => {
    const resumen = avanceGira(g.shows);
    const unico = g.shows[0];
    return {
      id: g.id,
      nombre: g.nombre,
      tipo: g.tipo,
      estado: g.estado,
      artista: g.artista.nombre,
      cliente: g.cliente ? g.cliente.empresa || g.cliente.nombre : null,
      // El registro puede no tener fechas capturadas todavía; los shows son el respaldo.
      fechaInicio: (g.fechaInicio ?? unico?.fecha ?? null)?.toISOString() ?? null,
      fechaFin: (g.fechaFin ?? g.shows[g.shows.length - 1]?.fecha ?? null)?.toISOString() ?? null,
      shows: g.shows.length,
      // Un show suelto se abre en su propio show: su resumen de gira no agrega nada.
      showId: esGira(g.tipo) ? null : (unico?.id ?? null),
      venue: esGira(g.tipo) ? null : (unico?.venue?.nombre ?? null),
      ciudades: [...new Set(g.shows.map((s) => s.ciudad).filter((c): c is string => !!c))],
      avance: resumen.avance,
      semaforo: resumen.semaforo,
      showsEnRiesgo: resumen.enRiesgo + resumen.sinArmar,
    };
  });

  return <ListaGirasClient giras={filas} artistas={artistas} clientes={clientes} venues={venues} />;
}
