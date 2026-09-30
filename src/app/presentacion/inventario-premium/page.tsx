import { prisma } from "@/lib/prisma";
import InventarioClient from "../inventario/InventarioClient";
import { getPresentationMetadata } from "@/lib/metadata";

export const metadata = getPresentationMetadata({
  title: "Catálogo de Equipo Premium",
  description: "La línea premium de Mainstage: L'Acoustics, d&b, Funktion One, ROBE, Avolites y grandMA3 para producciones que no admiten margen de error.",
  path: "/presentacion/inventario-premium",
});

export const dynamic = "force-dynamic";

export default async function InventarioPremiumPage() {
  const CATEGORIAS_OCULTAS = ["Toldos y lonas", "Accesorios Provisionales"];
  const equipos = await prisma.equipo.findMany({
    where: { activo: true, estadoMigracion: null, tipo: "PREMIUM", categoria: { nombre: { notIn: CATEGORIAS_OCULTAS } } },
    select: {
      id: true,
      descripcion: true,
      marca: true,
      modelo: true,
      cantidadTotal: true,
      estado: true,
      notas: true,
      precioRenta: true,
      categoria: { select: { nombre: true, orden: true } },
    },
    orderBy: [{ categoria: { orden: "asc" } }, { descripcion: "asc" }],
  });

  const categoriasCatalogo = await prisma.categoriaEquipo.findMany({
    orderBy: { orden: "asc" },
    select: { nombre: true },
  });
  const categoriaOrden = categoriasCatalogo.map((c) => c.nombre);

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
        imagenUrl: null as string | null, // loaded client-side
        precioRenta: eq.precioRenta,
      })),
    })),
    totalEquipos: equipos.length,
    totalUnidades: equipos.reduce((s, e) => s + e.cantidadTotal, 0),
    categoriaOrden,
  };

  return <InventarioClient data={data} variante="premium" />;
}
