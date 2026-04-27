import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tipo = req.nextUrl.searchParams.get("tipo");    // PROPIO | EXTERNO
  const estado = req.nextUrl.searchParams.get("estado"); // ACTIVO | EN_MANTENIMIENTO | DADO_DE_BAJA
  const categoriaId = req.nextUrl.searchParams.get("categoriaId");
  const inactivos = req.nextUrl.searchParams.get("inactivos") === "true";

  const where: Record<string, unknown> = {};
  if (!inactivos) where.activo = true;
  if (tipo) where.tipo = tipo;
  if (estado) where.estado = estado;
  if (categoriaId) where.categoriaId = categoriaId;

  const [equipos, categorias] = await Promise.all([
    prisma.equipo.findMany({
      where,
      select: {
        id: true,
        descripcion: true,
        marca: true,
        modelo: true,
        tipo: true,
        estado: true,
        activo: true,
        cantidadTotal: true,
        precioRenta: true,
        costoProveedor: true,
        costoInternoEstimado: true,
        categoria: { select: { id: true, nombre: true } },
        proveedorDefault: { select: { id: true, nombre: true, empresa: true } },
        imagenUrl: true,
        _count: { select: { accesorios: true } },
      },
      orderBy: [{ categoria: { orden: "asc" } }, { descripcion: "asc" }],
    }),
    prisma.categoriaEquipo.findMany({ orderBy: { orden: "asc" } }),
  ]);

  // KPIs
  const propios = equipos.filter(e => e.tipo === "PROPIO");
  const externos = equipos.filter(e => e.tipo === "EXTERNO");

  const valorTotalActivo = propios.reduce((sum, e) => {
    const costo = e.costoInternoEstimado ?? 0;
    return sum + costo * e.cantidadTotal;
  }, 0);

  const potencialRentaMensual = equipos.reduce((sum, e) => {
    return sum + e.precioRenta * e.cantidadTotal;
  }, 0);

  return NextResponse.json({
    equipos,
    categorias,
    kpis: {
      totalEquipos: equipos.length,
      totalPropios: propios.length,
      totalExternos: externos.length,
      valorTotalActivo,
      potencialRentaMensual,
    },
  });
}
