import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActividad } from "@/lib/actividad";
import { ensureProductosTables, calcularPrecioProducto, type ItemInput } from "@/lib/productos";

const PRODUCTO_INCLUDE = {
  items: {
    orderBy: { orden: "asc" as const },
    include: {
      equipo: {
        select: {
          id: true,
          descripcion: true,
          marca: true,
          modelo: true,
          precioRenta: true,
          cantidadTotal: true,
          imagenUrl: true,
          categoria: { select: { id: true, nombre: true } },
        },
      },
    },
  },
  equipoDominante: { select: { id: true, imagenUrl: true, descripcion: true } },
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureProductosTables();

  const { id } = await params;
  const producto = await prisma.producto.findUnique({ where: { id }, include: PRODUCTO_INCLUDE });
  if (!producto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ producto });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureProductosTables();

  const { id } = await params;
  const body = await req.json();
  const { nombre, descripcion, categoria, tiposEvento, imagenUrl, equipoDominanteId, precioManual, items, activo } = body;

  const data: Record<string, unknown> = {};
  if (nombre !== undefined) data.nombre = nombre;
  if (descripcion !== undefined) data.descripcion = descripcion || null;
  if (categoria !== undefined) data.categoria = categoria || null;
  if (tiposEvento !== undefined)
    data.tiposEvento = Array.isArray(tiposEvento) ? JSON.stringify(tiposEvento) : tiposEvento || null;
  if (imagenUrl !== undefined) data.imagenUrl = imagenUrl || null;
  if (equipoDominanteId !== undefined) data.equipoDominanteId = equipoDominanteId || null;
  if (precioManual !== undefined)
    data.precioManual = precioManual != null && precioManual !== "" ? Number(precioManual) : null;
  if (activo !== undefined) data.activo = !!activo;

  // Si vienen items, reemplazamos el set completo y recalculamos precio
  let recalcItems: ItemInput[] | null = null;
  if (Array.isArray(items)) {
    recalcItems = (items as ItemInput[])
      .filter((it) => it.equipoId)
      .map((it) => ({ equipoId: it.equipoId, cantidad: Math.max(1, Number(it.cantidad) || 1) }));
  }

  // Determinar precioFinal si cambió precioManual o items
  if (recalcItems || precioManual !== undefined) {
    const itemsPrecio =
      recalcItems ??
      (await prisma.productoEquipo.findMany({
        where: { productoId: id },
        select: { equipoId: true, cantidad: true },
      }));
    const equipoIds = itemsPrecio.map((i) => i.equipoId);
    const equipos = await prisma.equipo.findMany({
      where: { id: { in: equipoIds } },
      select: { id: true, precioRenta: true },
    });
    const precioMap = new Map(equipos.map((e) => [e.id, e.precioRenta]));
    const pm =
      precioManual !== undefined
        ? precioManual != null && precioManual !== ""
          ? Number(precioManual)
          : null
        : (await prisma.producto.findUnique({ where: { id }, select: { precioManual: true } }))?.precioManual;
    data.precioFinal = calcularPrecioProducto(
      itemsPrecio.map((i) => ({ cantidad: i.cantidad, equipo: { precioRenta: precioMap.get(i.equipoId) ?? 0 } })),
      pm
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.producto.update({ where: { id }, data });
    if (recalcItems) {
      await tx.productoEquipo.deleteMany({ where: { productoId: id } });
      await tx.productoEquipo.createMany({
        data: recalcItems.map((it, idx) => ({
          productoId: id,
          equipoId: it.equipoId,
          cantidad: it.cantidad,
          orden: idx,
        })),
      });
    }
  });

  const producto = await prisma.producto.findUnique({ where: { id }, include: PRODUCTO_INCLUDE });
  await logActividad(session.id, "EDITAR", "Producto", id, `Editó el producto "${producto?.nombre ?? id}"`);
  return NextResponse.json({ producto });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureProductosTables();

  const { id } = await params;
  // Soft delete
  const producto = await prisma.producto.update({ where: { id }, data: { activo: false } });
  await logActividad(session.id, "ELIMINAR", "Producto", id, `Eliminó el producto "${producto.nombre}"`);
  return NextResponse.json({ ok: true });
}
