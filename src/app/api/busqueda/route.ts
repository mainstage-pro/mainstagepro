import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { idsPorTexto } from "@/lib/buscar-servidor";

/**
 * GET /api/busqueda?q=texto
 * Búsqueda global: clientes, tratos, cotizaciones, proyectos, técnicos, proveedores
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ resultados: [] });

  const clienteIds = await idsPorTexto("Cliente", ["nombre", "empresa", "correo"], q);

  const [tratoIds, cotizacionIds, proyectoIds, tecnicoIds, proveedorIds] = await Promise.all([
    idsPorTexto("Trato", ["nombreEvento"], q),
    idsPorTexto("Cotizacion", ["numeroCotizacion", "nombreEvento"], q),
    idsPorTexto("Proyecto", ["nombre", "numeroProyecto"], q),
    idsPorTexto("Tecnico", ["nombre", "celular"], q),
    idsPorTexto("Proveedor", ["nombre", "telefono"], q),
  ]);

  const [clientes, tratos, cotizaciones, proyectos, tecnicos, proveedores] = await Promise.all([
    prisma.cliente.findMany({
      where: { id: { in: clienteIds } },
      select: { id: true, nombre: true, empresa: true },
      take: 5,
    }),
    prisma.trato.findMany({
      where: { OR: [{ id: { in: tratoIds } }, { clienteId: { in: clienteIds } }] },
      select: { id: true, nombreEvento: true, etapa: true, fechaEventoEstimada: true, cliente: { select: { nombre: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.cotizacion.findMany({
      where: { OR: [{ id: { in: cotizacionIds } }, { clienteId: { in: clienteIds } }] },
      select: { id: true, numeroCotizacion: true, nombreEvento: true, estado: true, fechaEvento: true, cliente: { select: { nombre: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.proyecto.findMany({
      where: { OR: [{ id: { in: proyectoIds } }, { clienteId: { in: clienteIds } }] },
      select: { id: true, nombre: true, numeroProyecto: true, estado: true, fechaEvento: true, cliente: { select: { nombre: true } } },
      orderBy: { fechaEvento: "desc" },
      take: 5,
    }),
    prisma.tecnico.findMany({
      where: { id: { in: tecnicoIds } },
      select: { id: true, nombre: true, rol: { select: { nombre: true } } },
      take: 4,
    }),
    prisma.proveedor.findMany({
      where: { id: { in: proveedorIds } },
      select: { id: true, nombre: true, giro: true },
      take: 4,
    }),
  ]);

  const resultados = [
    ...clientes.map(c => ({
      tipo: "cliente" as const, id: c.id,
      titulo: c.nombre, subtitulo: c.empresa ?? undefined,
      href: `/crm/clientes/${c.id}`,
    })),
    ...tratos.map(t => ({
      tipo: "trato" as const, id: t.id,
      titulo: t.nombreEvento ?? t.cliente.nombre, subtitulo: `Trato · ${t.etapa}`,
      fecha: t.fechaEventoEstimada,
      href: `/crm/tratos/${t.id}`,
    })),
    ...cotizaciones.map(c => ({
      tipo: "cotizacion" as const, id: c.id,
      titulo: c.numeroCotizacion, subtitulo: `${c.cliente.nombre} · ${c.estado}`,
      fecha: c.fechaEvento,
      href: `/cotizaciones/${c.id}`,
    })),
    ...proyectos.map(p => ({
      tipo: "proyecto" as const, id: p.id,
      titulo: p.nombre, subtitulo: `${p.numeroProyecto} · ${p.cliente.nombre}`,
      fecha: p.fechaEvento,
      href: `/proyectos/${p.id}`,
    })),
    ...tecnicos.map(t => ({
      tipo: "tecnico" as const, id: t.id,
      titulo: t.nombre, subtitulo: t.rol?.nombre ?? "Técnico",
      href: `/catalogo/tecnicos`,
    })),
    ...proveedores.map(p => ({
      tipo: "proveedor" as const, id: p.id,
      titulo: p.nombre, subtitulo: p.giro ?? "Proveedor",
      href: `/catalogo/proveedores`,
    })),
  ];

  return NextResponse.json({ resultados });
}
