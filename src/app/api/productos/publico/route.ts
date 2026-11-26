import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureProductosTables } from "@/lib/productos";
import { migrarImagenesBase64 } from "@/lib/imagen-blob";

// Listado público de productos activos — usado por el selector del descubrimiento
// (incluye formularios públicos por token) y el cotizador.
export async function GET() {
  await ensureProductosTables();
  // Fotos guardadas en base64 → Blob (una vez por instancia). Ver src/lib/imagen-blob.ts.
  await migrarImagenesBase64();

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
      capacidadUniversal: true,
      coberturas: { select: { tipoEvento: true, rangos: true, subtipos: true } },
      items: {
        orderBy: { orden: "asc" },
        select: {
          cantidad: true,
          equipo: {
            select: { id: true, descripcion: true, marca: true, modelo: true, precioRenta: true },
          },
        },
      },
      accesorios: {
        orderBy: { orden: "asc" },
        select: {
          cantidad: true,
          accesorio: {
            select: { id: true, nombre: true, marca: true, modelo: true, precioRenta: true },
          },
        },
      },
    },
    orderBy: [{ categoria: "asc" }, { orden: "asc" }, { nombre: "asc" }],
  });

  return NextResponse.json({ productos });
}
