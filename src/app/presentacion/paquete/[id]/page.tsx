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

type ComposicionItem = { tipo?: string; referenciaId?: string; cantidad?: number };
type AdicionalElemento = { nombre: string; cantidad: number };

function parseComposicion(s: string | null): ComposicionItem[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// Familia técnica que ilustra al adicional cuando no tiene foto propia. Se deduce
// del texto porque los datos no la traen: `categoria_equipos.disciplina` es
// PRODUCCION en todas las filas y `productos.categoria` guarda el nombre visible
// de la categoría ("Equipo de Iluminación"), no un enum.
const FAMILIAS: [RegExp, string][] = [
  [/ilumin|gobo|luz|luce/i, "ILUMINACION"],
  [/video|pantalla|proyec|led|cctv|switcher|streaming|teleprompter/i, "VIDEO"],
  [/\bdj\b|booth|tornamesa/i, "DJ"],
  [/rigging|estructura|entarimado|tarima|templete|escenario|pista|layher|ground/i, "ESTRUCTURA"],
  [/audio|micro|sonido|monitoreo|backline|bocina/i, "AUDIO"],
];

function clasificaFamilia(...textos: (string | null | undefined)[]): string | null {
  for (const t of textos) {
    if (!t) continue;
    for (const [re, familia] of FAMILIAS) if (re.test(t)) return familia;
  }
  return null;
}

// Los adicionales guardan su contenido como JSON de referenciaId. Sin resolverlos
// a nombres reales la presentación solo puede decir "incluye N elementos", que es
// justo lo que el cliente no puede evaluar.
async function resolverComposiciones(
  rows: { id: string; nombre: string; composicion: string | null }[],
): Promise<Map<string, { elementos: AdicionalElemento[]; disciplina: string | null }>> {
  const prodIds = new Set<string>();
  const eqIds = new Set<string>();
  for (const r of rows) {
    for (const c of parseComposicion(r.composicion)) {
      if (!c?.referenciaId) continue;
      if (c.tipo === "producto") prodIds.add(c.referenciaId);
      else if (c.tipo === "equipo") eqIds.add(c.referenciaId);
    }
  }

  const [productos, equipos] = await Promise.all([
    prodIds.size
      ? prisma.producto.findMany({
          where: { id: { in: [...prodIds] } },
          select: { id: true, nombre: true, categoria: true },
        })
      : Promise.resolve([]),
    eqIds.size
      ? prisma.equipo.findMany({
          where: { id: { in: [...eqIds] } },
          select: {
            id: true,
            marca: true,
            modelo: true,
            descripcion: true,
            categoria: { select: { nombre: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const porProducto = new Map(productos.map((p) => [p.id, p]));
  const porEquipo = new Map(equipos.map((e) => [e.id, e]));

  const out = new Map<string, { elementos: AdicionalElemento[]; disciplina: string | null }>();
  for (const r of rows) {
    const elementos: AdicionalElemento[] = [];
    let disciplina: string | null = null;
    for (const c of parseComposicion(r.composicion)) {
      if (!c?.referenciaId) continue;
      let nombre: string | null = null;
      if (c.tipo === "producto") {
        const p = porProducto.get(c.referenciaId);
        if (!p) continue;
        nombre = p.nombre;
        disciplina ??= clasificaFamilia(p.categoria);
      } else if (c.tipo === "equipo") {
        const e = porEquipo.get(c.referenciaId);
        if (!e) continue;
        nombre = [e.marca, e.modelo].filter(Boolean).join(" ").trim() || e.descripcion.trim();
        disciplina ??= clasificaFamilia(e.categoria?.nombre);
      }
      if (!nombre) continue;
      elementos.push({ nombre, cantidad: Math.max(1, Number(c.cantidad) || 1) });
    }
    // El nombre del adicional desempata cuando su categoría no dice nada
    // (p. ej. "Teleprompter" o "Templete / tarima").
    out.set(r.id, { elementos, disciplina: disciplina ?? clasificaFamilia(r.nombre) });
  }
  return out;
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
    disciplina: string | null;
    elementos: AdicionalElemento[];
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
    const resueltos = await resolverComposiciones(rows);

    // Respeta el orden guardado en adicionalesSugeridos.
    const byId = new Map(rows.map((r) => [r.id, r]));
    adicionales = adicIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((r) => ({
        id: r!.id,
        nombre: r!.nombre,
        descripcion: r!.descripcion,
        imagenUrl: r!.imagenUrl,
        disciplina: resueltos.get(r!.id)?.disciplina ?? null,
        elementos: resueltos.get(r!.id)?.elementos ?? [],
      }));
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
            precioRenta: it.equipo.precioRenta ?? 0,
            imagenUrl: it.equipo.imagenUrl ?? null,
            categoria: it.equipo.categoria?.nombre ?? null,
            galeria: galeriaDe(it.equipo),
          }
        : null,
      producto: it.producto
        ? {
            nombre: it.producto.nombre,
            precioFinal: it.producto.precioFinal ?? 0,
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
    conceptos: p.conceptos.map((c) => ({
      tipo: c.tipo,
      descripcion: c.descripcion,
      cantidad: c.cantidad,
      dias: c.dias,
      precioUnitario: c.precioUnitario,
    })),
    adicionales,
  };

  return <PaqueteDetalleClient paquete={paquete} galeria={galeria} descCategorias={descCategorias} overrides={overrides} />;
}
