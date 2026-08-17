import { prisma } from "@/lib/prisma";
import { getPresentationMetadata } from "@/lib/metadata";
import { fotosPublicables, unidadesEnVenta } from "@/lib/equipo-venta-shared";
import VentaClient from "./VentaClient";

export const metadata = getPresentationMetadata({
  title: "Equipo profesional en venta",
  description:
    "Equipo de audio, iluminación y video en venta directa de Mainstage Pro: piezas operadas y mantenidas por nosotros, con precio, fotos y condición a la vista.",
  path: "/presentacion/venta",
});

export const dynamic = "force-dynamic";

export default async function VentaPage() {
  const equipos = await prisma.equipo.findMany({
    where: { enVenta: true, activo: true },
    select: {
      id: true,
      descripcion: true,
      marca: true,
      modelo: true,
      cantidadTotal: true,
      precioVenta: true,
      ventaCantidad: true,
      ventaCondicion: true,
      ventaDescripcion: true,
      notas: true,
      imagenUrl: true,
      imagenesUrls: true,
      categoria: { select: { nombre: true, orden: true } },
    },
    orderBy: [{ categoria: { orden: "asc" } }, { descripcion: "asc" }],
  });

  const items = equipos.map((eq) => ({
    id: eq.id,
    nombre: [eq.marca, eq.modelo].filter(Boolean).join(" ") || eq.descripcion,
    descripcion: eq.descripcion,
    categoria: eq.categoria.nombre,
    precioVenta: eq.precioVenta,
    unidades: unidadesEnVenta(eq),
    condicion: eq.ventaCondicion ?? "USADO",
    copy: eq.ventaDescripcion,
    fotos: fotosPublicables(eq.imagenUrl, eq.imagenesUrls),
  }));

  const categorias: { nombre: string; items: typeof items }[] = [];
  for (const it of items) {
    const grupo = categorias.find((c) => c.nombre === it.categoria);
    if (grupo) grupo.items.push(it);
    else categorias.push({ nombre: it.categoria, items: [it] });
  }

  return <VentaClient categorias={categorias} totalPiezas={items.reduce((s, i) => s + i.unidades, 0)} />;
}
