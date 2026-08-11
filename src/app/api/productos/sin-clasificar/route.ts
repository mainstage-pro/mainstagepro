import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureProductosTables } from "@/lib/productos";

// Productos activos sin clasificar contra el catálogo: sin tipos de evento
// definidos (tiposEvento vacío/null). Espejo de "Sin paquetear" para cerrar la
// clasificación de forma sistemática.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureProductosTables();

  const productos = await prisma.producto.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, categoria: true, tiposEvento: true, rol: true, disponibilidad: true, imagenUrl: true, precioFinal: true },
    orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
  });

  const sinClasificar = productos.filter((p) => {
    if (!p.tiposEvento) return true;
    try {
      const arr = JSON.parse(p.tiposEvento);
      return !Array.isArray(arr) || arr.length === 0;
    } catch {
      return true;
    }
  });

  return NextResponse.json({ productos: sinClasificar });
}
