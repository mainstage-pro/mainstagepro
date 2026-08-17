import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureEquipoVentaColumns } from "@/lib/migraciones-lazy";
import { CONDICIONES, fotosPublicables } from "@/lib/equipo-venta-shared";
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

type Fila = {
  imagenUrl: string | null;
  imagenesUrls: string | null;
  [k: string]: unknown;
};

// La galería puede traer base64 pesado: al cliente solo le mandamos el conteo y la portada.
function aFila(eq: Fila) {
  const fotos = fotosPublicables(eq.imagenUrl, eq.imagenesUrls);
  const { imagenesUrls: _ig, ...resto } = eq;
  return { ...resto, imagenUrl: fotos[0] ?? null, fotos: fotos.length };
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureEquipoVentaColumns();

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();

  // Candidatos = equipo propio activo que aún no está a la venta (buscador del panel).
  if (request.nextUrl.searchParams.get("candidatos") === "1") {
    const candidatos = await prisma.equipo.findMany({
      where: {
        activo: true,
        tipo: "PROPIO",
        enVenta: false,
        estadoMigracion: null,
        ...(q
          ? {
              OR: [
                { descripcion: { contains: q, mode: "insensitive" as const } },
                { marca: { contains: q, mode: "insensitive" as const } },
                { modelo: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      select: SELECT,
      orderBy: [{ categoria: { orden: "asc" } }, { descripcion: "asc" }],
      take: q ? 40 : 25,
    });
    return NextResponse.json({ candidatos: candidatos.map(aFila) });
  }

  const equipos = await prisma.equipo.findMany({
    where: { enVenta: true },
    select: SELECT,
    orderBy: [{ categoria: { orden: "asc" } }, { descripcion: "asc" }],
  });
  const vendidos = await prisma.equipo.findMany({
    where: { fechaVenta: { not: null }, enVenta: false },
    select: { id: true, descripcion: true, marca: true, modelo: true, precioVenta: true, fechaVenta: true, activo: true, cantidadTotal: true },
    orderBy: { fechaVenta: "desc" },
    take: 30,
  });

  return NextResponse.json({ equipos: equipos.map(aFila), vendidos });
}

// Marca un equipo propio a la venta. No toca nada del inventario: sigue disponible.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureEquipoVentaColumns();

  const body = await request.json();
  const equipoId = typeof body.equipoId === "string" ? body.equipoId : "";
  if (!equipoId) return NextResponse.json({ error: "Falta equipoId" }, { status: 400 });

  const eq = await prisma.equipo.findUnique({
    where: { id: equipoId },
    select: { id: true, descripcion: true, marca: true, modelo: true, activo: true, tipo: true, cantidadTotal: true },
  });
  if (!eq) return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
  if (!eq.activo) return NextResponse.json({ error: "El equipo está dado de baja" }, { status: 400 });
  if (eq.tipo !== "PROPIO") return NextResponse.json({ error: "Solo se puede vender equipo propio" }, { status: 400 });

  const precioVenta = body.precioVenta != null && body.precioVenta !== "" ? Number(body.precioVenta) : null;
  const cantidadRaw = body.ventaCantidad != null && body.ventaCantidad !== "" ? parseInt(String(body.ventaCantidad), 10) : null;
  const ventaCantidad = cantidadRaw != null && Number.isFinite(cantidadRaw)
    ? Math.max(1, Math.min(cantidadRaw, eq.cantidadTotal))
    : null;
  const condicion = CONDICIONES.includes(body.ventaCondicion) ? body.ventaCondicion : "USADO";

  const equipo = await prisma.equipo.update({
    where: { id: equipoId },
    data: {
      enVenta: true,
      precioVenta,
      ventaCantidad,
      ventaCondicion: condicion,
      ventaDescripcion: typeof body.ventaDescripcion === "string" && body.ventaDescripcion.trim() ? body.ventaDescripcion.trim() : null,
      ventaDesde: new Date(),
      fechaVenta: null,
    },
    select: SELECT,
  });

  const nombre = [eq.marca, eq.modelo].filter(Boolean).join(" ") || eq.descripcion;
  await logActividad(session.id, "PONER_EN_VENTA", "Equipo", equipoId, `Puso a la venta ${nombre}`, { precioVenta, ventaCantidad });

  return NextResponse.json({ equipo: aFila(equipo) });
}
