import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureEquipoVentaColumns } from "@/lib/migraciones-lazy";
import { CONDICIONES, fotosPublicables } from "@/lib/equipo-venta-shared";
import { registrarVentaEquipo } from "@/lib/equipo-venta";
import { logActividad } from "@/lib/actividad";

export const dynamic = "force-dynamic";

const SELECT = {
  id: true,
  descripcion: true,
  marca: true,
  modelo: true,
  cantidadTotal: true,
  estado: true,
  precioRenta: true,
  enVenta: true,
  precioVenta: true,
  ventaCantidad: true,
  ventaCondicion: true,
  ventaDescripcion: true,
  ventaDesde: true,
  imagenUrl: true,
  imagenesUrls: true,
  categoria: { select: { id: true, nombre: true, orden: true } },
} as const;

function aFila(eq: { imagenUrl: string | null; imagenesUrls: string | null; [k: string]: unknown }) {
  const fotos = fotosPublicables(eq.imagenUrl, eq.imagenesUrls);
  const { imagenesUrls: _ig, ...resto } = eq;
  return { ...resto, imagenUrl: fotos[0] ?? null, fotos: fotos.length };
}

// Edita los datos de venta (precio, unidades, condición, copy).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureEquipoVentaColumns();

  const { id } = await params;
  const body = await request.json();

  const eq = await prisma.equipo.findUnique({ where: { id }, select: { id: true, cantidadTotal: true } });
  if (!eq) return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if ("precioVenta" in body) data.precioVenta = body.precioVenta != null && body.precioVenta !== "" ? Number(body.precioVenta) : null;
  if ("ventaCantidad" in body) {
    const n = body.ventaCantidad != null && body.ventaCantidad !== "" ? parseInt(String(body.ventaCantidad), 10) : null;
    data.ventaCantidad = n != null && Number.isFinite(n) ? Math.max(1, Math.min(n, eq.cantidadTotal)) : null;
  }
  if ("ventaCondicion" in body && CONDICIONES.includes(body.ventaCondicion)) data.ventaCondicion = body.ventaCondicion;
  if ("ventaDescripcion" in body) {
    data.ventaDescripcion = typeof body.ventaDescripcion === "string" && body.ventaDescripcion.trim() ? body.ventaDescripcion.trim() : null;
  }

  const equipo = await prisma.equipo.update({ where: { id }, data, select: SELECT });
  return NextResponse.json({ equipo: aFila(equipo) });
}

// Registra la venta: descuenta unidades y da de baja el equipo si se vendió completo.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureEquipoVentaColumns();

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (body?.accion !== "vendido") return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });

  const cantidad = body.cantidad != null && body.cantidad !== "" ? parseInt(String(body.cantidad), 10) : null;
  const res = await registrarVentaEquipo(id, Number.isFinite(cantidad as number) ? cantidad : null, session.id);
  if (!res) return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });

  return NextResponse.json(res);
}

// Quita el equipo del catálogo de venta (sigue igual en inventario).
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureEquipoVentaColumns();

  const { id } = await params;
  const equipo = await prisma.equipo.update({
    where: { id },
    data: { enVenta: false, ventaCantidad: null, ventaDesde: null },
    select: { id: true, descripcion: true, marca: true, modelo: true },
  });
  const nombre = [equipo.marca, equipo.modelo].filter(Boolean).join(" ") || equipo.descripcion;
  await logActividad(session.id, "QUITAR_DE_VENTA", "Equipo", id, `Quitó de la venta ${nombre}`);

  return NextResponse.json({ ok: true });
}
