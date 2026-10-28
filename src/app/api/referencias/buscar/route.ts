import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { idsPorTexto } from "@/lib/buscar-servidor";
import type { EntidadComentario } from "@/lib/comentarios";

// Búsqueda combinada de entidades taggeables (#tag en chat/comentarios):
// trato, proyecto, cotización, cliente, equipo. Insensible a acentos
// (ver src/lib/buscar-servidor.ts) — necesario para que "garcia" encuentre
// "García" al autocompletar.
export interface ReferenciaResultado {
  tipo: EntidadComentario;
  id: string;
  nombre: string;
  sub?: string;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ resultados: [] });

  const porTipo = 4;

  const [tratoIds, proyectoIds, cotizacionIds, clienteIds, equipoIds] = await Promise.all([
    idsPorTexto("Trato", ["nombreEvento"], q, porTipo),
    idsPorTexto("Proyecto", ["nombre"], q, porTipo),
    idsPorTexto("Cotizacion", ["nombreEvento", "nombreCotizacion", "numeroCotizacion"], q, porTipo),
    idsPorTexto("Cliente", ["nombre"], q, porTipo),
    idsPorTexto("Equipo", ["descripcion", "marca", "modelo"], q, porTipo),
  ]);

  const [tratos, proyectos, cotizaciones, clientes, equipos] = await Promise.all([
    tratoIds.length
      ? prisma.trato.findMany({ where: { id: { in: tratoIds } }, select: { id: true, nombreEvento: true, cliente: { select: { nombre: true } } }, take: porTipo })
      : [],
    proyectoIds.length
      ? prisma.proyecto.findMany({ where: { id: { in: proyectoIds } }, select: { id: true, nombre: true }, take: porTipo })
      : [],
    cotizacionIds.length
      ? prisma.cotizacion.findMany({ where: { id: { in: cotizacionIds } }, select: { id: true, nombreEvento: true, nombreCotizacion: true, numeroCotizacion: true }, take: porTipo })
      : [],
    clienteIds.length
      ? prisma.cliente.findMany({ where: { id: { in: clienteIds } }, select: { id: true, nombre: true, empresa: true }, take: porTipo })
      : [],
    equipoIds.length
      ? prisma.equipo.findMany({ where: { id: { in: equipoIds } }, select: { id: true, descripcion: true, marca: true, modelo: true }, take: porTipo })
      : [],
  ]);

  const resultados: ReferenciaResultado[] = [
    ...tratos.map((t): ReferenciaResultado => ({ tipo: "TRATO", id: t.id, nombre: t.nombreEvento ?? "Trato sin nombre", sub: t.cliente?.nombre })),
    ...proyectos.map((p): ReferenciaResultado => ({ tipo: "PROYECTO", id: p.id, nombre: p.nombre })),
    ...cotizaciones.map((c): ReferenciaResultado => ({ tipo: "COTIZACION", id: c.id, nombre: c.nombreEvento ?? c.nombreCotizacion ?? c.numeroCotizacion })),
    ...clientes.map((c): ReferenciaResultado => ({ tipo: "CLIENTE", id: c.id, nombre: c.nombre, sub: c.empresa ?? undefined })),
    ...equipos.map((e): ReferenciaResultado => ({ tipo: "EQUIPO", id: e.id, nombre: [e.marca, e.modelo].filter(Boolean).join(" ") || e.descripcion })),
  ];

  return NextResponse.json({ resultados });
}
