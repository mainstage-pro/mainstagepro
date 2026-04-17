import { prisma } from "@/lib/prisma";
import InventarioClient from "./InventarioClient";

export const dynamic = "force-dynamic";

export default async function InventarioPage() {
  const equipos = await prisma.equipo.findMany({
    where: { tipo: "PROPIO", activo: true },
    include: { categoria: { select: { nombre: true, orden: true } } },
    orderBy: [{ categoria: { orden: "asc" } }, { descripcion: "asc" }],
  });

  const catMap = new Map<string, { nombre: string; orden: number; equipos: typeof equipos }>();
  for (const eq of equipos) {
    const key = eq.categoria.nombre;
    if (!catMap.has(key)) catMap.set(key, { nombre: eq.categoria.nombre, orden: eq.categoria.orden, equipos: [] });
    catMap.get(key)!.equipos.push(eq);
  }
  const categorias = Array.from(catMap.values()).sort((a, b) => a.orden - b.orden);

  const data = {
    categorias: categorias.map(cat => ({
      nombre: cat.nombre,
      orden: cat.orden,
      equipos: cat.equipos.map(eq => ({
        id: eq.id,
        descripcion: eq.descripcion,
        marca: eq.marca,
        modelo: eq.modelo,
        cantidadTotal: eq.cantidadTotal,
        estado: eq.estado,
        notas: eq.notas,
        imagenUrl: eq.imagenUrl ?? null,
      })),
    })),
    totalEquipos: equipos.length,
    totalUnidades: equipos.reduce((s, e) => s + e.cantidadTotal, 0),
  };

  return <InventarioClient data={data} />;
}
