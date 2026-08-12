import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";

// POST /api/equipos/[id]/migrar-accesorio — promueve un equipo a Accesorio de
// primera clase. No borra el equipo: marca estadoMigracion para ocultarlo de los
// selectores; las referencias históricas (cotizaciones, checklists) siguen
// resolviéndose por id. Idempotente y reversible (DELETE).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const equipo = await prisma.equipo.findUnique({ where: { id } });
  if (!equipo) return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });

  if (equipo.estadoMigracion === "migrado_a_accesorio") {
    const existente = await prisma.accesorio.findFirst({ where: { equipoOrigenId: id, activo: true } });
    return NextResponse.json({ accesorio: existente, ya_migrado: true });
  }

  const nombre = [equipo.marca, equipo.modelo].filter(Boolean).join(" · ") || equipo.descripcion;

  const accesorio = await prisma.accesorio.create({
    data: {
      nombre,
      marca: equipo.marca,
      modelo: equipo.modelo,
      descripcion: equipo.descripcion,
      fotoUrl: equipo.imagenUrl,
      categoriaId: equipo.categoriaId,
      proveedorId: equipo.proveedorDefaultId,
      precioRenta: equipo.precioRenta || null,
      valorAdquisicion: equipo.costoInternoEstimado ?? null,
      tiposEvento: equipo.tiposEvento,
      tipoConteo: "default",
      cantidad: null,
      estado: "activo",
      activo: true,
      equipoOrigenId: equipo.id,
      migradoEn: new Date(),
    },
  });

  await prisma.equipo.update({ where: { id }, data: { estadoMigracion: "migrado_a_accesorio" } });

  await logActividad(
    session.id,
    "MIGRAR",
    "Equipo",
    id,
    `Equipo "${nombre}" promovido a Accesorio`,
    { accesorioId: accesorio.id },
  );

  return NextResponse.json({ accesorio });
}

// DELETE /api/equipos/[id]/migrar-accesorio — revierte la migración: desactiva el
// accesorio derivado y limpia estadoMigracion para que el equipo vuelva a los
// selectores.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const equipo = await prisma.equipo.findUnique({ where: { id } });
  if (!equipo) return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });

  const accesorio = await prisma.accesorio.findFirst({ where: { equipoOrigenId: id, activo: true } });
  if (accesorio) {
    await prisma.accesorio.update({ where: { id: accesorio.id }, data: { activo: false, estado: "inactivo" } });
  }
  await prisma.equipo.update({ where: { id }, data: { estadoMigracion: null } });

  await logActividad(
    session.id,
    "REVERTIR",
    "Equipo",
    id,
    `Migración a Accesorio revertida para "${equipo.descripcion}"`,
    accesorio ? { accesorioId: accesorio.id } : undefined,
  );

  return NextResponse.json({ ok: true });
}
