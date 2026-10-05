import { prisma } from "@/lib/prisma";

let ensured = false;

// Migración lazy: tabla nueva creada de forma idempotente sobre Neon
// (ver CLAUDE.md "Migraciones lazy"). Columnas en camelCase porque el modelo
// Prisma no usa @map en sus campos.
export async function ensureReembolsos(): Promise<void> {
  if (ensured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "solicitudes_reembolso" (
      "id" TEXT NOT NULL,
      "folio" TEXT NOT NULL,
      "solicitanteId" TEXT NOT NULL,
      "fechaGasto" TIMESTAMP(3) NOT NULL,
      "concepto" TEXT NOT NULL,
      "monto" DOUBLE PRECISION NOT NULL,
      "categoriaId" TEXT,
      "proyectoId" TEXT,
      "comprobanteUrl" TEXT,
      "notas" TEXT,
      "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
      "revisadoPorId" TEXT,
      "revisadoEn" TIMESTAMP(3),
      "motivoRechazo" TEXT,
      "cuentaPagarId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "solicitudes_reembolso_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "solicitudes_reembolso_folio_key" ON "solicitudes_reembolso"("folio")`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "solicitudes_reembolso_cuentaPagarId_key" ON "solicitudes_reembolso"("cuentaPagarId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "solicitudes_reembolso_solicitanteId_idx" ON "solicitudes_reembolso"("solicitanteId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "solicitudes_reembolso_estado_idx" ON "solicitudes_reembolso"("estado")`);
  ensured = true;
}

export async function siguienteFolio(): Promise<string> {
  const ultima = await prisma.solicitudReembolso.findFirst({
    orderBy: { folio: "desc" },
    select: { folio: true },
  });
  const n = ultima ? parseInt(ultima.folio.replace(/\D/g, ""), 10) + 1 : 1;
  return `REE-${String(n).padStart(4, "0")}`;
}
