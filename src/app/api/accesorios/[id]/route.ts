import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// PATCH /api/accesorios/[id] — actualiza un accesorio del catálogo.
// Solo administración (paridad con /activos/valuacion). Aditivo por campo.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (body.tipoConteo !== undefined) {
    if (body.tipoConteo !== "cuantificable" && body.tipoConteo !== "default") {
      return NextResponse.json({ error: "tipoConteo inválido" }, { status: 400 });
    }
    data.tipoConteo = body.tipoConteo;
    // Regla de integridad: default ⇒ cantidad null
    if (body.tipoConteo === "default") data.cantidad = null;
  }

  if (body.cantidad !== undefined) {
    if (body.cantidad === null) {
      data.cantidad = null;
    } else {
      const n = Number(body.cantidad);
      if (!Number.isInteger(n) || n < 0) {
        return NextResponse.json({ error: "cantidad inválida" }, { status: 400 });
      }
      data.cantidad = n;
    }
  }

  for (const f of ["marca", "modelo", "descripcion", "fotoUrl", "categoriaId", "proveedorId"] as const) {
    if (body[f] !== undefined) data[f] = body[f] === "" ? null : body[f];
  }
  if (body.nombre !== undefined && String(body.nombre).trim()) data.nombre = String(body.nombre).trim();
  if (body.estado !== undefined && (body.estado === "activo" || body.estado === "inactivo")) data.estado = body.estado;
  if (body.tiposEvento !== undefined) {
    data.tiposEvento = Array.isArray(body.tiposEvento) ? JSON.stringify(body.tiposEvento) : body.tiposEvento;
  }
  if (body.valorAdquisicion !== undefined) {
    data.valorAdquisicion = body.valorAdquisicion === null || body.valorAdquisicion === "" ? null : Number(body.valorAdquisicion);
  }
  if (body.precioRenta !== undefined) {
    data.precioRenta = body.precioRenta === null || body.precioRenta === "" ? null : Number(body.precioRenta);
  }

  // Consistencia final: cuantificable exige cantidad ≥ 0
  if (data.tipoConteo === "cuantificable" && (data.cantidad === undefined || data.cantidad === null)) {
    const actual = await prisma.accesorio.findUnique({ where: { id }, select: { cantidad: true } });
    if (actual?.cantidad == null) data.cantidad = 0;
  }

  const updated = await prisma.accesorio.update({ where: { id }, data });
  return NextResponse.json({ accesorio: updated });
}

// DELETE /api/accesorios/[id] — soft delete (activo=false). No borra filas puente
// ni referencias históricas.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  await prisma.accesorio.update({ where: { id }, data: { activo: false, estado: "inactivo" } });
  return NextResponse.json({ ok: true });
}
