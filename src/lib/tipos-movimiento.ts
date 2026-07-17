import { prisma } from "@/lib/prisma";

export type Naturaleza = "ENTRADA" | "SALIDA" | "NEUTRO";

export interface TipoMov {
  id: string;
  clave: string;
  nombre: string;
  naturaleza: string;
  afectaResultado: boolean;
  color: string;
  orden: number;
  sistema: boolean;
  activo: boolean;
}

// Tipos base del sistema. Reproducen el comportamiento histórico hardcodeado.
export const TIPOS_BASE = [
  { clave: "INGRESO",       nombre: "Ingreso",       naturaleza: "ENTRADA", afectaResultado: true,  color: "green",  orden: 0, sistema: true, activo: true },
  { clave: "GASTO",         nombre: "Gasto",         naturaleza: "SALIDA",  afectaResultado: true,  color: "red",    orden: 1, sistema: true, activo: true },
  { clave: "TRANSFERENCIA", nombre: "Transferencia", naturaleza: "NEUTRO",  afectaResultado: false, color: "blue",   orden: 2, sistema: true, activo: true },
  { clave: "INVERSION",     nombre: "Inversión",     naturaleza: "ENTRADA", afectaResultado: false, color: "purple", orden: 3, sistema: true, activo: true },
  { clave: "RETIRO",        nombre: "Retiro",        naturaleza: "SALIDA",  afectaResultado: false, color: "orange", orden: 4, sistema: true, activo: true },
] as const;

let ensured = false;

// Migración lazy: crea la tabla y siembra los tipos base la primera vez.
// Patrón idempotente sobre Neon (ver CLAUDE.md "Migraciones lazy").
export async function ensureTiposMovimiento(): Promise<void> {
  if (ensured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "tipos_movimiento" (
      "id" TEXT NOT NULL,
      "clave" TEXT NOT NULL,
      "nombre" TEXT NOT NULL,
      "naturaleza" TEXT NOT NULL DEFAULT 'SALIDA',
      "afectaResultado" BOOLEAN NOT NULL DEFAULT true,
      "color" TEXT NOT NULL DEFAULT 'gray',
      "orden" INTEGER NOT NULL DEFAULT 0,
      "sistema" BOOLEAN NOT NULL DEFAULT false,
      "activo" BOOLEAN NOT NULL DEFAULT true,
      CONSTRAINT "tipos_movimiento_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "tipos_movimiento_clave_key" ON "tipos_movimiento"("clave")`
  );
  const count = await prisma.tipoMovimiento.count();
  if (count === 0) {
    await prisma.tipoMovimiento.createMany({
      data: TIPOS_BASE.map((t) => ({ ...t })),
      skipDuplicates: true,
    });
  }
  ensured = true;
}

export async function getTiposMovimiento(soloActivos = false): Promise<TipoMov[]> {
  await ensureTiposMovimiento();
  return prisma.tipoMovimiento.findMany({
    where: soloActivos ? { activo: true } : undefined,
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });
}

export async function getTipoMovimientoMap(): Promise<Map<string, TipoMov>> {
  const tipos = await getTiposMovimiento();
  return new Map(tipos.map((t) => [t.clave, t]));
}

// Clasificación para reportes. Si el tipo no está en el mapa (tabla aún sin
// sembrar en un request), cae al comportamiento base por clave.
export function esIngresoResultado(map: Map<string, TipoMov>, tipo: string): boolean {
  const t = map.get(tipo);
  if (!t) return tipo === "INGRESO";
  return t.naturaleza === "ENTRADA" && t.afectaResultado;
}

export function esGastoResultado(map: Map<string, TipoMov>, tipo: string): boolean {
  const t = map.get(tipo);
  if (!t) return tipo === "GASTO";
  return t.naturaleza === "SALIDA" && t.afectaResultado;
}

export function esTransferencia(map: Map<string, TipoMov>, tipo: string): boolean {
  const t = map.get(tipo);
  if (!t) return tipo === "TRANSFERENCIA";
  return t.naturaleza === "NEUTRO";
}

export function naturalezaDe(map: Map<string, TipoMov>, tipo: string): Naturaleza {
  const t = map.get(tipo);
  if (t) return t.naturaleza as Naturaleza;
  if (tipo === "GASTO" || tipo === "RETIRO") return "SALIDA";
  if (tipo === "TRANSFERENCIA") return "NEUTRO";
  return "ENTRADA";
}

// Claves que cuentan como ingreso / gasto en el estado de resultados.
export async function getClavesResultado(): Promise<{ ingreso: string[]; gasto: string[] }> {
  const tipos = await getTiposMovimiento();
  const ingreso: string[] = [];
  const gasto: string[] = [];
  for (const t of tipos) {
    if (!t.afectaResultado) continue;
    if (t.naturaleza === "ENTRADA") ingreso.push(t.clave);
    else if (t.naturaleza === "SALIDA") gasto.push(t.clave);
  }
  if (ingreso.length === 0) ingreso.push("INGRESO");
  if (gasto.length === 0) gasto.push("GASTO");
  return { ingreso, gasto };
}

// Genera una clave única a partir del nombre (mayúsculas, sin acentos ni espacios).
export function slugClave(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "TIPO";
}
