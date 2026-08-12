import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";

// GET /api/accesorios — catálogo unificado de accesorios (primera clase).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const accesorios = await prisma.accesorio.findMany({
    where: { activo: true },
    orderBy: [{ nombre: "asc" }],
    select: {
      id: true, nombre: true, marca: true, modelo: true, descripcion: true, fotoUrl: true,
      estado: true, tipoConteo: true, cantidad: true, precioRenta: true, valorAdquisicion: true,
      tiposEvento: true, equipoOrigenId: true,
      categoria: { select: { id: true, nombre: true } },
      proveedor: { select: { id: true, nombre: true, empresa: true } },
      equipoLinks: {
        select: {
          equipo: { select: { id: true, marca: true, modelo: true, descripcion: true } },
        },
      },
    },
  });

  return NextResponse.json({ accesorios, total: accesorios.length });
}

// POST /api/accesorios — alta de accesorio (identidad, sin campos financieros).
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body.nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const tipoConteo = body.tipoConteo === "cuantificable" ? "cuantificable" : "default";
  const cantidad = tipoConteo === "cuantificable"
    ? (Number.isInteger(Number(body.cantidad)) && Number(body.cantidad) >= 0 ? Number(body.cantidad) : 0)
    : null;

  const acc = await prisma.accesorio.create({
    data: {
      nombre: body.nombre.trim(),
      marca: body.marca?.trim() || null,
      modelo: body.modelo?.trim() || null,
      descripcion: body.descripcion?.trim() || null,
      fotoUrl: body.fotoUrl || null,
      categoriaId: body.categoriaId || null,
      proveedorId: body.proveedorId || null,
      tipoConteo,
      cantidad,
      tiposEvento: Array.isArray(body.tiposEvento) ? JSON.stringify(body.tiposEvento) : (body.tiposEvento ?? null),
      estado: "activo",
      activo: true,
    },
  });

  // Vínculo opcional a un equipo padre (fila puente)
  if (body.equipoId) {
    await prisma.equipoAccesorio.create({
      data: { equipoId: body.equipoId, nombre: acc.nombre, accesorioId: acc.id },
    });
  }

  return NextResponse.json({ accesorio: acc });
}
