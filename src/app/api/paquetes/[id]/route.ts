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

function limpiarImagenes(imagenes: unknown): { url: string; orden: number }[] {
  if (!Array.isArray(imagenes)) return [];
  return (imagenes as { url: string }[])
    .filter((im) => im.url)
    .map((im, idx) => ({ url: im.url, orden: idx }));
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensurePaquetesTables();

  const { id } = await params;
  const paquete = await prisma.paquete.findUnique({ where: { id }, include: PAQUETE_INCLUDE });
  if (!paquete) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ paquete });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensurePaquetesTables();

  const { id } = await params;
  const body = await req.json();
  const { nombre, tipoEvento, rangoPersonas, subtiposEvento, adicionalesSugeridos, resumen, descripcion, propuestaValor, activo } = body;

  const data: Record<string, unknown> = {};
  if (nombre !== undefined) data.nombre = nombre.trim();
  if (tipoEvento !== undefined) data.tipoEvento = tipoEvento;
  if (rangoPersonas !== undefined) data.rangoPersonas = rangoPersonas || null;
  if (subtiposEvento !== undefined)
    data.subtiposEvento = Array.isArray(subtiposEvento) ? JSON.stringify(subtiposEvento) : subtiposEvento || null;
  if (adicionalesSugeridos !== undefined)
    data.adicionalesSugeridos = Array.isArray(adicionalesSugeridos)
      ? (adicionalesSugeridos.length ? JSON.stringify(adicionalesSugeridos) : null)
      : adicionalesSugeridos || null;
  if (resumen !== undefined) data.resumen = resumen?.trim() || null;
  if (descripcion !== undefined) data.descripcion = descripcion?.trim() || null;
  if (propuestaValor !== undefined) data.propuestaValor = propuestaValor?.trim() || null;
  if (activo !== undefined) data.activo = !!activo;

  const reemplazaItems = Array.isArray(body.items);
  const reemplazaConceptos = Array.isArray(body.conceptos);
  const reemplazaImagenes = Array.isArray(body.imagenes);
  const items = reemplazaItems ? limpiarItems(body.items) : [];
  const conceptos = reemplazaConceptos ? limpiarConceptos(body.conceptos) : [];
  const imagenes = reemplazaImagenes ? limpiarImagenes(body.imagenes) : [];

  await prisma.$transaction(async (tx) => {
    await tx.paquete.update({ where: { id }, data });
    if (reemplazaItems) {
      await tx.paqueteItem.deleteMany({ where: { paqueteId: id } });
      if (items.length)
        await tx.paqueteItem.createMany({ data: items.map((it, idx) => ({ paqueteId: id, ...it, orden: idx })) });
    }
    if (reemplazaConceptos) {
      await tx.paqueteConcepto.deleteMany({ where: { paqueteId: id } });
      if (conceptos.length)
        await tx.paqueteConcepto.createMany({ data: conceptos.map((c, idx) => ({ paqueteId: id, ...c, orden: idx })) });
    }
    if (reemplazaImagenes) {
      await tx.paqueteImagen.deleteMany({ where: { paqueteId: id } });
      if (imagenes.length)
        await tx.paqueteImagen.createMany({ data: imagenes.map((im) => ({ paqueteId: id, ...im })) });
    }
  });

  const paquete = await prisma.paquete.findUnique({ where: { id }, include: PAQUETE_INCLUDE });
  await logActividad(session.id, "EDITAR", "Paquete", id, `Editó el paquete "${paquete?.nombre ?? id}"`);
  return NextResponse.json({ paquete });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensurePaquetesTables();

  const { id } = await params;
  const paquete = await prisma.paquete.update({ where: { id }, data: { activo: false } });
  await logActividad(session.id, "ELIMINAR", "Paquete", id, `Eliminó el paquete "${paquete.nombre}"`);
  return NextResponse.json({ ok: true });
}
