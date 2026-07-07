import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/inventario/publico
 * Endpoint público (sin autenticación) que devuelve los equipos activos del inventario
 * agrupados por categoría, sin precios ni costos. Usado por el formulario del cliente.
 */
export async function GET() {
  const [categorias, equipos] = await Promise.all([
    prisma.categoriaEquipo.findMany({ orderBy: { orden: "asc" } }),
    prisma.equipo.findMany({
      where: { activo: true, estado: "ACTIVO" },
      select: {
        id: true,
        descripcion: true,
        marca: true,
        modelo: true,
        imagenUrl: true,
        categoriaId: true,
      },
      orderBy: [{ categoria: { orden: "asc" } }, { descripcion: "asc" }],
    }),
  ]);

  // Agrupar equipos por categoría
  const resultado = categorias.map((cat) => ({
    id: cat.id,
    nombre: cat.nombre,
    equipos: equipos.filter((e) => e.categoriaId === cat.id),
  }));

  return NextResponse.json({ categorias: resultado });
}
