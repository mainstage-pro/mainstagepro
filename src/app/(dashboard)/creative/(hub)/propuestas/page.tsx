import { prisma } from "@/lib/prisma";
import PropuestasCreativeClient from "./PropuestasCreativeClient";

export const dynamic = "force-dynamic";

export default async function PropuestasCreativePage() {
  const [propuestas, proyectos, clientes, artistas] = await Promise.all([
    prisma.propuestaServicio.findMany({
      where: { activo: true, proyectoCreativoId: { not: null } },
      select: {
        id: true,
        numero: true,
        version: true,
        titulo: true,
        estado: true,
        modeloCobro: true,
        moneda: true,
        vigenciaHasta: true,
        granTotal: true,
        costoEstimado: true,
        subtotalReembolsables: true,
        createdAt: true,
        cliente: { select: { id: true, nombre: true, empresa: true } },
        artista: { select: { id: true, nombre: true } },
        proyectoCreativo: { select: { id: true, nombre: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.proyectoCreativo.findMany({
      where: { activo: true },
      select: {
        id: true,
        numero: true,
        nombre: true,
        estado: true,
        artista: { select: { id: true, nombre: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.cliente.findMany({ select: { id: true, nombre: true, empresa: true }, orderBy: { nombre: "asc" } }),
    prisma.artista.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
  ]);

  return (
    <PropuestasCreativeClient
      propuestas={propuestas.map((p) => ({
        ...p,
        vigenciaHasta: p.vigenciaHasta?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
      }))}
      proyectos={proyectos}
      clientes={clientes}
      artistas={artistas}
    />
  );
}
