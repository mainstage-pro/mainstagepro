import { prisma } from "@/lib/prisma";

// Migración lazy: crea la tabla de la bandeja de entrada la primera vez que se
// usa en producción (Neon), sin necesidad de una migración formal. Idempotente.
let _tablaLista = false;
export async function ensureProyectoIdeasTable() {
  if (_tablaLista) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "proyecto_ideas" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "titulo" TEXT NOT NULL,
      "descripcion" TEXT,
      "area" TEXT NOT NULL DEFAULT 'GENERAL',
      "responsableId" TEXT,
      "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
      "proyectoId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  _tablaLista = true;
}
