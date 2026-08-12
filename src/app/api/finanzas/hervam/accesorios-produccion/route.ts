import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/finanzas/hervam/accesorios-produccion
// Devuelve todos los accesorios de equipos PROPIOS activos del inventario de producción,
// agrupados por equipo, para mostrarlos en la pestaña de valuación de activos.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const equipos = await prisma.equipo.findMany({
    where: { activo: true, tipo: "PROPIO" },
    select: {
      id: true,
      descripcion: true,
      marca: true,
      modelo: true,
      categoria: { select: { nombre: true } },
      cantidadTotal: true,
      precioRenta: true,
      accesorios: {
        select: {
          id: true,
          nombre: true,
          categoria: true,
          accesorioId: true,
          accesorio: { select: { tipoConteo: true, cantidad: true } },
        },
        orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
      },
    },
    orderBy: [{ categoria: { orden: "asc" } }, { descripcion: "asc" }],
  });

  // Solo devolver equipos que tengan al menos un accesorio registrado
  const equiposConAccesorios = equipos.filter(e => e.accesorios.length > 0);

  const totalAccesorios = equiposConAccesorios.reduce((s, e) => s + e.accesorios.length, 0);

  return NextResponse.json({ equipos: equiposConAccesorios, totalAccesorios });
}
