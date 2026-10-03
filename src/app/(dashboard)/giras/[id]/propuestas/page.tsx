import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PropuestasGiraClient from "./PropuestasGiraClient";

export const dynamic = "force-dynamic";

export default async function PropuestasDeGiraPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  const gira = await prisma.gira.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      moneda: true,
      cliente: { select: { nombre: true, empresa: true } },
      artista: { select: { nombre: true } },
      _count: { select: { shows: true } },
    },
  });

  if (!gira) notFound();

  const propuestas = await prisma.propuestaServicio.findMany({
    where: { giraId: id, activo: true },
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
      subtotalReembolsables: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <PropuestasGiraClient
      giraId={gira.id}
      giraNombre={gira.nombre}
      cliente={gira.cliente ? gira.cliente.empresa || gira.cliente.nombre : null}
      artista={gira.artista.nombre}
      shows={gira._count.shows}
      propuestas={propuestas.map((p) => ({
        ...p,
        vigenciaHasta: p.vigenciaHasta?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
      }))}
    />
  );
}
