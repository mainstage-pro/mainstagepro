import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureProductosTables } from "@/lib/productos";

// Listado público de productos activos — usado por el selector del descubrimiento
// (incluye formularios públicos por token) y el cotizador.
export async function GET() {
  await ensureProductosTables();

  const productos = await prisma.producto.findMany({
    where: { activo: true },
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      categoria: true,
      tiposEvento: true,
      imagenUrl: true,
      precioFinal: true,
      items: {
        orderBy: { orden: "asc" },
        select: {
          cantidad: true,
          equipo: {
            select: { id: true, descripcion: true, marca: true, modelo: true, precioRenta: true },
          },
        },
      },
    },
    orderBy: [{ categoria: "asc" }, { orden: "asc" }, { nombre: "asc" }],
  });

  return NextResponse.json({ productos });
}
