import { prisma } from "@/lib/prisma";

// ── Clasificación comercial: sync bidireccional producto ↔ equipo ──────────────
// Reglas (Bloque 4):
//  · Unión, nunca reemplazo: sincronizar solo AGREGA tipos/nichos, no quita.
//  · Un solo salto: producto→sus equipos, o equipo→sus productos. Sin cascada.
//  · origen manual|heredado: lo puesto por una persona es "manual" y jamás lo
//    sobrescribe el sync. Lo puesto por sync es "heredado".
//  · Confirmación antes de aplicar: las funciones de preview no escriben nada.

export function parseArr(s: string | null | undefined): string[] {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}

/** Une dos listas conservando orden de aparición y sin duplicados. */
export function unir(a: string[], b: string[]): string[] {
  const out = [...a];
  for (const x of b) if (!out.includes(x)) out.push(x);
  return out;
}

function serial(a: string[]): string | null {
  return a.length ? JSON.stringify(a) : null;
}

export type CambioClasif = {
  id: string;
  nombre: string;
  tiposAntes: string[];
  tiposDespues: string[];
  nichosAntes: string[];
  nichosDespues: string[];
};

type Fuente = { tiposEvento: string[]; nichos: string[] };

// Diferencia lo que la unión agregaría; null si no hay cambios netos.
function diff(id: string, nombre: string, actualTipos: string[], actualNichos: string[], fuente: Fuente): CambioClasif | null {
  const tiposDespues = unir(actualTipos, fuente.tiposEvento);
  const nichosDespues = unir(actualNichos, fuente.nichos);
  if (tiposDespues.length === actualTipos.length && nichosDespues.length === actualNichos.length) return null;
  return { id, nombre, tiposAntes: actualTipos, tiposDespues, nichosAntes: actualNichos, nichosDespues };
}

// ── Producto → sus equipos ─────────────────────────────────────────────────────
// Los equipos que componen el producto heredan (unión) su clasificación, salvo
// los marcados como manual.
export async function previewProductoAEquipos(productoId: string): Promise<CambioClasif[]> {
  const producto = await prisma.producto.findUnique({
    where: { id: productoId },
    select: { tiposEvento: true, nichos: true, items: { select: { equipoId: true } } },
  });
  if (!producto) return [];
  const fuente: Fuente = { tiposEvento: parseArr(producto.tiposEvento), nichos: parseArr(producto.nichos) };
  if (!fuente.tiposEvento.length && !fuente.nichos.length) return [];
  const equipoIds = [...new Set(producto.items.map(i => i.equipoId))];
  if (!equipoIds.length) return [];
  const equipos = await prisma.equipo.findMany({
    where: { id: { in: equipoIds }, clasifOrigen: { not: "manual" } },
    select: { id: true, descripcion: true, tiposEvento: true, nichos: true },
  });
  return equipos
    .map(e => diff(e.id, e.descripcion, parseArr(e.tiposEvento), parseArr(e.nichos), fuente))
    .filter((c): c is CambioClasif => c !== null);
}

export async function aplicarProductoAEquipos(productoId: string): Promise<number> {
  const cambios = await previewProductoAEquipos(productoId);
  for (const c of cambios) {
    await prisma.equipo.update({
      where: { id: c.id },
      data: { tiposEvento: serial(c.tiposDespues), nichos: serial(c.nichosDespues), clasifOrigen: "heredado" },
    });
  }
  return cambios.length;
}

// ── Equipo → sus productos ─────────────────────────────────────────────────────
// Los productos que contienen el equipo heredan (unión) su clasificación, salvo
// los marcados como manual. Un solo salto: no re-propaga a otros equipos.
export async function previewEquipoAProductos(equipoId: string): Promise<CambioClasif[]> {
  const equipo = await prisma.equipo.findUnique({
    where: { id: equipoId },
    select: { tiposEvento: true, nichos: true },
  });
  if (!equipo) return [];
  const fuente: Fuente = { tiposEvento: parseArr(equipo.tiposEvento), nichos: parseArr(equipo.nichos) };
  if (!fuente.tiposEvento.length && !fuente.nichos.length) return [];
  const items = await prisma.productoEquipo.findMany({
    where: { equipoId },
    select: { productoId: true },
    distinct: ["productoId"],
  });
  const productoIds = items.map(i => i.productoId);
  if (!productoIds.length) return [];
  const productos = await prisma.producto.findMany({
    where: { id: { in: productoIds } },
    select: { id: true, nombre: true, tiposEvento: true, nichos: true },
  });
  return productos
    .map(p => diff(p.id, p.nombre, parseArr(p.tiposEvento), parseArr(p.nichos), fuente))
    .filter((c): c is CambioClasif => c !== null);
}

export async function aplicarEquipoAProductos(equipoId: string): Promise<number> {
  const cambios = await previewEquipoAProductos(equipoId);
  for (const c of cambios) {
    await prisma.producto.update({
      where: { id: c.id },
      data: { tiposEvento: serial(c.tiposDespues), nichos: serial(c.nichosDespues) },
    });
  }
  return cambios.length;
}
