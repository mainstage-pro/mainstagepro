import { prisma } from "@/lib/prisma";
import InventarioClient from "../inventario/InventarioClient";
import { getPresentationMetadata } from "@/lib/metadata";

export const metadata = getPresentationMetadata({
  title: "Catálogo de Equipo Propio",
  description: "Explora el inventario propio de Mainstage: audio, iluminación, video y escenarios profesionales que operamos con equipo de la casa.",
  path: "/presentacion/inventario-propio",
});

export const dynamic = "force-dynamic";

export default async function InventarioPropioPage() {
  // Misma presentación que /presentacion/inventario, restringida a tipo PROPIO:
  // solo el equipo de la casa, sin lo que se subcontrata (EXTERNO).
  const CATEGORIAS_OCULTAS = ["Toldos y lonas", "Accesorios Provisionales"];
  const equipos = await prisma.equipo.findMany({
    where: { activo: true, estadoMigracion: null, tipo: "PROPIO", categoria: { nombre: { notIn: CATEGORIAS_OCULTAS } } },
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

  return <InventarioClient data={data} soloPropio />;
}
