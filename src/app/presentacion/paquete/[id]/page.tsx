import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ensurePaquetesTables, PAQUETE_INCLUDE } from "@/lib/paquetes";
import { getGaleriaData } from "@/lib/tipos-evento";
import { getEquipoImagenes } from "@/lib/presentacion-imagenes";
import { familiaTipo, categoriasConRespaldo } from "@/lib/galeria-shared";
import { getPresentationMetadata } from "@/lib/metadata";
import { getOverrides } from "@/lib/presentacion-overrides";
import PaqueteDetalleClient from "./PaqueteDetalleClient";

// Elige el campo de descripción de categoría según el tipo de evento del paquete.
// Reutiliza las frases que ya se usan en el PDF de cotización (CategoriaEquipo).
async function getDescCategorias(tipoEvento: string): Promise<Record<string, string>> {
  const field =
    tipoEvento === "MUSICAL" ? "descMusical" : tipoEvento === "EMPRESARIAL" ? "descEmpresarial" : "descSocial";
  const cats = await prisma.categoriaEquipo.findMany({
    select: { nombre: true, descMusical: true, descSocial: true, descEmpresarial: true },
  });
  const map: Record<string, string> = {};
  for (const c of cats) {
    const v = (c as Record<string, string | null>)[field];
    if (v && v.trim()) map[c.nombre] = v.trim();
  }
  return map;
}

export const dynamic = "force-dynamic";

// Fotos reales del equipo en eventos (imagenesUrls EXTERNO), para la galería
// que se abre desde cada miniatura de "Qué incluye".
function galeriaDe(
  equipo: { marca: string | null; modelo: string | null; imagenesUrls?: string | null } | null,
): { src: string; caption: string }[] {
  if (!equipo) return [];
  return getEquipoImagenes({
    id: "paquete",
    marca: equipo.marca,
    modelo: equipo.modelo,
    equipo: { imagenesUrls: equipo.imagenesUrls },
  });
}

async function getPaquete(id: string) {
  await ensurePaquetesTables();
  const p = await prisma.paquete.findFirst({
    where: { id, activo: true },
    include: PAQUETE_INCLUDE,
  });
  return p;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await getPaquete(id);
  if (!p) return getPresentationMetadata({ title: "Paquete", description: "Paquete de producción técnica", path: `/presentacion/paquete/${id}` });
  const portada = p.imagenes.find((im) => im.tipo !== "RENDER")?.url ?? p.imagenes[0]?.url ?? null;
  return getPresentationMetadata({
    title: p.nombre,
    description: p.resumen || p.propuestaValor || "Paquete de producción técnica para tu evento.",
    path: `/presentacion/paquete/${id}`,
    image: portada,
  });
}

export default async function PaqueteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPaquete(id);
  if (!p) notFound();

  const familia = familiaTipo(p.tipoEvento);
  const { categorias } = await getGaleriaData(familia);
  const conRespaldo = categoriasConRespaldo(categorias, familia);
  const galeria = conRespaldo[0]?.fotos ?? [];

  const [descCategorias, overrides] = await Promise.all([
    getDescCategorias(p.tipoEvento),
    getOverrides().catch(() => ({})),
  ]);

  // Adicionales sugeridos del paquete (IDs guardados en modo edición).
  let adicionales: {
    id: string;
    nombre: string;
    descripcion: string | null;
    imagenUrl: string | null;
    composicion: string | null;
  }[] = [];
  const adicIds: string[] = (() => {
    try {
      const arr = JSON.parse(p.adicionalesSugeridos || "[]");
      return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  })();
  if (adicIds.length) {
    const rows = await prisma.adicional.findMany({
      where: { id: { in: adicIds }, activo: true },
      select: { id: true, nombre: true, descripcion: true, imagenUrl: true, composicion: true },
    });
    // Respeta el orden guardado en adicionalesSugeridos.
    const byId = new Map(rows.map((r) => [r.id, r]));
    adicionales = adicIds.map((id) => byId.get(id)).filter(Boolean) as typeof adicionales;
  }

  const paquete = {
    id: p.id,
    nombre: p.nombre,
    tipoEvento: p.tipoEvento,
    rangoPersonas: p.rangoPersonas,
    subtiposEvento: p.subtiposEvento,
    resumen: p.resumen,
    descripcion: p.descripcion,
    propuestaValor: p.propuestaValor,
    imagenes: p.imagenes.map((im) => ({ url: im.url, tipo: im.tipo })),
    items: p.items.map((it) => ({
      tipo: it.tipo,
      cantidad: it.cantidad,
      equipo: it.equipo
        ? {
            descripcion: it.equipo.descripcion,
            marca: it.equipo.marca,
            modelo: it.equipo.modelo,
            imagenUrl: it.equipo.imagenUrl ?? null,
            categoria: it.equipo.categoria?.nombre ?? null,
            galeria: galeriaDe(it.equipo),
          }
        : null,
      producto: it.producto
        ? {
            nombre: it.producto.nombre,
            imagenUrl: it.producto.imagenUrl ?? null,
            categoria: it.producto.categoria ?? null,
            // Equipos principales que componen el producto (sin accesorios: los
            // accesorios viven en otra relación, ProductoAccesorio).
            equipos: it.producto.items.map((pe) => ({
              cantidad: pe.cantidad,
              descripcion: pe.equipo?.descripcion ?? null,
              marca: pe.equipo?.marca ?? null,
              modelo: pe.equipo?.modelo ?? null,
              imagenUrl: pe.equipo?.imagenUrl ?? null,
              categoria: pe.equipo?.categoria?.nombre ?? null,
              galeria: galeriaDe(pe.equipo ?? null),
            })),
          }
        : null,
    })),
    conceptos: p.conceptos.map((c) => ({ tipo: c.tipo, descripcion: c.descripcion })),
    adicionales,
  };

  return <PaqueteDetalleClient paquete={paquete} galeria={galeria} descCategorias={descCategorias} overrides={overrides} />;
}
