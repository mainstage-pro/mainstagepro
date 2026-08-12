import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ensureProductosTables } from "@/lib/productos";

// Equipos cotizables (propios y externos) que aún no forman parte de ningún
// producto activo. Definición canónica de "equipos sin producto", compartida con
// el tablero de cobertura (/api/inventario/cobertura): activo + noCotizable=false.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await ensureProductosTables();

  const usados = await prisma.productoEquipo.findMany({
    where: { producto: { activo: true } },
    select: { equipoId: true },
    distinct: ["equipoId"],
  });
  const usadosSet = new Set(usados.map((u) => u.equipoId));

  const equipos = await prisma.equipo.findMany({
    where: { activo: true, noCotizable: false },
    select: {
      id: true,
      descripcion: true,
      marca: true,
      modelo: true,
      precioRenta: true,
      cantidadTotal: true,
      imagenUrl: true,
      categoria: { select: { id: true, nombre: true, orden: true } },
    },
    orderBy: [{ categoria: { orden: "asc" } }, { descripcion: "asc" }],
  });

  const sinPaquetear = equipos.filter((e) => !usadosSet.has(e.id));
  return NextResponse.json({ equipos: sinPaquetear });
}
