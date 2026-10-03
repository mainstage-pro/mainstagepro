import { prisma } from "@/lib/prisma";
import PropuestasClient from "./PropuestasClient";

export const dynamic = "force-dynamic";

export default async function PropuestasPage() {
  const [propuestas, giras, clientes, artistas] = await Promise.all([
    prisma.propuestaServicio.findMany({
      where: { activo: true },
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
        gira: { select: { id: true, nombre: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.gira.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        tipo: true,
        artista: { select: { id: true, nombre: true } },
        _count: { select: { shows: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.cliente.findMany({ select: { id: true, nombre: true, empresa: true }, orderBy: { nombre: "asc" } }),
    prisma.artista.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
  ]);

  return (
    <PropuestasClient
      propuestas={propuestas.map((p) => ({
        ...p,
        vigenciaHasta: p.vigenciaHasta?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
      }))}
      giras={giras}
      clientes={clientes}
      artistas={artistas}
    />
  );
}
