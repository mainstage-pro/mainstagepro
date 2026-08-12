import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import {
  ensurePaquetesTables,
  PAQUETE_INCLUDE,
  type PaqueteItemInput,
  type PaqueteConceptoInput,
} from "@/lib/paquetes";

function limpiarItems(items: unknown): PaqueteItemInput[] {
  if (!Array.isArray(items)) return [];
  return (items as PaqueteItemInput[])
    .filter((it) => (it.tipo === "PRODUCTO" ? it.productoId : it.equipoId))
    .map((it) => ({
      tipo: it.tipo === "PRODUCTO" ? "PRODUCTO" : "EQUIPO",
      equipoId: it.tipo === "PRODUCTO" ? null : it.equipoId || null,
      productoId: it.tipo === "PRODUCTO" ? it.productoId || null : null,
      cantidad: Math.max(1, Number(it.cantidad) || 1),
    }));
}

function limpiarConceptos(conceptos: unknown): PaqueteConceptoInput[] {
  if (!Array.isArray(conceptos)) return [];
  return (conceptos as PaqueteConceptoInput[])
    .filter((c) => c.tipo && c.descripcion?.trim())
    .map((c) => ({
      tipo: c.tipo,
      descripcion: c.descripcion.trim(),
      rolTecnicoId: c.rolTecnicoId || null,
      nivel: c.nivel || null,
      jornada: c.jornada || null,
      cantidad: Math.max(0, Number(c.cantidad) || 0),
      dias: Math.max(1, Number(c.dias) || 1),
      precioUnitario: Math.max(0, Number(c.precioUnitario) || 0),
    }));
}

function limpiarImagenes(imagenes: unknown): { url: string; tipo: string; orden: number }[] {
  if (!Array.isArray(imagenes)) return [];
  return (imagenes as { url: string; tipo?: string }[])
    .filter((im) => im.url)
    .map((im, idx) => ({ url: im.url, tipo: im.tipo === "RENDER" ? "RENDER" : "REFERENCIA", orden: idx }));
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensurePaquetesTables();

  const todos = req.nextUrl.searchParams.get("todos") === "true";
  const tipoEvento = req.nextUrl.searchParams.get("tipoEvento");

  const paquetes = await prisma.paquete.findMany({
    where: {
      ...(todos ? {} : { activo: true }),
      ...(tipoEvento ? { tipoEvento } : {}),
    },
    include: PAQUETE_INCLUDE,
    orderBy: [{ tipoEvento: "asc" }, { orden: "asc" }, { nombre: "asc" }],
  });

  return NextResponse.json({ paquetes });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensurePaquetesTables();

  const body = await req.json();
  const { nombre, tipoEvento, rangoPersonas, subtiposEvento, adicionalesSugeridos, resumen, descripcion, propuestaValor } = body;

  if (!nombre?.trim() || !tipoEvento) {
    return NextResponse.json({ error: "nombre y tipoEvento son requeridos" }, { status: 400 });
  }

  const items = limpiarItems(body.items);
  const conceptos = limpiarConceptos(body.conceptos);
  const imagenes = limpiarImagenes(body.imagenes);
  const maxOrden = await prisma.paquete.aggregate({ _max: { orden: true } });

  const paquete = await prisma.paquete.create({
    data: {
      nombre: nombre.trim(),
      tipoEvento,
      rangoPersonas: rangoPersonas || null,
      subtiposEvento: Array.isArray(subtiposEvento) ? JSON.stringify(subtiposEvento) : subtiposEvento || null,
      adicionalesSugeridos: Array.isArray(adicionalesSugeridos)
        ? (adicionalesSugeridos.length ? JSON.stringify(adicionalesSugeridos) : null)
        : adicionalesSugeridos || null,
      resumen: resumen?.trim() || null,
      descripcion: descripcion?.trim() || null,
      propuestaValor: propuestaValor?.trim() || null,
      orden: (maxOrden._max.orden ?? 0) + 1,
      items: { create: items.map((it, idx) => ({ ...it, orden: idx })) },
      conceptos: { create: conceptos.map((c, idx) => ({ ...c, orden: idx })) },
      imagenes: { create: imagenes },
    },
    include: PAQUETE_INCLUDE,
  });

  await logActividad(session.id, "CREAR", "Paquete", paquete.id, `Creó el paquete "${nombre}"`);
  return NextResponse.json({ paquete }, { status: 201 });
}
