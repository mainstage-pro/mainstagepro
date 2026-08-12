import { prisma } from "@/lib/prisma";
import InventarioClient from "./InventarioClient";
import { getPresentationMetadata } from "@/lib/metadata";

export const metadata = getPresentationMetadata({
  title: "Catálogo de Equipos e Inventario",
  description: "Explora nuestro catálogo completo de audio, iluminación, video y escenarios profesionales de alta gama para todo tipo de eventos.",
  path: "/presentacion/inventario",
});

export const dynamic = "force-dynamic";

export default async function InventarioPage() {
  // Fetch metadata ONLY — no imagenUrl (3+ MB of base64 in the payload)
  // Images are fetched client-side from /api/presentacion/imagenes after hydration.
  // Includes both PROPIO and EXTERNO equipment — all gear Mainstage offers to clients.
  // Categorías internas que no van en el catálogo público de clientes.
  const CATEGORIAS_OCULTAS = ["Toldos y lonas", "Accesorios Provisionales"];
  const equipos = await prisma.equipo.findMany({
    where: { activo: true, estadoMigracion: null, categoria: { nombre: { notIn: CATEGORIAS_OCULTAS } } },
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
  };

  return <InventarioClient data={data} />;
}
