import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import PropuestaEditor from "./PropuestaEditor";

export const dynamic = "force-dynamic";

export default async function PropuestaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const propuesta = await prisma.propuestaServicio.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nombre: true, empresa: true } },
      artista: { select: { id: true, nombre: true } },
      gira: {
        select: {
          id: true,
          nombre: true,
          shows: {
            select: {
              id: true,
              fecha: true,
              ciudad: true,
              estado: true,
              venueId: true,
              venue: { select: { nombre: true } },
            },
            orderBy: { fecha: "asc" },
          },
        },
      },
      lineas: {
        include: { servicio: { select: { id: true, clave: true, nombre: true } } },
        orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!propuesta || !propuesta.activo) notFound();

  // El link que se le copia al cliente usa el dominio público configurado, el
  // mismo que arma el endpoint de envío: no el dominio desde el que se trabaja.
  const [appUrl, servicios, equipos, roles, clientes, artistas, giras] = await Promise.all([
    getConfig("empresa.appUrl", process.env.NEXTAUTH_URL ?? "https://mainstagepro.vercel.app"),
    prisma.servicioPM.findMany({
      where: { activo: true },
      select: {
        id: true,
        clave: true,
        nombre: true,
        categoria: true,
        descripcion: true,
        unidadDefault: true,
        tipoLinea: true,
        precioSugerido: true,
        costoSugerido: true,
      },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    }),
    prisma.equipo.findMany({
      where: { activo: true },
      select: { id: true, descripcion: true, marca: true, modelo: true, precioRenta: true, costoProveedor: true },
      orderBy: { descripcion: "asc" },
    }),
    prisma.rolTecnico.findMany({
      where: { activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.cliente.findMany({ select: { id: true, nombre: true, empresa: true }, orderBy: { nombre: "asc" } }),
    prisma.artista.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    prisma.gira.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, _count: { select: { shows: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <PropuestaEditor
      inicial={{
        ...propuesta,
        vigenciaHasta: propuesta.vigenciaHasta?.toISOString().slice(0, 10) ?? "",
        aprobacionFecha: propuesta.aprobacionFecha?.toISOString() ?? null,
        enviadaEn: propuesta.enviadaEn?.toISOString() ?? null,
        gira: propuesta.gira
          ? {
              id: propuesta.gira.id,
              nombre: propuesta.gira.nombre,
              shows: propuesta.gira.shows.map((s) => ({
                id: s.id,
                fecha: s.fecha.toISOString(),
                ciudad: s.ciudad,
                estado: s.estado,
                venueId: s.venueId,
                venueNombre: s.venue?.nombre ?? null,
              })),
            }
          : null,
        lineas: propuesta.lineas.map((l) => ({
          id: l.id,
          tipo: l.tipo,
          concepto: l.concepto,
          descripcion: l.descripcion,
          unidad: l.unidad,
          cantidad: l.cantidad,
          precioUnitario: l.precioUnitario,
          costoUnitario: l.costoUnitario,
          subtotal: l.subtotal,
          esIncluido: l.esIncluido,
          esReembolsable: l.esReembolsable,
          servicioId: l.servicioId,
          equipoId: l.equipoId,
          rolTecnicoId: l.rolTecnicoId,
          showId: l.showId,
          notas: l.notas,
          orden: l.orden,
        })),
      }}
      appUrl={appUrl ?? "https://mainstagepro.vercel.app"}
      servicios={servicios}
      equipos={equipos}
      roles={roles}
      clientes={clientes}
      artistas={artistas}
      giras={giras}
    />
  );
}
