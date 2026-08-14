import { prisma } from "@/lib/prisma";

// Migración lazy: crea la tabla de la bandeja de prospectos la primera vez que se
// usa en producción (Neon), sin migración formal. Idempotente. Las columnas nuevas
// de `clientes` (porContactar/contactarDesde) se aplican con scripts/ddl-bandeja-prospectos.ts
// ANTES del deploy, porque `clientes` se lee en muchas rutas.
let _tablaLista = false;
export async function ensureEntradasProspectoTable() {
  if (_tablaLista) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "entradas_prospecto" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "textoOriginal" TEXT NOT NULL,
      "nombre" TEXT,
      "empresa" TEXT,
      "telefono" TEXT,
      "correo" TEXT,
      "perfilesProspecto" TEXT,
      "origenLead" TEXT,
      "notas" TEXT,
      "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
      "clienteId" TEXT,
      "capturadoPor" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  _tablaLista = true;
}

// Extrae correo y teléfono (best-effort) de una línea pegada, para prellenar la
// captura. El resto de la línea se toma como posible nombre.
const RE_CORREO = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
// Teléfonos MX: 10 dígitos, tolerando +52, espacios, guiones y paréntesis.
const RE_TELEFONO = /(\+?\d[\d\s().-]{7,}\d)/;

export function parseLineaProspecto(linea: string): {
  nombre: string | null;
  correo: string | null;
  telefono: string | null;
} {
  const correo = linea.match(RE_CORREO)?.[0]?.trim() ?? null;
  let resto = correo ? linea.replace(correo, " ") : linea;

  let telefono: string | null = null;
  const mTel = resto.match(RE_TELEFONO);
  if (mTel) {
    const soloDigitos = mTel[1].replace(/\D/g, "");
    if (soloDigitos.length >= 8 && soloDigitos.length <= 13) {
      telefono = mTel[1].trim();
      resto = resto.replace(mTel[1], " ");
    }
  }

  const nombre = resto.replace(/[|,;:\t]+/g, " ").replace(/\s{2,}/g, " ").trim() || null;
  return { nombre, correo, telefono };
}
