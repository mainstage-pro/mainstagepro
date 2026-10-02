import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { avanceGira } from "@/lib/giras";
import ListaGirasClient, { type GiraFila } from "./ListaGirasClient";

export const dynamic = "force-dynamic";

export default async function GirasListaPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [giras, artistas, clientes] = await Promise.all([
    prisma.gira.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        estado: true,
        fechaInicio: true,
        fechaFin: true,
        artista: { select: { id: true, nombre: true } },
        cliente: { select: { id: true, nombre: true, empresa: true } },
        shows: {
          orderBy: { fecha: "asc" },
          select: {
            fecha: true,
            ciudad: true,
            riderLineas: { select: { prioridad: true, estado: true, cubiertoPor: true } },
          },
        },
      },
      orderBy: [{ fechaInicio: "desc" }, { createdAt: "desc" }],
    }),
    prisma.artista.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    prisma.cliente.findMany({ select: { id: true, nombre: true, empresa: true }, orderBy: { nombre: "asc" }, take: 400 }),
  ]);

  const filas: GiraFila[] = giras.map((g) => {
    const resumen = avanceGira(g.shows);
    return {
      id: g.id,
      nombre: g.nombre,
      estado: g.estado,
      artista: g.artista.nombre,
      cliente: g.cliente ? g.cliente.empresa || g.cliente.nombre : null,
      // La gira puede no tener fechas capturadas todavía; los shows son el respaldo.
      fechaInicio: (g.fechaInicio ?? g.shows[0]?.fecha ?? null)?.toISOString() ?? null,
      fechaFin: (g.fechaFin ?? g.shows[g.shows.length - 1]?.fecha ?? null)?.toISOString() ?? null,
      shows: g.shows.length,
      ciudades: [...new Set(g.shows.map((s) => s.ciudad).filter((c): c is string => !!c))],
      avance: resumen.avance,
      semaforo: resumen.semaforo,
      showsEnRiesgo: resumen.enRiesgo + resumen.sinArmar,
    };
  });

  return <ListaGirasClient giras={filas} artistas={artistas} clientes={clientes} />;
}
